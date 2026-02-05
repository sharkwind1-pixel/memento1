/**
 * IP 기반 Rate Limiting & 보안 유틸리티
 * - IP별 요청 횟수 제한
 * - 의심스러운 활동 탐지
 * - 토큰 어뷰징 방지
 */

import { headers } from "next/headers";

// 메모리 기반 저장소 (프로덕션에서는 Redis 권장)
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const ipBlockList = new Map<string, number>(); // IP -> 차단 해제 시간
const userDailyUsage = new Map<string, { count: number; date: string }>();

// Rate Limit 설정
const RATE_LIMITS = {
    // 일반 API (게시글 등)
    general: {
        windowMs: 60 * 1000, // 1분
        maxRequests: 60, // 분당 60회
    },
    // AI Chat API (비용 보호)
    aiChat: {
        windowMs: 60 * 1000, // 1분
        maxRequests: 10, // 분당 10회
        dailyLimit: 50, // 일일 50회 (비로그인)
        dailyLimitAuth: 200, // 일일 200회 (로그인)
    },
    // 인증 관련 (브루트포스 방지)
    auth: {
        windowMs: 15 * 60 * 1000, // 15분
        maxRequests: 10, // 15분당 10회
    },
    // 글 작성 (스팸 방지)
    write: {
        windowMs: 60 * 1000, // 1분
        maxRequests: 5, // 분당 5회
    },
};

// 차단 설정
const BLOCK_DURATION = 30 * 60 * 1000; // 30분 차단
const SUSPICIOUS_THRESHOLD = 3; // 3회 위반 시 차단

// IP 추출
export async function getClientIP(): Promise<string> {
    const headersList = await headers();

    // Vercel/Cloudflare 등 프록시 환경
    const forwardedFor = headersList.get("x-forwarded-for");
    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }

    // 기타 헤더
    const realIP = headersList.get("x-real-ip");
    if (realIP) {
        return realIP;
    }

    // Cloudflare
    const cfIP = headersList.get("cf-connecting-ip");
    if (cfIP) {
        return cfIP;
    }

    return "unknown";
}

// IP 차단 여부 확인
export function isIPBlocked(ip: string): boolean {
    const blockUntil = ipBlockList.get(ip);
    if (!blockUntil) return false;

    if (Date.now() > blockUntil) {
        ipBlockList.delete(ip);
        return false;
    }

    return true;
}

// IP 차단
export function blockIP(ip: string): void {
    ipBlockList.set(ip, Date.now() + BLOCK_DURATION);
    console.warn(`[Security] IP blocked: ${ip}`);
}

// Rate Limit 체크
export function checkRateLimit(
    ip: string,
    type: keyof typeof RATE_LIMITS = "general"
): { allowed: boolean; remaining: number; resetIn: number } {
    const config = RATE_LIMITS[type];
    const now = Date.now();
    const key = `${ip}:${type}`;

    // 차단된 IP 체크
    if (isIPBlocked(ip)) {
        return { allowed: false, remaining: 0, resetIn: BLOCK_DURATION };
    }

    const record = ipRequestCounts.get(key);

    // 새 윈도우 시작
    if (!record || now > record.resetTime) {
        ipRequestCounts.set(key, {
            count: 1,
            resetTime: now + config.windowMs,
        });
        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetIn: config.windowMs,
        };
    }

    // 기존 윈도우 내 요청
    record.count++;

    if (record.count > config.maxRequests) {
        // Rate limit 초과 - 위반 횟수 기록
        const violationKey = `${ip}:violations`;
        const violations = ipRequestCounts.get(violationKey);
        const violationCount = violations ? violations.count + 1 : 1;

        ipRequestCounts.set(violationKey, {
            count: violationCount,
            resetTime: now + 60 * 60 * 1000, // 1시간 후 리셋
        });

        // 반복 위반 시 차단
        if (violationCount >= SUSPICIOUS_THRESHOLD) {
            blockIP(ip);
        }

        return {
            allowed: false,
            remaining: 0,
            resetIn: record.resetTime - now,
        };
    }

    return {
        allowed: true,
        remaining: config.maxRequests - record.count,
        resetIn: record.resetTime - now,
    };
}

// AI Chat 일일 사용량 체크 (토큰 어뷰징 방지)
export function checkDailyUsage(
    identifier: string, // IP 또는 userId
    isAuthenticated: boolean
): { allowed: boolean; remaining: number; isWarning: boolean } {
    const today = new Date().toISOString().split("T")[0];
    const key = `daily:${identifier}`;
    const limit = isAuthenticated
        ? RATE_LIMITS.aiChat.dailyLimitAuth
        : RATE_LIMITS.aiChat.dailyLimit;

    const record = userDailyUsage.get(key);

    // 새 날짜 시작
    if (!record || record.date !== today) {
        userDailyUsage.set(key, { count: 1, date: today });
        return { allowed: true, remaining: limit - 1, isWarning: false };
    }

    record.count++;

    const remaining = limit - record.count;
    const isWarning = remaining <= 10 && remaining > 0;

    return {
        allowed: record.count <= limit,
        remaining: Math.max(0, remaining),
        isWarning,
    };
}

// 입력값 Sanitize (SQL Injection, XSS 방지)
export function sanitizeInput(input: string): string {
    if (!input) return "";

    return input
        // SQL Injection 방지
        .replace(/[';\\]/g, "")
        // XSS 방지
        .replace(/[<>]/g, "")
        // 길이 제한
        .slice(0, 1000)
        .trim();
}

// 검색어 Sanitize
export function sanitizeSearchQuery(query: string): string {
    if (!query) return "";

    return query
        // 특수문자 제거 (Supabase ilike용)
        .replace(/[%_'"\\;]/g, "")
        // 공백 정리
        .replace(/\s+/g, " ")
        // 길이 제한
        .slice(0, 100)
        .trim();
}

// 의심스러운 요청 패턴 감지
export function detectSuspiciousActivity(
    ip: string,
    userAgent: string | null
): { suspicious: boolean; reason?: string } {
    // 봇/스크래퍼 User-Agent 감지
    const botPatterns = [
        /curl/i,
        /wget/i,
        /python/i,
        /scrapy/i,
        /bot/i,
        /crawler/i,
        /spider/i,
    ];

    if (userAgent) {
        for (const pattern of botPatterns) {
            if (pattern.test(userAgent)) {
                return { suspicious: true, reason: "Bot detected" };
            }
        }
    }

    // User-Agent 없음
    if (!userAgent) {
        return { suspicious: true, reason: "Missing User-Agent" };
    }

    return { suspicious: false };
}

// Rate Limit 응답 헤더 생성
export function getRateLimitHeaders(
    remaining: number,
    resetIn: number
): Record<string, string> {
    return {
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(Math.ceil(resetIn / 1000)),
        "Retry-After": String(Math.ceil(resetIn / 1000)),
    };
}

// 메모리 정리 (주기적으로 호출)
export function cleanupExpiredRecords(): void {
    const now = Date.now();

    // ES5 호환 방식으로 Map 순회
    ipRequestCounts.forEach((record, key) => {
        if (now > record.resetTime) {
            ipRequestCounts.delete(key);
        }
    });

    ipBlockList.forEach((blockUntil, ip) => {
        if (now > blockUntil) {
            ipBlockList.delete(ip);
        }
    });
}

// 1시간마다 정리 (서버 시작 시 실행)
if (typeof setInterval !== "undefined") {
    setInterval(cleanupExpiredRecords, 60 * 60 * 1000);
}
