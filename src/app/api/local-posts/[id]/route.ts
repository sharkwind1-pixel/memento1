/**
 * 지역정보 게시판 API - 게시글 상세/수정/삭제
 * GET: 상세 조회 (조회수 증가)
 * PATCH: 게시글 수정 (작성자만)
 * DELETE: 게시글 소프트 삭제 (작성자만)
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

/** snake_case -> camelCase 변환 */
function toCamelCase(post: Record<string, unknown>) {
    return {
        id: post.id,
        userId: post.user_id,
        category: post.category,
        title: post.title,
        content: post.content,
        region: post.region,
        district: post.district,
        badge: post.badge,
        imageUrl: post.image_url,
        imageStoragePath: post.image_storage_path,
        likesCount: post.likes_count,
        commentsCount: post.comments_count,
        views: post.views,
        status: post.status,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
    };
}

/** GET - 게시글 상세 조회 (조회수 증가) */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createServerSupabase();

        const { data: post, error } = await supabase
            .from("local_posts")
            .select("*")
            .eq("id", id)
            .neq("status", "deleted")
            .single();

        if (error || !post) {
            return NextResponse.json(
                { error: "게시글을 찾을 수 없습니다" },
                { status: 404 }
            );
        }

        // 조회수 원자적 증가 (RPC 사용, 폴백: read-modify-write)
        supabase.rpc("increment_field", {
            table_name: "local_posts",
            field_name: "views",
            row_id: id,
            amount: 1,
        }).then(({ error: rpcErr }) => {
            if (rpcErr) {
                supabase
                    .from("local_posts")
                    .update({ views: (post.views || 0) + 1 })
                    .eq("id", id)
                    .then();
            }
        });

        return NextResponse.json({ post: toCamelCase(post) });
    } catch (err) {
        console.error("[Local Posts GET] 서버 오류:", err);
        return NextResponse.json(
            { error: "게시글 처리 중 오류가 발생했습니다" },
            { status: 500 }
        );
    }
}

/** PATCH - 게시글 수정 (작성자만) */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Rate Limiting
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        // VPN 체크
        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 인증 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const supabase = await createServerSupabase();

        // 기존 게시글 확인 + 작성자 확인
        const { data: existing, error: fetchError } = await supabase
            .from("local_posts")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json(
                { error: "게시글을 찾을 수 없습니다" },
                { status: 404 }
            );
        }

        if (existing.user_id !== user.id) {
            return NextResponse.json(
                { error: "수정 권한이 없습니다" },
                { status: 403 }
            );
        }

        const body = await request.json();

        // 허용된 필드만 업데이트
        const updateData: Record<string, unknown> = {};

        if (body.title !== undefined) updateData.title = sanitizeInput(body.title);
        if (body.content !== undefined) updateData.content = sanitizeInput(body.content);
        if (body.region !== undefined) updateData.region = sanitizeInput(body.region);
        if (body.district !== undefined) updateData.district = sanitizeInput(body.district);
        if (body.imageUrl !== undefined) updateData.image_url = body.imageUrl;
        if (body.imageStoragePath !== undefined) updateData.image_storage_path = body.imageStoragePath;

        // 카테고리 변경
        if (body.category !== undefined) {
            const validCategories = ["hospital", "walk", "share", "trade", "meet", "place"];
            if (!validCategories.includes(body.category)) {
                return NextResponse.json(
                    { error: "유효하지 않은 카테고리입니다" },
                    { status: 400 }
                );
            }
            updateData.category = body.category;
        }

        // 뱃지 변경
        if (body.badge !== undefined) {
            const validBadges = ["질문", "모집중", "나눔", "판매", "후기", "정보", "기타"];
            if (body.badge !== null && !validBadges.includes(body.badge)) {
                return NextResponse.json(
                    { error: "유효하지 않은 뱃지입니다" },
                    { status: 400 }
                );
            }
            updateData.badge = body.badge;
        }

        // 상태 변경 (active -> closed 허용)
        if (body.status !== undefined) {
            if (body.status === "closed" && existing.status === "active") {
                updateData.status = "closed";
            } else if (body.status !== existing.status) {
                return NextResponse.json(
                    { error: "유효하지 않은 상태 변경입니다" },
                    { status: 400 }
                );
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "변경할 내용이 없습니다" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("local_posts")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("[Local Posts PATCH] 수정 에러:", error);
            return NextResponse.json(
                { error: "게시글 처리 중 오류가 발생했습니다" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { post: toCamelCase(data) },
            { headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
        );
    } catch (err) {
        console.error("[Local Posts PATCH] 서버 오류:", err);
        return NextResponse.json(
            { error: "게시글 처리 중 오류가 발생했습니다" },
            { status: 500 }
        );
    }
}

/** DELETE - 게시글 소프트 삭제 (작성자만) */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Rate Limiting
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        // VPN 체크
        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 인증 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const supabase = await createServerSupabase();

        // 기존 게시글 확인 + 작성자 확인
        const { data: existing, error: fetchError } = await supabase
            .from("local_posts")
            .select("user_id, status")
            .eq("id", id)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json(
                { error: "게시글을 찾을 수 없습니다" },
                { status: 404 }
            );
        }

        if (existing.user_id !== user.id) {
            return NextResponse.json(
                { error: "삭제 권한이 없습니다" },
                { status: 403 }
            );
        }

        if (existing.status === "deleted") {
            return NextResponse.json(
                { error: "이미 삭제된 게시글입니다" },
                { status: 400 }
            );
        }

        // 소프트 삭제
        const { error } = await supabase
            .from("local_posts")
            .update({ status: "deleted" })
            .eq("id", id);

        if (error) {
            console.error("[Local Posts DELETE] 삭제 에러:", error);
            return NextResponse.json(
                { error: "게시글 처리 중 오류가 발생했습니다" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: "게시글이 삭제되었습니다" },
            { headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
        );
    } catch (err) {
        console.error("[Local Posts DELETE] 서버 오류:", err);
        return NextResponse.json(
            { error: "게시글 처리 중 오류가 발생했습니다" },
            { status: 500 }
        );
    }
}
