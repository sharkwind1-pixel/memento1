/**
 * AnimalListCard.tsx
 * 입양 동물 리스트 뷰 카드
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Dog, Cat } from "lucide-react";
import type { AdoptionAnimal } from "@/app/api/adoption/route";
import { genderLabel } from "./adoptionTypes";

export function AnimalListCard({
    animal,
    onClick,
}: {
    animal: AdoptionAnimal;
    onClick: () => void;
}) {
    const [imgError, setImgError] = useState(false);

    return (
        <button
            onClick={onClick}
            className="w-full text-left bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/50 dark:border-gray-700/50 rounded-2xl overflow-hidden hover:shadow-lg transition-all"
            type="button"
        >
            <div className="flex">
                {/* 이미지 */}
                <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                    {animal.imageUrl && !imgError ? (
                        <img
                            src={animal.imageUrl}
                            alt={animal.breed}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            {animal.kind === "고양이" ? (
                                <Cat className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                            ) : (
                                <Dog className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                            )}
                        </div>
                    )}
                </div>

                {/* 정보 */}
                <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-start justify-between mb-1 gap-2">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">
                            {animal.breed}
                        </h3>
                        <Badge
                            className={`flex-shrink-0 text-[10px] ${
                                animal.status.includes("공고")
                                    ? "bg-orange-100 text-orange-700 dark:bg-gray-700/30 dark:text-orange-300"
                                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            }`}
                        >
                            {animal.status.includes("공고") ? "공고중" : "보호중"}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        <Badge variant="outline" className="text-[10px]">
                            {animal.kind}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                            {genderLabel(animal.gender)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                            {animal.age}
                        </Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        {animal.region || animal.shelterName}
                    </div>
                    {animal.specialMark && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                            {animal.specialMark}
                        </p>
                    )}
                </div>
            </div>
        </button>
    );
}
