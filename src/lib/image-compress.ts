/**
 * 클라이언트 사이드 이미지 압축 유틸
 * Canvas API 기반 — 의존성 없음, 브라우저 네이티브
 *
 * 원본 사진을 업로드 전에 리사이즈 + JPEG 품질 조정하여
 * 전송 크기를 200KB~1MB 수준으로 줄입니다.
 */

export interface CompressOptions {
    /** 최대 가로/세로 길이 (기본 1920px) */
    maxDimension?: number;
    /** JPEG 품질 0-1 (기본 0.85) */
    quality?: number;
    /** 압축 후 목표 최대 크기 바이트 (기본 2MB) */
    maxSizeBytes?: number;
    /** 이 크기 이하면 압축 안 함 (기본 500KB) */
    skipIfUnder?: number;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
    maxDimension: 1920,
    quality: 0.85,
    maxSizeBytes: 2 * 1024 * 1024,
    skipIfUnder: 500 * 1024,
};

/**
 * 이미지 파일을 압축합니다.
 * - 원본이 skipIfUnder 이하면 그대로 반환
 * - HEIC/HEIF 등 브라우저가 디코딩 못 하는 포맷은 원본 반환
 * - 압축 실패 시 원본 반환 (안전)
 */
export async function compressImage(
    file: File,
    options: CompressOptions = {},
): Promise<File> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // 이미지가 아니면 그대로
    if (!file.type.startsWith("image/")) return file;

    // 이미 충분히 작으면 그대로
    if (file.size <= opts.skipIfUnder) return file;

    // GIF는 애니메이션 보존 위해 건드리지 않음
    if (file.type === "image/gif") return file;

    try {
        const bitmap = await loadImage(file);
        const { width, height } = calcResizedDimensions(
            bitmap.width,
            bitmap.height,
            opts.maxDimension,
        );

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;

        ctx.drawImage(bitmap, 0, 0, width, height);

        // 닫기 (브라우저 지원 시)
        if ("close" in bitmap && typeof bitmap.close === "function") {
            bitmap.close();
        }

        // 품질 단계적 조정: 목표 크기까지 낮춤
        let quality = opts.quality;
        let blob: Blob | null = null;

        for (let attempt = 0; attempt < 5; attempt++) {
            blob = await canvasToBlob(canvas, "image/jpeg", quality);
            if (!blob) break;
            if (blob.size <= opts.maxSizeBytes) break;
            quality -= 0.1;
            if (quality < 0.4) break;
        }

        if (!blob) return file;

        // 압축 결과가 원본보다 크면 원본 반환
        if (blob.size >= file.size) return file;

        // 새 File 객체 생성 (원본 파일명 유지하되 확장자는 jpg로)
        const newName = file.name.replace(/\.[^.]+$/, ".jpg");
        return new File([blob], newName, {
            type: "image/jpeg",
            lastModified: Date.now(),
        });
    } catch {
        // 압축 실패 시 원본 반환 (안전)
        return file;
    }
}

/** 파일을 ImageBitmap 또는 HTMLImageElement로 로드 */
async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
    // createImageBitmap이 더 빠름
    if (typeof createImageBitmap === "function") {
        try {
            return await createImageBitmap(file);
        } catch {
            // 실패 시 HTMLImageElement 폴백
        }
    }

    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("이미지 로드 실패"));
        };
        img.src = url;
    });
}

/** Canvas를 Blob으로 변환 (Promise 래퍼) */
function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number,
): Promise<Blob | null> {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), type, quality);
    });
}

/** 종횡비 유지하며 리사이즈 대상 크기 계산 */
function calcResizedDimensions(
    srcWidth: number,
    srcHeight: number,
    maxDimension: number,
): { width: number; height: number } {
    if (srcWidth <= maxDimension && srcHeight <= maxDimension) {
        return { width: srcWidth, height: srcHeight };
    }

    if (srcWidth > srcHeight) {
        return {
            width: maxDimension,
            height: Math.round((srcHeight * maxDimension) / srcWidth),
        };
    }
    return {
        width: Math.round((srcWidth * maxDimension) / srcHeight),
        height: maxDimension,
    };
}
