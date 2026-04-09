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

        const [profileResult, petsResult, chatCountResult] = await Promise.all([
            adminSupabase
                .from("profiles")
                .select("avatar_url, last_seen_at, subscription_tier, premium_expires_at, points")
                .eq("id", userId)
                .single(),
            adminSupabase
                .from("pets")
                .select("id, name, type, status, profile_image")
                .eq("user_id", userId)
                .order("created_at", { ascending: true }),
            adminSupabase
                .from("chat_messages")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId),
        ]);

        const profile = profileResult.data;
        const pets = petsResult.data || [];
        const chatCount = chatCountResult.count || 0;

        return NextResponse.json({
            avatarUrl: profile?.avatar_url || null,
            lastSeenAt: profile?.last_seen_at || null,
            subscriptionTier: profile?.subscription_tier || null,
            premiumExpiresAt: profile?.premium_expires_at || null,
            points: profile?.points || 0,
            pets: pets.map(p => ({
                id: p.id,
                name: p.name,
                type: p.type,
                status: p.status,
                profile_image: p.profile_image,
            })),
            chatMessagesCount: chatCount,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
