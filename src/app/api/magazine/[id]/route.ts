/**
 * 개별 매거진 기사 API
 * PATCH: 기사 수정 (관리자 전용)
 * DELETE: 기사 삭제 (관리자 전용)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";
import {
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
    sanitizeInput,
    sanitizeHtmlContent,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

async function verifyAdmin() {
    const user = await getAuthUser();
    if (!user) return { user: null, error: "로그인이 필요합니다", status: 401 };

    const supabase = await createServerSupabase();
    const isEmailAdmin = ADMIN_EMAILS.includes(user.email || "");

    if (!isEmailAdmin) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single();
        if (!profile?.is_admin) {
            return { user: null, error: "관리자 권한이 필요합니다", status: 403 };
        }
    }

    return { user, supabase, error: null, status: 200 };
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const { user, supabase, error, status } = await verifyAdmin();
        if (!user || !supabase) {
            return NextResponse.json({ error }, { status });
        }

        const { id } = await params;
        const body = await request.json();

        const updateData: Record<string, unknown> = {};

        if (body.category !== undefined) updateData.category = sanitizeInput(body.category).slice(0, 50);
        if (body.title !== undefined) updateData.title = sanitizeInput(body.title).slice(0, 200);
        if (body.summary !== undefined) updateData.summary = sanitizeInput(body.summary).slice(0, 500);
        if (body.content !== undefined) updateData.content = body.content ? sanitizeHtmlContent(body.content) : null;
        if (body.author !== undefined) updateData.author = sanitizeInput(body.author).slice(0, 100);
        if (body.authorRole !== undefined) updateData.author_role = body.authorRole ? sanitizeInput(body.authorRole).slice(0, 100) : null;
        if (body.imageUrl !== undefined) updateData.image_url = body.imageUrl || null;
        if (body.imageStoragePath !== undefined) updateData.image_storage_path = body.imageStoragePath || null;
        if (body.readTime !== undefined) updateData.read_time = body.readTime ? sanitizeInput(body.readTime).slice(0, 20) : null;
        if (body.badge !== undefined) updateData.badge = body.badge ? sanitizeInput(body.badge).slice(0, 20) : null;
        if (body.tags !== undefined) updateData.tags = Array.isArray(body.tags) ? body.tags.map((t: string) => sanitizeInput(t).slice(0, 50)) : [];

        if (body.status !== undefined) {
            updateData.status = body.status === "published" ? "published" : "draft";
            if (body.status === "published") {
                updateData.published_at = new Date().toISOString();
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "수정할 필드가 없습니다" }, { status: 400 });
        }

        const { data, error: updateError } = await supabase
            .from("magazine_articles")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (updateError) {
            console.error("[Magazine PATCH] 수정 에러:", updateError);
            return NextResponse.json({ error: "매거진 처리 중 오류가 발생했습니다" }, { status: 500 });
        }

        return NextResponse.json({ article: data });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const { user, supabase, error, status } = await verifyAdmin();
        if (!user || !supabase) {
            return NextResponse.json({ error }, { status });
        }

        const { id } = await params;

        const { data: article } = await supabase
            .from("magazine_articles")
            .select("image_storage_path")
            .eq("id", id)
            .single();

        if (article?.image_storage_path) {
            await supabase.storage
                .from("pet-media")
                .remove([article.image_storage_path]);
        }

        const { error: deleteError } = await supabase
            .from("magazine_articles")
            .delete()
            .eq("id", id);

        if (deleteError) {
            console.error("[Magazine DELETE] 삭제 에러:", deleteError);
            return NextResponse.json({ error: "매거진 처리 중 오류가 발생했습니다" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
