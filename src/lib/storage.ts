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

// 파일 확장자로 미디어 타입 결정
export function getMediaType(filename: string): MediaType {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const videoExtensions = ["mp4", "mov", "avi", "webm", "mkv", "m4v"];
    return videoExtensions.includes(ext) ? "video" : "image";
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
        const mediaType = getMediaType(file.name);
        const validation = validateFileSize(file, mediaType);

        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // 고유한 파일 경로 생성
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
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

/** 매거진 기사 썸네일 업로드 */
export async function uploadMagazineImage(
    file: File,
    userId: string
): Promise<UploadResult> {
    try {
        const validation = validateFileSize(file, "image");
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `magazine/${userId}/${timestamp}-${randomId}.${ext}`;

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
        return { success: false, error: "업로드 중 오류가 발생했습니다." };
    }
}

/** 커뮤니티 게시글 이미지 업로드 */
export async function uploadCommunityImage(
    file: File,
    userId: string
): Promise<UploadResult> {
    try {
        const validation = validateFileSize(file, "image");
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `community/${userId}/${timestamp}-${randomId}.${ext}`;

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

/** 지역정보 게시글 이미지 업로드 */
export async function uploadLocalPostImage(
    file: File,
    userId: string
): Promise<UploadResult> {
    try {
        const validation = validateFileSize(file, "image");
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `local-posts/${userId}/${timestamp}-${randomId}.${ext}`;

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

/** 분실/발견 동물 게시글 이미지 업로드 */
export async function uploadLostPetImage(
    file: File,
    userId: string
): Promise<UploadResult> {
    try {
        const validation = validateFileSize(file, "image");
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `lost-pets/${userId}/${timestamp}-${randomId}.${ext}`;

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
