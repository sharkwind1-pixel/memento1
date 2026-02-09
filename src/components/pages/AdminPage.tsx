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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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
    RotateCcw,
    Activity,
    HelpCircle,
    Lightbulb,
    CheckCircle,
    Clock,
    Send,
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

type AdminTab = "dashboard" | "users" | "posts" | "reports" | "inquiries";

interface DashboardStats {
    totalUsers: number;
    totalPets: number;
    totalPosts: number;
    totalChats: number;
    todayUsers: number;
    todayChats: number;
    premiumUsers: number;
    bannedUsers: number;
    todayActiveUsers: number; // DAU
    weeklyActiveUsers: number; // WAU
    monthlyActiveUsers: number; // MAU
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
    접속자: number;
}

interface InquiryRow {
    id: string;
    user_id: string | null;
    email: string;
    category: "question" | "report" | "suggestion";
    title: string;
    content: string;
    status: "pending" | "in_progress" | "resolved" | "closed";
    admin_response: string | null;
    responded_at: string | null;
    created_at: string;
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
        todayActiveUsers: 0,
        weeklyActiveUsers: 0,
        monthlyActiveUsers: 0,
    });
    const [users, setUsers] = useState<UserRow[]>([]);
    const [posts, setPosts] = useState<PostRow[]>([]);
    const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [selectedInquiry, setSelectedInquiry] = useState<InquiryRow | null>(null);
    const [adminResponse, setAdminResponse] = useState("");
    const [isResponding, setIsResponding] = useState(false);

    const isAdminUser = isAdmin(user?.email);

    // 차트 데이터 로드 (최근 7일)
    const loadChartData = async () => {
        try {
            const days = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split("T")[0];
                const nextDateStr = new Date(date.getTime() + 86400000).toISOString().split("T")[0];
                const displayDate = `${date.getMonth() + 1}/${date.getDate()}`;

                // 해당 날짜의 가입자 수
                const { count: signups } = await supabase
                    .from("profiles")
                    .select("*", { count: "exact", head: true })
                    .gte("created_at", dateStr)
                    .lt("created_at", nextDateStr);

                // 해당 날짜의 채팅 수
                const { count: chats } = await supabase
                    .from("chat_messages")
                    .select("*", { count: "exact", head: true })
                    .gte("created_at", dateStr)
                    .lt("created_at", nextDateStr);

                // 해당 날짜의 접속자 수 (last_seen_at 기준)
                const { count: activeUsers } = await supabase
                    .from("profiles")
                    .select("*", { count: "exact", head: true })
                    .gte("last_seen_at", dateStr)
                    .lt("last_seen_at", nextDateStr);

                days.push({
                    date: displayDate,
                    가입자: signups || 0,
                    채팅: chats || 0,
                    접속자: activeUsers || 0,
                });
            }
            setChartData(days);
        } catch {}
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

            // DAU (오늘 접속한 사용자)
            const { count: todayActiveUsers } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .gte("last_seen_at", today);

            // WAU (최근 7일 접속한 사용자)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const { count: weeklyActiveUsers } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .gte("last_seen_at", weekAgo.toISOString().split("T")[0]);

            // MAU (최근 30일 접속한 사용자)
            const monthAgo = new Date();
            monthAgo.setDate(monthAgo.getDate() - 30);
            const { count: monthlyActiveUsers } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .gte("last_seen_at", monthAgo.toISOString().split("T")[0]);

            setStats({
                totalUsers: totalUsers || 0,
                totalPets: totalPets || 0,
                totalPosts: totalPosts || 0,
                totalChats: totalChats || 0,
                todayUsers: todayUsers || 0,
                todayChats: todayChats || 0,
                premiumUsers: premiumUsers || 0,
                bannedUsers: bannedUsers || 0,
                todayActiveUsers: todayActiveUsers || 0,
                weeklyActiveUsers: weeklyActiveUsers || 0,
                monthlyActiveUsers: monthlyActiveUsers || 0,
            });
        } catch {}
 finally {
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
        } catch {}

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
        } catch {
            toast.error("권한 업데이트에 실패했습니다.");
        }
    };

    // 온보딩 리셋
    const resetOnboarding = async (userId: string, userEmail: string) => {
        if (!confirm(`${userEmail}의 온보딩을 리셋하시겠습니까?\n다음 로그인 시 온보딩 화면이 다시 표시됩니다.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    onboarding_completed_at: null,
                    user_type: null,
                    onboarding_data: null,
                })
                .eq("id", userId);

            if (error) throw error;
            toast.success("온보딩이 리셋되었습니다.");
        } catch {
            toast.error("온보딩 리셋에 실패했습니다.");
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
        } catch {}

    };

    // 문의 목록 로드
    const loadInquiries = async () => {
        try {
            const { data, error } = await supabase
                .from("support_inquiries")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(100);

            if (data) {
                setInquiries(data as InquiryRow[]);
            }
        } catch {}
    };

    // 문의 상태 업데이트
    const updateInquiryStatus = async (id: string, status: InquiryRow["status"]) => {
        try {
            const { error } = await supabase
                .from("support_inquiries")
                .update({ status })
                .eq("id", id);

            if (error) throw error;

            setInquiries(prev => prev.map(i =>
                i.id === id ? { ...i, status } : i
            ));
        } catch {
            toast.error("상태 업데이트에 실패했습니다.");
        }
    };

    // 문의 답변 저장
    const submitResponse = async () => {
        if (!selectedInquiry || !adminResponse.trim()) return;

        setIsResponding(true);
        try {
            const { error } = await supabase
                .from("support_inquiries")
                .update({
                    admin_response: adminResponse.trim(),
                    responded_at: new Date().toISOString(),
                    responded_by: user?.id,
                    status: "resolved",
                })
                .eq("id", selectedInquiry.id);

            if (error) throw error;

            // 로컬 상태 업데이트
            setInquiries(prev => prev.map(i =>
                i.id === selectedInquiry.id
                    ? { ...i, admin_response: adminResponse.trim(), status: "resolved", responded_at: new Date().toISOString() }
                    : i
            ));

            setSelectedInquiry(null);
            setAdminResponse("");
            toast.success("답변이 저장되었습니다.");
        } catch {
            toast.error("답변 저장에 실패했습니다.");
        } finally {
            setIsResponding(false);
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
            if (activeTab === "inquiries") loadInquiries();
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
        { id: "inquiries" as AdminTab, label: "문의 관리", icon: HelpCircle },
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

                    {/* DAU/WAU/MAU 지표 */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <Activity className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                    <p className="text-sm text-emerald-600 font-medium">오늘 접속 (DAU)</p>
                                    <p className="text-3xl font-bold text-emerald-700 mt-1">
                                        {loading ? "..." : stats.todayActiveUsers}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <Activity className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                    <p className="text-sm text-blue-600 font-medium">주간 접속 (WAU)</p>
                                    <p className="text-3xl font-bold text-blue-700 mt-1">
                                        {loading ? "..." : stats.weeklyActiveUsers}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <Activity className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                                    <p className="text-sm text-purple-600 font-medium">월간 접속 (MAU)</p>
                                    <p className="text-3xl font-bold text-purple-700 mt-1">
                                        {loading ? "..." : stats.monthlyActiveUsers}
                                    </p>
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
                                <Button
                                    variant="outline"
                                    className="h-auto py-4 flex flex-col gap-2 border-amber-200 hover:bg-amber-50"
                                    onClick={async () => {
                                        if (!user) return;
                                        if (!confirm("온보딩과 튜토리얼을 리셋하고 새로고침합니다.")) return;

                                        // DB 리셋
                                        await supabase
                                            .from("profiles")
                                            .update({
                                                onboarding_completed_at: null,
                                                user_type: null,
                                                onboarding_data: null,
                                            })
                                            .eq("id", user.id);

                                        // localStorage 리셋
                                        localStorage.removeItem("memento-ani-onboarding-complete");
                                        localStorage.removeItem("memento-ani-tutorial-complete");

                                        // 새로고침
                                        window.location.reload();
                                    }}
                                >
                                    <RotateCcw className="w-5 h-5 text-amber-500" />
                                    <span className="text-sm">내 온보딩 테스트</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 접속자 추이 그래프 (핵심 지표) */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="w-5 h-5 text-emerald-500" />
                                주간 접속자 추이 (DAU)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-72">
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
                                            dataKey="접속자"
                                            stroke="#10b981"
                                            fill="#a7f3d0"
                                            strokeWidth={3}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
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
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-blue-500 border-blue-300 hover:bg-blue-50"
                                                    onClick={() => resetOnboarding(u.id, u.email)}
                                                >
                                                    <RotateCcw className="w-3 h-3 mr-1" />
                                                    온보딩 리셋
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

            {/* 문의 관리 탭 */}
            {activeTab === "inquiries" && (
                <div className="space-y-4">
                    {/* 검색 & 필터 */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="제목 또는 이메일로 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button variant="outline" onClick={loadInquiries}>
                            <RefreshCw className="w-4 h-4 mr-1" />
                            새로고침
                        </Button>
                    </div>

                    {/* 범례 */}
                    <div className="flex flex-wrap gap-2 text-sm">
                        <Badge className="bg-blue-100 text-blue-700">
                            <HelpCircle className="w-3 h-3 mr-1" />
                            질문
                        </Badge>
                        <Badge className="bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            신고
                        </Badge>
                        <Badge className="bg-amber-100 text-amber-700">
                            <Lightbulb className="w-3 h-3 mr-1" />
                            건의
                        </Badge>
                    </div>

                    {/* 문의 목록 */}
                    <Card>
                        <CardContent className="pt-6">
                            {inquiries.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <HelpCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>문의 내역이 없습니다</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {inquiries
                                        .filter(i =>
                                            searchQuery === "" ||
                                            i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            i.email.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map((inquiry) => (
                                        <div
                                            key={inquiry.id}
                                            className={`p-4 rounded-xl border transition-colors ${
                                                inquiry.status === "resolved"
                                                    ? "bg-green-50 border-green-200"
                                                    : inquiry.status === "in_progress"
                                                        ? "bg-blue-50 border-blue-200"
                                                        : inquiry.category === "report"
                                                            ? "bg-red-50 border-red-200"
                                                            : "bg-gray-50 border-gray-200"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {inquiry.category === "question" && (
                                                        <Badge className="bg-blue-100 text-blue-700">
                                                            <HelpCircle className="w-3 h-3 mr-1" />
                                                            질문
                                                        </Badge>
                                                    )}
                                                    {inquiry.category === "report" && (
                                                        <Badge className="bg-red-100 text-red-700">
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            신고
                                                        </Badge>
                                                    )}
                                                    {inquiry.category === "suggestion" && (
                                                        <Badge className="bg-amber-100 text-amber-700">
                                                            <Lightbulb className="w-3 h-3 mr-1" />
                                                            건의
                                                        </Badge>
                                                    )}
                                                    {inquiry.status === "pending" && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            대기중
                                                        </Badge>
                                                    )}
                                                    {inquiry.status === "in_progress" && (
                                                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                                                            처리중
                                                        </Badge>
                                                    )}
                                                    {inquiry.status === "resolved" && (
                                                        <Badge className="bg-green-100 text-green-700 text-xs">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            답변완료
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(inquiry.created_at).toLocaleDateString("ko-KR")}
                                                </span>
                                            </div>

                                            <h4 className="font-medium text-gray-800 mb-1">
                                                {inquiry.title}
                                            </h4>
                                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                                {inquiry.content}
                                            </p>
                                            <p className="text-xs text-gray-500 mb-3">
                                                보낸 사람: {inquiry.email}
                                            </p>

                                            {/* 관리자 답변 (있을 경우) */}
                                            {inquiry.admin_response && (
                                                <div className="p-3 bg-white rounded-lg border border-green-200 mb-3">
                                                    <p className="text-xs text-green-600 font-medium mb-1">관리자 답변</p>
                                                    <p className="text-sm text-gray-700">{inquiry.admin_response}</p>
                                                    {inquiry.responded_at && (
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {new Date(inquiry.responded_at).toLocaleString("ko-KR")}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* 액션 버튼 */}
                                            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                                                {inquiry.status === "pending" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => updateInquiryStatus(inquiry.id, "in_progress")}
                                                    >
                                                        처리 시작
                                                    </Button>
                                                )}
                                                {inquiry.status !== "resolved" && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-500 hover:bg-green-600"
                                                        onClick={() => {
                                                            setSelectedInquiry(inquiry);
                                                            setAdminResponse(inquiry.admin_response || "");
                                                        }}
                                                    >
                                                        <Send className="w-3 h-3 mr-1" />
                                                        답변하기
                                                    </Button>
                                                )}
                                                {inquiry.status === "resolved" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => updateInquiryStatus(inquiry.id, "closed")}
                                                    >
                                                        종료
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 답변 모달 */}
                    {selectedInquiry && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div
                                className="absolute inset-0 bg-black/50"
                                onClick={() => {
                                    setSelectedInquiry(null);
                                    setAdminResponse("");
                                }}
                            />
                            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
                                <div className="p-4 border-b bg-green-50">
                                    <h3 className="font-bold text-gray-800">문의 답변</h3>
                                    <p className="text-sm text-gray-500">{selectedInquiry.title}</p>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-600 font-medium mb-1">문의 내용</p>
                                        <p className="text-sm text-gray-800">{selectedInquiry.content}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            답변 내용
                                        </label>
                                        <Textarea
                                            value={adminResponse}
                                            onChange={(e) => setAdminResponse(e.target.value)}
                                            placeholder="답변을 입력하세요..."
                                            rows={5}
                                        />
                                    </div>
                                </div>
                                <div className="p-4 border-t flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedInquiry(null);
                                            setAdminResponse("");
                                        }}
                                    >
                                        취소
                                    </Button>
                                    <Button
                                        className="bg-green-500 hover:bg-green-600"
                                        onClick={submitResponse}
                                        disabled={isResponding || !adminResponse.trim()}
                                    >
                                        {isResponding ? "저장 중..." : "답변 저장"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
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
