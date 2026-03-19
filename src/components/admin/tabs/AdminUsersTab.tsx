/**
 * ============================================================================
 * tabs/AdminUsersTab.tsx
 * ============================================================================
 * 관리자 유저 관리 탭
 *
 * 📌 주요 기능:
 * - 유저 목록 조회 및 검색
 * - 유저 밴/차단 해제
 * - 프리미엄 부여/해제
 * - 온보딩 리셋
 * - 탈퇴 처리
 * ============================================================================
 */

"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    Search,
    RefreshCw,
    Users,
} from "lucide-react";
import { UserRow } from "../types";
import { PremiumModal } from "../modals/PremiumModal";
import { PointsAwardModal } from "../modals/PointsAwardModal";
import LevelBadge from "@/components/features/points/LevelBadge";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { safeRemoveItem } from "@/lib/safe-storage";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ============================================================================
// Props 타입 정의
// ============================================================================

interface AdminUsersTabProps {
    /** 유저 목록 */
    users: UserRow[];
    /** 새로고침 함수 */
    onRefresh: () => void;
    /** 유저 상태 업데이트 함수 */
    onUpdateUsers: React.Dispatch<React.SetStateAction<UserRow[]>>;
    /** 탈퇴 처리 모달 열기 */
    onOpenWithdrawalModal: (user: UserRow) => void;
    /** 통계 새로고침 (프리미엄 변경 시) */
    onRefreshStats: () => void;
    /** 현재 로그인한 관리자 ID */
    currentUserId: string;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AdminUsersTab({
    users,
    onRefresh,
    onUpdateUsers,
    onOpenWithdrawalModal,
    onRefreshStats,
    currentUserId,
}: AdminUsersTabProps) {
    // Auth context (포인트 갱신용)
    const { refreshPoints } = useAuth();

    // 로컬 상태
    const [searchQuery, setSearchQuery] = useState("");
    const [premiumModalUser, setPremiumModalUser] = useState<UserRow | null>(null);
    const [pointsModalUser, setPointsModalUser] = useState<UserRow | null>(null);
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText: string;
        destructive: boolean;
        onConfirm: () => void;
    }>({ isOpen: false, title: "", message: "", confirmText: "", destructive: false, onConfirm: () => {} });

    // ========================================================================
    // 유저 밴/해제
    // ========================================================================
    const toggleBan = (targetUser: UserRow) => {
        const newBanStatus = !targetUser.is_banned;
        const action = newBanStatus ? "차단" : "차단 해제";

        if (newBanStatus) {
            const reason = prompt(`${targetUser.email}을(를) 차단합니다.\n\n차단 사유를 입력하세요:`);
            if (reason === null) return;
        }

        if (!newBanStatus) {
            // 차단 해제는 ConfirmDialog로
            setConfirmState({
                isOpen: true,
                title: "차단 해제",
                message: `${targetUser.email}의 차단을 해제하시겠습니까?`,
                confirmText: "해제",
                destructive: false,
                onConfirm: () => executeBanToggle(targetUser, newBanStatus, action),
            });
        } else {
            executeBanToggle(targetUser, newBanStatus, action);
        }
    };

    const executeBanToggle = async (targetUser: UserRow, newBanStatus: boolean, action: string) => {
        try {
            const res = await authFetch(API.ADMIN_UPDATE_PROFILE, {
                method: "PATCH",
                body: JSON.stringify({
                    targetUserId: targetUser.id,
                    updates: {
                        is_banned: newBanStatus,
                    },
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `${action} 실패`);
            }

            onUpdateUsers(prev =>
                prev.map(u =>
                    u.id === targetUser.id ? { ...u, is_banned: newBanStatus } : u
                )
            );

            toast.success(`${targetUser.email}이(가) ${action}되었습니다.`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : `${action}에 실패했습니다.`);
        }
    };

    // ========================================================================
    // 관리자 권한 부여/해제
    // ========================================================================
    const toggleAdmin = (targetUser: UserRow) => {
        const newAdminStatus = !targetUser.is_admin;
        const action = newAdminStatus ? "관리자 권한 부여" : "관리자 권한 해제";

        setConfirmState({
            isOpen: true,
            title: action,
            message: `${targetUser.email}의 ${action}를 진행하시겠습니까?`,
            confirmText: "확인",
            destructive: false,
            onConfirm: async () => {
                try {
                    const res = await authFetch(API.ADMIN_UPDATE_PROFILE, {
                        method: "PATCH",
                        body: JSON.stringify({
                            targetUserId: targetUser.id,
                            updates: { is_admin: newAdminStatus },
                        }),
                    });

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || "관리자 권한 변경 실패");
                    }

                    onUpdateUsers(prev =>
                        prev.map(u =>
                            u.id === targetUser.id
                                ? { ...u, is_admin: newAdminStatus }
                                : u
                        )
                    );

                    toast.success(`${targetUser.email}의 ${action}가 완료되었습니다.`);
                    onRefreshStats();
                } catch (err) {
                    toast.error(err instanceof Error ? err.message : "관리자 권한 변경에 실패했습니다.");
                }
            },
        });
    };

    // ========================================================================
    // 온보딩 리셋
    // ========================================================================
    const resetOnboarding = (userId: string, userEmail: string) => {
        setConfirmState({
            isOpen: true,
            title: "온보딩 리셋",
            message: `${userEmail}의 온보딩을 리셋하시겠습니까?\n\n초기화 항목:\n- 튜토리얼 완료 상태\n- 온보딩 완료 상태\n- 사용자 유형`,
            confirmText: "리셋",
            destructive: true,
            onConfirm: () => executeResetOnboarding(userId, userEmail),
        });
    };

    const executeResetOnboarding = async (userId: string, userEmail: string) => {
        try {
            const res = await authFetch(API.ADMIN_UPDATE_PROFILE, {
                method: "PATCH",
                body: JSON.stringify({
                    targetUserId: userId,
                    updates: {
                        tutorial_completed_at: null,
                        onboarding_completed_at: null,
                        user_type: null,
                        onboarding_data: null,
                    },
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                toast.error(`온보딩 리셋 실패: ${errData.error || "알 수 없는 오류"}`);
                return;
            }

            // 본인 계정이면 localStorage도 클리어
            if (userId === currentUserId) {
                safeRemoveItem("memento-ani-tutorial-complete");
                safeRemoveItem("memento-ani-onboarding-complete");
                toast.success("온보딩이 리셋되었습니다! 새로고침하면 처음부터 시작됩니다.");
            } else {
                toast.success("온보딩이 리셋되었습니다.");
            }
        } catch (err) {
            console.error("[AdminUsers] 온보딩 리셋 예외:", err);
            toast.error("온보딩 리셋에 실패했습니다.");
        }
    };

    // ========================================================================
    // 프리미엄 해제
    // ========================================================================
    const revokePremium = (targetUser: UserRow) => {
        setConfirmState({
            isOpen: true,
            title: "프리미엄 해제",
            message: `${targetUser.email}의 프리미엄을 해제하시겠습니까?`,
            confirmText: "해제",
            destructive: true,
            onConfirm: () => executeRevokePremium(targetUser),
        });
    };

    const executeRevokePremium = async (targetUser: UserRow) => {
        try {
            const res = await authFetch(API.ADMIN_UPDATE_PROFILE, {
                method: "PATCH",
                body: JSON.stringify({
                    targetUserId: targetUser.id,
                    updates: {
                        is_premium: false,
                        premium_expires_at: new Date().toISOString(),
                        premium_plan: null,
                    },
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "프리미엄 해제 실패");
            }

            onUpdateUsers(prev =>
                prev.map(u =>
                    u.id === targetUser.id
                        ? { ...u, is_premium: false, premium_expires_at: new Date().toISOString(), premium_plan: undefined }
                        : u
                )
            );

            toast.success("프리미엄이 해제되었습니다.");
            onRefreshStats();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "프리미엄 해제에 실패했습니다.");
        }
    };

    // ========================================================================
    // 프리미엄 부여
    // ========================================================================
    const grantPremium = async (duration: string, reason: string) => {
        if (!premiumModalUser) return;

        try {
            const isUnlimited = duration === "unlimited";
            const durationDays = isUnlimited ? null : parseInt(duration);
            const expiresAt = isUnlimited
                ? null
                : new Date(Date.now() + (durationDays || 30) * 24 * 60 * 60 * 1000).toISOString();

            const res = await authFetch(API.ADMIN_UPDATE_PROFILE, {
                method: "PATCH",
                body: JSON.stringify({
                    targetUserId: premiumModalUser.id,
                    updates: {
                        is_premium: true,
                        premium_started_at: new Date().toISOString(),
                        premium_expires_at: expiresAt,
                        premium_plan: "admin_grant",
                    },
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "프리미엄 부여 실패");
            }

            onUpdateUsers(prev =>
                prev.map(u =>
                    u.id === premiumModalUser.id
                        ? {
                            ...u,
                            is_premium: true,
                            premium_started_at: new Date().toISOString(),
                            premium_expires_at: expiresAt || undefined,
                            premium_plan: "admin_grant",
                        }
                        : u
                )
            );

            toast.success(
                `${premiumModalUser.email}에게 프리미엄이 부여되었습니다! ${isUnlimited ? "(무기한)" : `(${durationDays}일)`}`
            );
            setPremiumModalUser(null);
            onRefreshStats();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "프리미엄 부여에 실패했습니다.");
        }
    };

    // ========================================================================
    // 포인트 지급 (service_role API 사용 — 트리거 우회)
    // ========================================================================
    const awardPoints = async (awardAmount: number, reason: string) => {
        if (!pointsModalUser) return;

        const targetId = pointsModalUser.id;

        try {
            const res = await authFetch(API.ADMIN_POINTS, {
                method: "POST",
                body: JSON.stringify({
                    targetUserId: targetId,
                    points: awardAmount,
                    reason: reason || "관리자 지급",
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "포인트 지급 실패");
            }

            const result = await res.json();
            const newPoints = result.newTotal ?? (pointsModalUser.points ?? 0) + awardAmount;

            // 로컬 상태 업데이트
            onUpdateUsers(prev =>
                prev.map(u =>
                    u.id === targetId ? { ...u, points: newPoints } : u
                )
            );

            // 본인에게 지급한 경우 AuthContext 포인트 갱신
            if (targetId === currentUserId) {
                await refreshPoints();
            }

            toast.success(
                `${pointsModalUser.user_metadata?.nickname || pointsModalUser.email}에게 ${awardAmount.toLocaleString()}P 지급 완료! (총 ${newPoints.toLocaleString()}P)`
            );
            setPointsModalUser(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "포인트 지급에 실패했습니다.");
        }
    };

    // ========================================================================
    // 필터링된 유저 목록
    // ========================================================================
    const filteredUsers = users.filter(
        (u) =>
            searchQuery === "" ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.user_metadata?.nickname || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ========================================================================
    // 렌더링
    // ========================================================================
    return (
        <div className="space-y-4">
            {/* 검색 & 새로고침 */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="이메일 또는 닉네임으로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button variant="outline" onClick={onRefresh}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    새로고침
                </Button>
            </div>

            {/* 유저 목록 */}
            <Card>
                <CardContent className="pt-6">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                            <p>검색 결과가 없습니다</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredUsers.map((u) => (
                                <UserCard
                                    key={u.id}
                                    user={u}
                                    onToggleBan={() => toggleBan(u)}
                                    onToggleAdmin={() => toggleAdmin(u)}
                                    onResetOnboarding={() => resetOnboarding(u.id, u.email)}
                                    onOpenPremiumModal={() => setPremiumModalUser(u)}
                                    onRevokePremium={() => revokePremium(u)}
                                    onOpenWithdrawalModal={() => onOpenWithdrawalModal(u)}
                                    onOpenPointsModal={() => setPointsModalUser(u)}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 프리미엄 부여 모달 */}
            {premiumModalUser && (
                <PremiumModal
                    user={premiumModalUser}
                    onClose={() => setPremiumModalUser(null)}
                    onGrant={grantPremium}
                />
            )}

            {/* 포인트 지급 모달 */}
            {pointsModalUser && (
                <PointsAwardModal
                    user={pointsModalUser}
                    onClose={() => setPointsModalUser(null)}
                    onAward={awardPoints}
                />
            )}

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText}
                destructive={confirmState.destructive}
            />
        </div>
    );
}

// ============================================================================
// 유저 카드 컴포넌트
// ============================================================================

interface UserCardProps {
    user: UserRow;
    onToggleBan: () => void;
    onToggleAdmin: () => void;
    onResetOnboarding: () => void;
    onOpenPremiumModal: () => void;
    onRevokePremium: () => void;
    onOpenWithdrawalModal: () => void;
    onOpenPointsModal: () => void;
}

function UserCard({
    user,
    onToggleBan,
    onToggleAdmin,
    onResetOnboarding,
    onOpenPremiumModal,
    onRevokePremium,
    onOpenWithdrawalModal,
    onOpenPointsModal,
}: UserCardProps) {
    return (
        <div
            className={`p-3 rounded-xl border transition-colors ${
                user.is_banned
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50"
                    : user.is_admin
                        ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50"
                        : user.is_premium
                            ? "bg-amber-50 dark:bg-gray-700/20 border-amber-200 dark:border-gray-700/50"
                            : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
            }`}
        >
            {/* 이메일 */}
            <p className="font-medium text-xs truncate">{user.email}</p>

            {/* 닉네임 + 날짜 + 뱃지 한 줄 */}
            <div className="flex items-center gap-1 mt-1 flex-wrap">
                {user.user_metadata?.nickname && (
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {user.user_metadata.nickname}
                    </span>
                )}
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {new Date(user.created_at).toLocaleDateString("ko-KR")}
                </span>
                {user.is_admin && (
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[9px] px-1 py-0 leading-tight">
                        관리자
                    </Badge>
                )}
                {user.is_premium && (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300 text-[9px] px-1 py-0 leading-tight">
                        프리미엄
                    </Badge>
                )}
                {user.is_banned && (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[9px] px-1 py-0 leading-tight">
                        차단
                    </Badge>
                )}
            </div>

            {/* 등급 */}
            <div className="flex items-center gap-1 mt-1">
                <LevelBadge points={user.points ?? 0} petType={user.petType} isAdmin={user.is_admin} size="lg" showName />
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {(user.points ?? 0).toLocaleString()}P
                </span>
            </div>

            {/* 프리미엄 만료일 */}
            {user.is_premium && user.premium_expires_at && (
                <p className="text-[10px] text-amber-600 mt-1">
                    만료: {new Date(user.premium_expires_at).toLocaleDateString("ko-KR")}
                </p>
            )}

            {/* 액션 버튼 - 항상 3열 그리드, 네이티브 button으로 크기 완전 제어 */}
            <div className="grid grid-cols-3 gap-1 pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                    type="button"
                    onClick={onToggleBan}
                    className={`h-7 rounded text-[10px] font-medium transition-colors ${
                        user.is_banned
                            ? "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                            : "bg-red-500 text-white hover:bg-red-600"
                    }`}
                >
                    {user.is_banned ? "차단해제" : "차단"}
                </button>

                <button
                    type="button"
                    onClick={onToggleAdmin}
                    className={`h-7 rounded border text-[10px] font-medium transition-colors ${
                        user.is_admin
                            ? "border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-800"
                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                    }`}
                >
                    관리자
                </button>

                <button
                    type="button"
                    onClick={user.is_premium ? onRevokePremium : onOpenPremiumModal}
                    className={`h-7 rounded border text-[10px] font-medium transition-colors ${
                        user.is_premium
                            ? "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                            : "border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 bg-white dark:bg-gray-800"
                    }`}
                >
                    {user.is_premium ? "프리미엄해제" : "프리미엄"}
                </button>

                <button
                    type="button"
                    onClick={onOpenPointsModal}
                    className="h-7 rounded border border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400 bg-white dark:bg-gray-800 text-[10px] font-medium transition-colors"
                >
                    포인트
                </button>

                <button
                    type="button"
                    onClick={onResetOnboarding}
                    className="h-7 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 text-[10px] font-medium transition-colors"
                >
                    리셋
                </button>

                <button
                    type="button"
                    onClick={onOpenWithdrawalModal}
                    className="h-7 rounded border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 text-[10px] font-medium transition-colors"
                >
                    탈퇴
                </button>
            </div>
        </div>
    );
}
