"use client";

/* eslint-disable @next/next/no-img-element */

/**
 * MemoryAlbumViewer - 추억 앨범 슬라이드쇼 모달
 *
 * 추모 모드에서 생성된 메모리 앨범을 감성적인 카드형 슬라이드쇼로 보여준다.
 * 터치 스와이프, 키보드 네비게이션, 자동 읽음 처리를 지원한다.
 *
 * @param album - 표시할 메모리 앨범 데이터
 * @param onClose - 모달 닫기 콜백
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Image as ImageIcon, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemoryAlbum } from "@/types";
import { API } from "@/config/apiEndpoints";
import { authFetch } from "@/lib/auth-fetch";

interface MemoryAlbumViewerProps {
    album: MemoryAlbum;
    onClose: () => void;
}

export default function MemoryAlbumViewer({
    album,
    onClose,
}: MemoryAlbumViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isEntering, setIsEntering] = useState(true);
    const [isFading, setIsFading] = useState(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const photos = album.photos ?? [];
    const totalPhotos = photos.length;
    const AUTO_PLAY_INTERVAL = 2000; // 2초

    // ---- 입장 애니메이션 ----
    useEffect(() => {
        const timer = setTimeout(() => setIsEntering(false), 50);
        return () => clearTimeout(timer);
    }, []);

    // ---- 자동 재생 ----
    useEffect(() => {
        if (!isAutoPlaying || totalPhotos <= 1) return;

        setProgress(0);

        // 프로그레스 바 업데이트 (50ms 간격)
        const progressStep = 50;
        progressTimerRef.current = setInterval(() => {
            setProgress((prev) => {
                const next = prev + (progressStep / AUTO_PLAY_INTERVAL) * 100;
                return next >= 100 ? 100 : next;
            });
        }, progressStep);

        // 사진 전환 타이머
        autoPlayTimerRef.current = setInterval(() => {
            setProgress(0);
            setIsFading(true);
            setTimeout(() => {
                setCurrentIndex((prev) => {
                    if (prev >= totalPhotos - 1) {
                        // 마지막이면 처음으로
                        return 0;
                    }
                    return prev + 1;
                });
                setIsFading(false);
            }, 200);
        }, AUTO_PLAY_INTERVAL);

        return () => {
            if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
            if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        };
    }, [isAutoPlaying, totalPhotos, currentIndex]);

    const toggleAutoPlay = useCallback(() => {
        setIsAutoPlaying((prev) => !prev);
        setProgress(0);
    }, []);

    // ---- Body scroll lock ----
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    // ---- Close handler: mark as read (fire-and-forget) then close ----
    const handleClose = useCallback(() => {
        if (!album.isRead) {
            authFetch(API.MEMORY_ALBUM_READ(album.id), { method: "PATCH" }).catch(
                () => {
                    /* fire-and-forget */
                }
            );
        }
        onClose();
    }, [album.id, album.isRead, onClose]);

    // ---- Navigation with fade ----
    const navigateTo = useCallback((newIndex: number) => {
        if (newIndex < 0 || newIndex >= totalPhotos || newIndex === currentIndex) return;
        setIsFading(true);
        setTimeout(() => {
            setCurrentIndex(newIndex);
            setIsFading(false);
        }, 200);
    }, [totalPhotos, currentIndex]);

    const goToPrev = useCallback(() => {
        setIsAutoPlaying(false);
        navigateTo(currentIndex - 1);
    }, [navigateTo, currentIndex]);

    const goToNext = useCallback(() => {
        setIsAutoPlaying(false);
        navigateTo(currentIndex + 1);
    }, [navigateTo, currentIndex]);

    // ---- Keyboard support ----
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowLeft":
                    goToPrev();
                    break;
                case "ArrowRight":
                    goToNext();
                    break;
                case "Escape":
                    handleClose();
                    break;
                case " ":
                    e.preventDefault();
                    toggleAutoPlay();
                    break;
                case "Enter":
                    e.preventDefault();
                    if (currentIndex < totalPhotos - 1) {
                        goToNext();
                    } else {
                        handleClose();
                    }
                    break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [goToPrev, goToNext, handleClose, currentIndex, totalPhotos]);

    // ---- Touch swipe support ----
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchEndX.current = null;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (touchStartX.current === null || touchEndX.current === null) return;
        const deltaX = touchStartX.current - touchEndX.current;
        if (Math.abs(deltaX) > 50) {
            setIsAutoPlaying(false);
            if (deltaX > 0) {
                navigateTo(currentIndex + 1);
            } else {
                navigateTo(currentIndex - 1);
            }
        }
        touchStartX.current = null;
        touchEndX.current = null;
    };

    // ---- Backdrop click ----
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const currentPhoto = photos[currentIndex] ?? null;

    // ---- 날짜 포맷팅 ----
    const formatDate = (dateStr: string): string => {
        try {
            const d = new Date(dateStr);
            return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
        } catch {
            return dateStr;
        }
    };

    // ---- Empty state ----
    if (totalPhotos === 0) {
        return (
            <div
                className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
                onClick={handleClose}
                role="dialog"
                aria-modal="true"
                aria-label="추억 앨범"
            >
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-memorial-100 to-orange-100 dark:from-memorial-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-memorial-500" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">앨범에 사진이 없습니다.</p>
                    <Button
                        onClick={handleClose}
                        className="mt-5 bg-gradient-to-r from-memorial-400 to-orange-400 hover:from-memorial-500 hover:to-orange-500 text-white rounded-xl px-6"
                    >
                        닫기
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`fixed inset-0 z-[9999] bg-black/60 flex items-start justify-center pt-12 sm:pt-16 p-4 overflow-y-auto transition-opacity duration-300 ${
                isEntering ? "opacity-0" : "opacity-100"
            }`}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="memory-album-title"
        >
            {/* 메인 카드 */}
            <div
                className={`relative w-full max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
                    isEntering ? "scale-95 opacity-0" : "scale-100 opacity-100"
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 상단 프로그레스 바 */}
                {totalPhotos > 1 && (
                    <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-3">
                        {photos.map((_, index) => (
                            <div
                                key={index}
                                className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden"
                            >
                                <div
                                    className="h-full bg-white rounded-full"
                                    style={{
                                        width:
                                            index < currentIndex
                                                ? "100%"
                                                : index === currentIndex
                                                    ? `${progress}%`
                                                    : "0%",
                                        transition: index === currentIndex ? "none" : "width 0.2s",
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* 닫기 + 재생 버튼 */}
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                    {totalPhotos > 1 && (
                        <button
                            onClick={toggleAutoPlay}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-colors"
                            aria-label={isAutoPlaying ? "일시정지" : "자동 재생"}
                        >
                            {isAutoPlaying ? (
                                <Pause className="w-3.5 h-3.5 text-white" />
                            ) : (
                                <Play className="w-3.5 h-3.5 text-white ml-0.5" />
                            )}
                        </button>
                    )}
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-colors"
                        aria-label="닫기"
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* 사진 영역 */}
                <div
                    className="relative w-full aspect-[3/4] bg-gradient-to-br from-memorial-50 to-orange-50 dark:from-gray-700 dark:to-gray-600 overflow-hidden"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* 현재 사진 (fade 전환) */}
                    {currentPhoto && (
                        <img
                            src={currentPhoto.url}
                            alt={currentPhoto.caption || `${album.title} - ${currentIndex + 1}`}
                            className={`w-full h-full object-cover transition-opacity duration-200 ${
                                isFading ? "opacity-0" : "opacity-100"
                            }`}
                            style={{
                                objectPosition: currentPhoto.cropPosition
                                    ? `${currentPhoto.cropPosition.x}% ${currentPhoto.cropPosition.y}%`
                                    : "center",
                            }}
                            draggable={false}
                        />
                    )}

                    {/* 사진 위 하단 그라데이션 */}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

                    {/* 좌측 화살표 */}
                    {currentIndex > 0 && (
                        <button
                            onClick={goToPrev}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow-md transition-all active:scale-95"
                            aria-label="이전 사진"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-700" />
                        </button>
                    )}

                    {/* 우측 화살표 */}
                    {currentIndex < totalPhotos - 1 && (
                        <button
                            onClick={goToNext}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow-md transition-all active:scale-95"
                            aria-label="다음 사진"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-700" />
                        </button>
                    )}

                    {/* 사진 카운터 - 우하단 */}
                    <span className="absolute bottom-3 right-3 px-2.5 py-1 text-xs font-medium text-white bg-black/40 rounded-full backdrop-blur-sm">
                        {currentIndex + 1} / {totalPhotos}
                    </span>
                </div>

                {/* 하단 정보 카드 */}
                <div className="px-5 py-4">
                    {/* 앨범 타이틀 */}
                    <h2
                        id="memory-album-title"
                        className="text-base font-bold text-gray-800 dark:text-white"
                    >
                        {album.title}
                    </h2>

                    {/* 앨범 설명 */}
                    {album.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {album.description}
                        </p>
                    )}

                    {/* 캡션 */}
                    {currentPhoto?.caption && (
                        <div className="mt-2.5 px-3 py-2 bg-memorial-50 dark:bg-memorial-900/20 rounded-xl">
                            <p className="text-sm text-memorial-800 dark:text-memorial-200">
                                {currentPhoto.caption}
                            </p>
                        </div>
                    )}

                    {/* 날짜 + Dot indicators */}
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDate(album.createdDate)}
                        </span>

                        {totalPhotos > 1 && (
                            <div className="flex items-center gap-1">
                                {photos.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => navigateTo(index)}
                                        className={`rounded-full transition-all duration-200 ${
                                            index === currentIndex
                                                ? "w-4 h-1.5 bg-memorial-400"
                                                : "w-1.5 h-1.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                                        }`}
                                        aria-label={`${index + 1}번째 사진으로 이동`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
