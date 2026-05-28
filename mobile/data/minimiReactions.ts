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
    | "bounce"
    | "runLeft"   // 왼쪽으로 뛰어갔다 돌아옴
    | "runRight"  // 오른쪽으로 뛰어갔다 돌아옴
    | "dash"      // 좌우 왔다갔다
    | "shrink"    // 깜짝 놀람
    | "flip"      // 돌아보기
    | "nod";      // 끄덕끄덕

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
        { message: "나 보고 싶었지?", action: "nod" },
        { message: "쓰담쓰담~!", action: "bounce" },
        { message: "나 왔어~!", action: "runRight" },
        { message: "오늘 나 예뻐?", action: "sparkle" },
        { message: "빵실빵실~", action: "wiggle" },
        { message: "응응!", action: "nod" },
    ],
    playful: [
        { message: "또 만져줘!", action: "heart" },
        { message: "간지러워~ 더 해줘!", action: "wiggle" },
        { message: "헤벌쭉~", action: "bounce" },
        { message: "좋아좋아좋아!", action: "heart" },
        { message: "신난다~!", action: "dash" },
        { message: "이 정도는 더 해줘~", action: "nod" },
        { message: "나 오늘 최고야!", action: "star" },
        { message: "우리 사이 최고야!", action: "sparkle" },
        { message: "쓰담이 부족해~", action: "heart" },
    ],
    ticklish: [
        { message: "이제 그만~!", action: "wiggle" },
        { message: "너무 간지러워!!", action: "spin" },
        { message: "살살~ 살살해줘~", action: "bounce" },
        { message: "진짜 그만!!", action: "runLeft" },
        { message: "하하하 멈춰~!", action: "dash" },
        { message: "한계야 한계!", action: "shrink" },
        { message: "아야~ (아프진 않아)", action: "bounce" },
        { message: "헥헥~ 잠깐 쉴래", action: "shrink" },
        { message: "안아줘 안아줘", action: "heart" },
        { message: "이제 잠 잘래~", action: "nod" },
    ],
};

const MEMORIAL_MALTIPOO: ModeReactions = {
    greeting: [
        { message: "또 왔어? 기다렸어!", action: "jump" },
        { message: "나 여기 있었어~!", action: "heart" },
        { message: "보고 싶었어!", action: "wiggle" },
        { message: "헤헤~ 반가워!", action: "bounce" },
        { message: "왔다왔다!", action: "runRight" },
        { message: "나 생각했어?", action: "nod" },
        { message: "꼬리 살랑~ 보여?", action: "wiggle" },
        { message: "여기야 여기!", action: "sparkle" },
    ],
    playful: [
        { message: "나 잘 지내고 있어!", action: "wiggle" },
        { message: "오늘 잘 먹었어?", action: "nod" },
        { message: "넌 항상 내 최고야!", action: "star" },
        { message: "나 응원하고 있어!", action: "jump" },
        { message: "힘들면 나 생각해!", action: "heart" },
        { message: "너 오늘 잘했어!", action: "bounce" },
        { message: "여기 따뜻해~", action: "sparkle" },
        { message: "내가 지켜볼게!", action: "nod" },
    ],
    ticklish: [
        { message: "언젠가 또 만나자!", action: "spin" },
        { message: "여기서 기다릴게!", action: "heart" },
        { message: "행복하게 살아야 해!", action: "jump" },
        { message: "우린 늘 함께야!", action: "wiggle" },
        { message: "꼭 다시 만나!", action: "runLeft" },
        { message: "행복해야 돼 알겠지?", action: "star" },
        { message: "나 잊으면 안 돼~", action: "dash" },
        { message: "기다릴게, 천천히 와", action: "nod" },
    ],
};

// ============================================================================
// 요크셔테리어 — 작지만 활기차고 다정함. 자기 가족엔 애교쟁이.
// 시그니처: 깡총깡총 + 똘망똘망한 짧은 말투 + 애정 표현
// ============================================================================

const DAILY_YORKSHIRE: ModeReactions = {
    greeting: [
        { message: "멍! 나 왔어!", action: "jump" },
        { message: "또 만났네 헤헤", action: "wiggle" },
        { message: "보고 싶었어!", action: "heart" },
        { message: "오늘도 와줘서 고마워!", action: "bounce" },
        { message: "나 여기 있어~", action: "sparkle" },
        { message: "꼬리 춤춰줄게~", action: "wiggle" },
        { message: "왔구나 왔구나!", action: "jump" },
        { message: "히히 좋아!", action: "bounce" },
        { message: "오늘 어땠어?", action: "nod" },
        { message: "같이 놀자!", action: "runRight" },
        { message: "엄청 반가워!", action: "heart" },
        { message: "쓰담쓰담 환영!", action: "wiggle" },
    ],
    playful: [
        { message: "헤헤 더 해줘~", action: "wiggle" },
        { message: "기분 진짜 좋아!", action: "heart" },
        { message: "꺄 너무 좋아!", action: "bounce" },
        { message: "응응 그렇게~", action: "nod" },
        { message: "콩콩~ 신나!", action: "jump" },
        { message: "사랑이야 사랑!", action: "heart" },
        { message: "오늘 같이 있어줘서 고마워", action: "sparkle" },
        { message: "이렇게 만져주면 행복해", action: "heart" },
        { message: "꼬리 멈출 수 없어~", action: "wiggle" },
        { message: "나 진짜 좋아해, 알지?", action: "star" },
    ],
    ticklish: [
        { message: "꺅 간지러워!", action: "wiggle" },
        { message: "이제 좀 쉴까?", action: "bounce" },
        { message: "헥헥~ 너무 신났어", action: "shrink" },
        { message: "잠깐만 숨 좀!", action: "spin" },
        { message: "히히 항복할게~", action: "bounce" },
        { message: "조금만 살살~", action: "wiggle" },
        { message: "기분 좋아 기분 좋아", action: "heart" },
        { message: "이제 안아주면 안 돼?", action: "nod" },
    ],
};

const MEMORIAL_YORKSHIRE: ModeReactions = {
    greeting: [
        { message: "왔나. 기다렸어", action: "nod" },
        { message: "나 여기 있어", action: "heart" },
        { message: "보고 싶었거든", action: "jump" },
        { message: "잘 지냈어?", action: "bounce" },
        { message: "또 왔구나", action: "wiggle" },
        { message: "여기야", action: "sparkle" },
        { message: "반갑다", action: "runRight" },
        { message: "기다렸어, 당연하지", action: "nod" },
    ],
    playful: [
        { message: "나 잘 있어, 걱정 마", action: "wiggle" },
        { message: "오늘 어땠어?", action: "nod" },
        { message: "열심히 살고 있지?", action: "star" },
        { message: "잘하고 있어", action: "bounce" },
        { message: "힘들어도 버텨", action: "jump" },
        { message: "너 강한 거 알아", action: "heart" },
        { message: "내가 지켜보고 있어", action: "sparkle" },
        { message: "응원한다", action: "dash" },
    ],
    ticklish: [
        { message: "언젠가 또 만나자", action: "spin" },
        { message: "여기서 기다릴게", action: "nod" },
        { message: "행복하게 살아", action: "jump" },
        { message: "우린 연결돼 있어", action: "wiggle" },
        { message: "다시 만날 거야", action: "heart" },
        { message: "행복한 게 나한테 선물이야", action: "runLeft" },
        { message: "기다릴게", action: "star" },
        { message: "잊지 마, 나도 안 잊어", action: "dash" },
    ],
};

// ============================================================================
// 골든리트리버 — 순하고 다정함. 항상 행복함. 에너지 넘침. 모두를 좋아함.
// ============================================================================

const DAILY_GOLDEN: ModeReactions = {
    greeting: [
        { message: "반가워~!!", action: "jump" },
        { message: "산책 갈까?!", action: "dash" },
        { message: "꼬리가 안 멈춰~", action: "wiggle" },
        { message: "좋아좋아!", action: "heart" },
        { message: "오늘도 행복해~!", action: "bounce" },
        { message: "최고의 하루야!", action: "star" },
        { message: "같이 뛰자~!", action: "runRight" },
        { message: "엄청 보고 싶었어!!", action: "heart" },
        { message: "세상 최고 기분!", action: "sparkle" },
        { message: "뭐든 좋아~!", action: "nod" },
    ],
    playful: [
        { message: "공 던져줘!!", action: "dash" },
        { message: "헤벌쭉~", action: "bounce" },
        { message: "이게 행복이지!", action: "heart" },
        { message: "뒹굴뒹굴~", action: "spin" },
        { message: "같이 있어서 좋아!", action: "heart" },
        { message: "기분 최고야!", action: "star" },
        { message: "더 더 더!!", action: "runLeft" },
        { message: "영원히 해줘~", action: "nod" },
        { message: "세상에서 제일 좋아!", action: "sparkle" },
    ],
    ticklish: [
        { message: "배 나왔어~!", action: "wiggle" },
        { message: "하읍하읍..", action: "bounce" },
        { message: "더!!! 더 해줘!", action: "dash" },
        { message: "멈추면 서운해!", action: "heart" },
        { message: "웃음 참을 수가 없어!", action: "spin" },
        { message: "간지러워서 행복해!!", action: "runRight" },
        { message: "기절할 것 같아~", action: "shrink" },
        { message: "다시 해줘!", action: "jump" },
    ],
};

const MEMORIAL_GOLDEN: ModeReactions = {
    greeting: [
        { message: "또 왔어?! 기다렸어!!", action: "dash" },
        { message: "나 여기 잘 있어~!", action: "heart" },
        { message: "보고 싶었어 진짜로!!", action: "runRight" },
        { message: "반가워~!!", action: "bounce" },
        { message: "왔다!! 기다렸다고!", action: "jump" },
        { message: "꼬리 안 멈춰~!", action: "wiggle" },
        { message: "여기야 여기!!", action: "sparkle" },
        { message: "오늘도 왔구나~!!", action: "nod" },
    ],
    playful: [
        { message: "나 여기서 행복해!", action: "spin" },
        { message: "오늘도 잘 지냈어?", action: "nod" },
        { message: "넌 내 최고야!", action: "star" },
        { message: "열심히 살아줘!", action: "jump" },
        { message: "힘내~ 내가 응원할게!", action: "wiggle" },
        { message: "오늘도 잘하고 있어!", action: "bounce" },
        { message: "여기 따뜻하고 좋아~", action: "heart" },
        { message: "항상 보고 있어!", action: "dash" },
    ],
    ticklish: [
        { message: "언젠가 꼭 또 만나자!!", action: "spin" },
        { message: "여기서 기다릴게~!", action: "nod" },
        { message: "행복하게 살아줘!", action: "jump" },
        { message: "우린 영원히 함께야!", action: "wiggle" },
        { message: "꼭 다시 만날 거야!", action: "heart" },
        { message: "행복한 게 나한테 최고 선물이야!", action: "runRight" },
        { message: "기다릴게, 천천히 와도 돼!", action: "star" },
        { message: "우리 다시 뛰어놀자!!", action: "dash" },
    ],
};

// ============================================================================
// 러시안블루 — 도도함. 츤데레. 말이 짧음. 감정 표현 아낌.
// ============================================================================

const DAILY_RUSSIAN_BLUE: ModeReactions = {
    greeting: [
        { message: "..냥", action: "bounce" },
        { message: "쓰담 허락함", action: "heart" },
        { message: "...뭐야", action: "flip" },
        { message: "그르릉~", action: "sparkle" },
        { message: "..왔어?", action: "bounce" },
        { message: "관심 없어, 는 아님", action: "flip" },
        { message: "..눈 마주쳤다", action: "sparkle" },
        { message: "존재 인식함", action: "nod" },
        { message: "..어", action: "bounce" },
        { message: "마음대로 해", action: "heart" },
    ],
    playful: [
        { message: "관심 없어", action: "flip" },
        { message: "..한번만 더", action: "sparkle" },
        { message: "흠...", action: "bounce" },
        { message: "..고마워", action: "heart" },
        { message: "싫진 않아", action: "nod" },
        { message: "계속해도 됨", action: "bounce" },
        { message: "..기분 나쁘지 않아", action: "heart" },
        { message: "허락할게", action: "sparkle" },
        { message: "..어쩔 수 없네", action: "flip" },
    ],
    ticklish: [
        { message: "...그만해", action: "spin" },
        { message: "충분함", action: "bounce" },
        { message: "..자야겠어", action: "sparkle" },
        { message: "한계야", action: "shrink" },
        { message: "발톱 나온다", action: "shrink" },
        { message: "..진지하게 그만", action: "runLeft" },
        { message: "오늘은 여기까지", action: "bounce" },
        { message: "무시할 거야", action: "flip" },
    ],
};

const MEMORIAL_RUSSIAN_BLUE: ModeReactions = {
    greeting: [
        { message: "..또 왔구나", action: "flip" },
        { message: "기다렸어..", action: "heart" },
        { message: "..보고 싶었어", action: "nod" },
        { message: "반가워", action: "bounce" },
        { message: "..왔어?", action: "flip" },
        { message: "여기야", action: "sparkle" },
        { message: "..알아봤어", action: "wiggle" },
        { message: "왔구나", action: "nod" },
    ],
    playful: [
        { message: "나 잘 지내", action: "bounce" },
        { message: "..오늘은 어땠어?", action: "nod" },
        { message: "잘하고 있어", action: "star" },
        { message: "..응원할게", action: "flip" },
        { message: "힘내", action: "wiggle" },
        { message: "너 잘할 수 있어", action: "heart" },
        { message: "..지켜보고 있어", action: "sparkle" },
        { message: "여기 좋아", action: "nod" },
    ],
    ticklish: [
        { message: "..또 만날 거야", action: "spin" },
        { message: "여기서 기다릴게", action: "nod" },
        { message: "행복하렴", action: "star" },
        { message: "..늘 함께야", action: "wiggle" },
        { message: "잊지 마", action: "heart" },
        { message: "..행복한 게 좋아", action: "flip" },
        { message: "기다릴게", action: "shrink" },
        { message: "..연결돼 있어", action: "bounce" },
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
        { message: "또 안아주러 왔어?~", action: "wiggle" },
        { message: "기다렸어..", action: "heart" },
        { message: "보고 싶었어~", action: "nod" },
        { message: "여기 포근해~", action: "bounce" },
        { message: "왔구나~", action: "sparkle" },
        { message: "또 왔어?", action: "jump" },
        { message: "여기야~", action: "wiggle" },
        { message: "반가워~", action: "nod" },
    ],
    playful: [
        { message: "나 여기서 편안해~", action: "wiggle" },
        { message: "오늘 따뜻하게 지냈어?", action: "nod" },
        { message: "잘하고 있어~", action: "star" },
        { message: "응원할게~", action: "bounce" },
        { message: "힘들면 쉬어도 돼~", action: "heart" },
        { message: "너 오늘 수고했어~", action: "jump" },
        { message: "여기도 따뜻해~", action: "sparkle" },
        { message: "지켜보고 있어~", action: "nod" },
    ],
    ticklish: [
        { message: "언젠가 또 같이 낮잠 자자~", action: "spin" },
        { message: "여기서 기다릴게~", action: "nod" },
        { message: "행복하게 살아~", action: "jump" },
        { message: "늘 함께야~", action: "wiggle" },
        { message: "꼭 다시 만나~", action: "heart" },
        { message: "행복해줘~ 부탁이야", action: "star" },
        { message: "기다릴게, 천천히 와도 돼~", action: "bounce" },
        { message: "또 안아줄게~", action: "runRight" },
    ],
};

// ============================================================================
// 치즈냥이 — 활발하고 장난기 넘침. 배 만지면 함정. 먹을 것에 집착.
// ============================================================================

const DAILY_CHEESE_CAT: ModeReactions = {
    greeting: [
        { message: "야옹!", action: "jump" },
        { message: "배 만져봐! (함정)", action: "flip" },
        { message: "츄르..!", action: "heart" },
        { message: "기지개~", action: "bounce" },
        { message: "야옹야옹~", action: "runLeft" },
        { message: "간식 어디?", action: "dash" },
        { message: "놀자놀자!", action: "runRight" },
        { message: "오늘 기분 좋아~", action: "bounce" },
        { message: "탈탈탈~", action: "dash" },
        { message: "나 여기야!", action: "jump" },
    ],
    playful: [
        { message: "놀아줄 거야?", action: "spin" },
        { message: "꾹꾹이~", action: "bounce" },
        { message: "뒹굴!", action: "spin" },
        { message: "행복~", action: "heart" },
        { message: "더 해줘!", action: "nod" },
        { message: "가르랑~", action: "sparkle" },
        { message: "오늘 특히 좋아!", action: "heart" },
        { message: "배 함정이었지~", action: "shrink" },
        { message: "꽤 마음에 들어", action: "bounce" },
    ],
    ticklish: [
        { message: "야옹!! 그만~", action: "wiggle" },
        { message: "츄르 주면 용서해줄게", action: "runLeft" },
        { message: "낮잠 시간이야", action: "bounce" },
        { message: "발톱 나온다 진짜!", action: "shrink" },
        { message: "이제 골골 모드~", action: "heart" },
        { message: "그만 그만 항복~", action: "flip" },
        { message: "협박이 아니야 약속이야", action: "nod" },
        { message: "츄르 한 번이면 다시 시작!", action: "sparkle" },
        { message: "휴~ 잠깐만 쉬자", action: "shrink" },
    ],
};

const MEMORIAL_CHEESE_CAT: ModeReactions = {
    greeting: [
        { message: "야옹~ 또 왔어?", action: "dash" },
        { message: "기다렸어!", action: "heart" },
        { message: "보고 싶었어~", action: "wiggle" },
        { message: "여기 있었어!", action: "bounce" },
        { message: "왔네~", action: "flip" },
        { message: "또 왔구나야옹~", action: "runLeft" },
        { message: "반가워!", action: "jump" },
        { message: "기다렸다고~", action: "nod" },
    ],
    playful: [
        { message: "나 여기서 잘 지내!", action: "spin" },
        { message: "오늘 잘 먹었어?", action: "nod" },
        { message: "잘하고 있어!", action: "star" },
        { message: "응원할게~", action: "bounce" },
        { message: "힘내야 해!", action: "jump" },
        { message: "오늘도 열심히했지?", action: "wiggle" },
        { message: "여기도 좋아~", action: "heart" },
        { message: "지켜보고 있어!", action: "sparkle" },
    ],
    ticklish: [
        { message: "언젠가 또 만나자!", action: "spin" },
        { message: "여기서 기다릴게~", action: "nod" },
        { message: "행복하게 살아!", action: "dash" },
        { message: "우린 늘 함께야!", action: "wiggle" },
        { message: "꼭 다시 만나!", action: "heart" },
        { message: "행복해야 해, 야옹~", action: "runRight" },
        { message: "기다릴게!", action: "star" },
        { message: "또 만나면 츄르 먹자!", action: "jump" },
    ],
};

// ============================================================================
// 포메라니안 — 관종. 에너지 폭발. 자기가 대형견인 줄 앎. 짖기 좋아함.
// ============================================================================

const DAILY_POMERANIAN: ModeReactions = {
    greeting: [
        { message: "깽깽!", action: "jump" },
        { message: "나 왔다!!", action: "runRight" },
        { message: "나 봐봐봐!", action: "dash" },
        { message: "뽀송뽀송~!", action: "wiggle" },
        { message: "나 작아도 짱이야!", action: "star" },
        { message: "솜사탕 왔어!", action: "bounce" },
        { message: "안아줘! 지금!!", action: "heart" },
        { message: "내가 제일 귀엽지?", action: "sparkle" },
        { message: "깽깽깽~!", action: "spin" },
        { message: "빨리 놀자!", action: "runLeft" },
    ],
    playful: [
        { message: "더!! 더 만져줘!!", action: "heart" },
        { message: "나한테만 집중해!", action: "nod" },
        { message: "헤헤 좋아!!", action: "bounce" },
        { message: "나 진짜 대형견이야!", action: "star" },
        { message: "신난다 신나!!", action: "dash" },
        { message: "우리 같이 뛰자!!", action: "runRight" },
        { message: "솜뭉치 파워!", action: "sparkle" },
        { message: "관심이 부족해!", action: "wiggle" },
        { message: "짱짱 좋아!", action: "jump" },
    ],
    ticklish: [
        { message: "깽!!", action: "shrink" },
        { message: "작아도 무섭다고!", action: "flip" },
        { message: "그만!! 진짜야!!", action: "spin" },
        { message: "멈춰!! 깽깽!!", action: "wiggle" },
        { message: "한계! 한계야!!", action: "runLeft" },
        { message: "터질 것 같아!!", action: "dash" },
        { message: "간식 안 주면 물어!", action: "flip" },
        { message: "아 진짜 그만!!", action: "shrink" },
    ],
};

const MEMORIAL_POMERANIAN: ModeReactions = {
    greeting: [
        { message: "또 왔어?! 기다렸어!!", action: "dash" },
        { message: "나 여기 있어!!", action: "jump" },
        { message: "보고 싶었어!", action: "wiggle" },
        { message: "깽~ 반가워!", action: "bounce" },
        { message: "왔다!! 알고 있었어!", action: "runRight" },
        { message: "여기야 여기!!", action: "sparkle" },
        { message: "나 기다렸다고!", action: "nod" },
        { message: "또 왔구나!", action: "heart" },
    ],
    playful: [
        { message: "나 여기서 잘 지내!", action: "spin" },
        { message: "오늘도 잘했어?", action: "nod" },
        { message: "너 최고야!", action: "star" },
        { message: "나 응원하고 있어!!", action: "jump" },
        { message: "힘내! 내가 지켜볼게!", action: "dash" },
        { message: "오늘도 열심히했지?", action: "wiggle" },
        { message: "여기 따뜻해!", action: "heart" },
        { message: "내가 지켜보고 있어!", action: "sparkle" },
    ],
    ticklish: [
        { message: "언젠가 또 만나자!!", action: "spin" },
        { message: "여기서 기다릴게!", action: "nod" },
        { message: "행복하게 살아!!", action: "dash" },
        { message: "우린 늘 함께야!", action: "wiggle" },
        { message: "꼭 다시 만나!!", action: "heart" },
        { message: "행복한 게 최고 선물이야!", action: "runLeft" },
        { message: "기다릴게!", action: "star" },
        { message: "우리 다시 뛰어놀자!!", action: "jump" },
    ],
};

// ============================================================================
// 비숑프리제 — 하얀 솜뭉치. 밝고 활발. 사람 좋아함. 애교 폭발.
// ============================================================================

const DAILY_BICHON: ModeReactions = {
    greeting: [
        { message: "뽀글뽀글~!", action: "wiggle" },
        { message: "나 솜사탕이야!", action: "bounce" },
        { message: "안아줘 안아줘!", action: "heart" },
        { message: "깡총!", action: "jump" },
        { message: "뭐해뭐해?", action: "nod" },
        { message: "같이 놀자~!", action: "dash" },
        { message: "나 왔어!", action: "runRight" },
        { message: "헤헤~!", action: "sparkle" },
        { message: "쓰담 좋아!", action: "heart" },
        { message: "오늘도 뽀글!", action: "spin" },
    ],
    playful: [
        { message: "더 해줘~!", action: "heart" },
        { message: "뽀글뽀글 좋아!", action: "wiggle" },
        { message: "나 예쁘지?", action: "sparkle" },
        { message: "세상에서 제일 좋아!", action: "star" },
        { message: "신나신나~!", action: "dash" },
        { message: "같이 뛰자!", action: "runLeft" },
        { message: "행복해~!", action: "bounce" },
        { message: "쓰담 최고!", action: "heart" },
        { message: "뭐든 좋아!", action: "nod" },
    ],
    ticklish: [
        { message: "깽!", action: "shrink" },
        { message: "간지러워~!", action: "spin" },
        { message: "멈춰멈춰!", action: "wiggle" },
        { message: "뽀글이 한계야!", action: "flip" },
        { message: "살살해줘~!", action: "bounce" },
        { message: "그만하면 간식!", action: "heart" },
        { message: "너무 많아~!", action: "runLeft" },
        { message: "잠깐 쉴래!", action: "shrink" },
    ],
};

const MEMORIAL_BICHON: ModeReactions = {
    greeting: [
        { message: "또 왔어? 기다렸어!", action: "jump" },
        { message: "나 여기 있어~!", action: "heart" },
        { message: "보고 싶었어!", action: "wiggle" },
        { message: "반가워~!", action: "bounce" },
        { message: "왔구나!", action: "runRight" },
        { message: "여기야~!", action: "sparkle" },
        { message: "뽀글뽀글 기다렸어!", action: "nod" },
        { message: "또 왔구나!", action: "dash" },
    ],
    playful: [
        { message: "나 여기서 잘 지내!", action: "spin" },
        { message: "오늘도 잘했어?", action: "nod" },
        { message: "너 최고야!", action: "star" },
        { message: "응원할게!", action: "jump" },
        { message: "힘내~ 내가 지켜볼게!", action: "wiggle" },
        { message: "오늘도 열심히했지?", action: "bounce" },
        { message: "여기 따뜻해!", action: "heart" },
        { message: "내가 지켜보고 있어!", action: "sparkle" },
    ],
    ticklish: [
        { message: "언젠가 또 만나자!", action: "spin" },
        { message: "여기서 기다릴게!", action: "nod" },
        { message: "행복하게 살아!", action: "dash" },
        { message: "우린 늘 함께야!", action: "wiggle" },
        { message: "꼭 다시 만나!", action: "heart" },
        { message: "뽀글이가 응원할게!", action: "runLeft" },
        { message: "기다릴게!", action: "star" },
        { message: "우리 다시 만나자!", action: "jump" },
    ],
};

// ============================================================================
// 웰시코기 — 엉덩이 요정. 짧은 다리 자부심. 먹보. 밝고 씩씩함.
// ============================================================================

const DAILY_CORGI: ModeReactions = {
    greeting: [
        { message: "엉덩이 흔들~!", action: "wiggle" },
        { message: "다리 짧아도 빠르다!", action: "dash" },
        { message: "간식 어디?!", action: "runRight" },
        { message: "나 왔다!", action: "jump" },
        { message: "꼬리 봐봐!", action: "wiggle" },
        { message: "오늘도 씩씩!", action: "star" },
        { message: "안녕!", action: "bounce" },
        { message: "같이 산책 가자!", action: "runLeft" },
        { message: "헤헤!", action: "heart" },
        { message: "멍!", action: "nod" },
    ],
    playful: [
        { message: "엉덩이 터치 금지!", action: "flip" },
        { message: "간식 주면 더 해줄게!", action: "heart" },
        { message: "나 진짜 빠르거든!", action: "dash" },
        { message: "좋아좋아!", action: "bounce" },
        { message: "더!!", action: "wiggle" },
        { message: "최고야!", action: "star" },
        { message: "뒹굴~!", action: "spin" },
        { message: "짧아도 멋있지?", action: "sparkle" },
        { message: "행복해!", action: "nod" },
    ],
    ticklish: [
        { message: "엉덩이 만지지 마!", action: "flip" },
        { message: "그만!!", action: "shrink" },
        { message: "다리 짧다고 놀리지 마!", action: "spin" },
        { message: "간식 내놔!", action: "runLeft" },
        { message: "한계야!", action: "wiggle" },
        { message: "진짜 물어!", action: "flip" },
        { message: "쉴래!", action: "shrink" },
        { message: "간식이면 용서!", action: "heart" },
    ],
};

const MEMORIAL_CORGI: ModeReactions = {
    greeting: [
        { message: "또 왔어? 기다렸어!", action: "dash" },
        { message: "나 여기 있어!", action: "jump" },
        { message: "보고 싶었어!", action: "wiggle" },
        { message: "반가워!", action: "bounce" },
        { message: "왔구나!", action: "runRight" },
        { message: "여기야!", action: "sparkle" },
        { message: "기다렸어!", action: "nod" },
        { message: "또 왔구나!", action: "heart" },
    ],
    playful: [
        { message: "나 여기서 잘 지내!", action: "spin" },
        { message: "오늘도 잘했어?", action: "nod" },
        { message: "너 최고야!", action: "star" },
        { message: "응원할게!", action: "jump" },
        { message: "힘내!", action: "dash" },
        { message: "오늘도 열심히했지?", action: "wiggle" },
        { message: "여기 따뜻해!", action: "heart" },
        { message: "지켜보고 있어!", action: "sparkle" },
    ],
    ticklish: [
        { message: "언젠가 또 만나자!", action: "spin" },
        { message: "여기서 기다릴게!", action: "nod" },
        { message: "행복하게 살아!", action: "dash" },
        { message: "우린 늘 함께야!", action: "wiggle" },
        { message: "꼭 다시 만나!", action: "heart" },
        { message: "같이 산책하자!", action: "runLeft" },
        { message: "기다릴게!", action: "star" },
        { message: "우리 다시 뛰자!", action: "jump" },
    ],
};

// ============================================================================
// 시바견 — 도도/츤데레/독립적
// ============================================================================

const DAILY_SHIBA: ModeReactions = {
    greeting: [
        { message: "...왔어?", action: "flip" },
        { message: "별로 기다린 거 아냐", action: "nod" },
        { message: "흥, 왔구나", action: "wiggle" },
        { message: "나 혼자서도 잘 놀아", action: "spin" },
        { message: "오늘은 봐줄게", action: "sparkle" },
        { message: "뭘 봐", action: "flip" },
        { message: "...반갑다", action: "heart" },
        { message: "쓰담 한 번은 허락", action: "nod" },
        { message: "관심 없는 척~", action: "runRight" },
        { message: "안 기다렸거든!", action: "dash" },
    ],
    playful: [
        { message: "...좋은 건 아닌데", action: "wiggle" },
        { message: "한 번만 더!", action: "bounce" },
        { message: "기분 나쁘진 않아", action: "sparkle" },
        { message: "뭐, 괜찮아", action: "nod" },
        { message: "더 해도 된다고!", action: "jump" },
        { message: "흥, 실력은 있네", action: "spin" },
        { message: "나 도도한 거지 차가운 거 아냐", action: "heart" },
        { message: "간식이면 좀 더 해줄게", action: "star" },
        { message: "꼬리 안 흔든 거 아니야", action: "wiggle" },
    ],
    ticklish: [
        { message: "건방지게 어딜!", action: "shrink" },
        { message: "허락 안 했거든?!", action: "flip" },
        { message: "감히!", action: "spin" },
        { message: "다음엔 물어", action: "runLeft" },
        { message: "한계점 도달!", action: "shrink" },
        { message: "...한 번만 봐준다", action: "nod" },
        { message: "간식으로 사과해", action: "flip" },
        { message: "오늘은 여기까지야", action: "dash" },
    ],
};

const MEMORIAL_SHIBA: ModeReactions = {
    greeting: [
        { message: "...기다렸어", action: "nod" },
        { message: "왔구나, 반가워", action: "heart" },
        { message: "보고 싶었다", action: "wiggle" },
        { message: "또 와줬어?", action: "sparkle" },
        { message: "나 여기 있어", action: "bounce" },
        { message: "여기야!", action: "jump" },
        { message: "오늘도 왔네", action: "runRight" },
        { message: "기다렸어, 진짜야", action: "dash" },
    ],
    playful: [
        { message: "나 잘 지내고 있어", action: "spin" },
        { message: "여기 좋아!", action: "star" },
        { message: "너도 잘 지내지?", action: "nod" },
        { message: "응원할게", action: "bounce" },
        { message: "오늘도 잘했어!", action: "heart" },
        { message: "여기서 지켜보고 있어", action: "sparkle" },
        { message: "힘내!", action: "jump" },
        { message: "너 최고야", action: "wiggle" },
    ],
    ticklish: [
        { message: "언젠가 또 만나자", action: "spin" },
        { message: "여기서 기다릴게", action: "nod" },
        { message: "행복하게 살아!", action: "dash" },
        { message: "우린 늘 함께야", action: "wiggle" },
        { message: "꼭 다시 만나!", action: "heart" },
        { message: "도도하게 기다릴게", action: "flip" },
        { message: "기다릴게, 천천히 와", action: "star" },
        { message: "우리 다시 만날 거야", action: "runLeft" },
    ],
};

// ============================================================================
// 스코티시폴드 — 순둥/온순/느긋
// ============================================================================

const DAILY_SCOTTISH_FOLD: ModeReactions = {
    greeting: [
        { message: "어... 왔어?", action: "nod" },
        { message: "반가워~", action: "heart" },
        { message: "나 여기서 낮잠 자고 있었어", action: "wiggle" },
        { message: "같이 있자~", action: "bounce" },
        { message: "귀 접힌 거 귀엽지?", action: "sparkle" },
        { message: "오늘도 평화로워", action: "nod" },
        { message: "안녕~", action: "jump" },
        { message: "뒹굴뒹굴~", action: "spin" },
        { message: "쓰담해줘~", action: "heart" },
        { message: "움직이기 귀찮아...", action: "wiggle" },
    ],
    playful: [
        { message: "좋아~ 더 해줘", action: "nod" },
        { message: "기분 좋다~", action: "heart" },
        { message: "배 만져도 돼~", action: "flip" },
        { message: "귀 뒤도 좋아!", action: "sparkle" },
        { message: "그루밍 시간~", action: "wiggle" },
        { message: "골골골~", action: "bounce" },
        { message: "행복해~", action: "star" },
        { message: "더~!", action: "jump" },
        { message: "잠온다...", action: "nod" },
    ],
    ticklish: [
        { message: "으냥... 그만", action: "shrink" },
        { message: "졸린데...", action: "nod" },
        { message: "살살 해줘!", action: "flip" },
        { message: "낮잠 잘래...", action: "spin" },
        { message: "한계야~", action: "wiggle" },
        { message: "나중에 해줘...", action: "shrink" },
        { message: "쉬자~", action: "nod" },
        { message: "간식이면 좀 더...", action: "heart" },
    ],
};

const MEMORIAL_SCOTTISH_FOLD: ModeReactions = {
    greeting: [
        { message: "음~ 왔구나... 낮잠 자다 깼어", action: "nod" },
        { message: "여기 양지바른 데서 기다렸어", action: "wiggle" },
        { message: "접힌 귀 만져볼래?", action: "sparkle" },
        { message: "옆에 앉아~ 자리 따뜻해", action: "heart" },
        { message: "느긋하게 와도 돼~ 나 안 가", action: "bounce" },
        { message: "여기 햇살이 참 좋아", action: "star" },
        { message: "이불 속에서 기다렸어~", action: "flip" },
        { message: "같이 뒹굴자~", action: "spin" },
    ],
    playful: [
        { message: "여기서 매일 낮잠 자", action: "nod" },
        { message: "구름 위가 제일 폭신해~", action: "wiggle" },
        { message: "너 올 때쯤 꼭 눈이 떠져", action: "sparkle" },
        { message: "쓰담쓰담 기억나~", action: "heart" },
        { message: "여기도 귀 뒤 긁어주는 바람이 불어", action: "star" },
        { message: "졸려도 너 올 땐 깨어 있을게", action: "bounce" },
        { message: "같이 뒹굴던 거 잊지 않았어", action: "spin" },
        { message: "나 여전히 배 보여주고 잘 자", action: "flip" },
    ],
    ticklish: [
        { message: "다음에 같이 낮잠 자자", action: "nod" },
        { message: "느긋하게 기다릴게~ 나 급한 거 없어", action: "wiggle" },
        { message: "제일 따뜻한 자리 맡아둘게", action: "heart" },
        { message: "여기서 뒹굴뒹굴하며 기다려", action: "spin" },
        { message: "서두르지 마~ 나 늘 여기 있어", action: "star" },
        { message: "다시 만나면 옆에서 골골 해줄게", action: "bounce" },
        { message: "접힌 귀로 네 목소리 듣고 있어", action: "sparkle" },
        { message: "포근한 데서 만나자~", action: "flip" },
    ],
};

// ============================================================================
// 벵갈 — 활발/호기심/야생미. 에너지 넘치고 탐험 좋아함.
// ============================================================================

const DAILY_BENGAL: ModeReactions = {
    greeting: [
        { message: "냐옹! 놀자!", action: "dash" },
        { message: "뭐가 있어?!", action: "runRight" },
        { message: "탐험 시작!", action: "jump" },
        { message: "나 여기 있어!", action: "bounce" },
        { message: "심심했다구!", action: "wiggle" },
        { message: "같이 뛰자!", action: "runLeft" },
        { message: "안녕~!", action: "spin" },
        { message: "오늘 뭐 해?", action: "sparkle" },
        { message: "움직이고 싶어!", action: "dash" },
        { message: "모험 갈 시간!", action: "jump" },
    ],
    playful: [
        { message: "더 더 더!", action: "bounce" },
        { message: "잡아봐~!", action: "runRight" },
        { message: "나 빠르지?", action: "dash" },
        { message: "높이 뛸 수 있어!", action: "jump" },
        { message: "기분 최고!", action: "star" },
        { message: "놀이 천재!", action: "spin" },
        { message: "이거 재밌다!", action: "wiggle" },
        { message: "한 번 더!", action: "bounce" },
        { message: "못 잡지~?", action: "runLeft" },
    ],
    ticklish: [
        { message: "으앙 간지러워!", action: "shrink" },
        { message: "야생의 본능이...!", action: "flip" },
        { message: "살살! 살살!", action: "spin" },
        { message: "도망간다~!", action: "dash" },
        { message: "한계 돌파!", action: "runRight" },
        { message: "숨는다!", action: "shrink" },
        { message: "간식 주면 용서!", action: "flip" },
        { message: "나중에 더 놀자!", action: "runLeft" },
    ],
};

const MEMORIAL_BENGAL: ModeReactions = {
    greeting: [
        { message: "나 여기서 매일 새로운 길 탐험해!", action: "dash" },
        { message: "높은 데서 널 찾고 있었어!", action: "jump" },
        { message: "달려왔어! 나 아직도 빠르지?", action: "runRight" },
        { message: "여기 숲이 끝없이 넓어!", action: "spin" },
        { message: "냄새로 네가 온 걸 알았어!", action: "sparkle" },
        { message: "모험하다가 왔어!", action: "bounce" },
        { message: "나 나무 꼭대기에서 봤어!", action: "star" },
        { message: "여기 뛸 데가 정말 많아!", action: "wiggle" },
    ],
    playful: [
        { message: "여기서 나비도 잡고 놀아!", action: "dash" },
        { message: "매일 새 친구 만나! 근데 넌 특별해", action: "heart" },
        { message: "별똥별 잡으러 뛰어봤어!", action: "jump" },
        { message: "너도 나처럼 뛰어다녀!", action: "runLeft" },
        { message: "여기 바람이 진짜 시원해!", action: "wiggle" },
        { message: "호기심은 여전해!", action: "sparkle" },
        { message: "무지개 끝까지 달려봤어!", action: "runRight" },
        { message: "에너지 넘쳐! 걱정 마!", action: "bounce" },
    ],
    ticklish: [
        { message: "다시 만나면 같이 탐험하자!", action: "dash" },
        { message: "제일 높은 나무에서 기다릴게!", action: "jump" },
        { message: "달려서 만나러 갈 거야!", action: "runRight" },
        { message: "여기 비밀 장소 찾아뒀어!", action: "sparkle" },
        { message: "지루할 틈 없이 놀고 있어!", action: "spin" },
        { message: "만나면 같이 뛰자! 약속!", action: "bounce" },
        { message: "모험은 끝나지 않아!", action: "star" },
        { message: "세상 끝까지 달려갈게!", action: "runLeft" },
    ],
};

// ============================================================================
// 먼치킨 — 장난꾸러기/애교/짧은 다리. 다리 짧아도 에너지 넘침.
// ============================================================================

const DAILY_MUNCHKIN: ModeReactions = {
    greeting: [
        { message: "총총총!", action: "dash" },
        { message: "다리 짧아도 빨라!", action: "runRight" },
        { message: "안녕~!", action: "jump" },
        { message: "놀아줘!", action: "bounce" },
        { message: "여기 여기!", action: "wiggle" },
        { message: "안아줘~!", action: "heart" },
        { message: "총총 달려왔어!", action: "runLeft" },
        { message: "왔어? 반가워!", action: "sparkle" },
        { message: "오늘도 귀엽지?", action: "spin" },
        { message: "다리 짧은 거 놀리지 마!", action: "nod" },
    ],
    playful: [
        { message: "더 더~!", action: "bounce" },
        { message: "기분 좋다!", action: "heart" },
        { message: "배 만져줘~!", action: "flip" },
        { message: "총총총 신나!", action: "dash" },
        { message: "나도 점프 할 수 있어!", action: "jump" },
        { message: "짧은 다리 매력이야!", action: "wiggle" },
        { message: "골골골~", action: "sparkle" },
        { message: "행복해!", action: "star" },
        { message: "한 번 더!", action: "bounce" },
    ],
    ticklish: [
        { message: "으냥! 간지러워!", action: "shrink" },
        { message: "다리 짧아서 도망 못 가!", action: "dash" },
        { message: "살살해줘~!", action: "flip" },
        { message: "한계야!", action: "spin" },
        { message: "총총 도망간다!", action: "runRight" },
        { message: "숨을 데가 없어!", action: "shrink" },
        { message: "간식 주면 용서!", action: "nod" },
        { message: "나중에 더~!", action: "runLeft" },
    ],
};

const MEMORIAL_MUNCHKIN: ModeReactions = {
    greeting: [
        { message: "총총총! 짧은 다리로 달려왔어!", action: "dash" },
        { message: "다리 짧아도 제일 먼저 왔지?", action: "runRight" },
        { message: "여기서도 제일 귀여운 건 나야!", action: "sparkle" },
        { message: "점프! ...는 좀 낮지만 마음은 높아!", action: "jump" },
        { message: "기다리다 총총 뛰었더니 헥헥", action: "wiggle" },
        { message: "발소리 들렸어! 총총총!", action: "bounce" },
        { message: "작아도 빠르다구!", action: "runLeft" },
        { message: "나 여기! 밑에! 여기!", action: "nod" },
    ],
    playful: [
        { message: "짧은 다리로 구름 위도 총총!", action: "dash" },
        { message: "여기서도 배 보여주고 자!", action: "flip" },
        { message: "계단 없어서 좋아! 다 평지야!", action: "star" },
        { message: "작은 발자국 남기며 돌아다녀!", action: "wiggle" },
        { message: "여기 간식이 무한이야!", action: "heart" },
        { message: "총총거리면 다들 귀여워해!", action: "bounce" },
        { message: "뛰다가 넘어져도 안 아파!", action: "spin" },
        { message: "숨바꼭질은 내가 늘 져!", action: "shrink" },
    ],
    ticklish: [
        { message: "총총총 달려가서 만나자!", action: "dash" },
        { message: "짧은 다리로 열심히 기다릴게!", action: "wiggle" },
        { message: "만나면 배 만져줘! 약속!", action: "flip" },
        { message: "여기서 제일 작은 게 나야!", action: "nod" },
        { message: "다리 짧아도 마음은 길어!", action: "heart" },
        { message: "총총총 제일 빠르게 달려갈게!", action: "runRight" },
        { message: "작은 발로 꼭 안아줄게!", action: "bounce" },
        { message: "우리 만나면 같이 구를 거야!", action: "spin" },
    ],
};

// ============================================================================
// 코리안숏헤어 — 영리/독립적/도도하지만 정 많음. 골목대장 느낌.
// ============================================================================

const DAILY_KOREAN_SHORTHAIR: ModeReactions = {
    greeting: [
        { message: "야옹~", action: "nod" },
        { message: "왔어? 나 바빴거든", action: "flip" },
        { message: "오늘도 왔네", action: "wiggle" },
        { message: "반갑다~", action: "heart" },
        { message: "나 여기 있었어", action: "bounce" },
        { message: "뭐 가져왔어?", action: "sparkle" },
        { message: "안녕!", action: "jump" },
        { message: "나 혼자서도 잘 놀아", action: "spin" },
        { message: "쓰담 한 번 허락!", action: "nod" },
        { message: "같이 있자~", action: "heart" },
    ],
    playful: [
        { message: "기분 좋다~", action: "wiggle" },
        { message: "더 해도 돼", action: "nod" },
        { message: "나 사실 좋아하는 거야", action: "heart" },
        { message: "골골골~", action: "bounce" },
        { message: "귀 뒤 긁어줘!", action: "sparkle" },
        { message: "좋아~ 더!", action: "jump" },
        { message: "행복해~", action: "star" },
        { message: "오늘은 기분 좋은 날!", action: "spin" },
        { message: "간식 시간?", action: "flip" },
    ],
    ticklish: [
        { message: "야! 그만!", action: "shrink" },
        { message: "허락 안 했거든?", action: "flip" },
        { message: "도망간다!", action: "dash" },
        { message: "한계야~", action: "spin" },
        { message: "살살 해!", action: "shrink" },
        { message: "간식으로 사과해", action: "nod" },
        { message: "높은 데로 올라간다!", action: "jump" },
        { message: "나중에 해줘~", action: "runLeft" },
    ],
};

const MEMORIAL_KOREAN_SHORTHAIR: ModeReactions = {
    greeting: [
        { message: "흥, 기다린 거 아니야... 그냥 있었을 뿐이야", action: "flip" },
        { message: "왔어? 뭐, 올 줄 알았어", action: "nod" },
        { message: "골목 순찰 중이었어! 네 냄새 맡았어", action: "dash" },
        { message: "...사실 매일 이쪽 보고 있었어", action: "heart" },
        { message: "나 여기 대장이야! 반갑다!", action: "sparkle" },
        { message: "이 동네 제일 좋은 자리 잡았어", action: "bounce" },
        { message: "어슬렁어슬렁~ 왔어?", action: "wiggle" },
        { message: "담장 위에서 봤어!", action: "jump" },
    ],
    playful: [
        { message: "여기서도 골목대장이야!", action: "dash" },
        { message: "매일 순찰 돌아! 내 구역이거든", action: "runRight" },
        { message: "담장 위에서 별 세는 게 취미야", action: "star" },
        { message: "쥐 잡기? 여기선 나비 잡아!", action: "spin" },
        { message: "혼자여도 안 외로워... 근데 와줘서 좋아", action: "heart" },
        { message: "도도한 거지 차가운 거 아니야!", action: "nod" },
        { message: "제일 높은 담장이 내 특등석이야", action: "jump" },
        { message: "여기 참치 안 줘도 돼... 있으면 좋긴 해", action: "flip" },
    ],
    ticklish: [
        { message: "만나면 골목 안내해줄게! 내 구역이야", action: "dash" },
        { message: "담장 위에서 씩씩하게 기다릴게!", action: "jump" },
        { message: "안 기다린다고... 거짓말이야 기다려", action: "nod" },
        { message: "여기서 제일 당당한 게 나야!", action: "sparkle" },
        { message: "만나면 옆자리 내줄게... 특별히!", action: "heart" },
        { message: "어슬렁거리며 기다리는 거야!", action: "wiggle" },
        { message: "내 순찰 구역에서 꼭 만나자!", action: "runLeft" },
        { message: "제일 멋진 석양 보이는 데 알려줄게!", action: "star" },
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
        { message: "또 왔어? 기다렸어!", action: "jump" },
        { message: "나 여기 있었어~", action: "heart" },
        { message: "보고 싶었어!", action: "wiggle" },
        { message: "반가워!", action: "bounce" },
        { message: "왔구나~", action: "nod" },
        { message: "여기야!", action: "sparkle" },
        { message: "기다렸어!", action: "runRight" },
        { message: "오늘도 왔어!", action: "dash" },
    ],
    playful: [
        { message: "나 잘 지내고 있어!", action: "wiggle" },
        { message: "오늘 잘 지냈어?", action: "nod" },
        { message: "잘하고 있어!", action: "star" },
        { message: "응원할게!", action: "bounce" },
        { message: "힘내~!", action: "jump" },
        { message: "너 오늘도 잘했어!", action: "heart" },
        { message: "여기서 지켜보고 있어!", action: "sparkle" },
        { message: "내가 응원해!", action: "dash" },
    ],
    ticklish: [
        { message: "언젠가 또 만나자!", action: "spin" },
        { message: "여기서 기다릴게!", action: "nod" },
        { message: "행복하게 살아!", action: "jump" },
        { message: "우린 늘 함께야!", action: "wiggle" },
        { message: "꼭 다시 만나!", action: "heart" },
        { message: "행복해야 해!", action: "runLeft" },
        { message: "기다릴게, 천천히 와", action: "star" },
        { message: "우리 다시 만날 거야!", action: "dash" },
    ],
};

// ============================================================================
// 햄스터
// ============================================================================

const DAILY_HAMSTER: ModeReactions = {
    greeting: [
        { message: "쪼꼼쪼꼼... 왔구나!", action: "wiggle" },
        { message: "볼주머니에 간식 숨겨뒀어!", action: "bounce" },
        { message: "쳇바퀴 한 바퀴 돌고 왔어~", action: "runRight" },
        { message: "안녕! 오늘도 빙글빙글!", action: "spin" },
        { message: "까꿍! 숨어있었어!", action: "jump" },
        { message: "뒹굴뒹굴~ 심심했어!", action: "wiggle" },
        { message: "해바라기씨 먹을래?", action: "nod" },
        { message: "냠냠... 아 왔어?", action: "heart" },
    ],
    playful: [
        { message: "볼주머니 빵빵! 만져볼래?", action: "bounce" },
        { message: "쳇바퀴 같이 돌자~!", action: "spin" },
        { message: "굴 파는 중이야! 방해 마!", action: "dash" },
        { message: "간식 더 줘! 숨길 데가 있어!", action: "wiggle" },
        { message: "뒤로 구르기 할 수 있어! 봐봐!", action: "runLeft" },
        { message: "손 위에 올려줘~ 따뜻해!", action: "heart" },
        { message: "이불 속이 최고야~", action: "nod" },
        { message: "톱밥 위에서 뒹굴뒹굴!", action: "jump" },
    ],
    ticklish: [
        { message: "꾸벅... 졸려...", action: "nod" },
        { message: "볼주머니 다 비웠어... 피곤...", action: "wiggle" },
        { message: "이불 속으로... 들어갈래...", action: "star" },
        { message: "쳇바퀴 그만... 쉴래...", action: "bounce" },
        { message: "해바라기씨 하나만 더...", action: "heart" },
        { message: "꾸르르... 자는 중...", action: "spin" },
        { message: "톱밥 이불 덮고 잘게~", action: "nod" },
        { message: "내일 또 놀자... 꾸벅", action: "sparkle" },
    ],
};

const MEMORIAL_HAMSTER: ModeReactions = {
    greeting: [
        { message: "볼주머니에 네 마음 담아뒀어", action: "heart" },
        { message: "쳇바퀴 위에서 너 기다렸어", action: "nod" },
        { message: "작지만 따뜻했던 거 알지?", action: "wiggle" },
        { message: "손바닥 위 온기, 아직 기억나", action: "sparkle" },
        { message: "해바라기씨 향기에 네가 떠올라", action: "bounce" },
        { message: "작은 발로 달려가고 싶었어", action: "runRight" },
        { message: "여기서 빙글빙글 돌고 있을게", action: "spin" },
        { message: "톱밥 냄새 나면 나를 떠올려줘", action: "star" },
    ],
    playful: [
        { message: "네 손 위가 세상에서 제일 좋았어", action: "heart" },
        { message: "작은 몸으로 크게 사랑했어", action: "wiggle" },
        { message: "볼주머니 가득 행복을 담았었어", action: "bounce" },
        { message: "너랑 보낸 시간이 내 전부야", action: "nod" },
        { message: "쳇바퀴 소리 들리면 나라고 생각해", action: "spin" },
        { message: "짧았지만 따뜻했어, 정말로", action: "sparkle" },
        { message: "작은 발자국도 사랑의 흔적이야", action: "star" },
        { message: "굴 속에서 행복했어, 네 덕분에", action: "dash" },
    ],
    ticklish: [
        { message: "작아도 네 마음속엔 클 거야", action: "heart" },
        { message: "볼주머니에 추억 한가득 담아갈게", action: "wiggle" },
        { message: "무지개다리 쳇바퀴도 잘 돌아가", action: "spin" },
        { message: "여기서 해바라기씨 먹으며 기다릴게", action: "nod" },
        { message: "다시 만나면 네 손 위로 올라갈게", action: "jump" },
        { message: "작은 심장으로 크게 뛰었어", action: "bounce" },
        { message: "우리 다시 만나면 빙글빙글 돌자", action: "star" },
        { message: "여기서도 뒹굴뒹굴하고 있을게", action: "sparkle" },
    ],
};

// ============================================================================
// 레오파드게코
// ============================================================================

const DAILY_GECKO: ModeReactions = {
    greeting: [
        { message: "...눈만 깜빡...", action: "nod" },
        { message: "꼬리 흔들흔들~ 기분 좋아!", action: "wiggle" },
        { message: "따뜻한 돌 위에 있었어~", action: "heart" },
        { message: "핥핥... 안녕!", action: "bounce" },
        { message: "느릿느릿... 왔구나!", action: "runRight" },
        { message: "배 깔고 쉬고 있었어!", action: "nod" },
        { message: "눈 크게 떠서 봐주는 거야~", action: "sparkle" },
        { message: "꼬리 통통! 잘 먹고 있어!", action: "jump" },
    ],
    playful: [
        { message: "벽 타기 할 줄 안다고!", action: "dash" },
        { message: "귀뚜라미 잡기 시합하자!", action: "runLeft" },
        { message: "꼬리 잡지 마! 떨어져!", action: "wiggle" },
        { message: "핥핥... 손가락 맛있어?", action: "heart" },
        { message: "은신처에서 까꿍!", action: "jump" },
        { message: "눈 돌리는 거 봤어? 동시에!", action: "spin" },
        { message: "배 색깔 예쁘지? 주황이야!", action: "bounce" },
        { message: "밤에 더 활발해질 거야!", action: "star" },
    ],
    ticklish: [
        { message: "...zzz 따뜻해서 졸려...", action: "nod" },
        { message: "은신처 들어갈래...", action: "wiggle" },
        { message: "조용히 해... 야행성이야...", action: "star" },
        { message: "꼬리에 영양분 저장 중...", action: "bounce" },
        { message: "핥... 마지막 인사...", action: "heart" },
        { message: "돌 위에서 잘게...", action: "nod" },
        { message: "내일 밤에 또 놀자...", action: "sparkle" },
        { message: "눈만 감을게... 반쯤...", action: "spin" },
    ],
};

const MEMORIAL_GECKO: ModeReactions = {
    greeting: [
        { message: "따뜻한 손 위가 좋았어", action: "heart" },
        { message: "느릿느릿 걸어가도 기다려줬지", action: "nod" },
        { message: "큰 눈으로 널 지켜보고 있었어", action: "sparkle" },
        { message: "조용했지만 옆에 있고 싶었어", action: "wiggle" },
        { message: "네 체온이 내 히터였어", action: "bounce" },
        { message: "은신처에서 몰래 봤었어, 항상", action: "star" },
        { message: "꼬리 흔들어 인사했던 거 알아?", action: "runRight" },
        { message: "작은 발로 네 손을 걸었던 밤들", action: "heart" },
    ],
    playful: [
        { message: "말없이 옆에 있어도 편했잖아", action: "nod" },
        { message: "느린 게 싫지 않았다고 해줘서 고마워", action: "heart" },
        { message: "꼬리 통통했을 때 기뻐해줬지", action: "wiggle" },
        { message: "핥아줬던 건 사랑이었어", action: "bounce" },
        { message: "밤마다 네 숨소리 듣고 있었어", action: "sparkle" },
        { message: "차가운 피였지만 마음은 따뜻했어", action: "star" },
        { message: "조용한 사랑도 사랑이야", action: "spin" },
        { message: "네 손바닥 온도를 아직 기억해", action: "dash" },
    ],
    ticklish: [
        { message: "여기서도 따뜻한 곳을 찾았어", action: "heart" },
        { message: "느릿느릿 무지개다리 건넜어", action: "nod" },
        { message: "큰 눈으로 여기서도 지켜볼게", action: "sparkle" },
        { message: "꼬리 잘 간직하고 기다릴게", action: "wiggle" },
        { message: "다시 만나면 네 손 위로 올라갈게", action: "jump" },
        { message: "조용하지만 항상 네 편이야", action: "bounce" },
        { message: "밤하늘에서 반짝이고 있을게", action: "star" },
        { message: "여기 돌도 따뜻해, 걱정 마", action: "spin" },
    ],
};

// ============================================================================
// 앵무새
// ============================================================================

const DAILY_PARROT: ModeReactions = {
    greeting: [
        { message: "안녕! 안녕! 안녕!", action: "bounce" },
        { message: "삐약! 왔구나!", action: "jump" },
        { message: "머리 긁어줘~ 여기여기!", action: "wiggle" },
        { message: "노래 들려줄까? 삐요삐요~", action: "spin" },
        { message: "어깨 위에 올라갈래!", action: "runRight" },
        { message: "간식! 간식! 해바라기씨!", action: "dash" },
        { message: "깃털 예쁘지? 초록이야!", action: "sparkle" },
        { message: "따라해봐~ 안녕!", action: "heart" },
    ],
    playful: [
        { message: "머리 위에 착지! 성공!", action: "jump" },
        { message: "노래 배웠어! 들어볼래?", action: "spin" },
        { message: "날개 펄럭! 바람 느껴져?", action: "dash" },
        { message: "뽀뽀! 쪽~!", action: "heart" },
        { message: "숨바꼭질! 커튼 뒤에 있었어!", action: "wiggle" },
        { message: "발로 간식 잡는 거 봤어?", action: "bounce" },
        { message: "거울 속 친구랑 놀고 있었어!", action: "star" },
        { message: "삐약삐약! 신났어!", action: "runLeft" },
    ],
    ticklish: [
        { message: "푸드득... 졸려...", action: "nod" },
        { message: "깃털 속에 머리 넣을게...", action: "wiggle" },
        { message: "횃대 위에서 잘게...", action: "star" },
        { message: "한쪽 발로 서서 자는 거야...", action: "bounce" },
        { message: "꾸욱... 눈 감을게...", action: "heart" },
        { message: "내일 또 노래해줄게...", action: "nod" },
        { message: "깃털 부풀리고 잘 거야~", action: "sparkle" },
        { message: "삐...요... zzz", action: "spin" },
    ],
};

const MEMORIAL_PARROT: ModeReactions = {
    greeting: [
        { message: "네 목소리를 제일 잘 따라했었어", action: "heart" },
        { message: "어깨 위가 세상에서 제일 좋았어", action: "nod" },
        { message: "불러줬던 노래 아직 기억해", action: "sparkle" },
        { message: "이름 불러주면 항상 대답했잖아", action: "wiggle" },
        { message: "깃털 색이 네 옷에 묻었었지", action: "bounce" },
        { message: "창밖 보면서 네 발소리 기다렸어", action: "star" },
        { message: "머리 긁어줄 때가 제일 행복했어", action: "runRight" },
        { message: "삐약 한 번이 사랑한다는 뜻이었어", action: "heart" },
    ],
    playful: [
        { message: "네 어깨에서 본 세상이 전부였어", action: "nod" },
        { message: "따라한 건 목소리만이 아니었어", action: "heart" },
        { message: "노래로 고마움을 전하고 싶었어", action: "sparkle" },
        { message: "작은 새장이 넓게 느껴졌던 건 네 덕분", action: "wiggle" },
        { message: "깃털 하나 남겨놓고 싶었어", action: "star" },
        { message: "시끄럽게 굴어서 미안해, 외로워서 그랬어", action: "bounce" },
        { message: "간식보다 네 손이 더 좋았어", action: "dash" },
        { message: "아침마다 깨워줬던 게 그리울 거야", action: "spin" },
    ],
    ticklish: [
        { message: "여기서도 네 이름 부르고 있어", action: "heart" },
        { message: "무지개 깃털로 날아왔어", action: "sparkle" },
        { message: "여기선 맘껏 날 수 있어", action: "jump" },
        { message: "다시 만나면 어깨 위로 갈게", action: "wiggle" },
        { message: "네 노래 여기서도 따라 부를게", action: "spin" },
        { message: "하늘에서 삐약 들리면 나야", action: "bounce" },
        { message: "초록 깃털 떨어지면 인사하는 거야", action: "star" },
        { message: "기다릴게, 노래하면서", action: "nod" },
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
    pomeranian:      { daily: DAILY_POMERANIAN,   memorial: MEMORIAL_POMERANIAN },
    bichon:          { daily: DAILY_BICHON,       memorial: MEMORIAL_BICHON },
    corgi:           { daily: DAILY_CORGI,        memorial: MEMORIAL_CORGI },
    shiba:           { daily: DAILY_SHIBA,        memorial: MEMORIAL_SHIBA },
    scottish_fold:   { daily: DAILY_SCOTTISH_FOLD, memorial: MEMORIAL_SCOTTISH_FOLD },
    bengal:          { daily: DAILY_BENGAL,        memorial: MEMORIAL_BENGAL },
    munchkin:        { daily: DAILY_MUNCHKIN,      memorial: MEMORIAL_MUNCHKIN },
    korean_shorthair:{ daily: DAILY_KOREAN_SHORTHAIR, memorial: MEMORIAL_KOREAN_SHORTHAIR },
    hamster:         { daily: DAILY_HAMSTER,          memorial: MEMORIAL_HAMSTER },
    gecko:           { daily: DAILY_GECKO,            memorial: MEMORIAL_GECKO },
    parrot:          { daily: DAILY_PARROT,           memorial: MEMORIAL_PARROT },
};

export const REACTIONS_DEFAULT: ReactionsByMode = {
    daily: DAILY_DEFAULT,
    memorial: MEMORIAL_DEFAULT,
};

/**
 * 미니미 반응 선택.
 * 같은 미니미가 같은 메시지 연속 노출되면 중복감↑ → "최근 N개" 캐시로 회피.
 *
 * @param slug 미니미 slug
 * @param mode "daily" | "memorial"
 * @param consecutiveCount 연속 터치 횟수 (1부터)
 */

// slug+mode 별로 최근 사용한 메시지 N개 추적 (동일 풀에서 다시 안 뽑힘)
const recentMessages = new Map<string, string[]>();
const RECENT_WINDOW = 4; // 최근 4개는 회피

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

    const key = `${slug}_${mode}_${level}`;
    const recent = recentMessages.get(key) ?? [];
    // 풀이 작으면(<=2개) 회피 어려우니 그냥 랜덤
    const candidates = pool.length > 2
        ? pool.filter((r) => !recent.includes(r.message))
        : pool;
    const choice = (candidates.length > 0 ? candidates : pool)[
        Math.floor(Math.random() * (candidates.length > 0 ? candidates.length : pool.length))
    ];
    // 최근 목록 갱신
    const nextRecent = [choice.message, ...recent].slice(0, RECENT_WINDOW);
    recentMessages.set(key, nextRecent);
    return choice;
}
