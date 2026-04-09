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
    UserDetailData,
    ApiUsageData,
} from "../types";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";

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
    userDetails: Record<string, UserDetailData>;
    apiUsage: ApiUsageData | null;

    // 데이터 로드 함수
    loadDashboardStats: () => Promise<void>;
    loadChartData: () => Promise<void>;
    loadUsers: () => Promise<void>;
    loadPosts: () => Promise<void>;
    loadInquiries: () => Promise<void>;
    loadReports: () => Promise<void>;
    loadWithdrawals: () => Promise<void>;
    loadMagazineArticles: () => Promise<void>;
    loadUserDetail: (userId: string) => Promise<void>;
    loadApiUsage: () => Promise<void>;

    // 상태 업데이트 함수 (외부에서 직접 수정 필요시)
    setUsers: React.Dispatch<React.SetStateAction<UserRow[]>>;
    setPosts: React.Dispatch<React.SetStateAction<PostRow[]>>;
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
    const [userDetails, setUserDetails] = useState<Record<string, UserDetailData>>({});
    const [apiUsage, setApiUsage] = useState<ApiUsageData | null>(null);

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
        } catch (error) {
            console.error("[useAdminData] 통계 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // ========================================================================
    // 차트 데이터 로드 (최근 7일)
    // ========================================================================
    const loadChartData = useCallback(async () => {
        try {
            // 7일치 날짜 정보를 미리 계산
            const dateInfos = Array.from({ length: 7 }, (_, idx) => {
                const i = 6 - idx;
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split("T")[0];
                const nextDateStr = new Date(date.getTime() + 86400000).toISOString().split("T")[0];
                const displayDate = `${date.getMonth() + 1}/${date.getDate()}`;
                return { dateStr, nextDateStr, displayDate };
            });

            // 21개 쿼리를 한 번에 병렬 실행 (7일 x 3종류)
            const queries = dateInfos.flatMap(({ dateStr, nextDateStr }) => [
                supabase.from("profiles").select("*", { count: "exact", head: true })
                    .gte("created_at", dateStr).lt("created_at", nextDateStr),
                supabase.from("chat_messages").select("*", { count: "exact", head: true })
                    .gte("created_at", dateStr).lt("created_at", nextDateStr),
                supabase.from("profiles").select("*", { count: "exact", head: true })
                    .gte("last_seen_at", dateStr).lt("last_seen_at", nextDateStr),
            ]);

            const results = await Promise.all(queries);

            const days: ChartData[] = dateInfos.map((info, idx) => ({
                date: info.displayDate,
                가입자: results[idx * 3].count || 0,
                채팅: results[idx * 3 + 1].count || 0,
                접속자: results[idx * 3 + 2].count || 0,
            }));

            setChartData(days);
        } catch (error) {
            console.error("[useAdminData] 차트 데이터 로드 실패:", error);
        }
    }, []);

    // ========================================================================
    // 유저 목록 로드
    // ========================================================================
    const loadUsers = useCallback(async () => {
        try {
            // 탈퇴 처리된 유저 ID 목록 조회
            const { data: withdrawnData } = await supabase
                .from("withdrawn_users")
                .select("user_id");
            const withdrawnIds = new Set(
                (withdrawnData || []).map((w: { user_id: string }) => w.user_id)
            );

            const { data, error } = await supabase
                .from("profiles")
                .select("id, email, nickname, created_at, is_banned, is_premium, is_admin, points, premium_started_at, premium_expires_at, premium_plan, subscription_tier, onboarding_data")
                .order("created_at", { ascending: false })
                .limit(200);

            if (error) throw error;

            if (data) {
                // 탈퇴 처리된 유저는 목록에서 제외
                const activeProfiles = data.filter(
                    profile => !withdrawnIds.has(profile.id)
                );

                // onboarding_data에 petType이 없는 유저들의 pets 조회
                const needsPetLookup = activeProfiles.filter(p => {
                    const ob = p.onboarding_data as Record<string, unknown> | null;
                    const pt = ob?.petType;
                    return pt !== "cat" && pt !== "dog" && pt !== "other";
                });

                // pets 테이블에서 첫 번째 펫의 type을 가져와 매핑
                const petTypeMap: Record<string, "dog" | "cat" | "other"> = {};
                if (needsPetLookup.length > 0) {
                    const userIds = needsPetLookup.map(p => p.id);
                    const { data: petsData } = await supabase
                        .from("pets")
                        .select("user_id, type")
                        .in("user_id", userIds)
                        .order("created_at", { ascending: true });
                    if (petsData) {
                        // 유저별 첫 번째 펫만 사용 (created_at 오름차순이므로 첫 번째가 가장 오래된 것)
                        for (const pet of petsData) {
                            if (!petTypeMap[pet.user_id]) {
                                const t = pet.type as string;
                                if (t === "고양이") petTypeMap[pet.user_id] = "cat";
                                else if (t === "강아지") petTypeMap[pet.user_id] = "dog";
                                else petTypeMap[pet.user_id] = "other";
                            }
                        }
                    }
                }

                setUsers(activeProfiles.map(profile => {
                    // petType 결정: (1) onboarding_data.petType → (2) pets.type → (3) 기본값 "dog"
                    const obData = profile.onboarding_data as Record<string, unknown> | null;
                    const pt = obData?.petType;
                    let petType: "dog" | "cat" | "other";
                    if (pt === "cat" || pt === "dog" || pt === "other") {
                        petType = pt;
                    } else {
                        petType = petTypeMap[profile.id] || "dog";
                    }

                    return {
                        id: profile.id,
                        email: profile.email,
                        created_at: profile.created_at,
                        user_metadata: { nickname: profile.nickname },
                        is_banned: profile.is_banned,
                        is_premium: profile.is_premium,
                        is_admin: profile.is_admin,
                        points: profile.points ?? 0,
                        premium_started_at: profile.premium_started_at ?? undefined,
                        premium_expires_at: profile.premium_expires_at ?? undefined,
                        premium_plan: profile.premium_plan ?? undefined,
                        subscription_tier: (profile.subscription_tier as "free" | "basic" | "premium") ?? undefined,
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
                .select("id, title, content, user_id, author_name, created_at, views, likes_count, comments_count, image_urls, is_hidden, category, report_count")
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
                    is_hidden: post.is_hidden ?? false,
                    report_count: post.report_count ?? 0,
                    views: post.views ?? 0,
                    likes_count: post.likes_count ?? 0,
                    comments_count: post.comments_count ?? 0,
                    image_urls: post.image_urls ?? [],
                    category: post.category ?? undefined,
                })));
            }
        } catch {
            // [useAdminData] 게시물 목록 로드 실패
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
    // 유저 상세 조회 (온디맨드)
    // ========================================================================
    const loadUserDetail = useCallback(async (userId: string) => {
        if (userDetails[userId]) return;
        try {
            const res = await authFetch(`${API.ADMIN_USER_DETAIL}?userId=${userId}`);
            if (!res.ok) throw new Error("상세 조회 실패");
            const data: UserDetailData = await res.json();
            setUserDetails(prev => ({ ...prev, [userId]: data }));
        } catch {
            // 유저 상세 조회 실패
        }
    }, [userDetails]);

    // ========================================================================
    // API 사용량 조회
    // ========================================================================
    const loadApiUsage = useCallback(async () => {
        try {
            const res = await authFetch(API.ADMIN_API_USAGE);
            if (!res.ok) throw new Error("API 사용량 조회 실패");
            const data: ApiUsageData = await res.json();
            setApiUsage(data);
        } catch {
            // API 사용량 조회 실패
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
        userDetails,
        apiUsage,
        loadDashboardStats,
        loadChartData,
        loadUsers,
        loadPosts,
        loadInquiries,
        loadReports,
        loadWithdrawals,
        loadMagazineArticles,
        loadUserDetail,
        loadApiUsage,
        setUsers,
        setPosts,
        setInquiries,
        setReports,
    };
}
