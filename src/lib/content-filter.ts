/**
 * 커뮤니티 게시판 콘텐츠 자동 필터링
 * - 비속어/비하 표현 감지 (오탐 최소화 설계)
 * - 스팸/광고 패턴 감지
 * - 도배 방지 (메모리 캐시)
 *
 * [오탐 방지 원칙]
 * - 단독 글자(ㅆ, 씹 등)는 차단하지 않음 - 오탐률이 너무 높음
 * - 짧은 단어는 앞뒤 문맥(경계 체크)으로 부분 매칭 방지
 * - 반려동물 관련 정상 표현과 겹치는 단어는 제외하거나 문맥 체크
 * - 확실한 욕설/비하만 차단, 애매하면 통과 (AI 2차 검토에서 잡음)
 */

import { MODERATION } from "@/config/constants";
import crypto from "crypto";

// ===== 타입 =====
interface FilterResult {
    allowed: boolean;
    reason?: string;
    filterType?: "profanity" | "spam" | "duplicate";
    matchedWords?: string[];
}

// ===== 비속어 사전 =====

/**
 * 확실한 욕설만 포함 (오탐 위험 단어 제외)
 * 제외된 것들: "씹"(씹어먹다), "ㅆ"(쌍시옷), "꺼져/닥쳐"(장난 맥락),
 * "한남/한녀"(한남동 지명), "걸레"(청소도구)
 */
const PROFANITY_EXACT = [
    // 확실한 욕설 (단독으로도 욕설)
    "시발", "씨발", "씨bal", "시bal",
    "개새끼", "개새기", "개색끼", "개색기",
    "병신", "븅신", "빙신",
    "지랄", "지럴",
    "좆", "좃",
    "니미", "니엄마", "느금마", "느금",
    "엠창", "앰창",
    "미친놈", "미친년",
    "또라이", "돌아이",
    "찐따", "찐다",
    "보지", "자지",
    "fuck", "shit", "bitch", "asshole", "bastard",
];

/**
 * 초성 축약 욕설 - 원문에 초성 자체가 있을 때만 매칭
 * (초성→한글 범위 정규식 변환은 오탐 위험이 너무 높아 제거)
 */
const PROFANITY_CHOSUNG = ["ㅅㅂ", "ㅆㅂ", "ㅂㅅ", "ㅈㄹ", "ㅁㅊ", "ㄱㅅㄲ"];

/**
 * 반려동물/생명 비하 - 구(phrase) 단위로만 매칭 (단어 단독은 오탐 위험)
 * 제외: "짐승"(짐승같은 체력), "안락사"(보호소 정보), "왜울어/징징"(반려동물 울음 질문)
 */
const PET_DISRESPECT_PHRASES = [
    "동물인데 뭘",
    "동물인데뭘",
    "고작 동물",
    "고작동물",
    "그냥 동물",
    "그냥동물",
    "안락사시켜",
    "안락사해",
];

/**
 * 숫자/특수문자 끼워넣기 우회 제거
 * "시1발" → "시발", "보.지" → "보지", "씨 발" → "씨발"
 */
function stripEvasion(text: string): string {
    return text
        .replace(/[\s\u200B-\u200D\uFEFF]/g, "") // 공백 + 제로폭 문자 제거
        .replace(/[0-9]/g, "")                     // 숫자 제거 (시1발 → 시발)
        .replace(/[.*_~\-!@#$%^&()=+[\]{}|;:'",.<>/?\\]/g, "") // 특수문자 제거
        .toLowerCase()
        .normalize("NFKC");
}

/** 텍스트 정규화 (일반용 - 숫자 유지) */
function normalizeText(text: string): string {
    return text
        .replace(/[\s\u200B-\u200D\uFEFF]/g, "")
        .replace(/[.*_~\-!@#$%^&()=+[\]{}|;:'",.<>/?\\]/g, "")
        .toLowerCase()
        .normalize("NFKC");
}

// ===== 비속어 검사 =====

export function checkProfanity(text: string): {
    blocked: boolean;
    reason: string;
    matchedWords: string[];
} {
    // 숫자/특수문자 끼워넣기 우회 제거 버전 + 일반 정규화 둘 다 체크
    const normalized = normalizeText(text);
    const evasionStripped = stripEvasion(text);
    const matchedWords: string[] = [];

    // 1. 확실한 욕설 매칭 (정규화 + 우회 제거 둘 다 체크)
    for (const word of PROFANITY_EXACT) {
        const normalizedWord = normalizeText(word);
        if (normalized.includes(normalizedWord) || evasionStripped.includes(normalizedWord)) {
            matchedWords.push(word);
        }
    }

    // 2. 반려동물 비하 구(phrase) 매칭
    for (const phrase of PET_DISRESPECT_PHRASES) {
        const normalizedPhrase = normalizeText(phrase);
        if (normalized.includes(normalizedPhrase) || evasionStripped.includes(normalizedPhrase)) {
            matchedWords.push(phrase);
        }
    }

    // 3. 초성 축약어 - 원문에 초성 자체가 있을 때만 매칭
    for (const abbrev of PROFANITY_CHOSUNG) {
        if (text.includes(abbrev)) {
            matchedWords.push(abbrev);
        }
    }

    // 중복 제거
    const uniqueMatched = [...new Set(matchedWords)];

    return {
        blocked: uniqueMatched.length > 0,
        reason: uniqueMatched.length > 0 ? "부적절한 표현이 포함되어 있습니다" : "",
        matchedWords: uniqueMatched,
    };
}

// ===== 스팸/광고 검사 =====

/**
 * 스팸 키워드 - 반려동물 커뮤니티에서 절대 나올 수 없는 것만
 * 제외: "알바"(알바트로스), "대출", "다이어트"(반려동물 다이어트),
 * "성인"(성인 고양이), "재택"(재택근무 일상), "불법"(불법 유기 논의)
 */
const SPAM_KEYWORDS = [
    // 도박 (명확한 스팸)
    "카지노", "바카라", "슬롯머신", "토토사이트", "배팅사이트",
    // 금융 사기
    "가상화폐", "비트코인", "코인투자", "고수익보장",
    // 불법 서비스
    "해킹", "크랙", "19금",
    // 광고성 구 (단어가 아닌 구 단위)
    "무료상담", "카톡상담",
    "부업모집", "재택알바", "고수익알바",
    "저금리대출", "신용대출상담",
];

/** 카카오톡 ID 홍보 패턴 (더 정확하게) */
const KAKAO_PROMO_PATTERN = /카[카톡]\s*(아이디|[iI][dD])\s*[:=]?\s*[\w가-힣]{2,}/;

export function checkSpam(text: string, imageUrls?: string[]): {
    blocked: boolean;
    reason: string;
} {
    const normalized = normalizeText(text);

    // 1. URL 과다 (본문 내 URL 3개 이상)
    const urlMatches = text.match(/https?:\/\/[^\s]+/g) || [];
    if (urlMatches.length >= MODERATION.MAX_URLS_IN_POST) {
        return { blocked: true, reason: "링크가 너무 많이 포함되어 있습니다" };
    }

    // 2. 카카오톡 ID 홍보 패턴 (카톡 아이디: xxx 형태만)
    if (KAKAO_PROMO_PATTERN.test(text)) {
        return { blocked: true, reason: "메신저 ID 홍보는 작성할 수 없습니다" };
    }

    // 3. 스팸 키워드 (구 단위 매칭)
    for (const keyword of SPAM_KEYWORDS) {
        const normalizedKeyword = normalizeText(keyword);
        if (normalized.includes(normalizedKeyword)) {
            return { blocked: true, reason: "광고/홍보성 내용이 감지되었습니다" };
        }
    }

    // 4. 이미지만 있고 내용이 너무 짧은 경우
    if (imageUrls && imageUrls.length > 0 && text.replace(/\s/g, "").length < 10) {
        return { blocked: true, reason: "내용을 10자 이상 작성해주세요" };
    }

    return { blocked: false, reason: "" };
}

// ===== 도배 방지 =====

/** 최근 게시글 해시 캐시: userId -> { hash, timestamp }[] */
const recentPostCache = new Map<string, { hash: string; timestamp: number }[]>();

/** 캐시 정리 (오래된 항목 제거) */
function cleanupCache() {
    const now = Date.now();
    for (const [userId, entries] of recentPostCache.entries()) {
        const valid = entries.filter(e => now - e.timestamp < MODERATION.DUPLICATE_WINDOW_MS);
        if (valid.length === 0) {
            recentPostCache.delete(userId);
        } else {
            recentPostCache.set(userId, valid);
        }
    }
}

/** 내용 해시 생성 (SHA-256 앞 16자) */
function hashContent(content: string): string {
    return crypto.createHash("sha256").update(normalizeText(content)).digest("hex").slice(0, 16);
}

export function checkDuplicate(userId: string, content: string): {
    blocked: boolean;
    reason: string;
} {
    cleanupCache();

    const hash = hashContent(content);
    const now = Date.now();
    const userEntries = recentPostCache.get(userId) || [];

    // 같은 내용이 최근 시간 내에 있는지 확인
    const isDuplicate = userEntries.some(
        e => e.hash === hash && now - e.timestamp < MODERATION.DUPLICATE_WINDOW_MS
    );

    if (isDuplicate) {
        return { blocked: true, reason: "같은 내용의 글을 연속으로 작성할 수 없습니다" };
    }

    // 캐시에 추가
    userEntries.push({ hash, timestamp: now });
    recentPostCache.set(userId, userEntries);

    return { blocked: false, reason: "" };
}

// ===== 통합 검사 =====

/**
 * 게시글/댓글 콘텐츠 통합 모더레이션
 *
 * [설계 원칙]
 * - 1차: 확실한 욕설/스팸만 즉시 차단 (오탐 최소화)
 * - 2차: AI 모더레이션이 비동기로 애매한 케이스를 잡음
 * - 차단보다 통과가 낫다 (정상 유저 이탈 방지)
 */
export function moderateContent(
    title: string,
    content: string,
    userId: string,
    options?: {
        imageUrls?: string[];
        boardType?: string;
        isComment?: boolean;
    }
): FilterResult {
    const fullText = `${title} ${content}`;

    // 1. 비속어 검사 (확실한 욕설만)
    const profanityResult = checkProfanity(fullText);
    if (profanityResult.blocked) {
        return {
            allowed: false,
            reason: profanityResult.reason,
            filterType: "profanity",
            matchedWords: profanityResult.matchedWords,
        };
    }

    // 2. 스팸 검사
    const spamResult = checkSpam(fullText, options?.imageUrls);
    if (spamResult.blocked) {
        // 분실동물 게시판은 카톡 ID 허용 (실종 동물 연락용)
        if (options?.boardType === "lost" && spamResult.reason.includes("메신저")) {
            // 허용
        } else {
            return {
                allowed: false,
                reason: spamResult.reason,
                filterType: "spam",
            };
        }
    }

    // 3. 도배 검사
    const duplicateResult = checkDuplicate(userId, content);
    if (duplicateResult.blocked) {
        return {
            allowed: false,
            reason: duplicateResult.reason,
            filterType: "duplicate",
        };
    }

    return { allowed: true };
}
