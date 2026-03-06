/**
 * Supabase Storage 미디어 업로드 유틸리티
 * 사진과 영상을 Supabase Storage에 업로드하고 관리
 */

import { supabase } from "./supabase";

// 지원하는 미디어 타입
export type MediaType = "image" | "video";

export interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
}

// 허용된 파일 확장자 화이트리스트 (보안)
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"];
const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "m4v"];
const ALLOWED_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_VIDEO_EXTENSIONS];

// 허용된 MIME 타입 (보안)
const ALLOWED_IMAGE_MIMES = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "image/heic", "image/heif"
];
const ALLOWED_VIDEO_MIMES = [
    "video/mp4", "video/quicktime", "video/webm", "video/x-m4v"
];
const ALLOWED_MIMES = [...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES];

// 파일 확장자로 미디어 타입 결정
export function getMediaType(filename: string): MediaType {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    return ALLOWED_VIDEO_EXTENSIONS.includes(ext) ? "video" : "image";
}

// 파일 확장자 검증
function validateExtension(filename: string): { valid: boolean; ext: string; error?: string } {
    const ext = filename.split(".").pop()?.toLowerCase() || "";

    // 이중 확장자 방지 (예: image.jpg.exe)
    const parts = filename.split(".");
    if (parts.length > 2) {
        const secondLast = parts[parts.length - 2]?.toLowerCase();
        if (ALLOWED_EXTENSIONS.includes(secondLast)) {
            return { valid: false, ext, error: "잘못된 파일 형식입니다." };
        }
    }

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return { valid: false, ext, error: `지원하지 않는 파일 형식입니다. (${ALLOWED_EXTENSIONS.join(", ")})` };
    }

    return { valid: true, ext };
}

// MIME 타입 검증
function validateMimeType(file: File, expectedType: MediaType): { valid: boolean; error?: string } {
    const mime = file.type.toLowerCase();

    // MIME 타입이 없으면 거부
    if (!mime) {
        return { valid: false, error: "파일 형식을 확인할 수 없습니다." };
    }

    // 허용 목록에 없으면 거부
    if (!ALLOWED_MIMES.includes(mime)) {
        return { valid: false, error: "지원하지 않는 파일 형식입니다." };
    }

    // 확장자와 MIME 타입 일관성 검증
    if (expectedType === "image" && !ALLOWED_IMAGE_MIMES.includes(mime)) {
        return { valid: false, error: "이미지 파일만 업로드할 수 있습니다." };
    }
    if (expectedType === "video" && !ALLOWED_VIDEO_MIMES.includes(mime)) {
        return { valid: false, error: "동영상 파일만 업로드할 수 있습니다." };
    }

    return { valid: true };
}

// 파일 크기 검증 (이미지 10MB, 영상 100MB)
export function validateFileSize(
    file: File,
    type: MediaType
): { valid: boolean; error?: string } {
    const maxSize = type === "image" ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    const maxSizeText = type === "image" ? "10MB" : "100MB";

    if (file.size > maxSize) {
        return {
            valid: false,
            error: `파일 크기가 ${maxSizeText}를 초과합니다.`,
        };
    }
    return { valid: true };
}

// 파일을 Supabase Storage에 업로드
export async function uploadMedia(
    file: File,
    userId: string,
    petId: string
): Promise<UploadResult> {
    try {
        // 1. 확장자 검증
        const extValidation = validateExtension(file.name);
        if (!extValidation.valid) {
            return { success: false, error: extValidation.error };
        }

        const mediaType = getMediaType(file.name);

        // 2. MIME 타입 검증
        const mimeValidation = validateMimeType(file, mediaType);
        if (!mimeValidation.valid) {
            return { success: false, error: mimeValidation.error };
        }

        // 3. 파일 크기 검증
        const sizeValidation = validateFileSize(file, mediaType);
        if (!sizeValidation.valid) {
            return { success: false, error: sizeValidation.error };
        }

        // 고유한 파일 경로 생성 (검증된 확장자 사용)
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const ext = extValidation.ext;
        const path = `${userId}/${petId}/${timestamp}-${randomId}.${ext}`;

        // Supabase Storage에 업로드
        const { data, error } = await supabase.storage
            .from("pet-media")
            .upload(path, file, {
                cacheControl: "3600",
                upsert: false,
            });

        if (error) {
            return {
                success: false,
                error: error.message || "업로드 중 오류가 발생했습니다.",
            };
        }

        // 공개 URL 가져오기
        const {
            data: { publicUrl },
        } = supabase.storage.from("pet-media").getPublicUrl(path);

        return {
            success: true,
            url: publicUrl,
            path: data.path,
        };
    } catch {
        return {
            success: false,
            error: "업로드 중 오류가 발생했습니다.",
        };
    }
}

// 여러 파일 업로드
export async function uploadMultipleMedia(
    files: File[],
    userId: string,
    petId: string,
    onProgress?: (current: number, total: number) => void
): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
        if (onProgress) {
            onProgress(i + 1, files.length);
        }
        const result = await uploadMedia(files[i], userId, petId);
        results.push(result);
    }

    return results;
}

// 미디어 삭제
export async function deleteMedia(path: string): Promise<boolean> {
    try {
        const { error } = await supabase.storage
            .from("pet-media")
            .remove([path]);

        if (error) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

// 이미지 전용 검증 (공통 헬퍼)
function validateImageFile(file: File): { valid: boolean; ext: string; error?: string } {
    // 1. 확장자 검증
    const extValidation = validateExtension(file.name);
    if (!extValidation.valid) {
        return { valid: false, ext: "", error: extValidation.error };
    }

    // 이미지 확장자만 허용
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(extValidation.ext)) {
        return { valid: false, ext: "", error: "이미지 파일만 업로드할 수 있습니다." };
    }

    // 2. MIME 타입 검증
    const mimeValidation = validateMimeType(file, "image");
    if (!mimeValidation.valid) {
        return { valid: false, ext: "", error: mimeValidation.error };
    }

    // 3. 파일 크기 검증
    const sizeValidation = validateFileSize(file, "image");
    if (!sizeValidation.valid) {
        return { valid: false, ext: "", error: sizeValidation.error };
    }

    return { valid: true, ext: extValidation.ext };
}

/**
 * 공통 이미지 업로드 (검증 + Storage 업로드 + 공개 URL 반환)
 * path prefix만 다른 4개 함수를 통합한 내부 함수.
 * @param file 업로드할 이미지 파일
 * @param userId 사용자 ID
 * @param pathPrefix Storage 경로 접두사 (예: "magazine", "community")
 */
async function uploadImage(
    file: File,
    userId: string,
    pathPrefix: string
): Promise<UploadResult> {
    try {
        const validation = validateImageFile(file);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const ext = validation.ext;
        const path = `${pathPrefix}/${userId}/${timestamp}-${randomId}.${ext}`;

        const { data, error } = await supabase.storage
            .from("pet-media")
            .upload(path, file, {
                cacheControl: "3600",
                upsert: false,
            });

        if (error) {
            return { success: false, error: error.message };
        }

        const {
            data: { publicUrl },
        } = supabase.storage.from("pet-media").getPublicUrl(path);

        return {
            success: true,
            url: publicUrl,
            path: data.path,
        };
    } catch {
        return { success: false, error: "이미지 업로드 중 오류가 발생했습니다." };
    }
}

/** 매거진 기사 썸네일 업로드 */
export async function uploadMagazineImage(file: File, userId: string): Promise<UploadResult> {
    return uploadImage(file, userId, "magazine");
}

/** 커뮤니티 게시글 이미지 업로드 */
export async function uploadCommunityImage(file: File, userId: string): Promise<UploadResult> {
    return uploadImage(file, userId, "community");
}

/** 지역정보 게시글 이미지 업로드 */
export async function uploadLocalPostImage(file: File, userId: string): Promise<UploadResult> {
    return uploadImage(file, userId, "local-posts");
}

/** 분실/발견 동물 게시글 이미지 업로드 */
export async function uploadLostPetImage(file: File, userId: string): Promise<UploadResult> {
    return uploadImage(file, userId, "lost-pets");
}

// Base64를 File로 변환 (기존 localStorage 데이터 마이그레이션용)
export function base64ToFile(
    base64: string,
    filename: string
): File | null {
    try {
        const arr = base64.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    } catch {
        return null;
    }
}

// 썸네일 생성 (영상용)
export function generateVideoThumbnail(
    videoFile: File
): Promise<string | null> {
    return new Promise((resolve) => {
        const video = document.createElement("video");
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = () => {
            video.currentTime = Math.min(1, video.duration / 2);
        };

        video.onseeked = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
            URL.revokeObjectURL(video.src);
        };

        video.onerror = () => {
            resolve(null);
            URL.revokeObjectURL(video.src);
        };

        video.src = URL.createObjectURL(videoFile);
    });
}
