/**
 * 영상 생성 목록 조회 API
 * GET: 사용자의 영상 생성 기록 목록 조회 (페이지네이션, 펫 필터)
 *
 * 보안:
 * - 세션 기반 인증 필수
 * - user_id 기반 접근 제어 (본인 기록만 조회)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        // 1. 인증 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const supabase = await createServerSupabase();
        const { searchParams } = new URL(request.url);

        const petId = searchParams.get("petId");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = parseInt(searchParams.get("offset") || "0");

        // 2. 쿼리 구성
        let query = supabase
            .from("video_generations")
            .select("*", { count: "exact" })
            .eq("user_id", user.id);

        // 펫 필터 (선택)
        if (petId) {
            query = query.eq("pet_id", petId);
        }

        // 정렬: 최신순
        query = query.order("created_at", { ascending: false });

        // 페이지네이션
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            console.error("[Video List] 조회 에러:", error);
            return NextResponse.json(
                { error: "영상 목록 조회 중 오류가 발생했습니다." },
                { status: 500 }
            );
        }

        // 3. snake_case -> camelCase 변환
        const videos = (data || []).map(row => ({
            id: row.id,
            userId: row.user_id,
            petId: row.pet_id,
            petName: row.pet_name,
            sourcePhotoUrl: row.source_photo_url,
            templateId: row.template_id,
            customPrompt: row.custom_prompt,
            status: row.status,
            videoUrl: row.video_url,
            thumbnailUrl: row.thumbnail_url,
            falVideoUrl: row.fal_video_url,
            falRequestId: row.fal_request_id,
            errorMessage: row.error_message,
            createdAt: row.created_at,
            completedAt: row.completed_at,
        }));

        return NextResponse.json({
            videos,
            total: count ?? 0,
        });
    } catch (err) {
        console.error("[Video List] 서버 오류:", err);
        return NextResponse.json(
            { error: "영상 목록 조회 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
