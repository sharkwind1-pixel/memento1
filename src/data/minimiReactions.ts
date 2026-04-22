/**
 * minimiReactions.ts
 *
 * 미니미 터치 반응 — 종별 × 모드별 × 연속 터치 레벨별 대사 풀.
 *
 * 철학:
 * - 일상 모드: 종별 성격을 살린 My Little Puppy 감성
 * - 추모 모드: "슬픔이 아니라 다시 만날 약속" — 재회 반가움 + 응원 + 희망
 *   슬픔·과거 회상 금지. 현재형·희망형만.
 */

export type MinimiAction =
    | "heart"
    | "star"
    | "sparkle"
    | "jump"
    | "spin"
    | "wiggle"
    | "bounce";

export interface MinimiReaction {
    message: string;
    action: MinimiAction;
}

export type TouchLevel = "greeting" | "playful" | "ticklish";

export function getTouchLevel(consecutiveCount: number): TouchLevel {
    if (consecutiveCount <= 3) return "greeting";
    if (consecutiveCount <= 6) return "playful";
    return "ticklish";
}

type ModeReactions = Record<TouchLevel, MinimiReaction[]>;

// ============================================================================
// 말티푸 — 애교쟁이. 응석받이. 항상 관심 원함. 말이 많고 밝음.
// ============================================================================

const DAILY_MALTIPOO: ModeReactions = {
    greeting: [
        { message: "깡총!", action: "jump" },
        { message: "꼬리 살랑살랑~", action: "wiggle" },
        { message: "안아줘!", action: "heart" },
        { message: "헤헤~", action: "bounce" },
        { message: "나 보고 싶었지?", action: "heart" },
        { message: "쓰담쓰담~!", action: "bounce" },
        { message: "나 왔어~!", action: "jump" },
        { message: "오늘 나 예뻐?", action: "sparkle" },
        { message: "빵실빵실~", action: "wiggle" },
        { message: "응응!", action: "bounce" },
    ],
    playful: [
        { message: "또 만져줘!", action: "heart" },
        { message: "간지러워~ 더 해줘!", action: "wiggle" },
        { message: "헤벌쭉~", action: "bounce" },
        { message: "좋아좋아좋아!", action: "heart" },
        { message: "신난다~!", action: "spin" },
        { message: "이 정도는 더 해줘~", action: "jump" },
        { message: "나 오늘 최고야!", action: "star" },
        { message: "우리 사이 최고야!", action: "sparkle" },
        { message: "쓰담이 부족해~", action: "heart" },
    ],
    ticklish: [
        { message: "이제 그만~!", action: "wiggle" },
        { message: "너무 간지러워!!", action: "spin" },
        { message: "살살~ 살살해줘~", action: "bounce" },
        { message: "진짜 그만!!", action: "wiggle" },
        { message: "하하하 멈춰~!", action: "spin" },
        { message: "한계야 한계!", action: "jump" },
        { message: "아야~ (아프진 않아)", action: "bounce" },
        { message: "그만하면 간식이지!", action: "heart" },
    ],
};

const MEMORIAL_MALTIPOO: ModeReactions = {
    greeting: [
        { message: "또 왔어? 기다렸어!", action: "sparkle" },
        { message: "나 여기 있었어~!", action: "heart" },
        { message: "보고 싶었어!", action: "sparkle" },
        { message: "헤헤~ 반가워!", action: "bounce" },
        { message: "왔다왔다!", action: "jump" },
        { message: "나 생각했어?", action: "heart" },
        { message: "꼬리 살랑~ 보여?", action: "wiggle" },
        { message: "여기야 여기!", action: "sparkle" },
    ],
    playful: [
        { message: "나 잘 지내고 있어!", action: "sparkle" },
        { message: "오늘 잘 먹었어?", action: "heart" },
        { message: "넌 항상 내 최고야!", action: "star" },
        { message: "나 응원하고 있어!", action: "star" },
        { message: "힘들면 나 생각해!", action: "sparkle" },
        { message: "너 오늘 잘했어!", action: "star" },
        { message: "여기 따뜻해~", action: "heart" },
        { message: "내가 지켜볼게!", action: "sparkle" },
    ],
    ticklish: [
        { message: "언젠가 또 만나자!", action: "sparkle" },
        { message: "여기서 기다릴게!", action: "heart" },
        { message: "행복하게 살아야 해!", action: "star" },
        { message: "우린 늘 함께야!", action: "sparkle" },
        { message: "꼭 다시 만나!", action: "heart" },
        { message: "행복해야 돼 알겠지?", action: "star" },
        { message: "나 잊으면 안 돼~", action: "sparkle" },
        { message: "기다릴게, 천천히 와", action: "heart" },
    ],
};

// ============================================================================
// 요크셔테리어 — 자존심 강함. 작지만 당당. 리더 기질. 말이 짧고 강함.
// ============================================================================

const DAILY_YORKSHIRE: ModeReactions = {
    greeting: [
        { message: "멍! 나 왔다", action: "jump" },
        { message: "나 용감하지?", action: "bounce" },
        { message: "오늘도 내가 최고야", action: "star" },
        { message: "쓰담 허락해줄게", action: "heart" },
        { message: "겁 없다 나", action: "jump" },
        { message: "작아도 짱이야", action: "bounce" },
        { message: "나한테 인사해", action: "wiggle" },
        { message: "왔나, 잘됐어", action: "star" },
        { message: "오늘 기분 봐줄게", action: "heart" },
        { message: "멍!", action: "jump" },
    ],
    playful: [
        { message: "흠, 나쁘지 않아", action: "bounce" },
        { message: "더 해봐", action: "heart" },
        { message: "이 정도는 참을게", action: "wiggle" },
        { message: "좋다고 안 해", action: "star" },
        { message: "눈치챘어? 좋거든", action: "sparkle" },
        { message: "계속해봐", action: "bounce" },
        { message: "최고야, 라곤 못 해", action: "star" },
        { message: "멍멍!", action: "jump" },
        { message: "인정한다", action: "heart" },
    ],
    ticklish: [
        { message: "그만!!", action: "wiggle" },
        { message: "꺅!", action: "spin" },
        { message: "항복할게", action: "bounce" },
        { message: "예외적으로 봐줄게", action: "wiggle" },
        { message: "나도 한계 있어", action: "spin" },
        { message: "진짜야 그만해", action: "wiggle" },
        { message: "다음엔 내가 건드린다", action: "jump" },
        { message: "멍멍멍!!", action: "spin" },
    ],
};

const MEMORIAL_YORKSHIRE: ModeReactions = {
    greeting: [
        { message: "왔나. 기다렸어", action: "sparkle" },
        { message: "나 여기 있어", action: "heart" },
        { message: "보고 싶었거든", action: "sparkle" },
        { message: "잘 지냈어?", action: "bounce" },
        { message: "또 왔구나", action: "sparkle" },
        { message: "여기야", action: "heart" },
        { message: "반갑다", action: "bounce" },
        { message: "기다렸어, 당연하지", action: "sparkle" },
    ],
    playful: [
        { message: "나 잘 있어, 걱정 마", action: "sparkle" },
        { message: "오늘 어땠어?", action: "heart" },
        { message: "열심히 살고 있지?", action: "star" },
        { message: "잘하고 있어", action: "star" },
        { message: "힘들어도 버텨", action: "sparkle" },
        { message: "너 강한 거 알아", action: "star" },
        { message: "내가 지켜보고 있어", action: "heart" },
        { message: "응원한다", action: "sparkle" },
    ],
    ticklish: [
        { message: "언젠가 또 만나자", action: "sparkle" },
        { message: "여기서 기다릴게", action: "heart" },
        { message: "행복하게 살아", action: "star" },
        { message: "우린 연결돼 있어", action: "sparkle" },
        { message: "다시 만날 거야", action: "heart" },
        { message: "행복한 게 나한테 선물이야", action: "star" },
        { message: "기다릴게", action: "sparkle" },
        { message: "잊지 마, 나도 안 잊어", action: "heart" },
    ],
};

// ============================================================================
// 골든리트리버 — 순하고 다정함. 항상 행복함. 에너지 넘침. 모두를 좋아함.
// ============================================================================

const DAILY_GOLDEN: ModeReactions = {
    greeting: [
        { message: "반가워~!!", action: "jump" },
        { message: "산책 갈까?!", action: "wiggle" },
        { message: "꼬리가 안 멈춰~", action: "wiggle" },
        { message: "좋아좋아!", action: "heart" },
        { message: "오늘도 행복해~!", action: "bounce" },
        { message: "최고의 하루야!", action: "star" },
        { message: "같이 뛰자~!", action: "jump" },
        { message: "엄청 보고 싶었어!!", action: "heart" },
        { message: "세상 최고 기분!", action: "sparkle" },
        { message: "뭐든 좋아~!", action: "bounce" },
    ],
    playful: [
        { message: "공 던져줘!!", action: "spin" },
        { message: "헤벌쭉~", action: "bounce" },
        { message: "이게 행복이지!", action: "heart" },
        { message: "뒹굴뒹굴~", action: "spin" },
        { message: "같이 있어서 좋아!", action: "heart" },
        { message: "기분 최고야!", action: "star" },
        { message: "더 더 더!!", action: "jump" },
        { message: "영원히 해줘~", action: "wiggle" },
        { message: "세상에서 제일 좋아!", action: "sparkle" },
    ],
    ticklish: [
        { message: "배 나왔어~!", action: "wiggle" },
        { message: "하읍하읍..", action: "bounce" },
        { message: "더!!! 더 해줘!", action: "jump" },
        { message: "멈추면 서운해!", action: "heart" },
        { message: "웃음 참을 수가 없어!", action: "spin" },
        { message: "간지러워서 행복해!!", action: "wiggle" },
        { message: "기절할 것 같아~", action: "bounce" },
        { message: "다시 해줘!", action: "jump" },
    ],
};

const MEMORIAL_GOLDEN: ModeReactions = {
    greeting: [
        { message: "또 왔어?! 기다렸어!!", action: "sparkle" },
        { message: "나 여기 잘 있어~!", action: "heart" },
        { message: "보고 싶었어 진짜로!!", action: "sparkle" },
        { message: "반가워~!!", action: "bounce" },
        { message: "왔다!! 기다렸다고!", action: "jump" },
        { message: "꼬리 안 멈춰~!", action: "wiggle" },
        { message: "여기야 여기!!", action: "sparkle" },
        { message: "오늘도 왔구나~!!", action: "heart" },
    ],
    playful: [
        { message: "나 여기서 행복해!", action: "sparkle" },
        { message: "오늘도 잘 지냈어?", action: "heart" },
        { message: "넌 내 최고야!", action: "star" },
        { message: "열심히 살아줘!", action: "star" },
        { message: "힘내~ 내가 응원할게!", action: "sparkle" },
        { message: "오늘도 잘하고 있어!", action: "star" },
        { message: "여기 따뜻하고 좋아~", action: "heart" },
        { message: "항상 보고 있어!", action: "sparkle" },
    ],
    ticklish: [
        { message: "언젠가 꼭 또 만나자!!", action: "sparkle" },
        { message: "여기서 기다릴게~!", action: "heart" },
        { message: "행복하게 살아줘!", action: "star" },
        { message: "우린 영원히 함께야!", action: "sparkle" },
        { message: "꼭 다시 만날 거야!", action: "heart" },
        { message: "행복한 게 나한테 최고 선물이야!", action: "star" },
        { message: "기다릴게, 천천히 와도 돼!", action: "sparkle" },
        { message: "우리 다시 뛰어놀자!!", action: "heart" },
    ],
};

// ============================================================================
// 러시안블루 — 도도함. 츤데레. 말이 짧음. 감정 표현 아낌.
// ============================================================================

const DAILY_RUSSIAN_BLUE: ModeReactions = {
    greeting: [
        { message: "..냥", action: "bounce" },
        { message: "쓰담 허락함", action: "heart" },
        { message: "...뭐야", action: "wiggle" },
        { message: "그르릉~", action: "sparkle" },
        { message: "..왔어?", action: "bounce" },
        { message: "관심 없어, 는 아님", action: "heart" },
        { message: "..눈 마주쳤다", action: "sparkle" },
        { message: "존재 인식함", action: "wiggle" },
        { message: "..어", action: "bounce" },
        { message: "마음대로 해", action: "heart" },
    ],
    playful: [
        { message: "관심 없어", action: "wiggle" },
        { message: "..한번만 더", action: "sparkle" },
        { message: "흠...", action: "bounce" },
        { message: "..고마워", action: "heart" },
        { message: "싫진 않아", action: "sparkle" },
        { message: "계속해도 됨", action: "bounce" },
        { message: "..기분 나쁘지 않아", action: "heart" },
        { message: "허락할게", action: "sparkle" },
        { message: "..어쩔 수 없네", action: "wiggle" },
    ],
    ticklish: [
        { message: "...그만해", action: "spin" },
        { message: "충분함", action: "bounce" },
        { message: "..자야겠어", action: "sparkle" },
        { message: "한계야", action: "spin" },
        { message: "발톱 나온다", action: "wiggle" },
        { message: "..진지하게 그만", action: "spin" },
        { message: "오늘은 여기까지", action: "bounce" },
        { message: "무시할 거야", action: "sparkle" },
    ],
};

const MEMORIAL_RUSSIAN_BLUE: ModeReactions = {
    greeting: [
        { message: "..또 왔구나", action: "sparkle" },
        { message: "기다렸어..", action: "heart" },
        { message: "..보고 싶었어", action: "sparkle" },
        { message: "반가워", action: "bounce" },
        { message: "..왔어?", action: "sparkle" },
        { message: "여기야", action: "heart" },
        { message: "..알아봤어", action: "bounce" },
        { message: "왔구나", action: "sparkle" },
    ],
    playful: [
        { message: "나 잘 지내", action: "sparkle" },
        { message: "..오늘은 어땠어?", action: "heart" },
        { message: "잘하고 있어", action: "star" },
        { message: "..응원할게", action: "star" },
        { message: "힘내", action: "sparkle" },
        { message: "너 잘할 수 있어", action: "star" },
        { message: "..지켜보고 있어", action: "heart" },
        { message: "여기 좋아", action: "sparkle" },
    ],
    ticklish: [
        { message: "..또 만날 거야", action: "sparkle" },
        { message: "여기서 기다릴게", action: "heart" },
        { message: "행복하렴", action: "star" },
        { message: "..늘 함께야", action: "sparkle" },
        { message: "잊지 마", action: "heart" },
        { message: "..행복한 게 좋아", action: "star" },
        { message: "기다릴게", action: "sparkle" },
        { message: "..연결돼 있어", action: "heart" },
    ],
};

// ============================================================================
// 랙돌 — 순하고 축 늘어짐. 안기기 최고. 느긋함. 포근함.
// ============================================================================

const DAILY_RAGDOLL: ModeReactions = {
    greeting: [
        { message: "안겨도 돼?", action: "heart" },
        { message: "폭신~", action: "bounce" },
        { message: "눈 마주쳤다!", action: "sparkle" },
        { message: "따뜻해..", action: "heart" },
        { message: "같이 낮잠 어때?", action: "bounce" },
        { message: "포근포근~", action: "heart" },
        { message: "여기 편해~", action: "bounce" },
        { message: "우유빛깔~", action: "sparkle" },
        { message: "느긋느긋~", action: "bounce" },
        { message: "냥냥~", action: "heart" },
    ],
    playful: [
        { message: "같이 있자~", action: "heart" },
        { message: "좋아~", action: "sparkle" },
        { message: "놀아줘~ (살짝)", action: "jump" },
        { message: "뭐 봐~", action: "wiggle" },
        { message: "흐음~", action: "bounce" },
        { message: "더 해줘도 돼~", action: "heart" },
        { message: "행복해~", action: "sparkle" },
        { message: "좀 더 안아줘", action: "heart" },
        { message: "기분 좋다~", action: "bounce" },
    ],
    ticklish: [
        { message: "깨무는 시늉~", action: "wiggle" },
        { message: "너무 많아~", action: "spin" },
        { message: "쉬고 싶어..", action: "bounce" },
        { message: "그만그만..", action: "wiggle" },
        { message: "졸려..", action: "bounce" },
        { message: "나중에 또 해줘~", action: "heart" },
        { message: "지쳐버렸어~", action: "bounce" },
        { message: "낮잠 시간이야", action: "sparkle" },
    ],
};

const MEMORIAL_RAGDOLL: ModeReactions = {
    greeting: [
        { message: "또 안아주러 왔어?~", action: "sparkle" },
        { message: "기다렸어..", action: "heart" },
        { message: "보고 싶었어~", action: "sparkle" },
        { message: "여기 포근해~", action: "bounce" },
        { message: "왔구나~", action: "sparkle" },
        { message: "또 왔어?", action: "heart" },
        { message: "여기야~", action: "bounce" },
        { message: "반가워~", action: "sparkle" },
    ],
    playful: [
        { message: "나 여기서 편안해~", action: "sparkle" },
        { message: "오늘 따뜻하게 지냈어?", action: "heart" },
        { message: "잘하고 있어~", action: "star" },
        { message: "응원할게~", action: "star" },
        { message: "힘들면 쉬어도 돼~", action: "sparkle" },
        { message: "너 오늘 수고했어~", action: "star" },
        { message: "여기도 따뜻해~", action: "heart" },
        { message: "지켜보고 있어~", action: "sparkle" },
    ],
    ticklish: [
        { message: "언젠가 또 같이 낮잠 자자~", action: "sparkle" },
        { message: "여기서 기다릴게~", action: "heart" },
        { message: "행복하게 살아~", action: "star" },
        { message: "늘 함께야~", action: "sparkle" },
        { message: "꼭 다시 만나~", action: "heart" },
        { message: "행복해줘~ 부탁이야", action: "star" },
        { message: "기다릴게, 천천히 와도 돼~", action: "sparkle" },
        { message: "또 안아줄게~", action: "heart" },
    ],
};

// ============================================================================
// 치즈냥이 — 활발하고 장난기 넘침. 배 만지면 함정. 먹을 것에 집착.
// ============================================================================

const DAILY_CHEESE_CAT: ModeReactions = {
    greeting: [
        { message: "야옹!", action: "jump" },
        { message: "배 만져봐! (함정)", action: "wiggle" },
        { message: "츄르..!", action: "heart" },
        { message: "기지개~", action: "bounce" },
        { message: "야옹야옹~", action: "jump" },
        { message: "간식 어디?", action: "heart" },
        { message: "놀자놀자!", action: "spin" },
        { message: "오늘 기분 좋아~", action: "bounce" },
        { message: "탈탈탈~", action: "wiggle" },
        { message: "나 여기야!", action: "jump" },
    ],
    playful: [
        { message: "놀아줄 거야?", action: "spin" },
        { message: "꾹꾹이~", action: "bounce" },
        { message: "뒹굴!", action: "spin" },
        { message: "행복~", action: "heart" },
        { message: "더 해줘!", action: "wiggle" },
        { message: "가르랑~", action: "sparkle" },
        { message: "오늘 특히 좋아!", action: "heart" },
        { message: "배 함정이었지~", action: "wiggle" },
        { message: "꽤 마음에 들어", action: "bounce" },
    ],
    ticklish: [
        { message: "야옹!!", action: "wiggle" },
        { message: "간식 내놔", action: "jump" },
        { message: "낮잠 시간이야", action: "bounce" },
        { message: "발톱 나온다!!", action: "spin" },
        { message: "그만하면 간식!!", action: "heart" },
        { message: "진짜야!", action: "wiggle" },
        { message: "협박이 아니야 약속이야", action: "spin" },
        { message: "츄르 주면 용서해줄게", action: "bounce" },
    ],
};

const MEMORIAL_CHEESE_CAT: ModeReactions = {
    greeting: [
        { message: "야옹~ 또 왔어?", action: "sparkle" },
        { message: "기다렸어!", action: "heart" },
        { message: "보고 싶었어~", action: "sparkle" },
        { message: "여기 있었어!", action: "bounce" },
        { message: "왔네~", action: "sparkle" },
        { message: "또 왔구나야옹~", action: "heart" },
        { message: "반가워!", action: "jump" },
        { message: "기다렸다고~", action: "sparkle" },
    ],
    playful: [
        { message: "나 여기서 잘 지내!", action: "sparkle" },
        { message: "오늘 잘 먹었어?", action: "heart" },
        { message: "잘하고 있어!", action: "star" },
        { message: "응원할게~", action: "star" },
        { message: "힘내야 해!", action: "sparkle" },
        { message: "오늘도 열심히했지?", action: "star" },
        { message: "여기도 좋아~", action: "heart" },
        { message: "지켜보고 있어!", action: "sparkle" },
    ],
    ticklish: [
        { message: "언젠가 또 만나자!", action: "sparkle" },
        { message: "여기서 기다릴게~", action: "heart" },
        { message: "행복하게 살아!", action: "star" },
        { message: "우린 늘 함께야!", action: "sparkle" },
        { message: "꼭 다시 만나!", action: "heart" },
        { message: "행복해야 해, 야옹~", action: "star" },
        { message: "기다릴게!", action: "sparkle" },
        { message: "또 만나면 츄르 먹자!", action: "heart" },
    ],
};

// ============================================================================
// 범용 폴백
// ============================================================================

const DAILY_DEFAULT: ModeReactions = {
    greeting: [
        { message: "안녕!", action: "jump" },
        { message: "반가워!", action: "heart" },
        { message: "나 여기 있어!", action: "wiggle" },
        { message: "같이 있자", action: "bounce" },
        { message: "왔어?", action: "sparkle" },
        { message: "기분 좋은 날~", action: "heart" },
        { message: "오늘도 최고야!", action: "star" },
        { message: "헤헤~", action: "bounce" },
    ],
    playful: [
        { message: "놀아줘~", action: "jump" },
        { message: "기분 좋아!", action: "heart" },
        { message: "좋아!", action: "bounce" },
        { message: "쓰담~", action: "sparkle" },
        { message: "더 해줘~", action: "wiggle" },
        { message: "행복해!", action: "star" },
        { message: "같이 있어서 좋아", action: "heart" },
        { message: "기분 최고야~", action: "sparkle" },
    ],
    ticklish: [
        { message: "그만그만~", action: "wiggle" },
        { message: "간지러워", action: "spin" },
        { message: "좀 쉬자~", action: "bounce" },
        { message: "진짜 그만!", action: "wiggle" },
        { message: "한계야~", action: "spin" },
        { message: "나중에 또 해줘", action: "heart" },
        { message: "쉬어야겠어", action: "bounce" },
        { message: "오늘은 여기까지!", action: "sparkle" },
    ],
};

const MEMORIAL_DEFAULT: ModeReactions = {
    greeting: [
        { message: "또 왔어? 기다렸어!", action: "sparkle" },
        { message: "나 여기 있었어~", action: "heart" },
        { message: "보고 싶었어!", action: "sparkle" },
        { message: "반가워!", action: "bounce" },
        { message: "왔구나~", action: "sparkle" },
        { message: "여기야!", action: "heart" },
        { message: "기다렸어!", action: "bounce" },
        { message: "오늘도 왔어!", action: "sparkle" },
    ],
    playful: [
        { message: "나 잘 지내고 있어!", action: "sparkle" },
        { message: "오늘 잘 지냈어?", action: "heart" },
        { message: "잘하고 있어!", action: "star" },
        { message: "응원할게!", action: "star" },
        { message: "힘내~!", action: "sparkle" },
        { message: "너 오늘도 잘했어!", action: "star" },
        { message: "여기서 지켜보고 있어!", action: "heart" },
        { message: "내가 응원해!", action: "sparkle" },
    ],
    ticklish: [
        { message: "언젠가 또 만나자!", action: "sparkle" },
        { message: "여기서 기다릴게!", action: "heart" },
        { message: "행복하게 살아!", action: "star" },
        { message: "우린 늘 함께야!", action: "sparkle" },
        { message: "꼭 다시 만나!", action: "heart" },
        { message: "행복해야 해!", action: "star" },
        { message: "기다릴게, 천천히 와", action: "sparkle" },
        { message: "우리 다시 만날 거야!", action: "heart" },
    ],
};

// ============================================================================
// Export
// ============================================================================

export interface ReactionsByMode {
    daily: ModeReactions;
    memorial: ModeReactions;
}

export const REACTIONS_BY_TYPE: Record<string, ReactionsByMode> = {
    maltipoo:        { daily: DAILY_MALTIPOO,      memorial: MEMORIAL_MALTIPOO },
    yorkshire:       { daily: DAILY_YORKSHIRE,     memorial: MEMORIAL_YORKSHIRE },
    golden_retriever:{ daily: DAILY_GOLDEN,        memorial: MEMORIAL_GOLDEN },
    russian_blue:    { daily: DAILY_RUSSIAN_BLUE,  memorial: MEMORIAL_RUSSIAN_BLUE },
    ragdoll:         { daily: DAILY_RAGDOLL,       memorial: MEMORIAL_RAGDOLL },
    cheese_cat:      { daily: DAILY_CHEESE_CAT,    memorial: MEMORIAL_CHEESE_CAT },
};

export const REACTIONS_DEFAULT: ReactionsByMode = {
    daily: DAILY_DEFAULT,
    memorial: MEMORIAL_DEFAULT,
};

/**
 * 미니미 반응 선택.
 * @param slug 미니미 slug
 * @param mode "daily" | "memorial"
 * @param consecutiveCount 연속 터치 횟수 (1부터)
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
        return byMode.greeting[0] ?? { message: "안녕~", action: "heart" };
    }
    return pool[Math.floor(Math.random() * pool.length)];
}
