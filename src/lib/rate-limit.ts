/**
 * IP 기반 Rate Limiting & 보안 유틸리티
 * - IP별 요청 횟수 제한
 * - 의심스러운 활동 탐지
 * - 토큰 어뷰징 방지
 * - VPN/프록시 감지
 */

import { headers } from "next/headers";

// 메모리 기반 저장소 (프로덕션에서는 Redis 권장)
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const ipBlockList = new Map<string, number>(); // IP -> 차단 해제 시간
const userDailyUsage = new Map<string, { count: number; date: string }>();
const vpnCheckCache = new Map<string, { isVPN: boolean; checkedAt: number }>(); // VPN 체크 캐시

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
    // 쪽지 (스팸 방지)
    message: {
        windowMs: 60 * 1000, // 1분
        maxRequests: 10, // 분당 10회
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

/**
 * 리치 텍스트 HTML 콘텐츠 Sanitize
 * Tiptap 에디터 출력용 — 안전한 HTML 태그는 보존하고 XSS 벡터만 제거
 */
export function sanitizeHtmlContent(input: string): string {
    if (!input) return "";

    return input
        // script 태그 및 내용 제거
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        // 이벤트 핸들러 제거 (onclick, onerror 등)
        .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
        .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "")
        // javascript: 프로토콜 URL 제거
        .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, "")
        .replace(/src\s*=\s*["']javascript:[^"']*["']/gi, "")
        // iframe, object, embed, form, input 태그 제거
        .replace(/<\s*\/?\s*(iframe|object|embed|form|input)\b[^>]*>/gi, "")
        // 길이 제한
        .slice(0, 50000)
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

// ============================================
// VPN/프록시 감지 시스템
// ============================================

// 알려진 VPN/데이터센터 IP 대역 (일부)
// 실제 서비스에서는 MaxMind, IP2Location 등 DB 사용 권장
const KNOWN_VPN_RANGES = [
    // NordVPN 일부
    "185.159.156.", "185.159.157.", "185.159.158.", "185.159.159.",
    // ExpressVPN 일부
    "185.94.188.", "185.94.189.", "185.94.190.", "185.94.191.",
    // 일반적인 데이터센터 대역
    "104.238.", "104.243.", "45.33.", "45.56.", "45.79.",
    "66.228.", "96.126.", "173.230.", "173.255.",
    // AWS, GCP, Azure 일부 (대량의 봇이 사용)
    "35.192.", "35.193.", "35.194.", "35.195.",
    "52.0.", "52.1.", "52.2.", "52.3.",
    "13.64.", "13.65.", "13.66.", "13.67.",
];

// 의심스러운 ASN 키워드 (IP 정보 조회 시 사용)
const SUSPICIOUS_ASN_KEYWORDS = [
    "hosting", "datacenter", "cloud", "server", "vps",
    "proxy", "vpn", "tunnel", "anonymous"
];

/**
 * 헤더 기반 VPN/프록시 감지 (빠름, 무료)
 */
export async function detectVPNByHeaders(): Promise<{
    isVPN: boolean;
    confidence: "high" | "medium" | "low";
    reason?: string;
}> {
    const headersList = await headers();
    let suspicionScore = 0;
    const reasons: string[] = [];

    // 1. 프록시 관련 헤더 체크
    const proxyHeaders = [
        "via",
        "x-forwarded-for",
        "forwarded",
        "x-proxy-id",
        "proxy-connection",
    ];

    for (const header of proxyHeaders) {
        const value = headersList.get(header);
        if (value) {
            // X-Forwarded-For에 여러 IP가 있으면 프록시 경유
            if (header === "x-forwarded-for" && value.includes(",")) {
                suspicionScore += 2;
                reasons.push("Multiple proxy hops detected");
            }
            // Via 헤더가 있으면 프록시 사용
            if (header === "via") {
                suspicionScore += 3;
                reasons.push("Via header present");
            }
        }
    }

    // 2. VPN 관련 헤더 체크 (일부 VPN이 남기는 흔적)
    const vpnHeaders = [
        "x-vpn",
        "x-anonymous",
        "x-proxy",
    ];

    for (const header of vpnHeaders) {
        if (headersList.get(header)) {
            suspicionScore += 5;
            reasons.push(`VPN header: ${header}`);
        }
    }

    // 3. 불일치 체크 - Cloudflare 국가와 Accept-Language
    const cfCountry = headersList.get("cf-ipcountry");
    const acceptLang = headersList.get("accept-language");

    if (cfCountry && acceptLang) {
        // 한국 IP인데 한국어가 없으면 의심
        if (cfCountry === "KR" && !acceptLang.includes("ko")) {
            suspicionScore += 1;
            reasons.push("Language mismatch");
        }
        // 해외 IP인데 한국어만 있으면 VPN 가능성
        if (cfCountry !== "KR" && acceptLang.startsWith("ko") && !acceptLang.includes("en")) {
            suspicionScore += 2;
            reasons.push("Possible VPN (KR user from abroad)");
        }
    }

    // 4. 비정상적인 User-Agent 조합 체크
    const userAgent = headersList.get("user-agent");
    if (userAgent) {
        // 모바일 UA인데 화면 관련 힌트가 데스크톱인 경우
        if (userAgent.includes("Mobile") && headersList.get("sec-ch-ua-mobile") === "?0") {
            suspicionScore += 2;
            reasons.push("UA inconsistency");
        }
    }

    // 점수 기반 판정
    if (suspicionScore >= 5) {
        return { isVPN: true, confidence: "high", reason: reasons.join(", ") };
    } else if (suspicionScore >= 3) {
        return { isVPN: true, confidence: "medium", reason: reasons.join(", ") };
    } else if (suspicionScore >= 1) {
        return { isVPN: false, confidence: "low", reason: reasons.join(", ") };
    }

    return { isVPN: false, confidence: "low" };
}

/**
 * IP 대역 기반 VPN 감지 (빠름, 무료)
 */
export function detectVPNByIPRange(ip: string): boolean {
    // 알려진 VPN/데이터센터 IP 대역 체크
    for (const range of KNOWN_VPN_RANGES) {
        if (ip.startsWith(range)) {
            return true;
        }
    }
    return false;
}

/**
 * 외부 API를 통한 VPN 감지 (정확함, API 키 필요)
 * IPInfo.io 무료 플랜: 월 50,000 요청
 * 환경변수: IPINFO_TOKEN
 */
export async function detectVPNByAPI(ip: string): Promise<{
    isVPN: boolean;
    isProxy: boolean;
    isDatacenter: boolean;
    country?: string;
    org?: string;
}> {
    // 캐시 확인 (24시간)
    const cached = vpnCheckCache.get(ip);
    if (cached && Date.now() - cached.checkedAt < 24 * 60 * 60 * 1000) {
        return {
            isVPN: cached.isVPN,
            isProxy: cached.isVPN,
            isDatacenter: cached.isVPN,
        };
    }

    const token = process.env.IPINFO_TOKEN;
    if (!token) {
        // API 키 없으면 헤더/IP 대역 기반 감지만 사용
        return {
            isVPN: false,
            isProxy: false,
            isDatacenter: false,
        };
    }

    try {
        const response = await fetch(`https://ipinfo.io/${ip}?token=${token}`, {
            next: { revalidate: 86400 }, // 24시간 캐시
        });

        if (!response.ok) {
            return { isVPN: false, isProxy: false, isDatacenter: false };
        }

        const data = await response.json();

        // IPInfo privacy 필드 체크 (유료 플랜)
        const isVPN = data.privacy?.vpn || false;
        const isProxy = data.privacy?.proxy || false;

        // 무료 플랜: ASN/org 이름으로 추정
        const org = (data.org || "").toLowerCase();
        const isDatacenter = SUSPICIOUS_ASN_KEYWORDS.some(keyword =>
            org.includes(keyword)
        );

        // 캐시 저장
        vpnCheckCache.set(ip, {
            isVPN: isVPN || isProxy || isDatacenter,
            checkedAt: Date.now(),
        });

        return {
            isVPN,
            isProxy,
            isDatacenter,
            country: data.country,
            org: data.org,
        };
    } catch {
        return { isVPN: false, isProxy: false, isDatacenter: false };
    }
}

/**
 * 종합 VPN 감지 (헤더 + IP 대역 + API)
 */
export async function checkVPN(ip: string): Promise<{
    blocked: boolean;
    isVPN: boolean;
    confidence: "high" | "medium" | "low";
    reason?: string;
}> {
    // 1단계: IP 대역 체크 (가장 빠름)
    if (detectVPNByIPRange(ip)) {
        return {
            blocked: true,
            isVPN: true,
            confidence: "high",
            reason: "Known VPN/Datacenter IP range",
        };
    }

    // 2단계: 헤더 기반 체크
    const headerCheck = await detectVPNByHeaders();
    if (headerCheck.isVPN && headerCheck.confidence === "high") {
        return {
            blocked: true,
            isVPN: true,
            confidence: "high",
            reason: headerCheck.reason,
        };
    }

    // 3단계: API 체크 (있는 경우에만)
    if (process.env.IPINFO_TOKEN) {
        const apiCheck = await detectVPNByAPI(ip);
        if (apiCheck.isVPN || apiCheck.isProxy || apiCheck.isDatacenter) {
            return {
                blocked: true,
                isVPN: true,
                confidence: "high",
                reason: `Detected by API: ${apiCheck.org || "VPN/Proxy"}`,
            };
        }
    }

    // Medium confidence는 경고만 (차단 안함)
    if (headerCheck.confidence === "medium") {
        return {
            blocked: false,
            isVPN: true,
            confidence: "medium",
            reason: headerCheck.reason,
        };
    }

    return {
        blocked: false,
        isVPN: false,
        confidence: "low",
    };
}

/**
 * VPN 사용자에게 반환할 에러 응답
 */
export function getVPNBlockResponse() {
    return {
        error: "VPN/프록시 사용이 감지되었습니다. 보안을 위해 VPN을 끄고 다시 시도해주세요.",
        code: "VPN_DETECTED",
    };
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
