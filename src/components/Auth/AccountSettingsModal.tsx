/**
 * AccountSettingsModal.tsx
 * 계정 설정 모달 - 닉네임 변경, 회원탈퇴
 */

"use client";

import { useState, useEffect } from "react";
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
    Trash2,
    AlertTriangle,
    Edit3,
    Ban,
    UserX,
    Download,
} from "lucide-react";
import { InlineLoading } from "@/components/ui/PawLoading";
import { toast } from "sonner";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import type { UserBlock } from "@/types";

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AccountSettingsModal({
    isOpen,
    onClose,
}: AccountSettingsModalProps) {
    const { user, updateProfile, signOut } = useAuth();
    useEscapeClose(isOpen, onClose);

    const [currentNickname, setCurrentNickname] = useState("");
    const [nickname, setNickname] = useState("");
    const [isEditingNickname, setIsEditingNickname] = useState(false);

    // 닉네임 중복 체크 훅
    const {
        status: nicknameStatus,
        message: nicknameMessage,
        reset: resetNickname,
    } = useNicknameCheck(nickname, {
        enabled: isEditingNickname,
        currentNickname,
    });
    const [isSavingNickname, setIsSavingNickname] = useState(false);
    const [nicknameSuccess, setNicknameSuccess] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // 차단 유저 관리
    const [blockedUsers, setBlockedUsers] = useState<UserBlock[]>([]);
    const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
    const [showBlockedUsers, setShowBlockedUsers] = useState(false);
    const [unblockingId, setUnblockingId] = useState<string | null>(null);

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

    // 차단 목록 로드
    const loadBlockedUsers = async () => {
        setIsLoadingBlocks(true);
        try {
            const res = await authFetch(API.BLOCKS);
            if (res.ok) {
                const data = await res.json();
                setBlockedUsers(data.blocks || []);
            }
        } catch {
            // 로드 실패 시 빈 목록
        } finally {
            setIsLoadingBlocks(false);
        }
    };

    // 차단 해제
    const handleUnblock = async (blockedUserId: string, nickname: string) => {
        if (!confirm(`"${nickname}" 님의 차단을 해제하시겠습니까?`)) return;

        setUnblockingId(blockedUserId);
        try {
            const res = await authFetch(`${API.BLOCKS}?blockedUserId=${blockedUserId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setBlockedUsers(prev => prev.filter(b => b.blockedUserId !== blockedUserId));
                toast.success(`"${nickname}" 님의 차단이 해제되었습니다`);
            } else {
                toast.error("차단 해제에 실패했습니다");
            }
        } catch {
            toast.error("차단 해제에 실패했습니다");
        } finally {
            setUnblockingId(null);
        }
    };

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
            // Auth user_metadata 업데이트
            const { error: authError } = await updateProfile({
                nickname: nickname.trim(),
            });
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
        } catch {
            // 닉네임 업데이트 실패
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
            // 0. 사용량 통계 수집 (재가입 악용 방지용)
            const [petsResult, photosResult, profileResult] = await Promise.all(
                [
                    supabase
                        .from("pets")
                        .select("id", { count: "exact" })
                        .eq("user_id", user?.id),
                    supabase
                        .from("pet_photos")
                        .select("id", { count: "exact" })
                        .eq("user_id", user?.id),
                    supabase
                        .from("profiles")
                        .select("is_premium")
                        .eq("id", user?.id)
                        .single(),
                ],
            );

            // AI 사용량은 localStorage에서 가져오기
            const aiUsageData = localStorage.getItem("memento-ani-chat-usage");
            let totalAiUsage = 0;
            if (aiUsageData) {
                try {
                    const parsed = JSON.parse(aiUsageData);
                    totalAiUsage = parsed.count || 0;
                } catch {
                    // ignore
                }
            }

            // 1. 삭제 계정 정보 보관 (30일 재가입 제한)
            await supabase.rpc("save_deleted_account", {
                p_user_id: user?.id,
                p_email: user?.email || "",
                p_nickname: currentNickname,
                p_ai_usage: totalAiUsage,
                p_pets_count: petsResult.count || 0,
                p_photos_count: photosResult.count || 0,
                p_was_premium: profileResult.data?.is_premium || false,
                p_reason: null,
                p_cooldown_days: 30,
            });

            // 2. profiles 삭제 (cascade로 관련 데이터도 삭제됨)
            const { error: profileError } = await supabase
                .from("profiles")
                .delete()
                .eq("id", user?.id);

            if (profileError) {
                // 프로필 삭제 실패 (무시하고 계속 진행)
            }

            // 3. Auth 사용자 삭제 (Supabase에서는 직접 삭제 불가, 관리자 API 필요)
            // 대신 로그아웃 처리하고 안내
            await signOut();

            // localStorage 정리
            localStorage.removeItem("memento-ani-tutorial-complete");
            localStorage.removeItem("memento-ani-onboarding-complete");
            localStorage.removeItem("memento-current-tab");
            localStorage.removeItem("memento-ani-chat-usage");

            toast.success(
                "회원탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.",
            );
            onClose();
            window.location.reload();
        } catch {
            setDeleteError(
                "회원탈퇴 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
            );
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
                        onClick={onClose}
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
                                        className="bg-sky-500 hover:bg-sky-600"
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

                    {/* 차단 유저 관리 */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                <Ban className="w-4 h-4" />
                                차단 유저 관리
                            </h3>
                            <button
                                onClick={() => {
                                    setShowBlockedUsers(!showBlockedUsers);
                                    if (!showBlockedUsers) loadBlockedUsers();
                                }}
                                className="text-xs text-sky-500 hover:text-sky-600"
                            >
                                {showBlockedUsers ? "접기" : "보기"}
                            </button>
                        </div>

                        {showBlockedUsers && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                {isLoadingBlocks ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                    </div>
                                ) : blockedUsers.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-3">
                                        차단한 유저가 없습니다
                                    </p>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {blockedUsers.map((block) => (
                                            <div
                                                key={block.id}
                                                className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg px-3 py-2"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <UserX className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                        {block.blockedNickname || "알 수 없음"}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleUnblock(block.blockedUserId, block.blockedNickname || "알 수 없음")}
                                                    disabled={unblockingId === block.blockedUserId}
                                                    className="text-xs text-sky-500 hover:text-sky-600 h-7 px-2"
                                                >
                                                    {unblockingId === block.blockedUserId ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        "해제"
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

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

                    {/* 회원탈퇴 */}
                    <div>
                        <h3 className="text-sm font-medium text-red-600 mb-2">
                            위험 구역
                        </h3>

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
                                        <p className="font-medium">
                                            정말 탈퇴하시겠습니까?
                                        </p>
                                        <p className="text-red-500 mt-1">
                                            모든 데이터(반려동물 기록, 채팅
                                            내역, 게시글 등)가 삭제되며 복구할
                                            수 없습니다.
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-red-600 mb-1">
                                        확인을 위해 &quot;회원탈퇴&quot;를
                                        입력해주세요
                                    </label>
                                    <Input
                                        type="text"
                                        value={deleteConfirmText}
                                        onChange={(e) =>
                                            setDeleteConfirmText(e.target.value)
                                        }
                                        placeholder="회원탈퇴"
                                        className="border-red-300 focus:border-red-500"
                                    />
                                </div>

                                {deleteError && (
                                    <p className="text-xs text-red-600">
                                        {deleteError}
                                    </p>
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
                                        disabled={
                                            isDeleting ||
                                            deleteConfirmText !== "회원탈퇴"
                                        }
                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                                    >
                                        {isDeleting ? (
                                            <InlineLoading />
                                        ) : (
                                            "탈퇴하기"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}
