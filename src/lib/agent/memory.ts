/**
 * agent/memory.ts - 메모리 시스템 (장기 기억 CRUD)
 *
 * 반려동물에 대한 장기 기억(선호도, 에피소드, 건강 등)과
 * 대화 메시지 저장/조회를 담당한다.
 */

import type { EmotionType } from "@/types";
import { getSupabase, getOpenAI, hasChatModeColumn } from "./shared";
import { AI_CONFIG } from "@/config/constants";

// ---- 타입 정의 ----

export interface PetMemory {
    id?: string;
    petId: string;
    userId: string;
    memoryType: "preference" | "episode" | "health" | "personality" | "relationship" | "place" | "routine" | "schedule" | "pending_topic";
    title: string;
    content: string;
    importance: number;
    // 스케줄/루틴 관련 추가 필드
    timeInfo?: {
        type: "daily" | "weekly" | "monthly" | "once";
        time?: string; // "09:00", "18:30" 등
        dayOfWeek?: number; // 0-6 (일-토)
        dayOfMonth?: number; // 1-31
    };
}

// DB 레코드 타입 (snake_case)
interface PetMemoryRecord {
    id: string;
    pet_id: string;
    user_id: string;
    memory_type: string;
    title: string;
    content: string;
    importance: number;
    time_info?: {
        type: "daily" | "weekly" | "monthly" | "once";
        time?: string;
        dayOfWeek?: number;
        dayOfMonth?: number;
    };
}

// DB 레코드를 PetMemory로 변환
function recordToMemory(record: PetMemoryRecord): PetMemory {
    return {
        id: record.id,
        petId: record.pet_id,
        userId: record.user_id,
        memoryType: record.memory_type as PetMemory["memoryType"],
        title: record.title,
        content: record.content,
        importance: record.importance,
        timeInfo: record.time_info,
    };
}

// 메모리 추출 결과 타입 (id, petId, userId 없음)
export type ExtractedMemory = Omit<PetMemory, "id" | "petId" | "userId">;

// ---- 메모리 CRUD ----

/**
 * 대화에서 중요한 정보 추출 (메모리 생성)
 */
export async function extractMemories(
    message: string,
    petName: string
): Promise<ExtractedMemory[] | null> {
    try {
        const response = await getOpenAI().chat.completions.create({
            model: AI_CONFIG.AI_MODEL,
            messages: [
                {
                    role: "system",
                    content: `당신은 대화에서 반려동물(${petName})에 대한 중요한 정보를 추출하는 전문가입니다.

사용자의 메시지에서 ${petName}에 대해 기억해야 할 정보가 있다면 추출하세요.
기억할 만한 정보가 없으면 빈 배열 []을 반환하세요.

반드시 다음 JSON 형식으로만 응답하세요:
[
    {
        "memoryType": "preference|episode|health|personality|relationship|place|routine|schedule",
        "title": "간단한 제목 (10자 이내)",
        "content": "상세 내용",
        "importance": 1-10,
        "timeInfo": null 또는 { "type": "daily|weekly", "time": "HH:MM" }
    }
]

메모리 타입:
- preference: 좋아하는 것/싫어하는 것 (예: 간식, 장난감)
- episode: 특별한 추억/에피소드
- health: 건강 관련 정보
- personality: 성격/습관
- relationship: 가족/친구 관계
- place: 좋아하는 장소
- routine: 일상 루틴 (시간 정보 없이 반복되는 습관)
- schedule: 시간이 정해진 일정 (산책 시간, 밥 시간 등)

**중요: 시간 패턴 추출**
"아침에 산책해", "저녁 7시에 밥 줘", "매일 9시에 약 먹어" 같은 표현에서 시간 정보를 추출하세요.
- "아침" → "08:00"
- "점심" → "12:00"
- "저녁" → "18:00"
- "밤" → "21:00"
- 구체적 시간 언급 시 그대로 사용 (예: "7시" → "19:00" 또는 "07:00" 문맥 파악)

예시:
입력: "매일 아침 8시에 산책 가요"
출력: [{"memoryType": "schedule", "title": "아침 산책", "content": "매일 아침 8시에 산책", "importance": 8, "timeInfo": {"type": "daily", "time": "08:00"}}]

입력: "닭가슴살 간식을 제일 좋아해요"
출력: [{"memoryType": "preference", "title": "닭가슴살 좋아함", "content": "닭가슴살 간식을 가장 좋아함", "importance": 7, "timeInfo": null}]`
                },
                { role: "user", content: message }
            ],
            max_tokens: 400,
            temperature: 0.3,
        });

        const result = JSON.parse(response.choices[0]?.message?.content || "[]");
        return Array.isArray(result) && result.length > 0 ? result : null;
    } catch (err) {
        console.error("[agent] extractMemories failed:", err instanceof Error ? err.message : err);
        return null;
    }
}

/**
 * 최근 대화 기록 가져오기
 * @param isMemorialMode true면 추모 모드 메시지만, false면 일상 모드 메시지만 가져옴
 *   - 일상 -> 추모 데이터 차단 (살아있는 펫이 추모 대화를 알 수 없음)
 *   - 추모 -> 일상 데이터 포함 가능 (함께한 기억의 연장)
 */
export async function getRecentMessages(
    userId: string,
    petId: string,
    limit: number = 20,
    isMemorialMode?: boolean
) {
    let query = getSupabase()
        .from("chat_messages")
        .select("*")
        .eq("user_id", userId)
        .eq("pet_id", petId)
        .order("created_at", { ascending: false })
        .limit(limit);

    // 모드 필터링: chat_mode 컬럼이 있는 경우에만 적용
    // 일상 모드: 추모 대화 제외 (chat_mode가 null이거나 'daily'인 것만)
    // 추모 모드: 모든 대화 포함 (일상 기억은 추모에서 활용 가능)
    const hasModeCol = await hasChatModeColumn();
    if (hasModeCol && isMemorialMode === false) {
        // 일상 모드: memorial 데이터 제외
        // chat_mode IS NULL (레거시) OR chat_mode = 'daily'
        query = query.or("chat_mode.is.null,chat_mode.eq.daily");
    }
    // 추모 모드(isMemorialMode === true): 필터 없음 -- 모든 대화 포함

    const { data, error } = await query;

    if (error) {
        return [];
    }

    return data?.reverse() || [];
}

/**
 * 반려동물의 메모리 가져오기
 */
export async function getPetMemories(
    petId: string,
    limit: number = 10
): Promise<PetMemory[]> {
    const { data, error } = await getSupabase()
        .from("pet_memories")
        .select("*")
        .eq("pet_id", petId)
        .order("importance", { ascending: false })
        .limit(limit);

    if (error || !data) {
        return [];
    }

    return (data as PetMemoryRecord[]).map(recordToMemory);
}

/**
 * 가장 최근 pending_topic 가져오기 (다음 대화에서 이어갈 주제)
 */
export async function getLatestPendingTopic(petId: string): Promise<string | null> {
    const { data, error } = await getSupabase()
        .from("pet_memories")
        .select("content")
        .eq("pet_id", petId)
        .eq("memory_type", "pending_topic")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    return data.content;
}

/**
 * 대화 메시지 저장
 * @param chatMode 대화 모드 ('daily' | 'memorial') - 모드별 데이터 분리용
 */
export async function saveMessage(
    userId: string,
    petId: string,
    role: "user" | "assistant",
    content: string,
    emotion?: EmotionType,
    emotionScore?: number,
    chatMode?: "daily" | "memorial"
) {
    // chat_mode 컬럼 존재 여부에 따라 조건부 포함 (마이그레이션 전후 호환)
    const hasModeCol = await hasChatModeColumn();

    const { data, error } = await getSupabase()
        .from("chat_messages")
        .insert({
            user_id: userId,
            pet_id: petId,
            role,
            content,
            emotion,
            emotion_score: emotionScore,
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
 * 메모리 저장 (중복 방지 + 타입별 분기)
 * - episode: 항상 새로 저장 (특정 에피소드는 덮어쓰면 안 됨)
 * - preference/routine/schedule 등: 동일 title+type이면 최신 내용으로 업데이트
 * - pending_topic: 동일 title+type이면 업데이트 (다음 대화 주제 갱신)
 */
export async function saveMemory(
    userId: string,
    petId: string,
    memory: Omit<PetMemory, "id" | "petId" | "userId">
) {
    const supabase = getSupabase();

    // episode 타입은 항상 신규 저장 (추억은 덮어쓰지 않음)
    const alwaysInsertTypes = ["episode"];
    if (!alwaysInsertTypes.includes(memory.memoryType)) {
        // 기존 동일 메모리 확인 (pet_id + title + memory_type 기준)
        const { data: existing } = await supabase
            .from("pet_memories")
            .select("id, importance")
            .eq("pet_id", petId)
            .eq("title", memory.title)
            .eq("memory_type", memory.memoryType)
            .maybeSingle();

        if (existing) {
            // 기존 메모리 업데이트 (importance는 더 높은 값 유지)
            const { data, error } = await supabase
                .from("pet_memories")
                .update({
                    content: memory.content,
                    importance: Math.max(memory.importance, existing.importance || 0),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id)
                .select()
                .single();

            if (error) {
                return null;
            }
            return data;
        }
    }

    // 신규 메모리 저장
    const { data, error } = await supabase
        .from("pet_memories")
        .insert({
            user_id: userId,
            pet_id: petId,
            memory_type: memory.memoryType,
            title: memory.title,
            content: memory.content,
            importance: memory.importance,
            time_info: memory.timeInfo || null,
        })
        .select()
        .single();

    if (error) {
        return null;
    }

    return data;
}

/**
 * 사용자 메시지와 관련성 높은 메모리를 우선 반환
 * importance + 키워드 매칭 점수 조합으로 정렬
 */
export async function getRelevantMemories(
    petId: string,
    userMessage: string,
    limit: number = 8
): Promise<PetMemory[]> {
    // 전체 메모리를 가져온 뒤 관련성 스코어링
    const { data, error } = await getSupabase()
        .from("pet_memories")
        .select("*")
        .eq("pet_id", petId)
        .order("importance", { ascending: false })
        .limit(30); // 후보 풀을 넉넉히

    if (error || !data || data.length === 0) {
        return getPetMemories(petId, limit);
    }

    const memories = (data as PetMemoryRecord[]).map(recordToMemory);

    // 유저 메시지에서 키워드 추출 (2글자 이상 명사/키워드)
    const msgLower = userMessage.toLowerCase();
    const keywords = msgLower
        .replace(/[?!.,~\s]+/g, " ")
        .split(" ")
        .filter((w) => w.length >= 2);

    // 각 메모리에 관련성 점수 부여
    const scored = memories.map((m) => {
        let relevanceScore = 0;
        const memText = `${m.title} ${m.content}`.toLowerCase();

        // 키워드 매칭 (각 키워드 매치당 +3점)
        for (const kw of keywords) {
            if (memText.includes(kw)) relevanceScore += 3;
        }

        // 메모리 타입별 보너스
        if (msgLower.includes("간식") || msgLower.includes("사료") || msgLower.includes("먹")) {
            if (m.memoryType === "preference") relevanceScore += 2;
        }
        if (msgLower.includes("병원") || msgLower.includes("아프") || msgLower.includes("건강")) {
            if (m.memoryType === "health") relevanceScore += 2;
        }
        if (msgLower.includes("산책") || msgLower.includes("놀") || msgLower.includes("공원")) {
            if (m.memoryType === "place" || m.memoryType === "routine") relevanceScore += 2;
        }
        if (msgLower.includes("언제") || msgLower.includes("시간") || msgLower.includes("몇시")) {
            if (m.memoryType === "schedule" || m.memoryType === "routine") relevanceScore += 2;
        }

        // 최종 점수 = importance(1~10) + relevance(0~20+)
        const totalScore = m.importance + relevanceScore;

        return { memory: m, totalScore, relevanceScore };
    });

    // 점수 내림차순 정렬, 관련성 있는 것 우선
    scored.sort((a, b) => {
        // 관련성 점수가 있는 것 우선
        if (a.relevanceScore > 0 && b.relevanceScore === 0) return -1;
        if (a.relevanceScore === 0 && b.relevanceScore > 0) return 1;
        return b.totalScore - a.totalScore;
    });

    return scored.slice(0, limit).map((s) => s.memory);
}

/**
 * 메모리를 컨텍스트 문자열로 변환
 */
export function memoriesToContext(memories: PetMemory[]): string {
    if (memories.length === 0) return "";

    const memoryStrings = memories.map((m) => {
        let timeStr = "";
        if (m.timeInfo && m.timeInfo.time) {
            timeStr = ` (${m.timeInfo.type === "daily" ? "매일" : "매주"} ${m.timeInfo.time})`;
        }
        return `- [${m.memoryType}] ${m.title}: ${m.content}${timeStr}`;
    });

    return `\n\n## 기억하고 있는 정보:\n${memoryStrings.join("\n")}`;
}
