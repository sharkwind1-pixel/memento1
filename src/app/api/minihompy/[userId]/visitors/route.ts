/**
 * 미니홈피 방문자 목록 API
 *
 * GET /api/minihompy/[userId]/visitors
 *  - 본인 미니홈피만 조회 가능 (sensitive — 누가 다녀갔는지 노출)
 *  - 최근 50명 (visited_at DESC)
 *  - 익명 방문자(visitor_id null)는 "방문자"로 표시
 *  - 동일 visitor_id는 가장 최근 1건만 (DISTINCT ON 효과)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const currentUser = await getAuthUser();

        if (!currentUser || currentUser.id !== userId) {
            return NextResponse.json({ error: "본인의 방문자 기록만 조회할 수 있어요" }, { status: 403 });
        }

        const supabase = await createServerSupabase();

        // 최근 200건 가져와서 visitor_id별로 가장 최근 것만 추리기 (Postgres DISTINCT ON 대안)
        const { data: rawVisits, error } = await supabase
            .from("minihompy_visits")
            .select("id, visitor_id, visitor_ip, visited_at")
            .eq("owner_id", userId)
            .order("visited_at", { ascending: false })
            .limit(200);

        if (error) {
            console.error("[Visitors GET] error:", error);
            return NextResponse.json({ error: "방문자 목록 조회 실패" }, { status: 500 });
        }

        // visitor_id가 있으면 그것으로 dedup, 없으면 ip로 dedup
        const seen = new Set<string>();
        const dedupedVisits: typeof rawVisits = [];
        for (const v of rawVisits ?? []) {
            const key = v.visitor_id ?? `ip:${v.visitor_ip ?? "unknown"}`;
            if (seen.has(key)) continue;
            seen.add(key);
            dedupedVisits.push(v);
            if (dedupedVisits.length >= 50) break;
        }

        // 로그인 방문자의 닉네임/아바타 조회
        const visitorIds = dedupedVisits
            .map((v) => v.visitor_id)
            .filter((x): x is string => !!x);

        let profileMap: Record<string, { nickname: string; avatar: string | null }> = {};
        if (visitorIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, nickname, avatar_url")
                .in("id", visitorIds);
            if (profiles) {
                profileMap = Object.fromEntries(
                    profiles.map((p) => [p.id, {
                        nickname: p.nickname || "사용자",
                        avatar: p.avatar_url ?? null,
                    }]),
                );
            }
        }

        const visitors = dedupedVisits.map((v) => ({
            id: v.id,
            visitorId: v.visitor_id,
            visitorNickname: v.visitor_id
                ? (profileMap[v.visitor_id]?.nickname ?? "사용자")
                : "익명 방문자",
            visitorAvatar: v.visitor_id
                ? (profileMap[v.visitor_id]?.avatar ?? null)
                : null,
            visitedAt: v.visited_at,
        }));

        return NextResponse.json({ visitors });
    } catch (e) {
        console.error("[Visitors GET] exception:", e);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
