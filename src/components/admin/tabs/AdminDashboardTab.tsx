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
    Globe,
    UserX,
    UserCheck,
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
import { DashboardStats, ChartData, ApiUsageData, VisitStats } from "../types";
import PetProfileMigrationCard from "./PetProfileMigrationCard";
import PaymentRefundCard from "./PaymentRefundCard";

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
    /** 방문자 통계 (게스트 포함) */
    visitStats?: VisitStats | null;
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
    visitStats,
}: AdminDashboardTabProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-memento-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 일회성 데이터 복구 카드 — 복구할 것 없으면 자동 숨김 */}
            <PetProfileMigrationCard />

            {/* 결제 강제 환불 / 상태 동기화 (CS 대응 툴) */}
            <PaymentRefundCard />

            {/* ================================================================
                섹션 1: 핵심 지표 카드
            ================================================================ */}
            <div className="grid grid-cols-2 gap-2">
                <StatCard
                    title="전체 회원"
                    value={stats.totalUsers}
                    icon={<Users className="w-5 h-5 text-memento-600" />}
                    color="bg-memento-200 dark:bg-memento-900/30"
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
                        <div className="flex-1 text-center py-2 px-1 bg-memento-200 dark:bg-memento-900/20 rounded-lg">
                            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">WAU</p>
                            <p className="text-lg font-bold text-memento-600 leading-tight">
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
                섹션 2.5: 방문자 (게스트 포함) — 비로그인 접속까지 집계
            ================================================================ */}
            {visitStats && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Globe className="w-4 h-4 text-cyan-500" />
                            방문자 <span className="text-xs font-normal text-gray-400">(게스트 포함)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-3">
                        <div className="flex gap-2">
                            <div className="flex-1 text-center py-2 px-1 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">오늘 방문자</p>
                                <p className="text-lg font-bold text-cyan-600 leading-tight">
                                    {visitStats.today.uniqueVisitors.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-gray-400">방문 {visitStats.today.totalVisits.toLocaleString()}회</p>
                            </div>
                            <div className="flex-1 text-center py-2 px-1 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                                    <UserX className="w-3 h-3" />비로그인
                                </p>
                                <p className="text-lg font-bold text-orange-600 leading-tight">
                                    {visitStats.today.guestVisitors.toLocaleString()}
                                </p>
                            </div>
                            <div className="flex-1 text-center py-2 px-1 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                                    <UserCheck className="w-3 h-3" />회원
                                </p>
                                <p className="text-lg font-bold text-green-600 leading-tight">
                                    {visitStats.today.memberVisitors.toLocaleString()}
                                </p>
                            </div>
                        </div>
                        {visitStats.daily.length > 0 && (
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={visitStats.daily} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="방문자" stroke="#06b6d4" fill="#cffafe" />
                                        <Area type="monotone" dataKey="비로그인" stroke="#f97316" fill="#ffedd5" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* 가입 전환 퍼널 (최근 7일) — 방문→둘러봄→가입클릭→가입완료 drop-off */}
                        {visitStats.funnel && visitStats.funnel.length > 0 && visitStats.funnel[0].visitors > 0 && (
                            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-2">
                                    가입 전환 퍼널 <span className="text-gray-400">(최근 7일)</span>
                                </p>
                                <div className="space-y-1.5">
                                    {(() => {
                                        const base = visitStats.funnel![0].visitors || 1;
                                        // 표시 단조성 보장: 기록 레이스로 다음 단계가 이전보다 커도 true 퍼널(다음 ≤ 이전)로 클램프
                                        let prev = Infinity;
                                        return visitStats.funnel!.map((s, i) => {
                                            const v = Math.min(s.visitors, prev);
                                            prev = v;
                                            const pct = Math.min(100, Math.round((v / base) * 100));
                                            return (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="w-14 text-[11px] text-gray-600 dark:text-gray-300 shrink-0">{s.step}</span>
                                                    <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="w-20 text-right text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
                                                        {v.toLocaleString()} ({pct}%)
                                                    </span>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ================================================================
                섹션 3: 프리미엄/차단 현황
            ================================================================ */}
            <div className="grid grid-cols-2 gap-2">
                <Card>
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-memorial-100 dark:bg-memorial-400/10 rounded-full flex-shrink-0">
                                <Crown className="w-4 h-4 text-memorial-600" />
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
                        <TrendingUp className="w-4 h-4 text-memento-500" />
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
                            <Zap className="w-4 h-4 text-memorial-500" />
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
                            <div className="p-3 bg-memento-200 dark:bg-memento-900/20 rounded-xl">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Video className="w-4 h-4 text-memento-500" />
                                    <span className="text-xs font-medium text-memento-700 dark:text-memento-300">AI 영상</span>
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
                                        <span className="font-bold text-memento-600 dark:text-memento-400">
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
    const color = ratio < 0.6 ? "bg-green-500" : ratio < 0.8 ? "bg-memorial-500" : "bg-red-500";

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
