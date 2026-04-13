/**
 * /api/cron/notification-check
 * 매일 KST 08:00 (UTC 23:00) 실행
 *
 * 1. 구독 만료 예정 유저 (premium_expires_at 3일 이내) → subscription_expiring 알림
 * 2. dedup_key로 중복 방지 (같은 만료일에 대해 1회만)
 * 3. 해당 유저의 반려동물/사진 수를 조회하여 구체적 메시지 생성
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, getServiceSupabase } from "@/lib/cron-utils";

export async function GET(request: NextRequest) {
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    const supabase = getServiceSupabase();
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // active 구독 중 premium_expires_at이 3일 이내인 유저 조회
    const { data: expiringUsers, error: fetchError } = await supabase
        .from("profiles")
        .select("id, premium_plan, premium_expires_at")
        .eq("is_premium", true)
        .eq("subscription_phase", "active")
        .not("premium_expires_at", "is", null)
        .lte("premium_expires_at", threeDaysLater.toISOString())
        .gt("premium_expires_at", now.toISOString());

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expiringUsers || expiringUsers.length === 0) {
        return NextResponse.json({ processed: 0, created: 0 });
    }

    let created = 0;

    for (const user of expiringUsers) {
        const expiresAt = new Date(user.premium_expires_at);
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        const expiryDate = expiresAt.toISOString().slice(0, 10);
        const dedupKey = `sub_expiring_${user.id}_${expiryDate}`;

        // 중복 체크
        const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("dedup_key", dedupKey)
            .limit(1);

        if (existing && existing.length > 0) continue;

        // 반려동물 수 조회
        const { count: petCount } = await supabase
            .from("pets")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .is("archived_at", null);

        // 사진 수 조회
        const { count: photoCount } = await supabase
            .from("pet_media")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .is("archived_at", null);

        const planName = user.premium_plan === "premium" ? "프리미엄" : "베이직";

        const { error: insertError } = await supabase
            .from("notifications")
            .insert({
                user_id: user.id,
                type: "subscription_expiring",
                title: "구독 만료 예정 안내",
                body: `${planName} 구독이 ${daysLeft}일 후 만료됩니다. 현재 반려동물 ${petCount ?? 0}마리, 사진 ${photoCount ?? 0}장이 등록되어 있습니다. 무료 전환 시 새 등록/업로드가 제한될 수 있습니다.`,
                metadata: {
                    plan: user.premium_plan,
                    daysLeft,
                    petCount: petCount ?? 0,
                    photoCount: photoCount ?? 0,
                    expiresAt: user.premium_expires_at,
                },
                dedup_key: dedupKey,
            });

        if (!insertError) created++;
    }

    return NextResponse.json({
        processed: expiringUsers.length,
        created,
    });
}
