/**
 * UserProfileCard.tsx
 * 유저 닉네임 클릭 시 표시되는 간단한 프로필 카드
 * - 닉네임, 가입일 표시
 * - 미니홈피 방문 버튼
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Home, Loader2, Calendar } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import LevelBadge from "@/components/features/points/LevelBadge";

interface UserProfileCardProps {
    userId: string;
    onClose: () => void;
    onVisitMinihompy: (userId: string) => void;
}

interface UserInfo {
    nickname: string;
    joinedAt: string | null;
    points: number;
    petType: string;
    isAdmin: boolean;
}

export default function UserProfileCard({
    userId,
    onClose,
    onVisitMinihompy,
}: UserProfileCardProps) {
    const [info, setInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserInfo = useCallback(async () => {
        try {
            const res = await authFetch(API.MINIHOMPY_VIEW(userId));
            if (!res.ok) return;
            const data = await res.json();
            setInfo({
                nickname: data.ownerNickname || "익명",
                joinedAt: data.ownerJoinedAt || null,
                points: data.settings?.totalLikes ?? 0,
                petType: data.ownerPetType || "dog",
                isAdmin: false,
            });
        } catch {
            // 실패 시 기본값
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchUserInfo();
    }, [fetchUserInfo]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const formatJoinDate = (isoString: string) => {
        const d = new Date(isoString);
        return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    };

    return (
        <div
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-72 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 text-memento-500 animate-spin" />
                    </div>
                ) : info ? (
                    <>
                        {/* 프로필 헤더 */}
                        <div className="relative bg-gradient-to-br from-memento-100 to-memento-50 dark:from-gray-700 dark:to-gray-800 px-5 pt-5 pb-4">
                            <button
                                onClick={onClose}
                                className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-gray-600 transition-colors"
                                aria-label="닫기"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-600 flex items-center justify-center shadow-sm">
                                    <LevelBadge
                                        points={info.points}
                                        petType={info.petType as "dog" | "cat" | "other"}
                                        isAdmin={info.isAdmin}
                                        size="lg"
                                        showTooltip={false}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold text-gray-900 dark:text-white truncate">
                                        {info.nickname}
                                    </p>
                                    {info.joinedAt && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Calendar className="w-3 h-3 text-gray-400" />
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatJoinDate(info.joinedAt)} 가입
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 액션 버튼 */}
                        <div className="px-4 py-3">
                            <button
                                onClick={() => {
                                    onClose();
                                    onVisitMinihompy(userId);
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-memento-50 dark:bg-memento-900/20 hover:bg-memento-100 dark:hover:bg-memento-900/30 text-memento-600 dark:text-memento-400 text-sm font-medium transition-colors"
                            >
                                <Home className="w-4 h-4" />
                                미니홈피 방문
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="py-8 text-center text-sm text-gray-400">
                        정보를 불러올 수 없습니다
                    </div>
                )}
            </div>
        </div>
    );
}
