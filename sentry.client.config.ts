/**
 * Sentry 클라이언트 (브라우저) 초기화
 *
 * 환경변수 NEXT_PUBLIC_SENTRY_DSN이 있을 때만 활성화.
 * 없으면 노옵 (개발 환경 보호).
 *
 * 운영 활성화 절차:
 *  1. https://sentry.io 가입 + 프로젝트 생성 (Next.js)
 *  2. DSN 복사
 *  3. Vercel 환경변수에 추가:
 *     - NEXT_PUBLIC_SENTRY_DSN = https://xxx@xxx.ingest.sentry.io/xxx
 *     - SENTRY_AUTH_TOKEN (선택, source map 업로드용)
 *  4. Vercel Redeploy → 자동 적용
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
    Sentry.init({
        dsn,
        // 프로덕션에서만 추적. preview/development는 미동작
        enabled: process.env.NODE_ENV === "production",
        // 환경 구분 (Vercel preview vs production)
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
        // 트레이스 샘플링 — 비용 절감을 위해 10%
        tracesSampleRate: 0.1,
        // 세션 리플레이는 비활성화 (개인정보 노출 위험 + 비용)
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        // 잡지 않을 흔한 noise 에러
        ignoreErrors: [
            // 네트워크 에러
            "Network request failed",
            "Failed to fetch",
            "Load failed",
            // 사용자 취소 (정상)
            "AbortError",
            "The user aborted a request",
            // Next.js redirect (예상된 throw)
            "NEXT_REDIRECT",
            "NEXT_NOT_FOUND",
            // 브라우저 확장 프로그램
            "ResizeObserver loop limit exceeded",
            "ResizeObserver loop completed with undelivered notifications",
        ],
        // 민감 정보 제거 (URL/cookie 등에서)
        beforeSend(event) {
            // 인증 토큰, API 키 등 민감 정보 마스킹
            if (event.request?.cookies) delete event.request.cookies;
            if (event.request?.headers) {
                const headers = event.request.headers as Record<string, unknown>;
                delete headers["authorization"];
                delete headers["cookie"];
            }
            return event;
        },
    });
}
