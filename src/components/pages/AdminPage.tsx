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

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
// isAdmin은 더 이상 사용하지 않음 - AuthContext의 isAdminUser 사용
import { toast } from "sonner";

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
} from "lucide-react";

// 관리자 컴포넌트
import {
    useAdminData,
    AdminDashboardTab,
    AdminUsersTab,
    AdminInquiriesTab,
    AdminReportsTab,
    AdminWithdrawalsTab,
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
];

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AdminPage() {
    const { user, isAdminUser } = useAuth();

    // 현재 활성 탭
    const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

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
        loadDashboardStats,
        loadChartData,
        loadUsers,
        loadPosts,
        loadInquiries,
        loadReports,
        loadWithdrawals,
        setUsers,
    } = useAdminData();

    // ========================================================================
    // 초기 데이터 로드
    // ========================================================================
    useEffect(() => {
        if (isAdminUser) {
            loadDashboardStats();
            loadChartData();
        }
    }, [isAdminUser, loadDashboardStats, loadChartData]);

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
        }
    }, [activeTab, isAdminUser, loadUsers, loadPosts, loadInquiries, loadReports, loadWithdrawals]);

    // ========================================================================
    // 탈퇴 처리
    // ========================================================================
    const processWithdrawal = async (type: WithdrawalType, reason: string) => {
        if (!withdrawalModalUser || !user) return;

        setIsProcessingWithdrawal(true);
        try {
            // 1. withdrawn_users 테이블에 추가
            const rejoinDate = type === "abuse_concern"
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                : null;

            const { error: insertError } = await supabase
                .from("withdrawn_users")
                .insert({
                    user_id: withdrawalModalUser.id,
                    email: withdrawalModalUser.email,
                    nickname: withdrawalModalUser.user_metadata?.nickname,
                    withdrawal_type: type,
                    reason: reason || null,
                    rejoin_allowed_at: rejoinDate,
                    processed_by: user.id,
                });

            if (insertError) throw insertError;

            // 2. 영구 차단인 경우 유저 밴 처리
            if (type === "banned") {
                await supabase
                    .from("profiles")
                    .update({ is_banned: true })
                    .eq("id", withdrawalModalUser.id);
            }

            toast.success("탈퇴 처리가 완료되었습니다.");
            setWithdrawalModalUser(null);
            loadUsers();
            loadWithdrawals();
        } catch (error) {
            console.error("[AdminPage] 탈퇴 처리 실패:", error);
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
                        <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h2 className="text-xl font-bold text-gray-800 mb-2">
                            접근 권한 없음
                        </h2>
                        <p className="text-gray-500">
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
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* 헤더 */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-800">관리자 대시보드</h1>
                </div>

                {/* 탭 네비게이션 */}
                <div className="flex gap-2 overflow-x-auto pb-2">
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
                                        ? "bg-sky-500 hover:bg-sky-600"
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
                <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
                    {/* 대시보드 탭 */}
                    {activeTab === "dashboard" && (
                        <AdminDashboardTab
                            stats={stats}
                            chartData={chartData}
                            loading={loading}
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
                        />
                    )}

                    {/* 게시물 탭 - 간단 버전 */}
                    {activeTab === "posts" && (
                        <PostsSimpleView posts={posts} onRefresh={loadPosts} />
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

// ============================================================================
// 게시물 간단 뷰 (별도 탭 컴포넌트로 분리 가능)
// ============================================================================

import { PostRow } from "@/components/admin";
import { RefreshCw } from "lucide-react";

interface PostsSimpleViewProps {
    posts: PostRow[];
    onRefresh: () => void;
}

function PostsSimpleView({ posts, onRefresh }: PostsSimpleViewProps) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-medium text-gray-700">
                    전체 게시물: {posts.length}개
                </h3>
                <Button variant="outline" onClick={onRefresh}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    새로고침
                </Button>
            </div>

            {posts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>게시물이 없습니다</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {posts.slice(0, 20).map((post) => (
                        <div
                            key={post.id}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-medium text-gray-800">
                                        {post.title}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                        {post.author_email} •{" "}
                                        {new Date(post.created_at).toLocaleDateString("ko-KR")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {posts.length > 20 && (
                        <p className="text-center text-sm text-gray-400 py-2">
                            ... 외 {posts.length - 20}개
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
