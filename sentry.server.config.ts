/**
 * Sentry 서버 (Node.js / Edge Runtime) 초기화
 *
 * API 라우트, Server Components, Middleware 등에서 발생하는 에러를 캡처.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
    Sentry.init({
        dsn,
        enabled: process.env.NODE_ENV === "production",
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
        tracesSampleRate: 0.1,
        // 서버 측 흔한 noise 제외
        ignoreErrors: [
            "NEXT_REDIRECT",
            "NEXT_NOT_FOUND",
            "Headers and Cookies",
        ],
        beforeSend(event) {
            // 민감 정보 마스킹
            if (event.request?.cookies) delete event.request.cookies;
            if (event.request?.headers) {
                const headers = event.request.headers as Record<string, unknown>;
                delete headers["authorization"];
                delete headers["cookie"];
                delete headers["x-supabase-auth"];
            }
            // 환경변수 값 노출 방지
            if (event.extra) {
                const extra = event.extra as Record<string, unknown>;
                Object.keys(extra).forEach((key) => {
                    if (/secret|key|token|password/i.test(key)) {
                        extra[key] = "[REDACTED]";
                    }
                });
            }
            return event;
        },
    });
}
