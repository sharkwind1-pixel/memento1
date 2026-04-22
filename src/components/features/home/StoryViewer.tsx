/**
 * StoryViewer.tsx
 * 풀스크린 스토리 뷰어 (인스타그램 스타일)
 *
 * - 탭/스와이프로 다음/이전
 * - 프로그레스 바
 * - 자동 진행 (5초)
 * - 닫기: 아래로 스와이프 또는 X
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";

interface StoryItem {
    id: string;
    image_url: string | null;
    text_content: string | null;
    background_color: string;
    created_at: string;
}

interface StoryViewerProps {
    user: {
        userId: string;
        nickname: string;
        avatar: string | null;
        stories: StoryItem[];
    };
    onClose: () => void;
}

export default function StoryViewer({ user, onClose }: StoryViewerProps) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const story = user.stories[currentIdx];

    const DURATION = 5000; // 5초
    const INTERVAL = 50; // 50ms마다 프로그레스 업데이트

    const goNext = useCallback(() => {
        if (currentIdx < user.stories.length - 1) {
            setCurrentIdx((p) => p + 1);
            setProgress(0);
        } else {
            onClose();
        }
    }, [currentIdx, user.stories.length, onClose]);

    const goPrev = useCallback(() => {
        if (currentIdx > 0) {
            setCurrentIdx((p) => p - 1);
            setProgress(0);
        }
    }, [currentIdx]);

    // 자동 진행
    useEffect(() => {
        setProgress(0);
        timerRef.current = setInterval(() => {
            setProgress((p) => {
                const next = p + (INTERVAL / DURATION) * 100;
                if (next >= 100) {
                    goNext();
                    return 0;
                }
                return next;
            });
        }, INTERVAL);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentIdx, goNext]);

    // 좌/우 탭
    const handleClick = (e: React.MouseEvent) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width / 3) {
            goPrev();
        } else {
            goNext();
        }
    };

    // 상대 시간
    const getRelativeTime = (dateStr: string): string => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const hours = Math.floor(diff / (60 * 60 * 1000));
        if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))}분 전`;
        return `${hours}시간 전`;
    };

    if (!story) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
            <div
                className="relative w-full max-w-md h-full max-h-[100dvh] cursor-pointer"
                onClick={handleClick}
            >
                {/* 프로그레스 바 */}
                <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
                    {user.stories.map((_, i) => (
                        <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-none"
                                style={{
                                    width: i < currentIdx ? "100%" : i === currentIdx ? `${progress}%` : "0%",
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* 헤더 (닉네임 + 시간) */}
                <div className="absolute top-6 left-0 right-0 z-20 px-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                        {user.nickname[0]}
                    </div>
                    <div className="flex-1">
                        <span className="text-white text-sm font-medium">{user.nickname}</span>
                        <span className="text-white/60 text-xs ml-2">{getRelativeTime(story.created_at)}</span>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="p-2 text-white/80 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 스토리 콘텐츠 */}
                {story.image_url ? (
                    <img
                        src={story.image_url}
                        alt="스토리"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div
                        className="w-full h-full flex items-center justify-center px-8"
                        style={{ backgroundColor: story.background_color || "#05B2DC" }}
                    >
                        <p className="text-white text-xl font-bold text-center leading-relaxed drop-shadow-lg">
                            {story.text_content}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
