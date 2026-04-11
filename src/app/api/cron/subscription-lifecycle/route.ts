/**
 * 구독 해지 라이프사이클 크론잡
 * GET /api/cron/subscription-lifecycle
 *
 * 매일 KST 00:30 (UTC 15:30) 실행
 * 설계: docs/subscription-lifecycle.md
 *
 * 단계 전환:
 * 1. readonly 유저 중 D+30 지남 → hidden 전환 + 알림
 * 2. hidden 유저 중 D+80 지남 → countdown 전환 + 알림
 * 3. countdown 유저 → 매일 카운트다운 알림 (D-10 ~ D-1)
 * 4. countdown 유저 중 D+90 지남 → free 회귀 (Phase 6 회귀 로직)
 *
 * Phase 6 회귀 로직 (이 크론에서 직접 처리):
 * - protected_pet_id 외 펫 archive (pets.archived_at = now())
 * - 각 펫의 사진을 50장으로 축소 (즐겨찾기 우선 + 최근순)
 * - subscription_phase = 'free', is_premium = false
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, getServiceSupabase } from "@/lib/cron-utils";
import { FREE_LIMITS } from "@/config/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Phase = "readonly" | "hidden" | "countdown" | "free";

interface ProfileLifecycle {
    id: string;
    nickname: string | null;
    subscription_phase: Phase;
    subscription_cancelled_at: string | null;
    data_readonly_until: string | null;
    data_hidden_until: string | null;
    data_reset_at: string | null;
    protected_pet_id: string | null;
}

/** 텔레그램 시스템 알림 (실패 무시) */
async function notifySystem(message: string): Promise<void> {
    try {
        const { notifyError } = await import("@/lib/telegram");
        await notifyError({ endpoint: "subscription-lifecycle", error: message });
    } catch {
        // 무시
    }
}

export async function GET(request: NextRequest) {
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    const supabase = getServiceSupabase();
    const now = new Date();
    const nowIso = now.toISOString();

    const results = {
        toHidden: 0,
        toCountdown: 0,
        countdownNotified: 0,
        toFree: 0,
        archivedPets: 0,
        archivedMedia: 0,
        errors: [] as string[],
    };

    try {
        // ===== 1. readonly → hidden (D+30 지남) =====
        const { data: readonlyDue, error: roErr } = await supabase
            .from("profiles")
            .select("id, nickname, subscription_phase, subscription_cancelled_at, data_readonly_until, data_hidden_until, data_reset_at, protected_pet_id")
            .eq("subscription_phase", "readonly")
            .lte("data_readonly_until", nowIso);

        if (roErr) {
            results.errors.push(`readonly fetch: ${roErr.message}`);
        } else {
            for (const p of (readonlyDue || []) as ProfileLifecycle[]) {
                const { error: upErr } = await supabase
                    .from("profiles")
                    .update({ subscription_phase: "hidden" })
                    .eq("id", p.id);

                if (upErr) {
                    results.errors.push(`hidden transition ${p.id}: ${upErr.message}`);
                    continue;
                }

                const { error: notifErr } = await supabase.from("notifications").insert({
                    user_id: p.id,
                    type: "subscription_hidden_start",
                    title: "소중한 데이터를 잠시 보관 중이에요",
                    body: "구독 해지 후 30일이 지났어요. 데이터는 안전하게 보관되어 있고, 재구독하면 즉시 복구됩니다. 50일 후 일부 데이터가 정리됩니다.",
                    metadata: { phase: "hidden", reset_at: p.data_reset_at },
                    dedup_key: `sub_hidden_${nowIso.slice(0, 10)}_${p.id}`,
                });
                if (notifErr && notifErr.code !== "23505") {
                    results.errors.push(`hidden notify ${p.id}: ${notifErr.message}`);
                }

                results.toHidden++;
            }
        }

        // ===== 2. hidden → countdown (D+80 지남) =====
        const { data: hiddenDue, error: hdErr } = await supabase
            .from("profiles")
            .select("id, nickname, subscription_phase, subscription_cancelled_at, data_readonly_until, data_hidden_until, data_reset_at, protected_pet_id")
            .eq("subscription_phase", "hidden")
            .lte("data_hidden_until", nowIso);

        if (hdErr) {
            results.errors.push(`hidden fetch: ${hdErr.message}`);
        } else {
            for (const p of (hiddenDue || []) as ProfileLifecycle[]) {
                const { error: upErr } = await supabase
                    .from("profiles")
                    .update({ subscription_phase: "countdown" })
                    .eq("id", p.id);

                if (upErr) {
                    results.errors.push(`countdown transition ${p.id}: ${upErr.message}`);
                    continue;
                }

                const { error: notifErr } = await supabase.from("notifications").insert({
                    user_id: p.id,
                    type: "subscription_countdown",
                    title: "10일 후 데이터가 정리됩니다",
                    body: "무료 한도를 초과하는 데이터가 10일 후 정리됩니다. 재구독하면 모두 지킬 수 있어요.",
                    metadata: { phase: "countdown", days_remaining: 10, reset_at: p.data_reset_at },
                    dedup_key: `sub_countdown_${nowIso.slice(0, 10)}_${p.id}`,
                });
                if (notifErr && notifErr.code !== "23505") {
                    results.errors.push(`countdown notify ${p.id}: ${notifErr.message}`);
                }

                results.toCountdown++;
            }
        }

        // ===== 3. countdown 유저 매일 알림 (D-10 ~ D-1) =====
        const { data: countdownUsers, error: cdErr } = await supabase
            .from("profiles")
            .select("id, nickname, subscription_phase, subscription_cancelled_at, data_readonly_until, data_hidden_until, data_reset_at, protected_pet_id")
            .eq("subscription_phase", "countdown")
            .gt("data_reset_at", nowIso);

        if (cdErr) {
            results.errors.push(`countdown fetch: ${cdErr.message}`);
        } else {
            for (const p of (countdownUsers || []) as ProfileLifecycle[]) {
                if (!p.data_reset_at) continue;
                const resetAt = new Date(p.data_reset_at);
                const daysRemaining = Math.ceil(
                    (resetAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
                );

                if (daysRemaining < 1 || daysRemaining > 10) continue;

                // D-3부터는 관리자 모니터링 알림 (재구독 권유 마지막 기회)
                if (daysRemaining <= 3) {
                    await notifySystem(
                        `구독 회귀 임박 (D-${daysRemaining}): ${p.nickname || p.id} - ${nowIso.slice(0, 10)} 알림`
                    );
                }

                // 톤 강도: D-1 가장 강함
                let title: string;
                let body: string;
                if (daysRemaining === 1) {
                    title = "내일 데이터가 정리됩니다";
                    body = "내일 자정에 무료 한도 초과 데이터가 영구 정리됩니다. 마지막 기회예요.";
                } else if (daysRemaining <= 5) {
                    title = `${daysRemaining}일 남았어요`;
                    body = `등록된 반려동물과 사진이 ${daysRemaining}일 후 보관함에서 사라집니다. 재구독하면 전부 지킬 수 있어요.`;
                } else {
                    title = `${daysRemaining}일 후 데이터가 정리됩니다`;
                    body = `무료 한도를 초과하는 데이터가 ${daysRemaining}일 후 정리됩니다. 재구독하면 모두 지킬 수 있어요.`;
                }

                const { error: notifErr } = await supabase.from("notifications").insert({
                    user_id: p.id,
                    type: "subscription_countdown",
                    title,
                    body,
                    metadata: { phase: "countdown", days_remaining: daysRemaining, reset_at: p.data_reset_at },
                    dedup_key: `sub_countdown_${nowIso.slice(0, 10)}_${p.id}`,
                });
                if (notifErr && notifErr.code !== "23505") {
                    results.errors.push(`countdown daily notify ${p.id}: ${notifErr.message}`);
                    continue;
                }

                results.countdownNotified++;
            }
        }

        // ===== 4. countdown → free (D+90 지남) — 회귀 실행 =====
        const { data: resetDue, error: rsErr } = await supabase
            .from("profiles")
            .select("id, nickname, subscription_phase, subscription_cancelled_at, data_readonly_until, data_hidden_until, data_reset_at, protected_pet_id")
            .eq("subscription_phase", "countdown")
            .lte("data_reset_at", nowIso);

        if (rsErr) {
            results.errors.push(`reset fetch: ${rsErr.message}`);
        } else {
            for (const p of (resetDue || []) as ProfileLifecycle[]) {
                try {
                    await applyFreeReset(supabase, p, results);
                    results.toFree++;
                } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    results.errors.push(`reset ${p.id}: ${msg}`);
                }
            }
        }

        // ===== 30일 지난 알림 정리 =====
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabase
            .from("notifications")
            .delete()
            .lt("created_at", thirtyDaysAgo);

        if (results.errors.length > 0) {
            await notifySystem(
                `라이프사이클 크론 일부 실패: ${results.errors.length}건\n` +
                `처리: hidden→${results.toHidden} countdown→${results.toCountdown} reset→${results.toFree}\n` +
                results.errors.slice(0, 5).join("\n")
            );
        }

        return NextResponse.json({ ok: true, ...results });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await notifySystem(`라이프사이클 크론 치명적 실패: ${msg}`);
        return NextResponse.json({ error: msg, ...results }, { status: 500 });
    }
}

// ===== Phase 6 회귀 로직 =====

/**
 * 무료 회귀 적용
 * 1. protected_pet_id 결정 (없으면 가장 오래된 활성 펫)
 * 2. 그 외 펫들 archive (pets.archived_at = now())
 * 3. 보호 펫의 사진을 FREE_LIMITS.PHOTOS_PER_PET장으로 축소
 *    - 즐겨찾기 우선 + 최근순
 *    - 초과분 archive (pet_media.archived_at = now())
 * 4. profiles: subscription_phase = 'free', is_premium = false
 * 5. 회귀 완료 알림
 */
type SbClient = ReturnType<typeof getServiceSupabase>;

interface ResetCounters {
    archivedPets: number;
    archivedMedia: number;
}

async function applyFreeReset(
    supabase: SbClient,
    profile: ProfileLifecycle,
    results: ResetCounters
): Promise<void> {
    const now = new Date().toISOString();

    // 1. 대표 펫 결정
    let protectedPetId = profile.protected_pet_id;

    if (!protectedPetId) {
        // 미지정 시 가장 오래된 활성 펫 (active 우선, 없으면 memorial)
        const { data: oldestActive } = await supabase
            .from("pets")
            .select("id")
            .eq("user_id", profile.id)
            .is("archived_at", null)
            .eq("status", "active")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (oldestActive?.id) {
            protectedPetId = oldestActive.id;
        } else {
            const { data: oldestMemorial } = await supabase
                .from("pets")
                .select("id")
                .eq("user_id", profile.id)
                .is("archived_at", null)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();
            protectedPetId = oldestMemorial?.id || null;
        }
    }

    // 2. 보호 펫 외 모두 archive
    if (protectedPetId) {
        const { count: petArchCount } = await supabase
            .from("pets")
            .update({ archived_at: now })
            .eq("user_id", profile.id)
            .neq("id", protectedPetId)
            .is("archived_at", null);
        results.archivedPets += petArchCount || 0;
    } else {
        // 보호 펫 자체가 없는 경우 (펫 등록 안 함) — archive 대상 없음
    }

    // 3. 보호 펫의 사진 50장 초과분 archive
    //    UUID 컬럼은 PostgREST .in() 문법이 까다로우므로 ID를 1개씩 update 대신
    //    "유지 대상이 아닌 모든 활성 사진"을 가져와 ID 배열로 처리
    if (protectedPetId) {
        const { data: keepMedia } = await supabase
            .from("pet_media")
            .select("id")
            .eq("pet_id", protectedPetId)
            .is("archived_at", null)
            .order("is_favorite", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(FREE_LIMITS.PHOTOS_PER_PET);

        const keepIds = new Set((keepMedia || []).map((m) => m.id));

        // 모든 활성 사진 조회 후 keepIds에 없는 것만 archive
        const { data: allActive } = await supabase
            .from("pet_media")
            .select("id")
            .eq("pet_id", protectedPetId)
            .is("archived_at", null);

        const archiveIds = (allActive || [])
            .map((m) => m.id)
            .filter((id) => !keepIds.has(id));

        // 200개씩 배치로 archive (Supabase .in() 한도)
        const BATCH = 200;
        for (let i = 0; i < archiveIds.length; i += BATCH) {
            const batch = archiveIds.slice(i, i + BATCH);
            const { count: mediaArchCount } = await supabase
                .from("pet_media")
                .update({ archived_at: now })
                .in("id", batch);
            results.archivedMedia += mediaArchCount || 0;
        }
    }

    // 4. profile 회귀
    await supabase
        .from("profiles")
        .update({
            subscription_phase: "free",
            is_premium: false,
            premium_expires_at: now,
            premium_plan: null,
            subscription_tier: "free",
            protected_pet_id: protectedPetId,
        })
        .eq("id", profile.id);

    // 5. 회귀 완료 알림
    const { data: keptPet } = protectedPetId
        ? await supabase
            .from("pets")
            .select("name, type")
            .eq("id", protectedPetId)
            .maybeSingle()
        : { data: null };

    const petLabel = keptPet ? `${keptPet.type || ""} '${keptPet.name}'` : "없음";

    const { error: notifErr } = await supabase.from("notifications").insert({
        user_id: profile.id,
        type: "subscription_reset_complete",
        title: "무료 플랜으로 돌아오셨어요",
        body: `일부 데이터가 보관함으로 이동되었습니다. 보관된 데이터: 반려동물 1마리 (${petLabel}), 사진 ${FREE_LIMITS.PHOTOS_PER_PET}장 이내. 재구독하시면 보관된 데이터를 모두 복구할 수 있어요.`,
        metadata: {
            phase: "free",
            protected_pet_id: protectedPetId,
            archived_pets: results.archivedPets,
            archived_media: results.archivedMedia,
        },
        dedup_key: `sub_reset_${now.slice(0, 10)}_${profile.id}`,
    });
    if (notifErr && notifErr.code !== "23505") {
        throw new Error(`reset notify failed: ${notifErr.message}`);
    }
}
