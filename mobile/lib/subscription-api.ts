/**
 * 구독 API 클라이언트 — 웹 src/app/api/subscription/* 호출.
 *
 * - getRefundPreview: 해지 전 환불 예상액 (24h 이내 전액 / 이후 pro-rata, AI영상 사용 시 차감)
 * - cancelSubscription: 정기결제 해지 (active → cancelled 전환, 환불 처리는 서버에서)
 */

import { API_BASE_URL } from "@/config/constants";

export interface RefundPreview {
    isPremium: boolean;
    refundableAmount: number;
    isFullRefund: boolean;
    daysUsed: number;
    daysTotal: number;
    daysRemaining: number;
    originalAmount: number;
    grossRefund?: number;
    videoDeduction?: number;
    videosUsedCharged?: number;
    note?: string;
}

interface RawRefundPreview {
    is_premium?: boolean;
    refundable_amount?: number;
    is_full_refund?: boolean;
    days_used?: number;
    days_total?: number;
    days_remaining?: number;
    original_amount?: number;
    gross_refund?: number;
    video_deduction?: number;
    videos_used_charged?: number;
    note?: string;
}

async function callApi<T>(
    path: string,
    accessToken: string,
    init?: RequestInit,
): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(init?.body ? { "Content-Type": "application/json" } : {}),
            ...(init?.headers ?? {}),
        },
    });
    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
            const err = await res.json();
            msg = err.error || err.detail || msg;
        } catch {
            try { msg = (await res.text()).slice(0, 200) || msg; } catch {}
        }
        throw new Error(msg);
    }
    return (await res.json()) as T;
}

export async function getRefundPreview(accessToken: string): Promise<RefundPreview> {
    const raw = await callApi<RawRefundPreview>("/api/subscription/refund-preview", accessToken);
    return {
        isPremium: !!raw.is_premium,
        refundableAmount: raw.refundable_amount ?? 0,
        isFullRefund: !!raw.is_full_refund,
        daysUsed: raw.days_used ?? 0,
        daysTotal: raw.days_total ?? 0,
        daysRemaining: raw.days_remaining ?? 0,
        originalAmount: raw.original_amount ?? 0,
        grossRefund: raw.gross_refund,
        videoDeduction: raw.video_deduction,
        videosUsedCharged: raw.videos_used_charged,
        note: raw.note,
    };
}

export interface CancelResult {
    cancelled: boolean;
    refundedAmount?: number;
    expiresAt?: string | null;
    phase?: string;
    message?: string;
}

export async function cancelSubscription(accessToken: string): Promise<CancelResult> {
    const data = await callApi<Record<string, unknown>>("/api/subscription/cancel", accessToken, {
        method: "POST",
    });
    return {
        cancelled: data.cancelled === true || data.success === true,
        refundedAmount: typeof data.refundedAmount === "number"
            ? data.refundedAmount
            : (typeof data.refunded_amount === "number" ? data.refunded_amount : undefined),
        expiresAt: typeof data.expiresAt === "string"
            ? data.expiresAt
            : (typeof data.expires_at === "string" ? data.expires_at : null),
        phase: typeof data.phase === "string"
            ? data.phase
            : (typeof data.subscription_phase === "string" ? data.subscription_phase : undefined),
        message: typeof data.message === "string" ? data.message : undefined,
    };
}
