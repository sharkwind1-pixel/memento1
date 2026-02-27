/**
 * fal.ai 클라이언트 유틸리티
 * Minimax Hailuo 02 image-to-video 생성
 *
 * 서버 사이드에서만 사용 (API Route)
 * FAL_KEY 환경변수 필요
 */

import { fal } from "@fal-ai/client";

// fal.ai 인증 설정
fal.config({
    credentials: process.env.FAL_KEY!,
});

/**
 * 영상 생성 요청을 fal.ai 큐에 제출
 * @param imageUrl - 원본 반려동물 사진 URL
 * @param prompt - 영상 생성 프롬프트
 * @param webhookUrl - 완료 시 콜백 URL
 * @returns fal.ai request_id
 */
export async function submitVideoGeneration(
    imageUrl: string,
    prompt: string,
    webhookUrl: string
): Promise<string> {
    const result = await fal.queue.submit(
        "fal-ai/minimax/video-01-live/image-to-video",
        {
            input: {
                prompt,
                image_url: imageUrl,
            },
            webhookUrl,
        }
    );

    return result.request_id;
}

/**
 * fal.ai 요청 상태 직접 조회 (폴백용)
 * webhook이 실패했을 때 수동으로 상태를 확인
 */
export async function checkVideoStatus(requestId: string) {
    const status = await fal.queue.status(
        "fal-ai/minimax/video-01-live/image-to-video",
        {
            requestId,
            logs: false,
        }
    );

    return status;
}
