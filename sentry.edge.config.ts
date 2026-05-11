/**
 * Sentry Edge Runtime 초기화 (middleware.ts 등)
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
    Sentry.init({
        dsn,
        enabled: process.env.NODE_ENV === "production",
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
        tracesSampleRate: 0.1,
    });
}
