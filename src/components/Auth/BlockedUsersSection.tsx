/**
 * BlockedUsersSection.tsx
 * 차단 유저 관리 섹션 - AccountSettingsModal에서 분리
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Ban,
    UserX,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import type { UserBlock } from "@/types";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function BlockedUsersSection() {
    // 차단 유저 관리
    const [blockedUsers, setBlockedUsers] = useState<UserBlock[]>([]);
    const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
    const [showBlockedUsers, setShowBlockedUsers] = useState(false);
    const [unblockConfirm, setUnblockConfirm] = useState<{ isOpen: boolean; blockedUserId: string; nickname: string }>({ isOpen: false, blockedUserId: "", nickname: "" });
    const [unblockingId, setUnblockingId] = useState<string | null>(null);

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
    const handleUnblock = (blockedUserId: string, nickname: string) => {
        setUnblockConfirm({ isOpen: true, blockedUserId, nickname });
    };

    const executeUnblock = async () => {
        const { blockedUserId, nickname } = unblockConfirm;
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

    return (
        <>
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
                        className="text-xs text-memento-500 hover:text-memento-600"
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
                                            className="text-xs text-memento-500 hover:text-memento-600 h-7 px-2"
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
            <ConfirmDialog
                isOpen={unblockConfirm.isOpen}
                onClose={() => setUnblockConfirm(prev => ({ ...prev, isOpen: false }))}
                onConfirm={executeUnblock}
                title="차단 해제"
                message={`"${unblockConfirm.nickname}" 님의 차단을 해제하시겠습니까?`}
                confirmText="해제"
            />
        </>
    );
}
