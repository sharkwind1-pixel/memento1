/**
 * 포인트 적립 API
 * POST: 클라이언트에서 특정 활동에 대한 포인트 적립 요청
 *
 * 보안:
 * - 세션 기반 인증
 * - 허용된 액션 타입만 처리
 * - 서버사이드 행위 검증 (실제 행위 없이 포인트만 받는 것 방지)
 * - VPN/프록시 감지
 * - Rate Limiting
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase-server";
import { awardPoints } from "@/lib/points";
import { getClientIP, checkRateLimit, getRateLimitHeaders, checkVPN, getVPNBlockResponse } from "@/lib/rate-limit";
import type { PointAction } from "@/types";

export const dynamic = "force-dynamic";

// 클라이언트에서 호출 가능한 액션 타입 (서버사이드에서 이미 처리하는 것은 제외)
const ALLOWED_CLIENT_ACTIONS: PointAction[] = [
    "pet_registration",
    "timeline_entry",
    "photo_upload",
    "write_comment",
];

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase 환경변수 없음");
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

/**
 * 서버사이드 행위 검증: 클라이언트가 주장하는 행위가 실제로 발생했는지 DB에서 확인
 * metadata.targetId로 특정 리소스를 지정하면, 해당 리소스가 존재하고 본인 소유인지 확인
 */
async function verifyAction(
    supabase: SupabaseClient,
    userId: string,
    actionType: PointAction,
    metadata?: Record<string, string>
): Promise<boolean> {
    const targetId = metadata?.targetId;

    switch (actionType) {
        case "pet_registration": {
            // 유저가 실제로 반려동물을 1마리 이상 등록했는지 확인
            const { count } = await supabase
                .from("pets")
                .select("id", { count: "exact", head: true })
                .eq("user_id", userId);
            return (count ?? 0) > 0;
        }
        case "timeline_entry": {
            if (targetId) {
                // 특정 타임라인이 본인 소유인지 확인
                const { data } = await supabase
                    .from("timeline_entries")
                    .select("id")
                    .eq("id", targetId)
                    .eq("user_id", userId)
                    .single();
                return !!data;
            }
            // targetId 없으면 최근 5분 내 작성한 타임라인이 있는지 확인
            const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { count } = await supabase
                .from("timeline_entries")
                .select("id", { count: "exact", head: true })
                .eq("user_id", userId)
                .gte("created_at", fiveMinAgo);
            return (count ?? 0) > 0;
        }
        case "photo_upload": {
            if (targetId) {
                const { data } = await supabase
                    .from("pet_media")
                    .select("id")
                    .eq("id", targetId)
                    .eq("user_id", userId)
                    .single();
                return !!data;
            }
            const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { count } = await supabase
                .from("pet_media")
                .select("id", { count: "exact", head: true })
                .eq("user_id", userId)
                .gte("created_at", fiveMinAgo);
            return (count ?? 0) > 0;
        }
        case "write_comment": {
            if (targetId) {
                const { data } = await supabase
                    .from("community_comments")
                    .select("id")
                    .eq("id", targetId)
                    .eq("user_id", userId)
                    .single();
                return !!data;
            }
            const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { count } = await supabase
                .from("community_comments")
                .select("id", { count: "exact", head: true })
                .eq("user_id", userId)
                .gte("created_at", fiveMinAgo);
            return (count ?? 0) > 0;
        }
        default:
            return false;
    }
}

export async function POST(request: NextRequest) {
    try {
        // 0. IP 기반 보안 체크 (Rate Limit + VPN 감지)
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "general");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            console.warn(`[Security] VPN blocked on points/award: ${clientIP} - ${vpnCheck.reason}`);
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { actionType, metadata } = body as {
            actionType: PointAction;
            metadata?: Record<string, string>;
        };

        // 허용된 액션 타입인지 검증
        if (!actionType || !ALLOWED_CLIENT_ACTIONS.includes(actionType)) {
            return NextResponse.json(
                { error: "허용되지 않은 액션 타입입니다" },
                { status: 400 }
            );
        }

        const supabase = getSupabase();

        // 서버사이드 행위 검증: 실제로 해당 행위가 있었는지 확인
        const isVerified = await verifyAction(supabase, user.id, actionType, metadata);
        if (!isVerified) {
            console.warn(`[Points] 행위 검증 실패: ${user.id} / ${actionType}`);
            return NextResponse.json(
                { error: "포인트 적립 조건이 확인되지 않았습니다" },
                { status: 403 }
            );
        }

        const result = await awardPoints(supabase, user.id, actionType, metadata);

        return NextResponse.json(result);
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
