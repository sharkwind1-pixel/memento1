/**
 * AI 기반 게시글 콘텐츠 모더레이션 (비동기 백그라운드)
 * - 게시글 작성 후 비동기로 GPT-4o-mini에 콘텐츠 검토 요청
 * - 부적절 판정 시 자동 숨김 처리
 * - moderation_logs 테이블에 감사 기록
 */

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

/** AI 모더레이션 판정 결과 */
type ModerationVerdict = "safe" | "inappropriate" | "spam" | "hate_speech";

/** Supabase admin 클라이언트 (서버 전용) */
function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase 환경변수 누락");
    return createClient(url, key);
}

/** OpenAI 클라이언트 */
function getOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수 누락");
    return new OpenAI({ apiKey });
}

/** 모더레이션 시스템 프롬프트 */
const MODERATION_SYSTEM_PROMPT = `당신은 반려동물 커뮤니티 게시판의 콘텐츠 모더레이터입니다.
게시글의 제목과 내용을 검토하고, 아래 4가지 중 하나로 판정하세요.

판정 기준:
- safe: 정상적인 게시글 (반려동물 이야기, 정보, 질문, 일상 등)
- inappropriate: 부적절한 콘텐츠 (선정적, 폭력적, 혐오 발언, 차별)
- spam: 스팸/광고 (상업적 홍보, 무관한 광고, 낚시성 콘텐츠)
- hate_speech: 혐오 표현 (생명 비하, 동물 학대 조장, 심각한 욕설)

특별 주의:
- 이 커뮤니티는 반려동물 추모 서비스도 포함합니다
- "무지개다리"는 반려동물 사망의 완곡한 표현으로, 정상 콘텐츠입니다
- 슬픔, 그리움을 표현하는 글은 safe입니다
- 반려동물을 비하하거나 생명을 경시하는 표현은 hate_speech입니다

반드시 아래 JSON 형식으로만 응답하세요:
{"verdict": "safe|inappropriate|spam|hate_speech", "reason": "판정 사유 (한국어, 20자 이내)"}`;

/**
 * AI로 게시글 콘텐츠를 비동기 검토
 * 게시글 작성 직후 호출되며, await 없이 fire-and-forget으로 실행
 */
export async function moderateWithAI(
    postId: string,
    title: string,
    content: string
): Promise<void> {
    try {
        // AI 영상 자동 게시글은 모더레이션 건너뛰기 (시스템 생성 콘텐츠)
        if (content.includes("AI 영상을 만들었어요") || content.includes("AI로 만든 우리 아이의")) {
            return;
        }

        const openai = getOpenAI();
        const supabase = getAdminSupabase();

        // GPT-4o-mini로 판정 요청 (저비용, 빠른 응답)
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: MODERATION_SYSTEM_PROMPT },
                { role: "user", content: `제목: ${title.slice(0, 100)}\n내용: ${content.slice(0, 500)}` },
            ],
            max_tokens: 60,
            temperature: 0.1, // 일관된 판정을 위해 낮은 온도
        });

        const rawReply = response.choices[0]?.message?.content?.trim() || "";

        // JSON 파싱
        let verdict: ModerationVerdict = "safe";
        let reason = "";

        try {
            const parsed = JSON.parse(rawReply);
            verdict = parsed.verdict || "safe";
            reason = parsed.reason || "";
        } catch {
            // JSON 파싱 실패 시 안전 판정 (오탐 방지)
            console.warn("[AI Moderation] JSON parse failed, defaulting to safe:", rawReply);
            verdict = "safe";
            reason = "파싱 실패 - 안전 판정";
        }

        // 판정 결과에 따른 처리
        const moderationStatus = verdict === "safe" ? "approved" : "rejected";

        // community_posts 업데이트
        await supabase
            .from("community_posts")
            .update({
                moderation_status: moderationStatus,
                moderation_reason: verdict !== "safe" ? reason : null,
                ...(verdict !== "safe" && { is_hidden: true }),
            })
            .eq("id", postId);

        // moderation_logs에 기록
        await supabase.from("moderation_logs").insert({
            post_id: postId,
            filter_type: "ai",
            result: verdict === "safe" ? "approved" : "blocked",
            reason: reason || verdict,
            details: {
                model: "gpt-4o-mini",
                verdict,
                raw_response: rawReply.slice(0, 200),
                tokens_used: response.usage?.total_tokens || 0,
            },
        });

        if (verdict !== "safe") {
            // 텔레그램 신고 그룹에 자동 숨김 알림
            import("@/lib/telegram").then(({ notifyReport }) =>
                notifyReport({
                    targetType: "ai-moderation",
                    targetId: postId,
                    reason: `AI 자동 숨김: ${verdict} - ${reason || "부적절한 콘텐츠"}`,
                })
            ).catch(() => {});
        }
    } catch (err) {
        console.error("[AI Moderation] Failed:", err instanceof Error ? err.message : err);
        // 실패해도 게시글은 유지 (안전한 방향)
    }
}
