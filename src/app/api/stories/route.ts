/**
 * 스토리 API
 * GET: 활성 스토리 피드 (expires_at > now)
 * POST: 스토리 작성 (이미지 또는 텍스트)
 * DELETE: 스토리 삭제 (본인만)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
    try {
        const adminSb = createAdminSupabase();
        const now = new Date().toISOString();

        // 활성 스토리 조회 (expires_at 지나지 않은 것, 최신순)
        const { data, error } = await adminSb
            .from("stories")
            .select("id, user_id, image_url, text_content, background_color, pet_id, views_count, created_at, expires_at, author_nickname, author_avatar")
            .gt("expires_at", now)
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 유저별 그룹화 (인스타처럼 한 유저의 스토리를 묶어서)
        const userMap = new Map<string, {
            userId: string;
            nickname: string;
            avatar: string | null;
            stories: typeof data;
        }>();

        for (const story of data || []) {
            const existing = userMap.get(story.user_id);
            if (existing) {
                existing.stories.push(story);
            } else {
                userMap.set(story.user_id, {
                    userId: story.user_id,
                    nickname: story.author_nickname || "익명",
                    avatar: story.author_avatar || null,
                    stories: [story],
                });
            }
        }

        const feed = Array.from(userMap.values());

        return NextResponse.json({ feed, total: data?.length || 0 });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

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
        const { imageUrl, textContent, backgroundColor, petId } = body;

        // 이미지 또는 텍스트 중 하나는 필수
        if (!imageUrl && !textContent) {
            return NextResponse.json({ error: "이미지 또는 텍스트가 필요합니다" }, { status: 400 });
        }

        if (textContent && typeof textContent === "string" && textContent.length > 500) {
            return NextResponse.json({ error: "텍스트는 500자 이내" }, { status: 400 });
        }

        const adminSb = createAdminSupabase();

        // 닉네임/아바타 조회 (JOIN 없이 빠른 조회를 위해 스토리에 저장)
        const { data: profile } = await adminSb
            .from("profiles")
            .select("nickname, avatar_url")
            .eq("id", user.id)
            .maybeSingle();

        const { data: story, error } = await adminSb
            .from("stories")
            .insert({
                user_id: user.id,
                image_url: imageUrl || null,
                text_content: textContent?.trim() || null,
                background_color: backgroundColor || "#05B2DC",
                pet_id: petId || null,
                author_nickname: profile?.nickname || user.user_metadata?.nickname || "익명",
                author_avatar: profile?.avatar_url || null,
            })
            .select()
            .single();

        if (error) {
            console.error("[Stories POST] error:", error.message);
            return NextResponse.json({ error: "스토리 작성 실패" }, { status: 500 });
        }

        return NextResponse.json({ story });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const storyId = searchParams.get("id");
        if (!storyId) {
            return NextResponse.json({ error: "id 필수" }, { status: 400 });
        }

        const adminSb = createAdminSupabase();

        // 본인 스토리인지 확인
        const { data: story } = await adminSb
            .from("stories")
            .select("user_id")
            .eq("id", storyId)
            .maybeSingle();

        if (!story) {
            return NextResponse.json({ error: "스토리를 찾을 수 없습니다" }, { status: 404 });
        }
        if (story.user_id !== user.id) {
            return NextResponse.json({ error: "삭제 권한이 없습니다" }, { status: 403 });
        }

        await adminSb
            .from("stories")
            .delete()
            .eq("id", storyId);

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
