/**
 * VideoResultModal.tsx
 * AI 생성 영상 결과 모달
 * - 완성된 영상 재생 + 저장/자랑/공유 액션 버튼
 * - "자랑하기" 클릭 시 커뮤니티 "함께 보기"에 실제 게시글 등록
 * - Web Share API 지원, 미지원 시 클립보드 복사 폴백
 */

"use client";

import { useCallback, useState } from "react";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { VIDEO_TEMPLATES } from "@/config/videoTemplates";
import { API } from "@/config/apiEndpoints";
import { authFetch } from "@/lib/auth-fetch";
import { X, Download, Users, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VideoResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    video: {
        id: string;
        videoUrl: string | null;
        petName: string | null;
        templateId: string | null;
        createdAt: string;
    } | null;
    /** 자랑하기 성공 후 콜백 */
    onShowOffSuccess?: () => void;
    /** 게시글 작성자 이름 (없으면 "익명") */
    authorName?: string;
}

/** createdAt ISO 문자열을 "X월 X일" 형식으로 변환 */
function formatKoreanDate(isoString: string): string {
    const date = new Date(isoString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
}

/** templateId로 템플릿 이름 조회 */
function getTemplateName(templateId: string | null): string | null {
    if (!templateId) return null;
    const template = VIDEO_TEMPLATES.find((t) => t.id === templateId);
    return template?.name ?? null;
}

export default function VideoResultModal({
    isOpen,
    onClose,
    video,
    onShowOffSuccess,
    authorName,
}: VideoResultModalProps) {
    useEscapeClose(isOpen, onClose);

    const [isPosting, setIsPosting] = useState(false);

    const handleDownload = useCallback(() => {
        if (!video || !video.videoUrl) return;
        const link = document.createElement("a");
        link.href = video.videoUrl;
        link.download = `memento-video-${video.id}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("영상이 저장되었어요");
    }, [video]);

    const handleShowOff = useCallback(async () => {
        if (!video || !video.videoUrl || isPosting) return;

        setIsPosting(true);
        try {
            const res = await authFetch(API.POSTS, {
                method: "POST",
                body: JSON.stringify({
                    boardType: "free",
                    badge: "자랑",
                    title: video.petName
                        ? `${video.petName}의 특별한 영상`
                        : "우리 아이의 AI 영상",
                    content: video.petName
                        ? `${video.petName}의 AI 영상을 만들었어요! 함께 감상해주세요.`
                        : "AI로 만든 우리 아이의 특별한 영상이에요!",
                    authorName: authorName || "익명",
                    videoUrl: video.videoUrl,
                }),
            });

            if (res.ok) {
                toast.success("함께 보기에 영상이 등록되었어요!");
                onShowOffSuccess?.();
            } else {
                const data = await res.json();
                if (res.status === 401) {
                    toast.error("로그인이 필요합니다");
                    window.dispatchEvent(new CustomEvent("openAuthModal"));
                } else {
                    toast.error(data.error || "등록에 실패했어요");
                }
            }
        } catch {
            toast.error("네트워크 오류가 발생했어요");
        } finally {
            setIsPosting(false);
        }
    }, [video, isPosting, onShowOffSuccess, authorName]);

    const handleShare = useCallback(async () => {
        if (!video || !video.videoUrl) return;

        const shareData = {
            title: video.petName
                ? `${video.petName}의 특별한 영상`
                : "메멘토애니 AI 영상",
            text: video.petName
                ? `${video.petName}의 AI 영상을 확인해보세요`
                : "AI로 만든 특별한 반려동물 영상",
            url: video.videoUrl,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                toast.success("공유 링크가 복사되었어요");
            } catch (error) {
                // 사용자가 공유를 취소한 경우 무시
                if (error instanceof Error && error.name === "AbortError") {
                    return;
                }
                // 그 외 에러 시 클립보드 폴백
                await fallbackCopyToClipboard(video.videoUrl);
            }
        } else {
            await fallbackCopyToClipboard(video.videoUrl);
        }
    }, [video]);

    if (!isOpen || !video || !video.videoUrl) return null;

    const templateName = getTemplateName(video.templateId);
    const formattedDate = formatKoreanDate(video.createdAt);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-2xl">
                <div
                    className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="video-result-modal-title"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 닫기 버튼 */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors text-white"
                        aria-label="닫기"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* 영상 플레이어 */}
                    <div className="p-5 pb-0">
                        <video
                            src={video.videoUrl}
                            controls
                            autoPlay
                            loop
                            playsInline
                            className="w-full rounded-xl bg-black"
                        />
                    </div>

                    {/* 정보 섹션 */}
                    <div className="px-6 pt-5 pb-2">
                        <h2
                            id="video-result-modal-title"
                            className="text-xl font-display font-bold text-gray-800 dark:text-white"
                        >
                            {video.petName
                                ? `${video.petName}의 특별한 영상`
                                : "AI 영상이 완성되었어요"}
                        </h2>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {templateName && (
                                <>
                                    <span>{templateName}</span>
                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                </>
                            )}
                            <span>{formattedDate}</span>
                        </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="px-6 pt-3 pb-6">
                        <div className="flex items-stretch gap-3">
                            {/* 저장하기 */}
                            <button
                                onClick={handleDownload}
                                className="flex-1 flex flex-col items-center gap-2 py-5 px-4 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                <Download className="w-7 h-7 text-gray-600 dark:text-gray-300" />
                                <span className="text-base font-medium text-gray-700 dark:text-gray-200">
                                    저장하기
                                </span>
                            </button>

                            {/* 자랑하기 */}
                            <button
                                onClick={handleShowOff}
                                disabled={isPosting}
                                className={`flex-1 flex flex-col items-center gap-2 py-5 px-4 rounded-xl transition-colors ${
                                    isPosting
                                        ? "bg-gray-100 dark:bg-gray-700 opacity-60 cursor-not-allowed"
                                        : "bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                                }`}
                            >
                                {isPosting ? (
                                    <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
                                ) : (
                                    <Users className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                                )}
                                <span className={`text-base font-medium ${
                                    isPosting
                                        ? "text-gray-500 dark:text-gray-400"
                                        : "text-amber-700 dark:text-amber-300"
                                }`}>
                                    {isPosting ? "등록 중..." : "자랑하기"}
                                </span>
                            </button>

                            {/* 공유하기 */}
                            <button
                                onClick={handleShare}
                                className="flex-1 flex flex-col items-center gap-2 py-5 px-4 rounded-xl bg-sky-50 dark:bg-sky-900/30 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
                            >
                                <Share2 className="w-7 h-7 text-memento-500" />
                                <span className="text-base font-medium text-memento-500">
                                    공유하기
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** 클립보드 복사 폴백 */
async function fallbackCopyToClipboard(url: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(url);
        toast.success("공유 링크가 복사되었어요");
    } catch {
        toast.error("링크 복사에 실패했어요. 직접 복사해주세요.");
    }
}
