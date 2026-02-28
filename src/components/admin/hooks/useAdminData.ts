/**
 * ============================================================================
 * hooks/useAdminData.ts
 * ============================================================================
 * 관리자 페이지 데이터 로딩 훅
 *
 * 📌 이 파일의 목적:
 * - Supabase에서 관리자용 데이터를 가져오는 로직 분리
 * - 각 탭에서 필요한 데이터만 선택적으로 로드 가능
 * - 재사용 가능한 데이터 fetching 함수 제공
 * ============================================================================
 */

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
    DashboardStats,
    ChartData,
    UserRow,
    PostRow,
    InquiryRow,
    ReportRow,
    WithdrawnUser,
    MagazineArticleRow,
} from "../types";

// ============================================================================
// 훅 반환 타입
// ============================================================================

interface UseAdminDataReturn {
    // 상태
    loading: boolean;
    stats: DashboardStats;
    chartData: ChartData[];
    users: UserRow[];
    posts: PostRow[];
    inquiries: InquiryRow[];
    reports: ReportRow[];
    withdrawals: WithdrawnUser[];
    magazineArticles: MagazineArticleRow[];

    // 데이터 로드 함수
    loadDashboardStats: () => Promise<void>;
    loadChartData: () => Promise<void>;
    loadUsers: () => Promise<void>;
    loadPosts: () => Promise<void>;
    loadInquiries: () => Promise<void>;
    loadReports: () => Promise<void>;
    loadWithdrawals: () => Promise<void>;
    loadMagazineArticles: () => Promise<void>;

    // 상태 업데이트 함수 (외부에서 직접 수정 필요시)
    setUsers: React.Dispatch<React.SetStateAction<UserRow[]>>;
    setInquiries: React.Dispatch<React.SetStateAction<InquiryRow[]>>;
    setReports: React.Dispatch<React.SetStateAction<ReportRow[]>>;
}

// ============================================================================
// 초기 상태 값
// ============================================================================

const INITIAL_STATS: DashboardStats = {
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
};

// ============================================================================
// 메인 훅
// ============================================================================

export function useAdminData(): UseAdminDataReturn {
    // 상태 관리
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [posts, setPosts] = useState<PostRow[]>([]);
    const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
    const [reports, setReports] = useState<ReportRow[]>([]);
    const [withdrawals, setWithdrawals] = useState<WithdrawnUser[]>([]);
    const [magazineArticles, setMagazineArticles] = useState<MagazineArticleRow[]>([]);

    // ========================================================================
    // 대시보드 통계 로드
    // ========================================================================
    const loadDashboardStats = useCallback(async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split("T")[0];
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            // 병렬로 모든 통계 조회
            const [
                { count: totalUsers },
                { count: totalPets },
                { count: totalPosts },
                { count: totalChats },
                { count: todayUsers },
                { count: todayChats },
                { count: premiumUsers },
                { count: bannedUsers },
                { count: todayActiveUsers },
                { count: weeklyActiveUsers },
                { count: monthlyActiveUsers },
            ] = await Promise.all([
                supabase.from("profiles").select("*", { count: "exact", head: true }),
                supabase.from("pets").select("*", { count: "exact", head: true }),
                supabase.from("community_posts").select("*", { count: "exact", head: true }),
                supabase.from("chat_messages").select("*", { count: "exact", head: true }),
                supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today),
                supabase.from("chat_messages").select("*", { count: "exact", head: true }).gte("created_at", today),
                supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_premium", true),
                supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", true),
                supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", today),
                supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", weekAgo),
                supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", monthAgo),
            ]);

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
        } catch {
            // [useAdminData] 통계 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // ========================================================================
    // 차트 데이터 로드 (최근 7일)
    // ========================================================================
    const loadChartData = useCallback(async () => {
        try {
            const days: ChartData[] = [];

            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split("T")[0];
                const nextDateStr = new Date(date.getTime() + 86400000).toISOString().split("T")[0];
                const displayDate = `${date.getMonth() + 1}/${date.getDate()}`;

                // 해당 날짜의 통계를 병렬로 조회
                const [
                    { count: signups },
                    { count: chats },
                    { count: activeUsers },
                ] = await Promise.all([
                    supabase.from("profiles").select("*", { count: "exact", head: true })
                        .gte("created_at", dateStr).lt("created_at", nextDateStr),
                    supabase.from("chat_messages").select("*", { count: "exact", head: true })
                        .gte("created_at", dateStr).lt("created_at", nextDateStr),
                    supabase.from("profiles").select("*", { count: "exact", head: true })
                        .gte("last_seen_at", dateStr).lt("last_seen_at", nextDateStr),
                ]);

                days.push({
                    date: displayDate,
                    가입자: signups || 0,
                    채팅: chats || 0,
                    접속자: activeUsers || 0,
                });
            }

            setChartData(days);
        } catch {
            // [useAdminData] 차트 데이터 로드 실패:", error);
        }
    }, []);

    // ========================================================================
    // 유저 목록 로드
    // ========================================================================
    const loadUsers = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, email, nickname, created_at, is_banned, is_premium, is_admin, points, onboarding_data")
                .order("created_at", { ascending: false })
                .limit(200);

            if (error) throw error;

            if (data) {
                setUsers(data.map(profile => {
                    // onboarding_data에서 petType 추출
                    const obData = profile.onboarding_data as Record<string, unknown> | null;
                    const pt = obData?.petType;
                    const petType: "dog" | "cat" | "other" = pt === "cat" ? "cat" : pt === "other" ? "other" : "dog";

                    return {
                        id: profile.id,
                        email: profile.email,
                        created_at: profile.created_at,
                        user_metadata: { nickname: profile.nickname },
                        is_banned: profile.is_banned,
                        is_premium: profile.is_premium,
                        is_admin: profile.is_admin,
                        points: profile.points ?? 0,
                        petType,
                    };
                }));
            }
        } catch {
            // [useAdminData] 유저 목록 로드 실패:", error);
        }
    }, []);

    // ========================================================================
    // 게시물 목록 로드
    // ========================================================================
    const loadPosts = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("community_posts")
                .select("id, title, content, user_id, author_name, created_at, views")
                .order("created_at", { ascending: false })
                .limit(100);

            if (error) throw error;

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
        } catch {
            // [useAdminData] 게시물 목록 로드 실패:", error);
        }
    }, []);

    // ========================================================================
    // 문의 목록 로드
    // ========================================================================
    const loadInquiries = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("support_inquiries")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(100);

            if (error) throw error;

            if (data) {
                setInquiries(data as InquiryRow[]);
            }
        } catch {
            // [useAdminData] 문의 목록 로드 실패:", error);
        }
    }, []);

    // ========================================================================
    // 신고 목록 로드
    // ========================================================================
    const loadReports = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("reports")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(100);

            if (error) throw error;

            if (data) {
                // reporter_id로 프로필 이메일을 별도 조회
                const reporterIds = Array.from(new Set(data.map((r: Record<string, unknown>) => r.reporter_id as string).filter(Boolean)));
                let emailMap: Record<string, string> = {};

                if (reporterIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from("profiles")
                        .select("id, email, nickname")
                        .in("id", reporterIds);

                    if (profiles) {
                        emailMap = Object.fromEntries(
                            profiles.map((p: { id: string; email?: string }) => [p.id, p.email || "알 수 없음"])
                        );
                    }
                }

                setReports(data.map((r: Record<string, unknown>) => ({
                    ...r,
                    reporter_email: emailMap[r.reporter_id as string] || "알 수 없음",
                })) as ReportRow[]);
            }
        } catch {
            // 신고 목록 로드 실패 시 빈 배열 유지
        }
    }, []);

    // ========================================================================
    // 탈퇴자 목록 로드
    // ========================================================================
    const loadWithdrawals = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("withdrawn_users")
                .select("*")
                .order("withdrawn_at", { ascending: false })
                .limit(100);

            if (error) throw error;

            if (data) {
                setWithdrawals(data as WithdrawnUser[]);
            }
        } catch {
            // [useAdminData] 탈퇴자 목록 로드 실패:", error);
        }
    }, []);

    // ========================================================================
    // 매거진 기사 목록 로드 (관리자용 - 전체 기사)
    // ========================================================================
    const loadMagazineArticles = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("magazine_articles")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(200);

            if (error) throw error;

            if (data) {
                setMagazineArticles(data as MagazineArticleRow[]);
            }
        } catch {
            // [useAdminData] 매거진 기사 로드 실패:", error);
        }
    }, []);

    // ========================================================================
    // 반환
    // ========================================================================
    return {
        loading,
        stats,
        chartData,
        users,
        posts,
        inquiries,
        reports,
        withdrawals,
        magazineArticles,
        loadDashboardStats,
        loadChartData,
        loadUsers,
        loadPosts,
        loadInquiries,
        loadReports,
        loadWithdrawals,
        loadMagazineArticles,
        setUsers,
        setInquiries,
        setReports,
    };
}
