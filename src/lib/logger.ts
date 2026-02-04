/**
 * Logger 유틸리티
 * - 개발 환경에서만 로그 출력
 * - 프로덕션에서는 에러만 출력
 */

const isDev = process.env.NODE_ENV === "development";

export const logger = {
    log: (...args: unknown[]) => {
        if (isDev) {
            console.log(...args);
        }
    },
    warn: (...args: unknown[]) => {
        if (isDev) {
            console.warn(...args);
        }
    },
    error: (...args: unknown[]) => {
        // 에러는 항상 출력 (프로덕션 디버깅용)
        console.error(...args);
    },
    debug: (...args: unknown[]) => {
        if (isDev) {
            console.log("[DEBUG]", ...args);
        }
    },
};

export default logger;
