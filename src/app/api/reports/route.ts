/**
 * 신고 API
 * POST: 게시물/댓글/회원 신고
 * 신고 누적 시 자동 숨김 + 텔레그램 알림 + 반복 제재 유저 경고
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { MODERATION } from "@/config/constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다" },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const body = await request.json();
        const { targetType, targetId, reason, description } = body;

        // 입력값 검증 (화이트리스트 + 길이 제한)
        const VALID_TARGET_TYPES = ["post", "comment", "user", "pet_memorial"];
        const VALID_REASONS = ["spam", "abuse", "inappropriate", "harassment", "misinformation", "other"];

        if (!targetType || !targetId || !reason) {
            return NextResponse.json({ error: "필수 항목이 누락되었습니다" }, { status: 400 });
        }
        if (!VALID_TARGET_TYPES.includes(targetType)) {
            return NextResponse.json({ error: "잘못된 신고 유형입니다" }, { status: 400 });
        }
        if (!VALID_REASONS.includes(reason)) {
            return NextResponse.json({ error: "잘못된 신고 사유입니다" }, { status: 400 });
        }
        if (typeof targetId !== "string" || targetId.length > 100) {
            return NextResponse.json({ error: "잘못된 대상 ID입니다" }, { status: 400 });
        }

        const sanitizedDescription = typeof description === "string"
            ? description.trim().slice(0, 500)
            : null;

        const supabase = createAdminSupabase();

        const { error } = await supabase.from("reports").insert({
            reporter_id: user.id,
            target_type: targetType,
            target_id: targetId,
            reason,
            description: sanitizedDescription || null,
        });

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json({ error: "이미 신고한 콘텐츠입니다" }, { status: 409 });
            }
            console.error("[reports] INSERT error:", error.message);
            return NextResponse.json({ error: "신고 처리에 실패했습니다" }, { status: 500 });
        }

        // 텔레그램 관리자 알림 (비동기, 실패 무시)
        import("@/lib/telegram").then(({ notifyReport }) =>
            notifyReport({ reporterEmail: user.email, targetType, targetId, reason })
        ).catch(() => {});

        // 신고 누적 체크 + 자동 숨김 알림 (비동기)
        checkAutoHideAndNotify(supabase, targetType, targetId).catch(() => {});

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

/** 신고 누적 시 자동 숨김 알림 + 반복 제재 유저 경고 */
async function checkAutoHideAndNotify(
    supabase: ReturnType<typeof createAdminSupabase>,
    targetType: string,
    targetId: string,
) {
    if (targetType !== "post") return;

    // 해당 게시글의 pending/reviewing 신고 수 카운트
    const { count } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .in("status", ["pending", "reviewing"]);

    const reportCount = count || 0;

    // 자동 숨김 임계값에 도달했으면 텔레그램에 추가 알림
    if (reportCount >= MODERATION.AUTO_HIDE_REPORT_THRESHOLD) {
        // 게시글 작성자 확인
        const { data: post } = await supabase
            .from("community_posts")
            .select("user_id, title")
            .eq("id", targetId)
            .single();

        if (post) {
            // 텔레그램: 자동 숨김 알림
            import("@/lib/telegram").then(({ notifyReport }) =>
                notifyReport({
                    targetType: "auto-hide",
                    targetId,
                    reason: `신고 ${reportCount}건 누적 자동 숨김: "${(post.title || "").slice(0, 30)}"`,
                })
            ).catch(() => {});

            // 해당 유저의 최근 30일 제재 횟수 체크
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const { count: userViolations } = await supabase
                .from("moderation_logs")
                .select("id", { count: "exact", head: true })
                .eq("result", "blocked")
                .gte("created_at", thirtyDaysAgo)
                .in("post_id", (
                    await supabase
                        .from("community_posts")
                        .select("id")
                        .eq("user_id", post.user_id)
                ).data?.map(p => p.id) || []);

            const violations = userViolations || 0;

            // 3회 이상 제재 유저 경고 알림
            if (violations >= 3) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("nickname, email:id")
                    .eq("id", post.user_id)
                    .single();

                import("@/lib/telegram").then(({ notifyError }) =>
                    notifyError({
                        endpoint: "moderation",
                        error: `반복 위반 유저: ${profile?.nickname || "unknown"} (30일 내 ${violations}회 제재). 차단 검토 필요`,
                        userId: post.user_id,
                    })
                ).catch(() => {});
            }
        }
    }
}
