/**
 * AnimalDetailModal.tsx
 * 입양 동물 상세 정보 모달
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, MapPin, Phone } from "lucide-react";
import type { AdoptionAnimal } from "@/app/api/adoption/route";
import { genderLabel, neuterLabel, formatDate } from "./adoptionTypes";

function InfoItem({ label, value }: { label: string; value: string }) {
    if (!value) return null;
    return (
        <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{value}</p>
        </div>
    );
}

export function AnimalDetailModal({
    animal,
    onClose,
}: {
    animal: AdoptionAnimal | null;
    onClose: () => void;
}) {
    useEffect(() => {
        if (!animal) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [animal, onClose]);

    if (!animal) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="adoption-detail-title"
        >
            <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/70 dark:border-gray-800 flex-shrink-0">
                    <div className="min-w-0">
                        <div id="adoption-detail-title" className="font-bold text-gray-900 dark:text-gray-100 truncate">
                            {animal.breed} ({animal.kind})
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {animal.noticeNo}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl flex-shrink-0"
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* 본문 - 스크롤 */}
                <div className="flex-1 overflow-y-auto">
                    {/* 이미지 */}
                    {animal.imageUrl && (
                        <div className="relative w-full bg-gray-100 dark:bg-gray-800">
                            <img
                                src={animal.imageUrl}
                                alt={animal.breed}
                                className="w-full max-h-[50vh] object-contain"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                    )}

                    {/* 정보 */}
                    <div className="p-4 space-y-4">
                        {/* 상태 배지 */}
                        <div className="flex flex-wrap gap-2">
                            <Badge className={
                                animal.status.includes("공고")
                                    ? "bg-orange-100 text-orange-700 dark:bg-gray-700/30 dark:text-orange-300"
                                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            }>
                                {animal.status || "보호중"}
                            </Badge>
                            <Badge variant="outline">
                                {genderLabel(animal.gender)}
                            </Badge>
                            <Badge variant="outline">
                                중성화 {neuterLabel(animal.neutered)}
                            </Badge>
                        </div>

                        {/* 기본 정보 */}
                        <div className="grid grid-cols-2 gap-3">
                            <InfoItem label="품종" value={animal.breed} />
                            <InfoItem label="나이" value={animal.age} />
                            <InfoItem label="색상" value={animal.color} />
                            <InfoItem label="체중" value={animal.weight} />
                        </div>

                        {/* 특이사항 */}
                        {animal.specialMark && (
                            <div className="p-3 bg-sky-50 dark:bg-sky-900/20 rounded-xl">
                                <p className="text-sm font-medium text-sky-700 dark:text-sky-300 mb-1">
                                    특이사항
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {animal.specialMark}
                                </p>
                            </div>
                        )}

                        {/* 발견 정보 */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                발견 정보
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-600 dark:text-gray-300">
                                        {animal.foundPlace}
                                    </span>
                                </div>
                                {animal.foundDate && (
                                    <div className="text-gray-500 dark:text-gray-400">
                                        발견일: {formatDate(animal.foundDate)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 공고 기간 */}
                        {animal.noticeStart && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                공고기간: {formatDate(animal.noticeStart)} ~ {formatDate(animal.noticeEnd)}
                            </div>
                        )}

                        {/* 보호소 정보 */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-2">
                            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                보호소 정보
                            </h4>
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                {animal.shelterName}
                            </p>
                            {animal.shelterAddr && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                    {animal.shelterAddr}
                                </p>
                            )}
                            {animal.shelterTel && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                    {animal.shelterTel}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 하단 버튼 */}
                <div className="p-4 border-t border-gray-200/70 dark:border-gray-800 flex-shrink-0">
                    <div className="flex gap-3">
                        {animal.shelterTel && (
                            <Button
                                className="flex-1 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 rounded-xl"
                                onClick={() => {
                                    window.open(`tel:${animal.shelterTel}`);
                                }}
                            >
                                <Phone className="w-4 h-4 mr-2" />
                                보호소 전화하기
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={onClose}
                        >
                            닫기
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
