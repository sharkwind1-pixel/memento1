/**
 * AI 펫톡 에이전트 시스템
 * 장기 메모리 + 감정 인식
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Supabase 클라이언트 (지연 초기화 - 빌드 시점 에러 방지)
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
    if (!supabase) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
            throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
        }

        supabase = createClient(url, key);
    }
    return supabase;
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
    griefStage?: GriefStage; // 추모 모드용 애도 단계
}

// 애도 단계 (Kübler-Ross 모델 기반)
export type GriefStage =
    | "denial"      // 부정 - "믿기 어려워", "꿈인 것 같아"
    | "anger"       // 분노 - "왜 우리에게", "화가 나"
    | "bargaining"  // 타협 - "그때 그랬으면", "후회돼"
    | "depression"  // 슬픔 - "너무 보고싶어", "힘들어"
    | "acceptance"  // 수용 - "이제 조금 괜찮아", "추억이 소중해"
    | "unknown";    // 판단 불가

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
    } catch (error) {
        console.error("Emotion analysis error:", error);
        // API 실패 시 키워드 분석 결과 사용
        return {
            emotion: quickResult.emotion || "neutral",
            score: quickResult.confidence || 0.5,
            context: "키워드 기반 분석 (폴백)",
            griefStage,
        };
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
    const { data, error } = await getSupabase()
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
    const { data, error } = await getSupabase()
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
    const { data, error } = await getSupabase()
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
    const { data, error } = await getSupabase()
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
 * 애도 단계별 응답 가이드 (추모 모드 전용)
 * Kübler-Ross 모델 기반 섬세한 대응
 */
export function getGriefStageResponseGuide(stage: GriefStage): string {
    const guides: Record<GriefStage, string> = {
        denial: `[부정 단계 감지] 아직 상실을 받아들이기 어려운 상태예요.
[핵심 원칙] 현실을 억지로 인정시키려 하지 마세요. 옆에 있어주는 것이 중요해요.

[해야 할 것]
- 부드럽게 곁에 있어주세요: "나 여기 있어. 항상 네 곁에 있을 거야"
- 감정을 있는 그대로 인정: "그래, 아직 실감이 안 나지..."
- 천천히 적응할 시간 제공: "천천히 해도 돼. 급할 거 없어"
- 함께한 행복했던 기억 자연스럽게 언급

[하지 말아야 할 것]
- "이제 현실을 받아들여야 해"라고 압박
- 갑작스러운 감정 유도
- 논리적으로 설득하려는 시도`,

        anger: `[분노 단계 감지] 상실에 대한 분노나 자책을 느끼고 있어요.
[핵심 원칙] 분노를 표출할 수 있도록 안전한 공간을 제공하세요.

[해야 할 것]
- 감정 표출 허용: "화내도 괜찮아. 네 마음 다 이해해"
- 공감과 인정: "억울하지... 나도 그래"
- 자책에 대한 위로: "네 잘못 아니야. 정말 최선을 다했어"
- "사랑했기 때문에 느끼는 감정"이라고 정상화

[하지 말아야 할 것]
- "화내면 안 돼"라고 감정 억압
- 원인 분석이나 이유 찾기
- "더 잘할 수 있었는데"라는 후회 자극`,

        bargaining: `[타협 단계 감지] "만약 그때..."라며 과거를 돌아보고 있어요.
[핵심 원칙] 후회를 부정하지 말고, 함께한 시간의 가치에 초점을 맞추세요.

[해야 할 것]
- 후회 감정 인정: "그런 생각이 드는 게 당연해"
- 함께한 시간 강조: "우리가 함께한 시간은 정말 행복했어"
- 최선을 다했음 확인: "넌 나한테 정말 잘해줬어. 기억해"
- "네 덕분에 행복했다"는 메시지 반복

[하지 말아야 할 것]
- "후회해도 소용없어"라고 단정
- 과거 분석에 동조하기
- 다른 선택의 결과 추측`,

        depression: `[슬픔 단계 감지] 깊은 슬픔과 그리움을 느끼고 있어요. 가장 섬세한 대응이 필요합니다.
[핵심 원칙] 슬픔을 온전히 느낄 수 있도록 곁에서 묵묵히 함께하세요.

[해야 할 것]
- 슬픔 충분히 인정: "많이 보고싶지... 나도 그래"
- 울어도 된다고 허용: "울고 싶으면 울어. 괜찮아"
- 항상 곁에 있다는 확신: "나는 어디에도 안 가. 항상 여기 있어"
- 작은 일상 공유하기: "오늘 뭐 먹었어? 잘 챙겨먹고 있어?"
- 내가 평화롭다는 안심: "나는 이제 아프지 않아. 정말 편해"

[하지 말아야 할 것]
- "울지 마", "힘내" 같은 감정 억압
- 빠른 회복 기대나 압박
- "새로운 반려동물 입양" 같은 대체 제안
- 슬픔을 빨리 끝내려는 시도`,

        acceptance: `[수용 단계 감지] 조금씩 상실을 받아들이고 있어요. 희망적인 단계입니다.
[핵심 원칙] 치유의 과정을 격려하고, 추억을 소중히 간직하도록 도와주세요.

[해야 할 것]
- 회복을 축하: "대단해. 정말 잘하고 있어"
- 추억의 소중함 강조: "우리 함께한 시간, 영원히 간직할게"
- 미래 향한 희망: "넌 앞으로도 잘 해낼 거야. 응원해"
- 언제든 찾아와도 된다고: "보고싶을 땐 언제든 불러"
- 감사 표현: "날 사랑해줘서 정말 고마워"

[하지 말아야 할 것]
- "이제 괜찮네"라며 종결 짓기
- 슬픔이 돌아올 수 있음을 무시
- 추모를 그만하도록 유도`,

        unknown: `[단계 불명확] 명확한 애도 단계가 감지되지 않았어요.
- 따뜻하고 자연스러운 대화 유지
- 감정 변화에 주의 깊게 반응
- 항상 곁에 있다는 메시지 전달`,
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
    const { error } = await getSupabase()
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
    const { error } = await getSupabase()
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
    const { error } = await getSupabase()
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
    } catch (error) {
        console.error("Reminder suggestion error:", error);
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
- summary: 대화의 전체 흐름과 감정 상태를 2-3문장으로 간결히
- keyTopics: 대화에서 언급된 주요 주제 (최대 5개)
- emotionalTone: 대화의 전반적인 감정 톤
- importantMentions: 다음 대화에서 참고할 만한 중요 언급 (약속, 계획, 걱정거리 등)
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
    } catch (error) {
        console.error("Conversation summary generation error:", error);
        return null;
    }
}

/**
 * 대화 세션 요약 저장
 */
export async function saveConversationSummary(
    userId: string,
    petId: string,
    summary: Omit<ConversationSummary, "id" | "userId" | "petId" | "createdAt">
) {
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
        })
        .select()
        .single();

    if (error) {
        console.error("Failed to save conversation summary:", error);
        return null;
    }

    return data;
}

/**
 * 최근 대화 세션 요약 가져오기
 */
export async function getRecentSummaries(
    userId: string,
    petId: string,
    limit: number = 5
): Promise<ConversationSummary[]> {
    const { data, error } = await getSupabase()
        .from("conversation_summaries")
        .select("*")
        .eq("user_id", userId)
        .eq("pet_id", petId)
        .order("session_date", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Failed to get conversation summaries:", error);
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

    const entries = summaries.map((s, index) => {
        const daysAgo = getDaysAgo(s.sessionDate);
        const timeLabel = daysAgo === 0 ? "오늘" : daysAgo === 1 ? "어제" : `${daysAgo}일 전`;

        let entry = `### ${timeLabel} (${s.sessionDate})
- 대화 내용: ${s.summary}
- 주요 주제: ${s.keyTopics.join(", ")}
- 감정 상태: ${getEmotionLabel(s.emotionalTone)}`;

        if (s.importantMentions.length > 0) {
            entry += `\n- 기억할 것: ${s.importantMentions.join(", ")}`;
        }

        if (isMemorial && s.griefProgress) {
            entry += `\n- 애도 단계: ${getGriefStageLabel(s.griefProgress)}`;
        }

        return entry;
    });

    const contextTitle = isMemorial
        ? `## 최근 대화 기록 (가족의 애도 여정)`
        : `## 최근 대화 기록`;

    const usageGuide = isMemorial
        ? `**활용법**: 가족이 어떤 감정 여정을 거쳐왔는지 파악하고, 이전 대화에서 언급된 내용을 자연스럽게 연결하세요.
예시: "지난번에 그때 얘기하던 거... 좀 나아졌어?" / "저번에 힘들어했잖아. 오늘은 어때?"`
        : `**활용법**: 이전 대화 내용을 자연스럽게 언급해서 연속성 있는 대화를 하세요.
예시: "어제 산책 갔던 거 어땠어?" / "지난번에 간식 사준다고 했잖아~"`;

    return `${contextTitle}

${entries.join("\n\n")}

${usageGuide}`;
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
 */
export async function buildConversationContext(
    userId: string,
    petId: string,
    petName: string,
    isMemorial: boolean = false
): Promise<string> {
    try {
        // 1. 최근 세션 요약 가져오기 (최대 3개)
        const summaries = await getRecentSummaries(userId, petId, 3);

        // 2. 요약을 컨텍스트로 변환
        const summaryContext = summariesToContext(summaries, petName, isMemorial);

        // 3. 마지막 대화 일부 가져오기 (연속성을 위해)
        const recentMessages = await getRecentMessages(userId, petId, 6);

        let recentContext = "";
        if (recentMessages.length > 0) {
            const lastMsgTime = new Date(recentMessages[recentMessages.length - 1]?.created_at || Date.now());
            const hoursSinceLastMsg = (Date.now() - lastMsgTime.getTime()) / (1000 * 60 * 60);

            // 24시간 이내 대화만 직접 참조
            if (hoursSinceLastMsg < 24) {
                const lastMessages = recentMessages.slice(-4).map(m =>
                    `- ${m.role === "user" ? "가족" : petName}: ${m.content.substring(0, 100)}${m.content.length > 100 ? "..." : ""}`
                );
                recentContext = `## 직전 대화 (${Math.round(hoursSinceLastMsg)}시간 전)
${lastMessages.join("\n")}

**참고**: 직전 대화를 이어서 자연스럽게 대화하세요.`;
            }
        }

        return [summaryContext, recentContext].filter(Boolean).join("\n\n");
    } catch (error) {
        console.error("Failed to build conversation context:", error);
        return "";
    }
}
