/**
 * Expo Push 발송 유틸 (서버 사이드)
 *
 * Expo Push Notification API를 통해 모바일 앱(iOS/Android)에 푸시 알림 전송.
 * profiles.expo_push_token에 저장된 토큰을 사용.
 *
 * Expo Push API 문서: https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * 발송 흐름:
 *  1. profiles에서 user_id로 expo_push_token 조회
 *  2. POST https://exp.host/--/api/v2/push/send (JSON)
 *  3. 응답에서 ticket 추출 (실패 시 토큰 무효화 등 후속 처리)
 *
 * 비용: Expo Push는 무료 서비스 (Apple/Google 인프라 사용).
 */

import { createClient } from "@supabase/supabase-js";

interface ExpoPushMessage {
    to: string;                                  // ExponentPushToken[xxx]
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
    sound?: "default" | null;
    priority?: "default" | "normal" | "high";
    badge?: number;
    channelId?: string;                          // Android 채널 ID
    /** iOS 무음 알림 + Android 진동 강제 — Haptics는 모바일 클라이언트 측에서 트리거 */
}

interface ExpoPushTicket {
    status: "ok" | "error";
    id?: string;
    message?: string;
    details?: {
        error?: "DeviceNotRegistered" | "MessageTooBig" | "MessageRateExceeded" | "MismatchSenderId" | "InvalidCredentials";
    };
}

interface ExpoPushResponse {
    data: ExpoPushTicket[];
    errors?: Array<{ code: string; message: string }>;
}

function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

/**
 * 사용자 ID로 푸시 알림 발송. expo_push_token이 없거나 토큰 무효 시 조용히 실패.
 *
 * @param userId - 대상 사용자 ID
 * @param title - 알림 제목
 * @param body - 알림 본문
 * @param data - 알림 탭 시 모바일이 받을 추가 데이터 (예: { type: "video_complete", videoId: "..." })
 * @returns 발송 성공 여부
 */
export async function sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
): Promise<boolean> {
    try {
        const supabase = getServiceSupabase();
        const { data: profile, error } = await supabase
            .from("profiles")
            .select("expo_push_token, push_platform")
            .eq("id", userId)
            .single();

        if (error || !profile?.expo_push_token) {
            // 토큰 없는 사용자(웹만 사용 등)는 정상 케이스
            return false;
        }

        const message: ExpoPushMessage = {
            to: profile.expo_push_token,
            title,
            body,
            sound: "default",
            priority: "high",
            data,
            channelId: profile.push_platform === "android" ? "default" : undefined,
        };

        const res = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Accept-encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
        });

        if (!res.ok) {
            console.warn(`[ExpoPush] HTTP ${res.status}`);
            return false;
        }

        const result = (await res.json()) as ExpoPushResponse;

        // 토큰 무효화 처리
        if (result.data?.[0]?.status === "error") {
            const errCode = result.data[0].details?.error;
            if (errCode === "DeviceNotRegistered") {
                // 토큰이 더 이상 유효하지 않음 → DB에서 제거
                await supabase
                    .from("profiles")
                    .update({ expo_push_token: null, push_platform: null })
                    .eq("id", userId);
                console.log(`[ExpoPush] 무효 토큰 제거: user=${userId}`);
            } else {
                console.warn(`[ExpoPush] error: ${errCode} / ${result.data[0].message}`);
            }
            return false;
        }

        return true;
    } catch (e) {
        console.error("[ExpoPush] 전송 실패:", e instanceof Error ? e.message : String(e));
        return false;
    }
}

/**
 * 다중 사용자 일괄 발송 (cron 매시간 reminders 등에서 사용).
 *
 * - 1쿼리로 N명 토큰 fetch (sendPushToUser 반복 호출 시 N+1 쿼리 회피)
 * - Expo Push API의 batch endpoint(/send) 사용 — 단일 요청에 100개까지
 * - 응답에서 ticket별 status 분리 → 성공/실패 카운트
 * - DeviceNotRegistered 토큰 자동 무효화
 *
 * @param items 발송 대상 (userId, title, body, optional data)
 * @returns 발송 결과 (sent, failed, expiredUserIds)
 */
export async function sendPushBatchToUsers(
    items: Array<{
        userId: string;
        title: string;
        body: string;
        data?: Record<string, unknown>;
    }>,
): Promise<{ sent: number; failed: number; expiredUserIds: string[] }> {
    if (items.length === 0) {
        return { sent: 0, failed: 0, expiredUserIds: [] };
    }

    try {
        const supabase = getServiceSupabase();
        const userIds = Array.from(new Set(items.map((it) => it.userId)));

        // 1. 토큰 한 번에 fetch
        const { data: profiles, error } = await supabase
            .from("profiles")
            .select("id, expo_push_token, push_platform")
            .in("id", userIds);

        if (error || !profiles) {
            console.warn("[ExpoPush/batch] profiles fetch fail:", error?.message);
            return { sent: 0, failed: items.length, expiredUserIds: [] };
        }

        const tokenMap = new Map<string, { token: string; platform: string | null }>();
        for (const p of profiles as Array<{ id: string; expo_push_token: string | null; push_platform: string | null }>) {
            if (p.expo_push_token) {
                tokenMap.set(p.id, { token: p.expo_push_token, platform: p.push_platform });
            }
        }

        // 2. 토큰 있는 항목만 메시지 만들기
        const messages: Array<ExpoPushMessage & { _userId: string }> = [];
        for (const it of items) {
            const tokenInfo = tokenMap.get(it.userId);
            if (!tokenInfo) continue; // 토큰 없는 유저는 silent skip
            messages.push({
                _userId: it.userId,
                to: tokenInfo.token,
                title: it.title,
                body: it.body,
                sound: "default",
                priority: "high",
                data: it.data,
                channelId: tokenInfo.platform === "android" ? "default" : undefined,
            });
        }

        if (messages.length === 0) {
            return { sent: 0, failed: 0, expiredUserIds: [] };
        }

        // 3. Expo는 한 번에 100개까지 chunk
        const CHUNK = 100;
        let sent = 0;
        let failed = 0;
        const expiredUserIds: string[] = [];

        for (let i = 0; i < messages.length; i += CHUNK) {
            const chunk = messages.slice(i, i + CHUNK);
            try {
                const res = await fetch("https://exp.host/--/api/v2/push/send", {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Accept-encoding": "gzip, deflate",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(chunk.map(({ _userId, ...m }) => { void _userId; return m; })),
                });

                if (!res.ok) {
                    failed += chunk.length;
                    console.warn(`[ExpoPush/batch] HTTP ${res.status}`);
                    continue;
                }

                const result = (await res.json()) as ExpoPushResponse;
                if (Array.isArray(result.data)) {
                    result.data.forEach((ticket, idx) => {
                        if (ticket.status === "ok") {
                            sent++;
                        } else {
                            failed++;
                            const errCode = ticket.details?.error;
                            if (errCode === "DeviceNotRegistered") {
                                expiredUserIds.push(chunk[idx]._userId);
                            }
                        }
                    });
                }
            } catch (e) {
                failed += chunk.length;
                console.error("[ExpoPush/batch] chunk error:", e instanceof Error ? e.message : String(e));
            }
        }

        // 4. 무효 토큰 일괄 정리
        if (expiredUserIds.length > 0) {
            await supabase
                .from("profiles")
                .update({ expo_push_token: null, push_platform: null })
                .in("id", expiredUserIds);
            console.log(`[ExpoPush/batch] 무효 토큰 ${expiredUserIds.length}개 제거`);
        }

        return { sent, failed, expiredUserIds };
    } catch (e) {
        console.error("[ExpoPush/batch] 전체 실패:", e instanceof Error ? e.message : String(e));
        return { sent: 0, failed: items.length, expiredUserIds: [] };
    }
}
