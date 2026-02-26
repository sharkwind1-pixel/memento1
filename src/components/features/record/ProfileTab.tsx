/**
 * ProfileTab.tsx
 * "내 정보" 탭 - 프로필 카드 + 통계 + 계정 관리
 *
 * RecordPage에서 추출한 UI 컴포넌트
 */

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Heart,
    Calendar,
    Pencil,
    User,
    Settings,
    Mail,
    LogOut,
} from "lucide-react";
import LevelBadge from "@/components/features/points/LevelBadge";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Pet } from "@/types";

interface ProfileTabProps {
    user: SupabaseUser;
    pets: Pet[];
    points: number;
    userPetType: "dog" | "cat" | "other";
    isAdminUser: boolean;
    nickname: string;
    isEditingNickname: boolean;
    isSavingProfile: boolean;
    onNicknameChange: (value: string) => void;
    onStartEditNickname: () => void;
    onCancelEditNickname: () => void;
    onSaveNickname: () => void;
    onSignOut: () => void;
}

export default function ProfileTab({
    user,
    pets,
    points,
    userPetType,
    isAdminUser,
    nickname,
    isEditingNickname,
    isSavingProfile,
    onNicknameChange,
    onStartEditNickname,
    onCancelEditNickname,
    onSaveNickname,
    onSignOut,
}: ProfileTabProps) {
    return (
        <div className="space-y-4">
            {/* 프로필 카드 */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5 text-[#05B2DC]" />
                        프로필 정보
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* 닉네임 */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <LevelBadge points={points} petType={userPetType} isAdmin={isAdminUser} size="2xl" showTooltip />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">닉네임</p>
                                {isEditingNickname ? (
                                    <Input
                                        value={nickname}
                                        onChange={(e) => onNicknameChange(e.target.value)}
                                        className="mt-1 h-8"
                                        placeholder="닉네임 입력"
                                        autoFocus
                                    />
                                ) : (
                                    <p className="font-medium text-gray-800 dark:text-white">
                                        {nickname || "닉네임 없음"}
                                    </p>
                                )}
                            </div>
                        </div>
                        {isEditingNickname ? (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onCancelEditNickname}
                                >
                                    취소
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={onSaveNickname}
                                    disabled={isSavingProfile}
                                    className="bg-[#05B2DC] hover:bg-[#0891B2]"
                                >
                                    {isSavingProfile ? "저장 중..." : "저장"}
                                </Button>
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onStartEditNickname}
                            >
                                <Pencil className="w-4 h-4 mr-1" />
                                수정
                            </Button>
                        )}
                    </div>

                    {/* 이메일 */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">이메일</p>
                            <p className="font-medium text-gray-800 dark:text-white">
                                {user?.email || "이메일 없음"}
                            </p>
                        </div>
                    </div>

                    {/* 가입일 */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">가입일</p>
                            <p className="font-medium text-gray-800 dark:text-white">
                                {user?.created_at
                                    ? new Date(user.created_at).toLocaleDateString("ko-KR", {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                      })
                                    : "정보 없음"}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 통계 카드 */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Heart className="w-5 h-5 text-pink-500" />
                        나의 기록
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] rounded-xl">
                            <p className="text-2xl font-bold text-[#05B2DC]">{pets.length}</p>
                            <p className="text-sm text-gray-600">반려동물</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl">
                            <p className="text-2xl font-bold text-pink-500">
                                {pets.reduce((acc, pet) => acc + pet.photos.length, 0)}
                            </p>
                            <p className="text-sm text-gray-600">사진/영상</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl">
                            <p className="text-2xl font-bold text-violet-500">
                                {pets.filter((p) => p.status === "memorial").length}
                            </p>
                            <p className="text-sm text-gray-600">추억 속에</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 계정 관리 */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-500" />
                        계정 관리
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent("openAccountSettings"))}
                        className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                    >
                        <Settings className="w-5 h-5" />
                        <span>계정 설정</span>
                    </button>
                    <button
                        onClick={onSignOut}
                        className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>로그아웃</span>
                    </button>
                </CardContent>
            </Card>
        </div>
    );
}
