/**
 * minimiReactions.ts
 *
 * 미니미 터치 시 반응 데이터 — 대사 풀 + 액션 풀.
 * 모드별(일상/추모) × 종별 × 연속 터치 수준별로 다채롭게.
 *
 * 철학 (MEMORY.md core_philosophy.md):
 * - 일상 모드: My Little Puppy 감성 — 밝고, 응석, 장난기
 * - 추모 모드: "슬픔이 아니라 다시 만날 약속"
 *   - 재회의 반가움 ("또 왔어?", "기다렸어!")
 *   - 유저를 향한 응원 ("울지마~", "행복하게 살아")
 *   - 다시 만날 약속 ("언젠가 또 만나자", "여기서 기다릴게")
 *   - 슬픔·과거 회상 금지. 현재형·희망형만.
 */

export type MinimiAction =
    | "heart"     // 하트 파티클 (기존)
    | "star"      // 별 파티클 (기존)
    | "sparkle"   // 반짝이 파티클 — 추모 모드 주요
    | "jump"      // 위로 점프
    | "spin"      // 360도 회전
    | "wiggle"    // 좌우 흔들기
    | "bounce";   // 가볍게 통통

export interface MinimiReaction {
    message: string;
    action: MinimiAction;
}

/** 터치 레벨: 연속 터치 수에 따라 달라지는 반응 톤 */
export type TouchLevel = "greeting" | "playful" | "ticklish";

/** 연속 터치 수 → 레벨 매핑 */
export function getTouchLevel(consecutiveCount: number): TouchLevel {
    if (consecutiveCount <= 3) return "greeting";
    if (consecutiveCount <= 6) return "playful";
    return "ticklish";
}

// ============================================================================
// 일상 모드 (daily) — 종별
// ============================================================================

type ModeReactions = Record<TouchLevel, MinimiReaction[]>;

const DAILY_MALTIPOO: ModeReactions = {
    greeting: [
        { message: "깡총!", action: "jump" },
        { message: "꼬리 살랑~", action: "wiggle" },
        { message: "안아줘!", action: "heart" },
        { message: "헤헤~", action: "bounce" },
    ],
    playful: [
        { message: "또 만져?", action: "spin" },
        { message: "간지러워!", action: "wiggle" },
        { message: "헤벌쭉~", action: "bounce" },
        { message: "좋아좋아!", action: "heart" },
    ],
    ticklish: [
        { message: "이제 그만~!", action: "wiggle" },
        { message: "너무 간지러워!!", action: "spin" },
        { message: "살살~", action: "bounce" },
    ],
};

const DAILY_YORKSHIRE: ModeReactions = {
    greeting: [
        { message: "멍!", action: "jump" },
        { message: "나 용감해!", action: "bounce" },
        { message: "놀자놀자!", action: "wiggle" },
        { message: "쓰담해줘~", action: "heart" },
    ],
    playful: [
        { message: "힘세다!", action: "spin" },
        { message: "같이 뛰자!", action: "jump" },
        { message: "멍멍!", action: "bounce" },
        { message: "최고야!", action: "star" },
    ],
    ticklish: [
        { message: "그만!", action: "wiggle" },
        { message: "꺅!", action: "spin" },
        { message: "항복!", action: "bounce" },
    ],
};

const DAILY_GOLDEN: ModeReactions = {
    greeting: [
        { message: "반가워~!", action: "jump" },
        { message: "산책 갈까?", action: "wiggle" },
        { message: "꼬리 흔들~", action: "wiggle" },
        { message: "좋아좋아!", action: "heart" },
    ],
    playful: [
        { message: "공 던져줘!", action: "spin" },
        { message: "헤벌쭉~", action: "bounce" },
        { message: "행복해!", action: "heart" },
        { message: "뒹굴뒹굴~", action: "spin" },
    ],
    ticklish: [
        { message: "배 나왔어!", action: "wiggle" },
        { message: "하읍 하읍..", action: "bounce" },
        { message: "더!", action: "jump" },
    ],
};

const DAILY_RUSSIAN_BLUE: ModeReactions = {
    greeting: [
        { message: "..냥", action: "bounce" },
        { message: "쓰담 허락", action: "heart" },
        { message: "...뭐야", action: "wiggle" },
        { message: "그르릉~", action: "sparkle" },
    ],
    playful: [
        { message: "관심 없어", action: "wiggle" },
        { message: "..한번만 더", action: "sparkle" },
        { message: "흠...", action: "bounce" },
        { message: "..고마워", action: "heart" },
    ],
    ticklish: [
        { message: "...그만해", action: "spin" },
        { message: "만족", action: "bounce" },
        { message: "..자야겠어", action: "sparkle" },
    ],
};

const DAILY_RAGDOLL: ModeReactions = {
    greeting: [
        { message: "안겨도 돼?", action: "heart" },
        { message: "폭신~", action: "bounce" },
        { message: "눈 마주쳤다!", action: "sparkle" },
        { message: "따뜻해..", action: "heart" },
    ],
    playful: [
        { message: "같이 있자~", action: "heart" },
        { message: "좋아~", action: "sparkle" },
        { message: "놀아줘!", action: "jump" },
        { message: "뭐 봐~", action: "wiggle" },
    ],
    ticklish: [
        { message: "깨무는 시늉", action: "wiggle" },
        { message: "너무 많아!", action: "spin" },
        { message: "쉬고 싶어", action: "bounce" },
    ],
};

const DAILY_CHEESE_CAT: ModeReactions = {
    greeting: [
        { message: "야옹!", action: "jump" },
        { message: "배 만져봐!", action: "wiggle" },
        { message: "츄르..!", action: "heart" },
        { message: "기지개~", action: "bounce" },
    ],
    playful: [
        { message: "놀아줄 거야?", action: "spin" },
        { message: "꾹꾹이~", action: "bounce" },
        { message: "뒹굴!", action: "spin" },
        { message: "행복~", action: "heart" },
    ],
    ticklish: [
        { message: "야옹!!", action: "wiggle" },
        { message: "간식 내놔", action: "jump" },
        { message: "낮잠 시간", action: "bounce" },
    ],
};

const DAILY_HAMSTER: ModeReactions = {
    greeting: [
        { message: "찌익~", action: "bounce" },
        { message: "볼주머니 가득!", action: "wiggle" },
        { message: "쳇바퀴 탈까?", action: "spin" },
        { message: "부스럭~", action: "jump" },
    ],
    playful: [
        { message: "해바라기씨..!", action: "heart" },
        { message: "밤이 좋아~", action: "sparkle" },
        { message: "조용히..", action: "bounce" },
        { message: "잠깐만!", action: "wiggle" },
    ],
    ticklish: [
        { message: "그만 건드려!", action: "spin" },
        { message: "숨을래!", action: "bounce" },
        { message: "..피곤해", action: "sparkle" },
    ],
};

const DAILY_RABBIT: ModeReactions = {
    greeting: [
        { message: "쀼우~", action: "jump" },
        { message: "귀 쫑긋!", action: "wiggle" },
        { message: "건초..!", action: "heart" },
        { message: "깡총!", action: "jump" },
    ],
    playful: [
        { message: "코찡긋~", action: "bounce" },
        { message: "모래목욕~", action: "spin" },
        { message: "조심조심", action: "sparkle" },
        { message: "헤헷~", action: "heart" },
    ],
    ticklish: [
        { message: "쀼쀼!", action: "wiggle" },
        { message: "도망!", action: "jump" },
        { message: "숨어있을래", action: "bounce" },
    ],
};

const DAILY_PARROT: ModeReactions = {
    greeting: [
        { message: "안녕~", action: "wiggle" },
        { message: "이름 불러줘!", action: "heart" },
        { message: "푸드덕!", action: "jump" },
        { message: "말 걸어줘~", action: "bounce" },
    ],
    playful: [
        { message: "어깨 위로!", action: "jump" },
        { message: "바나나 좋아~", action: "heart" },
        { message: "노래 부를까?", action: "sparkle" },
        { message: "왜왜~", action: "spin" },
    ],
    ticklish: [
        { message: "꽥!", action: "wiggle" },
        { message: "털 고르기", action: "bounce" },
        { message: "조용히 해줘", action: "sparkle" },
    ],
};

// 범용 폴백 (엑조틱·신규 미니미 대응)
const DAILY_DEFAULT: ModeReactions = {
    greeting: [
        { message: "안녕!", action: "jump" },
        { message: "반가워!", action: "heart" },
        { message: "나 여기있어!", action: "wiggle" },
        { message: "같이 있자", action: "bounce" },
    ],
    playful: [
        { message: "놀아줘~", action: "jump" },
        { message: "기분 좋아!", action: "heart" },
        { message: "좋아!", action: "bounce" },
        { message: "쓰담~", action: "sparkle" },
    ],
    ticklish: [
        { message: "그만그만~", action: "wiggle" },
        { message: "간지러워", action: "spin" },
        { message: "좀 쉬자", action: "bounce" },
    ],
};

// ============================================================================
// 추모 모드 (memorial) — 모든 종 공통 베이스
// 재회의 반가움 + 유저 응원 + 다시 만날 약속.
// 종별 변주는 말투 어미만 미세 조정 (강아지 "~!" 고양이 "~" 등).
// ============================================================================

const MEMORIAL_BASE_DOG: ModeReactions = {
    greeting: [
        { message: "또 왔어?", action: "sparkle" },
        { message: "기다렸어!", action: "heart" },
        { message: "보고 싶었어!", action: "sparkle" },
        { message: "반가워~", action: "bounce" },
    ],
    playful: [
        { message: "나 여기 잘 있어", action: "sparkle" },
        { message: "오늘 잘 지냈어?", action: "heart" },
        { message: "내가 응원할게", action: "star" },
        { message: "너 멋져!", action: "star" },
    ],
    ticklish: [
        { message: "언젠가 또 만나자", action: "sparkle" },
        { message: "여기서 기다릴게", action: "heart" },
        { message: "행복하게 살아", action: "star" },
        { message: "우린 늘 함께야", action: "sparkle" },
    ],
};

const MEMORIAL_BASE_CAT: ModeReactions = {
    greeting: [
        { message: "또 왔구나~", action: "sparkle" },
        { message: "기다렸어..", action: "heart" },
        { message: "보고 싶었어", action: "sparkle" },
        { message: "반가워", action: "bounce" },
    ],
    playful: [
        { message: "나 잘 지내", action: "sparkle" },
        { message: "오늘은 어땠어?", action: "heart" },
        { message: "응원할게", action: "star" },
        { message: "너 잘하고 있어", action: "star" },
    ],
    ticklish: [
        { message: "또 만날 거야", action: "sparkle" },
        { message: "여기서 기다릴게", action: "heart" },
        { message: "행복하렴", action: "star" },
        { message: "늘 함께야", action: "sparkle" },
    ],
};

const MEMORIAL_BASE_SMALL: ModeReactions = {
    greeting: [
        { message: "또 왔네~", action: "sparkle" },
        { message: "기다렸어!", action: "heart" },
        { message: "보고 싶었어~", action: "sparkle" },
        { message: "반가워!", action: "bounce" },
    ],
    playful: [
        { message: "나 잘 지내!", action: "sparkle" },
        { message: "오늘은 어땠어?", action: "heart" },
        { message: "화이팅!", action: "star" },
        { message: "너 최고야!", action: "star" },
    ],
    ticklish: [
        { message: "언젠가 또 만나!", action: "sparkle" },
        { message: "여기 있을게", action: "heart" },
        { message: "행복해야 해", action: "star" },
        { message: "같이 있어", action: "sparkle" },
    ],
};

// ============================================================================
// Export: 종별 × 모드별 매핑
// ============================================================================

export interface ReactionsByMode {
    daily: ModeReactions;
    memorial: ModeReactions;
}

export const REACTIONS_BY_TYPE: Record<string, ReactionsByMode> = {
    // 강아지 계열
    maltipoo: { daily: DAILY_MALTIPOO, memorial: MEMORIAL_BASE_DOG },
    yorkshire: { daily: DAILY_YORKSHIRE, memorial: MEMORIAL_BASE_DOG },
    golden_retriever: { daily: DAILY_GOLDEN, memorial: MEMORIAL_BASE_DOG },
    // 고양이 계열
    russian_blue: { daily: DAILY_RUSSIAN_BLUE, memorial: MEMORIAL_BASE_CAT },
    ragdoll: { daily: DAILY_RAGDOLL, memorial: MEMORIAL_BASE_CAT },
    cheese_cat: { daily: DAILY_CHEESE_CAT, memorial: MEMORIAL_BASE_CAT },
    // 엑조틱
    hamster: { daily: DAILY_HAMSTER, memorial: MEMORIAL_BASE_SMALL },
    rabbit: { daily: DAILY_RABBIT, memorial: MEMORIAL_BASE_SMALL },
    parrot: { daily: DAILY_PARROT, memorial: MEMORIAL_BASE_SMALL },
};

/** 폴백: 매칭 실패 시 사용 */
export const REACTIONS_DEFAULT: ReactionsByMode = {
    daily: DAILY_DEFAULT,
    memorial: MEMORIAL_BASE_SMALL,
};

/**
 * 미니미 반응 선택 헬퍼.
 * @param slug 미니미 slug (CHARACTER_CATALOG 기준)
 * @param mode "daily" | "memorial"
 * @param consecutiveCount 연속 터치 횟수 (1부터 시작)
 */
export function pickReaction(
    slug: string,
    mode: "daily" | "memorial",
    consecutiveCount: number,
): MinimiReaction {
    const byType = REACTIONS_BY_TYPE[slug] ?? REACTIONS_DEFAULT;
    const byMode = mode === "memorial" ? byType.memorial : byType.daily;
    const level = getTouchLevel(consecutiveCount);
    const pool = byMode[level];
    if (!pool || pool.length === 0) {
        // 방어: 상위 풀에서 greeting으로 폴백
        return byMode.greeting[0] ?? { message: "안녕~", action: "heart" };
    }
    return pool[Math.floor(Math.random() * pool.length)];
}
