/**
 * 미니홈피 설정 API
 * GET: 내 미니홈피 설정 조회 (없으면 기본값 생성)
 * PATCH: 설정 수정 (isPublic, greeting, backgroundSlug)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders, sanitizeInput } from "@/lib/rate-limit";
import { MINIHOMPY } from "@/config/constants";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const supabase = await createServerSupabase();

        // 설정 조회
        const { data: settings } = await supabase
            .from("minihompy_settings")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

        if (settings) {
            // today_date가 오늘이 아니면 today_visitors 리셋
            const today = new Date().toISOString().split("T")[0];
            if (settings.today_date !== today) {
                const { data: updated } = await supabase
                    .from("minihompy_settings")
                    .update({ today_visitors: 0, today_date: today })
                    .eq("user_id", user.id)
                    .select("*")
                    .single();

                return NextResponse.json({
                    settings: formatSettings(updated || settings),
                });
            }

            return NextResponse.json({ settings: formatSettings(settings) });
        }

        // 없으면 기본값 생성
        const { data: newSettings, error: insertError } = await supabase
            .from("minihompy_settings")
            .insert({
                user_id: user.id,
                is_public: true,
                background_slug: MINIHOMPY.DEFAULT_BACKGROUND,
                greeting: "",
                today_visitors: 0,
                total_visitors: 0,
                total_likes: 0,
            })
            .select("*")
            .single();

        if (insertError) {
            // Race condition: 다른 요청에서 이미 생성됨
            const { data: existing } = await supabase
                .from("minihompy_settings")
                .select("*")
                .eq("user_id", user.id)
                .single();

            return NextResponse.json({
                settings: formatSettings(existing),
            });
        }

        return NextResponse.json({ settings: formatSettings(newSettings) });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
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

        const body = await request.json();
        const updates: Record<string, unknown> = {};

        if (typeof body.isPublic === "boolean") {
            updates.is_public = body.isPublic;
        }

        if (typeof body.greeting === "string") {
            updates.greeting = sanitizeInput(body.greeting).slice(0, MINIHOMPY.GREETING_MAX_LENGTH);
        }

        if (typeof body.backgroundSlug === "string") {
            updates.background_slug = body.backgroundSlug;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "수정할 항목이 없습니다" }, { status: 400 });
        }

        updates.updated_at = new Date().toISOString();

        const supabase = await createServerSupabase();

        // 배경 변경 시 보유 여부 확인
        if (updates.background_slug && updates.background_slug !== MINIHOMPY.DEFAULT_BACKGROUND) {
            const { data: owned } = await supabase
                .from("minihompy_user_backgrounds")
                .select("id")
                .eq("user_id", user.id)
                .eq("background_slug", updates.background_slug)
                .maybeSingle();

            if (!owned) {
                return NextResponse.json({ error: "보유하지 않은 배경입니다" }, { status: 400 });
            }
        }

        const { data: updated, error } = await supabase
            .from("minihompy_settings")
            .update(updates)
            .eq("user_id", user.id)
            .select("*")
            .single();

        if (error) {
            return NextResponse.json({ error: "설정 수정 실패" }, { status: 500 });
        }

        return NextResponse.json({ settings: formatSettings(updated) });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// DB row → camelCase
function formatSettings(row: Record<string, unknown>) {
    if (!row) return null;
    return {
        userId: row.user_id,
        isPublic: row.is_public,
        backgroundSlug: row.background_slug,
        greeting: row.greeting,
        todayVisitors: row.today_visitors,
        totalVisitors: row.total_visitors,
        totalLikes: row.total_likes,
    };
}
