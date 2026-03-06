/**
 * agent/emotion.ts - 감정 분석 시스템
 *
 * 한국어 키워드 사전 기반 빠른 분석 + OpenAI 폴백 하이브리드 방식.
 * 일상 모드(감정 9종)와 추모 모드(애도 5단계) 모두 지원.
 */

import type { EmotionType, GriefStage } from "@/types";
import { getOpenAI } from "./shared";

// ---- 타입 재수출 ----

export type { EmotionType } from "@/types";
export type { GriefStage } from "@/types";

export interface EmotionAnalysis {
    emotion: EmotionType;
    score: number; // 0-1
    context: string;
    griefStage?: GriefStage; // 추모 모드용 애도 단계
}

// ---- 한국어 감정 키워드 사전 (빠른 1차 분석용) ----

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

// ---- 애도 단계 키워드 (추모 모드용) ----

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

// ---- 분석 함수 ----

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

${isMemorialMode ? `추모 모드 - 애도 단계 (Kubler-Ross):
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
    } catch (err) {
        // API 실패 시 키워드 분석 결과 사용
        console.error("[agent] analyzeEmotion AI fallback:", err instanceof Error ? err.message : err);
        return {
            emotion: quickResult.emotion || "neutral",
            score: quickResult.confidence || 0.5,
            context: "키워드 기반 분석 (폴백)",
            griefStage,
        };
    }
}

// ---- 감정/애도 단계 응답 가이드 ----

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
 * Kubler-Ross 모델 기반 섬세한 대응
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
