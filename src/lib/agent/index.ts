/**
 * agent/index.ts - 배럴 재수출
 *
 * 모든 agent 모듈의 public API를 하나로 모아 재수출한다.
 * 소비자는 기존처럼 `import { ... } from "@/lib/agent"` 로 사용 가능.
 */

// 감정 분석 시스템
export {
    quickEmotionAnalysis,
    analyzeGriefStage,
    analyzeEmotion,
    getEmotionResponseGuide,
    getGriefStageResponseGuide,
} from "./emotion";
export type { EmotionAnalysis } from "./emotion";
export type { EmotionType, GriefStage } from "./emotion";

// 메모리 시스템 (장기 기억 + 대화 메시지)
export {
    extractMemories,
    getRecentMessages,
    getPetMemories,
    getRelevantMemories,
    getLatestPendingTopic,
    saveMessage,
    saveMemory,
    memoriesToContext,
} from "./memory";
export type { PetMemory, ExtractedMemory } from "./memory";

// 리마인더 시스템
export {
    saveReminder,
    getReminders,
    getDueReminders,
    markReminderTriggered,
    deleteReminder,
    toggleReminder,
    suggestReminderFromChat,
} from "./reminders";
export type { PetReminder } from "./reminders";

// 대화 맥락 유지 시스템
export {
    generateConversationSummary,
    saveConversationSummary,
    getRecentSummaries,
    summariesToContext,
    saveAutoTimelineEntry,
    buildConversationContext,
} from "./conversation";
export type { ConversationSummary } from "./conversation";

// 순수 유틸
export {
    fixKoreanParticles,
} from "./helpers";
