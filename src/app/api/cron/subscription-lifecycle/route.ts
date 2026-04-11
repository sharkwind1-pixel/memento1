/**
 * 구독 해지 라이프사이클 크론잡
 * GET /api/cron/subscription-lifecycle
 *
 * 매일 KST 00:30 (UTC 15:30) 실행
 * 설계: docs/subscription-lifecycle.md (2026-04-11 재설계)
 *
 * 새 설계 (3단계):
 * 1. cancelled → archived (premium_expires_at 도달 시)
 *    - 무료 회원으로 전환 (is_premium=false, tier='free')
 *    - 대표 펫(protected_pet_id) 결정, 그 외 펫 archive
 *    - 대표 펫의 사진 50장 초과분 archive
 *    - 알림: "무료 회원으로 전환되었어요. 40일 후 초과 데이터 영구 삭제"
 *
 * 2. archived 유저 카운트다운 알림 (D-10 ~ D-1, 매일)
 *    - D-3부터는 강한 경고 톤
 *
 * 3. archived → active (data_reset_at 도달 시)
 *    - archived 펫 hard delete
 *    - archived 사진 hard delete
 *    - subscription_phase='active', 라이프사이클 필드 NULL로
 *    - 유저는 일반 무료 회원으로 복귀
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, getServiceSupabase } from "@/lib/cron-utils";
import { FREE_LIMITS } from "@/config/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Phase = "active" | "cancelled" | "archived";
type SbClient = ReturnType<typeof getServiceSupabase>;

interface ProfileLifecycle {
    id: string;
    nickname: string | null;
    subscription_phase: Phase;
    subscription_cancelled_at: string | null;
    premium_expires_at: string | null;
    data_reset_at: string | null;
    protected_pet_id: string | null;
}

interface Results {
    toArchived: number;       // cancelled → archived 전환
    archivedPets: number;     // archive된 펫 수
    archivedMedia: number;    // archive된 사진 수
    countdownNotified: number; // 카운트다운 알림 발송
    toActive: number;         // archived → active 복귀 (hard delete 후)
    deletedPets: number;      // hard delete된 펫 수
    deletedMedia: number;     // hard delete된 사진 수
    errors: string[];
}

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

    const results: Results = {
        toArchived: 0,
        archivedPets: 0,
        archivedMedia: 0,
        countdownNotified: 0,
        toActive: 0,
        deletedPets: 0,
        deletedMedia: 0,
        errors: [],
    };

    try {
        // ===== Phase 1: cancelled → archived (premium_expires_at 도달) =====
        const { data: cancelledDue, error: cdErr } = await supabase
            .from("profiles")
            .select("id, nickname, subscription_phase, subscription_cancelled_at, premium_expires_at, data_reset_at, protected_pet_id")
            .eq("subscription_phase", "cancelled")
            .lte("premium_expires_at", nowIso);

        if (cdErr) {
            results.errors.push(`cancelled fetch: ${cdErr.message}`);
        } else {
            for (const p of (cancelledDue || []) as ProfileLifecycle[]) {
                try {
                    await transitionToArchived(supabase, p, results);
                    results.toArchived++;
                } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    results.errors.push(`archive ${p.id}: ${msg}`);
                }
            }
        }

        // ===== Phase 2: archived 유저 카운트다운 알림 (D-10 ~ D-1) =====
        const { data: archivedUsers, error: auErr } = await supabase
            .from("profiles")
            .select("id, nickname, subscription_phase, subscription_cancelled_at, premium_expires_at, data_reset_at, protected_pet_id")
            .eq("subscription_phase", "archived")
            .gt("data_reset_at", nowIso);

        if (auErr) {
            results.errors.push(`archived fetch: ${auErr.message}`);
        } else {
            for (const p of (archivedUsers || []) as ProfileLifecycle[]) {
                if (!p.data_reset_at) continue;
                const resetAt = new Date(p.data_reset_at);
                const daysRemaining = Math.ceil(
                    (resetAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
                );

                // D-10 ~ D-1 범위만 매일 알림
                if (daysRemaining < 1 || daysRemaining > 10) continue;

                // D-3부터는 관리자 텔레그램 경고 (유저 이탈 직전 모니터링)
                if (daysRemaining <= 3) {
                    await notifySystem(
                        `아카이브 영구 삭제 임박 (D-${daysRemaining}): ${p.nickname || p.id}`
                    );
                }

                let title: string;
                let body: string;
                if (daysRemaining === 1) {
                    title = "내일 초과 데이터가 삭제됩니다";
                    body = "내일 자정에 보관된 반려동물과 사진이 영구 삭제됩니다. 마지막 기회예요. 재구독하면 모두 복구됩니다.";
                } else if (daysRemaining <= 5) {
                    title = `${daysRemaining}일 남았어요`;
                    body = `보관 중인 데이터가 ${daysRemaining}일 후 영구 삭제됩니다. 재구독하면 전부 지킬 수 있어요.`;
                } else {
                    title = `${daysRemaining}일 후 보관 데이터가 삭제됩니다`;
                    body = `초과 데이터가 ${daysRemaining}일 후 영구 삭제됩니다. 재구독하면 모두 복구됩니다.`;
                }

                const { error: notifErr } = await supabase.from("notifications").insert({
                    user_id: p.id,
                    type: "subscription_archive_countdown",
                    title,
                    body,
                    metadata: {
                        phase: "archived",
                        days_remaining: daysRemaining,
                        reset_at: p.data_reset_at,
                    },
                    dedup_key: `sub_arch_cd_${nowIso.slice(0, 10)}_${p.id}`,
                });

                if (notifErr && notifErr.code !== "23505") {
                    results.errors.push(`countdown notify ${p.id}: ${notifErr.message}`);
                    continue;
                }
                results.countdownNotified++;
            }
        }

        // ===== Phase 3: archived → active (data_reset_at 도달) — hard delete =====
        const { data: resetDue, error: rdErr } = await supabase
            .from("profiles")
            .select("id, nickname, subscription_phase, subscription_cancelled_at, premium_expires_at, data_reset_at, protected_pet_id")
            .eq("subscription_phase", "archived")
            .lte("data_reset_at", nowIso);

        if (rdErr) {
            results.errors.push(`reset fetch: ${rdErr.message}`);
        } else {
            for (const p of (resetDue || []) as ProfileLifecycle[]) {
                try {
                    await purgeArchivedData(supabase, p, results);
                    results.toActive++;
                } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    results.errors.push(`purge ${p.id}: ${msg}`);
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
                `archived→${results.toArchived} countdown→${results.countdownNotified} purge→${results.toActive}\n` +
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

/**
 * cancelled → archived 전환
 * 1. 대표 펫 결정 (미지정 시 가장 오래된 활성 펫)
 * 2. 대표 펫 외 펫 archive (archived_at=now)
 * 3. 대표 펫의 사진 50장 초과분 archive (즐겨찾기 + 최근순 유지)
 * 4. archive된 펫들의 사진도 같이 archive
 * 5. profiles: subscription_phase='archived', is_premium=false, tier='free'
 * 6. 알림 insert
 */
async function transitionToArchived(
    supabase: SbClient,
    profile: ProfileLifecycle,
    results: Results,
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
            const { data: oldestAny } = await supabase
                .from("pets")
                .select("id")
                .eq("user_id", profile.id)
                .is("archived_at", null)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();
            protectedPetId = oldestAny?.id || null;
        }
    }

    // 2. 대표 펫 외 archive
    if (protectedPetId) {
        const { data: archivedPets } = await supabase
            .from("pets")
            .update({ archived_at: now })
            .eq("user_id", profile.id)
            .neq("id", protectedPetId)
            .is("archived_at", null)
            .select("id");
        const archivedPetIds = (archivedPets || []).map((r) => r.id);
        results.archivedPets += archivedPetIds.length;

        // 2-1. archive된 펫들의 사진도 archive
        if (archivedPetIds.length > 0) {
            const BATCH = 200;
            for (let i = 0; i < archivedPetIds.length; i += BATCH) {
                const batch = archivedPetIds.slice(i, i + BATCH);
                const { data: archivedMediaRows } = await supabase
                    .from("pet_media")
                    .update({ archived_at: now })
                    .in("pet_id", batch)
                    .is("archived_at", null)
                    .select("id");
                results.archivedMedia += (archivedMediaRows || []).length;
            }
        }

        // 3. 대표 펫의 사진 50장 초과분 archive
        const { data: keepMedia } = await supabase
            .from("pet_media")
            .select("id")
            .eq("pet_id", protectedPetId)
            .is("archived_at", null)
            .order("is_favorite", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(FREE_LIMITS.PHOTOS_PER_PET);

        const keepIds = new Set((keepMedia || []).map((m) => m.id));

        const { data: allActive } = await supabase
            .from("pet_media")
            .select("id")
            .eq("pet_id", protectedPetId)
            .is("archived_at", null);

        const archiveIds = (allActive || [])
            .map((m) => m.id)
            .filter((id) => !keepIds.has(id));

        const BATCH = 200;
        for (let i = 0; i < archiveIds.length; i += BATCH) {
            const batch = archiveIds.slice(i, i + BATCH);
            const { data: archivedRows } = await supabase
                .from("pet_media")
                .update({ archived_at: now })
                .in("id", batch)
                .select("id");
            results.archivedMedia += (archivedRows || []).length;
        }
    }

    // 4. profile 전환: archived + 무료 회원으로
    await supabase
        .from("profiles")
        .update({
            subscription_phase: "archived",
            is_premium: false,
            premium_expires_at: now,
            premium_plan: null,
            subscription_tier: "free",
            protected_pet_id: protectedPetId,
        })
        .eq("id", profile.id);

    // 5. 알림
    const daysUntilPurge = profile.data_reset_at
        ? Math.max(0, Math.ceil((new Date(profile.data_reset_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
        : 40;

    const { error: notifErr } = await supabase.from("notifications").insert({
        user_id: profile.id,
        type: "subscription_archive_started",
        title: "무료 회원으로 전환되었어요",
        body: `결제 기간이 만료되어 무료 회원으로 전환되었습니다. 초과 데이터(반려동물, 사진)는 ${daysUntilPurge}일간 보관 후 영구 삭제됩니다. 그 전에 재구독하면 모두 복구됩니다.`,
        metadata: {
            phase: "archived",
            protected_pet_id: protectedPetId,
            archived_pets: results.archivedPets,
            archived_media: results.archivedMedia,
            days_until_purge: daysUntilPurge,
        },
        dedup_key: `sub_arch_start_${now.slice(0, 10)}_${profile.id}`,
    });
    if (notifErr && notifErr.code !== "23505") {
        throw new Error(`archive start notify failed: ${notifErr.message}`);
    }
}

/**
 * archived → active (hard delete + 일반 무료 회원 복귀)
 * 1. archived 펫들의 사진 hard delete
 * 2. archived 펫들 hard delete
 * 3. profile: phase='active', data_reset_at=null, cancelled_at=null
 * 4. 완료 알림
 *
 * 주의: protected_pet_id는 유지 (무료 회원으로서의 대표 펫으로 남음)
 */
async function purgeArchivedData(
    supabase: SbClient,
    profile: ProfileLifecycle,
    results: Results,
): Promise<void> {
    const nowIso = new Date().toISOString();

    // 1. archived 펫 수집
    const { data: archivedPetRows } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", profile.id)
        .not("archived_at", "is", null);
    const archivedPetIds = (archivedPetRows || []).map((r) => r.id);

    // 2. archived 펫들의 모든 사진 (archived or not) hard delete
    //    (archive된 펫 = 삭제 대상)
    let petMediaDeleted = 0;
    if (archivedPetIds.length > 0) {
        const BATCH = 200;
        for (let i = 0; i < archivedPetIds.length; i += BATCH) {
            const batch = archivedPetIds.slice(i, i + BATCH);
            const { data: deletedRows } = await supabase
                .from("pet_media")
                .delete()
                .in("pet_id", batch)
                .select("id");
            petMediaDeleted += (deletedRows || []).length;
        }
    }

    // 3. archived 펫 hard delete
    let petsDeleted = 0;
    if (archivedPetIds.length > 0) {
        const BATCH = 200;
        for (let i = 0; i < archivedPetIds.length; i += BATCH) {
            const batch = archivedPetIds.slice(i, i + BATCH);
            const { data: deletedRows } = await supabase
                .from("pets")
                .delete()
                .in("id", batch)
                .select("id");
            petsDeleted += (deletedRows || []).length;
        }
    }

    // 4. 대표 펫의 archived 사진 hard delete (50장 초과분)
    if (profile.protected_pet_id) {
        const { data: deletedRows } = await supabase
            .from("pet_media")
            .delete()
            .eq("pet_id", profile.protected_pet_id)
            .not("archived_at", "is", null)
            .select("id");
        petMediaDeleted += (deletedRows || []).length;
    }

    results.deletedPets += petsDeleted;
    results.deletedMedia += petMediaDeleted;

    // 5. profile: 일반 무료 회원으로 복귀
    await supabase
        .from("profiles")
        .update({
            subscription_phase: "active",
            subscription_cancelled_at: null,
            data_reset_at: null,
            // is_premium, tier는 이미 archive 전환 시점에 false/free로 설정됨
            // protected_pet_id는 유지 (대표 펫은 계속 존재)
        })
        .eq("id", profile.id);

    // 6. 완료 알림
    const { error: notifErr } = await supabase.from("notifications").insert({
        user_id: profile.id,
        type: "subscription_archive_complete",
        title: "보관 데이터가 정리되었습니다",
        body: `보관 기간이 만료되어 초과 데이터가 영구 삭제되었습니다. 대표 반려동물과 ${FREE_LIMITS.PHOTOS_PER_PET}장의 사진은 그대로 유지됩니다.`,
        metadata: {
            phase: "active",
            deleted_pets: petsDeleted,
            deleted_media: petMediaDeleted,
        },
        dedup_key: `sub_arch_done_${nowIso.slice(0, 10)}_${profile.id}`,
    });
    if (notifErr && notifErr.code !== "23505") {
        throw new Error(`archive complete notify failed: ${notifErr.message}`);
    }
}
