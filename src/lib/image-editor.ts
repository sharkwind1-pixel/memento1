/**
 * image-editor.ts
 * Canvas 기반 이미지 편집 유틸리티
 *
 * 필터 프리셋, CSS 필터 빌드, Canvas export, 썸네일 생성
 * 외부 라이브러리 없이 HTML5 Canvas API만 사용
 */

import type {
    FilterPreset,
    ImageAdjustments,
    ImageEditState,
    CropRegion,
    RotationAngle,
} from "@/types";

// ============================================================================
// 필터 프리셋 정의
// ============================================================================

export const FILTER_PRESETS: Record<
    FilterPreset,
    { label: string; cssFilter: string }
> = {
    original: { label: "원본", cssFilter: "none" },
    warm: {
        label: "따뜻하게",
        cssFilter: "sepia(0.15) saturate(1.2) brightness(1.05)",
    },
    cool: {
        label: "시원하게",
        cssFilter: "saturate(0.9) hue-rotate(15deg) brightness(1.05)",
    },
    vivid: {
        label: "선명하게",
        cssFilter: "saturate(1.5) contrast(1.1)",
    },
    soft: {
        label: "부드럽게",
        cssFilter: "contrast(0.9) brightness(1.1) saturate(0.95)",
    },
    vintage: {
        label: "빈티지",
        cssFilter: "sepia(0.35) contrast(0.9) saturate(0.8)",
    },
    bright: {
        label: "밝게",
        cssFilter: "brightness(1.25) contrast(0.95)",
    },
    bw: { label: "흑백", cssFilter: "grayscale(1)" },
};

// ============================================================================
// CSS 필터 빌드
// ============================================================================

/** adjustments + preset를 하나의 CSS filter 문자열로 조합 */
export function buildCSSFilter(
    adjustments: ImageAdjustments,
    preset: FilterPreset
): string {
    const parts: string[] = [];
    if (adjustments.brightness !== 100) {
        parts.push(`brightness(${adjustments.brightness / 100})`);
    }
    if (adjustments.contrast !== 100) {
        parts.push(`contrast(${adjustments.contrast / 100})`);
    }
    if (adjustments.saturation !== 100) {
        parts.push(`saturate(${adjustments.saturation / 100})`);
    }
    const presetFilter = FILTER_PRESETS[preset].cssFilter;
    if (presetFilter !== "none") {
        parts.push(presetFilter);
    }
    return parts.length > 0 ? parts.join(" ") : "none";
}

// ============================================================================
// 기본 편집 상태
// ============================================================================

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
};

export const DEFAULT_EDIT_STATE: ImageEditState = {
    cropAspectRatio: "free",
    cropRegion: null,
    rotation: 0,
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    filter: "original",
};

// ============================================================================
// 이미지 로드 헬퍼
// ============================================================================

/** File 또는 URL을 HTMLImageElement로 로드 */
export function loadImage(source: File | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("이미지를 불러올 수 없습니다"));

        if (typeof source === "string") {
            // URL인 경우 - CORS 우회를 위해 fetch → blob
            if (source.startsWith("http")) {
                fetch(source)
                    .then((res) => res.blob())
                    .then((blob) => {
                        img.src = URL.createObjectURL(blob);
                    })
                    .catch(() => {
                        // fetch 실패 시 직접 시도
                        img.src = source;
                    });
            } else {
                img.src = source;
            }
        } else {
            img.src = URL.createObjectURL(source);
        }
    });
}

// ============================================================================
// Canvas Export
// ============================================================================

/** 회전 후 캔버스 크기 계산 */
function getRotatedSize(
    w: number,
    h: number,
    rotation: RotationAngle
): { width: number; height: number } {
    if (rotation === 90 || rotation === 270) {
        return { width: h, height: w };
    }
    return { width: w, height: h };
}

/**
 * 모든 편집을 적용하여 최종 Blob 생성
 * 처리 순서: 회전 → 크롭 → 필터/조절
 */
export async function exportEditedImage(
    sourceImage: HTMLImageElement,
    editState: ImageEditState,
    outputFormat: "image/jpeg" | "image/png" = "image/jpeg",
    quality: number = 0.85
): Promise<Blob> {
    const { rotation, cropRegion, adjustments, filter } = editState;
    const srcW = sourceImage.naturalWidth;
    const srcH = sourceImage.naturalHeight;

    // 대용량 이미지 제한 (4096px)
    const MAX_DIM = 4096;
    let scale = 1;
    if (srcW > MAX_DIM || srcH > MAX_DIM) {
        scale = MAX_DIM / Math.max(srcW, srcH);
    }
    const scaledW = Math.round(srcW * scale);
    const scaledH = Math.round(srcH * scale);

    // 1단계: 회전 적용
    const rotatedSize = getRotatedSize(scaledW, scaledH, rotation);
    const rotCanvas = document.createElement("canvas");
    rotCanvas.width = rotatedSize.width;
    rotCanvas.height = rotatedSize.height;
    const rotCtx = rotCanvas.getContext("2d")!;

    rotCtx.translate(rotatedSize.width / 2, rotatedSize.height / 2);
    rotCtx.rotate((rotation * Math.PI) / 180);
    rotCtx.drawImage(
        sourceImage,
        -scaledW / 2,
        -scaledH / 2,
        scaledW,
        scaledH
    );

    // 2단계: 크롭 적용
    const crop: CropRegion = cropRegion || { x: 0, y: 0, width: 1, height: 1 };
    const cropX = Math.round(crop.x * rotatedSize.width);
    const cropY = Math.round(crop.y * rotatedSize.height);
    const cropW = Math.round(crop.width * rotatedSize.width);
    const cropH = Math.round(crop.height * rotatedSize.height);

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext("2d")!;
    cropCtx.drawImage(rotCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // 3단계: 필터 + 조절 적용
    const filterStr = buildCSSFilter(adjustments, filter);
    const outCanvas = document.createElement("canvas");
    outCanvas.width = cropW;
    outCanvas.height = cropH;
    const outCtx = outCanvas.getContext("2d")!;

    if (filterStr !== "none") {
        outCtx.filter = filterStr;
    }
    outCtx.drawImage(cropCanvas, 0, 0);

    // Blob 생성
    return new Promise((resolve, reject) => {
        outCanvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error("이미지 내보내기에 실패했습니다"));
            },
            outputFormat,
            quality
        );
    });
}

// ============================================================================
// 필터 썸네일 생성
// ============================================================================

/** 필터 픽커용 작은 썸네일 생성 (dataURL 반환) */
export function generateFilterThumbnail(
    sourceImage: HTMLImageElement,
    preset: FilterPreset,
    size: number = 56
): string {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // 정사각형으로 center crop
    const sw = sourceImage.naturalWidth;
    const sh = sourceImage.naturalHeight;
    const cropSize = Math.min(sw, sh);
    const sx = (sw - cropSize) / 2;
    const sy = (sh - cropSize) / 2;

    const filterStr = FILTER_PRESETS[preset].cssFilter;
    if (filterStr !== "none") {
        ctx.filter = filterStr;
    }
    ctx.drawImage(sourceImage, sx, sy, cropSize, cropSize, 0, 0, size, size);

    return canvas.toDataURL("image/jpeg", 0.6);
}

// ============================================================================
// 비율 계산 헬퍼
// ============================================================================

/** 비율 문자열을 숫자로 변환 (free면 null) */
export function getAspectRatioValue(
    ratio: string
): number | null {
    switch (ratio) {
        case "1:1":
            return 1;
        case "4:3":
            return 4 / 3;
        case "16:9":
            return 16 / 9;
        case "9:16":
            return 9 / 16;
        default:
            return null;
    }
}
