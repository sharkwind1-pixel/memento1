/**
 * 커뮤니티 게시글 API
 * GET: 게시글 목록 조회
 * POST: 게시글 작성
 *
 * 보안:
 * - POST 요청 시 세션 기반 인증 필수
 * - 검색어 SQL Injection 방지
 * - Rate Limiting 적용
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase-server";
import { awardPoints } from "@/lib/points";
import {
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
    sanitizeSearchQuery,
    sanitizeInput,
    checkVPN,
    getVPNBlockResponse,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase 환경변수 없음");
    return createClient(url, key);
}

// 게시글 목록 조회
export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabase();
        const { searchParams } = new URL(request.url);

        const boardType = searchParams.get("board") || searchParams.get("subcategory") || "free";
        const animalType = searchParams.get("animal") || searchParams.get("tag");
        const sortBy = searchParams.get("sort") || "latest";
        const search = searchParams.get("search");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = parseInt(searchParams.get("offset") || "0");

        let query = supabase
            .from("community_posts")
            .select("*, post_comments(count)", { count: "exact" })
            .eq("board_type", boardType);

        // 동물 종류 필터
        if (animalType && animalType !== "all") {
            query = query.eq("animal_type", animalType);
        }

        // 검색어 필터 (SQL Injection 방지)
        if (search) {
            const sanitizedSearch = sanitizeSearchQuery(search);
            if (sanitizedSearch) {
                query = query.or(`title.ilike.%${sanitizedSearch}%,content.ilike.%${sanitizedSearch}%`);
            }
        }

        // 정렬
        if (sortBy === "popular") {
            query = query.order("likes", { ascending: false });
        } else if (sortBy === "comments") {
            query = query.order("created_at", { ascending: false }); // TODO: 댓글 수 정렬
        } else {
            query = query.order("created_at", { ascending: false });
        }

        // 페이지네이션
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 댓글 수 계산 (신규/레거시 컬럼 모두 지원)
        const posts = (data || []).map(post => ({
            id: post.id,
            userId: post.user_id,
            boardType: post.board_type || post.category || "free",
            animalType: post.animal_type,
            badge: post.badge || "",
            title: post.title,
            content: post.content,
            authorName: post.author_name,
            likes: post.likes ?? post.likes_count ?? 0,
            views: post.views ?? 0,
            comments: post.post_comments?.[0]?.count || (post.comments ?? post.comments_count ?? 0),
            createdAt: post.created_at,
        }));

        return NextResponse.json({ posts, total: count });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// 게시글 작성
export async function POST(request: NextRequest) {
    try {
        // 1. Rate Limiting (스팸 방지)
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "게시글 작성이 너무 빠릅니다. 잠시 후 다시 시도해주세요." },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn),
                }
            );
        }

        // 1.5. VPN/프록시 감지 (게시글 작성은 VPN 차단)
        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            console.warn(`[Security] VPN blocked (post): ${clientIP} - ${vpnCheck.reason}`);
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 2. 인증 확인 (세션 기반 - 타인 명의 글 작성 방지)
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const supabase = getSupabase();
        const body = await request.json();

        const { boardType: rawBoardType, subcategory, animalType, tag, badge, title, content, authorName } = body;
        const boardType = rawBoardType || subcategory || "free";

        // 3. 필수 필드 검증
        if (!boardType || !badge || !title || !content || !authorName) {
            return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
        }

        // 4. 입력값 검증 및 Sanitize
        const sanitizedTitle = sanitizeInput(title).slice(0, 200); // 제목 200자 제한
        const sanitizedContent = sanitizeInput(content).slice(0, 10000); // 내용 10000자 제한
        const sanitizedAuthorName = sanitizeInput(authorName).slice(0, 50);

        if (!sanitizedTitle || !sanitizedContent) {
            return NextResponse.json({ error: "유효하지 않은 입력입니다." }, { status: 400 });
        }

        // 5. 게시글 저장 (세션에서 가져온 userId 사용)
        const { data, error } = await supabase
            .from("community_posts")
            .insert([{
                user_id: user.id, // 세션에서 가져온 userId 사용 (보안!)
                board_type: boardType,
                category: boardType, // 레거시 호환
                animal_type: animalType || tag || null,
                badge,
                title: sanitizedTitle,
                content: sanitizedContent,
                author_name: sanitizedAuthorName,
            }])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 6. 포인트 적립 (게시글 작성 +10P, 실패해도 게시글은 정상 반환)
        try {
            await awardPoints(supabase, user.id, "write_post", { postId: data.id });
        } catch {
            // 포인트 적립 실패 무시
        }

        return NextResponse.json({ post: data, pointsEarned: 10 });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
