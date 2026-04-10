/**
 * ============================================================================
 * AdminPage.tsx
 * ============================================================================
 * 관리자 전용 대시보드 - 메인 페이지
 *
 * 📌 이 파일의 역할:
 * - 탭 네비게이션 관리
 * - 데이터 로딩 조율
 * - 각 탭 컴포넌트 렌더링
 *
 * 📂 관련 파일 구조:
 * src/components/admin/
 * ├── index.ts           - 통합 export
 * ├── types.ts           - 타입 정의
 * ├── hooks/
 * │   └── useAdminData.ts - 데이터 로딩 훅
 * ├── tabs/
 * │   ├── AdminDashboardTab.tsx   - 대시보드
 * │   ├── AdminUsersTab.tsx       - 유저 관리
 * │   ├── AdminInquiriesTab.tsx   - 문의 관리
 * │   ├── AdminReportsTab.tsx     - 신고 관리
 * │   └── AdminWithdrawalsTab.tsx - 탈퇴자 관리
 * └── modals/
 *     ├── PremiumModal.tsx     - 프리미엄 부여
 *     └── WithdrawalModal.tsx  - 탈퇴 처리
 * ============================================================================
 */

"use client";

import React, { useState, useEffect } from "react";
import useHorizontalScroll from "@/hooks/useHorizontalScroll";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
// isAdmin은 더 이상 사용하지 않음 - AuthContext의 isAdminUser 사용
import { toast } from "sonner";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";
import { API } from "@/config/apiEndpoints";

// UI 컴포넌트
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    LayoutDashboard,
    Users,
    FileText,
    Flag,
    HelpCircle,
    Ban,
    Shield,
    BookOpen,
} from "lucide-react";

// 관리자 컴포넌트
import {
    useAdminData,
    AdminDashboardTab,
    AdminUsersTab,
    AdminPostsTab,
    AdminInquiriesTab,
    AdminReportsTab,
    AdminWithdrawalsTab,
    AdminMagazineTab,
    WithdrawalModal,
    type AdminTab,
    type UserRow,
    type WithdrawalType,
} from "@/components/admin";

// ============================================================================
// 탭 설정
// ============================================================================

const TABS: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
    { id: "users", label: "유저 관리", icon: Users },
    { id: "posts", label: "게시물", icon: FileText },
    { id: "inquiries", label: "문의", icon: HelpCircle },
    { id: "reports", label: "신고", icon: Flag },
    { id: "withdrawals", label: "탈퇴 관리", icon: Ban },
    { id: "magazine", label: "매거진", icon: BookOpen },
];

// ============================================================================
// 메인 컴포넌트
// ============================================================================

function AdminPage() {
    const { user, isAdminUser } = useAuth();
    const tabScrollRef = useHorizontalScroll();

    // 현재 활성 탭 — localStorage로 새로고침 시 복원
    const [activeTab, setActiveTab] = useState<AdminTab>(() => {
        if (typeof window !== "undefined") {
            const saved = safeGetItem("memento-admin-tab");
            if (saved && ["dashboard", "users", "posts", "inquiries", "reports", "withdrawals", "magazine"].includes(saved)) {
                return saved as AdminTab;
            }
        }
        return "dashboard";
    });

    // 탭 변경 시 localStorage에 저장
    useEffect(() => { safeSetItem("memento-admin-tab", activeTab); }, [activeTab]);

    // 탈퇴 처리 모달 상태
    const [withdrawalModalUser, setWithdrawalModalUser] = useState<UserRow | null>(null);
    const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false);

    // 데이터 로딩 훅
    const {
        loading,
        stats,
        chartData,
        users,
        posts,
        inquiries,
        reports,
        withdrawals,
        userDetails,
        apiUsage,
        loadDashboardStats,
        loadChartData,
        loadUsers,
        loadPosts,
        loadInquiries,
        loadReports,
        loadWithdrawals,
        magazineArticles,
        loadMagazineArticles,
        loadUserDetail,
        loadApiUsage,
        setUsers,
        setPosts,
    } = useAdminData();

    // ========================================================================
    // 초기 데이터 로드
    // ========================================================================
    useEffect(() => {
        if (isAdminUser) {
            loadDashboardStats();
            loadChartData();
            loadApiUsage();
        }
    }, [isAdminUser, loadDashboardStats, loadChartData, loadApiUsage]);

    // ========================================================================
    // 탭 변경 시 데이터 로드
    // ========================================================================
    useEffect(() => {
        if (!isAdminUser) return;

        switch (activeTab) {
            case "users":
                loadUsers();
                break;
            case "posts":
                loadPosts();
                break;
            case "inquiries":
                loadInquiries();
                break;
            case "reports":
                loadReports();
                break;
            case "withdrawals":
                loadWithdrawals();
                break;
            case "magazine":
                loadMagazineArticles();
                break;
        }
    }, [activeTab, isAdminUser, loadUsers, loadPosts, loadInquiries, loadReports, loadWithdrawals, loadMagazineArticles]);

    // ========================================================================
    // 탈퇴 처리
    // ========================================================================
    const processWithdrawal = async (type: WithdrawalType, reason: string) => {
        if (!withdrawalModalUser || !user) return;

        setIsProcessingWithdrawal(true);
        try {
            // 서버 API로 withdrawn_users 기록 + auth.users/profiles 삭제를 한번에 처리
            // (프론트에서 별도 INSERT하지 않음 - API가 단일 책임)
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            if (!token) {
                throw new Error("인증 토큰이 없습니다");
            }

            const res = await fetch(API.ADMIN_DELETE_USER, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    targetUserId: withdrawalModalUser.id,
                    withdrawalType: type,
                    reason: reason || null,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "유저 삭제 실패");
            }

            toast.success("탈퇴 처리가 완료되었습니다.");
            setWithdrawalModalUser(null);
            loadUsers();
            loadWithdrawals();
        } catch {
            toast.error("탈퇴 처리에 실패했습니다.");
        } finally {
            setIsProcessingWithdrawal(false);
        }
    };

    // ========================================================================
    // 권한 체크
    // ========================================================================
    if (!isAdminUser) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="max-w-md w-full mx-4">
                    <CardContent className="p-8 text-center">
                        <Shield className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white mb-2">
                            접근 권한 없음
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400">
                            관리자만 접근할 수 있는 페이지입니다.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ========================================================================
    // 렌더링
    // ========================================================================
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* 헤더 */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">관리자 대시보드</h1>
                </div>

                {/* 탭 네비게이션 */}
                <div ref={tabScrollRef} className="flex gap-2 overflow-x-auto pb-2">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <Button
                                key={tab.id}
                                variant={isActive ? "default" : "outline"}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 whitespace-nowrap ${
                                    isActive
                                        ? "bg-memento-500 hover:bg-memento-600"
                                        : ""
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </Button>
                        );
                    })}
                </div>

                {/* 탭 콘텐츠 */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 md:p-6">
                    {/* 대시보드 탭 */}
                    {activeTab === "dashboard" && (
                        <AdminDashboardTab
                            stats={stats}
                            chartData={chartData}
                            loading={loading}
                            apiUsage={apiUsage}
                        />
                    )}

                    {/* 유저 관리 탭 */}
                    {activeTab === "users" && (
                        <AdminUsersTab
                            users={users}
                            onRefresh={loadUsers}
                            onUpdateUsers={setUsers}
                            onOpenWithdrawalModal={setWithdrawalModalUser}
                            onRefreshStats={loadDashboardStats}
                            currentUserId={user?.id || ""}
                            userDetails={userDetails}
                            onLoadUserDetail={loadUserDetail}
                        />
                    )}

                    {/* 게시물 관리 탭 */}
                    {activeTab === "posts" && (
                        <AdminPostsTab
                            posts={posts}
                            onRefresh={loadPosts}
                            onUpdatePosts={setPosts}
                        />
                    )}

                    {/* 문의 관리 탭 */}
                    {activeTab === "inquiries" && (
                        <AdminInquiriesTab
                            inquiries={inquiries}
                            onRefresh={loadInquiries}
                        />
                    )}

                    {/* 신고 관리 탭 */}
                    {activeTab === "reports" && (
                        <AdminReportsTab
                            reports={reports}
                            onRefresh={loadReports}
                            userId={user?.id || ""}
                        />
                    )}

                    {/* 탈퇴자 관리 탭 */}
                    {activeTab === "withdrawals" && (
                        <AdminWithdrawalsTab
                            withdrawals={withdrawals}
                            onRefresh={loadWithdrawals}
                            userId={user?.id || ""}
                        />
                    )}

                    {/* 매거진 관리 탭 */}
                    {activeTab === "magazine" && (
                        <AdminMagazineTab
                            articles={magazineArticles}
                            onRefresh={loadMagazineArticles}
                            userId={user?.id || ""}
                        />
                    )}
                </div>

                {/* 탈퇴 처리 모달 */}
                {withdrawalModalUser && (
                    <WithdrawalModal
                        user={withdrawalModalUser}
                        onClose={() => setWithdrawalModalUser(null)}
                        onProcess={processWithdrawal}
                        isProcessing={isProcessingWithdrawal}
                    />
                )}
            </div>
        </div>
    );
}

export default React.memo(AdminPage);
