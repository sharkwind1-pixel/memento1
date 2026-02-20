/**
 * 펫매거진 기사 API
 * GET: 발행된 기사 목록 조회 (공개)
 * POST: 기사 작성 (관리자 전용)
 *
 * 보안: POST - 세션 인증 + 관리자 권한 확인
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

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabase();
        const { searchParams } = new URL(request.url);

        const category = searchParams.get("category");
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
        const offset = parseInt(searchParams.get("offset") || "0");

        let query = supabase
            .from("magazine_articles")
            .select("*", { count: "exact" })
            .eq("status", "published")
            .order("published_at", { ascending: false });

        if (category && category !== "all") {
            query = query.eq("category", category);
        }

        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const articles = (data || []).map((a) => ({
            id: a.id,
            category: a.category,
            title: a.title,
            summary: a.summary,
            content: a.content,
            author: a.author,
            authorRole: a.author_role,
            imageUrl: a.image_url,
            readTime: a.read_time,
            badge: a.badge,
            tags: a.tags || [],
            views: a.views,
            likes: a.likes,
            publishedAt: a.published_at,
            createdAt: a.created_at,
        }));

        return NextResponse.json({ articles, total: count });
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
                { error: "요청이 너무 많습니다." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const supabase = await createServerSupabase();
        const isEmailAdmin = ADMIN_EMAILS.includes(user.email || "");

        if (!isEmailAdmin) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("is_admin")
                .eq("id", user.id)
                .single();
            if (!profile?.is_admin) {
                return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
            }
        }

        const body = await request.json();
        const { category, title, summary, content, author, authorRole, imageUrl, imageStoragePath, readTime, badge, tags, status } = body;

        if (!category || !title || !summary || !author) {
            return NextResponse.json({ error: "필수 필드 누락 (category, title, summary, author)" }, { status: 400 });
        }

        const articleData = {
            user_id: user.id,
            category: sanitizeInput(category).slice(0, 50),
            title: sanitizeInput(title).slice(0, 200),
            summary: sanitizeInput(summary).slice(0, 500),
            content: content ? sanitizeHtmlContent(content) : null,
            author: sanitizeInput(author).slice(0, 100),
            author_role: authorRole ? sanitizeInput(authorRole).slice(0, 100) : null,
            image_url: imageUrl || null,
            image_storage_path: imageStoragePath || null,
            read_time: readTime ? sanitizeInput(readTime).slice(0, 20) : null,
            badge: badge ? sanitizeInput(badge).slice(0, 20) : null,
            tags: Array.isArray(tags) ? tags.map((t: string) => sanitizeInput(t).slice(0, 50)) : [],
            status: status === "published" ? "published" : "draft",
            published_at: status === "published" ? new Date().toISOString() : null,
        };

        const { data, error } = await supabase
            .from("magazine_articles")
            .insert([articleData])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ article: data });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
