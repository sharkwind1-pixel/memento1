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

    const adminSb = createAdminSupabase();
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
            const msg = String(data.message || "");
            if (!(msg.includes("이미") || msg.includes("취소"))) {
                cancelResult = { ok: false, error: msg || "포트원 취소 실패", code: data.code };
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

    // DB payments 동기화
    const { data: dbPayment } = await adminSb
        .from("payments")
        .select("id, user_id, status, metadata, amount")
        .eq("metadata->>imp_uid", impUid)
        .maybeSingle();

    if (dbPayment) {
        await adminSb
            .from("payments")
            .update({
                status: "cancelled",
                metadata: {
                    ...((dbPayment.metadata as Record<string, unknown>) || {}),
                    cancelled_at: new Date().toISOString(),
                    cancel_reason: reason,
                    cancel_source: "admin_manual",
                    admin_email: user.email,
                    refunded_amount: finalCancelAmount,
                    original_amount: dbPayment.amount,
                },
            })
            .eq("id", dbPayment.id);

        // 프로필 무료화 (결제자)
        if (dbPayment.user_id) {
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
                .eq("id", dbPayment.user_id);

            await adminSb
                .from("subscriptions")
                .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
                .eq("user_id", dbPayment.user_id);

            // 감사 로그 기록
            await adminSb.from("subscription_cancel_audit").insert({
                user_id: dbPayment.user_id,
                user_email: null,
                action: syncOnly ? "admin_sync_only" : "admin_force_refund",
                success: true,
                imp_uid: impUid,
                payment_id: dbPayment.id,
                amount: dbPayment.amount,
                refunded_amount: finalCancelAmount,
                metadata: { admin_email: user.email, reason },
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
