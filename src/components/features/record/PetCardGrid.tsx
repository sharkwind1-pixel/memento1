/**
 * PetCardGrid.tsx
 * 반려동물 선택 그리드 (1:1 비율 카드) + 더보기 드롭다운 메뉴
 *
 * RecordPage에서 추출한 UI 컴포넌트
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useState } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    Crown,
    Star,
    MoreHorizontal,
    Check,
    PawPrint,
} from "lucide-react";
import type { Pet } from "@/types";

interface PetCardGridProps {
    pets: Pet[];
    selectedPetId: string | null;
    onSelectPet: (petId: string) => void;
    onEditPet: (pet: Pet) => void;
    onDeletePet: (pet: Pet) => void;
    onAddNewPet: () => void;
}

export default function PetCardGrid({
    pets,
    selectedPetId,
    onSelectPet,
    onEditPet,
    onDeletePet,
    onAddNewPet,
}: PetCardGridProps) {
    const [showPetMenu, setShowPetMenu] = useState<string | null>(null);

    return (
        <>
            <div className="mb-6" data-tutorial-id="pet-card-area">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {pets.map((pet) => (
                        <div
                            key={pet.id}
                            className="relative"
                        >
                            <button
                                onClick={() => onSelectPet(pet.id)}
                                className={`relative w-full aspect-square rounded-2xl overflow-hidden transition-all ${
                                    selectedPetId === pet.id
                                        ? "ring-4 ring-[#05B2DC] shadow-lg scale-[1.02]"
                                        : "ring-2 ring-transparent hover:ring-gray-200 dark:hover:ring-gray-600"
                                }`}
                            >
                                {/* 프로필 이미지 */}
                                {pet.profileImage ? (
                                    <img
                                        src={pet.profileImage}
                                        alt={pet.name}
                                        className="w-full h-full object-cover"
                                        style={{
                                            objectPosition:
                                                pet.profileCropPosition
                                                    ? `${pet.profileCropPosition.x}% ${pet.profileCropPosition.y}%`
                                                    : "center",
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center">
                                        <PawPrint className="w-10 h-10 text-[#05B2DC]" />
                                    </div>
                                )}

                                {/* 하단 정보 오버레이 */}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2 pt-6">
                                    <div className="flex items-center justify-center gap-1 min-w-0">
                                        <span className="font-semibold text-white text-sm truncate">
                                            {pet.name}
                                        </span>
                                        {pet.isPrimary && (
                                            <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                        )}
                                        {pet.status === "memorial" && (
                                            <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-white/80 text-sm text-center truncate">
                                        {pet.breed}
                                    </p>
                                </div>

                                {/* 선택됨 표시 */}
                                {selectedPetId === pet.id && (
                                    <div className="absolute top-2 left-2 w-5 h-5 bg-[#05B2DC] rounded-full flex items-center justify-center">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </button>

                            {/* 더보기 메뉴 버튼 */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPetMenu(
                                        showPetMenu === pet.id
                                            ? null
                                            : pet.id,
                                    );
                                }}
                                className="absolute top-1 right-1 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center active:scale-95"
                                aria-label="더보기 메뉴"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {/* 드롭다운 메뉴 */}
                            {showPetMenu === pet.id && (
                                <div className="absolute top-10 right-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 min-w-[140px] animate-in fade-in-0 zoom-in-95">
                                    <button
                                        onClick={() => {
                                            onEditPet(pet);
                                            setShowPetMenu(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <Pencil className="w-4 h-4 text-gray-500" />
                                        <span>정보 수정</span>
                                    </button>
                                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-1 mx-2" />
                                    <button
                                        onClick={() => {
                                            onDeletePet(pet);
                                            setShowPetMenu(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>삭제하기</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {/* 새 펫 추가 버튼 - 1:1 비율 */}
                    <button
                        onClick={onAddNewPet}
                        className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center hover:border-[#05B2DC] hover:bg-[#05B2DC]/5 active:scale-95 transition-all min-h-[80px]"
                    >
                        <Plus className="w-8 h-8 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-400">추가</span>
                    </button>
                </div>
            </div>

            {/* 드롭다운 외부 클릭 닫기 */}
            {showPetMenu && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowPetMenu(null)}
                />
            )}
        </>
    );
}
