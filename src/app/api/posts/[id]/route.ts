/**
 * 개별 게시글 API
 * GET: 게시글 상세 조회 (조회수 증가)
 * PATCH: 게시글 수정
 * DELETE: 게시글 삭제
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

        const supabase = await createServerSupabase();
        const { id } = await params;

        // 조회수 증가 (직접 업데이트)
        const { data: currentPost } = await supabase
            .from("community_posts")
            .select("views")
            .eq("id", id)
            .single();

        if (currentPost) {
            await supabase
                .from("community_posts")
                .update({ views: (currentPost.views || 0) + 1 })
                .eq("id", id);
        }

        // 게시글 조회
        const { data: post, error } = await supabase
            .from("community_posts")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
        }

        // 댓글 조회
        const { data: comments } = await supabase
            .from("post_comments")
            .select("*")
            .eq("post_id", id)
            .order("created_at", { ascending: true });

        return NextResponse.json({
            post: {
                ...post,
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

        const { title, content, badge } = body;

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
        const updateData: Record<string, string> = { updated_at: new Date().toISOString() };
        if (title) updateData.title = sanitizeInput(title).slice(0, 200);
        if (content) updateData.content = sanitizeInput(content).slice(0, 10000);
        if (badge) updateData.badge = sanitizeInput(badge).slice(0, 50);

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

        console.log(`[Post] Updated: ${id} by user ${user.id} from IP ${clientIP}`);
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
            console.warn(`[Security] VPN blocked on post delete: ${clientIP} - ${vpnCheck.reason}`);
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 3. 세션 기반 인증 (URL 파라미터에서 userId 받지 않음!)
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const supabase = await createServerSupabase();
        const { id } = await params;

        // 4. 본인 글인지 확인 (세션의 user.id 사용)
        const { data: existing } = await supabase
            .from("community_posts")
            .select("user_id")
            .eq("id", id)
            .single();

        if (!existing || existing.user_id !== user.id) {
            return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
        }

        // 5. 삭제 (이중 검증으로 user_id도 체크)
        const { error } = await supabase
            .from("community_posts")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) {
            return NextResponse.json({ error: "게시글 삭제에 실패했습니다" }, { status: 500 });
        }

        console.log(`[Post] Deleted: ${id} by user ${user.id} from IP ${clientIP}`);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
