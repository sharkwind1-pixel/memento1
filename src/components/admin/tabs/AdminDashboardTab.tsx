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
    Zap,
    Video,
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
import { DashboardStats, ChartData, ApiUsageData } from "../types";

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
    /** API 사용량 데이터 */
    apiUsage?: ApiUsageData | null;
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
            <CardContent className="p-3">
                <div className="flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
                        <p className="text-lg font-bold">{value.toLocaleString()}</p>
                        {subValue && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{subValue}</p>
                        )}
                    </div>
                    <div className={`p-2 rounded-full flex-shrink-0 ${color}`}>
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
    apiUsage,
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
            <div className="grid grid-cols-2 gap-2">
                <StatCard
                    title="전체 회원"
                    value={stats.totalUsers}
                    icon={<Users className="w-5 h-5 text-blue-600" />}
                    color="bg-blue-100 dark:bg-blue-900/30"
                    subValue={`오늘 +${stats.todayUsers}`}
                />
                <StatCard
                    title="반려동물"
                    value={stats.totalPets}
                    icon={<PawPrint className="w-5 h-5 text-pink-600" />}
                    color="bg-pink-100 dark:bg-pink-900/30"
                />
                <StatCard
                    title="게시글"
                    value={stats.totalPosts}
                    icon={<FileText className="w-5 h-5 text-green-600" />}
                    color="bg-green-100 dark:bg-green-900/30"
                />
                <StatCard
                    title="AI 채팅"
                    value={stats.totalChats}
                    icon={<MessageCircle className="w-5 h-5 text-purple-600" />}
                    color="bg-purple-100 dark:bg-purple-900/30"
                    subValue={`오늘 +${stats.todayChats}`}
                />
            </div>

            {/* ================================================================
                섹션 2: 활성 사용자 (DAU/WAU/MAU)
            ================================================================ */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-500" />
                        활성 사용자
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                    <div className="flex gap-2">
                        {/* DAU */}
                        <div className="flex-1 text-center py-2 px-1 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">DAU</p>
                            <p className="text-lg font-bold text-green-600 leading-tight">
                                {stats.todayActiveUsers.toLocaleString()}
                            </p>
                        </div>
                        {/* WAU */}
                        <div className="flex-1 text-center py-2 px-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">WAU</p>
                            <p className="text-lg font-bold text-blue-600 leading-tight">
                                {stats.weeklyActiveUsers.toLocaleString()}
                            </p>
                        </div>
                        {/* MAU */}
                        <div className="flex-1 text-center py-2 px-1 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">MAU</p>
                            <p className="text-lg font-bold text-purple-600 leading-tight">
                                {stats.monthlyActiveUsers.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ================================================================
                섹션 3: 프리미엄/차단 현황
            ================================================================ */}
            <div className="grid grid-cols-2 gap-2">
                <Card>
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-amber-100 dark:bg-amber-400/10 rounded-full flex-shrink-0">
                                <Crown className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-gray-500 dark:text-gray-400">프리미엄</p>
                                <p className="text-lg font-bold">{stats.premiumUsers}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full flex-shrink-0">
                                <Ban className="w-4 h-4 text-red-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-gray-500 dark:text-gray-400">차단</p>
                                <p className="text-lg font-bold">{stats.bannedUsers}</p>
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
                    <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-sky-500" />
                        최근 7일 추이
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-3">
                    {chartData.length > 0 ? (
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
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
                        <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                            <Calendar className="w-6 h-6 mr-2" />
                            차트 데이터 로딩 중...
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ================================================================
                섹션 5: API 사용량 (크레딧)
            ================================================================ */}
            {apiUsage && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            API 사용량
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className="grid grid-cols-2 gap-3">
                            {/* OpenAI (AI 펫톡) */}
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <MessageCircle className="w-4 h-4 text-purple-500" />
                                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">AI 펫톡</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-gray-500 dark:text-gray-400">오늘</span>
                                        <span className="font-medium">{apiUsage.openai.todayCount.toLocaleString()}건</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-gray-500 dark:text-gray-400">이번 달</span>
                                        <span className="font-medium">{apiUsage.openai.monthCount.toLocaleString()}건</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-gray-500 dark:text-gray-400">예상 비용</span>
                                        <span className="font-bold text-purple-600 dark:text-purple-400">
                                            ${apiUsage.openai.estimatedMonthlyCostUsd.toFixed(2)}
                                        </span>
                                    </div>
                                    {apiUsage.openai.budgetUsd && (
                                        <ApiUsageProgressBar
                                            used={apiUsage.openai.estimatedMonthlyCostUsd}
                                            budget={apiUsage.openai.budgetUsd}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* fal.ai (AI 영상) */}
                            <div className="p-3 bg-sky-50 dark:bg-sky-900/20 rounded-xl">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Video className="w-4 h-4 text-sky-500" />
                                    <span className="text-xs font-medium text-sky-700 dark:text-sky-300">AI 영상</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-gray-500 dark:text-gray-400">오늘</span>
                                        <span className="font-medium">{apiUsage.fal.todayCount.toLocaleString()}건</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-gray-500 dark:text-gray-400">이번 달</span>
                                        <span className="font-medium">{apiUsage.fal.monthCount.toLocaleString()}건</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-gray-500 dark:text-gray-400">예상 비용</span>
                                        <span className="font-bold text-sky-600 dark:text-sky-400">
                                            ${apiUsage.fal.estimatedMonthlyCostUsd.toFixed(2)}
                                        </span>
                                    </div>
                                    {apiUsage.fal.budgetUsd && (
                                        <ApiUsageProgressBar
                                            used={apiUsage.fal.estimatedMonthlyCostUsd}
                                            budget={apiUsage.fal.budgetUsd}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ============================================================================
// API 사용량 프로그레스바
// ============================================================================

function ApiUsageProgressBar({ used, budget }: { used: number; budget: number }) {
    const ratio = Math.min(used / budget, 1);
    const percent = Math.round(ratio * 100);
    const color = ratio < 0.6 ? "bg-green-500" : ratio < 0.8 ? "bg-amber-500" : "bg-red-500";

    return (
        <div className="mt-1">
            <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                <span>예산 ${budget}</span>
                <span>{percent}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
