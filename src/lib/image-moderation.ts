/**
 * 이미지 콘텐츠 모더레이션
 * GPT-4o-mini Vision으로 업로드 이미지가 반려동물인지 검증
 *
 * 사용처:
 * - 펫 프로필 사진 업로드
 * - 펫 앨범 사진 업로드
 * - AI 영상 생성 원본 사진
 *
 * 비용: 이미지당 ~$0.0001 (GPT-4o-mini vision, 사실상 무료)
 * 실패 시 통과 (fail-open) — 모더레이션 실패가 업로드 자체를 막으면 안 됨
 */

import OpenAI from "openai";

export interface ModerationResult {
    allowed: boolean;
    reason?: string;
    confidence?: "high" | "medium" | "low";
}

/**
 * 이미지 URL 또는 base64를 GPT-4o-mini Vision으로 검증
 * @param imageUrl - 이미지 URL (Supabase Storage public URL 등)
 * @param imageBase64 - 또는 base64 인코딩 이미지 (data:image/... 형식)
 * @returns 허용 여부 + 이유
 */
export async function moderateImage(
    imageUrl?: string,
    imageBase64?: string,
): Promise<ModerationResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        // API 키 없으면 통과 (fail-open)
        return { allowed: true, reason: "OPENAI_API_KEY_MISSING" };
    }

    if (!imageUrl && !imageBase64) {
        return { allowed: true, reason: "no_image_provided" };
    }

    try {
        const openai = new OpenAI({ apiKey });

        const imageContent: OpenAI.ChatCompletionContentPart = imageUrl
            ? { type: "image_url", image_url: { url: imageUrl, detail: "low" } }
            : { type: "image_url", image_url: { url: imageBase64!, detail: "low" } };

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 100,
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: `당신은 반려동물 서비스의 이미지 검증 시스템입니다.
업로드된 이미지가 반려동물(강아지, 고양이, 새, 햄스터, 토끼, 파충류, 물고기, 거북이 등 모든 동물)과 관련된 사진인지 판별합니다.

허용:
- 반려동물 사진 (어떤 종이든)
- 반려동물과 사람이 함께 있는 사진
- 반려동물 관련 용품/사료/장난감 사진
- 동물 일러스트/그림

거부:
- 사람만 있는 사진 (셀카, 인물 사진)
- 음식, 풍경, 건물 등 동물과 무관한 사진
- 부적절하거나 폭력적인 이미지
- 텍스트/밈/스크린샷

반드시 JSON으로 응답: {"allowed": true/false, "reason": "한 줄 이유"}`,
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "이 이미지를 반려동물 서비스에 업로드해도 되나요?" },
                        imageContent,
                    ],
                },
            ],
        });

        const text = response.choices[0]?.message?.content?.trim() || "";

        // JSON 파싱 시도
        try {
            // ```json ... ``` 감싸기 대응
            const jsonStr = text.replace(/```json\s*|\s*```/g, "").trim();
            const parsed = JSON.parse(jsonStr) as { allowed?: boolean; reason?: string };
            return {
                allowed: parsed.allowed !== false,
                reason: parsed.reason || undefined,
                confidence: "high",
            };
        } catch {
            // JSON 파싱 실패 시 텍스트 기반 판단
            const lower = text.toLowerCase();
            if (lower.includes('"allowed": false') || lower.includes('"allowed":false')) {
                return { allowed: false, reason: "반려동물과 관련 없는 이미지입니다.", confidence: "medium" };
            }
            // 파싱 실패 시 통과 (fail-open)
            return { allowed: true, reason: "parse_fallback", confidence: "low" };
        }
    } catch (err) {
        // API 호출 실패 시 통과 (fail-open)
        console.error("[image-moderation] error:", err instanceof Error ? err.message : err);
        return { allowed: true, reason: "api_error" };
    }
}

/**
 * 클라이언트에서 전송한 File을 base64로 변환 후 검증
 * 서버 사이드 API 라우트에서 사용
 */
export async function moderateImageBuffer(
    buffer: Buffer,
    mimeType: string = "image/jpeg",
): Promise<ModerationResult> {
    const base64 = `data:${mimeType};base64,${buffer.toString("base64")}`;
    return moderateImage(undefined, base64);
}
