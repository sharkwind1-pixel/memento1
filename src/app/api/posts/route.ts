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
import { createServerSupabase, createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
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

// 게시글 목록 조회
export async function GET(request: NextRequest) {
    try {
        // Rate Limit 체크
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "general");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요" },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const supabase = await createServerSupabase();
        const { searchParams } = new URL(request.url);

        const boardType = searchParams.get("board") || searchParams.get("subcategory") || "free";
        const animalType = searchParams.get("animal") || searchParams.get("tag");
        const badge = searchParams.get("badge");
        const excludeBadge = searchParams.get("exclude_badge");
        const sortBy = searchParams.get("sort") || "latest";
        const search = searchParams.get("search");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = parseInt(searchParams.get("offset") || "0");

        // 차단된 유저 목록 조회 (로그인 시)
        let blockedUserIds: string[] = [];
        const currentUser = await getAuthUser().catch(() => null);
        if (currentUser) {
            const { data: blocks } = await supabase
                .from("user_blocks")
                .select("blocked_user_id")
                .eq("blocker_id", currentUser.id);
            if (blocks && blocks.length > 0) {
                blockedUserIds = blocks.map(b => b.blocked_user_id);
            }
        }

        let query = supabase
            .from("community_posts")
            .select("*, post_comments(count)", { count: "exact" })
            .eq("board_type", boardType)
            .or("is_hidden.is.null,is_hidden.eq.false");

        // 뱃지 필터
        if (badge) {
            query = query.eq("badge", badge);
        }

        // 뱃지 제외 필터 (자유게시판에서 자랑 게시글 숨기기용)
        if (excludeBadge) {
            query = query.neq("badge", excludeBadge);
        }

        // 동물 종류 필터
        if (animalType && animalType !== "all") {
            query = query.eq("animal_type", animalType);
        }

        // 지역 필터 (지역정보 게시판)
        const region = searchParams.get("region");
        if (region && region !== "all") {
            query = query.eq("region", region);
        }

        // 검색어 필터 (SQL Injection 방지)
        if (search) {
            const sanitizedSearch = sanitizeSearchQuery(search);
            if (sanitizedSearch) {
                query = query.or(`title.ilike.%${sanitizedSearch}%,content.ilike.%${sanitizedSearch}%`);
            }
        }

        // 차단된 유저의 게시글 제외
        if (blockedUserIds.length > 0) {
            // Supabase에서 NOT IN은 .not("user_id", "in", (...)) 사용
            query = query.not("user_id", "in", `(${blockedUserIds.join(",")})`);
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
            console.error("[Posts GET] 조회 에러:", error);
            return NextResponse.json({ error: "게시글 처리 중 오류가 발생했습니다" }, { status: 500 });
        }

        // 작성자 미니미 slug 일괄 조회 (미니홈피 아바타 표시용)
        // RLS 우회를 위해 admin 클라이언트 사용 (profiles/user_minimi는 auth.uid()=id 정책)
        const userIds = Array.from(new Set((data || []).map(p => p.user_id).filter(Boolean)));
        let userIdToMinimiSlug: Record<string, string> = {};
        if (userIds.length > 0) {
            try {
                const adminSupabase = createAdminSupabase();
                const { data: profileRows } = await adminSupabase
                    .from("profiles")
                    .select("id, equipped_minimi_id")
                    .in("id", userIds);
                const minimiUuids = (profileRows || [])
                    .map(p => p.equipped_minimi_id)
                    .filter(Boolean) as string[];
                if (minimiUuids.length > 0) {
                    const { data: minimiRows } = await adminSupabase
                        .from("user_minimi")
                        .select("id, minimi_id")
                        .in("id", minimiUuids);
                    const uuidToSlug = Object.fromEntries(
                        (minimiRows || []).map(m => [m.id, m.minimi_id])
                    );
                    for (const p of (profileRows || [])) {
                        if (p.equipped_minimi_id && uuidToSlug[p.equipped_minimi_id]) {
                            userIdToMinimiSlug[p.id] = uuidToSlug[p.equipped_minimi_id];
                        }
                    }
                }
            } catch {
                // 미니미 조회 실패 시 무시 (게시글은 정상 반환)
            }
        }

        // 댓글 수 계산
        // DB 실제 컬럼: id, user_id, board_type, animal_type, badge, title, content,
        //               author_name, likes, views, created_at, updated_at, video_url
        const posts = (data || []).map(post => ({
            id: post.id,
            userId: post.user_id,
            boardType: post.board_type || "free",
            animalType: post.animal_type,
            badge: post.badge || "",
            title: post.title,
            content: post.content,
            authorName: post.author_name,
            likes: post.likes ?? 0,
            views: post.views ?? 0,
            comments: post.post_comments?.[0]?.count ?? 0,
            imageUrls: [],
            videoUrl: post.video_url || null,
            region: post.region || null,
            authorMinimiSlug: userIdToMinimiSlug[post.user_id] || null,
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
                { error: "로그인이 필요합니다" },
                { status: 401 }
            );
        }

        const supabase = await createServerSupabase();
        const body = await request.json();

        const { boardType: rawBoardType, subcategory, animalType, tag, badge, title, content, authorName, imageUrls, videoUrl, isPublic, region } = body;
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
            return NextResponse.json({ error: "유효하지 않은 입력입니다" }, { status: 400 });
        }

        // 5. 이미지 URL 검증 (최대 5개, URL 형식)
        const validImageUrls = Array.isArray(imageUrls)
            ? imageUrls.filter((url: string) => typeof url === "string" && url.startsWith("http")).slice(0, 5)
            : [];

        // 5.5. 영상 URL 검증 (단일 URL, "자랑하기"에서 AI 영상 공유 시 사용)
        const validVideoUrl = typeof videoUrl === "string" && videoUrl.startsWith("http")
            ? videoUrl
            : null;

        // 6. 게시글 저장 (세션에서 가져온 userId 사용)
        // DB 실제 컬럼: id, user_id, board_type, animal_type, badge, title, content,
        //               author_name, likes, views, created_at, updated_at, video_url
        const { data, error } = await supabase
            .from("community_posts")
            .insert([{
                user_id: user.id,
                board_type: boardType,
                animal_type: animalType || tag || null,
                badge,
                title: sanitizedTitle,
                content: sanitizedContent,
                author_name: sanitizedAuthorName,
                ...(validVideoUrl && { video_url: validVideoUrl }),
                ...(boardType === "local" && region ? { region: sanitizeInput(region).slice(0, 20) } : {}),
            }])
            .select()
            .single();

        if (error) {
            console.error("[Posts POST] 작성 에러:", error);
            return NextResponse.json({ error: "게시글 처리 중 오류가 발생했습니다" }, { status: 500 });
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
