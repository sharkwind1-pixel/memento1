/**
 * 푸시 알림 등록 (V1 스캐폴딩)
 *
 * 흐름:
 * 1. expo-notifications 권한 요청
 * 2. Expo Push Token 발급
 * 3. POST /api/push/register {expoPushToken, platform} → profiles.expo_push_token 저장
 *
 * 운영 배포 전 필요한 외부 작업 (이 코드만으로는 실제 푸시 안 옴):
 * - iOS: Apple Push Notification 키 발급 + EAS Submit / TestFlight
 * - Android: Firebase Cloud Messaging 서비스 계정 + google-services.json
 * - Expo 프로젝트에 push credentials 등록 (`eas credentials`)
 *
 * 모바일 V1: 토큰 저장만. 발송은 서버 단에서 expo-server-sdk로 추후 추가.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { API_BASE_URL } from "@/config/constants";

// 백그라운드/포그라운드 알림 표시 동작 — 항상 보여주기
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

let cachedToken: string | null = null;

/**
 * 권한 요청 + Expo push token 발급. 이미 발급된 토큰은 캐시.
 * 시뮬레이터/에뮬레이터에서는 null 반환 (실 디바이스 필요).
 */
export async function getExpoPushToken(): Promise<string | null> {
    if (cachedToken) return cachedToken;

    // 권한 체크 (시뮬레이터에서는 권한은 받아도 토큰 발급 시 throw)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== "granted") {
        console.log("[Push] 권한 거부됨");
        return null;
    }

    try {
        // Expo project ID 자동 추론 (app.json/eas.json의 extra.eas.projectId)
        const projectId =
            (Notifications as unknown as { __expoConfig?: { extra?: { eas?: { projectId?: string } } } })
                .__expoConfig?.extra?.eas?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined,
        );
        cachedToken = tokenData.data;
        console.log("[Push] Expo token 발급:", cachedToken.slice(0, 30) + "...");
        return cachedToken;
    } catch (e) {
        console.warn("[Push] 토큰 발급 실패:", e instanceof Error ? e.message : String(e));
        return null;
    }
}

/**
 * 토큰을 백엔드에 등록. 로그인 후 호출.
 * accessToken은 supabase 세션 토큰.
 */
export async function registerPushTokenWithBackend(accessToken: string): Promise<boolean> {
    const expoPushToken = await getExpoPushToken();
    if (!expoPushToken) return false;

    try {
        const res = await fetch(`${API_BASE_URL}/api/push/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                expoPushToken,
                platform: Platform.OS, // "ios" | "android"
            }),
        });
        if (!res.ok) {
            const txt = await res.text().catch(() => "");
            console.warn(`[Push] register 실패 ${res.status}: ${txt.slice(0, 200)}`);
            return false;
        }
        console.log("[Push] 토큰 백엔드 등록 완료");
        return true;
    } catch (e) {
        console.warn("[Push] register 네트워크 오류:", e instanceof Error ? e.message : String(e));
        return false;
    }
}

/**
 * 알림 탭 시 호출되는 listener 등록. 앱 전역 1회만.
 * onNotificationReceived: 포그라운드에서 받은 경우
 * onNotificationResponseReceived: 알림 탭해서 진입한 경우 (네비 처리에 사용)
 */
export function setupNotificationListeners(handlers: {
    onReceived?: (n: Notifications.Notification) => void;
    onResponse?: (r: Notifications.NotificationResponse) => void;
}): () => void {
    const sub1 = handlers.onReceived
        ? Notifications.addNotificationReceivedListener(handlers.onReceived)
        : null;
    const sub2 = handlers.onResponse
        ? Notifications.addNotificationResponseReceivedListener(handlers.onResponse)
        : null;
    return () => {
        sub1?.remove();
        sub2?.remove();
    };
}
