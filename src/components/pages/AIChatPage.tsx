/**
 * ============================================================================
 * AIChatPage.tsx
 * ============================================================================
 *
 * AI 펫톡 페이지 - 반려동물과 AI 대화 기능
 *
 * 주요 기능:
 * - 일상 모드: 건강 관리, 케어 알림, 일상 대화
 * - 추모 모드: 무지개다리를 건넌 반려동물과의 추억 대화
 * - 감정 인식 및 개인화된 응답
 * - 타임라인/사진 캡션 기반 맥락 이해
 *
 * 서브컴포넌트:
 * - useAIChat: 비즈니스 로직 커스텀 훅
 * - AIChatLoginPrompt: 비로그인 유도 화면
 * - AIChatNoPets: 펫 미등록 유도 화면
 * - AIChatHeader: 상단 헤더바
 * - PetProfileSidebar: 펫 프로필 사이드바
 * - ChatMessageList: 메시지 목록
 * - ChatInputArea: 입력 영역
 *
 * ============================================================================
 */

"use client";

/* eslint-disable @next/next/no-img-element */

// ============================================================================
// 임포트
// ============================================================================
import { usePets } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { Star } from "lucide-react";
import { TabType } from "@/types";
import DomeGallery from "@/components/ui/DomeGallery";
import MemoryPanel from "@/components/features/chat/MemoryPanel";
import EmotionTracker from "@/components/features/chat/EmotionTracker";
import ReminderPanel from "@/components/features/chat/ReminderPanel";
import PetProfileSidebar from "@/components/features/chat/PetProfileSidebar";
import ChatMessageList from "@/components/features/chat/ChatMessageList";
import ChatInputArea from "@/components/features/chat/ChatInputArea";
import { useAIChat } from "@/components/features/chat/useAIChat";
import AIChatLoginPrompt from "@/components/features/chat/AIChatLoginPrompt";
import AIChatNoPets from "@/components/features/chat/AIChatNoPets";
import AIChatHeader from "@/components/features/chat/AIChatHeader";

// ============================================================================
// 타입 정의
// ============================================================================

/** AI 펫톡 페이지 Props */
interface AIChatPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AIChatPage({ setSelectedTab }: AIChatPageProps) {
    // ========================================================================
    // Context & Hooks
    // ========================================================================
    const { user, isPremiumUser } = useAuth();
    const {
        pets,
        selectedPetId,
        selectedPet,
        selectPet,
        timeline,
        fetchTimeline,
    } = usePets();

    const chat = useAIChat({
        user,
        isPremium: isPremiumUser,
        pets,
        selectedPetId,
        selectedPet,
        timeline,
        fetchTimeline,
    });

    // ========================================================================
    // 조건부 렌더링: 비로그인
    // ========================================================================
    if (!user) {
        return <AIChatLoginPrompt />;
    }

    // ========================================================================
    // 조건부 렌더링: 펫 미등록
    // ========================================================================
    if (pets.length === 0) {
        return <AIChatNoPets />;
    }

    // ========================================================================
    // 메인 채팅 UI
    // ========================================================================
    return (
        <div
            className={`min-h-screen flex flex-col relative overflow-hidden transition-all duration-500 ${
                chat.isMemorialMode
                    ? "bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950 dark:via-orange-950 dark:to-gray-900"
                    : "bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
            }`}
        >
            {/* 상단 DomeGallery - 3D 사진 갤러리 */}
            {chat.galleryImages.length > 0 && (
                <div
                    className={`flex-shrink-0 h-[180px] relative overflow-hidden ${
                        chat.isMemorialMode
                            ? "bg-gradient-to-b from-amber-100 to-amber-50"
                            : "bg-gradient-to-b from-sky-100 to-sky-50"
                    }`}
                >
                    <DomeGallery
                        images={chat.galleryImages}
                        fit={0.4}
                        minRadius={250}
                        maxVerticalRotationDeg={2}
                        segments={20}
                        dragDampening={1.5}
                        grayscale={false}
                        overlayBlurColor={
                            chat.isMemorialMode ? "#fef3c7" : "#e0f2fe"
                        }
                        imageBorderRadius="12px"
                        openedImageBorderRadius="16px"
                    />
                    {/* 하단 그라데이션 페이드 */}
                    <div
                        className={`absolute bottom-0 left-0 right-0 h-12 pointer-events-none ${
                            chat.isMemorialMode
                                ? "bg-gradient-to-t from-amber-50 to-transparent"
                                : "bg-gradient-to-t from-[#F0F9FF] to-transparent"
                        }`}
                    />
                </div>
            )}

            {/* 추모 모드 배경 장식 - 반짝이는 별 애니메이션 */}
            {chat.isMemorialMode && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-pulse"
                            style={{
                                left: `${10 + ((i * 7) % 80)}%`,
                                top: `${5 + ((i * 13) % 70)}%`,
                                animationDelay: `${i * 0.3}s`,
                                animationDuration: `${2 + (i % 3)}s`,
                            }}
                        >
                            <Star
                                className="w-3 h-3 text-amber-300/40"
                                fill="currentColor"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* 헤더바 */}
            <AIChatHeader
                isMemorialMode={chat.isMemorialMode}
                pets={pets}
                selectedPetId={selectedPetId}
                selectPet={selectPet}
                onNewChat={chat.handleNewChat}
                onOpenMemoryPanel={() => chat.setIsMemoryPanelOpen(true)}
                onOpenEmotionTracker={() => chat.setIsEmotionTrackerOpen(true)}
                onOpenReminderPanel={() => chat.setIsReminderPanelOpen(true)}
            />

            <div className="flex-1 flex flex-col lg:flex-row max-w-4xl mx-auto w-full overflow-hidden relative z-10">
                {/* 좌측: 펫 프로필 영역 (데스크탑에서만 사이드바) */}
                <PetProfileSidebar
                    selectedPet={selectedPet}
                    allPhotos={chat.allPhotos}
                    currentPhotoIndex={chat.currentPhotoIndex}
                    setCurrentPhotoIndex={chat.setCurrentPhotoIndex}
                    isMemorialMode={chat.isMemorialMode}
                    setSelectedTab={setSelectedTab}
                />

                {/* 우측: 채팅 영역 */}
                <div className="flex-1 flex flex-col min-h-0 lg:min-w-0">
                    {/* AI 고지 배너 */}
                    <div
                        className={`mx-4 mt-2 mb-1 px-3 py-2 rounded-lg text-xs text-center ${
                            chat.isMemorialMode
                                ? "bg-amber-100/80 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-sky-100/80 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                        }`}
                    >
                        <span className="inline-flex items-center gap-1">
                            <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            이 대화는 AI가 생성합니다. 실제 반려동물의 의사가
                            아닌 참고용 서비스입니다.
                        </span>
                    </div>
                    <ChatMessageList
                        messages={chat.messages}
                        isTyping={chat.isTyping}
                        isMemorialMode={chat.isMemorialMode}
                        selectedPet={selectedPet}
                        onRetry={chat.handleRetry}
                    />
                    <ChatInputArea
                        inputValue={chat.inputValue}
                        setInputValue={chat.setInputValue}
                        isMemorialMode={chat.isMemorialMode}
                        isLimitReached={chat.isLimitReached}
                        isPremium={isPremiumUser}
                        remainingChats={chat.remainingChats}
                        lastEmotion={chat.lastEmotion}
                        suggestedQuestions={chat.suggestedQuestions}
                        setSuggestedQuestions={chat.setSuggestedQuestions}
                        selectedPet={selectedPet}
                        onSend={chat.handleSend}
                    />
                </div>
            </div>

            {/* 메모리 패널 (바텀시트) */}
            {selectedPet && (
                <MemoryPanel
                    isOpen={chat.isMemoryPanelOpen}
                    onClose={() => chat.setIsMemoryPanelOpen(false)}
                    petId={selectedPet.id}
                    petName={selectedPet.name}
                    isMemorialMode={chat.isMemorialMode}
                />
            )}

            {/* 감정 분석 패널 (바텀시트) */}
            {selectedPet && user && (
                <EmotionTracker
                    isOpen={chat.isEmotionTrackerOpen}
                    onClose={() => chat.setIsEmotionTrackerOpen(false)}
                    petId={selectedPet.id}
                    petName={selectedPet.name}
                    isMemorialMode={chat.isMemorialMode}
                    userId={user.id}
                />
            )}

            {/* 케어 알림 패널 (바텀시트) - 일상 모드에서만 */}
            {selectedPet && !chat.isMemorialMode && (
                <ReminderPanel
                    isOpen={chat.isReminderPanelOpen}
                    onClose={() => chat.setIsReminderPanelOpen(false)}
                    petId={selectedPet.id}
                    petName={selectedPet.name}
                    isMemorialMode={chat.isMemorialMode}
                />
            )}
        </div>
    );
}
