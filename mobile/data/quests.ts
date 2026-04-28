/**
 * 미션 정의 (모바일)
 * 웹 src/config/constants.ts의 DAILY_QUESTS / MEMORIAL_QUESTS와 1:1 동기화.
 */

export type QuestId =
    | "register_pet" | "upload_photo" | "first_chat" | "first_timeline" | "first_post"
    | "memorial_register" | "memorial_chat" | "memorial_message" | "memorial_album";

export interface QuestDef {
    id: QuestId;
    title: string;
    description: string;
    actionLabel: string;
    targetTab: string;
    bonusPoints: number;
    nextQuestId?: QuestId;
}

export const DAILY_QUESTS: QuestDef[] = [
    { id: "register_pet", title: "우리 아이 등록하기", description: "함께하는 가족을 메멘토애니에 소개해주세요", actionLabel: "지금 등록하기", targetTab: "record", bonusPoints: 0, nextQuestId: "upload_photo" },
    { id: "upload_photo", title: "첫 사진 올리기", description: "우리 아이의 모습을 기록으로 남겨보세요", actionLabel: "사진 올리기", targetTab: "record", bonusPoints: 20, nextQuestId: "first_chat" },
    { id: "first_chat", title: "AI 펫톡으로 대화하기", description: "우리 아이의 목소리를 들어볼 시간이에요", actionLabel: "대화 시작하기", targetTab: "ai-chat", bonusPoints: 20, nextQuestId: "first_timeline" },
    { id: "first_timeline", title: "타임라인 첫 기록 남기기", description: "오늘의 작은 순간도 추억이 됩니다", actionLabel: "기록하기", targetTab: "record", bonusPoints: 20, nextQuestId: "first_post" },
    { id: "first_post", title: "커뮤니티에 첫 인사하기", description: "다른 보호자들과 일상을 나눠보세요", actionLabel: "인사하러 가기", targetTab: "community", bonusPoints: 50 },
];

export const MEMORIAL_QUESTS: QuestDef[] = [
    { id: "memorial_register", title: "아이를 메멘토애니에 모셔오기", description: "소중한 추억을 함께 간직해요", actionLabel: "시작하기", targetTab: "record", bonusPoints: 0, nextQuestId: "memorial_chat" },
    { id: "memorial_chat", title: "AI 펫톡에서 인사 나누기", description: "그 따뜻한 목소리를 다시 만나보세요", actionLabel: "이야기 나누기", targetTab: "ai-chat", bonusPoints: 20, nextQuestId: "memorial_message" },
    { id: "memorial_message", title: "추모 메시지 남기기", description: "오늘 마음에 떠오른 이야기를 적어보세요", actionLabel: "메시지 쓰기", targetTab: "record", bonusPoints: 20, nextQuestId: "memorial_album" },
    { id: "memorial_album", title: "추억 앨범 만들어보기", description: "함께한 시간을 한 권의 책으로", actionLabel: "앨범 만들기", targetTab: "record", bonusPoints: 50 },
];

/**
 * progress 객체에서 다음 미션 + 진척도 계산 (웹 useQuests와 동일 로직)
 * progress: { [questId]: ISO date string }
 */
export function computeQuestState(
    progress: Record<string, string>,
    isMemorialMode: boolean,
): {
    quests: QuestDef[];
    completedCount: number;
    totalCount: number;
    currentQuest: QuestDef | null;
    isAllDone: boolean;
} {
    const quests = isMemorialMode ? MEMORIAL_QUESTS : DAILY_QUESTS;
    const completedCount = quests.filter((q) => progress[q.id]).length;
    const totalCount = quests.length;
    const currentQuest = quests.find((q) => !progress[q.id]) ?? null;
    const isAllDone = currentQuest === null;
    return { quests, completedCount, totalCount, currentQuest, isAllDone };
}
