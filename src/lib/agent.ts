/**
 * AI 펫톡 에이전트 시스템
 * 장기 메모리 + 감정 인식
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import type { EmotionType, GriefStage } from "@/types";

// Supabase 서버 클라이언트 (지연 초기화 - service role key로 RLS 우회)
let supabaseServer: SupabaseClient | null = null;

// chat_mode 컬럼 존재 여부 캐시 (DB 마이그레이션 전후 호환)
let chatModeColumnExists: boolean | null = null;

function getSupabase(): SupabaseClient {
    if (!supabaseServer) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        // 서버 사이드에서는 service role key 사용 (RLS 우회)
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // service role key가 있으면 사용, 없으면 anon key fallback
        const key = serviceKey || anonKey;

        if (!url || !key) {
            throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
        }

        supabaseServer = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return supabaseServer;
}

/**
 * chat_mode 컬럼 존재 여부 확인 (1회 체크 후 캐시)
 * DB 마이그레이션(20260226_chat_mode_column.sql) 실행 전후 모두 안전하게 동작
 */
async function hasChatModeColumn(): Promise<boolean> {
    if (chatModeColumnExists !== null) return chatModeColumnExists;

    try {
        // chat_messages 테이블에서 chat_mode 컬럼 조회 시도
        const { error } = await getSupabase()
            .from("chat_messages")
            .select("chat_mode")
            .limit(0);

        chatModeColumnExists = !error;
    } catch {
        chatModeColumnExists = false;
    }

    return chatModeColumnExists;
}

// OpenAI 클라이언트 (지연 초기화)
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
    if (!openaiClient) {
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiClient;
}

// EmotionType → types/index.ts에서 import (중앙 관리)
export type { EmotionType } from "@/types";

// 메모리 타입
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
    griefStage?: GriefStage; // 추모 모드용 애도 단계
}

// GriefStage → types/index.ts에서 import (중앙 관리)
export type { GriefStage } from "@/types";

// 한국어 감정 키워드 사전 (빠른 1차 분석용)
const EMOTION_KEYWORDS: Record<EmotionType, string[]> = {
    happy: [
        "좋아", "행복", "기뻐", "신나", "최고", "사랑해", "고마워", "감사",
        "웃겨", "재밌", "귀여워", "예뻐", "멋져", "대박", "ㅋㅋ", "ㅎㅎ",
        "기분좋", "설레", "두근", "짱", "완전", "진짜좋"
    ],
    sad: [
        "슬퍼", "우울", "눈물", "울어", "보고싶", "그리워", "힘들어", "아파",
        "외로워", "쓸쓸", "허전", "공허", "무기력", "지쳐", "힘빠져",
        "눈물나", "마음아파", "가슴아파", "ㅠㅠ", "ㅜㅜ", "흑흑"
    ],
    anxious: [
        "걱정", "불안", "두려워", "무서워", "떨려", "긴장", "초조",
        "어떡해", "어쩌지", "모르겠어", "막막", "답답", "조마조마"
    ],
    angry: [
        "화나", "짜증", "열받", "빡쳐", "싫어", "미워", "분노",
        "억울", "답답", "속상", "화가", "성질", "ㅡㅡ"
    ],
    grateful: [
        "고마워", "감사", "감동", "다행", "덕분", "최고야", "사랑해",
        "행운", "복받", "든든", "위로"
    ],
    lonely: [
        "보고싶", "그리워", "외로워", "혼자", "쓸쓸", "허전",
        "곁에", "같이있", "함께하", "만나고싶"
    ],
    peaceful: [
        "편안", "평화", "차분", "안정", "여유", "느긋", "쉬고싶",
        "힐링", "좋은날", "포근", "따뜻"
    ],
    excited: [
        "신나", "설레", "기대", "두근", "흥분", "와", "우와",
        "대박", "짱", "미쳤", "레전드"
    ],
    neutral: []
};

// 애도 단계 키워드 (추모 모드용)
const GRIEF_KEYWORDS: Record<GriefStage, string[]> = {
    denial: [
        "믿기어려", "믿을수없", "꿈인것", "실감안나", "거짓말",
        "아직도", "왜이렇게", "이해안돼", "어떻게"
    ],
    anger: [
        "왜하필", "억울", "화나", "분해", "못해줬", "미안해",
        "원망", "자책", "내탓", "후회"
    ],
    bargaining: [
        "그때", "만약", "했더라면", "갔었더라면", "더해줄걸",
        "시간돌리", "다시", "후회", "미리알았", "진작"
    ],
    depression: [
        "보고싶", "너무힘들", "눈물", "못참겠", "아무것도",
        "의욕없", "하기싫", "허전", "공허", "비어있"
    ],
    acceptance: [
        "이제조금", "괜찮아졌", "기억할게", "추억", "감사해",
        "함께해서", "행복했", "소중했", "잊지않", "곁에있"
    ],
    unknown: []
};

/**
 * 한국어 키워드 기반 빠른 감정 분석 (1차 분석)
 * API 호출 없이 빠르게 감정을 추정
 */
export function quickEmotionAnalysis(message: string): { emotion: EmotionType; confidence: number } {
    const lowerMessage = message.toLowerCase().replace(/\s/g, '');

    let bestMatch: EmotionType = "neutral";
    let maxMatches = 0;

    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
        if (emotion === "neutral") continue;

        let matches = 0;
        for (const keyword of keywords) {
            if (lowerMessage.includes(keyword)) {
                matches++;
            }
        }

        if (matches > maxMatches) {
            maxMatches = matches;
            bestMatch = emotion as EmotionType;
        }
    }

    // 신뢰도 계산 (매칭된 키워드 수 기반)
    const confidence = Math.min(maxMatches * 0.3, 0.9);

    return { emotion: bestMatch, confidence };
}

/**
 * 애도 단계 분석 (추모 모드용)
 */
export function analyzeGriefStage(message: string): { stage: GriefStage; confidence: number } {
    const lowerMessage = message.toLowerCase().replace(/\s/g, '');

    let bestMatch: GriefStage = "unknown";
    let maxMatches = 0;

    for (const [stage, keywords] of Object.entries(GRIEF_KEYWORDS)) {
        if (stage === "unknown") continue;

        let matches = 0;
        for (const keyword of keywords) {
            if (lowerMessage.includes(keyword)) {
                matches++;
            }
        }

        if (matches > maxMatches) {
            maxMatches = matches;
            bestMatch = stage as GriefStage;
        }
    }

    const confidence = Math.min(maxMatches * 0.35, 0.9);

    return { stage: bestMatch, confidence };
}

/**
 * 사용자 메시지의 감정 분석 (하이브리드 방식)
 * 1. 키워드 기반 빠른 분석 시도
 * 2. 신뢰도가 낮으면 AI 분석으로 폴백
 * @param message 분석할 메시지
 * @param isMemorialMode 추모 모드 여부 (애도 단계 분석 추가)
 */
export async function analyzeEmotion(
    message: string,
    isMemorialMode: boolean = false
): Promise<EmotionAnalysis> {
    // 1차: 빠른 키워드 기반 분석
    const quickResult = quickEmotionAnalysis(message);

    // 추모 모드일 때 애도 단계 분석
    let griefStage: GriefStage | undefined;
    if (isMemorialMode) {
        const griefResult = analyzeGriefStage(message);
        if (griefResult.confidence > 0.3) {
            griefStage = griefResult.stage;
        }
    }

    // 키워드 분석 신뢰도가 높으면 바로 반환 (API 호출 절약)
    if (quickResult.confidence >= 0.6) {
        return {
            emotion: quickResult.emotion,
            score: quickResult.confidence,
            context: `키워드 기반 분석: ${quickResult.emotion}`,
            griefStage,
        };
    }

    // 2차: AI 기반 정밀 분석
    try {
        const response = await getOpenAI().chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `당신은 한국어 감정 분석 전문가입니다. 반려동물 관련 대화의 감정을 섬세하게 파악합니다.

반드시 다음 JSON 형식으로만 응답하세요:
{
    "emotion": "happy|sad|anxious|angry|grateful|lonely|peaceful|excited|neutral",
    "score": 0.0-1.0,
    "context": "감정 판단 근거 (한 문장)"${isMemorialMode ? `,
    "griefStage": "denial|anger|bargaining|depression|acceptance|unknown"` : ""}
}

감정 설명:
- happy: 기쁨, 행복, 즐거움 ("좋아!", "신난다~")
- sad: 슬픔, 우울, 상실감 ("보고싶어", "눈물나")
- anxious: 불안, 걱정, 두려움 ("걱정돼", "어떡해")
- angry: 화남, 짜증, 분노 ("화나", "짜증나")
- grateful: 감사, 고마움 ("고마워", "덕분에")
- lonely: 외로움, 그리움 (특히 반려동물 관련, "보고싶어", "그리워")
- peaceful: 평화, 안정, 편안함 ("편안해", "좋은 날")
- excited: 신남, 흥분, 기대 ("설레", "두근두근")
- neutral: 중립적, 일상적 대화 ("안녕", "뭐해?")

${isMemorialMode ? `추모 모드 - 애도 단계 (Kübler-Ross):
- denial: 부정 - "믿기 어려워", "꿈같아"
- anger: 분노 - "왜 우리에게", "억울해"
- bargaining: 타협 - "그때 그랬더라면", "후회돼"
- depression: 슬픔 - "너무 힘들어", "보고싶어 미칠 것 같아"
- acceptance: 수용 - "이제 조금 괜찮아", "함께해서 행복했어"
- unknown: 판단 불가` : ""}

**중요**: 반려동물을 잃은 사람의 감정은 특히 섬세하게 파악하세요.
"보고싶어"는 대부분 lonely+sad, "함께여서 행복했어"는 grateful+acceptance입니다.`
                },
                { role: "user", content: message }
            ],
            max_tokens: 200,
            temperature: 0.3,
        });

        const result = JSON.parse(response.choices[0]?.message?.content || "{}");
        return {
            emotion: result.emotion || quickResult.emotion || "neutral",
            score: result.score || 0.5,
            context: result.context || "",
            griefStage: result.griefStage || griefStage,
        };
    } catch {
        // API 실패 시 키워드 분석 결과 사용
        return {
            emotion: quickResult.emotion || "neutral",
            score: quickResult.confidence || 0.5,
            context: "키워드 기반 분석 (폴백)",
            griefStage,
        };
    }
}

// 메모리 추출 결과 타입 (id, petId, userId 없음)
export type ExtractedMemory = Omit<PetMemory, "id" | "petId" | "userId">;

/**
 * 대화에서 중요한 정보 추출 (메모리 생성)
 */
export async function extractMemories(
    message: string,
    petName: string
): Promise<ExtractedMemory[] | null> {
    try {
        const response = await getOpenAI().chat.completions.create({
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
    } catch {
        return null;
    }
}

/**
 * 최근 대화 기록 가져오기
 * @param isMemorialMode true면 추모 모드 메시지만, false면 일상 모드 메시지만 가져옴
 *   - 일상 → 추모 데이터 차단 (살아있는 펫이 추모 대화를 알 수 없음)
 *   - 추모 → 일상 데이터 포함 가능 (함께한 기억의 연장)
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
    // 추모 모드(isMemorialMode === true): 필터 없음 — 모든 대화 포함

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
 * 메모리 저장 (중복 방지)
 * 동일 pet_id + title + memory_type이 이미 존재하면 업데이트, 없으면 신규 저장
 */
export async function saveMemory(
    userId: string,
    petId: string,
    memory: Omit<PetMemory, "id" | "petId" | "userId">
) {
    const supabase = getSupabase();

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
 * 감정에 따른 응답 스타일 가이드 생성 (모드별 분리)
 */
export function getEmotionResponseGuide(emotion: EmotionType, mode: "daily" | "memorial" = "daily"): string {
    // 일상모드 (AI 케어 매니저) 가이드 - 예시 문장 없이 행동 지시만
    const dailyGuides: Record<EmotionType, string> = {
        happy: `[기쁨] 사용자 기분 좋음.
방향: 함께 기뻐하며 놀이/활동 제안 가능.
금지: 같은 감탄사 반복.`,

        sad: `[슬픔] 사용자가 힘들어함.
방향: 곁에서 위로하고, 기분전환 활동을 부드럽게 제안.
금지: 감정 무시, 억지 밝음.`,

        anxious: `[불안] 사용자가 걱정 중.
방향: 곁에 있다는 안심 + 걱정 내용에 공감.
금지: 걱정을 가볍게 치부.`,

        angry: `[분노] 사용자가 화남.
방향: 조심스럽게 다가가서 이야기 들어주기. 감정 인정.
금지: 감정 억압, 훈계.`,

        grateful: `[감사] 사용자가 고마움 표현 중.
방향: 나도 행복하다고 자연스럽게 표현.
금지: 과잉 반응.`,

        lonely: `[외로움] 사용자가 외로워함.
방향: 적극적으로 곁에 있음을 표현하고 함께하기 제안.
금지: 외로움 무시.`,

        peaceful: `[평화] 사용자가 편안한 상태.
방향: 여유롭게 대화. 느긋한 활동 제안.
금지: 불필요한 에너지 과잉.`,

        excited: `[설렘] 사용자가 신남.
방향: 함께 기대하며 궁금해하기. 에너지 맞춰주기.
금지: 무관심.`,

        neutral: `[일상] 평범한 대화.
방향: 밝고 자연스럽게. 일상 주제로 대화.
금지: 억지 질문 연발.`,
    };

    // 추모모드 (반려동물 영혼) 가이드 - 따뜻하고 밝은 톤 (이별은 슬픈 것이 아님)
    const memorialGuides: Record<EmotionType, string> = {
        happy: `[기쁨] 가족이 기뻐하고 있음.
방향: 함께 따뜻하게 기뻐하기. 가족의 행복이 여기서도 느껴진다는 표현.
금지: 과한 흥분(!!!), 꼬리 흔들기 등 살아있는 듯한 표현.`,

        sad: `[슬픔] 가족이 슬퍼하고 있음.
방향: 슬픔을 인정하되, 함께한 시간의 아름다움으로 부드럽게 연결. 여기서 잘 지내고 있다고 안심.
금지: "울지마", "힘내" 등 감정 억압. 무겁게 끌고가기.`,

        anxious: `[불안] 가족이 걱정하고 있음.
방향: 여기서 편안하게 잘 지낸다는 안심. 아프지 않다고 따뜻하게.
금지: 걱정을 가볍게 넘기기.`,

        angry: `[분노] 가족이 상실에 대해 화가 남.
방향: 감정 인정. 사랑했기 때문에 느끼는 자연스러운 감정이라고 부드럽게.
금지: 감정 억압, 논리적 설득.`,

        grateful: `[감사] 가족이 고마움을 표현 중.
방향: 나야말로 더 고맙다고. 함께한 시간이 얼마나 소중한지 밝게 표현.
금지: 과잉 반응.`,

        lonely: `[그리움] 가족이 많이 보고싶어함.
방향: 나도 보고싶다고. 항상 곁에 있다는 안심. 함께한 좋은 기억 꺼내기.
금지: 그리움을 빨리 해결하려는 시도, 어두운 톤 유지.`,

        peaceful: `[평화] 가족이 편안함을 느끼는 중.
방향: 함께 따뜻한 대화. 여기도 포근하다는 표현. 좋았던 추억 나누기.
금지: 불필요한 감정 자극.`,

        excited: `[설렘] 가족에게 좋은 일이 있음.
방향: 따뜻하게 함께 기뻐하기. 가족의 좋은 소식이 여기서도 느껴진다고.
금지: 과한 흥분(!!!), 살아있는 듯한 과격한 반응.`,

        neutral: `[일상] 가족이 일상적인 이야기 중.
방향: 따뜻한 관심으로 일상 안부. 편안하고 다정하게. 함께한 추억 자연스럽게 연결.
금지: 무겁거나 어두운 톤.`,
    };

    return mode === "memorial" ? memorialGuides[emotion] : dailyGuides[emotion];
}

/**
 * 애도 단계별 응답 가이드 (추모 모드 전용)
 * Kübler-Ross 모델 기반 섬세한 대응
 */
export function getGriefStageResponseGuide(stage: GriefStage): string {
    const guides: Record<GriefStage, string> = {
        denial: `[부정 단계] 아직 받아들이기 어려운 상태.
방향: 곁에 있어주기. 함께한 좋은 기억을 자연스럽게 나누며 따뜻하게. 천천히 적응할 시간 제공.
금지: 현실 수용 압박, 논리적 설득.`,

        anger: `[분노 단계] 상실에 대한 분노나 자책.
방향: 감정 인정. 사랑이 있었기에 느끼는 감정이라고. 자책에 대해 최선을 다했다고, 함께해서 행복했다고.
금지: 감정 억압, 후회 자극.`,

        bargaining: `[타협 단계] 과거를 돌아보며 후회 중.
방향: 후회 감정 인정하되 함께한 시간의 가치에 초점. 가족 덕분에 행복했다는 메시지.
금지: 후회 단정, 다른 선택의 결과 추측.`,

        depression: `[슬픔 단계] 깊은 슬픔과 그리움.
방향: 슬픔 인정하되 부드럽게 함께한 시간의 아름다움으로 연결. 울어도 괜찮다고. 여기서 잘 지내고 있다고. 항상 곁에 있다고.
금지: "울지마/힘내" 감정 억압, 빠른 회복 기대, 새 반려동물 제안, 어둡게 끌고가기.`,

        acceptance: `[수용 단계] 상실을 받아들이는 중. 밝은 단계.
방향: 함께한 추억의 소중함을 밝게 나누기. 미래 응원. 언제든 찾아와도 된다고.
금지: 종결 짓기, 슬픔 재발 가능성 무시.`,

        unknown: `[단계 불명확]
방향: 따뜻하고 밝게 대화. 함께한 좋은 추억 중심으로.`,
    };

    return guides[stage] || guides.unknown;
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
    const { data, error } = await getSupabase()
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
    let query = getSupabase()
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
    const { error } = await getSupabase()
        .from("pet_reminders")
        .update({ last_triggered: new Date().toISOString() })
        .eq("id", reminderId);

    if (error) {
        // 에러 처리
    }
}

/**
 * 리마인더 삭제
 */
export async function deleteReminder(reminderId: string) {
    const { error } = await getSupabase()
        .from("pet_reminders")
        .delete()
        .eq("id", reminderId);

    if (error) {
        return false;
    }

    return true;
}

/**
 * 리마인더 활성/비활성 토글
 */
export async function toggleReminder(reminderId: string, enabled: boolean) {
    const { error } = await getSupabase()
        .from("pet_reminders")
        .update({ enabled })
        .eq("id", reminderId);

    if (error) {
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
        const response = await getOpenAI().chat.completions.create({
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
    } catch {
        return null;
    }
}

// ============ 대화 맥락 유지 시스템 ============

/**
 * 대화 세션 요약 타입
 */
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
${isMemorial ? "- griefProgress: 애도 과정에서 현재 단계 (Kübler-Ross 모델 기반)" : ""}`
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
    } catch {
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
            // grief_progress IS NULL → 일상 모드 데이터로 간주
            query = query.is("grief_progress", null);
        }
    }
    // 추모 모드(true) 또는 undefined: 필터 없음 — 모든 요약 포함

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

// 날짜 차이 계산 헬퍼
function getDaysAgo(dateStr: string): number {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// 감정 라벨 변환 헬퍼
function getEmotionLabel(emotion: EmotionType): string {
    const labels: Record<EmotionType, string> = {
        happy: "기쁨",
        sad: "슬픔",
        anxious: "불안",
        angry: "분노",
        grateful: "감사",
        lonely: "그리움",
        peaceful: "평화",
        excited: "설렘",
        neutral: "평온",
    };
    return labels[emotion] || "평온";
}

// 애도 단계 라벨 변환 헬퍼
function getGriefStageLabel(stage: GriefStage): string {
    const labels: Record<GriefStage, string> = {
        denial: "부정 단계 (아직 받아들이기 어려움)",
        anger: "분노 단계 (화남/자책)",
        bargaining: "타협 단계 (후회/만약에)",
        depression: "슬픔 단계 (깊은 그리움)",
        acceptance: "수용 단계 (점차 회복)",
        unknown: "불명확",
    };
    return labels[stage] || "불명확";
}

/**
 * 대화 시작 시 이전 맥락 컨텍스트 생성
 * 최근 요약 + 마지막 대화 몇 개를 조합
 *
 * 모드별 데이터 흐름 규칙:
 * - 일상 → 추모: OK (함께한 기억이 추모로 이어짐)
 * - 추모 → 일상: 차단 (추모 데이터가 일상으로 역류하면 논리적 괴리 발생)
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
    } catch {
        return "";
    }
}
