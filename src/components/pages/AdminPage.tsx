/**
 * AdminPage.tsx
 * 관리자 전용 대시보드
 * - 현황 대시보드
 * - 유저 관리 (밴/정지)
 * - 게시물 관리 (삭제/숨김)
 * - 신고 관리
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    LayoutDashboard,
    Users,
    FileText,
    Flag,
    Search,
    Ban,
    Trash2,
    Eye,
    EyeOff,
    Shield,
    TrendingUp,
    MessageCircle,
    PawPrint,
    Calendar,
    RefreshCw,
    Crown,
    AlertTriangle,
} from "lucide-react";

type AdminTab = "dashboard" | "users" | "posts" | "reports";

interface DashboardStats {
    totalUsers: number;
    totalPets: number;
    totalPosts: number;
    totalChats: number;
    todayUsers: number;
    todayChats: number;
    premiumUsers: number;
    bannedUsers: number;
}

interface UserRow {
    id: string;
    email: string;
    created_at: string;
    user_metadata?: {
        nickname?: string;
    };
    is_banned?: boolean;
    is_premium?: boolean;
}

interface PostRow {
    id: string;
    title: string;
    content: string;
    author_id: string;
    author_email?: string;
    created_at: string;
    is_hidden?: boolean;
    report_count?: number;
}

export default function AdminPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        totalPets: 0,
        totalPosts: 0,
        totalChats: 0,
        todayUsers: 0,
        todayChats: 0,
        premiumUsers: 0,
        bannedUsers: 0,
    });
    const [users, setUsers] = useState<UserRow[]>([]);
    const [posts, setPosts] = useState<PostRow[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const isAdminUser = isAdmin(user?.email);

    // 대시보드 통계 로드
    const loadDashboardStats = async () => {
        setLoading(true);
        try {
            // 전체 사용자 수 (pets 테이블의 유니크 user_id로 추정)
            const { count: petsCount } = await supabase
                .from("pets")
                .select("*", { count: "exact", head: true });

            // 전체 반려동물 수
            const { count: totalPets } = await supabase
                .from("pets")
                .select("*", { count: "exact", head: true });

            // 유니크 사용자 수 추정 (pets 테이블에서)
            const { data: uniqueUsers } = await supabase
                .from("pets")
                .select("user_id")
                .limit(1000);

            const uniqueUserIds = new Set(uniqueUsers?.map(p => p.user_id) || []);

            // 오늘 날짜
            const today = new Date().toISOString().split("T")[0];

            // 오늘 생성된 반려동물 (신규 가입 추정)
            const { count: todayPets } = await supabase
                .from("pets")
                .select("*", { count: "exact", head: true })
                .gte("created_at", today);

            setStats({
                totalUsers: uniqueUserIds.size,
                totalPets: totalPets || 0,
                totalPosts: 0, // 커뮤니티 테이블 있으면 연동
                totalChats: 0, // 채팅 로그 테이블 있으면 연동
                todayUsers: todayPets || 0,
                todayChats: 0,
                premiumUsers: 0,
                bannedUsers: 0,
            });
        } catch (error) {
            console.error("통계 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    // 사용자 목록 로드
    const loadUsers = async () => {
        try {
            const { data, error } = await supabase
                .from("pets")
                .select("user_id, created_at")
                .order("created_at", { ascending: false })
                .limit(100);

            if (data) {
                // 유니크 사용자만 추출
                const userMap = new Map<string, UserRow>();
                data.forEach((pet) => {
                    if (!userMap.has(pet.user_id)) {
                        userMap.set(pet.user_id, {
                            id: pet.user_id,
                            email: pet.user_id.substring(0, 8) + "...",
                            created_at: pet.created_at,
                        });
                    }
                });
                setUsers(Array.from(userMap.values()));
            }
        } catch (error) {
            console.error("사용자 로드 실패:", error);
        }
    };

    // 게시물 목록 로드 (예시 - 실제 테이블에 맞게 수정 필요)
    const loadPosts = async () => {
        // 커뮤니티 게시물 테이블이 있으면 연동
        setPosts([]);
    };

    useEffect(() => {
        if (isAdminUser) {
            loadDashboardStats();
        }
    }, [isAdminUser]);

    useEffect(() => {
        if (isAdminUser) {
            if (activeTab === "users") loadUsers();
            if (activeTab === "posts") loadPosts();
        }
    }, [activeTab, isAdminUser]);

    // 관리자 권한 체크 (hooks 이후에 배치)
    if (!isAdminUser) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-800 mb-2">
                            접근 권한이 없습니다
                        </h2>
                        <p className="text-gray-500">
                            관리자만 접근할 수 있는 페이지입니다.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const tabs = [
        { id: "dashboard" as AdminTab, label: "대시보드", icon: LayoutDashboard },
        { id: "users" as AdminTab, label: "유저 관리", icon: Users },
        { id: "posts" as AdminTab, label: "게시물 관리", icon: FileText },
        { id: "reports" as AdminTab, label: "신고 관리", icon: Flag },
    ];

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="w-7 h-7 text-violet-500" />
                        관리자 대시보드
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        메멘토애니 서비스 관리
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={loadDashboardStats}
                    className="gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    새로고침
                </Button>
            </div>

            {/* 탭 네비게이션 */}
            <div className="flex gap-2 border-b border-gray-200 pb-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                ${activeTab === tab.id
                                    ? "bg-violet-100 text-violet-700"
                                    : "text-gray-500 hover:bg-gray-100"
                                }
                            `}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* 대시보드 탭 */}
            {activeTab === "dashboard" && (
                <div className="space-y-6">
                    {/* 주요 지표 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">전체 사용자</p>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {loading ? "..." : stats.totalUsers}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <Users className="w-6 h-6 text-blue-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">등록된 반려동물</p>
                                        <p className="text-2xl font-bold text-gray-800">
                                            {loading ? "..." : stats.totalPets}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                        <PawPrint className="w-6 h-6 text-amber-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">오늘 신규</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            +{loading ? "..." : stats.todayUsers}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-green-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">프리미엄 유저</p>
                                        <p className="text-2xl font-bold text-violet-600">
                                            {loading ? "..." : stats.premiumUsers}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                                        <Crown className="w-6 h-6 text-violet-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 빠른 액션 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">빠른 액션</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Button
                                    variant="outline"
                                    className="h-auto py-4 flex flex-col gap-2"
                                    onClick={() => setActiveTab("users")}
                                >
                                    <Users className="w-5 h-5 text-blue-500" />
                                    <span className="text-sm">유저 관리</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-auto py-4 flex flex-col gap-2"
                                    onClick={() => setActiveTab("posts")}
                                >
                                    <FileText className="w-5 h-5 text-green-500" />
                                    <span className="text-sm">게시물 관리</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-auto py-4 flex flex-col gap-2"
                                    onClick={() => setActiveTab("reports")}
                                >
                                    <Flag className="w-5 h-5 text-red-500" />
                                    <span className="text-sm">신고 관리</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-auto py-4 flex flex-col gap-2"
                                >
                                    <MessageCircle className="w-5 h-5 text-violet-500" />
                                    <span className="text-sm">AI 사용량</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 최근 활동 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">시스템 상태</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-sm font-medium text-green-700">서비스 정상 운영 중</span>
                                    </div>
                                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                                        정상
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                            마지막 업데이트: {new Date().toLocaleDateString("ko-KR")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 유저 관리 탭 */}
            {activeTab === "users" && (
                <div className="space-y-4">
                    {/* 검색 */}
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
                        <Button variant="outline">검색</Button>
                    </div>

                    {/* 유저 목록 */}
                    <Card>
                        <CardContent className="pt-6">
                            {users.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>등록된 사용자가 없습니다.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {users.map((u) => (
                                        <div
                                            key={u.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-sky-400 rounded-full flex items-center justify-center text-white font-bold">
                                                    {u.email.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">
                                                        {u.user_metadata?.nickname || "사용자"}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{u.id}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">
                                                    {new Date(u.created_at).toLocaleDateString("ko-KR")}
                                                </Badge>
                                                <Button size="sm" variant="ghost">
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600">
                                                    <Ban className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 게시물 관리 탭 */}
            {activeTab === "posts" && (
                <div className="space-y-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center py-8 text-gray-500">
                                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>커뮤니티 게시물 테이블 연동 필요</p>
                                <p className="text-sm mt-2">
                                    게시물 관리 기능은 커뮤니티 기능 구현 후 활성화됩니다.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 신고 관리 탭 */}
            {activeTab === "reports" && (
                <div className="space-y-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center py-8 text-gray-500">
                                <Flag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>신고 내역이 없습니다</p>
                                <p className="text-sm mt-2">
                                    사용자 신고 기능 구현 후 여기서 관리할 수 있습니다.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
