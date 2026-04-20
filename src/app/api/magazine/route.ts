/**
 * 펫매거진 기사 API
 * GET: 발행된 기사 목록 조회 (공개)
 * POST: 기사 작성 (관리자 전용)
 * PATCH: 좋아요 토글 / 조회수 증가 (공개)
 *
 * 보안: POST - 세션 인증 + 관리자 권한 확인
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";
import {
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
    sanitizeInput,
    sanitizeHtmlContent,
    sanitizeSearchQuery,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabase();
        const { searchParams } = new URL(request.url);

        const category = searchParams.get("category");
        const badge = searchParams.get("badge");
        const search = searchParams.get("search");
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
        if (badge && badge !== "all") {
            query = query.eq("badge", badge);
        }
        if (search) {
            const sanitizedSearch = sanitizeSearchQuery(search);
            query = query.or(`title.ilike.%${sanitizedSearch}%,summary.ilike.%${sanitizedSearch}%`);
        }

        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            console.error("[Magazine GET] 조회 에러:", error);
            return NextResponse.json({ error: "매거진 처리 중 오류가 발생했습니다" }, { status: 500 });
        }

        // 유저별 liked 상태 조회 (로그인 유저가 있을 때만)
        let userLikedIds = new Set<string>();
        try {
            const user = await getAuthUser();
            if (user && data && data.length > 0) {
                const adminSb = createAdminSupabase();
                const articleIds = data.map((a) => a.id);
                const { data: myLikes } = await adminSb
                    .from("magazine_likes")
                    .select("article_id")
                    .eq("user_id", user.id)
                    .in("article_id", articleIds);
                if (myLikes) {
                    userLikedIds = new Set(myLikes.map((l) => l.article_id));
                }
            }
        } catch {
            // 비로그인이거나 테이블 미존재 시 무시 (liked=false로 폴백)
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
            liked: userLikedIds.has(a.id), // 현재 유저의 좋아요 여부
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
        if (status === "published" && !content) {
            return NextResponse.json({ error: "발행할 기사에는 본문(content)이 필요합니다" }, { status: 400 });
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
            console.error("[Magazine POST] 작성 에러:", error);
            return NextResponse.json({ error: "매거진 처리 중 오류가 발생했습니다" }, { status: 500 });
        }

        return NextResponse.json({ article: data });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

/**
 * PATCH: 좋아요 토글 또는 조회수 증가
 * body.action = "like" → likes +1 / -1 (토글)
 * body.action = "view" → views +1
 */
export async function PATCH(request: NextRequest) {
    try {
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "general");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        // 인증 확인 (조회수/좋아요 조작 방지)
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const body = await request.json();
        const { articleId, action } = body;

        if (!articleId || !action) {
            return NextResponse.json({ error: "articleId, action 필수" }, { status: 400 });
        }

        const supabase = await createServerSupabase();

        if (action === "view") {
            // 조회수 +1 (RPC 또는 직접 increment)
            const { data: article, error: fetchError } = await supabase
                .from("magazine_articles")
                .select("views")
                .eq("id", articleId)
                .single();

            if (fetchError || !article) {
                return NextResponse.json({ error: "기사를 찾을 수 없습니다" }, { status: 404 });
            }

            const { error: updateError } = await supabase
                .from("magazine_articles")
                .update({ views: (article.views || 0) + 1 })
                .eq("id", articleId);

            if (updateError) {
                console.error("[Magazine PATCH] 조회수 업데이트 에러:", updateError);
                return NextResponse.json({ error: "조회수 업데이트 실패" }, { status: 500 });
            }

            return NextResponse.json({ views: (article.views || 0) + 1 });
        }

        if (action === "like" || action === "unlike") {
            // magazine_likes 테이블 기반 토글 (post_likes 패턴)
            // UNIQUE(article_id, user_id)로 중복 방지 + 실제 count 집계로 음수 불가
            const adminSb = createAdminSupabase();

            // 기존 좋아요 확인
            const { data: existingLike } = await adminSb
                .from("magazine_likes")
                .select("id")
                .eq("article_id", articleId)
                .eq("user_id", user.id)
                .maybeSingle();

            let liked: boolean;

            if (existingLike) {
                // 이미 좋아요 → 삭제 (토글)
                await adminSb
                    .from("magazine_likes")
                    .delete()
                    .eq("article_id", articleId)
                    .eq("user_id", user.id);
                liked = false;
            } else {
                // 좋아요 추가
                const { error: insertErr } = await adminSb
                    .from("magazine_likes")
                    .insert({ article_id: articleId, user_id: user.id });

                if (insertErr) {
                    // 23505 = UNIQUE 위반 (동시 요청) → 이미 좋아요 상태
                    if (insertErr.code === "23505") {
                        liked = true;
                    } else {
                        console.error("[Magazine PATCH] 좋아요 INSERT 에러:", insertErr);
                        return NextResponse.json({ error: "좋아요 처리 실패" }, { status: 500 });
                    }
                } else {
                    liked = true;
                }
            }

            // 실제 카운트 집계 (magazine_likes 테이블 행 수 = 정확한 좋아요 수)
            const { count: likesCount } = await adminSb
                .from("magazine_likes")
                .select("id", { count: "exact", head: true })
                .eq("article_id", articleId);

            // magazine_articles.likes 동기화
            await adminSb
                .from("magazine_articles")
                .update({ likes: likesCount || 0 })
                .eq("id", articleId);

            return NextResponse.json({ liked, likes: likesCount || 0 });
        }

        return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
