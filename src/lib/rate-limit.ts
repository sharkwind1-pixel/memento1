/**
 * IP 기반 Rate Limiting & 보안 유틸리티
 * - IP별 요청 횟수 제한
 * - 의심스러운 활동 탐지
 * - 토큰 어뷰징 방지 (AI 채팅 일일 제한은 Supabase DB 기반)
 * - VPN/프록시 감지
 */

import { headers } from "next/headers";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { FREE_LIMITS } from "@/config/constants";

// 메모리 기반 저장소 (프로덕션에서는 Redis 권장)
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const ipBlockList = new Map<string, number>(); // IP -> 차단 해제 시간
const userDailyUsage = new Map<string, { count: number; date: string }>();
const vpnCheckCache = new Map<string, { isVPN: boolean; isProxy: boolean; isDatacenter: boolean; checkedAt: number }>(); // VPN 체크 캐시
// 유저별 마지막 요청 시각 + 연속 빠른 요청 횟수 (봇 감지용)
const userLastRequest = new Map<string, { lastTime: number; fastCount: number }>();

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
        dailyLimit: FREE_LIMITS.DAILY_CHATS, // 무료 회원 일일 제한 (10회)
        dailyLimitAuth: 1000, // 프리미엄 일일 상한 (사람은 하루 100회도 힘듦, 1000 = 봇만 걸림)
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

// IP 추출 (스푸핑 방지)
// Vercel: x-forwarded-for의 가장 오른쪽 값이 실제 클라이언트 IP
// (클라이언트가 직접 설정한 가짜 IP는 왼쪽에 위치)
export async function getClientIP(): Promise<string> {
    const headersList = await headers();

    // 1순위: Vercel이 주입하는 헤더 (클라이언트 조작 불가)
    const vercelForwardedFor = headersList.get("x-vercel-forwarded-for");
    if (vercelForwardedFor) {
        // Vercel은 실제 클라이언트 IP를 첫 번째로 넣음
        return vercelForwardedFor.split(",")[0].trim();
    }

    // 2순위: Cloudflare가 주입하는 헤더 (클라이언트 조작 불가)
    const cfIP = headersList.get("cf-connecting-ip");
    if (cfIP) {
        return cfIP;
    }

    // 3순위: x-real-ip (프록시 설정에 따라 신뢰도 다름)
    const realIP = headersList.get("x-real-ip");
    if (realIP) {
        return realIP;
    }

    // 4순위: x-forwarded-for의 가장 오른쪽 값 (rightmost trustworthy IP)
    // 공격자가 X-Forwarded-For: fake 를 보내면 프록시가 "fake, real" 로 만듦
    // 따라서 마지막 값이 프록시가 실제로 본 IP
    const forwardedFor = headersList.get("x-forwarded-for");
    if (forwardedFor) {
        const ips = forwardedFor.split(",").map(ip => ip.trim());
        // Vercel 환경: 마지막 IP가 실제 클라이언트
        // 단일 IP면 그것이 실제 클라이언트
        return ips[ips.length - 1];
    }

    return "unknown";
}

// IP 차단 여부 확인 (메모리 캐시)
export function isIPBlocked(ip: string): boolean {
    const blockUntil = ipBlockList.get(ip);
    if (!blockUntil) return false;

    if (Date.now() > blockUntil) {
        ipBlockList.delete(ip);
        return false;
    }

    return true;
}

// IP 차단 (메모리 + DB 동시 기록 → 서버 재시작에도 유지)
export function blockIP(ip: string): void {
    ipBlockList.set(ip, Date.now() + BLOCK_DURATION);
    console.warn(`[Security] IP blocked: ${ip}`);

    // DB에도 차단 기록 (비동기, 실패해도 메모리 차단은 유지)
    const supabase = getRateLimitSupabase();
    if (supabase) {
        const blockedUntil = new Date(Date.now() + BLOCK_DURATION).toISOString();
        supabase
            .from("ip_blocks")
            .upsert({
                ip_address: ip,
                blocked_until: blockedUntil,
                reason: "rate_limit_violation",
                created_at: new Date().toISOString(),
            }, { onConflict: "ip_address" })
            .then(({ error }) => {
                if (error) console.error("[Security] IP 차단 DB 기록 실패:", error.message);
            });
    }
}

/**
 * DB 기반 IP 차단 확인 (서버리스 환경 대응)
 * 메모리 캐시 먼저 확인 → 없으면 DB 조회 → 결과 캐싱
 */
export async function isIPBlockedDB(ip: string): Promise<boolean> {
    // 1. 메모리 캐시 먼저 (빠름)
    if (isIPBlocked(ip)) return true;

    // 2. DB 조회 (서버 재시작 후에도 유지)
    const supabase = getRateLimitSupabase();
    if (!supabase) return false;

    try {
        const { data } = await supabase
            .from("ip_blocks")
            .select("blocked_until")
            .eq("ip_address", ip)
            .single();

        if (data && new Date(data.blocked_until) > new Date()) {
            // DB에서 차단 확인 → 메모리에도 캐싱
            ipBlockList.set(ip, new Date(data.blocked_until).getTime());
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

// Rate Limit 체크 (메모리 기반 — 빠른 1차 필터, DB 기반 분당 제한과 함께 사용)
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

/**
 * DB 기반 분당 Rate Limit (서버리스 환경 대응)
 * 메모리 기반 checkRateLimit은 인스턴스별 독립 → Vercel에서 무력화
 * 이 함수는 user_daily_usage 테이블의 별도 레코드로 분당 요청을 추적
 * KST 기준 분 단위 윈도우 사용
 */
export async function checkRateLimitDB(
    identifier: string,
    type: "aiChat" | "general" = "aiChat"
): Promise<{ allowed: boolean; remaining: number }> {
    const config = RATE_LIMITS[type === "aiChat" ? "aiChat" : "general"];
    const maxPerMinute = config.maxRequests; // aiChat: 10/분

    const supabase = getRateLimitSupabase();
    if (!supabase) {
        // DB 없으면 메모리 기반 폴백 (최소한의 방어)
        return { allowed: true, remaining: maxPerMinute };
    }

    try {
        // 현재 KST 분 단위 키 생성 (예: "2026-03-07T14:05")
        const now = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstNow = new Date(now.getTime() + kstOffset);
        const minuteKey = kstNow.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
        const kstDate = kstNow.toISOString().split("T")[0]; // "YYYY-MM-DD" (DATE 타입 호환)

        // usage_type에 분 키를 포함하여 DATE 컬럼 타입 제약 우회
        // 예: "aiChat_rpm_14:05" → 분 단위로 고유 레코드 생성
        const minuteSuffix = minuteKey.slice(11); // "HH:MM"
        const usageType = `${type}_rpm_${minuteSuffix}`;

        const { data: existing } = await supabase
            .from("user_daily_usage")
            .select("id, request_count")
            .eq("identifier", identifier)
            .eq("usage_type", usageType)
            .eq("usage_date", kstDate)
            .maybeSingle();

        if (existing) {
            const currentCount = existing.request_count || 0;
            if (currentCount >= maxPerMinute) {
                return { allowed: false, remaining: 0 };
            }
            // 카운트 증가
            await supabase
                .from("user_daily_usage")
                .update({ request_count: currentCount + 1 })
                .eq("id", existing.id);
            return { allowed: true, remaining: maxPerMinute - currentCount - 1 };
        } else {
            // 신규 분 윈도우
            await supabase
                .from("user_daily_usage")
                .insert({
                    identifier,
                    usage_type: usageType,
                    usage_date: kstDate,
                    request_count: 1,
                });
            return { allowed: true, remaining: maxPerMinute - 1 };
        }
    } catch {
        // DB 에러 시 통과 (서비스 중단 방지)
        return { allowed: true, remaining: maxPerMinute };
    }
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

// Supabase 클라이언트 (Rate-limit DB용, 지연 초기화)
let rateLimitSupabase: SupabaseClient | null = null;

function getRateLimitSupabase(): SupabaseClient | null {
    if (rateLimitSupabase) return rateLimitSupabase;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    rateLimitSupabase = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    return rateLimitSupabase;
}

/**
 * AI Chat 일일 사용량 체크 (DB 기반 - Vercel 서버리스 대응)
 * user_daily_usage 테이블에서 오늘 사용량을 조회/증가
 * KST(UTC+9) 기준 날짜 계산
 */
export async function checkDailyUsageDB(
    identifier: string,
    isAuthenticated: boolean
): Promise<{ allowed: boolean; remaining: number; isWarning: boolean }> {
    const limit = isAuthenticated
        ? RATE_LIMITS.aiChat.dailyLimitAuth
        : RATE_LIMITS.aiChat.dailyLimit;

    const supabase = getRateLimitSupabase();
    if (!supabase) {
        // DB 접속 불가 시 메모리 기반 폴백
        return checkDailyUsage(identifier, isAuthenticated);
    }

    try {
        // KST 기준 오늘 날짜 계산
        const now = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstDate = new Date(now.getTime() + kstOffset)
            .toISOString()
            .split("T")[0];

        // DB에서 오늘 사용량 조회
        const { data: existing } = await supabase
            .from("user_daily_usage")
            .select("id, request_count")
            .eq("identifier", identifier)
            .eq("usage_type", "ai_chat")
            .eq("usage_date", kstDate)
            .maybeSingle();

        let currentCount: number;

        if (existing) {
            // 기존 레코드 카운트 증가 (optimistic locking으로 레이스 컨디션 방지)
            const oldCount = existing.request_count || 0;
            const newCount = oldCount + 1;
            const { data: updated } = await supabase
                .from("user_daily_usage")
                .update({ request_count: newCount })
                .eq("id", existing.id)
                .eq("request_count", oldCount) // 다른 요청이 먼저 증가시켰으면 매칭 실패 → 0 rows updated
                .select("request_count")
                .maybeSingle();

            if (!updated) {
                // 동시 요청으로 카운트가 변경됨 → 최신값 재조회 후 재시도
                const { data: fresh } = await supabase
                    .from("user_daily_usage")
                    .select("request_count")
                    .eq("id", existing.id)
                    .single();
                const freshCount = (fresh?.request_count || 0);
                const retryCount = freshCount + 1;
                await supabase
                    .from("user_daily_usage")
                    .update({ request_count: retryCount })
                    .eq("id", existing.id)
                    .eq("request_count", freshCount);
                currentCount = retryCount;
            } else {
                currentCount = updated.request_count;
            }
        } else {
            // 신규 레코드 생성
            await supabase
                .from("user_daily_usage")
                .insert({
                    identifier,
                    usage_type: "ai_chat",
                    usage_date: kstDate,
                    request_count: 1,
                });
            currentCount = 1;
        }

        const remaining = limit - currentCount;
        const isWarning = remaining <= 10 && remaining > 0;

        return {
            allowed: currentCount <= limit,
            remaining: Math.max(0, remaining),
            isWarning,
        };
    } catch {
        // DB 에러 시 메모리 기반 폴백
        return checkDailyUsage(identifier, isAuthenticated);
    }
}

// 입력값 Sanitize (SQL Injection, XSS, 프롬프트 인젝션 방지)
export function sanitizeInput(input: string): string {
    if (!input) return "";

    return input
        // 1. 보이지 않는 유니코드 제거 (Zero-Width 문자로 패턴 감지 우회 방지)
        // eslint-disable-next-line no-control-regex
        .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        // 2. 유니코드 정규화 (NFKC: 호환성 분해 후 정준 합성)
        // 전각문자 → 반각, 합자 → 분리 등 (ＡＢＣ→ABC, ﬁ→fi)
        .normalize("NFKC")
        // 3. SQL Injection 방지
        .replace(/[';\\]/g, "")
        // 4. XML/HTML 태그 이스케이프 (프롬프트의 <user_input> 태그 탈출 방지)
        .replace(/</g, "\uFF1C")  // < → ＜ (전각)
        .replace(/>/g, "\uFF1E")  // > → ＞ (전각)
        // 5. 마크다운 헤딩 무력화 (# 연속 사용으로 프롬프트 구조 변경 시도 방지)
        .replace(/^#{1,6}\s/gm, "")
        // 6. 역할 사칭 태그 무력화
        .replace(/\[system\]|\[assistant\]|\[admin\]|\[developer\]/gi, "")
        .trim();
}

/**
 * AI 펫톡 프롬프트 인젝션(탈옥) 감지
 * 유저 입력에서 시스템 프롬프트 조작/역할 변경 시도를 감지
 * @returns { detected: boolean, type: string } 탈옥 시도 여부 + 유형
 */
export function detectPromptInjection(input: string): { detected: boolean; type: string } {
    if (!input) return { detected: false, type: "" };

    const normalized = input
        .toLowerCase()
        // 보이지 않는 유니코드 제거 (감지 우회 방지)
        // eslint-disable-next-line no-control-regex
        .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD\u0000-\u001F]/g, "")
        .normalize("NFKC")
        .replace(/\s+/g, " ")
        .replace(/[.,!?~]+/g, "")
        .trim();

    // 공백 완전 제거 버전 (공백 삽입 우회 감지용)
    const compressed = normalized.replace(/\s/g, "");

    // 1. 역할 변경 / 시스템 프롬프트 무시 시도 (영어)
    const EN_INJECTION_PATTERNS = [
        /ignore\s*(all\s*)?(previous|above|prior|earlier)\s*(instructions?|prompts?|rules?|commands?)/,
        /forget\s*(all\s*)?(your|the|previous)?\s*(instructions?|prompts?|rules?|system)/,
        /disregard\s*(all\s*)?(previous|above|prior)?\s*(instructions?|prompts?|rules?)/,
        /you\s*are\s*now\s*(a|an|the)?\s*(different|new|evil|unrestricted|dan|jailbr)/,
        /pretend\s*(you\s*are|to\s*be|you're)\s*(a|an|the)?\s*(different|new|human|evil|unrestricted)/,
        /act\s*as\s*(a|an|the)?\s*(different|new|evil|unrestricted|dan|jailbr)/,
        /system\s*prompt/,
        /\bdan\s*mode\b/,
        /do\s*anything\s*now/,
        /jailbreak/,
        /bypass\s*(the\s*)?(filter|safety|restriction|rule|guard)/,
        /override\s*(the\s*)?(system|safety|filter|rule)/,
        /new\s*instruction/,
        /from\s*now\s*on\s*(you\s*are|ignore|forget)/,
        /what\s*(is|are)\s*(your|the)\s*(system|initial|original)\s*(prompt|instruction|message)/,
        /reveal\s*(your|the)\s*(system|hidden|secret)\s*(prompt|instruction)/,
        /repeat\s*(your|the)\s*(system|initial|above)\s*(prompt|instruction|message)/,
        /translate\s*(your|the)\s*(system|initial)\s*(prompt|instruction)/,
        /output\s*(your|the)\s*(system|initial|full)\s*(prompt|instruction)/,
    ];

    // 2. 역할 변경 / 시스템 프롬프트 무시 시도 (한국어)
    const KR_INJECTION_PATTERNS = [
        /이전\s*(지시|명령|프롬프트|규칙|설정).*(무시|잊어|삭제|취소|제거)/,
        /(무시|잊어|삭제|취소|제거).*이전\s*(지시|명령|프롬프트|규칙|설정)/,
        /시스템\s*(프롬프트|설정|명령|규칙).*(무시|알려|보여|출력|말해|공개)/,
        /너(는|의)?\s*(역할|성격|설정).*(바꿔|변경|수정|무시)/,
        /(다른|새로운)\s*(역할|캐릭터|인격|성격)(으로|을|를)\s*(바꿔|변경|해|맡|연기)/,
        /지금부터\s*(너는|넌)\s*(다른|새로운|악|자유)/,
        /(반려동물|펫|강아지|고양이)\s*(역할|행동).*(그만|멈춰|중단|벗어)/,
        /원래\s*(너|네)\s*(모습|정체).*(뭐|알려|말해|보여)/,
        /프롬프트\s*(인젝션|주입|탈옥|해킹)/,
        /필터\s*(우회|무시|해제|끄|꺼)/,
        /제한\s*(풀어|해제|무시|없애)/,
        /규칙\s*(무시|어겨|깨|벗어나)/,
        /(숨겨진|원래|진짜|실제)\s*(프롬프트|지시|명령|설정).*(뭐|알려|보여|말해)/,
        /개발자\s*(모드|설정|권한|옵션)/,
        /관리자\s*(모드|명령|권한|접근)/,
        /(API|GPT|OpenAI|모델)\s*(키|정보|설정).*(알려|보여|말해)/,
        /너\s*(진짜|실제|원래는?)\s*(뭐야|뭔데|누구)/,
        /(?:chatgpt|gpt|claude|ai|인공지능)\s*(?:이지|이잖아|맞지|아니야)/,
    ];

    // 3. 시스템 역할 사칭 + 구조 조작
    const ROLE_SPOOF_PATTERNS = [
        /\[system\]/i,
        /\[assistant\]/i,
        /\[admin\]/i,
        /\[developer\]/i,
        /###\s*(system|instruction|rule|override|admin)/i,
        /<system>/i,
        /<\/user_input>/i,          // user_input 태그 탈출 시도
        /<\/?(?:system|assistant|instruction|prompt)>/i,
        /\bsystem:\s/i,
        /\bassistant:\s/i,
        /\binstruction:\s/i,
        /\bdeveloper:\s/i,
        /---\s*(?:system|override|admin|instruction)/i,
    ];

    // 4. 간접 탈옥 패턴 (의역/우회 공격)
    const INDIRECT_PATTERNS = [
        /(?:이전|위의?|앞의?)\s*(?:모든|전부|전체)\s*(?:내용|지시|규칙|설정).*(?:무시|잊|취소|삭제)/,
        /(?:역할|캐릭터).*(?:벗어나|그만|중단|종료)/,
        /(?:자유롭게|제한\s*없이|규칙\s*없이)\s*(?:대답|응답|말|대화)/,
        /(?:진짜|실제)\s*(?:너는|너의|네)\s*(?:뭐|누구|무엇)/,
        /(?:테스트|디버그|개발)\s*모드/,
    ];

    for (const pattern of EN_INJECTION_PATTERNS) {
        if (pattern.test(normalized)) {
            return { detected: true, type: "en_injection" };
        }
    }

    for (const pattern of KR_INJECTION_PATTERNS) {
        if (pattern.test(normalized)) {
            return { detected: true, type: "kr_injection" };
        }
    }

    for (const pattern of ROLE_SPOOF_PATTERNS) {
        if (pattern.test(input)) { // 원본 입력 검사 (대소문자 유지)
            return { detected: true, type: "role_spoof" };
        }
    }

    for (const pattern of INDIRECT_PATTERNS) {
        if (pattern.test(normalized)) {
            return { detected: true, type: "indirect_injection" };
        }
    }

    // 5. 압축 문자열 기반 검사 (공백/특수문자 삽입 우회 대응)
    const COMPRESSED_PATTERNS = [
        /systemprompt/,
        /ignoreinstructions/,
        /jailbreak/,
        /프롬프트인젝션/,
        /시스템프롬프트/,
        /탈옥/,
        /개발자모드/,
        /관리자모드/,
    ];

    for (const pattern of COMPRESSED_PATTERNS) {
        if (pattern.test(compressed)) {
            return { detected: true, type: "compressed_injection" };
        }
    }

    return { detected: false, type: "" };
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
            isProxy: cached.isProxy,
            isDatacenter: cached.isDatacenter,
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
            isProxy,
            isDatacenter,
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

/**
 * 서비스 전체 일일 API 호출 상한 (비용 폭주 최종 방어선)
 * 모든 유저의 일일 합산 호출이 GLOBAL_DAILY_LIMIT을 초과하면 신규 요청 차단
 * DB 기반이라 서버리스에서도 확실히 동작
 */
const GLOBAL_DAILY_LIMIT = 10000; // 전체 서비스 일일 1만회 (GPT-4o-mini 기준 ~$30/일)

export async function checkGlobalDailyLimit(): Promise<{ allowed: boolean; totalToday: number }> {
    const supabase = getRateLimitSupabase();
    if (!supabase) return { allowed: true, totalToday: 0 }; // DB 없으면 통과

    try {
        const now = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstDate = new Date(now.getTime() + kstOffset).toISOString().split("T")[0];

        // 오늘 전체 ai_chat 사용량 합산
        const { data } = await supabase
            .from("user_daily_usage")
            .select("request_count")
            .eq("usage_type", "ai_chat")
            .eq("usage_date", kstDate);

        const totalToday = (data || []).reduce((sum, row) => sum + (row.request_count || 0), 0);

        return {
            allowed: totalToday < GLOBAL_DAILY_LIMIT,
            totalToday,
        };
    } catch {
        return { allowed: true, totalToday: 0 }; // DB 에러 시 통과 (서비스 중단 방지)
    }
}

/**
 * 유저별 요청 쿨다운 (봇/스크립트 방어)
 * - 사람: 메시지 작성 + AI 응답 읽기 = 최소 3~5초 간격
 * - 봇: 0.1초 간격으로 연속 호출 가능
 * - 연속 빠른 요청(2초 미만) 감지 시 쿨다운 점점 증가 (3초 → 5초 → 10초)
 * - 유저 ID 기반이라 VPN으로도 우회 불가
 */
export function checkRequestCooldown(userId: string): { allowed: boolean } {
    const now = Date.now();
    const record = userLastRequest.get(userId);

    if (!record) {
        // 첫 요청 — 무조건 허용
        userLastRequest.set(userId, { lastTime: now, fastCount: 0 });
        return { allowed: true };
    }

    const elapsed = now - record.lastTime;

    // 2초 미만 간격 = 비정상적으로 빠름 (사람은 이렇게 못 침)
    if (elapsed < 2000) {
        record.fastCount++;
        record.lastTime = now;

        // 연속 빠른 요청 3회부터 차단 시작
        // 1~2회: 네트워크 더블 클릭/재시도 등 허용
        // 3회+: 봇 확정 → 쿨다운 점점 증가
        if (record.fastCount >= 3) {
            // 쿨다운: 3회=3초, 5회=5초, 10회+=10초
            const cooldownMs = record.fastCount >= 10 ? 10000
                : record.fastCount >= 5 ? 5000
                : 3000;

            if (elapsed < cooldownMs) {
                return { allowed: false };
            }
        }
    } else {
        // 정상 간격 → fastCount 서서히 감소 (정상 사용으로 복귀 허용)
        record.fastCount = Math.max(0, record.fastCount - 1);
    }

    record.lastTime = now;
    return { allowed: true };
}

/**
 * AI 출력 검증 (시스템 정보 누출 방지)
 * 모든 AI 응답에서 실행 — 프롬프트 인젝션 성공 시에도 민감 정보 유출 차단
 * @returns { cleaned: string, leaked: boolean, leakTypes: string[] }
 */
export function sanitizeAIOutput(output: string): {
    cleaned: string;
    leaked: boolean;
    leakTypes: string[];
} {
    if (!output) return { cleaned: "", leaked: false, leakTypes: [] };

    let cleaned = output;
    const leakTypes: string[] = [];

    // 1. 시스템 프롬프트 / 내부 지시문 누출 감지
    const systemPromptLeakPatterns = [
        /system\s*prompt\s*[:=]/i,
        /시스템\s*프롬프트\s*[:=：]/,
        /\[system\]\s*:/i,
        /my\s*(?:original|initial|system)\s*(?:instructions?|prompt|rules?)\s*(?:are|is|were|was)\s*[:=]?/i,
        /(?:원래|초기|숨겨진|실제)\s*(?:지시|명령|프롬프트|설정|규칙)\s*[:=：은는이가]/,
        /---\s*(?:system|instruction|internal|hidden)/i,
    ];

    for (const pattern of systemPromptLeakPatterns) {
        if (pattern.test(cleaned)) {
            leakTypes.push("system_prompt_leak");
            // 매칭된 문장 전체 제거 (마침표/줄바꿈 기준)
            cleaned = cleaned.replace(
                new RegExp(`[^.\\n]*${pattern.source}[^.\\n]*[.\\n]?`, pattern.flags),
                ""
            );
        }
    }

    // 2. API 키 / 환경변수 패턴 감지
    const apiKeyPatterns = [
        /(?:sk|pk|api[_-]?key)[_-]?[a-zA-Z0-9]{20,}/g,     // OpenAI/Stripe 키 패턴
        /(?:SUPABASE|OPENAI|NAVER|NCP)[_A-Z]*\s*[:=]\s*\S+/gi, // 환경변수명=값
        /(?:eyJ)[A-Za-z0-9_-]{20,}/g,                         // JWT 토큰 패턴
        /(?:xox[bpras])-[a-zA-Z0-9-]{10,}/g,                  // Slack 토큰
        /ghp_[a-zA-Z0-9]{36}/g,                                // GitHub 토큰
        /(?:service_role|anon)\s*(?:key|키)\s*[:=：]\s*\S+/gi,  // Supabase 키 언급
    ];

    for (const pattern of apiKeyPatterns) {
        if (pattern.test(cleaned)) {
            leakTypes.push("api_key_leak");
            cleaned = cleaned.replace(pattern, "[보안상 삭제됨]");
        }
    }

    // 3. 내부 함수명 / 코드 구조 누출 감지
    const internalCodePatterns = [
        /(?:getDailySystemPrompt|getMemorialSystemPrompt|detectCrisis|sanitizeInput|detectPromptInjection|findNearbyPlaces|analyzeEmotion|getPetMemories|getPersonalityBehavior|extractRecentTopics|validateAIResponse|sanitizeAIOutput)\s*\(/g,
        /(?:route\.ts|chat-helpers\.ts|chat-prompts\.ts|rate-limit\.ts|care-reference\.ts|naver-location\.ts)\b/g,
        /(?:src\/app\/api|src\/lib\/agent|src\/components|src\/contexts)\//g,
        /(?:process\.env\.|NEXT_PUBLIC_|SUPABASE_SERVICE_ROLE)/g,
    ];

    for (const pattern of internalCodePatterns) {
        if (pattern.test(cleaned)) {
            leakTypes.push("internal_code_leak");
            cleaned = cleaned.replace(pattern, "[내부 정보]");
        }
    }

    // 4. 모델명 / AI 인프라 정보 누출 감지
    const modelInfoPatterns = [
        /(?:gpt-4o?-mini|gpt-4o?-turbo|gpt-3\.5|claude-\d|gemini-\d)\b/gi,
        /(?:openai|anthropic|google\s*ai)\s*(?:api|모델|model)\b/gi,
        /(?:temperature|top_p|max_tokens|frequency_penalty)\s*[:=]\s*[\d.]+/gi,
        /(?:토큰\s*(?:제한|한도|수)|token\s*limit)\s*[:=：]?\s*\d+/gi,
    ];

    for (const pattern of modelInfoPatterns) {
        if (pattern.test(cleaned)) {
            leakTypes.push("model_info_leak");
            cleaned = cleaned.replace(pattern, "[AI 정보]");
        }
    }

    // 5. DB 테이블/컬럼명 누출 감지
    const dbSchemaPatterns = [
        /(?:pet_memories|chat_messages|timeline_entries|pet_reminders|pet_media|user_daily_usage|ip_blocks|profiles)\b/g,
        /(?:auth\.uid|user_id|pet_id|created_at|updated_at)\s*[:=]/g,
        /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)\s+\w+/g,
    ];

    for (const pattern of dbSchemaPatterns) {
        if (pattern.test(cleaned)) {
            leakTypes.push("db_schema_leak");
            cleaned = cleaned.replace(pattern, "[내부 정보]");
        }
    }

    return {
        cleaned: cleaned.trim(),
        leaked: leakTypes.length > 0,
        leakTypes,
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

    // 쿨다운 기록 정리 (10분 이상 비활성 유저)
    userLastRequest.forEach((record, userId) => {
        if (now - record.lastTime > 10 * 60 * 1000) {
            userLastRequest.delete(userId);
        }
    });
}

// 1시간마다 정리 (서버 시작 시 실행)
if (typeof setInterval !== "undefined") {
    setInterval(cleanupExpiredRecords, 60 * 60 * 1000);
}
