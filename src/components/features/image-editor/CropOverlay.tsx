/**
 * CropOverlay.tsx
 * 이미지 위에 표시되는 크롭 영역 오버레이
 * 드래그로 이동, 코너 핸들로 리사이즈, 비율 제약 적용
 */

"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import type { CropRegion, CropAspectRatio } from "@/types";
import { getAspectRatioValue } from "@/lib/image-editor";

interface CropOverlayProps {
    /** 현재 크롭 영역 (0-1 상대값) */
    cropRegion: CropRegion;
    /** 크롭 영역 변경 콜백 */
    onChange: (region: CropRegion) => void;
    /** 비율 제약 */
    aspectRatio: CropAspectRatio;
    /** 뷰포트 컨테이너 크기 (실제 표시 영역) */
    containerWidth: number;
    containerHeight: number;
}

/** 최소 크롭 크기 (상대값 비율) */
const MIN_SIZE = 0.05;

type DragMode = "move" | "nw" | "ne" | "sw" | "se" | null;

export default function CropOverlay({
    cropRegion,
    onChange,
    aspectRatio,
    containerWidth,
    containerHeight,
}: CropOverlayProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [dragMode, setDragMode] = useState<DragMode>(null);
    const dragStart = useRef({ x: 0, y: 0 });
    const regionStart = useRef<CropRegion>({ ...cropRegion });

    // 비율값
    const ratioValue = getAspectRatioValue(aspectRatio);

    // 좌표 정규화: px → 0-1 상대값
    const toRel = useCallback(
        (px: number, py: number) => ({
            rx: containerWidth > 0 ? px / containerWidth : 0,
            ry: containerHeight > 0 ? py / containerHeight : 0,
        }),
        [containerWidth, containerHeight]
    );

    // 클램프
    const clamp = (v: number, min: number, max: number) =>
        Math.max(min, Math.min(max, v));

    // 비율 적용 크롭 영역 보정
    const applyAspectRatio = useCallback(
        (region: CropRegion, anchor: "nw" | "ne" | "sw" | "se" | "center"): CropRegion => {
            if (!ratioValue) return region;

            // 크롭 영역은 0-1 정규화 좌표이므로, 컨테이너 px 비율로 보정 필요
            // ratioValue: 원하는 비율 (1:1=1, 4:3=1.333, 16:9=1.778)
            // 크롭 width/height는 컨테이너 상대값이라 컨테이너 비율 보정 필수
            const containerAspect = containerWidth > 0 ? containerWidth / containerHeight : 1;
            const displayRatio = ratioValue / containerAspect;
            let { x, y, width, height } = region;

            // 높이 기준 비율 보정
            height = width * displayRatio;

            // 범위 벗어나면 너비 조절
            if (height > 1) {
                height = 1;
                width = height / displayRatio;
            }

            // anchor 기준 위치 조절
            if (anchor === "se" || anchor === "center") {
                // 좌상단 고정
            } else if (anchor === "sw") {
                x = region.x + region.width - width;
            } else if (anchor === "ne") {
                y = region.y + region.height - height;
            } else if (anchor === "nw") {
                x = region.x + region.width - width;
                y = region.y + region.height - height;
            }

            x = clamp(x, 0, 1 - width);
            y = clamp(y, 0, 1 - height);

            return { x, y, width, height };
        },
        [ratioValue, containerWidth, containerHeight]
    );

    // 포인터 이벤트 핸들러
    const handlePointerDown = useCallback(
        (e: React.PointerEvent, mode: DragMode) => {
            e.preventDefault();
            e.stopPropagation();
            setDragMode(mode);
            dragStart.current = { x: e.clientX, y: e.clientY };
            regionStart.current = { ...cropRegion };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        },
        [cropRegion]
    );

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!dragMode) return;
            e.preventDefault();

            const dx = e.clientX - dragStart.current.x;
            const dy = e.clientY - dragStart.current.y;
            const { rx: drx, ry: dry } = toRel(dx, dy);
            const r = regionStart.current;

            let next: CropRegion;

            if (dragMode === "move") {
                next = {
                    x: clamp(r.x + drx, 0, 1 - r.width),
                    y: clamp(r.y + dry, 0, 1 - r.height),
                    width: r.width,
                    height: r.height,
                };
            } else {
                // 코너 리사이즈
                let nx = r.x,
                    ny = r.y,
                    nw = r.width,
                    nh = r.height;

                if (dragMode === "se") {
                    nw = clamp(r.width + drx, MIN_SIZE, 1 - r.x);
                    nh = clamp(r.height + dry, MIN_SIZE, 1 - r.y);
                } else if (dragMode === "sw") {
                    const newW = clamp(r.width - drx, MIN_SIZE, r.x + r.width);
                    nx = r.x + r.width - newW;
                    nw = newW;
                    nh = clamp(r.height + dry, MIN_SIZE, 1 - r.y);
                } else if (dragMode === "ne") {
                    nw = clamp(r.width + drx, MIN_SIZE, 1 - r.x);
                    const newH = clamp(r.height - dry, MIN_SIZE, r.y + r.height);
                    ny = r.y + r.height - newH;
                    nh = newH;
                } else if (dragMode === "nw") {
                    const newW = clamp(r.width - drx, MIN_SIZE, r.x + r.width);
                    const newH = clamp(r.height - dry, MIN_SIZE, r.y + r.height);
                    nx = r.x + r.width - newW;
                    ny = r.y + r.height - newH;
                    nw = newW;
                    nh = newH;
                }

                next = { x: nx, y: ny, width: nw, height: nh };
                next = applyAspectRatio(next, dragMode as "nw" | "ne" | "sw" | "se");
            }

            onChange(next);
        },
        [dragMode, toRel, onChange, applyAspectRatio]
    );

    const handlePointerUp = useCallback(() => {
        setDragMode(null);
    }, []);

    // 비율 변경 시 크롭 영역 재조정
    useEffect(() => {
        if (ratioValue) {
            const adjusted = applyAspectRatio(cropRegion, "center");
            if (
                Math.abs(adjusted.width - cropRegion.width) > 0.001 ||
                Math.abs(adjusted.height - cropRegion.height) > 0.001
            ) {
                onChange(adjusted);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aspectRatio]);

    // 크롭 영역 → px 좌표
    const left = cropRegion.x * 100;
    const top = cropRegion.y * 100;
    const width = cropRegion.width * 100;
    const height = cropRegion.height * 100;

    const handleSize = "w-5 h-5";
    const handleStyle =
        "absolute bg-white rounded-full shadow-lg border-2 border-gray-200 z-10 touch-none";

    return (
        <div
            ref={overlayRef}
            className="absolute inset-0"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ touchAction: "none" }}
        >
            {/* 어두운 마스크 (크롭 바깥) */}
            <div className="absolute inset-0 pointer-events-none">
                {/* 위 */}
                <div
                    className="absolute left-0 right-0 top-0 bg-black/60"
                    style={{ height: `${top}%` }}
                />
                {/* 아래 */}
                <div
                    className="absolute left-0 right-0 bottom-0 bg-black/60"
                    style={{ height: `${100 - top - height}%` }}
                />
                {/* 좌 */}
                <div
                    className="absolute left-0 bg-black/60"
                    style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        width: `${left}%`,
                    }}
                />
                {/* 우 */}
                <div
                    className="absolute right-0 bg-black/60"
                    style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        width: `${100 - left - width}%`,
                    }}
                />
            </div>

            {/* 크롭 영역 */}
            <div
                className="absolute border-2 border-white/90 cursor-move touch-none"
                style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                }}
                onPointerDown={(e) => handlePointerDown(e, "move")}
            >
                {/* 3x3 격자 */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                    <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                    <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                </div>
            </div>

            {/* 코너 핸들 */}
            <div
                className={`${handleStyle} ${handleSize} -translate-x-1/2 -translate-y-1/2 cursor-nw-resize`}
                style={{
                    left: `${left}%`,
                    top: `${top}%`,
                }}
                onPointerDown={(e) => handlePointerDown(e, "nw")}
            />
            <div
                className={`${handleStyle} ${handleSize} translate-x-[-50%] -translate-y-1/2 cursor-ne-resize`}
                style={{
                    left: `${left + width}%`,
                    top: `${top}%`,
                }}
                onPointerDown={(e) => handlePointerDown(e, "ne")}
            />
            <div
                className={`${handleStyle} ${handleSize} -translate-x-1/2 translate-y-[-50%] cursor-sw-resize`}
                style={{
                    left: `${left}%`,
                    top: `${top + height}%`,
                }}
                onPointerDown={(e) => handlePointerDown(e, "sw")}
            />
            <div
                className={`${handleStyle} ${handleSize} translate-x-[-50%] translate-y-[-50%] cursor-se-resize`}
                style={{
                    left: `${left + width}%`,
                    top: `${top + height}%`,
                }}
                onPointerDown={(e) => handlePointerDown(e, "se")}
            />
        </div>
    );
}
