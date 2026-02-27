/**
 * 영상 생성 상태 조회 API
 * GET: 개별 영상 생성 요청의 현재 상태 조회
 *
 * 보안:
 * - 세션 기반 인증 필수
 * - user_id 기반 접근 제어 (본인 요청만 조회 가능)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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
        const { id } = await params;

        // 2. 영상 생성 기록 조회 (본인 요청만)
        const { data, error } = await supabase
            .from("video_generations")
            .select("id, status, video_url, thumbnail_url, error_message, created_at, completed_at")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (error || !data) {
            return NextResponse.json(
                { error: "영상 생성 기록을 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        // 3. snake_case -> camelCase 변환
        return NextResponse.json({
            id: data.id,
            status: data.status,
            videoUrl: data.video_url,
            thumbnailUrl: data.thumbnail_url,
            errorMessage: data.error_message,
            createdAt: data.created_at,
            completedAt: data.completed_at,
        });
    } catch (err) {
        console.error("[Video Status] 서버 오류:", err);
        return NextResponse.json(
            { error: "영상 상태 조회 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
