/**
 * 푸시 알림 구독 관리 API
 * GET: 현재 구독 설정 조회 (preferred_hour)
 * POST: 브라우저 PushSubscription 정보를 DB에 저장
 * PATCH: 알림 시간 변경
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

/** GET: 현재 구독 설정 조회 */
export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 },
            );
        }

        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from("push_subscriptions")
            .select("preferred_hour")
            .eq("user_id", user.id)
            .limit(1)
            .single();

        if (error) {
            console.error("[Push GET] DB 조회 실패:", error.message);
        }
        if (error || !data) {
            return NextResponse.json({ preferredHour: 9 });
        }

        return NextResponse.json({
            preferredHour: data.preferred_hour ?? 9,
        });
    } catch {
        return NextResponse.json({ preferredHour: 9 });
    }
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
        const { subscription, preferredHour } = body;

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

        // preferredHour 검증 (KST 7~22시, 기본 9시 - 새벽 시간대 제외)
        const hour = typeof preferredHour === "number" && preferredHour >= 7 && preferredHour <= 22
            ? preferredHour
            : 9;

        const supabase = getServiceSupabase();

        const { error } = await supabase
            .from("push_subscriptions")
            .upsert(
                {
                    user_id: user.id,
                    endpoint: subscription.endpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                    preferred_hour: hour,
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

/** PATCH: 알림 시간만 변경 */
export async function PATCH(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 },
            );
        }

        const body = await request.json();
        const { preferredHour } = body;

        // 7~22시만 허용 (새벽 시간대 제외)
        if (typeof preferredHour !== "number" || preferredHour < 7 || preferredHour > 22) {
            return NextResponse.json(
                { error: "알림 시간은 오전 7시~오후 10시 사이로 설정해주세요." },
                { status: 400 },
            );
        }

        const supabase = getServiceSupabase();

        const { error } = await supabase
            .from("push_subscriptions")
            .update({
                preferred_hour: preferredHour,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);

        if (error) {
            console.error("[Push PATCH] DB 업데이트 실패:", error.message);
            return NextResponse.json(
                { error: "시간 변경에 실패했습니다." },
                { status: 500 },
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Push PATCH] Error:", err instanceof Error ? err.message : "unknown");
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

        const { error } = await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id)
            .eq("endpoint", endpoint);

        if (error) {
            console.error("[Push Unsubscribe] DB 삭제 실패:", error.message);
            return NextResponse.json(
                { error: "구독 해제에 실패했습니다." },
                { status: 500 },
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Push Unsubscribe] Error:", err instanceof Error ? err.message : "unknown");
        return NextResponse.json(
            { error: "서버 오류가 발생했습니다." },
            { status: 500 },
        );
    }
}
