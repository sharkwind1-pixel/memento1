/**
 * VideoProgressWidget — 글로벌 AI 영상 생성 진행 위젯
 *
 * Layout 레벨에 마운트되어 진행 중인 영상이 있으면 우측 하단에 floating widget 표시.
 *  - 사용자가 어느 페이지에 있든 따라옴
 *  - 닫기 가능 (백그라운드는 유지)
 *  - 완료 시 자동으로 결과 모달 열림 (VideoProgressContext에서 처리)
 *  - 모바일 화면에서는 하단 탭 위에 위치
 */

"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useVideoProgress } from "@/contexts/VideoProgressContext";
import { Loader2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// VideoResultModal 동적 import — 영상 완성 시점에만 로드
const VideoResultModal = lazy(() => import("@/components/features/video/VideoResultModal"));

export default function VideoProgressWidget() {
    const { active, dismissed, dismiss, completedVideo, clearCompleted } = useVideoProgress();
    const { user } = useAuth();
    const [secondsElapsed, setSecondsElapsed] = useState(0);

    // 경과 시간 카운터 (진행 중일 때)
    useEffect(() => {
        if (!active || active.status === "completed" || active.status === "failed") {
            setSecondsElapsed(0);
            return;
        }
        const startTime = new Date(active.createdAt).getTime();
        const tick = () => {
            setSecondsElapsed(Math.floor((Date.now() - startTime) / 1000));
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [active]);

    const nickname = user?.user_metadata?.nickname || user?.email?.split("@")[0];

    return (
        <>
            {/* 진행 위젯 (닫기 누르면 위젯만 숨김 — 폴링/완료 알림은 유지) */}
            {active && !dismissed && (
                <div
                    className="fixed z-50 bottom-20 right-4 sm:bottom-6 sm:right-6 max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-300"
                    role="status"
                    aria-live="polite"
                >
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-memento-200 dark:border-memento-800 overflow-hidden">
                        {/* 상단 그라데이션 progress bar */}
                        <div className="h-1 bg-gradient-to-r from-memento-400 via-violet-400 to-pink-400 animate-pulse" />

                        <div className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-memento-100 to-violet-100 dark:from-memento-900/40 dark:to-violet-900/40 flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 text-memento-500 animate-spin" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-white">
                                        AI 영상 생성 중
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {active.petName ? `${active.petName}의 특별한 순간` : "잠시만 기다려주세요"}
                                    </p>
                                    <p className="text-[11px] text-memento-600 dark:text-memento-400 mt-1.5 font-medium">
                                        {formatElapsed(secondsElapsed)} · 완성되면 알려드릴게요
                                    </p>
                                </div>
                                <button
                                    onClick={dismiss}
                                    aria-label="위젯 닫기"
                                    className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 완료된 영상 — 자동 모달 표시 */}
            {completedVideo && (
                <Suspense fallback={null}>
                    <VideoResultModal
                        isOpen={true}
                        onClose={clearCompleted}
                        video={{
                            id: completedVideo.id,
                            videoUrl: completedVideo.videoUrl,
                            petName: completedVideo.petName,
                            templateId: completedVideo.templateId,
                            createdAt: completedVideo.createdAt,
                        }}
                        authorName={nickname}
                    />
                </Suspense>
            )}
        </>
    );
}

function formatElapsed(seconds: number): string {
    if (seconds < 60) return `${seconds}초 경과`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}분 ${s}초 경과`;
}
