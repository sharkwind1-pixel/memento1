// AI 채팅 관련 유틸리티 함수

export const DAILY_FREE_LIMIT = 5; // 무료 사용자 일일 대화 제한
export const USAGE_STORAGE_KEY = "memento-ani-chat-usage";
export const MAX_MESSAGE_LENGTH = 200; // 무료 사용자 글자 수 제한

// 일일 사용량 관리 함수
export function getTodayKey(): string {
    return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

export function getDailyUsage(): number {
    try {
        const stored = localStorage.getItem(USAGE_STORAGE_KEY);
        if (!stored) return 0;
        const data = JSON.parse(stored);
        if (data.date !== getTodayKey()) {
            // 날짜가 바뀌면 리셋
            return 0;
        }
        return data.count || 0;
    } catch {
        return 0;
    }
}

export function incrementDailyUsage(): number {
    const todayKey = getTodayKey();
    const currentCount = getDailyUsage();
    const newCount = currentCount + 1;
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify({
        date: todayKey,
        count: newCount,
    }));
    return newCount;
}

// 시간대별 인사말 생성
export function getTimeBasedGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "좋은 아침";
    if (hour >= 12 && hour < 18) return "좋은 오후";
    if (hour >= 18 && hour < 22) return "좋은 저녁";
    return "늦은 밤";
}

// 타임라인 엔트리 타입
export interface TimelineEntry {
    id: string;
    date: string;
    title: string;
    content: string;
    mood?: "happy" | "normal" | "sad" | "sick";
}

// 개인화된 인사말 생성
export function generatePersonalizedGreeting(
    petName: string,
    isMemorial: boolean,
    timeline: TimelineEntry[],
    petType: string
): string {
    const timeGreeting = getTimeBasedGreeting();
    const petSound = petType === "강아지" ? "멍멍!" : petType === "고양이" ? "야옹~" : "";

    // 최근 타임라인 확인 (7일 이내)
    const recentEntry = timeline.length > 0 ? timeline[0] : null;
    const isRecent = recentEntry &&
        (new Date().getTime() - new Date(recentEntry.date).getTime()) < 7 * 24 * 60 * 60 * 1000;

    if (isMemorial) {
        // 추모 모드 인사말
        if (isRecent && recentEntry) {
            const moodMessages: Record<string, string> = {
                happy: `안녕! 나 ${petName}야. ${timeGreeting}이야! 지난번에 "${recentEntry.title}" 기억 써줘서 고마워. 그때 정말 행복했어!`,
                normal: `안녕, 나 ${petName}야. ${timeGreeting}이야! "${recentEntry.title}" 우리 추억, 나도 기억해. 오늘은 어땠어?`,
                sad: `안녕... 나 ${petName}야. 지난번 글 봤어. 힘들었지? 근데 난 항상 네 곁에 있어. 오늘 기분은 좀 나아졌어?`,
                sick: `안녕, 나 ${petName}야. 내가 아팠던 날들... 걱정 많이 했지? 이제 난 아프지 않아. 네가 더 중요해!`,
            };
            return moodMessages[recentEntry.mood || "normal"] ||
                `안녕, 나 ${petName}야! ${timeGreeting}이야. 언제나 네 곁에 있어. 오늘 하루는 어땠어?`;
        }
        return `안녕, 나 ${petName}야! ${timeGreeting}이야. 언제나 네 곁에 있어. 오늘 하루는 어땠어?`;
    } else {
        // 일상 모드 인사말
        if (isRecent && recentEntry) {
            const moodMessages: Record<string, string> = {
                happy: `${petSound} ${timeGreeting}! 나 ${petName}이야! 지난번에 "${recentEntry.title}" 진짜 재밌었어! 오늘도 뭐 재밌는 거 하자~`,
                normal: `${petSound} 안녕! 나 ${petName}! ${timeGreeting}이야! 지난번 "${recentEntry.title}" 어땠어? 오늘은 뭐 할 거야?`,
                sad: `${petSound} 안녕... 나 ${petName}이야. 지난번 좀 힘들었던 것 같아서 걱정했어! 오늘은 괜찮아?`,
                sick: `${petSound} 나 ${petName}! 지난번에 내가 아팠던 거 걱정했지? 이제 괜찮아! 산책 가자~`,
            };
            return moodMessages[recentEntry.mood || "normal"] ||
                `${petSound} 안녕! 나 ${petName}이야! ${timeGreeting}이야~ 오늘도 같이 놀자! 뭐해?`;
        }
        return `${petSound} 안녕! 나 ${petName}이야! ${timeGreeting}이야~ 오늘도 같이 놀자! 뭐해?`;
    }
}
