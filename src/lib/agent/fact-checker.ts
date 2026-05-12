/**
 * fact-checker.ts — 팩트 체크 / 할루시네이션 검증 에이전트 (AGENTS.md 9번)
 *
 * 매거진/블로그 자동 생성물 + AI 응답을 Tavily 웹 검색으로 cross-check.
 *
 * 흐름:
 *   1. 사실 주장 추출 (통계/숫자/의료/인용/종 정보)
 *   2. 각 주장을 Tavily 검색 (최대 5개, 비용 절감)
 *   3. species-context와 cross-check (강아지 글에 고양이 행동 섞임)
 *   4. 점수 산정 (0-100)
 *   5. DB 저장 (validation_logs) + 텔레그램 알림 (점수 < 70)
 */

import { tavily } from "@tavily/core";
import { createClient } from "@supabase/supabase-js";

const TAVILY_KEY = process.env.TAVILY_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_SYSTEM = process.env.TELEGRAM_CHAT_SYSTEM || process.env.TELEGRAM_CHAT_ID;

// ============================================================
// 타입 정의
// ============================================================

export type ContentType = "magazine" | "blog" | "chat" | "admin_message";
export type ClaimType = "statistic" | "medical" | "factual" | "species" | "expert_quote";
export type VerifyStatus = "matched" | "mismatched" | "uncertain" | "no_data";

export interface ClaimResult {
    claim: string;
    type: ClaimType;
    status: VerifyStatus;
    confidence: number; // 0-1
    sources?: string[];
    note?: string;
}

export interface FactCheckResult {
    /** 전체 신뢰도 점수 (0-100) */
    overallScore: number;
    /** 검출된 주장 목록 */
    claims: ClaimResult[];
    /** 의심 패턴 플래그 (예: "확정 표현 다수", "출처 없는 통계") */
    flags: string[];
    /** 종 일관성 (강아지 글에 고양이 정보 섞임 등) */
    speciesConsistency: { ok: boolean; issues: string[] };
    /** 한 줄 요약 */
    summary: string;
    /** 검증 비용 (Tavily query 수) */
    queryCount: number;
}

export interface ValidateOptions {
    contentType: ContentType;
    /** 매거진/블로그의 종 (강아지/고양이/햄스터 등). chat 모드면 펫 종 */
    species?: string;
    /** chat 모드 시 펫 ID — pet_memories와 cross-check용 */
    petId?: string;
    /** 검증 후 텔레그램 알림 발송 여부 (기본 true) */
    notify?: boolean;
    /** DB 로그 저장 여부 (기본 true) */
    log?: boolean;
    /** 디버그용 식별자 (예: 매거진 ID) */
    sourceId?: string;
}

// ============================================================
// 1. 사실 주장 추출 (정규식 기반)
// ============================================================

/**
 * 텍스트에서 검증 대상 주장을 추출.
 * 정규식 + 키워드 룰. LLM 사용 안 함 (비용 절감).
 */
function extractClaims(content: string): { claim: string; type: ClaimType }[] {
    const claims: { claim: string; type: ClaimType }[] = [];
    const sentences = content.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.length > 10);

    for (const s of sentences) {
        // 통계: 숫자% 또는 숫자년/회/마리 + 명사
        if (/(\d+(?:\.\d+)?\s*(?:%|년|회|마리|배|위|등|kg|cm|mm))/i.test(s)) {
            // 단, 결제 가격/일반 표현은 제외
            if (!/원|만원|월\s*\d|주\s*\d/.test(s)) {
                claims.push({ claim: s, type: "statistic" });
                continue;
            }
        }

        // 의료/건강: 약 이름, 진단/증상-원인 단언
        if (/(증상|원인|치료|진단|예방접종|약|수술|병원에서|수의사가\s*권장|FDA|허가)/i.test(s)) {
            claims.push({ claim: s, type: "medical" });
            continue;
        }

        // 전문가 인용
        if (/(전문가에\s*따르면|연구에\s*따르면|발표|보고|논문)/i.test(s)) {
            claims.push({ claim: s, type: "expert_quote" });
            continue;
        }

        // 종 행동 단언 (다른 종에 잘못 적용될 수 있는 패턴)
        if (/(강아지는|고양이는|햄스터는|토끼는|새는).{0,50}(이다|입니다|합니다|좋아한다)/i.test(s)) {
            claims.push({ claim: s, type: "species" });
            continue;
        }

        // 일반 사실 단언 (확정 표현)
        if (/(반드시|항상|절대|모두|전부|모든)/.test(s) && s.length > 20) {
            claims.push({ claim: s, type: "factual" });
        }
    }

    // 비용 절감: 최대 5개 주장만 (Tavily query 비용)
    return claims.slice(0, 5);
}

// ============================================================
// 2. Tavily 검색 + 검증
// ============================================================

async function verifyClaim(claim: string, type: ClaimType): Promise<ClaimResult> {
    if (!TAVILY_KEY) {
        return {
            claim,
            type,
            status: "no_data",
            confidence: 0,
            note: "Tavily API key 미설정 — 검증 불가",
        };
    }

    try {
        const client = tavily({ apiKey: TAVILY_KEY });
        // 검색 쿼리 — 주장 그대로 + 검증 키워드
        const query = `${claim.slice(0, 100)} 사실 확인`;
        const res = await client.search(query, {
            searchDepth: "basic",
            maxResults: 3,
            includeAnswer: true,
        });

        const sources: string[] = [];
        if (res.results) {
            for (const r of res.results.slice(0, 3)) {
                if (r.url) sources.push(r.url);
            }
        }

        // Tavily answer 또는 첫 결과 스니펫과 단순 매칭
        const evidence = (res.answer ?? "") + " " + (res.results?.[0]?.content ?? "");
        const evLower = evidence.toLowerCase();
        const claimLower = claim.toLowerCase();

        // 주장의 핵심 단어 (3글자 이상) 절반 이상이 evidence에 있으면 matched
        const keywords = claimLower
            .replace(/[.,?!~()]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length >= 3);
        let hits = 0;
        for (const kw of keywords) {
            if (evLower.includes(kw)) hits++;
        }
        const ratio = keywords.length > 0 ? hits / keywords.length : 0;

        let status: VerifyStatus = "uncertain";
        let confidence = ratio;
        if (ratio >= 0.6) status = "matched";
        else if (ratio < 0.2 && evidence.length > 50) status = "mismatched";
        else if (evidence.length < 50) status = "no_data";

        return { claim, type, status, confidence, sources };
    } catch (e) {
        return {
            claim,
            type,
            status: "no_data",
            confidence: 0,
            note: e instanceof Error ? e.message : "검색 실패",
        };
    }
}

// ============================================================
// 3. 종 일관성 검증 (species-context 활용)
// ============================================================

const SPECIES_KEYWORDS: Record<string, string[]> = {
    "강아지": ["산책", "짖", "꼬리 흔들", "공놀이", "발 핥", "리드"],
    "고양이": ["골골", "꾹꾹이", "그루밍", "캣타워", "사냥"],
    "햄스터": ["쳇바퀴", "씨앗", "볼주머니", "사육장"],
    "토끼": ["풀 뜯", "귀를 세우", "발구르"],
    "새": ["지저귐", "횃대", "깃털 손질"],
    "파충류": ["탈피", "일광욕", "체온 조절"],
    "물고기": ["수조", "수온", "산소"],
};

function checkSpeciesConsistency(content: string, declaredSpecies?: string): { ok: boolean; issues: string[] } {
    if (!declaredSpecies) return { ok: true, issues: [] };
    const issues: string[] = [];

    for (const [species, keywords] of Object.entries(SPECIES_KEYWORDS)) {
        if (species === declaredSpecies) continue;
        // 다른 종의 특수 행동이 콘텐츠에 등장하는지
        for (const kw of keywords) {
            if (content.includes(kw)) {
                issues.push(`${declaredSpecies} 콘텐츠에 ${species} 행동(${kw}) 언급됨`);
                break; // 각 종당 1회만 보고
            }
        }
    }

    return { ok: issues.length === 0, issues };
}

// ============================================================
// 4. 점수 산정 + 플래그
// ============================================================

function calculateScore(claims: ClaimResult[], speciesIssues: number): number {
    if (claims.length === 0) return 90; // 검증할 주장 없으면 기본 90점

    let score = 100;
    for (const c of claims) {
        if (c.status === "mismatched") score -= 25;
        else if (c.status === "uncertain") score -= 8;
        else if (c.status === "no_data") score -= 3;
    }
    score -= speciesIssues * 15;
    return Math.max(0, Math.min(100, Math.round(score)));
}

function detectFlags(content: string): string[] {
    const flags: string[] = [];
    if ((content.match(/(반드시|절대|항상|모두|전부)/g) || []).length >= 3) {
        flags.push("확정 표현 과다");
    }
    if (/(\d+(?:\.\d+)?%)/g.test(content) && !/(출처|연구|보고|논문|기관)/i.test(content)) {
        flags.push("출처 미상 통계");
    }
    if (/(즉시|당장|지금\s*바로).{0,20}(병원|수의사)/.test(content)) {
        flags.push("의료 단정 표현");
    }
    if (/(보장|확실|100%)/.test(content)) {
        flags.push("보장 표현");
    }
    return flags;
}

// ============================================================
// 5. DB 저장 + 텔레그램 알림
// ============================================================

function getAdminSupabase() {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
    return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

async function saveValidationLog(
    contentType: ContentType,
    sourceId: string | undefined,
    result: FactCheckResult,
    contentExcerpt: string,
): Promise<void> {
    const sb = getAdminSupabase();
    if (!sb) return;
    try {
        await sb.from("validation_logs").insert({
            content_type: contentType,
            source_id: sourceId ?? null,
            overall_score: result.overallScore,
            flags: result.flags,
            species_issues: result.speciesConsistency.issues,
            claims: result.claims,
            summary: result.summary,
            content_excerpt: contentExcerpt.slice(0, 500),
            query_count: result.queryCount,
        });
    } catch (e) {
        console.warn("[FactChecker] DB log 실패:", e instanceof Error ? e.message : e);
    }
}

async function notifyTelegram(contentType: ContentType, result: FactCheckResult, sourceId?: string): Promise<void> {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_SYSTEM) return;
    const emoji = result.overallScore >= 80 ? "✅" : result.overallScore >= 60 ? "⚠️" : "🚨";
    const lines = [
        `${emoji} <b>팩트체크 결과</b>`,
        `종류: ${contentType}${sourceId ? ` (${sourceId})` : ""}`,
        `점수: <b>${result.overallScore}/100</b>`,
        result.flags.length > 0 ? `플래그: ${result.flags.join(", ")}` : "",
        result.speciesConsistency.issues.length > 0
            ? `종 일관성 위반: ${result.speciesConsistency.issues.join(" / ")}`
            : "",
        `요약: ${result.summary}`,
        `검증 query: ${result.queryCount}회`,
    ].filter(Boolean);

    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_SYSTEM,
                text: lines.join("\n"),
                parse_mode: "HTML",
                disable_web_page_preview: true,
            }),
        });
    } catch (e) {
        console.warn("[FactChecker] Telegram 알림 실패:", e instanceof Error ? e.message : e);
    }
}

// ============================================================
// 6. 메인 함수 (cron / 수동 호출)
// ============================================================

/**
 * 콘텐츠 팩트체크 실행.
 *
 * 사용 예:
 *   const result = await validateContent(magazineBody, { contentType: "magazine", species: "강아지", sourceId: magazineId });
 *
 * 비용 절감:
 *   - 주장 추출은 정규식 (LLM X)
 *   - Tavily query 최대 5회 (주장 5개 한정)
 *   - 점수 70 이상이면 텔레그램 알림 skip 가능 (notify 옵션)
 */
export async function validateContent(
    content: string,
    options: ValidateOptions,
): Promise<FactCheckResult> {
    const claims = extractClaims(content);

    // Tavily query는 비용이라 병렬로 한번에
    const verified = await Promise.all(claims.map((c) => verifyClaim(c.claim, c.type)));

    const speciesConsistency = checkSpeciesConsistency(content, options.species);
    const flags = detectFlags(content);
    const overallScore = calculateScore(verified, speciesConsistency.issues.length);

    const matched = verified.filter((c) => c.status === "matched").length;
    const mismatched = verified.filter((c) => c.status === "mismatched").length;
    const uncertain = verified.filter((c) => c.status === "uncertain").length;
    const summary = `${verified.length}건 주장 중 일치 ${matched} / 불일치 ${mismatched} / 불확실 ${uncertain}. 플래그 ${flags.length}건. 종 일관성 ${speciesConsistency.ok ? "OK" : "FAIL"}.`;

    const result: FactCheckResult = {
        overallScore,
        claims: verified,
        flags,
        speciesConsistency,
        summary,
        queryCount: verified.length,
    };

    // DB 저장 (기본 활성)
    if (options.log !== false) {
        await saveValidationLog(options.contentType, options.sourceId, result, content);
    }

    // 텔레그램 알림 (점수 < 70 또는 강제 notify)
    const shouldNotify = options.notify !== false && overallScore < 80;
    if (shouldNotify) {
        await notifyTelegram(options.contentType, result, options.sourceId);
    }

    return result;
}

/** 수동 검증용 — 결과만 반환, DB/Telegram 영향 없음 */
export async function validateContentDryRun(
    content: string,
    options: Omit<ValidateOptions, "log" | "notify">,
): Promise<FactCheckResult> {
    return validateContent(content, { ...options, log: false, notify: false });
}
