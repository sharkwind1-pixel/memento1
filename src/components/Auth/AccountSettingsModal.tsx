/**
 * AccountSettingsModal.tsx
 * 계정 설정 모달 - 닉네임 변경, 회원탈퇴
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useNicknameCheck } from "@/hooks/useNicknameCheck";
import { supabase } from "@/lib/supabase";
import {
    X,
    User,
    CheckCircle,
    AlertCircle,
    Loader2,
    Settings,
    Download,
    Edit3,
} from "lucide-react";
import { InlineLoading } from "@/components/ui/PawLoading";
import { toast } from "sonner";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import BlockedUsersSection from "@/components/Auth/BlockedUsersSection";
import NotificationSettingsSection from "@/components/Auth/NotificationSettingsSection";
import SubscriptionSection from "@/components/Auth/SubscriptionSection";
import DeleteAccountSection from "@/components/Auth/DeleteAccountSection";

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AccountSettingsModal({
    isOpen,
    onClose,
}: AccountSettingsModalProps) {
    const { user, updateProfile, isSimpleMode, toggleSimpleMode, isPremiumUser, subscriptionTier } = useAuth();

    // X 버튼 / ESC / 배경 클릭으로 닫을 때: pushState된 히스토리도 되돌리기
    const closedByButtonRef = React.useRef(false);
    const handleClose = useCallback(() => {
        closedByButtonRef.current = true;
        // pushState로 추가된 히스토리 엔트리 제거
        if (window.history.state?.modal === "account-settings") {
            window.history.back();
        } else {
            onClose();
        }
    }, [onClose]);

    useEscapeClose(isOpen, handleClose);

    // 모바일 뒤로가기 버튼으로 모달 닫기
    useEffect(() => {
        if (!isOpen) return;
        closedByButtonRef.current = false;
        // 모달 열릴 때 히스토리 엔트리 추가
        window.history.pushState({ modal: "account-settings" }, "");
        const handlePopState = () => {
            onClose();
        };
        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [isOpen, onClose]);

    const [currentNickname, setCurrentNickname] = useState("");
    const [nickname, setNickname] = useState("");
    const [isEditingNickname, setIsEditingNickname] = useState(false);

    // 닉네임 중복 체크 훅
    const {
        status: nicknameStatus,
        message: nicknameMessage,
    } = useNicknameCheck(nickname, {
        enabled: isEditingNickname,
        currentNickname,
    });
    const [isSavingNickname, setIsSavingNickname] = useState(false);
    const [nicknameSuccess, setNicknameSuccess] = useState(false);
    const nicknameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 구독 만료일 (parent가 로드)
    const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);

    // 현재 닉네임 + 프리미엄 만료일 로드 (모달이 열릴 때마다 최신 데이터 fetch)
    useEffect(() => {
        const loadProfile = async () => {
            if (!user) return;

            const { data } = await supabase
                .from("profiles")
                .select("nickname, premium_expires_at")
                .eq("id", user.id)
                .single();

            if (data?.nickname) {
                setCurrentNickname(data.nickname);
                setNickname(data.nickname);
            }
            setPremiumExpiresAt(data?.premium_expires_at || null);
        };

        if (isOpen) {
            loadProfile();
            setIsEditingNickname(false);
            setNicknameSuccess(false);
        }
    }, [isOpen, user]);

    // 개인정보 다운로드
    const [isDownloading, setIsDownloading] = useState(false);
    const handleDownloadData = async () => {
        if (!user) return;
        setIsDownloading(true);

        try {
            // 프로필
            const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            // 반려동물
            const { data: pets } = await supabase
                .from("pets")
                .select("*")
                .eq("user_id", user.id);

            // 게시글
            const { data: posts } = await supabase
                .from("community_posts")
                .select("id, title, content, board_type, badge, created_at")
                .eq("user_id", user.id);

            // 댓글
            const { data: comments } = await supabase
                .from("post_comments")
                .select("id, content, post_id, created_at")
                .eq("user_id", user.id);

            const exportData = {
                exportedAt: new Date().toISOString(),
                email: user.email,
                profile: profile || {},
                pets: pets || [],
                posts: posts || [],
                comments: comments || [],
            };

            // JSON 파일로 다운로드
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `memento-ani-data-${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("개인정보가 다운로드되었습니다");
        } catch {
            toast.error("데이터 다운로드에 실패했습니다");
        } finally {
            setIsDownloading(false);
        }
    };

    // 닉네임 저장
    const handleSaveNickname = async () => {
        if (nicknameStatus !== "available" || nickname.trim().length < 2)
            return;

        setIsSavingNickname(true);

        try {
            // updateProfile이 auth.users + profiles 양쪽 모두 업데이트
            const { error } = await updateProfile({
                nickname: nickname.trim(),
            });
            if (error) throw error;

            setCurrentNickname(nickname.trim());
            setIsEditingNickname(false);
            setNicknameSuccess(true);
            if (nicknameTimerRef.current) clearTimeout(nicknameTimerRef.current);
            nicknameTimerRef.current = setTimeout(() => setNicknameSuccess(false), 3000);
        } catch {
            toast.error("닉네임 변경에 실패했어요. 다시 시도해주세요.");
        } finally {
            setIsSavingNickname(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div className="min-h-full flex items-start justify-center pt-16 pb-20 px-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl relative" role="dialog" aria-modal="true" aria-labelledby="account-settings-title" onClick={(e) => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <h2 id="account-settings-title" className="text-lg font-bold text-gray-800 dark:text-white">
                            내 정보
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                        aria-label="닫기"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    {/* 이메일 (읽기 전용) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            이메일
                        </label>
                        <p className="text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-xl">
                            {user?.email}
                        </p>
                    </div>

                    {/* 닉네임 */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                닉네임
                            </label>
                            {!isEditingNickname && (
                                <button
                                    onClick={() => setIsEditingNickname(true)}
                                    className="text-xs text-memento-500 hover:text-memento-600 flex items-center gap-1"
                                >
                                    <Edit3 className="w-3 h-3" />
                                    변경
                                </button>
                            )}
                        </div>

                        {isEditingNickname ? (
                            <div className="space-y-2">
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input
                                        type="text"
                                        value={nickname}
                                        onChange={(e) =>
                                            setNickname(e.target.value)
                                        }
                                        className={`pl-10 pr-10 h-12 rounded-xl ${
                                            nicknameStatus === "taken"
                                                ? "border-red-500"
                                                : nicknameStatus === "available"
                                                  ? "border-green-500"
                                                  : ""
                                        }`}
                                        minLength={2}
                                        maxLength={20}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {nicknameStatus === "checking" && (
                                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                        )}
                                        {nicknameStatus === "available" && (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        )}
                                        {nicknameStatus === "taken" && (
                                            <AlertCircle className="w-5 h-5 text-red-500" />
                                        )}
                                    </div>
                                </div>

                                {nicknameMessage && (
                                    <p
                                        className={`text-xs ${
                                            nicknameStatus === "available"
                                                ? "text-green-600"
                                                : nicknameStatus === "taken" ||
                                                    nicknameStatus === "invalid"
                                                  ? "text-red-600"
                                                  : "text-gray-500"
                                        }`}
                                    >
                                        {nicknameMessage}
                                    </p>
                                )}

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setIsEditingNickname(false);
                                            setNickname(currentNickname);
                                        }}
                                    >
                                        취소
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSaveNickname}
                                        disabled={
                                            isSavingNickname ||
                                            nicknameStatus !== "available" ||
                                            nickname.trim().length < 2
                                        }
                                        className="bg-memento-500 hover:bg-memento-600"
                                    >
                                        {isSavingNickname ? (
                                            <InlineLoading />
                                        ) : (
                                            "저장"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <p className="text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-xl flex-1">
                                    {currentNickname || "닉네임 없음"}
                                </p>
                                {nicknameSuccess && (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                        <CheckCircle className="w-4 h-4" />
                                        저장됨
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 구분선 */}
                    <hr className="border-gray-200 dark:border-gray-700" />

                    {/* 알림 설정 + 화면 설정 + 위치정보 */}
                    {user && (
                        <NotificationSettingsSection
                            isOpen={isOpen}
                            userId={user.id}
                            isSimpleMode={isSimpleMode}
                            toggleSimpleMode={toggleSimpleMode}
                        />
                    )}

                    {/* 구분선 */}
                    <hr className="border-gray-200 dark:border-gray-700" />

                    <BlockedUsersSection />

                    {/* 구분선 */}
                    <hr className="border-gray-200 dark:border-gray-700" />

                    {/* 개인정보 다운로드 */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-2">
                            <Download className="w-4 h-4" />
                            내 데이터
                        </h3>
                        <Button
                            variant="outline"
                            onClick={handleDownloadData}
                            disabled={isDownloading}
                            className="w-full rounded-xl"
                        >
                            {isDownloading ? (
                                <InlineLoading />
                            ) : (
                                <>
                                    <Download className="w-4 h-4 mr-2" />
                                    내 개인정보 다운로드 (JSON)
                                </>
                            )}
                        </Button>
                        <p className="text-[10px] text-gray-400 mt-1.5">
                            프로필, 반려동물 기록, 게시글, 댓글 등 모든 데이터를 다운로드합니다
                        </p>
                    </div>

                    {/* 구분선 */}
                    <hr className="border-gray-200 dark:border-gray-700" />

                    {/* 구독 관리 */}
                    {user && (
                        <SubscriptionSection
                            userId={user.id}
                            isPremiumUser={isPremiumUser}
                            subscriptionTier={subscriptionTier}
                            premiumExpiresAt={premiumExpiresAt}
                        />
                    )}

                    {/* 구분선 */}
                    <hr className="border-gray-200 dark:border-gray-700" />

                    {/* 회원탈퇴 */}
                    {user && (
                        <DeleteAccountSection
                            userId={user.id}
                            userEmail={user.email || ""}
                            currentNickname={currentNickname}
                            isPremiumUser={isPremiumUser}
                            onDeleteComplete={onClose}
                        />
                    )}
                </div>
            </div>
            </div>
        </div>
    );
}
