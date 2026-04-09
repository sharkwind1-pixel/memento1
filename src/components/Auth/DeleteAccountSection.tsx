/**
 * DeleteAccountSection.tsx
 * 위험 구역 - 회원탈퇴 섹션
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { STORAGE_KEYS } from "@/constants/storage";
import { Trash2, AlertTriangle } from "lucide-react";
import { InlineLoading } from "@/components/ui/PawLoading";
import { toast } from "sonner";
import { API } from "@/config/apiEndpoints";
import { safeGetItem, safeRemoveItem } from "@/lib/safe-storage";

interface DeleteAccountSectionProps {
    userId: string;
    userEmail: string;
    currentNickname: string;
    isPremiumUser: boolean;
    onDeleteComplete: () => void;
}

export default function DeleteAccountSection({
    userId,
    userEmail,
    currentNickname,
    isPremiumUser,
    onDeleteComplete,
}: DeleteAccountSectionProps) {
    const { signOut } = useAuth();

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

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
                        .eq("user_id", userId),
                    supabase
                        .from("pet_photos")
                        .select("id", { count: "exact" })
                        .eq("user_id", userId),
                    supabase
                        .from("profiles")
                        .select("is_premium")
                        .eq("id", userId)
                        .single(),
                ],
            );

            // AI 사용량은 localStorage에서 가져오기
            const aiUsageData = safeGetItem(STORAGE_KEYS.CHAT_USAGE);
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
                p_user_id: userId,
                p_email: userEmail || "",
                p_nickname: currentNickname,
                p_ai_usage: totalAiUsage,
                p_pets_count: petsResult.count || 0,
                p_photos_count: photosResult.count || 0,
                p_was_premium: profileResult.data?.is_premium || false,
                p_reason: null,
                p_cooldown_days: 30,
            });

            // 2. Auth 사용자 삭제 (service_role로 auth.users 완전 삭제)
            // auth.users 삭제 시 CASCADE로 profiles도 삭제됨
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            if (token) {
                const res = await fetch(API.AUTH_DELETE_ACCOUNT, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ nickname: currentNickname }),
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    console.error("[회원탈퇴] auth 삭제 실패:", errData);
                    // auth 삭제 실패 시 profiles만이라도 삭제 시도
                    const { error: profileDeleteErr } = await supabase.from("profiles").delete().eq("id", userId);
                    if (profileDeleteErr) {
                        console.error("[회원탈퇴] profiles 삭제도 실패:", profileDeleteErr.message);
                        setDeleteError("탈퇴 처리 중 일부 오류가 발생했습니다. 고객센터에 문의해주세요.");
                    }
                }
            } else {
                // 토큰 없는 경우 profiles만 삭제
                await supabase.from("profiles").delete().eq("id", userId);
            }

            // 3. 로그아웃 처리
            await signOut();

            // localStorage 정리
            safeRemoveItem("memento-ani-tutorial-complete");
            safeRemoveItem("memento-ani-onboarding-complete");
            safeRemoveItem("memento-current-tab");
            safeRemoveItem(STORAGE_KEYS.CHAT_USAGE);

            toast.success(
                "회원탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.",
            );
            onDeleteComplete();
            window.location.reload();
        } catch {
            setDeleteError(
                "회원탈퇴 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
            );
        } finally {
            setIsDeleting(false);
        }
    };

    return (
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
                                내역, AI 생성 영상, 게시글 등)가
                                영구 삭제되며 복구할 수 없습니다.
                            </p>
                            {isPremiumUser && (
                                <p className="text-red-500 mt-1 text-xs">
                                    현재 구독 중인 플랜도 즉시 해지됩니다.
                                    남은 기간에 대한 환불은 고객센터로 문의해주세요.
                                </p>
                            )}
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
    );
}
