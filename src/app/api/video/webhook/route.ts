/**
 * fal.ai 영상 생성 Webhook 수신 API
 * POST: fal.ai에서 영상 생성 완료/실패 시 콜백
 *
 * 보안:
 * - VIDEO_WEBHOOK_SECRET 쿼리 파라미터 검증
 * - Service Role Supabase 사용 (사용자 인증 불필요)
 *
 * fal.ai webhook payload 구조:
 * - 성공: { status: "OK", request_id, payload: { video: { url, content_type, file_name, file_size } } }
 * - 실패: { status: "ERROR", request_id, error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export async function POST(request: NextRequest) {
    try {
        // 1. Webhook Secret 검증
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get("secret");

        if (!secret || secret !== process.env.VIDEO_WEBHOOK_SECRET) {
            console.warn("[Video Webhook] 인증 실패: 잘못된 secret");
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const supabase = getServiceSupabase();
        const body = await request.json();

        const { request_id, status, payload, error } = body;

        if (!request_id) {
            console.warn("[Video Webhook] request_id 누락");
            return NextResponse.json(
                { error: "request_id가 필요합니다." },
                { status: 400 }
            );
        }

        // 2. DB에서 해당 요청 조회
        const { data: generation, error: fetchError } = await supabase
            .from("video_generations")
            .select("id, user_id, status")
            .eq("fal_request_id", request_id)
            .single();

        if (fetchError || !generation) {
            console.warn(`[Video Webhook] 요청을 찾을 수 없음: ${request_id}`);
            return NextResponse.json(
                { error: "해당 요청을 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        // 이미 처리된 요청은 무시 (중복 webhook 방지)
        if (generation.status === "completed" || generation.status === "failed") {
            return NextResponse.json({ ok: true, message: "이미 처리된 요청입니다." });
        }

        // 3. 성공/실패 분기 처리
        if (status === "OK" && payload?.video?.url) {
            // 3-1. 성공: fal.ai에서 영상 다운로드 후 Supabase Storage에 업로드
            const falVideoUrl = payload.video.url;

            try {
                // fal.ai 영상 다운로드
                const videoResponse = await fetch(falVideoUrl);
                if (!videoResponse.ok) {
                    throw new Error(`영상 다운로드 실패: ${videoResponse.status}`);
                }

                const videoBuffer = await videoResponse.arrayBuffer();
                const storagePath = `${generation.user_id}/${generation.id}.mp4`;

                // Supabase Storage에 업로드
                const { error: uploadError } = await supabase
                    .storage
                    .from("videos")
                    .upload(storagePath, videoBuffer, {
                        contentType: payload.video.content_type || "video/mp4",
                        upsert: true,
                    });

                if (uploadError) {
                    console.error("[Video Webhook] Storage 업로드 에러:", uploadError);
                    throw new Error(`Storage 업로드 실패: ${uploadError.message}`);
                }

                // Public URL 생성
                const { data: publicUrlData } = supabase
                    .storage
                    .from("videos")
                    .getPublicUrl(storagePath);

                const videoUrl = publicUrlData.publicUrl;

                // DB 업데이트: 완료 상태
                const { error: updateError } = await supabase
                    .from("video_generations")
                    .update({
                        status: "completed",
                        video_url: videoUrl,
                        fal_video_url: falVideoUrl,
                        completed_at: new Date().toISOString(),
                    })
                    .eq("id", generation.id);

                if (updateError) {
                    console.error("[Video Webhook] DB 업데이트 에러:", updateError);
                }

            } catch (downloadErr) {
                // 다운로드/업로드 실패 시에도 fal URL은 저장
                console.error("[Video Webhook] 영상 처리 에러:", downloadErr);

                await supabase
                    .from("video_generations")
                    .update({
                        status: "completed",
                        video_url: falVideoUrl,
                        fal_video_url: falVideoUrl,
                        completed_at: new Date().toISOString(),
                    })
                    .eq("id", generation.id);
            }

        } else {
            // 3-2. 실패: 에러 메시지 저장
            const errorMessage = typeof error === "string"
                ? error
                : (error?.message || "알 수 없는 오류가 발생했습니다.");

            const { error: updateError } = await supabase
                .from("video_generations")
                .update({
                    status: "failed",
                    error_message: errorMessage,
                })
                .eq("id", generation.id);

            if (updateError) {
                console.error("[Video Webhook] 실패 상태 업데이트 에러:", updateError);
            }
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[Video Webhook] 서버 오류:", err);
        return NextResponse.json(
            { error: "Webhook 처리 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
