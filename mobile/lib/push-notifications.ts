/**
 * 푸시 알림 — expo-notifications 동적 로딩 (Expo Go boot 에러 회피)
 *
 * 배경:
 *   Expo Go (SDK 53+) 에서는 expo-notifications의 push token 모듈이
 *   `addPushTokenListener`를 module-level에서 호출하면서 throw.
 *   top-level `import * as Notifications from "expo-notifications"` 만 해도
 *   부팅 때마다 빨간 ERROR 박스가 떠서 사용자 화면에 노이즈.
 *
 * 해결:
 *   - top-level import 제거 → dynamic `await import("expo-notifications")`
 *   - 모듈 자체 로드 실패하면 silent 무효화 (Expo Go 환경)
 *   - dev build / production 에서는 정상 작동
 *
 * 운영 배포 전 외부 작업 (이 코드만으로는 푸시 안 옴):
 *   - iOS: APNs 키 + EAS Submit / TestFlight
 *   - Android: FCM 서비스 계정 + google-services.json
 *   - Expo `eas credentials` 로 push credential 등록
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import { API_BASE_URL } from "@/config/constants";

// 타입만 가져옴 (런타임 import 안 함). Expo Go 에서도 모듈 로드 안 됨.
type NotificationsModule = typeof import("expo-notifications");
type Notification = import("expo-notifications").Notification;
type NotificationResponse = import("expo-notifications").NotificationResponse;

// Expo Go 환경에서는 expo-notifications 자체를 import 안 함.
// dynamic import 시도해도 모듈 로드 시 module-level console.error("expo-notifications: ... removed from Expo Go")가 떠서
// RN HMRClient가 빨간 ERROR 박스로 표시. try-catch 못 잡음.
// → import 자체를 차단하는 게 유일한 방법.
const isExpoGo = Constants.appOwnership === "expo";

let cachedToken: string | null = null;
let handlerInited = false;
let cachedModule: NotificationsModule | null = null;
let moduleLoadAttempted = false;

/** expo-notifications 동적 로드. Expo Go 에서는 import 자체 차단 → null. */
async function loadNotifications(): Promise<NotificationsModule | null> {
    if (isExpoGo) return null; // 핵심: Expo Go면 모듈 로드 자체 안 함
    if (cachedModule) return cachedModule;
    if (moduleLoadAttempted) return null;
    moduleLoadAttempted = true;
    try {
        cachedModule = await import("expo-notifications");
        return cachedModule;
    } catch {
        return null;
    }
}

/** setNotificationHandler 1회 초기화. dynamic 모듈 로드 후 호출. */
async function ensureHandler(N: NotificationsModule): Promise<void> {
    if (handlerInited) return;
    try {
        N.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });
        handlerInited = true;
    } catch {
        // Expo Go: setNotificationHandler 자체가 throw 가능. 무시.
    }
}

/**
 * 권한 요청 + Expo push token 발급. 이미 발급된 토큰은 캐시.
 * 시뮬레이터/에뮬레이터/Expo Go 에서는 null.
 */
export async function getExpoPushToken(): Promise<string | null> {
    if (cachedToken) return cachedToken;

    const N = await loadNotifications();
    if (!N) return null;

    try {
        await ensureHandler(N);

        const { status: existingStatus } = await N.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
            const { status } = await N.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== "granted") {
            return null;
        }

        // Expo project ID 자동 추론
        const projectId =
            (N as unknown as { __expoConfig?: { extra?: { eas?: { projectId?: string } } } })
                .__expoConfig?.extra?.eas?.projectId;
        const tokenData = await N.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined,
        );
        cachedToken = tokenData.data;
        return cachedToken;
    } catch (e) {
        console.warn("[Push] 토큰 발급 실패:", e instanceof Error ? e.message : String(e));
        return null;
    }
}

/** 토큰을 백엔드에 등록. 로그인 후 호출. accessToken은 supabase 세션 토큰. */
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
        return true;
    } catch (e) {
        console.warn("[Push] register 네트워크 오류:", e instanceof Error ? e.message : String(e));
        return false;
    }
}

/** 로그아웃 시 백엔드 토큰 제거. */
export async function unregisterPushTokenFromBackend(accessToken: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/push/register`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        cachedToken = null;
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * 알림 listener 등록. 앱 전역 1회만.
 * 동기로 cleanup 함수를 즉시 반환하지만, 내부 listener 등록은 dynamic 로드 후 비동기.
 * Expo Go 에서는 listener 자체 등록 안 됨 (silent skip).
 */
export function setupNotificationListeners(handlers: {
    onReceived?: (n: Notification) => void;
    onResponse?: (r: NotificationResponse) => void;
}): () => void {
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    (async () => {
        const N = await loadNotifications();
        if (!N || cancelled) return;
        try {
            await ensureHandler(N);
            const sub1 = handlers.onReceived
                ? N.addNotificationReceivedListener(handlers.onReceived)
                : null;
            const sub2 = handlers.onResponse
                ? N.addNotificationResponseReceivedListener(handlers.onResponse)
                : null;
            cleanup = () => {
                sub1?.remove();
                sub2?.remove();
            };
        } catch {
            // Expo Go: listener API 자체가 throw 가능. silent skip.
        }
    })();

    return () => {
        cancelled = true;
        cleanup?.();
    };
}
