/**
 * Sentry 크래시 리포팅 (스켈레톤)
 *
 * - 기본 상태: @sentry/react-native 패키지가 설치되어 있지 않으면 자동으로 noop.
 * - 활성화 절차:
 *   1) `npx expo install @sentry/react-native` 실행
 *   2) Expo 환경변수 SENTRY_DSN_MOBILE 설정 (app.json extra 에 주입)
 *   3) `app.json`의 plugins 배열에 "@sentry/react-native/expo" 추가
 *   4) eas.json에 SENTRY_AUTH_TOKEN 환경변수 등록 (소스맵 업로드용)
 *
 * 함수 시그니처는 sentry-react-native와 호환되도록 맞춰놓음.
 * 호출자는 sentry 설치 여부와 무관하게 captureError(e), captureMessage(m), setUser(u) 사용 가능.
 */

import Constants from "expo-constants";

type AnyError = unknown;

interface SentryAPI {
    init: (opts: Record<string, unknown>) => void;
    captureException: (e: AnyError, ctx?: Record<string, unknown>) => void;
    captureMessage: (m: string, level?: string) => void;
    setUser: (u: { id?: string; email?: string } | null) => void;
    addBreadcrumb: (b: Record<string, unknown>) => void;
}

let sentry: SentryAPI | null = null;
let initialized = false;

function loadSentry(): SentryAPI | null {
    if (sentry) return sentry;
    try {
        // 동적 require: 미설치 시 metro/expo가 throw → noop
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("@sentry/react-native") as SentryAPI;
        sentry = mod;
        return sentry;
    } catch {
        return null;
    }
}

export function initSentry() {
    if (initialized) return;
    initialized = true;

    const dsn =
        (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.SENTRY_DSN_MOBILE as string | undefined
        ?? process.env.EXPO_PUBLIC_SENTRY_DSN_MOBILE;

    if (!dsn) {
        if (__DEV__) {
            console.log("[Sentry] DSN 미설정 — 비활성 (production 빌드 전 SENTRY_DSN_MOBILE 환경변수 추가 필요)");
        }
        return;
    }

    const s = loadSentry();
    if (!s) {
        if (__DEV__) {
            console.log("[Sentry] @sentry/react-native 미설치 — 스켈레톤 noop 모드");
        }
        return;
    }

    try {
        s.init({
            dsn,
            // 프로덕션 빌드에서만 보고 (개발 중 노이즈 차단)
            enabled: !__DEV__,
            tracesSampleRate: 0.1,
            // 모든 에러 기본 캡처
            enableNativeCrashHandling: true,
            enableAutoSessionTracking: true,
            // PII 자동 수집 차단 (개인정보 정책)
            sendDefaultPii: false,
            environment: __DEV__ ? "development" : "production",
            release: (Constants.expoConfig?.version ?? "1.0.0") as string,
        });
        if (__DEV__) console.log("[Sentry] 초기화 완료");
    } catch (e) {
        console.warn("[Sentry] init 실패:", (e as Error)?.message);
    }
}

export function captureError(error: AnyError, context?: Record<string, unknown>) {
    const s = loadSentry();
    s?.captureException?.(error, context);
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
    const s = loadSentry();
    s?.captureMessage?.(message, level);
}

export function setSentryUser(user: { id?: string; email?: string } | null) {
    const s = loadSentry();
    s?.setUser?.(user);
}

export function addSentryBreadcrumb(breadcrumb: { message: string; category?: string; data?: Record<string, unknown> }) {
    const s = loadSentry();
    s?.addBreadcrumb?.(breadcrumb);
}
