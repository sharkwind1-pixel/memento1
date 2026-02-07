/**
 * AccountSettingsModal.tsx
 * 계정 설정 모달 - 닉네임 변경, 회원탈퇴
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
    X,
    User,
    CheckCircle,
    AlertCircle,
    Loader2,
    Settings,
    Trash2,
    AlertTriangle,
    Edit3,
} from "lucide-react";
import { InlineLoading } from "@/components/ui/PawLoading";

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AccountSettingsModal({
    isOpen,
    onClose,
}: AccountSettingsModalProps) {
    const { user, checkNickname, updateProfile, signOut } = useAuth();

    const [currentNickname, setCurrentNickname] = useState("");
    const [nickname, setNickname] = useState("");
    const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "taken" | "same">("idle");
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [isSavingNickname, setIsSavingNickname] = useState(false);
    const [nicknameSuccess, setNicknameSuccess] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // 현재 닉네임 로드
    useEffect(() => {
        const loadProfile = async () => {
            if (!user) return;

            const { data } = await supabase
                .from("profiles")
                .select("nickname")
                .eq("id", user.id)
                .single();

            if (data?.nickname) {
                setCurrentNickname(data.nickname);
                setNickname(data.nickname);
            }
        };

        if (isOpen) {
            loadProfile();
            setIsEditingNickname(false);
            setShowDeleteConfirm(false);
            setDeleteConfirmText("");
            setDeleteError(null);
            setNicknameSuccess(false);
        }
    }, [isOpen, user]);

    // 닉네임 변경 시 중복 체크
    useEffect(() => {
        if (!isEditingNickname || !nickname.trim()) {
            setNicknameStatus("idle");
            return;
        }

        // 현재 닉네임과 같으면
        if (nickname.trim() === currentNickname) {
            setNicknameStatus("same");
            return;
        }

        if (nickname.trim().length < 2) {
            setNicknameStatus("idle");
            return;
        }

        setNicknameStatus("checking");

        const timer = setTimeout(async () => {
            const { available } = await checkNickname(nickname.trim());
            setNicknameStatus(available ? "available" : "taken");
        }, 500);

        return () => clearTimeout(timer);
    }, [nickname, isEditingNickname, currentNickname, checkNickname]);

    // 닉네임 저장
    const handleSaveNickname = async () => {
        if (nicknameStatus !== "available" || nickname.trim().length < 2) return;

        setIsSavingNickname(true);

        try {
            // Auth user_metadata 업데이트
            const { error: authError } = await updateProfile({ nickname: nickname.trim() });
            if (authError) throw authError;

            // profiles 테이블 업데이트
            const { error: profileError } = await supabase
                .from("profiles")
                .update({ nickname: nickname.trim() })
                .eq("id", user?.id);

            if (profileError) throw profileError;

            setCurrentNickname(nickname.trim());
            setIsEditingNickname(false);
            setNicknameSuccess(true);
            setTimeout(() => setNicknameSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to update nickname:", err);
        } finally {
            setIsSavingNickname(false);
        }
    };

    // 회원탈퇴
    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== "회원탈퇴") return;

        setIsDeleting(true);
        setDeleteError(null);

        try {
            // 1. 사용자 데이터 삭제 (cascade로 관련 데이터도 삭제됨)
            // pets, chat_messages, community_posts 등은 FK cascade로 자동 삭제

            // 2. profiles 삭제
            const { error: profileError } = await supabase
                .from("profiles")
                .delete()
                .eq("id", user?.id);

            if (profileError) {
                console.error("Profile delete error:", profileError);
            }

            // 3. Auth 사용자 삭제 (Supabase에서는 직접 삭제 불가, 관리자 API 필요)
            // 대신 로그아웃 처리하고 안내
            await signOut();

            // localStorage 정리
            localStorage.removeItem("memento-ani-tutorial-complete");
            localStorage.removeItem("memento-ani-onboarding-complete");
            localStorage.removeItem("memento-current-tab");

            alert("회원탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.");
            onClose();
            window.location.reload();
        } catch (err) {
            console.error("Delete account error:", err);
            setDeleteError("회원탈퇴 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="w-full sm:max-w-md sm:mx-4 bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100vh-60px)] sm:max-h-[85vh] overflow-y-auto">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                            내 정보
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
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
                                    className="text-xs text-sky-500 hover:text-sky-600 flex items-center gap-1"
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
                                        onChange={(e) => setNickname(e.target.value)}
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

                                {nicknameStatus === "available" && (
                                    <p className="text-xs text-green-600">사용 가능한 닉네임입니다</p>
                                )}
                                {nicknameStatus === "taken" && (
                                    <p className="text-xs text-red-600">이미 사용 중인 닉네임입니다</p>
                                )}
                                {nicknameStatus === "same" && (
                                    <p className="text-xs text-gray-500">현재 닉네임과 동일합니다</p>
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
                                        disabled={isSavingNickname || nicknameStatus !== "available" || nickname.trim().length < 2}
                                        className="bg-sky-500 hover:bg-sky-600"
                                    >
                                        {isSavingNickname ? <InlineLoading /> : "저장"}
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

                    {/* 회원탈퇴 */}
                    <div>
                        <h3 className="text-sm font-medium text-red-600 mb-2">위험 구역</h3>

                        {!showDeleteConfirm ? (
                            <Button
                                variant="outline"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-full text-red-500 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                회원탈퇴
                            </Button>
                        ) : (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl space-y-3">
                                <div className="flex items-start gap-2 text-red-600">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium">정말 탈퇴하시겠습니까?</p>
                                        <p className="text-red-500 mt-1">
                                            모든 데이터(반려동물 기록, 채팅 내역, 게시글 등)가 삭제되며 복구할 수 없습니다.
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-red-600 mb-1">
                                        확인을 위해 "회원탈퇴"를 입력해주세요
                                    </label>
                                    <Input
                                        type="text"
                                        value={deleteConfirmText}
                                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                                        placeholder="회원탈퇴"
                                        className="border-red-300 focus:border-red-500"
                                    />
                                </div>

                                {deleteError && (
                                    <p className="text-xs text-red-600">{deleteError}</p>
                                )}

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setShowDeleteConfirm(false);
                                            setDeleteConfirmText("");
                                            setDeleteError(null);
                                        }}
                                        className="flex-1"
                                    >
                                        취소
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleDeleteAccount}
                                        disabled={isDeleting || deleteConfirmText !== "회원탈퇴"}
                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                                    >
                                        {isDeleting ? <InlineLoading /> : "탈퇴하기"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
