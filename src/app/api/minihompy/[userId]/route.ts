/**
 * 미니홈피 조회 API
 * GET: 다른 사용자 미니홈피 데이터 조회
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { MINIHOMPY } from "@/config/constants";

export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        if (!userId) {
            return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
        }

        const [currentUser, supabase] = await Promise.all([
            getAuthUser(),
            createServerSupabase(),
        ]);

        // 미니홈피 설정 조회
        let settings = null;
        const { data: settingsData } = await supabase
            .from("minihompy_settings")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (!settingsData) {
            // 설정이 없는 경우 기본값
            settings = {
                userId,
                isPublic: true,
                backgroundSlug: MINIHOMPY.DEFAULT_BACKGROUND,
                greeting: "",
                todayVisitors: 0,
                totalVisitors: 0,
                totalLikes: 0,
                placedMinimi: [],
            };
        } else {
            // 비공개 체크 (본인은 항상 볼 수 있음)
            if (!settingsData.is_public && currentUser?.id !== userId) {
                return NextResponse.json({ error: "비공개 미니홈피입니다" }, { status: 403 });
            }

            // today_date 리셋 체크 (KST 기준)
            const kstOffset = 9 * 60 * 60 * 1000;
            const today = new Date(Date.now() + kstOffset).toISOString().split("T")[0];
            const todayVisitors = settingsData.today_date === today
                ? settingsData.today_visitors
                : 0;

            settings = {
                userId: settingsData.user_id,
                isPublic: settingsData.is_public,
                backgroundSlug: settingsData.background_slug,
                greeting: settingsData.greeting,
                todayVisitors,
                totalVisitors: settingsData.total_visitors,
                totalLikes: settingsData.total_likes,
                placedMinimi: Array.isArray(settingsData.placed_minimi) ? settingsData.placed_minimi : [],
            };
        }

        // profile / guestbook / like 는 모두 userId(또는 currentUser)에만 의존하고 서로 독립
        // → 병렬 실행으로 3왕복을 1왕복으로 단축. (settings는 위에서 403 분기 때문에 선행)
        const [profileRes, guestbookRes, likeRes] = await Promise.all([
            supabase
                .from("profiles")
                .select("nickname, equipped_minimi_id, equipped_accessories, minimi_pixel_data, minimi_accessories_data, onboarding_data")
                .eq("id", userId)
                .single(),
            supabase
                .from("minihompy_guestbook")
                .select("id, owner_id, visitor_id, content, created_at", { count: "exact" })
                .eq("owner_id", userId)
                .order("created_at", { ascending: false })
                .limit(MINIHOMPY.GUESTBOOK_PAGE_SIZE),
            currentUser
                ? supabase
                      .from("minihompy_likes")
                      .select("id")
                      .eq("owner_id", userId)
                      .eq("user_id", currentUser.id)
                      .maybeSingle()
                : Promise.resolve({ data: null }),
        ]);

        const profile = profileRes.data;
        const guestbook = guestbookRes.data;
        const count = guestbookRes.count;
        const isLiked = !!likeRes.data;

        const ownerNickname = profile?.nickname || "익명";
        const onboardingData = profile?.onboarding_data as Record<string, unknown> | null;
        const ownerPetType = (onboardingData?.petType as string) || "dog";

        // 2차 의존 쿼리: 소유자 미니미 slug(profile 의존) + 방명록 작성자 프로필(guestbook 의존)
        // → 서로 독립이라 병렬.
        const visitorIds = Array.from(new Set((guestbook || []).map(g => g.visitor_id)));
        const [minimiRow, visitorProfileRows] = await Promise.all([
            profile?.equipped_minimi_id
                ? supabase
                      .from("user_minimi")
                      .select("minimi_id")
                      .eq("id", profile.equipped_minimi_id)
                      .maybeSingle()
                      .then(r => r.data)
                : Promise.resolve(null),
            visitorIds.length > 0
                ? supabase
                      .from("profiles")
                      .select("id, nickname, minimi_pixel_data")
                      .in("id", visitorIds)
                      .then(r => r.data)
                : Promise.resolve(null),
        ]);

        const ownerMinimiSlug = minimiRow?.minimi_id || null;
        const ownerMinimiEquip = {
            minimiId: ownerMinimiSlug,
            accessoryIds: profile?.equipped_accessories || [],
            pixelData: profile?.minimi_pixel_data || null,
            accessoriesData: profile?.minimi_accessories_data || [],
        };

        // 방명록 작성자 닉네임 + 미니미
        let visitorProfiles: Record<string, { nickname: string; pixelData: unknown }> = {};
        if (visitorProfileRows) {
            visitorProfiles = Object.fromEntries(
                visitorProfileRows.map(p => [p.id, { nickname: p.nickname || "익명", pixelData: p.minimi_pixel_data }])
            );
        }

        const formattedGuestbook = (guestbook || []).map(g => ({
            id: g.id,
            ownerId: g.owner_id,
            visitorId: g.visitor_id,
            visitorNickname: visitorProfiles[g.visitor_id]?.nickname || "익명",
            visitorMinimiData: visitorProfiles[g.visitor_id]?.pixelData || null,
            content: g.content,
            createdAt: g.created_at,
        }));

        return NextResponse.json({
            settings,
            ownerNickname,
            ownerPetType,
            ownerMinimiEquip,
            guestbook: formattedGuestbook,
            guestbookTotal: count || 0,
            isLiked,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
