/**
 * 유저 차단 API
 * GET: 차단 목록 조회
 * POST: 유저 차단
 * DELETE: 차단 해제
 *
 * 보안: 세션 기반 인증, Rate Limiting
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import {
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// 차단 목록 조회
export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const supabase = await createServerSupabase();

        const { data, error } = await supabase
            .from("user_blocks")
            .select("id, blocker_id, blocked_user_id, reason, created_at")
            .eq("blocker_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("[Blocks GET] 조회 에러:", error);
            return NextResponse.json({ error: "차단 목록을 불러올 수 없습니다" }, { status: 500 });
        }

        // 차단된 유저들의 닉네임 조회
        const blockedUserIds = (data || []).map(b => b.blocked_user_id);
        let nicknameMap: Record<string, string> = {};

        if (blockedUserIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, nickname")
                .in("id", blockedUserIds);

            if (profiles) {
                nicknameMap = Object.fromEntries(
                    profiles.map(p => [p.id, p.nickname || "알 수 없음"])
                );
            }
        }

        const blocks = (data || []).map(b => ({
            id: b.id,
            blockerId: b.blocker_id,
            blockedUserId: b.blocked_user_id,
            blockedNickname: nicknameMap[b.blocked_user_id] || "알 수 없음",
            reason: b.reason,
            createdAt: b.created_at,
        }));

        return NextResponse.json({ blocks });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// 유저 차단
export async function POST(request: NextRequest) {
    try {
        // Rate Limit
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const body = await request.json();
        const { blockedUserId, reason } = body;

        if (!blockedUserId) {
            return NextResponse.json({ error: "차단할 유저 정보가 필요합니다" }, { status: 400 });
        }

        // 자기 자신 차단 방지
        if (blockedUserId === user.id) {
            return NextResponse.json({ error: "자기 자신은 차단할 수 없습니다" }, { status: 400 });
        }

        const supabase = await createServerSupabase();

        // 이미 차단했는지 확인
        const { data: existing } = await supabase
            .from("user_blocks")
            .select("id")
            .eq("blocker_id", user.id)
            .eq("blocked_user_id", blockedUserId)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: "이미 차단한 유저입니다" }, { status: 409 });
        }

        // 차단 추가
        const { data, error } = await supabase
            .from("user_blocks")
            .insert({
                blocker_id: user.id,
                blocked_user_id: blockedUserId,
                reason: reason || null,
            })
            .select()
            .single();

        if (error) {
            console.error("[Blocks POST] 차단 에러:", error);
            return NextResponse.json({ error: "차단에 실패했습니다" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            block: {
                id: data.id,
                blockerId: data.blocker_id,
                blockedUserId: data.blocked_user_id,
                reason: data.reason,
                createdAt: data.created_at,
            },
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// 차단 해제
export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const blockedUserId = searchParams.get("blockedUserId");

        if (!blockedUserId) {
            return NextResponse.json({ error: "차단 해제할 유저 정보가 필요합니다" }, { status: 400 });
        }

        const supabase = await createServerSupabase();

        const { error } = await supabase
            .from("user_blocks")
            .delete()
            .eq("blocker_id", user.id)
            .eq("blocked_user_id", blockedUserId);

        if (error) {
            console.error("[Blocks DELETE] 해제 에러:", error);
            return NextResponse.json({ error: "차단 해제에 실패했습니다" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
