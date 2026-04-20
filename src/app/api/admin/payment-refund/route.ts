/**
 * /api/admin/payment-refund
 *
 * 관리자 강제 환불 + 결제 상태 조회 API.
 *
 * GET  ?imp_uid=... → 포트원 + DB 상태 비교 조회
 * POST { imp_uid, amount?, reason } → 포트원 cancel 호출 + DB 동기화
 *
 * 용도:
 * - stuck refund 발생 시 수동 보정
 * - CS 대응 (환불 요청 특수 케이스)
 * - 감사 로그 전수조사
 *
 * 보안: 관리자 인증 필수 (profiles.is_admin = true)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function assertAdmin(userId: string): Promise<boolean> {
    const sb = createAdminSupabase();
    const { data } = await sb.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
    return !!data?.is_admin;
}

async function getPortOneToken(): Promise<string | null> {
    const imp_key = process.env.PORTONE_REST_API_KEY;
    const imp_secret = process.env.PORTONE_API_SECRET;
    if (!imp_key || !imp_secret) return null;
    const res = await fetch("https://api.iamport.kr/users/getToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imp_key, imp_secret }),
    });
    const data = await res.json();
    return data?.response?.access_token || null;
}

interface PortOnePayment {
    status: string;
    amount: number;
    cancel_amount: number;
    merchant_uid: string;
    imp_uid: string;
    pay_method: string;
    card_name?: string;
    paid_at: number;
    cancelled_at?: number;
    cancel_history?: Array<{ amount: number; cancelled_at: number; reason: string }>;
}

async function fetchPortOnePayment(token: string, impUid: string): Promise<PortOnePayment | null> {
    try {
        const res = await fetch(`https://api.iamport.kr/payments/${encodeURIComponent(impUid)}`, {
            headers: { Authorization: token },
        });
        const data = await res.json();
        if (data.code !== 0 || !data.response) return null;
        return data.response;
    } catch {
        return null;
    }
}

// GET: 조회
export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    if (!(await assertAdmin(user.id))) return NextResponse.json({ error: "관리자 전용" }, { status: 403 });

    const url = new URL(request.url);
    const impUid = url.searchParams.get("imp_uid");
    const merchantUid = url.searchParams.get("merchant_uid");

    if (!impUid && !merchantUid) {
        return NextResponse.json({ error: "imp_uid 또는 merchant_uid 필요" }, { status: 400 });
    }

    const adminSb = createAdminSupabase();

    // DB 조회
    let dbQuery = adminSb.from("payments").select("id, user_id, status, amount, merchant_uid, metadata, created_at");
    if (impUid) {
        dbQuery = dbQuery.eq("metadata->>imp_uid", impUid);
    } else if (merchantUid) {
        dbQuery = dbQuery.eq("merchant_uid", merchantUid);
    }
    const { data: dbPayment } = await dbQuery.maybeSingle();

    // 포트원 조회 (imp_uid 있을 때만)
    let portonePayment: PortOnePayment | null = null;
    const resolvedImpUid = impUid || (dbPayment?.metadata as Record<string, unknown> | null)?.imp_uid as string | undefined;

    if (resolvedImpUid) {
        const token = await getPortOneToken();
        if (token) {
            portonePayment = await fetchPortOnePayment(token, resolvedImpUid);
        }
    }

    // 유저 이메일
    let userEmail: string | null = null;
    if (dbPayment?.user_id) {
        const { data: profile } = await adminSb
            .from("profiles")
            .select("id, nickname, is_premium, subscription_tier, subscription_phase, premium_expires_at")
            .eq("id", dbPayment.user_id)
            .maybeSingle();
        const { data: authUser } = await adminSb.auth.admin.getUserById(dbPayment.user_id);
        userEmail = authUser?.user?.email ?? null;

        return NextResponse.json({
            db_payment: dbPayment,
            portone_payment: portonePayment,
            profile,
            user_email: userEmail,
            sync_ok: !portonePayment
                ? null
                : (dbPayment?.status === "cancelled") === (portonePayment.status === "cancelled"),
        });
    }

    return NextResponse.json({
        db_payment: dbPayment,
        portone_payment: portonePayment,
        profile: null,
        user_email: null,
        sync_ok: null,
    });
}

// POST: 강제 환불 + DB 동기화
export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    if (!(await assertAdmin(user.id))) return NextResponse.json({ error: "관리자 전용" }, { status: 403 });

    let body: Record<string, unknown> = {};
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    const impUid = typeof body.imp_uid === "string" ? body.imp_uid : "";
    const reason = typeof body.reason === "string" ? body.reason : `관리자 수동 환불 (${user.email})`;
    const amount = typeof body.amount === "number" && body.amount > 0 ? body.amount : undefined;
    const syncOnly = !!body.sync_only;

    if (!impUid) return NextResponse.json({ error: "imp_uid 필수" }, { status: 400 });
    if (amount !== undefined && !Number.isInteger(amount)) {
        return NextResponse.json({ error: "amount는 정수여야 합니다" }, { status: 400 });
    }

    const adminSb = createAdminSupabase();

    // 동일 imp_uid가 DB에 여러 row로 존재할 가능성 (중복 insert 등). 여러 row면 wrong-user 리셋 위험.
    const { data: dbRows, error: dbErr } = await adminSb
        .from("payments")
        .select("id, user_id, status, metadata, amount")
        .eq("metadata->>imp_uid", impUid)
        .limit(2);
    if (dbErr) return NextResponse.json({ error: "DB 조회 실패", detail: dbErr.message }, { status: 500 });
    if (dbRows && dbRows.length > 1) {
        return NextResponse.json(
            {
                error: `imp_uid '${impUid}'가 DB에 ${dbRows.length}건 이상 존재합니다. 수동 조사 필요.`,
                duplicate_payment_ids: dbRows.map((r) => r.id),
            },
            { status: 409 }
        );
    }
    const dbPayment = dbRows && dbRows.length === 1 ? dbRows[0] : null;

    // 서버측 advisory lock: 짧은 시간창에 같은 imp_uid 중복 호출 방지
    // payments.status를 'paid' → 'cancelling' (pseudo)로 바꾸는 대신 metadata에 lock stamp 추가.
    // 이미 lock 잡혀있고 5분 안이면 409.
    if (dbPayment) {
        const lockKey = "admin_cancel_lock_at";
        const metadata = (dbPayment.metadata || {}) as Record<string, unknown>;
        const prevLock = typeof metadata[lockKey] === "string" ? Date.parse(metadata[lockKey] as string) : 0;
        if (prevLock && Date.now() - prevLock < 5 * 60 * 1000) {
            return NextResponse.json(
                { error: "같은 결제에 5분 이내 관리자 환불 작업이 진행 중입니다. 잠시 후 재시도해주세요." },
                { status: 409 }
            );
        }
        await adminSb
            .from("payments")
            .update({
                metadata: {
                    ...metadata,
                    [lockKey]: new Date().toISOString(),
                    admin_cancel_by: user.email,
                },
            })
            .eq("id", dbPayment.id);
    }

    const token = await getPortOneToken();
    if (!token) return NextResponse.json({ error: "포트원 토큰 실패" }, { status: 500 });

    // 현재 포트원 상태
    const portone = await fetchPortOnePayment(token, impUid);
    if (!portone) return NextResponse.json({ error: "포트원 결제 조회 실패" }, { status: 404 });

    let cancelResult: { ok: boolean; error?: string; code?: number } = { ok: true };

    // syncOnly 아니면 cancel 시도
    if (!syncOnly && portone.status !== "cancelled") {
        const cancelBody: Record<string, unknown> = {
            imp_uid: impUid,
            reason,
        };
        if (amount) cancelBody.amount = amount;
        const res = await fetch("https://api.iamport.kr/payments/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: token },
            body: JSON.stringify(cancelBody),
        });
        const data = await res.json();
        if (data.code !== 0) {
            // 문자열 매칭 대신 status 기반 판정
            if (data.response?.status !== "cancelled") {
                const verify = await fetchPortOnePayment(token, impUid);
                if (verify?.status !== "cancelled") {
                    cancelResult = { ok: false, error: String(data.message || "포트원 취소 실패"), code: data.code };
                }
            }
        }
    }

    if (!cancelResult.ok) {
        return NextResponse.json(
            { error: `환불 실패: ${cancelResult.error}`, code: cancelResult.code },
            { status: 502 }
        );
    }

    // 최신 포트원 상태 재조회
    const afterPortone = await fetchPortOnePayment(token, impUid);
    const finalCancelAmount = afterPortone?.cancel_amount ?? 0;

    // DB payments 동기화 — 위에서 lock 잡으면서 fetch한 dbPayment 재사용하되
    // metadata가 lock 타임스탬프 추가로 업데이트됐으니 최신 메타 재조회
    const { data: refreshedPayment } = dbPayment
        ? await adminSb
            .from("payments")
            .select("id, user_id, status, metadata, amount")
            .eq("id", dbPayment.id)
            .maybeSingle()
        : { data: null };

    if (refreshedPayment) {
        await adminSb
            .from("payments")
            .update({
                status: "cancelled",
                metadata: {
                    ...((refreshedPayment.metadata as Record<string, unknown>) || {}),
                    cancelled_at: new Date().toISOString(),
                    cancel_reason: reason,
                    cancel_source: "admin_manual",
                    admin_email: user.email,
                    refunded_amount: finalCancelAmount,
                    original_amount: refreshedPayment.amount,
                },
            })
            .eq("id", refreshedPayment.id);

        // 부분/전액 구분 — 부분 환불은 프로필 premium 유지 (남은 기간 사용)
        const isFullCancel =
            finalCancelAmount >= (refreshedPayment.amount || 0) && (refreshedPayment.amount || 0) > 0;

        if (refreshedPayment.user_id && isFullCancel) {
            await adminSb
                .from("profiles")
                .update({
                    is_premium: false,
                    premium_expires_at: null,
                    subscription_tier: "free",
                    subscription_phase: "active",
                    subscription_cancelled_at: new Date().toISOString(),
                    data_reset_at: null,
                    protected_pet_id: null,
                    premium_plan: null,
                })
                .eq("id", refreshedPayment.user_id);

            await adminSb
                .from("subscriptions")
                .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
                .eq("user_id", refreshedPayment.user_id);
        }

        // 감사 로그 기록 (부분/전액 무관)
        if (refreshedPayment.user_id) {
            await adminSb.from("subscription_cancel_audit").insert({
                user_id: refreshedPayment.user_id,
                user_email: null,
                action: syncOnly ? "admin_sync_only" : "admin_force_refund",
                success: true,
                imp_uid: impUid,
                payment_id: refreshedPayment.id,
                amount: refreshedPayment.amount,
                refunded_amount: finalCancelAmount,
                is_full_refund: isFullCancel,
                metadata: { admin_email: user.email, reason, is_full_cancel: isFullCancel },
            });
        }
    }

    // 텔레그램 알림
    void import("@/lib/telegram")
        .then(({ notifyPayment }) =>
            notifyPayment({
                email: `(admin:${user.email})`,
                plan: syncOnly ? "sync_only" : "admin_force_cancel",
                amount: -finalCancelAmount,
            }),
        )
        .catch(() => {});

    return NextResponse.json({
        ok: true,
        portone_status: afterPortone?.status,
        portone_cancel_amount: finalCancelAmount,
        db_synced: !!dbPayment,
    });
}
