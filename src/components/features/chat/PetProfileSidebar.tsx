/**
 * PetProfileSidebar.tsx
 * AI 펫톡 좌측 펫 프로필 사이드바
 * AIChatPage에서 분리 - 사진 갤러리, 프로필 정보 표시
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { Button } from "@/components/ui/button";
import {
    PawPrint,
    ChevronLeft,
    ChevronRight,
    Image as ImageIcon,
} from "lucide-react";
import type { Pet, TabType } from "@/types";

interface PhotoItem {
    id: string;
    url: string;
    cropPosition?: { x: number; y: number } | null;
}

interface PetProfileSidebarProps {
    selectedPet: Pet | null | undefined;
    allPhotos: PhotoItem[];
    currentPhotoIndex: number;
    setCurrentPhotoIndex: (index: number | ((prev: number) => number)) => void;
    isMemorialMode: boolean;
    setSelectedTab?: (tab: TabType) => void;
}

export default function PetProfileSidebar({
    selectedPet,
    allPhotos,
    currentPhotoIndex,
    setCurrentPhotoIndex,
    isMemorialMode,
    setSelectedTab,
}: PetProfileSidebarProps) {
    const currentPhoto = allPhotos[currentPhotoIndex];

    return (
        <div className="flex-shrink-0 p-4 lg:w-80 lg:border-r lg:border-gray-200/50 lg:sticky lg:top-0 lg:self-start">
            {currentPhoto ? (
                <div className="relative max-w-[280px] mx-auto lg:max-w-none">
                    <div
                        className={`relative rounded-2xl overflow-hidden shadow-xl aspect-square ${isMemorialMode ? "ring-2 ring-amber-200/50" : "ring-2 ring-[#E0F7FF]/50"}`}
                    >
                        <img
                            src={currentPhoto.url}
                            alt={selectedPet?.name}
                            className="w-full h-full object-cover"
                            style={{
                                objectPosition:
                                    currentPhoto.cropPosition
                                        ? `${currentPhoto.cropPosition.x}% ${currentPhoto.cropPosition.y}%`
                                        : "center",
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 text-white">
                            <h2 className="text-lg font-bold">
                                {selectedPet?.name}
                            </h2>
                            <p className="text-sm text-white/90">
                                {selectedPet?.type} · {selectedPet?.breed}
                            </p>
                            <p className="text-sm text-white/80 mt-1">
                                {isMemorialMode && selectedPet?.memorialDate
                                    ? `무지개다리를 건넌 지 ${Math.floor((new Date().getTime() - new Date(selectedPet.memorialDate).getTime()) / (1000 * 60 * 60 * 24))}일`
                                    : selectedPet?.birthday
                                    ? `함께한 지 ${Math.floor((new Date().getTime() - new Date(selectedPet.birthday).getTime()) / (1000 * 60 * 60 * 24))}일`
                                    : ""}
                            </p>
                        </div>
                        {allPhotos.length > 1 && (
                            <>
                                <button
                                    onClick={() =>
                                        setCurrentPhotoIndex(
                                            (prev: number) =>
                                                (prev - 1 + allPhotos.length) % allPhotos.length
                                        )
                                    }
                                    aria-label="이전 사진"
                                    className="absolute left-1 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-black/50 text-white rounded-full active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() =>
                                        setCurrentPhotoIndex(
                                            (prev: number) =>
                                                (prev + 1) % allPhotos.length
                                        )
                                    }
                                    aria-label="다음 사진"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-black/50 text-white rounded-full active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>
                    {allPhotos.length > 1 && (
                        <div className="flex justify-center gap-1 mt-2">
                            {allPhotos.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentPhotoIndex(index)}
                                    aria-label={`사진 ${index + 1}`}
                                    className={`h-1.5 rounded-full transition-all ${index === currentPhotoIndex ? (isMemorialMode ? "bg-amber-500 w-4" : "bg-[#05B2DC] w-4") : "bg-gray-300 w-1.5"}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="max-w-[280px] mx-auto">
                    <div
                        className={`relative rounded-2xl p-6 flex flex-col items-center justify-center aspect-square shadow-xl ${isMemorialMode ? "bg-gradient-to-br from-amber-100 to-orange-100 ring-2 ring-amber-200/50" : "bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] ring-2 ring-[#E0F7FF]/50"}`}
                    >
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 ${isMemorialMode ? "bg-amber-200/50" : "bg-white/50"}`}>
                            <PawPrint
                                className={`w-10 h-10 ${isMemorialMode ? "text-amber-500" : "text-[#05B2DC]"}`}
                            />
                        </div>
                        <h2 className={`text-xl font-bold mb-1 ${isMemorialMode ? "text-amber-800" : "text-gray-800"}`}>
                            {selectedPet?.name}
                        </h2>
                        <p className="text-sm text-gray-600 mb-1">
                            {selectedPet?.type} · {selectedPet?.breed}
                        </p>
                        <p className={`text-xs mb-3 ${isMemorialMode ? "text-amber-600" : "text-[#0891B2]"}`}>
                            {isMemorialMode && selectedPet?.memorialDate
                                ? `무지개다리를 건넌 지 ${Math.floor((new Date().getTime() - new Date(selectedPet.memorialDate).getTime()) / (1000 * 60 * 60 * 24))}일`
                                : selectedPet?.birthday
                                ? `함께한 지 ${Math.floor((new Date().getTime() - new Date(selectedPet.birthday).getTime()) / (1000 * 60 * 60 * 24))}일`
                                : ""}
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTab?.("record")}
                            className={`rounded-xl ${isMemorialMode ? "border-amber-400 text-amber-600 hover:bg-amber-50" : "border-[#05B2DC] text-[#05B2DC] hover:bg-[#E0F7FF]"}`}
                        >
                            <ImageIcon className="w-4 h-4 mr-1" />
                            사진 등록하기
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
