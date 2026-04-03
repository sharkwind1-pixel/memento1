/**
 * ImageEditor.tsx
 * 이미지 편집 모달 (크롭 + 회전 + 조절 + 필터)
 *
 * 풀스크린 모달로 표시. CSS filter로 실시간 프리뷰,
 * "적용" 클릭 시 Canvas export로 최종 Blob 생성.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    X,
    Check,
    Crop,
    SlidersHorizontal,
    Palette,
    RotateCw,
} from "lucide-react";
import type {
    CropAspectRatio,
    RotationAngle,
    ImageAdjustments,
    FilterPreset,
    ImageEditState,
    CropRegion,
} from "@/types";
import {
    loadImage,
    buildCSSFilter,
    exportEditedImage,
    DEFAULT_ADJUSTMENTS,
    getAspectRatioValue,
} from "@/lib/image-editor";
import CropOverlay from "./CropOverlay";
import AdjustPanel from "./AdjustPanel";
import FilterPanel from "./FilterPanel";

// ============================================================================
// Props
// ============================================================================

interface ImageEditorProps {
    /** 이미지 소스 (File 또는 URL) */
    image: File | string;
    /** 편집 완료 시 Blob 반환 */
    onSave: (editedBlob: Blob) => void;
    /** 취소 */
    onCancel: () => void;
    /** 초기 비율 */
    initialAspectRatio?: CropAspectRatio;
}

type EditorTab = "crop" | "adjust" | "filter";

const ASPECT_RATIOS: { value: CropAspectRatio; label: string }[] = [
    { value: "free", label: "자유" },
    { value: "1:1", label: "1:1" },
    { value: "4:3", label: "4:3" },
    { value: "16:9", label: "16:9" },
];

// ============================================================================
// 컴포넌트
// ============================================================================

export default function ImageEditor({
    image,
    onSave,
    onCancel,
    initialAspectRatio = "free",
}: ImageEditorProps) {
    // 편집 상태
    const [editState, setEditState] = useState<ImageEditState>({
        cropAspectRatio: initialAspectRatio,
        cropRegion: { x: 0.05, y: 0.05, width: 0.9, height: 0.9 },
        rotation: 0,
        adjustments: { ...DEFAULT_ADJUSTMENTS },
        filter: "original",
    });
    const [activeTab, setActiveTab] = useState<EditorTab>("crop");
    const [isExporting, setIsExporting] = useState(false);
    const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");

    // 뷰포트 크기 측정
    const viewportRef = useRef<HTMLDivElement>(null);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

    // 이미지 표시 영역 (회전 적용 후)
    const [imageDisplayRect, setImageDisplayRect] = useState({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
    });

    // ========================================================================
    // 이미지 로드
    // ========================================================================
    useEffect(() => {
        let cancelled = false;
        let blobUrl: string | null = null;

        if (typeof image === "string") {
            setPreviewUrl(image);
        } else {
            blobUrl = URL.createObjectURL(image);
            setPreviewUrl(blobUrl);
        }

        loadImage(image)
            .then((img) => {
                if (!cancelled) setImageElement(img);
            })
            .catch(() => {
                // 로드 실패
            });

        return () => {
            cancelled = true;
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [image]);

    // ========================================================================
    // 뷰포트 크기 측정 + 이미지 표시 영역 계산
    // ========================================================================
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;

        const measure = () => {
            const rect = el.getBoundingClientRect();
            setViewportSize({ width: rect.width, height: rect.height });
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!imageElement || viewportSize.width === 0) return;

        const imgW = imageElement.naturalWidth;
        const imgH = imageElement.naturalHeight;
        const rotation = editState.rotation;

        // 회전 후 가로/세로
        const isRotated = rotation === 90 || rotation === 270;
        const rotW = isRotated ? imgH : imgW;
        const rotH = isRotated ? imgW : imgH;

        // 뷰포트에 맞추기 (contain)
        const vW = viewportSize.width;
        const vH = viewportSize.height;
        const scale = Math.min(vW / rotW, vH / rotH);
        const dispW = rotW * scale;
        const dispH = rotH * scale;
        const dispL = (vW - dispW) / 2;
        const dispT = (vH - dispH) / 2;

        setImageDisplayRect({
            left: dispL,
            top: dispT,
            width: dispW,
            height: dispH,
        });
    }, [imageElement, viewportSize, editState.rotation]);

    // ========================================================================
    // CSS filter 문자열
    // ========================================================================
    const cssFilter = buildCSSFilter(editState.adjustments, editState.filter);

    // ========================================================================
    // 핸들러
    // ========================================================================
    const handleRotate = useCallback(() => {
        setEditState((prev) => {
            const nextRotation = ((prev.rotation + 90) % 360) as RotationAngle;

            // 크롭 영역도 회전에 맞게 변환
            let newCrop: CropRegion | null = prev.cropRegion;
            if (newCrop) {
                // 90도 시계방향 회전 시 좌표 변환
                newCrop = {
                    x: 1 - newCrop.y - newCrop.height,
                    y: newCrop.x,
                    width: newCrop.height,
                    height: newCrop.width,
                };
            }

            return { ...prev, rotation: nextRotation, cropRegion: newCrop };
        });
    }, []);

    const handleAspectRatioChange = useCallback(
        (ratio: CropAspectRatio) => {
            setEditState((prev) => {
                let newCrop = prev.cropRegion || {
                    x: 0.05,
                    y: 0.05,
                    width: 0.9,
                    height: 0.9,
                };

                // 비율 적용
                const ratioValue = getAspectRatioValue(ratio);
                if (ratioValue && imageDisplayRect.width > 0) {
                    const displayRatio =
                        ratioValue * (imageDisplayRect.height / imageDisplayRect.width);
                    let h = newCrop.width * displayRatio;
                    let w = newCrop.width;
                    if (h > 0.9) {
                        h = 0.9;
                        w = h / displayRatio;
                    }
                    const cx = newCrop.x + newCrop.width / 2;
                    const cy = newCrop.y + newCrop.height / 2;
                    newCrop = {
                        x: Math.max(0, Math.min(cx - w / 2, 1 - w)),
                        y: Math.max(0, Math.min(cy - h / 2, 1 - h)),
                        width: w,
                        height: h,
                    };
                }

                return { ...prev, cropAspectRatio: ratio, cropRegion: newCrop };
            });
        },
        [imageDisplayRect]
    );

    const handleCropChange = useCallback((region: CropRegion) => {
        setEditState((prev) => ({ ...prev, cropRegion: region }));
    }, []);

    const handleAdjustmentsChange = useCallback((adj: ImageAdjustments) => {
        setEditState((prev) => ({ ...prev, adjustments: adj }));
    }, []);

    const handleFilterChange = useCallback((filter: FilterPreset) => {
        setEditState((prev) => ({ ...prev, filter }));
    }, []);

    // ========================================================================
    // Export (적용)
    // ========================================================================
    const handleSave = useCallback(async () => {
        if (!imageElement || isExporting) return;
        setIsExporting(true);

        try {
            const blob = await exportEditedImage(imageElement, editState);
            onSave(blob);
        } catch {
            // export 실패 시 원본 이미지를 blob으로 전달
            if (typeof image !== "string") {
                onSave(image);
            }
        } finally {
            setIsExporting(false);
        }
    }, [imageElement, editState, isExporting, onSave, image]);

    // ========================================================================
    // 렌더링
    // ========================================================================
    const editorContent = (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col select-none">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 h-14 flex-shrink-0">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex items-center gap-1 text-gray-300 hover:text-white transition-colors min-h-[44px]"
                >
                    <X className="w-5 h-5" />
                    <span className="text-sm">취소</span>
                </button>
                <span className="text-sm font-medium text-white">이미지 편집</span>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isExporting}
                    className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors min-h-[44px] disabled:opacity-50"
                >
                    {isExporting ? (
                        <span className="text-sm">처리중...</span>
                    ) : (
                        <>
                            <Check className="w-5 h-5" />
                            <span className="text-sm font-medium">적용</span>
                        </>
                    )}
                </button>
            </div>

            {/* 이미지 뷰포트 */}
            <div ref={viewportRef} className="flex-1 relative overflow-hidden">
                {previewUrl && (
                    <div
                        className="absolute"
                        style={{
                            left: imageDisplayRect.left,
                            top: imageDisplayRect.top,
                            width: imageDisplayRect.width,
                            height: imageDisplayRect.height,
                        }}
                    >
                        {/* 이미지 (CSS filter + rotation으로 실시간 프리뷰) */}
                        <img
                            src={previewUrl}
                            alt="편집 중"
                            className="w-full h-full object-contain"
                            style={{
                                filter: cssFilter !== "none" ? cssFilter : undefined,
                                transform: editState.rotation
                                    ? `rotate(${editState.rotation}deg)`
                                    : undefined,
                                transformOrigin: "center center",
                            }}
                            draggable={false}
                        />

                        {/* 크롭 탭 활성 시 오버레이 */}
                        {activeTab === "crop" && editState.cropRegion && (
                            <CropOverlay
                                cropRegion={editState.cropRegion}
                                onChange={handleCropChange}
                                aspectRatio={editState.cropAspectRatio}
                                containerWidth={imageDisplayRect.width}
                                containerHeight={imageDisplayRect.height}
                            />
                        )}
                    </div>
                )}

                {/* Export 중 로딩 오버레이 */}
                {isExporting && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-sm text-white/80">이미지 처리중...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* 탭 선택 */}
            <div className="flex border-t border-gray-800 flex-shrink-0">
                {([
                    { key: "crop" as EditorTab, icon: Crop, label: "크롭" },
                    { key: "adjust" as EditorTab, icon: SlidersHorizontal, label: "조절" },
                    { key: "filter" as EditorTab, icon: Palette, label: "필터" },
                ]).map(({ key, icon: Icon, label }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[44px] transition-colors ${
                            activeTab === key
                                ? "text-white"
                                : "text-gray-500 hover:text-gray-300"
                        }`}
                    >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px]">{label}</span>
                    </button>
                ))}
            </div>

            {/* 탭 콘텐츠 */}
            <div className="flex-shrink-0 border-t border-gray-800 bg-gray-900/50">
                {activeTab === "crop" && (
                    <div className="px-4 py-3">
                        {/* 비율 버튼 */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-gray-400 flex-shrink-0">
                                비율
                            </span>
                            <div className="flex gap-1.5">
                                {ASPECT_RATIOS.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => handleAspectRatioChange(value)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                            editState.cropAspectRatio === value
                                                ? "bg-white text-black"
                                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* 회전 버튼 */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 flex-shrink-0">
                                회전
                            </span>
                            <button
                                type="button"
                                onClick={handleRotate}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 text-xs font-medium transition-colors"
                            >
                                <RotateCw className="w-3.5 h-3.5" />
                                90도
                            </button>
                            {editState.rotation > 0 && (
                                <span className="text-xs text-gray-500">
                                    {editState.rotation}도
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "adjust" && (
                    <AdjustPanel
                        adjustments={editState.adjustments}
                        onChange={handleAdjustmentsChange}
                    />
                )}

                {activeTab === "filter" && (
                    <FilterPanel
                        imageElement={imageElement}
                        selectedFilter={editState.filter}
                        onSelect={handleFilterChange}
                    />
                )}
            </div>
        </div>
    );

    // Portal로 document.body에 직접 렌더링 (상위 모달의 overflow 제한 회피)
    if (typeof window === "undefined") return editorContent;
    return createPortal(editorContent, document.body);
}
