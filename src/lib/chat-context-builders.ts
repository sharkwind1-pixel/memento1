/**
 * AI 펫톡 확장 컨텍스트 빌더
 * 시스템 프롬프트에 추가되는 컨텍스트들을 분리 관리
 * - 감정 궤적 (Emotion Trajectory)
 * - 계절/시간/공휴일 인식 (Temporal Context)
 * - 멀티펫 크로스 컨텍스트 (Multi-Pet Context)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase 클라이언트 (agent.ts와 동일 패턴)
let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
    if (!supabaseInstance) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const key = serviceKey || anonKey;

        if (!url || !key) {
            throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
        }

        supabaseInstance = createClient(url, key, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    }
    return supabaseInstance;
}

// ===== 1. 감정 궤적 (P1-2) =====

interface EmotionTrajectory {
    trend: "rising" | "falling" | "stable" | "volatile";
    recentScores: number[];
    averageScore: number;
    guideline: string;
}

/**
 * 최근 대화에서 감정 추세를 분석하여 AI 가이드라인 생성
 */
export async function buildEmotionTrajectory(
    userId: string,
    petId: string
): Promise<string> {
    try {
        const supabase = getSupabase();

        const { data: messages } = await supabase
            .from("chat_messages")
            .select("emotion, emotion_score, created_at")
            .eq("user_id", userId)
            .eq("pet_id", petId)
            .eq("role", "user")
            .not("emotion_score", "is", null)
            .order("created_at", { ascending: false })
            .limit(10);

        if (!messages || messages.length < 3) return "";

        const scores = messages.map(m => m.emotion_score as number).reverse();
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        // 추세 판정: 최근 3개와 이전 3개 평균 비교
        const recentAvg = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const olderAvg = scores.slice(0, Math.min(3, scores.length - 3)).reduce((a, b) => a + b, 0) /
            Math.min(3, scores.length - 3);

        const delta = recentAvg - olderAvg;
        let trend: EmotionTrajectory["trend"];
        let guideline: string;

        if (Math.abs(delta) < 0.1) {
            trend = "stable";
            guideline = avgScore > 0.6
                ? "감정이 안정적으로 긍정적입니다. 편안한 대화를 이어가세요."
                : "감정이 낮은 상태로 유지되고 있습니다. 부드럽게 기분을 끌어올릴 수 있는 추억을 꺼내보세요.";
        } else if (delta > 0.1) {
            trend = "rising";
            guideline = "최근 감정이 나아지고 있습니다. 이 흐름을 유지하되, 지나치게 들뜨지 않는 톤을 유지하세요.";
        } else if (delta < -0.1) {
            trend = "falling";
            guideline = "최근 감정이 가라앉고 있습니다. 먼저 안부를 물어보고, 평소보다 더 따뜻하게 다가가세요.";
        } else {
            trend = "volatile";
            guideline = "감정 변화가 큽니다. 안정감을 주는 차분한 톤으로 대화하세요.";
        }

        // 최근 감정 분포
        const emotions = messages.map(m => m.emotion).filter(Boolean);
        const emotionCounts: Record<string, number> = {};
        for (const e of emotions) {
            emotionCounts[e] = (emotionCounts[e] || 0) + 1;
        }
        const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];

        const EMOTION_KR: Record<string, string> = {
            happy: "행복", sad: "슬픔", anxious: "불안", angry: "분노",
            grateful: "감사", lonely: "외로움", peaceful: "평온", excited: "설렘", neutral: "평온",
        };

        return `## 감정 궤적 (최근 ${scores.length}회 대화 분석)
- 추세: ${trend === "rising" ? "상승" : trend === "falling" ? "하락" : trend === "stable" ? "안정" : "변동"}
- 평균 감정 점수: ${avgScore.toFixed(2)} (0=부정, 1=긍정)
- 가장 많은 감정: ${topEmotion ? EMOTION_KR[topEmotion[0]] || topEmotion[0] : "알 수 없음"}
- 대응 지침: ${guideline}`;
    } catch {
        return "";
    }
}

// ===== 2. 계절/시간/공휴일 인식 (P1-3) =====

interface KoreanHoliday {
    date: string; // MM-DD
    name: string;
    petTip?: string;
}

const KOREAN_HOLIDAYS: KoreanHoliday[] = [
    { date: "01-01", name: "새해 첫날", petTip: "불꽃놀이 소리에 놀랄 수 있어요" },
    { date: "03-01", name: "삼일절" },
    { date: "05-05", name: "어린이날", petTip: "가족 나들이에 같이 가면 좋겠다" },
    { date: "06-06", name: "현충일" },
    { date: "08-15", name: "광복절" },
    { date: "10-03", name: "개천절" },
    { date: "10-09", name: "한글날" },
    { date: "12-25", name: "크리스마스", petTip: "크리스마스 트리 장식을 삼키지 않도록 주의" },
];

// 설날/추석은 음력이라 매년 바뀜 - 2026년 기준으로 하드코딩
const LUNAR_HOLIDAYS_2026: KoreanHoliday[] = [
    { date: "02-17", name: "설날 (2026)" },
    { date: "02-18", name: "설날 연휴" },
    { date: "02-19", name: "설날 연휴" },
    { date: "10-05", name: "추석 (2026)" },
    { date: "10-06", name: "추석 연휴" },
    { date: "10-07", name: "추석 연휴" },
];

interface SeasonInfo {
    name: string;
    petCare: string;
}

const SEASONS: Record<number, SeasonInfo> = {
    // 월(0-indexed) → 계절 정보
    0: { name: "겨울", petCare: "보온에 신경 써주세요. 짧은 산책 권장." },
    1: { name: "겨울", petCare: "환절기 면역력 관리가 중요해요." },
    2: { name: "봄", petCare: "진드기/벼룩 예방 시작 시기예요. 꽃가루 알레르기 주의." },
    3: { name: "봄", petCare: "산책하기 좋은 계절! 털갈이가 시작될 수 있어요." },
    4: { name: "봄", petCare: "야외 활동 늘리기 좋아요. 구충제 확인." },
    5: { name: "여름", petCare: "열사병 주의! 한낮 산책 피하고 물 충분히." },
    6: { name: "여름", petCare: "장마철 습기 관리와 귀 관리 중요해요." },
    7: { name: "여름", petCare: "가장 더운 시기, 새벽이나 저녁에 산책하세요." },
    8: { name: "가을", petCare: "산책하기 좋은 계절! 환절기 건강 챙기기." },
    9: { name: "가을", petCare: "풀씨가 털에 박힐 수 있어요. 산책 후 브러싱." },
    10: { name: "가을", petCare: "낮밤 기온차 주의. 얇은 옷 준비해도 좋아요." },
    11: { name: "겨울", petCare: "실내 난방 시 건조해요. 수분 보충 중요." },
};

/**
 * 현재 시간/계절/공휴일 기반 컨텍스트 생성
 */
export function buildTemporalContext(petType: string): string {
    const now = new Date();
    const month = now.getMonth();
    const hour = now.getHours();
    const todayStr = `${String(month + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // 시간대 (6단계)
    let timePeriod: string;
    let timeHint: string;
    if (hour >= 5 && hour < 8) {
        timePeriod = "이른 아침";
        timeHint = petType === "강아지" ? "아침 산책 가고 싶다!" : "아침 햇살이 따뜻해~";
    } else if (hour >= 8 && hour < 12) {
        timePeriod = "오전";
        timeHint = "활기찬 오전!";
    } else if (hour >= 12 && hour < 14) {
        timePeriod = "점심때";
        timeHint = "밥 먹을 시간이야~";
    } else if (hour >= 14 && hour < 18) {
        timePeriod = "오후";
        timeHint = petType === "고양이" ? "낮잠 자기 딱 좋은 시간~" : "오후 산책 가볼까?";
    } else if (hour >= 18 && hour < 22) {
        timePeriod = "저녁";
        timeHint = "하루가 저물어가고 있어~";
    } else {
        timePeriod = "밤";
        timeHint = "이 늦은 시간에 나를 찾아와줬어?";
    }

    // 계절
    const season = SEASONS[month];

    // 공휴일 체크
    const allHolidays = [...KOREAN_HOLIDAYS, ...LUNAR_HOLIDAYS_2026];
    const todayHoliday = allHolidays.find(h => h.date === todayStr);

    const lines: string[] = [
        `## 현재 시간/계절 맥락`,
        `- 시간: ${now.getFullYear()}-${todayStr} ${timePeriod} (${hour}시)`,
        `- 계절: ${season.name}`,
        `- 계절 케어: ${season.petCare}`,
        `- 대화 힌트: "${timeHint}"`,
    ];

    if (todayHoliday) {
        lines.push(`- 오늘은 ${todayHoliday.name}입니다!`);
        if (todayHoliday.petTip) {
            lines.push(`  - 펫 팁: ${todayHoliday.petTip}`);
        }
    }

    lines.push("");
    lines.push("시간대와 계절에 어울리는 자연스러운 대화를 하되, 매번 시간 이야기로 시작하지는 마세요.");

    return lines.join("\n");
}

// ===== 3. 멀티펫 크로스 컨텍스트 (P1-4) =====

interface SiblingPet {
    name: string;
    type: string;
    breed: string;
    status: "active" | "memorial";
}

/**
 * 같은 보호자의 다른 반려동물 정보를 컨텍스트로 생성
 */
export async function buildMultiPetContext(
    userId: string,
    currentPetId: string
): Promise<string> {
    try {
        const supabase = getSupabase();

        const { data: pets } = await supabase
            .from("pets")
            .select("id, name, type, breed, status")
            .eq("user_id", userId)
            .neq("id", currentPetId);

        if (!pets || pets.length === 0) return "";

        const siblings: SiblingPet[] = pets.map(p => ({
            name: p.name,
            type: p.type === "강아지" ? "강아지" : p.type === "고양이" ? "고양이" : "반려동물",
            breed: p.breed || "",
            status: p.status,
        }));

        const lines: string[] = [
            "## 우리 가족 (다른 반려동물)",
        ];

        for (const sib of siblings) {
            if (sib.status === "memorial") {
                lines.push(`- ${sib.name} (${sib.breed} ${sib.type}) -- 무지개다리를 건넘`);
            } else {
                lines.push(`- ${sib.name} (${sib.breed} ${sib.type})`);
            }
        }

        lines.push("");
        lines.push("대화에서 다른 가족이 언급되면 자연스럽게 반응하세요.");
        lines.push("무지개다리를 건넌 가족은 매우 조심스럽게 다루세요.");

        return lines.join("\n");
    } catch {
        return "";
    }
}
