/**
 * 구독 만료 예정 알림 크론잡
 * GET /api/cron/notification-check
 *
 * 매일 KST 08:00 (UTC 23:00) 실행
 * subscription-renewal (KST 07:30) 이후 실행
 *
 * - active 구독 중 next_billing_date 3일 이내인 유저 조회
 * - 반려동물/사진 수 조회 → 무료 한도 초과 시 구체적 경고
 * - dedup_key로 하루 1회만 알림
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, getServiceSupabase, getKstTime } from "@/lib/cron-utils";
import { FREE_LIMITS } from "@/config/constants";

export async function GET(request: NextRequest) {
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    const supabase = getServiceSupabase();
    const { dateStr } = getKstTime();
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    let created = 0;
    let skipped = 0;

    try {
        // active 구독 조회
        const { data: subscriptions, error } = await supabase
            .from("subscriptions")
            .select("id, user_id, plan, metadata")
            .eq("status", "active")
            .not("metadata->auto_renew", "eq", "false");

        if (error || !subscriptions) {
            return NextResponse.json({ error: "구독 조회 실패" }, { status: 500 });
        }

        // next_billing_date가 3일 이내인 구독 필터
        const expiringSubs = subscriptions.filter((sub) => {
            const nextBilling = sub.metadata?.next_billing_date;
            if (!nextBilling) return false;
            const billingDate = new Date(nextBilling);
            return billingDate <= threeDaysLater && billingDate > now;
        });

        for (const sub of expiringSubs) {
            const nextBilling = new Date(sub.metadata.next_billing_date);
            const daysLeft = Math.ceil((nextBilling.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            const planLabel = sub.plan === "premium" ? "프리미엄" : "베이직";
            const dedupKey = `sub_expiring_${dateStr}_${sub.user_id}`;

            // 반려동물/사진 수 조회
            const { count: petCount } = await supabase
                .from("pets")
                .select("id", { count: "exact", head: true })
                .eq("user_id", sub.user_id);

            const { data: petIds } = await supabase
                .from("pets")
                .select("id")
                .eq("user_id", sub.user_id);

            let photoCount = 0;
            if (petIds && petIds.length > 0) {
                const { count } = await supabase
                    .from("pet_media")
                    .select("id", { count: "exact", head: true })
                    .in("pet_id", petIds.map((p: { id: string }) => p.id));
                photoCount = count || 0;
            }

            // 무료 한도 초과 여부에 따라 메시지 분기
            const overPetLimit = (petCount || 0) > FREE_LIMITS.PETS;
            const overPhotoLimit = photoCount > FREE_LIMITS.PHOTOS_PER_PET;

            let body: string;
            if (overPetLimit || overPhotoLimit) {
                body = `${planLabel} 구독이 ${daysLeft}일 후 만료됩니다. 현재 반려동물 ${petCount || 0}마리, 사진 ${photoCount}장이 등록되어 있습니다. 무료 전환 시 새 등록/업로드가 제한될 수 있습니다. 구독을 유지하면 모든 기능을 계속 이용할 수 있습니다.`;
            } else {
                body = `${planLabel} 구독이 ${daysLeft}일 후 만료됩니다. 결제 수단을 확인해 주세요.`;
            }

            // dedup_key로 중복 방지 INSERT
            const { error: insertError } = await supabase
                .from("notifications")
                .insert({
                    user_id: sub.user_id,
                    type: "subscription_expiring",
                    title: "구독 만료 예정 안내",
                    body,
                    metadata: {
                        plan: sub.plan,
                        daysLeft,
                        petCount: petCount || 0,
                        photoCount,
                        overPetLimit,
                        overPhotoLimit,
                    },
                    dedup_key: dedupKey,
                });

            if (insertError) {
                // 23505 = unique_violation (이미 오늘 알림 생성됨)
                if (insertError.code === "23505") {
                    skipped++;
                }
            } else {
                created++;
            }
        }

        // ===== 기일 알림 (무지개다리 기념일 리마인더) =====
        // 추모 펫의 memorial_date 월-일이 오늘과 같으면 보호자에게 알림
        let memorialAlerts = 0;
        try {
            const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
            const todayMmDd = `${String(kstNow.getUTCMonth() + 1).padStart(2, "0")}-${String(kstNow.getUTCDate()).padStart(2, "0")}`;

            // memorial 상태 펫 중 memorial_date가 있는 것 조회
            const { data: memorialPets } = await supabase
                .from("pets")
                .select("id, name, user_id, memorial_date")
                .eq("status", "memorial")
                .not("memorial_date", "is", null);

            if (memorialPets) {
                for (const pet of memorialPets) {
                    if (!pet.memorial_date) continue;
                    // memorial_date에서 MM-DD 추출
                    const petDate = new Date(pet.memorial_date);
                    const petMmDd = `${String(petDate.getMonth() + 1).padStart(2, "0")}-${String(petDate.getDate()).padStart(2, "0")}`;

                    if (petMmDd !== todayMmDd) continue;

                    // 몇 주기인지 계산
                    const years = kstNow.getUTCFullYear() - petDate.getFullYear();
                    const yearLabel = years > 0 ? `${years}년이 지났어요` : "오늘이에요";

                    const dedupKey = `memorial_anniversary_${dateStr}_${pet.id}`;

                    const { error: memErr } = await supabase
                        .from("notifications")
                        .insert({
                            user_id: pet.user_id,
                            type: "welcome", // 기존 CHECK 제약에 있는 type 사용
                            title: `${pet.name}의 기억의 날`,
                            body: `${pet.name}이(가) 무지개다리를 건넌 지 ${yearLabel}. 소중한 추억은 언제나 함께해요.`,
                            metadata: {
                                pet_id: pet.id,
                                pet_name: pet.name,
                                memorial_date: pet.memorial_date,
                                years,
                            },
                            dedup_key: dedupKey,
                        });

                    if (!memErr) {
                        memorialAlerts++;
                    }
                    // 23505 중복은 무시
                }
            }
        } catch (memErr) {
            console.error("[notification-check] memorial anniversary error:", memErr);
        }

        // 30일 지난 알림 정리
        await supabase
            .from("notifications")
            .delete()
            .lt("created_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());

        // ===== 만료된 스토리 자동 삭제 (24시간 TTL) =====
        // stories.expires_at이 지난 row 삭제. RLS는 피드에서 숨기기만 하므로 DB 누적 방지.
        // NOTE: Storage 이미지(stories/{user_id}/*.ext)는 여기서 삭제하지 않음 →
        //       별도 후속 작업으로 storage cleanup 크론 필요 (현재는 고아 파일 누적 위험).
        let storiesDeleted = 0;
        try {
            const { data: expired, error: expErr } = await supabase
                .from("stories")
                .delete()
                .lt("expires_at", now.toISOString())
                .select("id");
            if (!expErr && expired) {
                storiesDeleted = expired.length;
            } else if (expErr) {
                console.error("[notification-check] stories cleanup error:", expErr);
            }
        } catch (stErr) {
            console.error("[notification-check] stories cleanup exception:", stErr);
        }

        return NextResponse.json({
            message: "알림 체크 완료",
            expiring: expiringSubs.length,
            created,
            skipped,
            memorialAlerts,
            storiesDeleted,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
