/**
 * 개별 게시글 API
 * GET: 게시글 상세 조회 (조회수 증가)
 * PATCH: 게시글 수정
 * DELETE: 게시글 삭제
 *
 * 보안: 세션 기반 인증, Rate Limiting, VPN 차단, 입력값 검증
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";
import {
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
    sanitizeInput,
    checkVPN,
    getVPNBlockResponse
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

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

        // supabase 클라이언트 생성, 인증, params를 병렬로
        const [supabase, currentUser, resolvedParams] = await Promise.all([
            createServerSupabase(),
            getAuthUser().catch(() => null),
            params,
        ]);
        const { id } = resolvedParams;

        // 조회수 증가는 fire-and-forget (응답 대기 안 함)
        Promise.resolve(
            supabase.rpc("increment_field", {
                table_name: "community_posts",
                field_name: "views",
                row_id: id,
                amount: 1,
            })
        ).then(({ error: rpcErr }) => {
            if (rpcErr) {
                Promise.resolve(
                    supabase.from("community_posts").select("views").eq("id", id).single()
                ).then(({ data: p }) => {
                    if (p) supabase.from("community_posts").update({ views: (p.views || 0) + 1 }).eq("id", id);
                });
            }
        }).catch(() => {});

        // 게시글 조회
        const { data: post, error } = await supabase
            .from("community_posts")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
        }

        // 숨긴 게시글은 본인만 접근 가능
        if (post.is_hidden) {
            if (!currentUser || post.user_id !== currentUser.id) {
                return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
            }
        }

        // 차단된 유저 목록 조회
        let blockedUserIds: string[] = [];
        if (currentUser) {
            const { data: blocks } = await supabase
                .from("user_blocks")
                .select("blocked_user_id")
                .eq("blocker_id", currentUser.id);
            if (blocks && blocks.length > 0) {
                blockedUserIds = blocks.map(b => b.blocked_user_id);
            }
        }

        // 차단된 유저의 게시글인 경우 404 반환
        if (blockedUserIds.includes(post.user_id)) {
            return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
        }

        // 댓글 + 미니미를 병렬 조회
        let commentQuery = supabase
            .from("post_comments")
            .select("*")
            .eq("post_id", id)
            .order("created_at", { ascending: true });
        if (blockedUserIds.length > 0) {
            commentQuery = commentQuery.not("user_id", "in", `(${blockedUserIds.join(",")})`);
        }

        const adminSupabase = createAdminSupabase();
        const [{ data: comments }, minimiResult] = await Promise.all([
            commentQuery,
            // 미니미 조회: profiles + user_minimi 병렬
            (async () => {
                if (!post.user_id) return null;
                try {
                    const [{ data: profile }, { data: minimiRows }] = await Promise.all([
                        adminSupabase.from("profiles").select("equipped_minimi_id").eq("id", post.user_id).maybeSingle(),
                        adminSupabase.from("user_minimi").select("id, minimi_id").eq("user_id", post.user_id),
                    ]);
                    if (profile?.equipped_minimi_id && minimiRows) {
                        const match = minimiRows.find(m => m.id === profile.equipped_minimi_id);
                        return match?.minimi_id || null;
                    }
                    return null;
                } catch { return null; }
            })(),
        ]);

        return NextResponse.json({
            post: {
                ...post,
                authorMinimiSlug: minimiResult,
                comments: comments || [],
            },
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// 게시글 수정 (세션 기반 인증 + 보안 강화)
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
            console.warn(`[Security] VPN blocked on post edit: ${clientIP} - ${vpnCheck.reason}`);
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 3. 세션 기반 인증 (body에서 userId 받지 않음!)
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const supabase = await createServerSupabase();
        const { id } = await params;
        const body = await request.json();

        const { title, content, badge, isHidden } = body;

        // 4. 본인 글인지 확인 (세션의 user.id 사용)
        const { data: existing } = await supabase
            .from("community_posts")
            .select("user_id")
            .eq("id", id)
            .single();

        if (!existing || existing.user_id !== user.id) {
            return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
        }

        // 5. 입력값 검증 및 sanitize
        const updateData: Record<string, string | boolean> = { updated_at: new Date().toISOString() };
        if (title) updateData.title = sanitizeInput(title).slice(0, 200);
        if (content) updateData.content = sanitizeInput(content).slice(0, 10000);
        if (badge) updateData.badge = sanitizeInput(badge).slice(0, 50);
        if (typeof isHidden === "boolean") updateData.is_hidden = isHidden;

        const { data, error } = await supabase
            .from("community_posts")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", user.id)  // 이중 검증
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: "게시글 수정에 실패했습니다" }, { status: 500 });
        }

        return NextResponse.json({ post: data });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// 게시글 삭제 (세션 기반 인증 + 보안 강화)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. 세션 기반 인증
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const supabase = await createServerSupabase();

        // 2. 관리자 체크 (이메일 + DB)
        let isAdmin = ADMIN_EMAILS.includes(user.email || "");
        if (!isAdmin) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("is_admin")
                .eq("id", user.id)
                .single();
            isAdmin = profile?.is_admin === true;
        }

        // 3. 일반 유저만 Rate Limit + VPN 체크 (관리자는 우회)
        if (!isAdmin) {
            const clientIP = await getClientIP();
            const rateLimit = checkRateLimit(clientIP, "write");
            if (!rateLimit.allowed) {
                return NextResponse.json(
                    { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                    { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
                );
            }
            const vpnCheck = await checkVPN(clientIP);
            if (vpnCheck.blocked) {
                console.warn(`[Security] VPN blocked on post delete: ${clientIP} - ${vpnCheck.reason}`);
                return NextResponse.json(getVPNBlockResponse(), { status: 403 });
            }
        }

        const { id } = await params;

        // 4. 본인 글 또는 관리자인지 확인
        const { data: existing } = await supabase
            .from("community_posts")
            .select("user_id")
            .eq("id", id)
            .single();

        if (!existing) {
            return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
        }

        const isOwner = existing.user_id === user.id;

        if (!isOwner && !isAdmin) {
            return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
        }

        // 5. 삭제 (관리자는 user_id 체크 없이, 작성자는 이중 검증)
        const adminSupabase = createAdminSupabase();
        let deleteError;
        if (isAdmin) {
            const result = await adminSupabase
                .from("community_posts")
                .delete()
                .eq("id", id);
            deleteError = result.error;
        } else {
            const result = await supabase
                .from("community_posts")
                .delete()
                .eq("id", id)
                .eq("user_id", user.id);
            deleteError = result.error;
        }
        const error = deleteError;

        if (error) {
            return NextResponse.json({ error: "게시글 삭제에 실패했습니다" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
