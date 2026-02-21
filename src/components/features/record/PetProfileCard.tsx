/**
 * PetProfileCard.tsx
 * 선택된 반려동물의 프로필 정보 카드
 * RecordPage에서 분리 - 프로필 이미지, 기본 정보, 상태 전환 버튼
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Heart,
    Calendar,
    Star,
    Crown,
    PawPrint,
} from "lucide-react";
import type { Pet } from "@/contexts/PetContext";

interface PetProfileCardProps {
    pet: Pet;
    onMemorialClick: () => void;
    onRecoverToActive: (petId: string) => Promise<void>;
}

/** 나이 계산 유틸리티 */
function calculateAge(birthday: string): string {
    if (!birthday) return "";
    const birth = new Date(birthday);
    const now = new Date();
    const totalMonths =
        (now.getFullYear() - birth.getFullYear()) * 12 +
        (now.getMonth() - birth.getMonth());
    if (totalMonths < 12) return `${totalMonths}개월`;
    const remainingMonths = totalMonths % 12;
    return remainingMonths > 0
        ? `${Math.floor(totalMonths / 12)}살 ${remainingMonths}개월`
        : `${Math.floor(totalMonths / 12)}살`;
}

export default function PetProfileCard({
    pet,
    onMemorialClick,
    onRecoverToActive,
}: PetProfileCardProps) {
    return (
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mb-6">
            <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                    {/* 프로필 이미지 */}
                    <div className="relative">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg">
                            {pet.profileImage ? (
                                <img
                                    src={pet.profileImage}
                                    alt={pet.name}
                                    className="w-full h-full object-cover"
                                    style={{
                                        objectPosition: pet.profileCropPosition
                                            ? `${pet.profileCropPosition.x}% ${pet.profileCropPosition.y}%`
                                            : "center",
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center">
                                    <PawPrint className="w-10 h-10 text-[#05B2DC]" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 펫 정보 */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                {pet.name}
                            </h2>
                            {pet.isPrimary && (
                                <Badge className="bg-amber-100 text-amber-700 text-xs">
                                    <Crown className="w-3 h-3 mr-1" />
                                    대표
                                </Badge>
                            )}
                            <Badge
                                className={`text-xs transition-colors duration-500 ${pet.status === "memorial" ? "bg-violet-100 text-violet-700" : "bg-green-100 text-green-700"}`}
                            >
                                {pet.status === "memorial" ? (
                                    <>
                                        <Star className="w-3 h-3 mr-1" />
                                        추억 속에
                                    </>
                                ) : (
                                    <>
                                        <Heart className="w-3 h-3 mr-1" />
                                        함께하는 중
                                    </>
                                )}
                            </Badge>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                            {pet.type} · {pet.breed} · {pet.gender}
                        </p>
                        <div className="flex flex-wrap gap-2 text-sm">
                            {pet.birthday && (
                                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                    <Calendar className="w-4 h-4" />
                                    {calculateAge(pet.birthday)}
                                </span>
                            )}
                            {pet.weight && (
                                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                    <Star className="w-4 h-4" />
                                    {pet.weight}
                                </span>
                            )}
                        </div>
                        {pet.personality && (
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                                {pet.personality}
                            </p>
                        )}

                        {/* 추억 전환 버튼 - active 상태일 때만 표시 */}
                        {pet.status === "active" && (
                            <div className="flex items-center gap-2 mt-4 flex-wrap">
                                <Button
                                    onClick={onMemorialClick}
                                    variant="outline"
                                    size="sm"
                                    className="border-amber-300 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/30"
                                >
                                    <Star className="w-4 h-4 mr-2" />
                                    추억 전환
                                </Button>
                            </div>
                        )}

                        {/* 추모 모드일 때 - 일상 모드 복구 옵션 */}
                        {pet.status === "memorial" && (
                            <div className="mt-4 space-y-2">
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    {pet.memorialDate &&
                                        `무지개다리를 건넌 날: ${pet.memorialDate}`}
                                </p>
                                <Button
                                    onClick={() => {
                                        toast("일상 모드로 되돌리시겠습니까?", {
                                            action: {
                                                label: "복구",
                                                onClick: async () => {
                                                    await onRecoverToActive(pet.id);
                                                    toast.success("일상 모드로 복구되었습니다");
                                                },
                                            },
                                            cancel: {
                                                label: "취소",
                                                onClick: () => {},
                                            },
                                        });
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-500 hover:text-gray-700 text-xs"
                                >
                                    <Heart className="w-3 h-3 mr-1" />
                                    일상 모드로 복구
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
