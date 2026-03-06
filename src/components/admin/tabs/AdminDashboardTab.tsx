/**
 * ============================================================================
 * tabs/AdminDashboardTab.tsx
 * ============================================================================
 * 관리자 대시보드 탭 - 서비스 현황 통계 표시
 *
 * 📌 주요 기능:
 * - 전체 통계 카드 (유저, 펫, 게시글, 채팅 수)
 * - DAU/WAU/MAU 활성 사용자 지표
 * - 최근 7일 추이 차트
 * ============================================================================
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    PawPrint,
    FileText,
    MessageCircle,
    TrendingUp,
    Crown,
    Ban,
    Activity,
    Calendar,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { DashboardStats, ChartData } from "../types";

// ============================================================================
// Props 타입 정의
// ============================================================================

interface AdminDashboardTabProps {
    /** 대시보드 통계 데이터 */
    stats: DashboardStats;
    /** 차트 데이터 (최근 7일) */
    chartData: ChartData[];
    /** 로딩 상태 */
    loading: boolean;
}

// ============================================================================
// 통계 카드 컴포넌트
// ============================================================================

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    subValue?: string;
}

function StatCard({ title, value, icon, color, subValue }: StatCardProps) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                        {subValue && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subValue}</p>
                        )}
                    </div>
                    <div className={`p-3 rounded-full ${color}`}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AdminDashboardTab({
    stats,
    chartData,
    loading,
}: AdminDashboardTabProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ================================================================
                섹션 1: 핵심 지표 카드
            ================================================================ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="전체 회원"
                    value={stats.totalUsers}
                    icon={<Users className="w-6 h-6 text-blue-600" />}
                    color="bg-blue-100 dark:bg-blue-900/30"
                    subValue={`오늘 +${stats.todayUsers}`}
                />
                <StatCard
                    title="반려동물"
                    value={stats.totalPets}
                    icon={<PawPrint className="w-6 h-6 text-pink-600" />}
                    color="bg-pink-100 dark:bg-pink-900/30"
                />
                <StatCard
                    title="게시글"
                    value={stats.totalPosts}
                    icon={<FileText className="w-6 h-6 text-green-600" />}
                    color="bg-green-100 dark:bg-green-900/30"
                />
                <StatCard
                    title="AI 채팅"
                    value={stats.totalChats}
                    icon={<MessageCircle className="w-6 h-6 text-purple-600" />}
                    color="bg-purple-100 dark:bg-purple-900/30"
                    subValue={`오늘 +${stats.todayChats}`}
                />
            </div>

            {/* ================================================================
                섹션 2: 활성 사용자 (DAU/WAU/MAU)
            ================================================================ */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-500" />
                        활성 사용자
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* DAU */}
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">DAU (일간)</p>
                            <p className="text-2xl font-bold text-green-600">
                                {stats.todayActiveUsers.toLocaleString()}
                            </p>
                        </div>
                        {/* WAU */}
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">WAU (주간)</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {stats.weeklyActiveUsers.toLocaleString()}
                            </p>
                        </div>
                        {/* MAU */}
                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">MAU (월간)</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {stats.monthlyActiveUsers.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ================================================================
                섹션 3: 프리미엄/차단 현황
            ================================================================ */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-100 dark:bg-amber-400/10 rounded-full">
                                <Crown className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">프리미엄 회원</p>
                                <p className="text-xl font-bold">{stats.premiumUsers}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                                <Ban className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">차단된 회원</p>
                                <p className="text-xl font-bold">{stats.bannedUsers}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ================================================================
                섹션 4: 최근 7일 추이 차트
            ================================================================ */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-sky-500" />
                        최근 7일 추이
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {chartData.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area
                                        type="monotone"
                                        dataKey="접속자"
                                        stackId="1"
                                        stroke="#10b981"
                                        fill="#d1fae5"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="가입자"
                                        stackId="2"
                                        stroke="#3b82f6"
                                        fill="#dbeafe"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="채팅"
                                        stackId="3"
                                        stroke="#8b5cf6"
                                        fill="#ede9fe"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
                            <Calendar className="w-8 h-8 mr-2" />
                            차트 데이터 로딩 중...
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
