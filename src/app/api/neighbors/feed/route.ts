/**
 * 이웃 새소식 피드 API — 싸이월드 "일촌 새글" 엔진 (광장 상단 노출용)
 *
 * GET /api/neighbors/feed
 *   내가 이웃 맺은(팔로우한) 유저들의 최근 커뮤니티 글 목록.
 *   로그인 필수. 이웃 0명이면 hasNeighbors:false (UI는 섹션 자체를 숨김).
 *
 * 조회는 admin 클라(차단·숨김 필터 직접 적용) — neighbors/[userId] GET 패턴 동일.
 */

import { NextResponse } from "next/server";
import { createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const FEED_LIMIT = 10;
const FOLLOWING_CAP = 200; // in() 쿼리 폭주 방지 상한

export async function GET() {
    try {
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "general");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const admin = createAdminSupabase();

        // 내가 팔로우한 이웃들
        const { data: followRows } = await admin
            .from("neighbors")
            .select("following_id")
            .eq("follower_id", user.id)
            .order("created_at", { ascending: false })
            .limit(FOLLOWING_CAP);

        const followingIds = (followRows ?? []).map((r) => r.following_id);
        if (followingIds.length === 0) {
            return NextResponse.json({ hasNeighbors: false, items: [] });
        }

        // 차단한 유저는 새소식에서도 제외 (posts GET 패턴 동일)
        const { data: blocks } = await admin
            .from("user_blocks")
            .select("blocked_user_id")
            .eq("blocker_id", user.id);
        const blockedSet = new Set((blocks ?? []).map((b) => b.blocked_user_id));
        const visibleIds = followingIds.filter((id) => !blockedSet.has(id));
        if (visibleIds.length === 0) {
            return NextResponse.json({ hasNeighbors: true, items: [] });
        }

        // 이웃들의 최근 글 (숨김 제외)
        const { data: posts } = await admin
            .from("community_posts")
            .select("id, user_id, title, badge, board_type, created_at, likes")
            .in("user_id", visibleIds)
            .or("is_hidden.is.null,is_hidden.eq.false")
            .order("created_at", { ascending: false })
            .limit(FEED_LIMIT);

        if (!posts || posts.length === 0) {
            return NextResponse.json({ hasNeighbors: true, items: [] });
        }

        // 작성자 프로필 (닉네임/아바타)
        const authorIds = Array.from(new Set(posts.map((p) => p.user_id)));
        const { data: profiles } = await admin
            .from("profiles")
            .select("id, nickname, avatar_url")
            .in("id", authorIds);
        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

        const items = posts.map((p) => {
            const prof = profileMap.get(p.user_id);
            return {
                postId: p.id,
                userId: p.user_id,
                nickname: prof?.nickname || "이웃",
                avatarUrl: prof?.avatar_url || null,
                title: p.title,
                badge: p.badge,
                boardType: p.board_type,
                createdAt: p.created_at,
                likes: p.likes ?? 0,
            };
        });

        return NextResponse.json({ hasNeighbors: true, items });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
