"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef, useCallback } from "react";
import { PetPhoto } from "@/contexts/PetContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Trash2, Video, ChevronLeft, ChevronRight } from "lucide-react";
import DeleteConfirmModal from "./DeleteConfirmModal";

interface PhotoViewerProps {
    photos: PetPhoto[];
    currentIndex: number;
    petName: string;
    onClose: () => void;
    onDelete: () => void;
    onNavigate: (index: number) => void;
}

export default function PhotoViewer({
    photos,
    currentIndex,
    petName,
    onClose,
    onDelete,
    onNavigate,
}: PhotoViewerProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const photo = photos[currentIndex];
    const isVideo = photo?.type === "video";
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < photos.length - 1;

    // 키보드 네비게이션 (Escape, ArrowLeft, ArrowRight)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (showDeleteConfirm) return;
            if (e.key === "Escape") { e.preventDefault(); onClose(); }
            if (e.key === "ArrowLeft" && hasPrev) onNavigate(currentIndex - 1);
            if (e.key === "ArrowRight" && hasNext) onNavigate(currentIndex + 1);
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [showDeleteConfirm, currentIndex, hasPrev, hasNext, onClose, onNavigate]);

    // 모바일 스와이프
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const SWIPE_THRESHOLD = 50;

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchEndX.current = e.touches[0].clientX;
    }, []);
    const onTouchMove = useCallback((e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    }, []);
    const onTouchEnd = useCallback(() => {
        const diff = touchStartX.current - touchEndX.current;
        if (Math.abs(diff) > SWIPE_THRESHOLD) {
            if (diff > 0 && hasNext) onNavigate(currentIndex + 1);
            else if (diff < 0 && hasPrev) onNavigate(currentIndex - 1);
        }
    }, [currentIndex, hasPrev, hasNext, onNavigate]);

    if (!photo) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
                onClick={onClose}
                role="dialog"
                aria-modal="true"
                aria-label="미디어 뷰어"
            >
                <div
                    className="relative max-w-md w-full"
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    {/* 상단 버튼 */}
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-white hover:bg-red-500/20 rounded-full"
                            aria-label="삭제"
                        >
                            <Trash2 className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="text-white hover:bg-white/20 rounded-full"
                            aria-label="닫기"
                        >
                            <X className="w-6 h-6" />
                        </Button>
                    </div>

                    {/* 이전 화살표 */}
                    {hasPrev && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
                            aria-label="이전 사진"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}

                    {/* 다음 화살표 */}
                    {hasNext && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
                            aria-label="다음 사진"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    )}

                    {isVideo ? (
                        <div className="rounded-2xl overflow-hidden bg-black">
                            <video
                                src={photo.url}
                                controls
                                autoPlay
                                className="w-full max-h-[70vh] object-contain"
                                poster={photo.thumbnailUrl}
                            >
                                브라우저가 비디오를 지원하지 않습니다.
                            </video>
                        </div>
                    ) : (
                        <div className="aspect-square rounded-2xl overflow-hidden">
                            <img
                                src={photo.url}
                                alt={photo.caption}
                                className="w-full h-full object-cover"
                                style={{
                                    objectPosition: photo.cropPosition
                                        ? `${photo.cropPosition.x}% ${photo.cropPosition.y}%`
                                        : "center",
                                }}
                            />
                        </div>
                    )}

                    {/* 하단 정보 */}
                    <div className="text-center mt-4 text-white">
                        <div className="flex items-center justify-center gap-2">
                            {isVideo && (
                                <Badge className="bg-purple-600 text-white text-xs">
                                    <Video className="w-3 h-3 mr-1" />
                                    영상
                                </Badge>
                            )}
                            <p className="font-medium">{photo.caption || petName}</p>
                        </div>
                        <p className="text-sm text-gray-400">{photo.date}</p>
                        {photos.length > 1 && (
                            <p className="text-xs text-gray-500 mt-1">{currentIndex + 1} / {photos.length}</p>
                        )}
                    </div>
                </div>
            </div>
            <DeleteConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={onDelete}
                title={isVideo ? "영상 삭제" : "사진 삭제"}
                message={
                    isVideo ? "이 영상을 삭제하시겠습니까?" : "이 사진을 삭제하시겠습니까?"
                }
            />
        </>
    );
}
