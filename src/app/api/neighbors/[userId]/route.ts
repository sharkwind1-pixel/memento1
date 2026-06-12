/**
 * 이웃(팔로우) API — 인스타식 단방향, 맞팔 = 서로이웃 (PETHOME-SPEC §13-B)
 *
 * GET    /api/neighbors/[userId]            카운트 + (로그인 시) 내 관계
 * GET    ?list=followers|following&offset=0 목록 (프로필 조인, 서로이웃 표시)
 * POST   /api/neighbors/[userId]            이웃 추가 (알림 발송, 맞팔이면 서로이웃 안내)
 * DELETE /api/neighbors/[userId]            이웃 해제
 *
 * 쓰기는 세션(RLS: 본인 follower 행만) / 카운트·목록·알림은 admin (게스트 카운트 + RLS 무관 정확 집계)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { PG_ERROR_CODES } from "@/config/constants";

export const dynamic = "force-dynamic";

const LIST_PAGE_SIZE = 30;

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const url = new URL(_request.url);
        const list = url.searchParams.get("list");
        const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);

        const admin = createAdminSupabase();
        const user = await getAuthUser();

        // 비공개 펫홈 게이트 (9번 #1/#2): 소유자 외엔 카운트·목록 모두 차단
        // — minihompy GET 403 패턴 동일. 부분 리크(목록만 막고 숫자 노출) 방지 위해 카운트도 게이트.
        if (user?.id !== userId) {
            const { data: vis } = await admin
                .from("minihompy_settings")
                .select("is_public")
                .eq("user_id", userId)
                .maybeSingle();
            if (vis && vis.is_public === false) {
                return NextResponse.json({ error: "비공개 펫홈입니다" }, { status: 403 });
            }
        }

        // 목록은 로그인 필수 (9번 #1: 게스트에게 팔로워/팔로잉 목록+닉네임 노출 차단.
        // 카운트는 공개 펫홈 한정 게스트 허용 — 공개 펫홈 노출용)
        if (list && !user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        // 카운트
        const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
            admin.from("neighbors").select("id", { count: "exact", head: true }).eq("following_id", userId),
            admin.from("neighbors").select("id", { count: "exact", head: true }).eq("follower_id", userId),
        ]);

        // 내 관계 (로그인 시에만)
        let relation: { iFollow: boolean; followsMe: boolean; mutual: boolean } | null = null;
        if (user && user.id !== userId) {
            const [{ data: iFollowRow }, { data: followsMeRow }] = await Promise.all([
                admin.from("neighbors").select("id").eq("follower_id", user.id).eq("following_id", userId).maybeSingle(),
                admin.from("neighbors").select("id").eq("follower_id", userId).eq("following_id", user.id).maybeSingle(),
            ]);
            relation = {
                iFollow: !!iFollowRow,
                followsMe: !!followsMeRow,
                mutual: !!iFollowRow && !!followsMeRow,
            };
        }

        // 목록 요청
        let items: Array<{ userId: string; nickname: string; mutual: boolean }> | undefined;
        let total: number | undefined;
        if (list === "followers" || list === "following") {
            const keyCol = list === "followers" ? "following_id" : "follower_id";
            const otherCol = list === "followers" ? "follower_id" : "following_id";

            const { data: rows, count } = await admin
                .from("neighbors")
                .select(`id, ${otherCol}`, { count: "exact" })
                .eq(keyCol, userId)
                .order("created_at", { ascending: false })
                .range(offset, offset + LIST_PAGE_SIZE - 1);

            total = count ?? 0;
            const otherIds = (rows ?? []).map((r) => (r as Record<string, string>)[otherCol]);

            if (otherIds.length > 0) {
                const [{ data: profiles }, { data: reverseRows }] = await Promise.all([
                    admin.from("profiles").select("id, nickname").in("id", otherIds),
                    // 서로이웃 판정: 상대들이 userId 기준 반대 방향으로도 연결돼 있는가
                    admin
                        .from("neighbors")
                        .select(otherCol === "follower_id" ? "following_id" : "follower_id")
                        .eq(otherCol === "follower_id" ? "follower_id" : "following_id", userId)
                        .in(otherCol === "follower_id" ? "following_id" : "follower_id", otherIds),
                ]);

                const reverseSet = new Set(
                    (reverseRows ?? []).map((r) => Object.values(r as Record<string, string>)[0])
                );
                const nickMap = new Map((profiles ?? []).map((p) => [p.id, p.nickname || "익명"]));
                items = otherIds.map((id) => ({
                    userId: id,
                    nickname: nickMap.get(id) ?? "익명",
                    mutual: reverseSet.has(id),
                }));
            } else {
                items = [];
            }
        }

        return NextResponse.json({
            followerCount: followerCount ?? 0,
            followingCount: followingCount ?? 0,
            relation,
            ...(items !== undefined ? { items, total } : {}),
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
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

        const { userId } = await params;
        if (user.id === userId) {
            return NextResponse.json({ error: "자신을 이웃으로 추가할 수 없습니다" }, { status: 400 });
        }

        const admin = createAdminSupabase();

        // 대상 존재 확인
        const { data: target } = await admin
            .from("profiles")
            .select("id, nickname")
            .eq("id", userId)
            .maybeSingle();
        if (!target) {
            return NextResponse.json({ error: "존재하지 않는 사용자입니다" }, { status: 404 });
        }

        // 이웃 추가 (세션 클라 — RLS가 본인 follower 행만 허용)
        const supabase = await createServerSupabase();
        const { error: insertError } = await supabase
            .from("neighbors")
            .insert({ follower_id: user.id, following_id: userId });

        if (insertError) {
            if (insertError.code === PG_ERROR_CODES.UNIQUE_VIOLATION) {
                return NextResponse.json({ error: "이미 이웃입니다" }, { status: 400 });
            }
            return NextResponse.json({ error: "이웃 추가 실패" }, { status: 500 });
        }

        // 맞팔(서로이웃) 여부
        const { data: reverse } = await admin
            .from("neighbors")
            .select("id")
            .eq("follower_id", userId)
            .eq("following_id", user.id)
            .maybeSingle();
        const mutual = !!reverse;

        // 알림 (실패해도 팔로우 자체는 성공 — silent)
        try {
            const { data: me } = await admin
                .from("profiles")
                .select("nickname")
                .eq("id", user.id)
                .maybeSingle();
            const myNick = me?.nickname || "이웃";
            await admin.from("notifications").insert({
                user_id: userId,
                sender_id: user.id,
                type: "neighbor_follow",
                title: mutual ? "서로 이웃이 되었어요" : "새 이웃이 생겼어요",
                body: mutual
                    ? `${myNick}님과 서로 이웃이 되었어요! 펫홈에 놀러가 보세요`
                    : `${myNick}님이 회원님을 이웃으로 추가했어요`,
                metadata: { followerId: user.id, mutual },
                dedup_key: `neighbor_follow:${user.id}:${userId}`,
            });
        } catch { /* 알림 실패 무시 */ }

        return NextResponse.json({ following: true, mutual });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
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

        const { userId } = await params;
        const supabase = await createServerSupabase();
        await supabase
            .from("neighbors")
            .delete()
            .eq("follower_id", user.id)
            .eq("following_id", userId);

        return NextResponse.json({ following: false, mutual: false });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
