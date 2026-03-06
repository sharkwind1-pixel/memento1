/**
 * agent/conversation.ts - 대화 맥락 유지 시스템
 *
 * 세션 요약 생성/저장/조회, 자동 타임라인 엔트리 저장,
 * 대화 시작 시 이전 맥락 컨텍스트 빌드를 담당한다.
 */

import type { EmotionType, GriefStage } from "@/types";
import { getSupabase, getOpenAI, hasChatModeColumn } from "./shared";
import { getDaysAgo, getGriefStageLabel } from "./helpers";
import { getRecentMessages } from "./memory";

// ---- 타입 정의 ----

export interface ConversationSummary {
    id?: string;
    userId: string;
    petId: string;
    sessionDate: string;
    summary: string;
    keyTopics: string[];
    emotionalTone: EmotionType;
    griefProgress?: GriefStage; // 추모 모드: 애도 진행 상태
    importantMentions: string[]; // 중요하게 언급된 내용
    createdAt?: string;
}

// ---- 세션 요약 생성/저장/조회 ----

/**
 * 이전 대화들을 요약하여 세션 요약 생성
 * @param messages 대화 메시지 배열
 * @param petName 반려동물 이름
 * @param isMemorial 추모 모드 여부
 */
export async function generateConversationSummary(
    messages: Array<{ role: string; content: string }>,
    petName: string,
    isMemorial: boolean = false
): Promise<Omit<ConversationSummary, "id" | "userId" | "petId" | "createdAt"> | null> {
    if (messages.length < 4) {
        // 대화가 너무 짧으면 요약 불필요
        return null;
    }

    try {
        const conversationText = messages
            .map(m => `${m.role === "user" ? "사용자" : petName}: ${m.content}`)
            .join("\n");

        const response = await getOpenAI().chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `당신은 반려동물과 보호자의 대화를 분석하고 요약하는 전문가입니다.
${isMemorial ? "이것은 무지개다리를 건넌 반려동물과의 추모 대화입니다." : "이것은 현재 함께하는 반려동물과의 일상 대화입니다."}

다음 대화를 분석하여 JSON 형식으로 요약하세요:

{
    "sessionDate": "YYYY-MM-DD",
    "summary": "대화의 핵심 내용 2-3문장 요약",
    "keyTopics": ["주요 주제1", "주요 주제2"],
    "emotionalTone": "happy|sad|anxious|angry|grateful|lonely|peaceful|excited|neutral",
    "importantMentions": ["기억할 만한 내용1", "내용2"]${isMemorial ? `,
    "griefProgress": "denial|anger|bargaining|depression|acceptance|unknown"` : ""}
}

분석 시 주의사항:
- summary: 대화에서 나눈 주제/활동/사건 중심으로 2-3문장 요약. 감정 표현("힘들어했다", "슬퍼했다", "걱정했다" 등)은 summary에 넣지 말고 emotionalTone에만 기록.
- keyTopics: 대화에서 언급된 주요 주제 (최대 5개, 활동/사건/정보 위주)
- emotionalTone: 대화의 전반적인 감정 톤 (내부 분석용)
- importantMentions: 다음 대화에서 참고할 만한 중요 언급 (약속, 계획 등. 감정 상태는 제외)
${isMemorial ? "- griefProgress: 애도 과정에서 현재 단계 (Kubler-Ross 모델 기반)" : ""}`
                },
                { role: "user", content: conversationText }
            ],
            max_tokens: 400,
            temperature: 0.3,
        });

        const result = JSON.parse(response.choices[0]?.message?.content || "{}");

        return {
            sessionDate: result.sessionDate || new Date().toISOString().split("T")[0],
            summary: result.summary || "",
            keyTopics: result.keyTopics || [],
            emotionalTone: result.emotionalTone || "neutral",
            griefProgress: result.griefProgress,
            importantMentions: result.importantMentions || [],
        };
    } catch (err) {
        console.error("[agent] summarizeConversation failed:", err instanceof Error ? err.message : err);
        return null;
    }
}

/**
 * 대화 세션 요약 저장
 * @param chatMode 대화 모드 ('daily' | 'memorial') - 모드별 데이터 분리용
 */
export async function saveConversationSummary(
    userId: string,
    petId: string,
    summary: Omit<ConversationSummary, "id" | "userId" | "petId" | "createdAt">,
    chatMode?: "daily" | "memorial"
) {
    // chat_mode 컬럼 존재 여부에 따라 조건부 포함 (마이그레이션 전후 호환)
    const hasModeCol = await hasChatModeColumn();

    const { data, error } = await getSupabase()
        .from("conversation_summaries")
        .insert({
            user_id: userId,
            pet_id: petId,
            session_date: summary.sessionDate,
            summary: summary.summary,
            key_topics: summary.keyTopics,
            emotional_tone: summary.emotionalTone,
            grief_progress: summary.griefProgress,
            important_mentions: summary.importantMentions,
            ...(hasModeCol && chatMode ? { chat_mode: chatMode } : {}),
        })
        .select()
        .single();

    if (error) {
        return null;
    }

    return data;
}

/**
 * 최근 대화 세션 요약 가져오기
 * @param isMemorialMode 모드별 필터링
 *   - false(일상): 추모 모드 요약 제외 (chat_mode='memorial' 또는 grief_progress 있는 것 제외)
 *   - true(추모): 모든 요약 포함 (일상 기억은 추모에서 활용 가능)
 *   - undefined: 필터 없음 (기존 호환)
 */
export async function getRecentSummaries(
    userId: string,
    petId: string,
    limit: number = 7,
    isMemorialMode?: boolean
): Promise<ConversationSummary[]> {
    let query = getSupabase()
        .from("conversation_summaries")
        .select("*")
        .eq("user_id", userId)
        .eq("pet_id", petId)
        .order("session_date", { ascending: false })
        .limit(limit);

    // 모드 필터링: 일상 모드에서 추모 데이터 차단
    const hasModeCol = await hasChatModeColumn();
    if (isMemorialMode === false) {
        if (hasModeCol) {
            // chat_mode 컬럼 있음: 정확한 모드 필터링
            // chat_mode IS NULL AND grief_progress IS NULL (레거시 일상)
            // OR chat_mode = 'daily'
            query = query.or("and(chat_mode.is.null,grief_progress.is.null),chat_mode.eq.daily");
        } else {
            // chat_mode 컬럼 없음 (마이그레이션 전): grief_progress 휴리스틱만 사용
            // grief_progress IS NULL -> 일상 모드 데이터로 간주
            query = query.is("grief_progress", null);
        }
    }
    // 추모 모드(true) 또는 undefined: 필터 없음 -- 모든 요약 포함

    const { data, error } = await query;

    if (error) {
        return [];
    }

    return (data || []).map(d => ({
        id: d.id,
        userId: d.user_id,
        petId: d.pet_id,
        sessionDate: d.session_date,
        summary: d.summary,
        keyTopics: d.key_topics || [],
        emotionalTone: d.emotional_tone,
        griefProgress: d.grief_progress,
        importantMentions: d.important_mentions || [],
        createdAt: d.created_at,
    }));
}

// ---- 컨텍스트 빌드 ----

/**
 * 세션 요약들을 컨텍스트 문자열로 변환
 */
export function summariesToContext(
    summaries: ConversationSummary[],
    petName: string,
    isMemorial: boolean = false
): string {
    if (summaries.length === 0) return "";

    const entries = summaries.map((s) => {
        const daysAgo = getDaysAgo(s.sessionDate);
        const timeLabel = daysAgo === 0 ? "오늘" : daysAgo === 1 ? "어제" : `${daysAgo}일 전`;

        // 일상 모드: 감정 상태 제외 (펫이 주인 감정 분석하면 부자연스러움)
        // 추모 모드: 애도 단계만 내부 참고 (직접 언급 금지)
        let entry = `### ${timeLabel} (${s.sessionDate})
- 대화 내용: ${s.summary}
- 주요 주제: ${s.keyTopics.join(", ")}`;

        if (s.importantMentions.length > 0) {
            entry += `\n- 기억할 것: ${s.importantMentions.join(", ")}`;
        }

        // 추모 모드에서만 애도 단계 참고 (톤 조절용, 직접 언급 금지)
        if (isMemorial && s.griefProgress) {
            entry += `\n- (내부 참고) 애도 단계: ${getGriefStageLabel(s.griefProgress)}`;
        }

        return entry;
    });

    const contextTitle = isMemorial
        ? `## 최근 대화 기록 (가족의 애도 여정)`
        : `## 최근 대화 기록`;

    const usageGuide = isMemorial
        ? `**활용법**: 이전 대화에서 나눈 주제/추억을 자연스럽게 연결하세요.
**금지**: 가족의 감정 상태를 직접 언급하지 마세요 ("힘들어했잖아", "슬퍼보였어" 등 금지). 주제/활동 중심으로만 연결.`
        : `**활용법**: 이전 대화의 주제/활동을 자연스럽게 언급해서 연속성 있는 대화를 하세요.
**금지**: 가족의 감정 상태를 직접 언급하거나 걱정하지 마세요 ("힘들어했잖아", "걱정했어", "괜찮아?" 등 금지). 주제/활동 기반으로만 연결.
좋은 예: "어제 산책 갔던 거 어땠어?" / "지난번에 간식 사준다고 했잖아~"
나쁜 예: "지난번 좀 힘들었던 것 같아서 걱정했어" / "오늘은 괜찮아?"`;

    return `${contextTitle}

${entries.join("\n\n")}

${usageGuide}`;
}

// ---- 자동 타임라인 ----

/**
 * AI 대화에서 자동 생성된 타임라인 엔트리 저장
 * 의미 있는 대화 내용을 타임라인에 기록 (일상 기록의 보조)
 *
 * @param userId 사용자 ID
 * @param petId 반려동물 ID
 * @param summary 대화 세션 요약
 * @param isMemorialMode 추모 모드 여부
 * @returns 저장된 타임라인 엔트리 또는 null
 */
export async function saveAutoTimelineEntry(
    userId: string,
    petId: string,
    summary: Omit<ConversationSummary, "id" | "userId" | "petId" | "createdAt">,
    isMemorialMode: boolean = false
): Promise<{ id: string } | null> {
    // 너무 짧거나 의미 없는 요약은 저장하지 않음
    if (!summary.summary || summary.summary.length < 20) {
        return null;
    }

    // 키 토픽이 없으면 저장하지 않음 (일상적 대화만 한 경우)
    if (!summary.keyTopics || summary.keyTopics.length === 0) {
        return null;
    }

    try {
        // 제목 생성: 주요 토픽들을 조합
        const titleTopics = summary.keyTopics.slice(0, 2).join(", ");
        const title = isMemorialMode
            ? `${titleTopics} 이야기를 나눴어요`
            : `${titleTopics}에 대해 대화했어요`;

        // 감정 톤을 mood로 매핑
        let mood: "happy" | "normal" | "sad" | "sick" = "normal";
        if (["happy", "excited", "grateful", "peaceful"].includes(summary.emotionalTone)) {
            mood = "happy";
        } else if (["sad", "lonely", "anxious"].includes(summary.emotionalTone)) {
            mood = "sad";
        }

        // 내용 구성 (AI 생성 태그 포함)
        const contentLines: string[] = [];
        contentLines.push(summary.summary);

        if (summary.importantMentions && summary.importantMentions.length > 0) {
            contentLines.push("");
            contentLines.push(`기억할 것: ${summary.importantMentions.join(", ")}`);
        }

        // 추모 모드는 별도 표시
        if (isMemorialMode) {
            contentLines.push("");
            contentLines.push("[무지개다리 너머에서 나눈 대화]");
        }

        const content = contentLines.join("\n");

        const { data, error } = await getSupabase()
            .from("timeline_entries")
            .insert({
                pet_id: petId,
                user_id: userId,
                date: summary.sessionDate,
                title: `[AI 펫톡] ${title}`, // AI 채팅에서 자동 생성됨을 제목에 표시
                content,
                mood,
            })
            .select("id")
            .single();

        if (error) {
            console.error("[agent/saveAutoTimelineEntry]", error.message);
            return null;
        }

        return data;
    } catch (err) {
        console.error("[agent/saveAutoTimelineEntry]", err instanceof Error ? err.message : err);
        return null;
    }
}

/**
 * 대화 시작 시 이전 맥락 컨텍스트 생성
 * 최근 요약 + 마지막 대화 몇 개를 조합
 *
 * 모드별 데이터 흐름 규칙:
 * - 일상 -> 추모: OK (함께한 기억이 추모로 이어짐)
 * - 추모 -> 일상: 차단 (추모 데이터가 일상으로 역류하면 논리적 괴리 발생)
 */
export async function buildConversationContext(
    userId: string,
    petId: string,
    petName: string,
    isMemorial: boolean = false
): Promise<string> {
    try {
        // 1. 최근 세션 요약 가져오기 (최대 5개, 모드 필터링 적용)
        const summaries = await getRecentSummaries(userId, petId, 5, isMemorial);

        // 2. 요약을 컨텍스트로 변환
        const summaryContext = summariesToContext(summaries, petName, isMemorial);

        // 3. 마지막 대화 일부 가져오기 (연속성을 위해, 모드 필터링 적용)
        const recentMessages = await getRecentMessages(userId, petId, 10, isMemorial);

        let recentContext = "";
        if (recentMessages.length > 0) {
            const lastMsgTime = new Date(recentMessages[recentMessages.length - 1]?.created_at || Date.now());
            const hoursSinceLastMsg = (Date.now() - lastMsgTime.getTime()) / (1000 * 60 * 60);

            // 시간 무관하게 마지막 대화 항상 포함 (영구 기억)
            const timeLabel = hoursSinceLastMsg < 1
                ? "방금 전"
                : hoursSinceLastMsg < 24
                    ? `${Math.round(hoursSinceLastMsg)}시간 전`
                    : `${Math.round(hoursSinceLastMsg / 24)}일 전`;

            const lastMessages = recentMessages.slice(-6).map(m =>
                `- ${m.role === "user" ? "가족" : petName}: ${m.content.substring(0, 100)}${m.content.length > 100 ? "..." : ""}`
            );
            recentContext = `## 직전 대화 (${timeLabel})
${lastMessages.join("\n")}

**참고**: 직전 대화 내용을 기억하고 자연스럽게 이어가세요. 같은 주제를 반복하지 말고 새로운 이야기를 하세요.`;
        }

        return [summaryContext, recentContext].filter(Boolean).join("\n\n");
    } catch (err) {
        console.error("[agent] buildConversationContext failed:", err instanceof Error ? err.message : err);
        return "";
    }
}
