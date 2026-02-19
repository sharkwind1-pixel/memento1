/**
 * 지역정보 게시판 API - 목록 조회 및 게시글 작성
 * GET: 페이지네이션 + 필터 (category, region, district, search)
 * POST: 새 게시글 작성 (인증 필요)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase-server";
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

/** snake_case -> camelCase 변환 */
function toCamelCase(post: Record<string, unknown>) {
    return {
        id: post.id,
        userId: post.user_id,
        category: post.category,
        title: post.title,
        content: post.content,
        region: post.region,
        district: post.district,
        badge: post.badge,
        imageUrl: post.image_url,
        imageStoragePath: post.image_storage_path,
        likesCount: post.likes_count,
        commentsCount: post.comments_count,
        views: post.views,
        status: post.status,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
    };
}

/** GET - 게시글 목록 조회 (페이지네이션 + 필터) */
export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabase();
        const { searchParams } = new URL(request.url);

        const category = searchParams.get("category");
        const region = searchParams.get("region");
        const district = searchParams.get("district");
        const search = searchParams.get("search");
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const size = Math.min(50, Math.max(1, parseInt(searchParams.get("size") || "20")));

        const from = (page - 1) * size;
        const to = from + size - 1;

        let query = supabase
            .from("local_posts")
            .select("*", { count: "exact" })
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .range(from, to);

        if (category) {
            query = query.eq("category", category);
        }
        if (region) {
            query = query.eq("region", region);
        }
        if (district) {
            query = query.eq("district", district);
        }
        if (search) {
            const sanitizedSearch = sanitizeSearchQuery(search);
            if (sanitizedSearch) {
                query = query.or(
                    `title.ilike.%${sanitizedSearch}%,content.ilike.%${sanitizedSearch}%`
                );
            }
        }

        const { data, error, count } = await query;

        if (error) {
            return NextResponse.json(
                { error: "게시글 조회 실패", details: error.message },
                { status: 500 }
            );
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / size);

        return NextResponse.json({
            posts: (data || []).map(toCamelCase),
            total,
            page,
            size,
            totalPages,
        });
    } catch (err) {
        return NextResponse.json(
            { error: "서버 오류", details: err instanceof Error ? err.message : "알 수 없는 오류" },
            { status: 500 }
        );
    }
}

/** POST - 새 게시글 작성 */
export async function POST(request: NextRequest) {
    try {
        // 1. Rate Limiting
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

        // 2. VPN/프록시 감지
        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 3. 인증 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const supabase = getSupabase();
        const body = await request.json();

        const { title, content, category, region, district, badge, imageUrl, imageStoragePath } = body;

        // 4. 필수 필드 검증
        if (!title || !category) {
            return NextResponse.json(
                { error: "제목과 카테고리는 필수입니다." },
                { status: 400 }
            );
        }

        // 카테고리 유효성 검증
        const validCategories = ["hospital", "walk", "share", "trade", "meet", "place"];
        if (!validCategories.includes(category)) {
            return NextResponse.json(
                { error: "유효하지 않은 카테고리입니다." },
                { status: 400 }
            );
        }

        // 뱃지 유효성 검증
        const validBadges = ["질문", "모집중", "나눔", "판매", "후기", "정보", "기타"];
        if (badge && !validBadges.includes(badge)) {
            return NextResponse.json(
                { error: "유효하지 않은 뱃지입니다." },
                { status: 400 }
            );
        }

        // 5. 입력값 sanitize
        const sanitizedTitle = sanitizeInput(title).slice(0, 200);
        const sanitizedContent = content ? sanitizeInput(content).slice(0, 5000) : null;
        const sanitizedRegion = region ? sanitizeInput(region).slice(0, 50) : null;
        const sanitizedDistrict = district ? sanitizeInput(district).slice(0, 50) : null;

        if (!sanitizedTitle) {
            return NextResponse.json({ error: "유효하지 않은 제목입니다." }, { status: 400 });
        }

        // 6. 이미지 URL 검증
        const validImageUrl = typeof imageUrl === "string" && imageUrl.startsWith("http")
            ? imageUrl
            : null;
        const validStoragePath = typeof imageStoragePath === "string"
            ? imageStoragePath
            : null;

        // 7. DB 삽입
        const { data, error } = await supabase
            .from("local_posts")
            .insert({
                user_id: user.id,
                category,
                title: sanitizedTitle,
                content: sanitizedContent,
                region: sanitizedRegion,
                district: sanitizedDistrict,
                badge: badge || null,
                image_url: validImageUrl,
                image_storage_path: validStoragePath,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { error: "게시글 작성 실패", details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { post: toCamelCase(data) },
            {
                status: 201,
                headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn),
            }
        );
    } catch (err) {
        return NextResponse.json(
            { error: "서버 오류", details: err instanceof Error ? err.message : "알 수 없는 오류" },
            { status: 500 }
        );
    }
}
