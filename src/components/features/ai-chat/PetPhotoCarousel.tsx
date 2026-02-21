/**
 * PetPhotoCarousel
 * ================
 * 펫 사진 캐러셀 컴포넌트
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Heart,
    Star,
    Camera,
    Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Pet, TabType, PhotoItem } from "@/types";

interface PetPhotoCarouselProps {
    /** 선택된 펫 */
    pet: Pet | null;
    /** 추모 모드 여부 */
    isMemorialMode: boolean;
    /** 탭 이동 핸들러 */
    setSelectedTab?: (tab: TabType) => void;
}

/**
 * 펫 사진 캐러셀 컴포넌트
 */
export function PetPhotoCarousel({
    pet,
    isMemorialMode,
    setSelectedTab,
}: PetPhotoCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // 모든 사진 수집
    const allPhotos: PhotoItem[] = pet
        ? [
              ...(pet.profileImage
                  ? [
                        {
                            id: "profile",
                            url: pet.profileImage,
                            cropPosition: pet.profileCropPosition,
                        },
                    ]
                  : []),
              ...pet.photos.map((p) => ({
                  id: p.id,
                  url: p.url,
                  cropPosition: p.cropPosition,
              })),
          ]
        : [];

    const currentPhoto = allPhotos[currentIndex];

    // 자동 슬라이드 (10초마다)
    useEffect(() => {
        if (allPhotos.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % allPhotos.length);
        }, 10000);
        return () => clearInterval(interval);
    }, [allPhotos.length]);

    // 펫 변경 시 인덱스 초기화
    useEffect(() => {
        setCurrentIndex(0);
    }, [pet?.id]);

    // 사진이 없는 경우
    if (!currentPhoto) {
        return (
            <div className="max-w-[280px] mx-auto">
                <div
                    className={`rounded-2xl p-8 flex flex-col items-center justify-center aspect-square ${
                        isMemorialMode
                            ? "bg-gradient-to-br from-amber-100 to-orange-100"
                            : "bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD]"
                    }`}
                >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                        isMemorialMode ? "bg-amber-100" : "bg-[#E0F7FF]"
                    }`}>
                        <Camera
                            className={`w-8 h-8 ${
                                isMemorialMode
                                    ? "text-amber-500"
                                    : "text-[#05B2DC]"
                            }`}
                        />
                    </div>
                    <p className="text-gray-700 font-medium text-sm mb-1">
                        아직 등록된 사진이 없어요
                    </p>
                    <p className="text-gray-400 text-xs mb-3">
                        추억을 담아보세요
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTab?.("record")}
                        className={`rounded-xl ${
                            isMemorialMode
                                ? "border-amber-400 text-amber-600 hover:bg-amber-50"
                                : "border-[#05B2DC] text-[#05B2DC] hover:bg-[#E0F7FF]"
                        }`}
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        사진 등록하기
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative max-w-[280px] mx-auto">
            {/* 사진 컨테이너 */}
            <div
                className={`relative rounded-2xl overflow-hidden shadow-xl aspect-square ${
                    isMemorialMode
                        ? "ring-2 ring-amber-200/50"
                        : "ring-2 ring-[#E0F7FF]/50"
                }`}
            >
                <img
                    src={currentPhoto.url}
                    alt={pet?.name}
                    className="w-full h-full object-cover"
                    style={{
                        objectPosition: currentPhoto.cropPosition
                            ? `${currentPhoto.cropPosition.x}% ${currentPhoto.cropPosition.y}%`
                            : "center",
                    }}
                />

                {/* 오버레이 그라데이션 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* 펫 정보 */}
                <div className="absolute bottom-3 left-4 text-white">
                    <h2 className="text-lg font-bold">{pet?.name}</h2>
                    <p className="text-xs text-white/80">
                        {pet?.type} · {pet?.breed}
                    </p>
                </div>

                {/* 모드 뱃지 */}
                <Badge
                    className={`absolute top-3 left-3 ${
                        isMemorialMode
                            ? "bg-amber-100/90 text-amber-700"
                            : "bg-[#E0F7FF]/90 text-[#0891B2]"
                    } backdrop-blur-sm`}
                >
                    {isMemorialMode ? (
                        <>
                            <Star className="w-3 h-3 mr-1" />
                            추억 모드
                        </>
                    ) : (
                        <>
                            <Heart className="w-3 h-3 mr-1" />
                            일상 모드
                        </>
                    )}
                </Badge>

                {/* 네비게이션 버튼 */}
                {allPhotos.length > 1 && (
                    <>
                        <button
                            onClick={() =>
                                setCurrentIndex(
                                    (prev) =>
                                        (prev - 1 + allPhotos.length) %
                                        allPhotos.length
                                )
                            }
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() =>
                                setCurrentIndex(
                                    (prev) => (prev + 1) % allPhotos.length
                                )
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>

            {/* 인디케이터 */}
            {allPhotos.length > 1 && (
                <div className="flex justify-center gap-1 mt-2">
                    {allPhotos.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`h-1.5 rounded-full transition-all ${
                                index === currentIndex
                                    ? isMemorialMode
                                        ? "bg-amber-500 w-4"
                                        : "bg-[#05B2DC] w-4"
                                    : "bg-gray-300 w-1.5"
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
