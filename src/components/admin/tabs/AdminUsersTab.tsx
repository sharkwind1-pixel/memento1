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
    ChevronDown,
    ChevronUp,
    PawPrint,
    MessageCircle,
    Clock,
    Crown,
} from "lucide-react";
import { UserRow, UserDetailData } from "../types";
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
    /** 유저 상세 데이터 캐시 */
    userDetails: Record<string, UserDetailData>;
    /** 유저 상세 로드 함수 */
    onLoadUserDetail: (userId: string) => void;
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
    userDetails,
    onLoadUserDetail,
}: AdminUsersTabProps) {
    // Auth context (포인트 갱신용)
    const { refreshPoints } = useAuth();

    // 로컬 상태
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
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
            message: `${userEmail}의 온보딩을 리셋하시겠습니까?\n\n초기화 항목:\n- 튜토리얼 완료 상태\n- 온보딩 완료 상태\n- 사용자 유형\n- 미션 진행 상태`,
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
                        onboarding_quests: {},
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
                        subscription_tier: "free",
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
                        ? { ...u, is_premium: false, premium_expires_at: new Date().toISOString(), premium_plan: undefined, subscription_tier: "free" }
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
    const grantPremium = async (duration: string, reason: string, plan: "basic" | "premium" = "premium") => {
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
                        subscription_tier: plan,
                    },
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "프리미엄 부여 실패");
            }

            const planLabel = plan === "basic" ? "베이직" : "프리미엄";
            onUpdateUsers(prev =>
                prev.map(u =>
                    u.id === premiumModalUser.id
                        ? {
                            ...u,
                            is_premium: true,
                            premium_started_at: new Date().toISOString(),
                            premium_expires_at: expiresAt || undefined,
                            premium_plan: "admin_grant",
                            subscription_tier: plan,
                        }
                        : u
                )
            );

            toast.success(
                `${premiumModalUser.email}에게 ${planLabel}이 부여되었습니다! ${isUnlimited ? "(무기한)" : `(${durationDays}일)`}`
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
                            {filteredUsers.map((u) => {
                                const isExpanded = expandedUserId === u.id;
                                const detail = userDetails[u.id];
                                return (
                                    <div key={u.id}>
                                        <UserCard
                                            user={u}
                                            isExpanded={isExpanded}
                                            onToggleExpand={() => {
                                                const newExpanded = isExpanded ? null : u.id;
                                                setExpandedUserId(newExpanded);
                                                if (newExpanded && !userDetails[u.id]) {
                                                    onLoadUserDetail(u.id);
                                                }
                                            }}
                                            onToggleBan={() => toggleBan(u)}
                                            onToggleAdmin={() => toggleAdmin(u)}
                                            onResetOnboarding={() => resetOnboarding(u.id, u.email)}
                                            onOpenPremiumModal={() => setPremiumModalUser(u)}
                                            onRevokePremium={() => revokePremium(u)}
                                            onOpenWithdrawalModal={() => onOpenWithdrawalModal(u)}
                                            onOpenPointsModal={() => setPointsModalUser(u)}
                                        />
                                        {isExpanded && (
                                            <UserDetailPanel detail={detail} user={u} />
                                        )}
                                    </div>
                                );
                            })}
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

// ============================================================================
// 유저 상세 패널 컴포넌트
// ============================================================================

/**
 * 펫 프로필 이미지 썸네일 (관리자 전용).
 *
 * 우선순위:
 * 1. profile_image (http/https만 유효, 실패 시 2로)
 * 2. fallback_photo (pet_media 대표 사진, 실패 시 3으로)
 * 3. PawPrint 아이콘
 *
 * 배경: 일부 펫은 profile_image가 NULL이거나(복구 불가 blob URL),
 * 유저가 아예 프로필 사진을 안 올린 경우가 있다. 하지만 타임라인에 사진이
 * 쌓여 있으면 그걸 대표로 써서 관리자가 펫을 식별할 수 있게 한다.
 */
function PetAvatar({ profileImage, fallbackPhoto, alt }: { profileImage?: string | null; fallbackPhoto?: string | null; alt: string }) {
    const [primaryFailed, setPrimaryFailed] = useState(false);
    const [fallbackFailed, setFallbackFailed] = useState(false);

    const isValidHttp = (v?: string | null): v is string =>
        !!v && (v.startsWith("http://") || v.startsWith("https://"));

    const primary = isValidHttp(profileImage) && !primaryFailed ? profileImage : null;
    const fallback = !primary && isValidHttp(fallbackPhoto) && !fallbackFailed ? fallbackPhoto : null;

    if (primary) {
        return (
            <img
                src={primary}
                alt={alt}
                className="w-5 h-5 rounded-full object-cover"
                onError={() => setPrimaryFailed(true)}
            />
        );
    }
    if (fallback) {
        return (
            <img
                src={fallback}
                alt={alt}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-memento-300 dark:ring-memento-700"
                title="타임라인 대표 사진 (프로필 미등록)"
                onError={() => setFallbackFailed(true)}
            />
        );
    }
    return <PawPrint className="w-4 h-4 text-gray-400" />;
}

function UserDetailPanel({ detail, user }: { detail?: UserDetailData; user: UserRow }) {
    if (!detail) {
        return (
            <div className="mx-2 mb-2 p-3 bg-white dark:bg-gray-800 border border-t-0 border-gray-200 dark:border-gray-600 rounded-b-xl">
                <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-memento-500" />
                    <span className="ml-2 text-sm text-gray-400">로딩 중...</span>
                </div>
            </div>
        );
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return "방금 전";
        if (diffMin < 60) return `${diffMin}분 전`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour}시간 전`;
        const diffDay = Math.floor(diffHour / 24);
        if (diffDay < 7) return `${diffDay}일 전`;
        return d.toLocaleDateString("ko-KR");
    };

    const tierLabel = (tier: string | null) => {
        if (tier === "premium") return "프리미엄";
        if (tier === "basic") return "베이직";
        return "무료";
    };

    return (
        <div className="mx-2 mb-2 p-3 bg-white dark:bg-gray-800 border border-t-0 border-gray-200 dark:border-gray-600 rounded-b-xl space-y-3">
            {/* 요약 지표 */}
            <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <PawPrint className="w-4 h-4 text-pink-500 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">반려동물</p>
                        <p className="text-sm font-bold">{detail.pets.length}마리</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <MessageCircle className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">AI 대화</p>
                        <p className="text-sm font-bold">{detail.chatMessagesCount.toLocaleString()}회</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Crown className="w-4 h-4 text-memorial-500 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">구독</p>
                        <p className="text-sm font-bold">{tierLabel(detail.subscriptionTier)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Clock className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">마지막 접속</p>
                        <p className="text-sm font-bold">{formatDate(detail.lastSeenAt)}</p>
                    </div>
                </div>
            </div>

            {/* 인증 이메일 (profiles.email과 다를 수 있음) */}
            {detail.authEmail && (
                <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg px-2 py-1.5">
                    <span className="font-medium">가입 이메일:</span>
                    <span className="text-gray-700 dark:text-gray-200">{detail.authEmail}</span>
                    {detail.authProvider && detail.authProvider !== "email" && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">
                            {detail.authProvider === "google" ? "Google" : detail.authProvider === "kakao" ? "Kakao" : detail.authProvider}
                        </Badge>
                    )}
                </div>
            )}

            {/* 가입일 + 포인트 */}
            <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                <span>가입: {new Date(user.created_at).toLocaleDateString("ko-KR")}</span>
                <span>포인트: {detail.points.toLocaleString()}P</span>
                {detail.premiumExpiresAt && (
                    <span>만료: {new Date(detail.premiumExpiresAt).toLocaleDateString("ko-KR")}</span>
                )}
            </div>

            {/* 펫 목록 */}
            {detail.pets.length > 0 && (
                <div>
                    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">반려동물 목록</p>
                    <div className="flex flex-wrap gap-2">
                        {detail.pets.map(pet => {
                            const registered = new Date(pet.created_at)
                                .toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" })
                                .replaceAll(" ", "");
                            // 종 + 품종 조합 표기 (동물 종류 무관 — 강아지/고양이/앵무새/파충류/햄스터 등)
                            const typeLabel = pet.breed ? `${pet.type} · ${pet.breed}` : pet.type;
                            return (
                                <div key={pet.id} className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                    <PetAvatar profileImage={pet.profile_image} fallbackPhoto={pet.fallback_photo} alt={pet.name} />
                                    <div className="flex flex-col leading-tight min-w-0">
                                        <span className="text-xs font-medium truncate">{pet.name}</span>
                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate">
                                            {typeLabel} · {registered}
                                        </span>
                                    </div>
                                    {pet.status === "memorial" && (
                                        <Badge className="bg-memorial-100 text-memorial-700 dark:bg-memorial-400/10 dark:text-memorial-300 text-[8px] px-1 py-0 shrink-0">
                                            추모
                                        </Badge>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// 유저 카드 컴포넌트
// ============================================================================

interface UserCardProps {
    user: UserRow;
    isExpanded: boolean;
    onToggleExpand: () => void;
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
    isExpanded,
    onToggleExpand,
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
                isExpanded ? "ring-2 ring-memento-300 dark:ring-memento-600" : ""
            } ${
                user.is_banned
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50"
                    : user.is_admin
                        ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50"
                        : user.is_premium
                            ? "bg-memorial-50 dark:bg-gray-700/20 border-memorial-200 dark:border-gray-700/50"
                            : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
            } ${isExpanded ? "rounded-b-none" : ""}`}
        >
            {/* 이메일 + 확장 토글 */}
            <button
                type="button"
                onClick={onToggleExpand}
                className="w-full flex items-center justify-between"
            >
                <p className="font-medium text-xs truncate text-left">
                    {user.email || <span className="text-gray-400 italic">이메일 없음</span>}
                </p>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
            </button>

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
                    <Badge className="bg-memorial-100 text-memorial-700 dark:bg-memorial-400/10 dark:text-memorial-300 text-[9px] px-1 py-0 leading-tight">
                        {user.subscription_tier === "basic" ? "베이직" : "프리미엄"}
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
                <p className="text-[10px] text-memorial-600 mt-1">
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
                            : "border-memorial-300 dark:border-memorial-700 text-memorial-600 dark:text-memorial-400 bg-white dark:bg-gray-800"
                    }`}
                >
                    {user.is_premium ? "프리미엄해제" : "프리미엄"}
                </button>

                <button
                    type="button"
                    onClick={onOpenPointsModal}
                    className="h-7 rounded border border-memento-300 dark:border-memento-700 text-memento-600 dark:text-memento-400 bg-white dark:bg-gray-800 text-[10px] font-medium transition-colors"
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
