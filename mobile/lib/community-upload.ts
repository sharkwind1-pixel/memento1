/**
 * 커뮤니티 이미지 업로드 — 웹 src/lib/storage.ts uploadCommunityImage 모바일 이식.
 *
 * 흐름: ImagePicker 결과 URI → fetch → arrayBuffer → Supabase Storage
 * (pet-media 버킷, community/{userId}/... 경로) → public URL 반환.
 *
 * 게시글 작성은 multipart 미지원 (서버 request.json()) → 업로드 후 URL 배열을
 * imageUrls 필드로 JSON POST 해야 한다.
 */

import { supabase } from "@/lib/supabase";

export interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
}

const BUCKET = "pet-media";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

function pickMime(uri: string, fallbackType?: string): { mime: string; ext: string } {
    if (fallbackType && fallbackType.startsWith("image/")) {
        const ext = fallbackType.split("/")[1] || "jpg";
        return { mime: fallbackType, ext };
    }
    const last = (uri.split(".").pop() ?? "jpg").toLowerCase().split("?")[0];
    switch (last) {
        case "jpg":
        case "jpeg": return { mime: "image/jpeg", ext: "jpg" };
        case "png":  return { mime: "image/png",  ext: "png" };
        case "gif":  return { mime: "image/gif",  ext: "gif" };
        case "webp": return { mime: "image/webp", ext: "webp" };
        case "heic": return { mime: "image/heic", ext: "heic" };
        case "heif": return { mime: "image/heif", ext: "heif" };
        default:     return { mime: "image/jpeg", ext: "jpg" };
    }
}

/**
 * 통합 업로더 — pet-media 버킷의 prefix별 디렉토리에 업로드.
 * 웹 src/lib/storage.ts uploadImage(file, userId, pathPrefix) 패턴 매칭.
 */
async function uploadToStorage(
    uri: string,
    userId: string,
    prefix: string,
    options?: { mimeType?: string },
): Promise<UploadResult> {
    try {
        const response = await fetch(uri);
        if (!response.ok) {
            return { success: false, error: `이미지 로드 실패 (HTTP ${response.status})` };
        }
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_BYTES) {
            return { success: false, error: `이미지 크기가 ${MAX_BYTES / 1024 / 1024}MB를 초과합니다` };
        }

        const { mime, ext } = pickMime(uri, options?.mimeType);
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const path = `${prefix}/${userId}/${timestamp}-${randomId}.${ext}`;

        const { data, error } = await supabase.storage
            .from(BUCKET)
            .upload(path, new Uint8Array(arrayBuffer), {
                cacheControl: "31536000",
                upsert: false,
                contentType: mime,
            });

        if (error) {
            return { success: false, error: error.message };
        }

        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(data.path);

        return { success: true, url: publicUrl, path: data.path };
    } catch (e) {
        return {
            success: false,
            error: e instanceof Error ? e.message : "이미지 업로드 실패",
        };
    }
}

export async function uploadCommunityPostImage(
    uri: string,
    userId: string,
    options?: { mimeType?: string },
): Promise<UploadResult> {
    return uploadToStorage(uri, userId, "community", options);
}

/** 분실/발견 동물 게시글 이미지 (웹 uploadLostPetImage 매칭, prefix=lost-pets) */
export async function uploadLostPetImage(
    uri: string,
    userId: string,
    options?: { mimeType?: string },
): Promise<UploadResult> {
    return uploadToStorage(uri, userId, "lost-pets", options);
}

/** 지역정보 게시글 이미지 (웹 uploadLocalPostImage 매칭, prefix=local-posts) */
export async function uploadLocalPostImage(
    uri: string,
    userId: string,
    options?: { mimeType?: string },
): Promise<UploadResult> {
    return uploadToStorage(uri, userId, "local-posts", options);
}
