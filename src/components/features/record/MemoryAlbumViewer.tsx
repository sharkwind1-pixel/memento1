"use client";

/* eslint-disable @next/next/no-img-element */

/**
 * MemoryAlbumViewer - 추억 앨범 슬라이드쇼 모달
 *
 * 추모 모드에서 생성된 메모리 앨범을 전체 화면 슬라이드쇼로 보여준다.
 * 터치 스와이프, 키보드 네비게이션, 자동 읽음 처리를 지원한다.
 *
 * @param album - 표시할 메모리 앨범 데이터
 * @param onClose - 모달 닫기 콜백
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemoryAlbum } from "@/types";
import { API } from "@/config/apiEndpoints";

interface MemoryAlbumViewerProps {
    album: MemoryAlbum;
    onClose: () => void;
}

export default function MemoryAlbumViewer({
    album,
    onClose,
}: MemoryAlbumViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    const photos = album.photos ?? [];
    const totalPhotos = photos.length;

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
            fetch(API.MEMORY_ALBUM_READ(album.id), { method: "PATCH" }).catch(
                () => {
                    /* fire-and-forget */
                }
            );
        }
        onClose();
    }, [album.id, album.isRead, onClose]);

    // ---- Navigation ----
    const goToPrev = useCallback(() => {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
    }, []);

    const goToNext = useCallback(() => {
        setCurrentIndex((prev) => Math.min(totalPhotos - 1, prev + 1));
    }, [totalPhotos]);

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
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [goToPrev, goToNext, handleClose]);

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
            if (deltaX > 0) {
                goToNext();
            } else {
                goToPrev();
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

    // ---- Empty state ----
    if (totalPhotos === 0) {
        return (
            <div
                className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
                onClick={handleClose}
                role="dialog"
                aria-modal="true"
                aria-label="추억 앨범"
            >
                <div className="text-center text-amber-200">
                    <p className="text-lg">앨범에 사진이 없습니다.</p>
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        className="mt-4 text-amber-100 hover:bg-amber-900/30"
                    >
                        닫기
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/90 flex flex-col"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="memory-album-title"
        >
            {/* Top bar: close button */}
            <div className="flex-shrink-0 flex justify-end p-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="text-white hover:bg-white/20 rounded-full"
                    aria-label="닫기"
                >
                    <X className="w-6 h-6" />
                </Button>
            </div>

            {/* Center: photo carousel */}
            <div
                className="flex-1 relative overflow-hidden flex items-center"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Slide track */}
                <div
                    className="flex w-full h-full transition-transform duration-300 ease-in-out"
                    style={{
                        transform: `translateX(-${currentIndex * 100}%)`,
                    }}
                >
                    {photos.map((photo, index) => (
                        <div
                            key={photo.id || index}
                            className="w-full h-full flex-shrink-0 flex items-center justify-center px-4"
                        >
                            <img
                                src={photo.url}
                                alt={
                                    photo.caption ||
                                    `${album.title} - ${index + 1}`
                                }
                                className="w-full h-full object-contain"
                                draggable={false}
                            />
                        </div>
                    ))}
                </div>

                {/* Left arrow */}
                {currentIndex > 0 && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToPrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full w-10 h-10"
                        aria-label="이전 사진"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                )}

                {/* Right arrow */}
                {currentIndex < totalPhotos - 1 && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full w-10 h-10"
                        aria-label="다음 사진"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </Button>
                )}
            </div>

            {/* Bottom section: album info + indicators */}
            <div
                className="flex-shrink-0 pb-6 pt-3 px-4 text-center"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Album title */}
                <h2
                    id="memory-album-title"
                    className="text-lg font-semibold text-amber-200"
                >
                    {album.title}
                </h2>

                {/* Album description */}
                {album.description && (
                    <p className="text-sm text-amber-100/70 mt-1">
                        {album.description}
                    </p>
                )}

                {/* Current photo caption */}
                {currentPhoto?.caption && (
                    <p className="text-sm text-white/80 mt-2">
                        {currentPhoto.caption}
                    </p>
                )}

                {/* Dot indicators */}
                {totalPhotos > 1 && (
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                        {photos.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                                    index === currentIndex
                                        ? "bg-amber-400"
                                        : "bg-white/30"
                                }`}
                                aria-label={`${index + 1}번째 사진으로 이동`}
                            />
                        ))}
                    </div>
                )}

                {/* Photo counter */}
                <p className="text-xs text-white/50 mt-2">
                    {currentIndex + 1} / {totalPhotos}
                </p>
            </div>
        </div>
    );
}
