/**
 * 관리자 유저 상세 조회 API
 * GET: 특정 유저의 상세 정보 (펫 목록, 채팅수, 마지막 접속 등)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";

export const dynamic = "force-dynamic";

async function verifyAdmin() {
    const user = await getAuthUser();
    if (!user) return null;

    const isEmailAdmin = ADMIN_EMAILS.includes(user.email || "");
    if (isEmailAdmin) return user;

    const adminSupabase = createAdminSupabase();
    const { data: profile } = await adminSupabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (profile?.is_admin) return user;
    return null;
}

export async function GET(request: NextRequest) {
    try {
        const adminUser = await verifyAdmin();
        if (!adminUser) {
            return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
        }

        const userId = request.nextUrl.searchParams.get("userId");
        if (!userId) {
            return NextResponse.json({ error: "userId가 필요합니다" }, { status: 400 });
        }

        const adminSupabase = createAdminSupabase();

        const [profileResult, petsResult, mediaResult, chatCountResult, authUserResult] = await Promise.all([
            adminSupabase
                .from("profiles")
                .select("avatar_url, last_seen_at, subscription_tier, premium_expires_at, points")
                .eq("id", userId)
                .single(),
            adminSupabase
                .from("pets")
                .select("id, name, type, breed, status, profile_image, created_at")
                .eq("user_id", userId)
                .order("created_at", { ascending: true }),
            // 각 펫의 fallback 사진 후보: type=image, archived 제외, 즐겨찾기 우선, 최신순.
            // 펫당 1장씩만 쓰므로 user_id 스코프의 모든 이미지 중 상위 몇 개만 가져와도 충분.
            adminSupabase
                .from("pet_media")
                .select("pet_id, url, is_favorite, created_at")
                .eq("user_id", userId)
                .eq("type", "image")
                .is("archived_at", null)
                .order("is_favorite", { ascending: false })
                .order("created_at", { ascending: false })
                .limit(200),
            adminSupabase
                .from("chat_messages")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId),
            adminSupabase.auth.admin.getUserById(userId),
        ]);

        const profile = profileResult.data;
        const pets = petsResult.data || [];
        const mediaRows = (mediaResult.data || []) as Array<{ pet_id: string; url: string }>;
        const chatCount = chatCountResult.count || 0;
        const authUser = authUserResult.data?.user;

        // 펫별 첫 매치만 고름 (이미 우선순위 정렬된 상태)
        const fallbackByPet = new Map<string, string>();
        for (const m of mediaRows) {
            if (!fallbackByPet.has(m.pet_id) && m.url) {
                fallbackByPet.set(m.pet_id, m.url);
            }
        }

        return NextResponse.json({
            avatarUrl: profile?.avatar_url || null,
            lastSeenAt: profile?.last_seen_at || null,
            subscriptionTier: profile?.subscription_tier || null,
            premiumExpiresAt: profile?.premium_expires_at || null,
            points: profile?.points || 0,
            authEmail: authUser?.email || null,
            authProvider: authUser?.app_metadata?.provider || null,
            pets: pets.map(p => ({
                id: p.id,
                name: p.name,
                type: p.type,
                breed: p.breed ?? null,
                status: p.status,
                profile_image: p.profile_image,
                fallback_photo: fallbackByPet.get(p.id) || null,
                created_at: p.created_at,
            })),
            chatMessagesCount: chatCount,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
