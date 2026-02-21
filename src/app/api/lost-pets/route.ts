/**
 * 분실/발견 동물 API
 * GET: 게시글 목록 조회 (페이지네이션, 필터)
 * POST: 게시글 작성
 *
 * 보안:
 * - POST 요청 시 세션 기반 인증 필수
 * - 검색어 SQL Injection 방지
 * - Rate Limiting 적용
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
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

// 분실/발견 동물 목록 조회
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabase();
        const { searchParams } = new URL(request.url);

        const type = searchParams.get("type") || "all";           // lost / found / all
        const petType = searchParams.get("petType") || "all";     // 강아지 / 고양이 / 기타 / all
        const region = searchParams.get("region");                 // 시/도
        const district = searchParams.get("district");             // 구/군
        const search = searchParams.get("search");                 // 검색어
        const page = parseInt(searchParams.get("page") || "1");
        const size = parseInt(searchParams.get("size") || "20");
        const offset = (page - 1) * size;

        let query = supabase
            .from("lost_pets")
            .select("*", { count: "exact" })
            .eq("status", "active");

        // 타입 필터 (실종/발견)
        if (type && type !== "all") {
            query = query.eq("type", type);
        }

        // 동물 종류 필터
        if (petType && petType !== "all") {
            query = query.eq("pet_type", petType);
        }

        // 지역 필터
        if (region && region !== "all") {
            query = query.eq("region", region);
        }

        // 구/군 필터
        if (district) {
            query = query.eq("district", district);
        }

        // 검색어 필터 (SQL Injection 방지)
        if (search) {
            const sanitizedSearch = sanitizeSearchQuery(search);
            if (sanitizedSearch) {
                query = query.or(
                    `title.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%,breed.ilike.%${sanitizedSearch}%,location_detail.ilike.%${sanitizedSearch}%`
                );
            }
        }

        // 정렬: 최신순
        query = query.order("created_at", { ascending: false });

        // 페이지네이션
        query = query.range(offset, offset + size - 1);

        const { data, error, count } = await query;

        if (error) {
            console.error("[Lost Pets GET] 조회 에러:", error);
            return NextResponse.json({ error: "게시글 처리 중 오류가 발생했습니다" }, { status: 500 });
        }

        // snake_case -> camelCase 변환
        const posts = (data || []).map(post => ({
            id: post.id,
            userId: post.user_id,
            type: post.type,
            title: post.title,
            petType: post.pet_type,
            breed: post.breed,
            color: post.color,
            gender: post.gender,
            age: post.age,
            region: post.region,
            district: post.district,
            locationDetail: post.location_detail,
            date: post.date,
            description: post.description,
            contact: post.contact,
            reward: post.reward,
            imageUrl: post.image_url,
            imageStoragePath: post.image_storage_path,
            views: post.views ?? 0,
            status: post.status,
            createdAt: post.created_at,
            updatedAt: post.updated_at,
        }));

        return NextResponse.json({
            posts,
            total: count,
            page,
            size,
            totalPages: count ? Math.ceil(count / size) : 0,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// 분실/발견 동물 게시글 작성
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
            console.warn(`[Security] VPN blocked (lost-pets post): ${clientIP} - ${vpnCheck.reason}`);
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 3. 인증 확인 (세션 기반)
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const supabase = await createServerSupabase();
        const body = await request.json();

        const {
            type,
            title,
            petType,
            breed,
            color,
            gender,
            age,
            region,
            district,
            locationDetail,
            date,
            description,
            contact,
            reward,
            imageUrl,
            imageStoragePath,
        } = body;

        // 4. 필수 필드 검증
        if (!type || !title || !petType || !date) {
            return NextResponse.json(
                { error: "필수 항목이 누락되었습니다. (유형, 제목, 동물종류, 날짜)" },
                { status: 400 }
            );
        }

        // type 검증
        if (!["lost", "found"].includes(type)) {
            return NextResponse.json(
                { error: "유형은 'lost' 또는 'found'만 가능합니다." },
                { status: 400 }
            );
        }

        // 5. 입력값 검증 및 Sanitize
        const sanitizedTitle = sanitizeInput(title).slice(0, 200);
        const sanitizedDescription = description ? sanitizeInput(description).slice(0, 5000) : null;
        const sanitizedBreed = breed ? sanitizeInput(breed).slice(0, 100) : null;
        const sanitizedColor = color ? sanitizeInput(color).slice(0, 100) : null;
        const sanitizedGender = gender ? sanitizeInput(gender).slice(0, 20) : null;
        const sanitizedAge = age ? sanitizeInput(age).slice(0, 50) : null;
        const sanitizedRegion = region ? sanitizeInput(region).slice(0, 50) : null;
        const sanitizedDistrict = district ? sanitizeInput(district).slice(0, 50) : null;
        const sanitizedLocationDetail = locationDetail ? sanitizeInput(locationDetail).slice(0, 500) : null;
        const sanitizedContact = contact ? sanitizeInput(contact).slice(0, 100) : null;
        const sanitizedReward = reward ? sanitizeInput(reward).slice(0, 100) : null;

        if (!sanitizedTitle) {
            return NextResponse.json({ error: "유효하지 않은 제목입니다." }, { status: 400 });
        }

        // 6. 이미지 URL 검증
        const validImageUrl = typeof imageUrl === "string" && imageUrl.startsWith("http")
            ? imageUrl
            : null;

        // 7. 게시글 저장
        const { data, error } = await supabase
            .from("lost_pets")
            .insert([{
                user_id: user.id,
                type,
                title: sanitizedTitle,
                pet_type: petType,
                breed: sanitizedBreed,
                color: sanitizedColor,
                gender: sanitizedGender,
                age: sanitizedAge,
                region: sanitizedRegion,
                district: sanitizedDistrict,
                location_detail: sanitizedLocationDetail,
                date,
                description: sanitizedDescription,
                contact: sanitizedContact,
                reward: sanitizedReward,
                image_url: validImageUrl,
                image_storage_path: imageStoragePath || null,
            }])
            .select()
            .single();

        if (error) {
            console.error("[Lost Pets POST] 작성 에러:", error);
            return NextResponse.json({ error: "게시글 처리 중 오류가 발생했습니다" }, { status: 500 });
        }

        return NextResponse.json({
            post: {
                id: data.id,
                userId: data.user_id,
                type: data.type,
                title: data.title,
                petType: data.pet_type,
                breed: data.breed,
                color: data.color,
                gender: data.gender,
                age: data.age,
                region: data.region,
                district: data.district,
                locationDetail: data.location_detail,
                date: data.date,
                description: data.description,
                contact: data.contact,
                reward: data.reward,
                imageUrl: data.image_url,
                imageStoragePath: data.image_storage_path,
                views: data.views,
                status: data.status,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            },
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
