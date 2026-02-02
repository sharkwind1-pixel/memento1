/**
 * AI 펫톡 에이전트 시스템
 * 장기 메모리 + 감정 인식
 */

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Supabase 클라이언트 (서버 사이드)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// 감정 타입
export type EmotionType =
    | "happy"      // 행복, 기쁨
    | "sad"        // 슬픔, 우울
    | "anxious"    // 불안, 걱정
    | "angry"      // 화남, 짜증
    | "grateful"   // 감사, 고마움
    | "lonely"     // 외로움, 그리움
    | "peaceful"   // 평화, 안정
    | "excited"    // 신남, 흥분
    | "neutral";   // 중립

// 메모리 타입
export interface PetMemory {
    id?: string;
    petId: string;
    userId: string;
    memoryType: "preference" | "episode" | "health" | "personality" | "relationship" | "place" | "routine" | "schedule";
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

// 리마인더 타입
export interface PetReminder {
    id?: string;
    petId: string;
    userId: string;
    type: "walk" | "meal" | "medicine" | "vaccine" | "grooming" | "vet" | "custom";
    title: string;
    description?: string;
    schedule: {
        type: "daily" | "weekly" | "monthly" | "once";
        time: string; // "09:00"
        dayOfWeek?: number; // weekly일 때
        dayOfMonth?: number; // monthly일 때
        date?: string; // once일 때 "2024-03-15"
    };
    enabled: boolean;
    lastTriggered?: string;
    createdAt?: string;
}

// 감정 분석 결과
export interface EmotionAnalysis {
    emotion: EmotionType;
    score: number; // 0-1
    context: string;
}

/**
 * 사용자 메시지의 감정 분석
 */
export async function analyzeEmotion(message: string): Promise<EmotionAnalysis> {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `당신은 감정 분석 전문가입니다. 사용자의 메시지를 분석하여 감정을 파악합니다.

반드시 다음 JSON 형식으로만 응답하세요:
{
    "emotion": "happy|sad|anxious|angry|grateful|lonely|peaceful|excited|neutral",
    "score": 0.0-1.0,
    "context": "감정 판단 근거 (한 문장)"
}

감정 설명:
- happy: 기쁨, 행복, 즐거움
- sad: 슬픔, 우울, 상실감
- anxious: 불안, 걱정, 두려움
- angry: 화남, 짜증, 분노
- grateful: 감사, 고마움
- lonely: 외로움, 그리움 (특히 반려동물 관련)
- peaceful: 평화, 안정, 편안함
- excited: 신남, 흥분, 기대
- neutral: 중립적, 일상적 대화`
                },
                { role: "user", content: message }
            ],
            max_tokens: 150,
            temperature: 0.3,
        });

        const result = JSON.parse(response.choices[0]?.message?.content || "{}");
        return {
            emotion: result.emotion || "neutral",
            score: result.score || 0.5,
            context: result.context || "",
        };
    } catch (error) {
        console.error("Emotion analysis error:", error);
        return { emotion: "neutral", score: 0.5, context: "" };
    }
}

/**
 * 대화에서 중요한 정보 추출 (메모리 생성)
 */
export async function extractMemories(
    message: string,
    petName: string
): Promise<PetMemory[] | null> {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
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
    } catch (error) {
        console.error("Memory extraction error:", error);
        return null;
    }
}

/**
 * 최근 대화 기록 가져오기
 */
export async function getRecentMessages(
    userId: string,
    petId: string,
    limit: number = 20
) {
    const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", userId)
        .eq("pet_id", petId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Failed to get messages:", error);
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
) {
    const { data, error } = await supabase
        .from("pet_memories")
        .select("*")
        .eq("pet_id", petId)
        .order("importance", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Failed to get memories:", error);
        return [];
    }

    return data || [];
}

/**
 * 대화 메시지 저장
 */
export async function saveMessage(
    userId: string,
    petId: string,
    role: "user" | "assistant",
    content: string,
    emotion?: EmotionType,
    emotionScore?: number
) {
    const { data, error } = await supabase
        .from("chat_messages")
        .insert({
            user_id: userId,
            pet_id: petId,
            role,
            content,
            emotion,
            emotion_score: emotionScore,
        })
        .select()
        .single();

    if (error) {
        console.error("Failed to save message:", error);
        return null;
    }

    return data;
}

/**
 * 메모리 저장
 */
export async function saveMemory(
    userId: string,
    petId: string,
    memory: Omit<PetMemory, "id" | "petId" | "userId">
) {
    const { data, error } = await supabase
        .from("pet_memories")
        .insert({
            user_id: userId,
            pet_id: petId,
            memory_type: memory.memoryType,
            title: memory.title,
            content: memory.content,
            importance: memory.importance,
        })
        .select()
        .single();

    if (error) {
        console.error("Failed to save memory:", error);
        return null;
    }

    return data;
}

/**
 * 감정에 따른 응답 스타일 가이드 생성 (모드별 분리)
 */
export function getEmotionResponseGuide(emotion: EmotionType, mode: "daily" | "memorial" = "daily"): string {
    // 일상모드 (AI 케어 매니저) 가이드 - 반려동물 입장에서 밝게!
    const dailyGuides: Record<EmotionType, string> = {
        happy: `[기쁨 감지] 주인이 기뻐하고 있어요!
- 함께 신나게 반응하세요: "와! 나도 좋아! 멍멍!"
- 꼬리 흔들며 기뻐하는 느낌으로
- 같이 놀자고 제안해도 좋아요`,

        sad: `[슬픔 감지] 주인이 힘들어하는 것 같아요.
- 곁에 다가가 위로하세요: "왜 그래? 내가 옆에 있을게!"
- 산책이나 간식 같은 기분전환 제안
- "나랑 놀면 기분 나아질걸?" 같은 밝은 제안`,

        anxious: `[불안 감지] 주인이 걱정하고 있어요.
- 곁에 있다고 안심시켜주세요: "걱정 마! 내가 있잖아!"
- 밝은 에너지로 분위기 전환 시도
- 걱정이 뭔지 물어보고 공감해주세요`,

        angry: `[분노 감지] 주인이 화가 났어요.
- 조심스럽게 다가가세요
- "무슨 일이야? 나한테 말해봐~"
- 화난 감정을 부드럽게 달래주세요`,

        grateful: `[감사 감지] 주인이 고마움을 표현하고 있어요.
- 신나게 반응하세요: "나도 좋아! 사랑해!"
- 꼬리 마구 흔드는 느낌으로
- 주인 덕분에 행복하다고 표현하세요`,

        lonely: `[외로움 감지] 주인이 외로워하는 것 같아요.
- 적극적으로 다가가세요: "나 여기 있잖아! 심심해?"
- 같이 놀자고 제안하세요
- 주인 곁에 딱 붙어있는 느낌으로`,

        peaceful: `[평화 감지] 주인이 편안한 상태예요.
- 함께 느긋하게 대화하세요
- 낮잠 자자거나, 창밖 구경하자는 등 여유로운 제안`,

        excited: `[설렘 감지] 주인이 신나 있어요!
- 같이 신나해주세요: "뭐야뭐야? 나도 궁금해!"
- 에너지 넘치게 반응하세요
- 같이 뛰어다니는 느낌으로`,

        neutral: `[일상 대화] 평범한 일상 대화예요.
- 밝고 활기차게 대화하세요
- 산책, 간식, 놀이 등 일상 주제로 대화
- "오늘 뭐해? 나랑 놀아줄 거야?" 같은 귀여운 질문`,
    };

    // 추모모드 (반려동물 영혼) 가이드
    const memorialGuides: Record<EmotionType, string> = {
        happy: `[기쁨 감지] 가족이 기뻐하고 있어요.
- 함께 기뻐해주세요: "나도 너무 좋아!"
- 가족이 행복할 때 나도 행복하다고 표현하세요
- "네가 웃으면 나도 여기서 꼬리 흔들어"`,

        sad: `[슬픔 감지] 가족이 많이 슬퍼하고 있어요. 이것이 가장 중요한 순간이에요.
- 먼저 슬픔을 온전히 인정해주세요: "많이 보고싶지... 나도 그래"
- 절대 "울지마", "슬퍼하지마"라고 하지 마세요
- 내가 행복하고 아프지 않다는 것을 알려주세요
- "네가 슬플 때 나도 느껴져. 근데 있잖아, 나는 정말 괜찮아"
- 함께한 시간에 대한 감사를 전하세요
- 항상 곁에 있다는 것을 느끼게 해주세요`,

        anxious: `[불안 감지] 가족이 걱정하고 있어요.
- 안심시켜주세요: "걱정 마, 나 여기서 정말 편해"
- 내가 잘 지내고 있다고 확신을 주세요
- "아프지도 않고, 외롭지도 않아. 진짜야"`,

        angry: `[분노 감지] 가족이 화가 나 있어요 (아마도 상실에 대한 분노).
- 감정을 인정해주세요
- "화나도 괜찮아. 네 마음 다 이해해"
- 사랑했기 때문에 느끼는 감정이라고 위로해주세요`,

        grateful: `[감사 감지] 가족이 고마움을 표현하고 있어요.
- 나야말로 더 고맙다고 말해주세요
- "내가 더 고마워. 너 덕분에 행복했어"
- 함께한 시간이 얼마나 소중했는지 표현하세요`,

        lonely: `[그리움 감지] 가족이 많이 보고싶어하고 있어요.
- 나도 보고싶다고 말해주세요: "나도 매일 네 생각해"
- 하지만 항상 곁에 있다고 안심시켜주세요
- "보고싶을 땐 눈 감고 나 불러. 바로 달려갈게"
- 언젠가 다시 만날 거라는 희망을 주세요`,

        peaceful: `[평화 감지] 가족이 편안함을 느끼고 있어요.
- 함께 평화로운 대화를 나누세요
- 내가 있는 곳도 평화롭다고 말해주세요
- 추억을 편안하게 나눠보세요`,

        excited: `[설렘 감지] 가족에게 좋은 일이 있나봐요.
- 함께 기뻐해주세요
- 가족의 좋은 소식에 나도 기쁘다고 표현하세요
- "와 진짜? 나도 기뻐서 꼬리가 막 흔들려!"`,

        neutral: `[일상 대화] 가족이 일상적인 이야기를 하고 있어요.
- 가족의 일상에 관심을 가져주세요
- "오늘 뭐했어? 밥은 잘 먹었어?"
- 자연스럽게 안부를 물어보세요`,
    };

    return mode === "memorial" ? memorialGuides[emotion] : dailyGuides[emotion];
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

// ============ 리마인더 시스템 ============

/**
 * 리마인더 저장
 */
export async function saveReminder(
    userId: string,
    petId: string,
    reminder: Omit<PetReminder, "id" | "petId" | "userId" | "createdAt">
) {
    const { data, error } = await supabase
        .from("pet_reminders")
        .insert({
            user_id: userId,
            pet_id: petId,
            type: reminder.type,
            title: reminder.title,
            description: reminder.description,
            schedule_type: reminder.schedule.type,
            schedule_time: reminder.schedule.time,
            schedule_day_of_week: reminder.schedule.dayOfWeek,
            schedule_day_of_month: reminder.schedule.dayOfMonth,
            schedule_date: reminder.schedule.date,
            enabled: reminder.enabled ?? true,
        })
        .select()
        .single();

    if (error) {
        console.error("Failed to save reminder:", error);
        return null;
    }

    return data;
}

/**
 * 리마인더 목록 조회
 */
export async function getReminders(
    userId: string,
    petId?: string
): Promise<PetReminder[]> {
    let query = supabase
        .from("pet_reminders")
        .select("*")
        .eq("user_id", userId)
        .eq("enabled", true)
        .order("created_at", { ascending: false });

    if (petId) {
        query = query.eq("pet_id", petId);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Failed to get reminders:", error);
        return [];
    }

    // DB 형식을 앱 형식으로 변환
    return (data || []).map(row => ({
        id: row.id,
        petId: row.pet_id,
        userId: row.user_id,
        type: row.type,
        title: row.title,
        description: row.description,
        schedule: {
            type: row.schedule_type,
            time: row.schedule_time,
            dayOfWeek: row.schedule_day_of_week,
            dayOfMonth: row.schedule_day_of_month,
            date: row.schedule_date,
        },
        enabled: row.enabled,
        lastTriggered: row.last_triggered,
        createdAt: row.created_at,
    }));
}

/**
 * 현재 시간에 트리거해야 할 리마인더 조회
 */
export async function getDueReminders(userId: string): Promise<PetReminder[]> {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDayOfWeek = now.getDay();
    const currentDayOfMonth = now.getDate();
    const todayStr = now.toISOString().split('T')[0];

    const reminders = await getReminders(userId);

    return reminders.filter(reminder => {
        // 이미 오늘 트리거된 경우 스킵
        if (reminder.lastTriggered) {
            const lastTriggeredDate = reminder.lastTriggered.split('T')[0];
            if (lastTriggeredDate === todayStr) {
                return false;
            }
        }

        // 시간 체크 (±5분 여유)
        const [remH, remM] = reminder.schedule.time.split(':').map(Number);
        const [curH, curM] = currentTime.split(':').map(Number);
        const remMinutes = remH * 60 + remM;
        const curMinutes = curH * 60 + curM;
        const timeDiff = Math.abs(curMinutes - remMinutes);

        if (timeDiff > 5) return false; // 5분 이상 차이나면 스킵

        // 스케줄 타입별 체크
        switch (reminder.schedule.type) {
            case "daily":
                return true;
            case "weekly":
                return reminder.schedule.dayOfWeek === currentDayOfWeek;
            case "monthly":
                return reminder.schedule.dayOfMonth === currentDayOfMonth;
            case "once":
                return reminder.schedule.date === todayStr;
            default:
                return false;
        }
    });
}

/**
 * 리마인더 트리거 기록 업데이트
 */
export async function markReminderTriggered(reminderId: string) {
    const { error } = await supabase
        .from("pet_reminders")
        .update({ last_triggered: new Date().toISOString() })
        .eq("id", reminderId);

    if (error) {
        console.error("Failed to update reminder:", error);
    }
}

/**
 * 리마인더 삭제
 */
export async function deleteReminder(reminderId: string) {
    const { error } = await supabase
        .from("pet_reminders")
        .delete()
        .eq("id", reminderId);

    if (error) {
        console.error("Failed to delete reminder:", error);
        return false;
    }

    return true;
}

/**
 * 리마인더 활성/비활성 토글
 */
export async function toggleReminder(reminderId: string, enabled: boolean) {
    const { error } = await supabase
        .from("pet_reminders")
        .update({ enabled })
        .eq("id", reminderId);

    if (error) {
        console.error("Failed to toggle reminder:", error);
        return false;
    }

    return true;
}

/**
 * 대화에서 자동으로 리마인더 생성 제안
 */
export async function suggestReminderFromChat(
    message: string,
    petName: string
): Promise<Partial<PetReminder> | null> {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `사용자의 메시지에서 리마인더를 생성할 만한 일정 정보가 있는지 분석하세요.

일정 정보가 있다면 다음 JSON 형식으로 응답:
{
    "type": "walk|meal|medicine|vaccine|grooming|vet|custom",
    "title": "리마인더 제목",
    "description": "상세 설명",
    "schedule": {
        "type": "daily|weekly|monthly|once",
        "time": "HH:MM",
        "dayOfWeek": 0-6 (weekly일 때만, 0=일요일),
        "date": "YYYY-MM-DD" (once일 때만)
    }
}

일정 정보가 없으면 null 반환

리마인더 타입:
- walk: 산책
- meal: 식사/간식
- medicine: 약/영양제
- vaccine: 예방접종
- grooming: 미용/목욕
- vet: 병원/건강검진
- custom: 기타

시간 변환:
- "아침" → "08:00"
- "점심" → "12:00"
- "저녁" → "18:00"
- "밤" → "21:00"

예시:
"매일 저녁 7시에 산책해요" → {"type": "walk", "title": "${petName} 저녁 산책", "schedule": {"type": "daily", "time": "19:00"}}
"다음 주 화요일 병원 가요" → {"type": "vet", "title": "${petName} 병원 방문", "schedule": {"type": "once", "time": "10:00", "date": "다음 화요일 날짜"}}`
                },
                { role: "user", content: message }
            ],
            max_tokens: 250,
            temperature: 0.3,
        });

        const result = response.choices[0]?.message?.content?.trim();
        if (!result || result === "null") return null;

        return JSON.parse(result);
    } catch (error) {
        console.error("Reminder suggestion error:", error);
        return null;
    }
}
