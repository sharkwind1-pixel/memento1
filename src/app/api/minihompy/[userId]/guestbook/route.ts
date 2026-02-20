/**
 * 방명록 API
 * GET: 방명록 목록 (페이지네이션)
 * POST: 방명록 작성 (로그인 필수)
 * DELETE: 방명록 삭제 (작성자 또는 미니홈피 주인)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders, sanitizeInput } from "@/lib/rate-limit";
import { MINIHOMPY } from "@/config/constants";
import { awardPoints } from "@/lib/points";

export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const { searchParams } = new URL(request.url);
        const offset = parseInt(searchParams.get("offset") || "0");
        const limit = MINIHOMPY.GUESTBOOK_PAGE_SIZE;

        const supabase = await createServerSupabase();

        const { data: guestbook, count } = await supabase
            .from("minihompy_guestbook")
            .select("id, owner_id, visitor_id, content, created_at", { count: "exact" })
            .eq("owner_id", userId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // 방문자 닉네임 + 미니미
        const visitorIds = Array.from(new Set((guestbook || []).map(g => g.visitor_id)));
        let visitorProfiles: Record<string, { nickname: string; pixelData: unknown }> = {};

        if (visitorIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, nickname, minimi_pixel_data")
                .in("id", visitorIds);

            if (profiles) {
                visitorProfiles = Object.fromEntries(
                    profiles.map(p => [p.id, { nickname: p.nickname || "익명", pixelData: p.minimi_pixel_data }])
                );
            }
        }

        const formatted = (guestbook || []).map(g => ({
            id: g.id,
            ownerId: g.owner_id,
            visitorId: g.visitor_id,
            visitorNickname: visitorProfiles[g.visitor_id]?.nickname || "익명",
            visitorMinimiData: visitorProfiles[g.visitor_id]?.pixelData || null,
            content: g.content,
            createdAt: g.created_at,
        }));

        return NextResponse.json({
            guestbook: formatted,
            total: count || 0,
            hasMore: (count || 0) > offset + limit,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
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

        const { userId } = await params;

        // 자기 방명록에는 쓸 수 없음
        if (user.id === userId) {
            return NextResponse.json({ error: "자신의 방명록에는 작성할 수 없습니다" }, { status: 400 });
        }

        const body = await request.json();
        const content = sanitizeInput(body.content || "").slice(0, MINIHOMPY.GUESTBOOK_MAX_LENGTH);

        if (!content || content.length < 1) {
            return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });
        }

        const supabase = await createServerSupabase();

        // 방명록 작성
        const { data: entry, error } = await supabase
            .from("minihompy_guestbook")
            .insert({
                owner_id: userId,
                visitor_id: user.id,
                content,
            })
            .select("id, owner_id, visitor_id, content, created_at")
            .single();

        if (error) {
            return NextResponse.json({ error: "방명록 작성 실패" }, { status: 500 });
        }

        // 포인트 적립 (작성자 +3P, 주인 +2P)
        await awardPoints(supabase, user.id, "write_guestbook");
        await awardPoints(supabase, userId, "receive_guestbook");

        // 작성자 닉네임 + 미니미
        const { data: profile } = await supabase
            .from("profiles")
            .select("nickname, minimi_pixel_data")
            .eq("id", user.id)
            .single();

        return NextResponse.json({
            entry: {
                id: entry.id,
                ownerId: entry.owner_id,
                visitorId: entry.visitor_id,
                visitorNickname: profile?.nickname || "익명",
                visitorMinimiData: profile?.minimi_pixel_data || null,
                content: entry.content,
                createdAt: entry.created_at,
            },
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const { userId } = await params;
        const { searchParams } = new URL(request.url);
        const entryId = searchParams.get("entryId");

        if (!entryId) {
            return NextResponse.json({ error: "삭제할 방명록을 지정해주세요" }, { status: 400 });
        }

        const supabase = await createServerSupabase();

        // 삭제 권한 확인: 작성자 본인 또는 미니홈피 주인
        const { data: entry } = await supabase
            .from("minihompy_guestbook")
            .select("id, visitor_id, owner_id")
            .eq("id", entryId)
            .single();

        if (!entry) {
            return NextResponse.json({ error: "방명록을 찾을 수 없습니다" }, { status: 404 });
        }

        if (entry.visitor_id !== user.id && entry.owner_id !== user.id) {
            return NextResponse.json({ error: "삭제 권한이 없습니다" }, { status: 403 });
        }

        const { error } = await supabase
            .from("minihompy_guestbook")
            .delete()
            .eq("id", entryId);

        if (error) {
            return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
