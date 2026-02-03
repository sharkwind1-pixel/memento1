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
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

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
    is_admin?: boolean;
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

interface ChartData {
    date: string;
    가입자: number;
    채팅: number;
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
    const [chartData, setChartData] = useState<ChartData[]>([]);

    const isAdminUser = isAdmin(user?.email);

    // 차트 데이터 로드 (최근 7일)
    const loadChartData = async () => {
        try {
            const days = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split("T")[0];
                const displayDate = `${date.getMonth() + 1}/${date.getDate()}`;

                // 해당 날짜의 가입자 수
                const { count: signups } = await supabase
                    .from("profiles")
                    .select("*", { count: "exact", head: true })
                    .gte("created_at", dateStr)
                    .lt("created_at", new Date(date.getTime() + 86400000).toISOString().split("T")[0]);

                // 해당 날짜의 채팅 수
                const { count: chats } = await supabase
                    .from("chat_messages")
                    .select("*", { count: "exact", head: true })
                    .gte("created_at", dateStr)
                    .lt("created_at", new Date(date.getTime() + 86400000).toISOString().split("T")[0]);

                days.push({
                    date: displayDate,
                    가입자: signups || 0,
                    채팅: chats || 0,
                });
            }
            setChartData(days);
        } catch (error) {
            console.error("차트 데이터 로드 실패:", error);
        }
    };

    // 대시보드 통계 로드
    const loadDashboardStats = async () => {
        setLoading(true);
        try {
            // 오늘 날짜
            const today = new Date().toISOString().split("T")[0];

            // 전체 사용자 수 (profiles 테이블)
            const { count: totalUsers } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true });

            // 전체 반려동물 수
            const { count: totalPets } = await supabase
                .from("pets")
                .select("*", { count: "exact", head: true });

            // 전체 게시글 수
            const { count: totalPosts } = await supabase
                .from("community_posts")
                .select("*", { count: "exact", head: true });

            // 전체 채팅 수
            const { count: totalChats } = await supabase
                .from("chat_messages")
                .select("*", { count: "exact", head: true });

            // 오늘 가입한 사용자
            const { count: todayUsers } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .gte("created_at", today);

            // 오늘 채팅 수
            const { count: todayChats } = await supabase
                .from("chat_messages")
                .select("*", { count: "exact", head: true })
                .gte("created_at", today);

            // 프리미엄 사용자
            const { count: premiumUsers } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .eq("is_premium", true);

            // 정지된 사용자
            const { count: bannedUsers } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .eq("is_banned", true);

            setStats({
                totalUsers: totalUsers || 0,
                totalPets: totalPets || 0,
                totalPosts: totalPosts || 0,
                totalChats: totalChats || 0,
                todayUsers: todayUsers || 0,
                todayChats: todayChats || 0,
                premiumUsers: premiumUsers || 0,
                bannedUsers: bannedUsers || 0,
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
                .from("profiles")
                .select("id, email, nickname, is_premium, is_banned, is_admin, created_at")
                .order("created_at", { ascending: false })
                .limit(100);

            if (data) {
                setUsers(data.map(profile => ({
                    id: profile.id,
                    email: profile.email || "이메일 없음",
                    created_at: profile.created_at,
                    user_metadata: { nickname: profile.nickname },
                    is_banned: profile.is_banned,
                    is_premium: profile.is_premium,
                    is_admin: profile.is_admin,
                })));
            }
        } catch (error) {
            console.error("사용자 로드 실패:", error);
        }
    };

    // 사용자 권한 업데이트
    const updateUserRole = async (userId: string, field: "is_premium" | "is_admin" | "is_banned", value: boolean) => {
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ [field]: value })
                .eq("id", userId);

            if (error) throw error;

            // 로컬 상태 업데이트
            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, [field]: value } : u
            ));

            // 통계 새로고침
            loadDashboardStats();
        } catch (error) {
            console.error("권한 업데이트 실패:", error);
            alert("권한 업데이트에 실패했습니다.");
        }
    };

    // 게시물 목록 로드
    const loadPosts = async () => {
        try {
            const { data, error } = await supabase
                .from("community_posts")
                .select("id, title, content, user_id, author_name, created_at, views")
                .order("created_at", { ascending: false })
                .limit(100);

            if (data) {
                setPosts(data.map(post => ({
                    id: post.id,
                    title: post.title,
                    content: post.content,
                    author_id: post.user_id,
                    author_email: post.author_name,
                    created_at: post.created_at,
                    is_hidden: false,
                    report_count: 0,
                })));
            }
        } catch (error) {
            console.error("게시물 로드 실패:", error);
        }
    };

    useEffect(() => {
        if (isAdminUser) {
            loadDashboardStats();
            loadChartData();
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

                    {/* 가입자 & 채팅 추이 그래프 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-500" />
                                    주간 가입자 추이
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                                            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#fff',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px'
                                                }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="가입자"
                                                stroke="#3b82f6"
                                                fill="#93c5fd"
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5 text-violet-500" />
                                    주간 AI 채팅 추이
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                                            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#fff',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px'
                                                }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="채팅"
                                                stroke="#8b5cf6"
                                                strokeWidth={2}
                                                dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

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
                        <Button variant="outline" onClick={loadUsers}>
                            <RefreshCw className="w-4 h-4 mr-1" />
                            새로고침
                        </Button>
                    </div>

                    {/* 범례 */}
                    <div className="flex flex-wrap gap-2 text-sm">
                        <Badge className="bg-violet-100 text-violet-700">
                            <Shield className="w-3 h-3 mr-1" />
                            관리자
                        </Badge>
                        <Badge className="bg-amber-100 text-amber-700">
                            <Crown className="w-3 h-3 mr-1" />
                            프리미엄
                        </Badge>
                        <Badge className="bg-red-100 text-red-700">
                            <Ban className="w-3 h-3 mr-1" />
                            정지됨
                        </Badge>
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
                                <div className="space-y-3">
                                    {users
                                        .filter(u =>
                                            searchQuery === "" ||
                                            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            u.user_metadata?.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map((u) => (
                                        <div
                                            key={u.id}
                                            className={`p-4 rounded-xl border transition-colors ${
                                                u.is_banned
                                                    ? "bg-red-50 border-red-200"
                                                    : u.is_admin
                                                        ? "bg-violet-50 border-violet-200"
                                                        : u.is_premium
                                                            ? "bg-amber-50 border-amber-200"
                                                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                            }`}
                                        >
                                            {/* 유저 정보 */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                                        u.is_admin
                                                            ? "bg-gradient-to-br from-violet-500 to-purple-600"
                                                            : u.is_premium
                                                                ? "bg-gradient-to-br from-amber-400 to-orange-500"
                                                                : "bg-gradient-to-br from-gray-400 to-gray-500"
                                                    }`}>
                                                        {u.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium text-gray-800">
                                                                {u.user_metadata?.nickname || "사용자"}
                                                            </p>
                                                            {u.is_admin && (
                                                                <Badge className="bg-violet-100 text-violet-700 text-xs">
                                                                    <Shield className="w-3 h-3 mr-0.5" />
                                                                    관리자
                                                                </Badge>
                                                            )}
                                                            {u.is_premium && (
                                                                <Badge className="bg-amber-100 text-amber-700 text-xs">
                                                                    <Crown className="w-3 h-3 mr-0.5" />
                                                                    프리미엄
                                                                </Badge>
                                                            )}
                                                            {u.is_banned && (
                                                                <Badge className="bg-red-100 text-red-700 text-xs">
                                                                    정지됨
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500">{u.email}</p>
                                                    </div>
                                                </div>
                                                <Badge variant="secondary" className="text-xs">
                                                    {new Date(u.created_at).toLocaleDateString("ko-KR")} 가입
                                                </Badge>
                                            </div>

                                            {/* 권한 관리 버튼 */}
                                            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                                                <Button
                                                    size="sm"
                                                    variant={u.is_premium ? "default" : "outline"}
                                                    className={u.is_premium ? "bg-amber-500 hover:bg-amber-600" : ""}
                                                    onClick={() => updateUserRole(u.id, "is_premium", !u.is_premium)}
                                                >
                                                    <Crown className="w-3 h-3 mr-1" />
                                                    {u.is_premium ? "프리미엄 해제" : "프리미엄 부여"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={u.is_admin ? "default" : "outline"}
                                                    className={u.is_admin ? "bg-violet-500 hover:bg-violet-600" : ""}
                                                    onClick={() => updateUserRole(u.id, "is_admin", !u.is_admin)}
                                                >
                                                    <Shield className="w-3 h-3 mr-1" />
                                                    {u.is_admin ? "관리자 해제" : "관리자 부여"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={u.is_banned ? "default" : "outline"}
                                                    className={u.is_banned ? "bg-red-500 hover:bg-red-600" : "text-red-500 border-red-300 hover:bg-red-50"}
                                                    onClick={() => updateUserRole(u.id, "is_banned", !u.is_banned)}
                                                >
                                                    <Ban className="w-3 h-3 mr-1" />
                                                    {u.is_banned ? "정지 해제" : "계정 정지"}
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
