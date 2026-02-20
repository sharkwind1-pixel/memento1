/**
 * 개별 분실/발견 동물 API
 * GET: 게시글 상세 조회 (조회수 증가)
 * PATCH: 게시글 수정
 * DELETE: 게시글 소프트 삭제 (status='deleted')
 *
 * 보안: 세션 기반 인증, Rate Limiting, VPN 차단, 입력값 검증
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import {
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
    sanitizeInput,
    checkVPN,
    getVPNBlockResponse,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** snake_case DB 행을 camelCase 응답으로 변환 */
function toCamelCase(post: Record<string, unknown>) {
    return {
        id: post.id,
        userId: post.user_id,
        type: post.type,
        title: post.title,
        petType: post.pet_type,
        breed: post.breed,
        color: post.color,
        gender: post.gender,
        age: post.age,
        region: post.region,
        district: post.district,
        locationDetail: post.location_detail,
        date: post.date,
        description: post.description,
        contact: post.contact,
        reward: post.reward,
        imageUrl: post.image_url,
        imageStoragePath: post.image_storage_path,
        views: post.views ?? 0,
        status: post.status,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
    };
}

// 게시글 상세 조회 (공개 API - Rate Limit만 적용)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Rate Limit 체크
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "general");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const supabase = await createServerSupabase();
        const { id } = await params;

        // 조회수 원자적 증가 (RPC 사용, 폴백: read-modify-write)
        supabase.rpc("increment_field", {
            table_name: "lost_pets",
            field_name: "views",
            row_id: id,
            amount: 1,
        }).then(({ error: rpcErr }) => {
            if (rpcErr) {
                supabase
                    .from("lost_pets")
                    .select("views")
                    .eq("id", id)
                    .single()
                    .then(({ data: p }) => {
                        if (p) {
                            supabase
                                .from("lost_pets")
                                .update({ views: (p.views || 0) + 1 })
                                .eq("id", id)
                                .then();
                        }
                    });
            }
        });

        // 게시글 조회
        const { data: post, error } = await supabase
            .from("lost_pets")
            .select("*")
            .eq("id", id)
            .eq("status", "active")
            .single();

        if (error || !post) {
            return NextResponse.json(
                { error: "게시글을 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        return NextResponse.json({ post: toCamelCase(post) });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// 게시글 수정 (세션 기반 인증 + 본인 확인)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Rate Limit 체크
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        // 2. VPN 체크
        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            console.warn(`[Security] VPN blocked on lost-pets edit: ${clientIP} - ${vpnCheck.reason}`);
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 3. 세션 기반 인증
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const supabase = await createServerSupabase();
        const { id } = await params;
        const body = await request.json();

        // 4. 본인 글인지 확인
        const { data: existing } = await supabase
            .from("lost_pets")
            .select("user_id")
            .eq("id", id)
            .single();

        if (!existing || existing.user_id !== user.id) {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        // 5. 입력값 검증 및 sanitize (전달된 필드만 업데이트)
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        const {
            title,
            petType,
            breed,
            color,
            gender,
            age,
            region,
            district,
            locationDetail,
            date,
            description,
            contact,
            reward,
            imageUrl,
            imageStoragePath,
            status,
        } = body;

        if (title !== undefined) updateData.title = sanitizeInput(title).slice(0, 200);
        if (petType !== undefined) updateData.pet_type = sanitizeInput(petType).slice(0, 50);
        if (breed !== undefined) updateData.breed = sanitizeInput(breed).slice(0, 100);
        if (color !== undefined) updateData.color = sanitizeInput(color).slice(0, 100);
        if (gender !== undefined) updateData.gender = sanitizeInput(gender).slice(0, 20);
        if (age !== undefined) updateData.age = sanitizeInput(age).slice(0, 50);
        if (region !== undefined) updateData.region = sanitizeInput(region).slice(0, 50);
        if (district !== undefined) updateData.district = sanitizeInput(district).slice(0, 50);
        if (locationDetail !== undefined) updateData.location_detail = sanitizeInput(locationDetail).slice(0, 500);
        if (date !== undefined) updateData.date = date;
        if (description !== undefined) updateData.description = sanitizeInput(description).slice(0, 5000);
        if (contact !== undefined) updateData.contact = sanitizeInput(contact).slice(0, 100);
        if (reward !== undefined) updateData.reward = sanitizeInput(reward).slice(0, 100);
        if (imageUrl !== undefined) {
            updateData.image_url = typeof imageUrl === "string" && imageUrl.startsWith("http") ? imageUrl : null;
        }
        if (imageStoragePath !== undefined) updateData.image_storage_path = imageStoragePath || null;
        if (status !== undefined && ["active", "resolved"].includes(status)) {
            updateData.status = status;
        }

        // 6. 업데이트 (이중 검증으로 user_id도 체크)
        const { data, error } = await supabase
            .from("lost_pets")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: "게시글 수정에 실패했습니다." }, { status: 500 });
        }

        return NextResponse.json({ post: toCamelCase(data) });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// 게시글 소프트 삭제 (status='deleted')
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Rate Limit 체크
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        // 2. VPN 체크
        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            console.warn(`[Security] VPN blocked on lost-pets delete: ${clientIP} - ${vpnCheck.reason}`);
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 3. 세션 기반 인증
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const supabase = await createServerSupabase();
        const { id } = await params;

        // 4. 본인 글인지 확인
        const { data: existing } = await supabase
            .from("lost_pets")
            .select("user_id")
            .eq("id", id)
            .single();

        if (!existing || existing.user_id !== user.id) {
            return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
        }

        // 5. 소프트 삭제 (status를 'deleted'로 변경)
        const { error } = await supabase
            .from("lost_pets")
            .update({
                status: "deleted",
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) {
            return NextResponse.json({ error: "게시글 삭제에 실패했습니다." }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
