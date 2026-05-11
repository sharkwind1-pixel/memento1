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
