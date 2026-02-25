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
            authFetch(API.MEMORY_ALBUM_READ(album.id), { method: "PATCH" }).catch(
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
                case " ":
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
            className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="memory-album-title"
        >
            {/* 컴팩트 카드: 사진 + 하단 정보 */}
            <div
                className="relative w-full max-w-md mx-auto flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 닫기 버튼 - 카드 우상단 */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="absolute -top-1 right-2 z-10 text-white bg-black/40 hover:bg-black/60 rounded-full w-8 h-8"
                    aria-label="닫기"
                >
                    <X className="w-5 h-5" />
                </Button>

                {/* 사진 캐러셀 */}
                <div
                    className="relative w-full overflow-hidden rounded-xl"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div
                        className="flex transition-transform duration-300 ease-in-out"
                        style={{
                            transform: `translateX(-${currentIndex * 100}%)`,
                        }}
                    >
                        {photos.map((photo, index) => (
                            <div
                                key={photo.id || index}
                                className="w-full flex-shrink-0 flex items-center justify-center"
                            >
                                <img
                                    src={photo.url}
                                    alt={
                                        photo.caption ||
                                        `${album.title} - ${index + 1}`
                                    }
                                    className="w-full max-h-[65vh] object-contain"
                                    draggable={false}
                                />
                            </div>
                        ))}
                    </div>

                    {/* 좌측 화살표 */}
                    {currentIndex > 0 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToPrev}
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full w-9 h-9"
                            aria-label="이전 사진"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                    )}

                    {/* 우측 화살표 */}
                    {currentIndex < totalPhotos - 1 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToNext}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full w-9 h-9"
                            aria-label="다음 사진"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    )}

                    {/* 사진 카운터 - 사진 위 좌하단 */}
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 text-xs font-medium text-white bg-black/50 rounded-md backdrop-blur-sm">
                        {currentIndex + 1} / {totalPhotos}
                    </span>
                </div>

                {/* 하단: 앨범 정보 + dot */}
                <div className="w-full pt-3 pb-2 px-2 text-center">
                    <h2
                        id="memory-album-title"
                        className="text-base font-semibold text-amber-200"
                    >
                        {album.title}
                    </h2>

                    {album.description && (
                        <p className="text-xs text-amber-100/70 mt-0.5 line-clamp-2">
                            {album.description}
                        </p>
                    )}

                    {currentPhoto?.caption && (
                        <p className="text-xs text-white/80 mt-1">
                            {currentPhoto.caption}
                        </p>
                    )}

                    {totalPhotos > 1 && (
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                            {photos.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentIndex(index)}
                                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                                        index === currentIndex
                                            ? "bg-amber-400"
                                            : "bg-white/30"
                                    }`}
                                    aria-label={`${index + 1}번째 사진으로 이동`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
