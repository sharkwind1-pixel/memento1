/**
 * 브라우저 푸시 알림 클라이언트 유틸리티
 * Service Worker 등록, 푸시 구독/해제, 지원 여부 체크
 */

/**
 * 브라우저가 푸시 알림을 지원하는지 확인
 */
export function isPushSupported(): boolean {
    return (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
}

/**
 * 현재 알림 권한 상태 확인
 */
export function getNotificationPermission(): NotificationPermission | null {
    if (typeof window === "undefined" || !("Notification" in window)) {
        return null;
    }
    return Notification.permission;
}

/**
 * Service Worker 등록
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!isPushSupported()) return null;

    try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        return registration;
    } catch {
        console.error("[Push] Service Worker 등록 실패");
        return null;
    }
}

/**
 * 푸시 알림 구독
 */
export async function subscribeToPush(
    registration: ServiceWorkerRegistration,
): Promise<PushSubscription | null> {
    try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return null;

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            console.error("[Push] VAPID 공개키가 설정되지 않았습니다");
            return null;
        }

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        return subscription;
    } catch {
        console.error("[Push] 푸시 구독 실패");
        return null;
    }
}

/**
 * 현재 구독 상태 확인
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
    if (!isPushSupported()) return null;

    try {
        // SW가 3초 내 ready 안 되면 포기 (무한 대기 방지)
        const registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
        if (!registration) return null;
        return await registration.pushManager.getSubscription();
    } catch {
        return null;
    }
}

/**
 * 푸시 알림 구독 해제
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    const existing = await getExistingSubscription();
    if (!existing) return false;
    try {
        return await existing.unsubscribe();
    } catch {
        return false;
    }
}

/**
 * 푸시 구독이 안 되어 있으면 자동으로 권한 요청 + 구독 + 서버 등록
 * 리마인더 저장 시 호출하여 푸시 알림을 연동
 * @returns 구독 성공 여부
 */
export async function ensurePushSubscription(
    authFetchFn: (url: string, options: RequestInit) => Promise<Response>,
    subscribeApiUrl: string,
): Promise<boolean> {
    if (!isPushSupported()) return false;

    const permission = getNotificationPermission();
    if (permission === "denied") return false;

    // 이미 구독되어 있으면 건너뜀
    const existing = await getExistingSubscription();
    if (existing) return true;

    // 아직 권한 결정 안 한 경우 또는 이미 granted인 경우
    try {
        const registration = await registerServiceWorker();
        if (!registration) return false;

        const subscription = await subscribeToPush(registration);
        if (!subscription) return false;

        // 서버에 구독 등록
        const res = await authFetchFn(subscribeApiUrl, {
            method: "POST",
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                preferredHour: 9,
            }),
        });

        return res.ok;
    } catch {
        return false;
    }
}

/**
 * VAPID 키를 Uint8Array로 변환 (Web Push API 요구사항)
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer as ArrayBuffer;
}
