/**
 * 영상 생성 상태 조회 API
 * GET: 개별 영상 생성 요청의 현재 상태 조회
 *
 * 보안:
 * - 세션 기반 인증 필수
 * - user_id 기반 접근 제어 (본인 요청만 조회 가능)
 *
 * Webhook 폴백:
 * - DB 상태가 pending/processing이면 fal.ai에 직접 확인
 * - 완료됐으면 영상 다운로드 → Supabase Storage 업로드 → DB 업데이트
 * - webhook이 실패해도 프론트 폴링으로 결과를 받을 수 있음
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { fal } from "@fal-ai/client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function ensureFalConfig() {
    fal.config({ credentials: process.env.FAL_KEY! });
}

function getServiceSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

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
            .select("id, user_id, status, video_url, fal_request_id, thumbnail_url, error_message, created_at, completed_at")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (error || !data) {
            return NextResponse.json(
                { error: "영상 생성 기록을 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        // 3. Webhook 폴백: DB가 아직 pending/processing이면 fal.ai 직접 확인
        if (
            (data.status === "pending" || data.status === "processing") &&
            data.fal_request_id
        ) {
            try {
                ensureFalConfig();
                const falStatus = await fal.queue.status(
                    "fal-ai/minimax/video-01-live/image-to-video",
                    { requestId: data.fal_request_id, logs: false }
                );

                const statusStr = falStatus.status as string;

                if (statusStr === "COMPLETED") {
                    // fal.ai에서 결과 가져오기
                    const falResult = await fal.queue.result(
                        "fal-ai/minimax/video-01-live/image-to-video",
                        { requestId: data.fal_request_id }
                    );

                    const resultData = falResult.data as { video?: { url?: string; content_type?: string } };
                    const falVideoUrl = resultData?.video?.url;

                    if (falVideoUrl) {
                        const serviceSupabase = getServiceSupabase();
                        let finalVideoUrl = falVideoUrl;

                        // Supabase Storage에 업로드 시도
                        try {
                            const videoResponse = await fetch(falVideoUrl);
                            if (videoResponse.ok) {
                                const videoBuffer = await videoResponse.arrayBuffer();
                                const storagePath = `${data.user_id}/${data.id}.mp4`;

                                const { error: uploadError } = await serviceSupabase
                                    .storage
                                    .from("videos")
                                    .upload(storagePath, videoBuffer, {
                                        contentType: resultData?.video?.content_type || "video/mp4",
                                        upsert: true,
                                    });

                                if (!uploadError) {
                                    const { data: publicUrlData } = serviceSupabase
                                        .storage
                                        .from("videos")
                                        .getPublicUrl(storagePath);
                                    finalVideoUrl = publicUrlData.publicUrl;
                                }
                            }
                        } catch {
                            // Storage 업로드 실패해도 fal URL로 진행
                        }

                        // DB 업데이트
                        await serviceSupabase
                            .from("video_generations")
                            .update({
                                status: "completed",
                                video_url: finalVideoUrl,
                                fal_video_url: falVideoUrl,
                                completed_at: new Date().toISOString(),
                            })
                            .eq("id", data.id);

                        return NextResponse.json({
                            id: data.id,
                            status: "completed",
                            videoUrl: finalVideoUrl,
                            thumbnailUrl: data.thumbnail_url,
                            errorMessage: null,
                            createdAt: data.created_at,
                            completedAt: new Date().toISOString(),
                        });
                    }
                } else if (statusStr === "FAILED") {
                    const serviceSupabase = getServiceSupabase();
                    await serviceSupabase
                        .from("video_generations")
                        .update({
                            status: "failed",
                            error_message: "영상 생성에 실패했어요. 다시 시도해주세요.",
                        })
                        .eq("id", data.id);

                    return NextResponse.json({
                        id: data.id,
                        status: "failed",
                        videoUrl: null,
                        thumbnailUrl: null,
                        errorMessage: "영상 생성에 실패했어요. 다시 시도해주세요.",
                        createdAt: data.created_at,
                        completedAt: null,
                    });
                }

                // IN_QUEUE or IN_PROGRESS → DB 상태를 processing으로 업데이트
                if (data.status === "pending" && (statusStr === "IN_PROGRESS" || statusStr === "IN_QUEUE")) {
                    const serviceSupabase = getServiceSupabase();
                    await serviceSupabase
                        .from("video_generations")
                        .update({ status: "processing" })
                        .eq("id", data.id);

                    data.status = "processing";
                }
            } catch (falErr) {
                console.error("[Video Status] fal.ai 폴백 조회 실패:", falErr);
                // fal.ai 조회 실패해도 DB 상태 그대로 반환
            }
        }

        // 4. 현재 DB 상태 반환
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
