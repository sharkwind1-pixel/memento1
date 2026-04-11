/**
 * 크론 공통 유틸리티
 * - 배치 푸시 발송 (동시성 제한)
 * - 커서 기반 페이지네이션
 * - CRON_SECRET 인증
 * - KST 시간 유틸
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as webpush from "web-push";

// ===== 상수 =====

/** 한 번의 크론 호출에서 처리할 최대 유저 수 */
export const PAGE_SIZE = 500;

/** 동시에 발송할 푸시 알림 수 */
const PUSH_CONCURRENCY = 50;

/** Supabase .in() 쿼리에 넣을 최대 ID 수 */
export const MAX_IN_IDS = 200;

// ===== Supabase =====

export function getServiceSupabase(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_CONFIG_MISSING");
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
        // Next.js 14는 fetch를 기본적으로 캐싱함. Supabase JS 내부 fetch가
        // PostgREST 응답을 stale data로 반환하는 문제가 발생.
        // cache: 'no-store' 옵션으로 강제 무효화.
        global: {
            fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
        },
    });
}

// ===== VAPID 설정 =====

export function setupVapid(): void {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:support@memento-ani.com";
    if (!publicKey || !privateKey) throw new Error("VAPID_NOT_CONFIGURED");
    webpush.setVapidDetails(subject, publicKey, privateKey);
}

// ===== CRON_SECRET 인증 =====

export function verifyCronSecret(request: NextRequest): NextResponse | null {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json({ error: "CRON_SECRET_MISSING" }, { status: 500 });
    }
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null; // 인증 성공
}

// ===== KST 시간 유틸 =====

export interface KstTime {
    hour: number;
    dayOfWeek: number; // 0=일, 6=토
    day: number;       // 1~31
    dateStr: string;   // "YYYY-MM-DD"
    mmDd: string;      // "MM-DD"
    year: number;
    now: Date;         // KST 기준 Date
}

export function getKstTime(): KstTime {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    return {
        hour: kstNow.getUTCHours(),
        dayOfWeek: kstNow.getUTCDay(),
        day: kstNow.getUTCDate(),
        dateStr: kstNow.toISOString().slice(0, 10),
        mmDd: kstNow.toISOString().slice(5, 10),
        year: kstNow.getUTCFullYear(),
        now: kstNow,
    };
}

// ===== 푸시 발송 =====

interface PushSub {
    endpoint: string;
    p256dh: string;
    auth: string;
}

interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    url?: string;
}

export type PushResult = "sent" | "expired" | "failed";

/** 단일 푸시 발송 */
async function sendPushOne(
    sub: PushSub,
    payload: PushPayload,
): Promise<PushResult> {
    try {
        await webpush.sendNotification(
            {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({
                title: payload.title,
                body: payload.body,
                icon: payload.icon || "/logo.png",
                url: payload.url || "/?tab=ai-chat",
            }),
        );
        return "sent";
    } catch (err: unknown) {
        const pushErr = err as { statusCode?: number };
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            return "expired";
        }
        return "failed";
    }
}

export interface BatchPushResult {
    sent: number;
    failed: number;
    expiredEndpoints: string[];
}

/**
 * 배치 푸시 발송 (동시성 제한)
 * items: [{ sub, payload }] 배열
 * 동시에 PUSH_CONCURRENCY개씩 발송
 */
export async function sendPushBatch(
    items: { sub: PushSub; payload: PushPayload }[],
): Promise<BatchPushResult> {
    const result: BatchPushResult = { sent: 0, failed: 0, expiredEndpoints: [] };
    if (items.length === 0) return result;

    for (let i = 0; i < items.length; i += PUSH_CONCURRENCY) {
        const chunk = items.slice(i, i + PUSH_CONCURRENCY);
        const results = await Promise.allSettled(
            chunk.map(({ sub, payload }) => sendPushOne(sub, payload)),
        );

        for (let j = 0; j < results.length; j++) {
            const r = results[j];
            if (r.status === "fulfilled") {
                if (r.value === "sent") result.sent++;
                else if (r.value === "expired") {
                    result.expiredEndpoints.push(chunk[j].sub.endpoint);
                    result.failed++;
                } else {
                    result.failed++;
                }
            } else {
                result.failed++;
            }
        }
    }

    return result;
}

// ===== 만료 구독 정리 =====

export async function cleanupExpiredSubscriptions(
    supabase: SupabaseClient,
    endpoints: string[],
): Promise<number> {
    if (endpoints.length === 0) return 0;
    const unique = Array.from(new Set(endpoints));

    // .in()은 한 번에 MAX_IN_IDS개씩
    let deleted = 0;
    for (let i = 0; i < unique.length; i += MAX_IN_IDS) {
        const chunk = unique.slice(i, i + MAX_IN_IDS);
        const { count } = await supabase
            .from("push_subscriptions")
            .delete()
            .in("endpoint", chunk);
        deleted += count ?? chunk.length;
    }
    return deleted;
}

// ===== 유저별 구독 매핑 조회 (페이지네이션) =====

export interface SubRow {
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
}

/**
 * 유저 ID 목록으로 푸시 구독 조회 (MAX_IN_IDS 단위로 분할)
 */
export async function fetchSubsForUsers(
    supabase: SupabaseClient,
    userIds: string[],
): Promise<Map<string, SubRow[]>> {
    const map = new Map<string, SubRow[]>();
    if (userIds.length === 0) return map;

    for (let i = 0; i < userIds.length; i += MAX_IN_IDS) {
        const chunk = userIds.slice(i, i + MAX_IN_IDS);
        const { data } = await supabase
            .from("push_subscriptions")
            .select("user_id, endpoint, p256dh, auth")
            .in("user_id", chunk);

        if (data) {
            for (const row of data) {
                const arr = map.get(row.user_id) || [];
                arr.push(row);
                map.set(row.user_id, arr);
            }
        }
    }

    return map;
}
