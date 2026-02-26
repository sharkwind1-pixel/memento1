/**
 * AnimalGridCard.tsx
 * 입양 동물 그리드 뷰 카드
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Dog, Cat } from "lucide-react";
import type { AdoptionAnimal } from "@/app/api/adoption/route";
import { genderLabel } from "./adoptionTypes";

export function AnimalGridCard({
    animal,
    onClick,
}: {
    animal: AdoptionAnimal;
    onClick: () => void;
}) {
    const [imgError, setImgError] = useState(false);

    return (
        <button onClick={onClick} className="group text-left" type="button">
            <div className="rounded-2xl overflow-hidden bg-white/60 dark:bg-gray-800/60 border border-white/50 dark:border-gray-700/60 shadow-sm hover:shadow-lg transition-all">
                {/* 이미지 */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                    {animal.imageUrl && !imgError ? (
                        <img
                            src={animal.imageUrl}
                            alt={animal.breed}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            {animal.kind === "고양이" ? (
                                <Cat className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                            ) : (
                                <Dog className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                            )}
                        </div>
                    )}
                    {/* 상태 배지 */}
                    <div className="absolute top-2 left-2 flex gap-1">
                        <Badge
                            className={
                                animal.status.includes("공고")
                                    ? "bg-orange-500/90 text-white text-[10px]"
                                    : "bg-green-500/90 text-white text-[10px]"
                            }
                        >
                            {animal.status.includes("공고") ? "공고중" : "보호중"}
                        </Badge>
                    </div>
                    {/* 종류 배지 */}
                    <div className="absolute top-2 right-2">
                        <Badge className="bg-white/90 dark:bg-gray-800/90 text-[10px]">
                            {animal.kind}
                        </Badge>
                    </div>
                </div>

                {/* 정보 */}
                <div className="p-3">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">
                        {animal.breed}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {genderLabel(animal.gender)} · {animal.age}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {animal.region || animal.shelterName}
                    </div>
                </div>
            </div>
        </button>
    );
}
