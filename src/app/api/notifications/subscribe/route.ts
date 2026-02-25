/**
 * 푸시 알림 구독 관리 API
 * POST: 브라우저 PushSubscription 정보를 DB에 저장
 * DELETE: 구독 해제
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error("SUPABASE_CONFIG_MISSING");
    }
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

/** POST: 구독 저장 */
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 },
            );
        }

        const body = await request.json();
        const { subscription } = body;

        if (
            !subscription?.endpoint ||
            !subscription?.keys?.p256dh ||
            !subscription?.keys?.auth
        ) {
            return NextResponse.json(
                { error: "유효하지 않은 구독 정보입니다." },
                { status: 400 },
            );
        }

        const supabase = getServiceSupabase();

        const { error } = await supabase
            .from("push_subscriptions")
            .upsert(
                {
                    user_id: user.id,
                    endpoint: subscription.endpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id,endpoint" },
            );

        if (error) {
            console.error("[Push Subscribe] DB 저장 실패:", error.message);
            return NextResponse.json(
                { error: "구독 저장에 실패했습니다." },
                { status: 500 },
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Push Subscribe] Error:", err instanceof Error ? err.message : "unknown");
        return NextResponse.json(
            { error: "서버 오류가 발생했습니다." },
            { status: 500 },
        );
    }
}

/** DELETE: 구독 해제 */
export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 },
            );
        }

        const body = await request.json();
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json(
                { error: "endpoint가 필요합니다." },
                { status: 400 },
            );
        }

        const supabase = getServiceSupabase();

        await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id)
            .eq("endpoint", endpoint);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Push Unsubscribe] Error:", err instanceof Error ? err.message : "unknown");
        return NextResponse.json(
            { error: "서버 오류가 발생했습니다." },
            { status: 500 },
        );
    }
}
