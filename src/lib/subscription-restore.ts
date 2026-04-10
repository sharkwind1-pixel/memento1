/**
 * subscription-restore.ts
 * 재구독 시 라이프사이클 복구 로직
 *
 * 호출 시점:
 * - 결제 complete 라우트에서 grant_premium 직후
 * - 또는 별도 재구독 시점
 *
 * 복구 동작:
 * 1. profiles.subscription_phase = 'active'
 * 2. data_readonly_until / data_hidden_until / data_reset_at = NULL
 * 3. archived_at IS NOT NULL인 펫 중 90일 이내 archived 된 것 복구
 *    (90일 지난 데이터는 정책상 영구 보관이 아니므로 복구 안 함)
 * 4. 같은 조건으로 pet_media 복구
 * 5. 복구 완료 알림 (notifications)
 *
 * 설계: docs/subscription-lifecycle.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const RESTORE_WINDOW_DAYS = 90;

export interface RestoreResult {
    restoredPets: number;
    restoredMedia: number;
    wasLifecycleActive: boolean;
}

/**
 * 라이프사이클 데이터 복구
 * service-role supabase 클라이언트를 받아 사용
 */
export async function restoreFromLifecycle(
    supabase: SupabaseClient,
    userId: string
): Promise<RestoreResult> {
    const result: RestoreResult = {
        restoredPets: 0,
        restoredMedia: 0,
        wasLifecycleActive: false,
    };

    // 1. 현재 phase 확인
    const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_phase")
        .eq("id", userId)
        .maybeSingle();

    const currentPhase = profile?.subscription_phase || "active";
    result.wasLifecycleActive = currentPhase !== "active";

    // 2. profiles 라이프사이클 컬럼 초기화
    await supabase
        .from("profiles")
        .update({
            subscription_phase: "active",
            subscription_cancelled_at: null,
            data_readonly_until: null,
            data_hidden_until: null,
            data_reset_at: null,
            // protected_pet_id는 유지 (다음 해지 시 재사용 가능)
        })
        .eq("id", userId);

    // 3. 90일 이내 archived 펫 복구
    const cutoff = new Date(Date.now() - RESTORE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: archivedPets } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", userId)
        .not("archived_at", "is", null)
        .gte("archived_at", cutoff);

    const petIds = (archivedPets || []).map((p) => p.id);

    if (petIds.length > 0) {
        // 200개씩 배치
        const BATCH = 200;
        for (let i = 0; i < petIds.length; i += BATCH) {
            const batch = petIds.slice(i, i + BATCH);
            const { count } = await supabase
                .from("pets")
                .update({ archived_at: null })
                .in("id", batch);
            result.restoredPets += count || batch.length;
        }

        // 4. 복구된 펫들의 archived 사진도 복구
        const { data: archivedMedia } = await supabase
            .from("pet_media")
            .select("id")
            .in("pet_id", petIds)
            .not("archived_at", "is", null)
            .gte("archived_at", cutoff);

        const mediaIds = (archivedMedia || []).map((m) => m.id);

        for (let i = 0; i < mediaIds.length; i += BATCH) {
            const batch = mediaIds.slice(i, i + BATCH);
            const { count } = await supabase
                .from("pet_media")
                .update({ archived_at: null })
                .in("id", batch);
            result.restoredMedia += count || batch.length;
        }
    }

    // 5. 보호 펫의 사진 50장 초과분도 함께 복구 (해지 안 됐어도 archived가 있을 수 있음)
    //    "이 유저의 archived_at이 있는 모든 사진" 90일 이내 복구
    const { data: allArchivedMedia } = await supabase
        .from("pet_media")
        .select("id, pet_id")
        .not("archived_at", "is", null)
        .gte("archived_at", cutoff);

    if (allArchivedMedia && allArchivedMedia.length > 0) {
        // 유저 소유 펫의 사진만 필터
        const userPetIds = new Set<string>();
        const { data: userPets } = await supabase
            .from("pets")
            .select("id")
            .eq("user_id", userId);
        for (const p of userPets || []) userPetIds.add(p.id);

        const ownerArchivedMediaIds = allArchivedMedia
            .filter((m) => userPetIds.has(m.pet_id))
            .map((m) => m.id);

        const BATCH = 200;
        let restoredAdditional = 0;
        for (let i = 0; i < ownerArchivedMediaIds.length; i += BATCH) {
            const batch = ownerArchivedMediaIds.slice(i, i + BATCH);
            const { count } = await supabase
                .from("pet_media")
                .update({ archived_at: null })
                .in("id", batch);
            restoredAdditional += count || batch.length;
        }
        // 위 4단계에서 이미 처리된 것과 중복 가능 — 최종 총합만 사용
        if (restoredAdditional > result.restoredMedia) {
            result.restoredMedia = restoredAdditional;
        }
    }

    // 6. 복구 완료 알림 (라이프사이클이 진행 중이었던 경우만)
    if (result.wasLifecycleActive) {
        const now = new Date().toISOString();
        await supabase.from("notifications").insert({
            user_id: userId,
            type: "subscription_restored",
            title: "재구독 환영합니다",
            body: `보관되었던 데이터가 모두 복구되었습니다. 반려동물 ${result.restoredPets}마리, 사진 ${result.restoredMedia}장이 복원되었어요.`,
            metadata: {
                restored_pets: result.restoredPets,
                restored_media: result.restoredMedia,
            },
            dedup_key: `sub_restored_${now.slice(0, 10)}_${userId}`,
        });
    }

    return result;
}
