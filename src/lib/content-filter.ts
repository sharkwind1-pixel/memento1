/**
 * 커뮤니티 게시판 콘텐츠 자동 필터링
 * - 비속어/비하 표현 감지
 * - 스팸/광고 패턴 감지
 * - 도배 방지 (메모리 캐시)
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

/** 한국어 비속어/욕설 (기본) */
const PROFANITY_WORDS = [
    // 일반 욕설
    "시발", "씨발", "시bal", "씨bal", "ㅅㅂ", "ㅆㅂ", "시바", "씨바",
    "개새끼", "개새기", "개색끼", "개색기", "ㄱㅅㄲ",
    "병신", "븅신", "ㅂㅅ", "빙신",
    "지랄", "ㅈㄹ", "지럴",
    "좆", "좃", "ㅈㅇㅌ",
    "니미", "니엄마", "느금마", "느금",
    "엠창", "앰창",
    "꺼져", "닥쳐", "뒤져", "뒤저", "디져",
    "미친놈", "미친년", "ㅁㅊ",
    "또라이", "돌아이",
    "찐따", "찐다",
    "한남", "한녀",
    "걸레", "보지", "자지",
    "씹", "ㅆ",
    "fuck", "shit", "bitch", "asshole", "bastard", "damn",
];

/** 반려동물/생명 비하 표현 (서비스 특성) */
const PET_DISRESPECT_WORDS = [
    "동물인데 뭘", "동물인데뭘",
    "짐승", "잡종",
    "개팔자", "개같은",
    "안락사", "안락사시켜",
    "왜 울어", "왜울어", "징징",
    "그냥 동물", "그냥동물",
    "고작 동물", "고작동물",
    "미련하게",
];

/** 초성 변환 맵 */
const CHOSUNG_MAP: Record<string, string> = {
    "ㄱ": "[가-깋]", "ㄲ": "[까-낗]", "ㄴ": "[나-닣]", "ㄷ": "[다-딯]",
    "ㄸ": "[따-띻]", "ㄹ": "[라-맇]", "ㅁ": "[마-밓]", "ㅂ": "[바-빟]",
    "ㅃ": "[빠-삫]", "ㅅ": "[사-싷]", "ㅆ": "[싸-앃]", "ㅇ": "[아-잏]",
    "ㅈ": "[자-짛]", "ㅉ": "[짜-찧]", "ㅊ": "[차-칳]", "ㅋ": "[카-킿]",
    "ㅌ": "[타-팋]", "ㅍ": "[파-핗]", "ㅎ": "[하-힣]",
};

/** 자음만으로 된 축약어를 정규식으로 변환 */
function chosungToRegex(chosung: string): RegExp | null {
    const isAllChosung = /^[ㄱ-ㅎ]+$/.test(chosung);
    if (!isAllChosung) return null;

    let pattern = "";
    for (const ch of chosung) {
        pattern += CHOSUNG_MAP[ch] || ch;
    }
    return new RegExp(pattern, "gi");
}

/** 텍스트 정규화: 공백/특수문자 제거, 소문자 변환 */
function normalizeText(text: string): string {
    return text
        .replace(/[\s\u200B-\u200D\uFEFF]/g, "") // 공백 + 제로폭 문자 제거
        .replace(/[.*_~\-!@#$%^&()=+[\]{}|;:'",.<>/?\\]/g, "") // 특수문자 제거
        .toLowerCase()
        .normalize("NFKC");
}

// ===== 비속어 검사 =====

export function checkProfanity(text: string): {
    blocked: boolean;
    reason: string;
    matchedWords: string[];
} {
    const normalized = normalizeText(text);
    const matchedWords: string[] = [];

    // 1. 일반 비속어 매칭
    for (const word of PROFANITY_WORDS) {
        const normalizedWord = normalizeText(word);
        if (normalized.includes(normalizedWord)) {
            matchedWords.push(word);
        }
    }

    // 2. 반려동물 비하 표현 매칭
    for (const word of PET_DISRESPECT_WORDS) {
        const normalizedWord = normalizeText(word);
        if (normalized.includes(normalizedWord)) {
            matchedWords.push(word);
        }
    }

    // 3. 초성 축약어 매칭 (ㅅㅂ, ㅂㅅ 등)
    const chosungAbbrevs = ["ㅅㅂ", "ㅆㅂ", "ㅂㅅ", "ㅈㄹ", "ㅁㅊ", "ㄱㅅㄲ", "ㅈㅇㅌ"];
    for (const abbrev of chosungAbbrevs) {
        const regex = chosungToRegex(abbrev);
        if (regex && regex.test(text)) {
            // 초성 자체가 원문에 있으면 매칭 (정규화된 텍스트가 아닌 원본)
            if (text.includes(abbrev)) {
                matchedWords.push(abbrev);
            }
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

/** 광고성 키워드 */
const SPAM_KEYWORDS = [
    // 광고/홍보
    "무료 상담", "무료상담", "카톡 상담", "카톡상담",
    "텔레그램", "오픈채팅", "오픈카톡",
    "부업", "재택", "재택근무", "알바", "고수익",
    "투자", "코인", "비트코인", "가상화폐",
    "대출", "저금리", "신용",
    "다이어트", "살빼기", "체중감량",
    "성인", "19금",
    // 도박
    "카지노", "바카라", "슬롯", "토토", "배팅",
    // 불법
    "불법", "해킹", "크랙",
];

/** 연락처 패턴 */
const PHONE_PATTERN = /0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/;
const KAKAO_ID_PATTERN = /카[카톡]\s*[아이디ID:]*\s*[\w가-힣]+/i;

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

    // 2. 연락처 패턴
    if (PHONE_PATTERN.test(text)) {
        // 분실동물 게시판은 연락처 허용 (호출 측에서 boardType 체크 필요)
        // 여기서는 감지만 하고, 호출 측에서 boardType별 분기
    }

    // 3. 카카오톡 ID 패턴
    if (KAKAO_ID_PATTERN.test(text)) {
        return { blocked: true, reason: "메신저 ID를 포함한 홍보성 글은 작성할 수 없습니다" };
    }

    // 4. 광고성 키워드
    for (const keyword of SPAM_KEYWORDS) {
        const normalizedKeyword = normalizeText(keyword);
        if (normalized.includes(normalizedKeyword)) {
            return { blocked: true, reason: "광고/홍보성 내용이 감지되었습니다" };
        }
    }

    // 5. 이미지만 있고 내용이 너무 짧은 경우 (스팸 이미지)
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
 * @param title 제목 (댓글이면 빈 문자열)
 * @param content 본문
 * @param userId 작성자 ID
 * @param options 추가 옵션
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

    // 1. 비속어 검사
    const profanityResult = checkProfanity(fullText);
    if (profanityResult.blocked) {
        return {
            allowed: false,
            reason: profanityResult.reason,
            filterType: "profanity",
            matchedWords: profanityResult.matchedWords,
        };
    }

    // 2. 스팸 검사 (분실동물 게시판은 연락처 허용)
    const spamResult = checkSpam(fullText, options?.imageUrls);
    if (spamResult.blocked) {
        // 분실동물 게시판에서 "내용 10자 이상" 규칙만 적용하고 연락처는 허용
        if (options?.boardType === "lost" && spamResult.reason.includes("메신저")) {
            // 분실동물은 카톡 ID 허용
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
