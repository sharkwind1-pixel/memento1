/**
 * fal.ai 클라이언트 유틸리티
 * Veo 3.1 Fast image-to-video 생성 (8초, 1080p, 오디오 없음)
 *
 * 서버 사이드에서만 사용 (API Route)
 * FAL_KEY 환경변수 필요
 *
 * 비용: $0.10/초 × 8초 = $0.80/건 (약 1,100원)
 */

import { fal } from "@fal-ai/client";

const MODEL_ID = "fal-ai/veo3.1/fast/image-to-video";

/**
 * fal.ai 클라이언트 초기화 (호출 시점에 환경변수 보장)
 */
function ensureFalConfig() {
    fal.config({
        credentials: process.env.FAL_KEY!,
    });
}

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
    ensureFalConfig();

    const result = await fal.queue.submit(
        MODEL_ID,
        {
            input: {
                prompt,
                image_url: imageUrl,
                duration: "8s",
                resolution: "1080p",
                aspect_ratio: "9:16",
                generate_audio: false,
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
    ensureFalConfig();
    const status = await fal.queue.status(
        MODEL_ID,
        {
            requestId,
            logs: false,
        }
    );

    return status;
}
