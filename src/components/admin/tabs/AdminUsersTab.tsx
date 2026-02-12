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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    Search,
    RefreshCw,
    Ban,
    Shield,
    Crown,
    RotateCcw,
    Clock,
    Users,
    Star,
} from "lucide-react";
import { UserRow } from "../types";
import { PremiumModal } from "../modals/PremiumModal";
import { PointsAwardModal } from "../modals/PointsAwardModal";
import LevelBadge from "@/components/features/points/LevelBadge";

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

    // ========================================================================
    // 유저 밴/해제
    // ========================================================================
    const toggleBan = async (targetUser: UserRow) => {
        const newBanStatus = !targetUser.is_banned;
        const action = newBanStatus ? "차단" : "차단 해제";

        if (!confirm(`${targetUser.email}을(를) ${action}하시겠습니까?`)) return;

        try {
            const { error } = await supabase
                .from("profiles")
                .update({ is_banned: newBanStatus })
                .eq("id", targetUser.id);

            if (error) throw error;

            // 로컬 상태 업데이트
            onUpdateUsers(prev =>
                prev.map(u =>
                    u.id === targetUser.id ? { ...u, is_banned: newBanStatus } : u
                )
            );

            toast.success(`${targetUser.email}이(가) ${action}되었습니다.`);
        } catch {
            toast.error(`${action}에 실패했습니다.`);
        }
    };

    // ========================================================================
    // 관리자 권한 부여/해제
    // ========================================================================
    const toggleAdmin = async (targetUser: UserRow) => {
        const newAdminStatus = !targetUser.is_admin;
        const action = newAdminStatus ? "관리자 권한 부여" : "관리자 권한 해제";

        if (!confirm(`${targetUser.email}의 ${action}를 진행하시겠습니까?`)) return;

        try {
            // SECURITY DEFINER RPC 함수 사용
            const { error: rpcError } = await supabase.rpc("toggle_admin", {
                p_target_user_id: targetUser.id,
                p_is_admin: newAdminStatus,
            });

            // RPC 실패 시 직접 update 폴백
            if (rpcError) {
                const { error } = await supabase
                    .from("profiles")
                    .update({ is_admin: newAdminStatus })
                    .eq("id", targetUser.id);

                if (error) throw error;
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
        } catch {
            toast.error("관리자 권한 변경에 실패했습니다.");
        }
    };

    // ========================================================================
    // 온보딩 리셋
    // ========================================================================
    const resetOnboarding = async (userId: string, userEmail: string) => {
        const message = `${userEmail}의 온보딩을 리셋하시겠습니까?\n\n초기화 항목:\n- 튜토리얼 완료 상태\n- 온보딩 완료 상태\n- 사용자 유형`;

        if (!confirm(message)) return;

        try {
            const { error, data } = await supabase
                .from("profiles")
                .update({
                    tutorial_completed_at: null,
                    onboarding_completed_at: null,
                    user_type: null,
                    onboarding_data: null,
                })
                .eq("id", userId)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                toast.error("업데이트 실패: 권한이 없거나 해당 유저가 없습니다.");
                return;
            }

            // 본인 계정이면 localStorage도 클리어
            if (userId === currentUserId) {
                localStorage.removeItem("memento-ani-tutorial-complete");
                localStorage.removeItem("memento-ani-onboarding-complete");
                toast.success("온보딩이 리셋되었습니다! 새로고침하면 처음부터 시작됩니다.");
            } else {
                toast.success("온보딩이 리셋되었습니다.");
            }
        } catch {
            toast.error("온보딩 리셋에 실패했습니다.");
        }
    };

    // ========================================================================
    // 프리미엄 해제
    // ========================================================================
    const revokePremium = async (targetUser: UserRow) => {
        if (!confirm(`${targetUser.email}의 프리미엄을 해제하시겠습니까?`)) return;

        try {
            // SECURITY DEFINER RPC 함수 사용 (RLS 우회)
            const { error: rpcError } = await supabase.rpc("revoke_premium", {
                p_user_id: targetUser.id,
            });

            // RPC 실패 시 직접 update 폴백
            if (rpcError) {
                const { error } = await supabase
                    .from("profiles")
                    .update({
                        is_premium: false,
                        premium_expires_at: new Date().toISOString(),
                        premium_plan: null,
                    })
                    .eq("id", targetUser.id);

                if (error) throw error;
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
        } catch {
            toast.error("프리미엄 해제에 실패했습니다.");
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

            // SECURITY DEFINER RPC 함수 사용 (RLS 우회)
            const { error: rpcError } = await supabase.rpc("grant_premium", {
                p_user_id: premiumModalUser.id,
                p_plan: "admin_grant",
                p_duration_days: durationDays,
                p_reason: reason || null,
            });

            // RPC 실패 시 직접 update 폴백 (RLS 관리자 정책 필요)
            if (rpcError) {
                const { error } = await supabase
                    .from("profiles")
                    .update({
                        is_premium: true,
                        premium_started_at: new Date().toISOString(),
                        premium_expires_at: expiresAt,
                        premium_plan: "admin_grant",
                    })
                    .eq("id", premiumModalUser.id);

                if (error) throw error;
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
        } catch {
            toast.error("프리미엄 부여에 실패했습니다.");
        }
    };

    // ========================================================================
    // 포인트 지급 (profiles 테이블 직접 UPDATE — RPC 의존 제거)
    // ========================================================================
    const awardPoints = async (points: number, reason: string) => {
        if (!pointsModalUser) return;

        const targetId = pointsModalUser.id;
        const currentPoints = pointsModalUser.points ?? 0;
        const newPoints = currentPoints + points;

        try {
            // 1. profiles 직접 업데이트
            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    points: newPoints,
                    total_points_earned: (currentPoints) + points,
                })
                .eq("id", targetId);

            if (updateError) {
                console.error("[Admin Points] UPDATE 실패:", updateError);
                throw new Error("포인트 지급 실패: " + updateError.message);
            }

            // 2. 관리자 UI 로컬 상태 업데이트
            onUpdateUsers(prev =>
                prev.map(u =>
                    u.id === targetId ? { ...u, points: newPoints } : u
                )
            );

            // 3. 본인에게 지급한 경우 AuthContext 포인트 갱신
            if (targetId === currentUserId) {
                await refreshPoints();
            }

            toast.success(
                `${pointsModalUser.user_metadata?.nickname || pointsModalUser.email}에게 ${points.toLocaleString()}P 지급 완료! (총 ${newPoints.toLocaleString()}P)`
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
                        <div className="text-center py-8 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
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
            className={`p-4 rounded-xl border transition-colors ${
                user.is_banned
                    ? "bg-red-50 border-red-200"
                    : user.is_admin
                        ? "bg-purple-50 border-purple-200"
                        : user.is_premium
                            ? "bg-amber-50 border-amber-200"
                            : "bg-gray-50 border-gray-200"
            }`}
        >
            {/* 상단: 이메일, 뱃지 */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{user.email}</span>
                    {user.is_admin && (
                        <Badge className="bg-purple-100 text-purple-700">
                            <Shield className="w-3 h-3 mr-1" />
                            관리자
                        </Badge>
                    )}
                    {user.is_premium && (
                        <Badge className="bg-amber-100 text-amber-700">
                            <Crown className="w-3 h-3 mr-1" />
                            프리미엄
                        </Badge>
                    )}
                    {user.is_banned && (
                        <Badge className="bg-red-100 text-red-700">
                            <Ban className="w-3 h-3 mr-1" />
                            차단됨
                        </Badge>
                    )}
                </div>
                <span className="text-xs text-gray-500">
                    {new Date(user.created_at).toLocaleDateString("ko-KR")}
                </span>
            </div>

            {/* 닉네임 + 등급 */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
                {user.user_metadata?.nickname && (
                    <span className="text-sm text-gray-500">
                        닉네임: {user.user_metadata.nickname}
                    </span>
                )}
                <span className="flex items-center gap-1">
                    <LevelBadge points={user.points ?? 0} size="lg" showName />
                    <span className="text-xs text-gray-400 ml-1">
                        ({(user.points ?? 0).toLocaleString()}P)
                    </span>
                </span>
            </div>

            {/* 프리미엄 만료일 */}
            {user.is_premium && user.premium_expires_at && (
                <p className="text-xs text-amber-600 mb-2">
                    <Clock className="w-3 h-3 inline mr-1" />
                    만료: {new Date(user.premium_expires_at).toLocaleDateString("ko-KR")}
                </p>
            )}

            {/* 액션 버튼 */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                {/* 밴/해제 버튼 */}
                <Button
                    size="sm"
                    variant={user.is_banned ? "outline" : "destructive"}
                    onClick={onToggleBan}
                >
                    <Ban className="w-3 h-3 mr-1" />
                    {user.is_banned ? "차단 해제" : "차단"}
                </Button>

                {/* 관리자 권한 버튼 */}
                <Button
                    size="sm"
                    variant={user.is_admin ? "outline" : "outline"}
                    className={user.is_admin
                        ? "text-purple-600 border-purple-300 hover:bg-purple-50"
                        : "text-gray-600 border-gray-300 hover:bg-gray-50"
                    }
                    onClick={onToggleAdmin}
                >
                    <Shield className="w-3 h-3 mr-1" />
                    {user.is_admin ? "관리자 해제" : "관리자 부여"}
                </Button>

                {/* 프리미엄 버튼 */}
                {user.is_premium ? (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onRevokePremium}
                    >
                        <Crown className="w-3 h-3 mr-1" />
                        프리미엄 해제
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-amber-600 border-amber-300 hover:bg-amber-50"
                        onClick={onOpenPremiumModal}
                    >
                        <Crown className="w-3 h-3 mr-1" />
                        프리미엄 부여
                    </Button>
                )}

                {/* 포인트 지급 */}
                <Button
                    size="sm"
                    variant="outline"
                    className="text-sky-600 border-sky-300 hover:bg-sky-50"
                    onClick={onOpenPointsModal}
                >
                    <Star className="w-3 h-3 mr-1" />
                    포인트 지급
                </Button>

                {/* 온보딩 리셋 */}
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onResetOnboarding}
                >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    온보딩 리셋
                </Button>

                {/* 탈퇴 처리 */}
                <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={onOpenWithdrawalModal}
                >
                    탈퇴 처리
                </Button>
            </div>
        </div>
    );
}
