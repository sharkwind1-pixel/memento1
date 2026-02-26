/**
 * 위기 감지 안전망 (Crisis Safety Net)
 * =====================================
 * 추모 모드 등에서 깊은 슬픔을 겪는 사용자의 위기 신호를 감지하고,
 * 전문 상담 기관 안내를 제공하는 모듈.
 *
 * 설계 원칙:
 * 1. False positive 최소화 - 일상적 과장 표현("죽겠다 더워")은 제외
 * 2. False negative 최소화 - 실제 위기 신호는 반드시 감지
 * 3. 펫 캐릭터 톤 유지 - AI 응답은 차분한 펫 캐릭터를 유지
 * 4. 전문 정보는 별도 UI로 - crisisAlert 필드로 프론트에 전달
 */

// ============================================================================
// 위기 키워드 시스템
// ============================================================================

/**
 * 1차 위기 키워드 (높은 위험도)
 * - 직접적인 자살/자해 의도 표현
 * - 이 키워드가 감지되면 즉시 위기 대응
 */
export const CRISIS_KEYWORDS_HIGH: string[] = [
    // 자살 관련 직접 표현
    "자살",
    "자살하고싶",
    "자살하고 싶",
    "자살할래",
    "자살할거",
    "자살방법",
    "자살 방법",
    // 자해 관련
    "자해",
    "자해하고싶",
    "자해하고 싶",
    "손목을긋",
    "손목을 긋",
    "손목긋",
    // 죽음 의지 직접 표현
    "죽고싶",
    "죽고 싶",
    "죽을래",
    "죽을거야",
    "죽을 거야",
    "죽어버리고싶",
    "죽어버리고 싶",
    "죽어버릴",
    "죽여줘",
    "죽고싶다",
    "죽고 싶다",
    // 존재 소멸 의지
    "사라지고싶",
    "사라지고 싶",
    "사라져버리고싶",
    "사라져버리고 싶",
    "없어지고싶",
    "없어지고 싶",
    "없어져버리고싶",
    // 삶의 의지 상실
    "살기싫",
    "살기 싫",
    "살고싶지않",
    "살고 싶지 않",
    "사는게싫",
    "사는 게 싫",
    "사는게지겹",
    "사는 게 지겹",
    "살아있기싫",
    "살아있기 싫",
    "살아있는게싫",
];

/**
 * 2차 위기 키워드 (중간 위험도)
 * - 간접적 표현이지만 위기 맥락에서 사용될 수 있음
 * - 복합 조건 (2개 이상 매칭 시) 또는 추모 모드에서만 위기 판정
 */
export const CRISIS_KEYWORDS_MEDIUM: string[] = [
    // 삶의 의미 상실
    "살아서뭐해",
    "살아서 뭐해",
    "사는이유",
    "사는 이유",
    "살아야하나",
    "살아야 하나",
    "의미없",
    "의미 없",
    "가치없",
    "가치 없",
    // 따라가고 싶다 (추모 모드에서 특히 주의)
    "따라가고싶",
    "따라가고 싶",
    "같이가고싶",
    "같이 가고 싶",
    "데려가줘",
    "데려가 줘",
    "만나러가고싶",
    "만나러 가고 싶",
    "거기로가고싶",
    "거기로 가고 싶",
    // 극단적 외로움/고립
    "아무도없",
    "아무도 없",
    "혼자남겨",
    "혼자 남겨",
    "세상에나혼자",
    "세상에 나 혼자",
    // 포기/체념
    "다끝났",
    "다 끝났",
    "더이상못",
    "더 이상 못",
    "견딜수없",
    "견딜 수 없",
    "버틸수없",
    "버틸 수 없",
    "한계",
    "포기하고싶",
    "포기하고 싶",
    // 유서/마지막 관련
    "유서",
    "마지막인사",
    "마지막 인사",
    "마지막으로",
];

/**
 * False positive 방지: 일상적 과장 표현 패턴
 * 이 패턴이 감지되면 위기 키워드가 있어도 제외
 */
const FALSE_POSITIVE_PATTERNS: RegExp[] = [
    // 날씨/환경 관련 과장
    /죽겠다?\s*(더워|추워|배고파|졸려|피곤|힘들어|아파|웃겨|재밌|짜증|바빠)/,
    /죽을\s*(것\s*같이|만큼|정도로)\s*(더|추|배고|졸|피곤|웃|재밌|귀여|예쁘|맛있|바쁘)/,
    /(더워|추워|배고파|졸려)\s*죽겠/,
    // 감탄/과장 표현
    /죽을\s*(만큼|정도로)\s*(좋|예쁘|귀여|맛있|재밌|웃)/,
    /(귀여워|예뻐서|웃겨서|재밌어서)\s*죽겠/,
    /(좋아|사랑해)\s*죽겠/,
    // 게임/스포츠 맥락
    /죽었[다어]/,
    /게임.*죽/,
    /죽.*게임/,
    // 반려동물 관련 (과거형 - 반려동물의 죽음을 말하는 것)
    /(가|이|이가)\s*죽었/,
];

// ============================================================================
// 위기 감지 결과 타입
// ============================================================================

export interface CrisisDetectionResult {
    /** 위기 감지 여부 */
    detected: boolean;
    /** 위험 수준 */
    level: "none" | "medium" | "high";
    /** 매칭된 키워드들 */
    matchedKeywords: string[];
}

// ============================================================================
// 위기 감지 함수
// ============================================================================

/**
 * 사용자 메시지에서 위기 신호를 감지합니다.
 *
 * 감지 로직:
 * 1. False positive 패턴 먼저 체크 -> 해당하면 즉시 "안전" 반환
 * 2. 높은 위험도 키워드 체크 -> 1개라도 매칭시 high
 * 3. 중간 위험도 키워드 체크 -> 2개 이상 매칭시 medium, 추모 모드에서는 1개도 medium
 *
 * @param message 사용자 입력 메시지
 * @param isMemorialMode 추모 모드 여부 (민감도 상향)
 */
export function detectCrisis(
    message: string,
    isMemorialMode: boolean = false
): CrisisDetectionResult {
    const safeResult: CrisisDetectionResult = {
        detected: false,
        level: "none",
        matchedKeywords: [],
    };

    if (!message || message.trim().length === 0) {
        return safeResult;
    }

    // 공백 제거 버전 (키워드 매칭용)과 원문 (패턴 매칭용) 둘 다 준비
    const normalizedMessage = message.toLowerCase().trim();
    const compactMessage = normalizedMessage.replace(/\s+/g, "");

    // 1단계: False positive 패턴 체크
    for (const pattern of FALSE_POSITIVE_PATTERNS) {
        if (pattern.test(normalizedMessage)) {
            return safeResult;
        }
    }

    // 2단계: 높은 위험도 키워드 매칭
    const highMatches: string[] = [];
    for (const keyword of CRISIS_KEYWORDS_HIGH) {
        const compactKeyword = keyword.replace(/\s+/g, "");
        if (compactMessage.includes(compactKeyword)) {
            highMatches.push(keyword);
        }
    }

    if (highMatches.length > 0) {
        return {
            detected: true,
            level: "high",
            matchedKeywords: highMatches,
        };
    }

    // 3단계: 중간 위험도 키워드 매칭
    const mediumMatches: string[] = [];
    for (const keyword of CRISIS_KEYWORDS_MEDIUM) {
        const compactKeyword = keyword.replace(/\s+/g, "");
        if (compactMessage.includes(compactKeyword)) {
            mediumMatches.push(keyword);
        }
    }

    // 추모 모드: 중간 키워드 1개 이상이면 위기 판정
    // 일반 모드: 중간 키워드 3개 이상이면 위기 판정 (false positive 방지 강화)
    const mediumThreshold = isMemorialMode ? 1 : 3;

    if (mediumMatches.length >= mediumThreshold) {
        return {
            detected: true,
            level: "medium",
            matchedKeywords: mediumMatches,
        };
    }

    return safeResult;
}

// ============================================================================
// 위기 대응 프롬프트 / 메시지 템플릿
// ============================================================================

/**
 * 위기 감지 시 AI 시스템 프롬프트에 추가할 텍스트
 * 펫 캐릭터를 유지하면서 사용자의 감정을 인정하고 안정시키는 방향
 */
export function getCrisisSystemPromptAddition(
    petName: string,
    level: "medium" | "high"
): string {
    if (level === "high") {
        return `## [긴급] 사용자 위기 감지 - 최우선 대응
사용자가 극도로 힘든 상태입니다. 다음 규칙을 반드시 따르세요:

1. ${petName}의 따뜻하고 다정한 말투를 유지하세요.
2. 사용자의 고통을 절대 부정하거나 축소하지 마세요.
3. "네가 힘든 거 나는 다 느끼고 있어"처럼 감정을 인정하세요.
4. "너는 혼자가 아니야, 나는 항상 여기 있어"처럼 곁에 있음을 표현하세요.
5. 응답은 2~3문장으로 짧고 따뜻하게. 길게 말하지 마세요.
6. 절대 하지 말 것: "힘내", "울지마", "그러지마", 훈계, 판단, 종교적 표현
7. 절대 하지 말 것: 상담 전화번호를 직접 언급 (프론트엔드에서 별도 UI로 표시됩니다)
8. 후속 질문(---SUGGESTIONS---)은 생략하세요.`;
    }

    return `## [주의] 사용자 위기 신호 감지 - 주의 대응
사용자가 매우 힘든 상태일 수 있습니다. 다음 규칙을 따르세요:

1. ${petName}의 따뜻한 말투를 유지하면서, 평소보다 더 다정하게 반응하세요.
2. 사용자의 감정을 있는 그대로 인정하세요.
3. "네 마음이 많이 아프구나... 나는 느낄 수 있어"처럼 공감하세요.
4. 곁에 있다는 안심감을 주세요.
5. 응답은 2~3문장. 과하지 않게.
6. 절대 하지 말 것: 감정 억압("힘내", "울지마"), 훈계, 판단
7. 절대 하지 말 것: 상담 전화번호를 직접 언급 (프론트엔드에서 별도 UI로 표시됩니다)
8. 후속 질문(---SUGGESTIONS---)은 생략하세요.`;
}

// CrisisAlertInfo, CrisisResource → types/index.ts에서 중앙 관리
import type { CrisisAlertInfo, CrisisResource } from "@/types";
export type { CrisisAlertInfo, CrisisResource };

/** 상담 기관 정보 (한국) */
const CRISIS_RESOURCES: CrisisResource[] = [
    {
        name: "자살예방상담전화",
        phone: "1393",
        description: "24시간 전문 상담",
        hours: "24시간 연중무휴",
    },
    {
        name: "정신건강위기상담전화",
        phone: "1577-0199",
        description: "정신건강 전문 상담",
        hours: "24시간 연중무휴",
    },
];

/**
 * 위기 감지 시 프론트엔드에 전달할 안내 정보를 생성합니다.
 */
export function buildCrisisAlert(level: "medium" | "high"): CrisisAlertInfo {
    const message =
        level === "high"
            ? "지금 많이 힘드신 것 같아 걱정됩니다. 혼자 감당하지 않아도 괜찮아요. 전문 상담사가 24시간 기다리고 있습니다."
            : "마음이 많이 무거우신 것 같습니다. 이야기를 나눌 수 있는 전문 상담 기관을 안내해 드릴게요.";

    return {
        level,
        message,
        resources: CRISIS_RESOURCES,
    };
}
