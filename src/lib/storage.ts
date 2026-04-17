/**
 * Supabase Storage 미디어 업로드 유틸리티
 * 사진과 영상을 Supabase Storage에 업로드하고 관리
 */

import { supabase } from "./supabase";
import { compressImage } from "./image-compress";
import { authFetch } from "./auth-fetch";

// 지원하는 미디어 타입
export type MediaType = "image" | "video";

export interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    moderated?: boolean; // 이미지 모더레이션 통과 여부
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

// 파일 크기 검증 (이미지 20MB, 영상 100MB)
export function validateFileSize(
    file: File,
    type: MediaType
): { valid: boolean; error?: string } {
    const maxSize = type === "image" ? 20 * 1024 * 1024 : 100 * 1024 * 1024;
    const maxSizeText = type === "image" ? "20MB" : "100MB";

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

        // 4. 이미지인 경우 자동 압축 (영상은 그대로)
        const finalFile = mediaType === "image"
            ? await compressImage(file, {
                maxDimension: 1920,
                quality: 0.85,
                maxSizeBytes: 2 * 1024 * 1024,
                skipIfUnder: 500 * 1024,
            })
            : file;

        // 고유한 파일 경로 생성 (압축 후 확장자 반영)
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const ext = mediaType === "image" && finalFile.type === "image/jpeg"
            ? "jpg"
            : extValidation.ext;
        const path = `${userId}/${petId}/${timestamp}-${randomId}.${ext}`;

        // Supabase Storage에 업로드
        const { data, error } = await supabase.storage
            .from("pet-media")
            .upload(path, finalFile, {
                cacheControl: "31536000",
                upsert: false,
                contentType: finalFile.type,
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

        // 이미지 모더레이션 (반려동물 사진인지 검증)
        if (mediaType === "image") {
            try {
                const modRes = await authFetch("/api/moderation", {
                    method: "POST",
                    body: JSON.stringify({ imageUrl: publicUrl }),
                });
                const modResult = await modRes.json();
                if (modResult.allowed === false) {
                    // 모더레이션 실패 → 업로드된 파일 삭제
                    await supabase.storage.from("pet-media").remove([data.path]);
                    return {
                        success: false,
                        error: modResult.reason || "반려동물 사진만 업로드할 수 있어요.",
                        moderated: false,
                    };
                }
            } catch {
                // 모더레이션 API 실패 시 통과 (fail-open)
            }
        }

        return {
            success: true,
            url: publicUrl,
            path: data.path,
            moderated: true,
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

        // 자동 압축: 원본이 500KB 초과 시 리사이즈 + JPEG 85% 품질
        // HEIC/GIF 등은 내부적으로 원본 유지
        const compressed = await compressImage(file, {
            maxDimension: 1920,
            quality: 0.85,
            maxSizeBytes: 2 * 1024 * 1024,
            skipIfUnder: 500 * 1024,
        });

        // 압축 후 확장자가 바뀔 수 있으므로 재결정
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const finalExt = compressed.type === "image/jpeg" ? "jpg" : validation.ext;
        const path = `${pathPrefix}/${userId}/${timestamp}-${randomId}.${finalExt}`;

        const { data, error } = await supabase.storage
            .from("pet-media")
            .upload(path, compressed, {
                cacheControl: "31536000",
                upsert: false,
                contentType: compressed.type,
            });

        if (error) {
            return { success: false, error: error.message };
        }

        const {
            data: { publicUrl },
        } = supabase.storage.from("pet-media").getPublicUrl(path);

        // 이미지 모더레이션 (반려동물 사진인지 검증)
        // 매거진/커뮤니티는 검증 안 함 (관리자/일반 글), 펫 관련 경로만
        const petPaths = ["", "lost-pets"]; // uploadMedia의 기본 경로 + 분실동물
        const needsModeration = petPaths.includes(pathPrefix) || pathPrefix === "";
        if (needsModeration) {
            try {
                const modRes = await authFetch("/api/moderation", {
                    method: "POST",
                    body: JSON.stringify({ imageUrl: publicUrl }),
                });
                const modResult = await modRes.json();
                if (modResult.allowed === false) {
                    // 모더레이션 실패 → 업로드된 파일 삭제
                    await supabase.storage.from("pet-media").remove([data.path]);
                    return {
                        success: false,
                        error: modResult.reason || "반려동물 사진만 업로드할 수 있어요.",
                        moderated: false,
                    };
                }
            } catch {
                // 모더레이션 API 실패 시 통과 (fail-open)
            }
        }

        return {
            success: true,
            url: publicUrl,
            path: data.path,
            moderated: true,
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

/** 펫 프로필 사진 업로드 (addPet/updatePet에서 Storage 우회 버그 재발 방지용) */
export async function uploadPetProfile(file: File, userId: string): Promise<UploadResult> {
    return uploadImage(file, userId, "pet-profiles");
}

/**
 * blob: URL을 File로 변환 (같은 브라우저 세션 내에서만 가능).
 * blob URL은 브라우저 메모리 전용이라 다른 세션/디바이스에서는 fetch 실패.
 */
export async function blobUrlToFile(blobUrl: string, filename = "pet-profile.jpg"): Promise<File | null> {
    try {
        const res = await fetch(blobUrl);
        if (!res.ok) return null;
        const blob = await res.blob();
        const mime = blob.type || "image/jpeg";
        const ext = mime === "image/png" ? "png" : "jpg";
        const safeName = filename.replace(/\.\w+$/, "") + "." + ext;
        return new File([blob], safeName, { type: mime });
    } catch {
        return null;
    }
}

/**
 * 임의 이미지 소스를 Storage URL로 정규화.
 * - http(s)://로 시작하면 그대로 반환 (이미 올라간 이미지)
 * - data:image/...;base64,... → base64ToFile → uploadPetProfile
 * - blob:https://... → fetch → uploadPetProfile
 * - 그 외 (null, 빈문자열 등) → null
 *
 * 사용처: PetContext.addPet / updatePet에서 DB INSERT 전 반드시 호출.
 */
export async function ensurePetProfileStorageUrl(
    source: string | null | undefined,
    userId: string,
): Promise<string | null> {
    if (!source) return null;
    if (source.startsWith("http://") || source.startsWith("https://")) {
        return source;
    }

    const filename = `pet-profile-${Date.now()}`;

    if (source.startsWith("data:")) {
        const file = base64ToFile(source, `${filename}.jpg`);
        if (!file) return null;
        const result = await uploadPetProfile(file, userId);
        return result.success ? result.url || null : null;
    }

    if (source.startsWith("blob:")) {
        const file = await blobUrlToFile(source, `${filename}.jpg`);
        if (!file) return null;
        const result = await uploadPetProfile(file, userId);
        return result.success ? result.url || null : null;
    }

    // 알 수 없는 스킴 — 저장 거부
    return null;
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
