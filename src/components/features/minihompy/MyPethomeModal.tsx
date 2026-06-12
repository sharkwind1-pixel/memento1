/**
 * MyPethomeModal — 내 펫홈을 "창"으로 띄움 (싸이월드/버디버디 미니홈피 감성).
 *
 * 데스크탑(sm+): 자유 이동(헤더 드래그) + 상/하/좌/우·네 모서리 리사이즈가 되는 플로팅 창.
 *   - 배경 dim 없음 → 뒤 광장(피드)을 그대로 보고 클릭 가능. 닫기는 헤더 X로만.
 *   - z-[80]: 사이트 헤더(z-60)·하단탭바(z-50)보다 위 → 상/하 씹힘 없음.
 *     내부 모달(상점 z-9999, 방명록/이웃 z-50 등)은 이 창의 자손(fixed)이라 창의 스태킹 컨텍스트
 *     안에서 맨 위로 떠 화면 전체를 덮음(창에 transform 미사용 → overflow-hidden이 fixed 자손을 안 자름).
 *   - 위치/크기는 localStorage("pethome_win")에 저장 → 다음에 그대로 복원.
 * 모바일(<sm): 작은 화면엔 드래그/리사이즈가 부적합 → 기존 backdrop 스크롤 모달 유지
 *   (useBodyScrollLock 미사용 — 모바일 모달 스크롤 교훈).
 *
 * 전역 'openMyPethome' 이벤트로 어디서든 열림(page.tsx에서 수신·렌더).
 */

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Home } from "lucide-react";
import MiniHomepyTab from "./MiniHomepyTab";

type Geo = { x: number; y: number; w: number; h: number };
const MIN_W = 340;
const MIN_H = 300;
const HEADER_SAFE = 64; // 상단 헤더 높이(기본 위치 계산용)

function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
}

export default function MyPethomeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [isDesktop, setIsDesktop] = useState(
        () => typeof window !== "undefined" && window.innerWidth >= 640
    );
    useEffect(() => {
        const check = () => setIsDesktop(window.innerWidth >= 640);
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    if (!isOpen) return null;

    if (isDesktop) return <DesktopWindow onClose={onClose} />;

    // 모바일: 기존 backdrop 스크롤 모달 (드래그/리사이즈 없음)
    return (
        <div
            className="fixed inset-0 z-[80] overflow-y-auto bg-black/30 flex justify-center pt-4 pb-20 px-3"
            onClick={onClose}
        >
            <div className="relative w-full max-w-2xl h-fit" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-memento-500 rounded-t-2xl shadow-sm">
                    <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <Home className="w-4 h-4" /> 내 펫홈
                    </span>
                    <button
                        onClick={onClose}
                        aria-label="닫기"
                        className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>
                <div className="bg-memento-50/60 dark:bg-gray-900 rounded-b-2xl p-3">
                    <MiniHomepyTab />
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// 데스크탑 플로팅 창 — 드래그 이동 + 8방향 리사이즈 + 위치/크기 영속
// ============================================================================

function DesktopWindow({ onClose }: { onClose: () => void }) {
    const [geo, setGeo] = useState<Geo | null>(null);
    const drag = useRef<{ mode: string; mx: number; my: number; geo: Geo } | null>(null);

    // 초기 지오메트리 — localStorage 복원 + 현재 뷰포트로 클램프(헤더/탭바 안 겹치게 기본 위치)
    useEffect(() => {
        const vw = window.innerWidth, vh = window.innerHeight;
        let saved: Geo | null = null;
        try { saved = JSON.parse(localStorage.getItem("pethome_win") || "null"); } catch { /* ignore */ }
        let g: Geo;
        if (saved && typeof saved.w === "number") {
            const w = clamp(saved.w, MIN_W, vw - 16);
            const h = clamp(saved.h, MIN_H, vh - 16);
            g = { w, h, x: clamp(saved.x, 0, vw - w), y: clamp(saved.y, 0, vh - 40) };
        } else {
            const w = Math.min(600, vw - 40);
            const h = Math.min(540, vh - HEADER_SAFE - 88);
            g = { w, h, x: Math.round((vw - w) / 2), y: HEADER_SAFE + 12 };
        }
        setGeo(g);
    }, []);

    // 드래그/리사이즈 시작 — 최신 geo를 setGeo 함수형으로 읽어 스냅샷
    const onDown = useCallback((mode: string) => (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setGeo((g) => {
            if (g) drag.current = { mode, mx: e.clientX, my: e.clientY, geo: g };
            return g;
        });
    }, []);

    // 전역 포인터 이동/해제 — 핸들 밖으로 나가도 끊기지 않게 window에 바인딩
    useEffect(() => {
        const move = (e: PointerEvent) => {
            const d = drag.current;
            if (!d) return;
            const vw = window.innerWidth, vh = window.innerHeight;
            const dx = e.clientX - d.mx, dy = e.clientY - d.my;
            let { x, y, w, h } = d.geo;
            const m = d.mode;
            if (m === "drag") {
                // 최소 96px는 화면에 남기고(완전 유실 방지), 위는 0까지(헤더 위로도 이동 허용)
                x = clamp(d.geo.x + dx, -d.geo.w + 96, vw - 96);
                y = clamp(d.geo.y + dy, 0, vh - 40);
            } else {
                if (m.includes("e")) w = clamp(d.geo.w + dx, MIN_W, vw - d.geo.x);
                if (m.includes("s")) h = clamp(d.geo.h + dy, MIN_H, vh - d.geo.y);
                if (m.includes("w")) { w = clamp(d.geo.w - dx, MIN_W, d.geo.x + d.geo.w); x = d.geo.x + d.geo.w - w; }
                if (m.includes("n")) { h = clamp(d.geo.h - dy, MIN_H, d.geo.y + d.geo.h); y = d.geo.y + d.geo.h - h; }
            }
            setGeo({ x, y, w, h });
        };
        const up = () => {
            if (!drag.current) return;
            drag.current = null;
            setGeo((g) => {
                if (g) { try { localStorage.setItem("pethome_win", JSON.stringify(g)); } catch { /* ignore */ } }
                return g;
            });
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        return () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
    }, []);

    if (!geo) return null;

    const H = (mode: string, cls: string) => (
        <div onPointerDown={onDown(mode)} className={`absolute ${cls}`} style={{ touchAction: "none" }} />
    );

    return (
        <div
            className="fixed z-[80] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden"
            style={{ left: geo.x, top: geo.y, width: geo.w, height: geo.h }}
        >
            {/* 헤더 = 드래그 핸들 */}
            <div
                onPointerDown={onDown("drag")}
                className="flex items-center justify-between px-4 py-2.5 bg-memento-500 cursor-move select-none flex-shrink-0"
                style={{ touchAction: "none" }}
            >
                <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Home className="w-4 h-4" /> 내 펫홈
                </span>
                <button
                    onClick={onClose}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="닫기"
                    className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                >
                    <X className="w-4 h-4 text-white" />
                </button>
            </div>

            {/* 본문 — 내부 스크롤 */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-memento-50/60 dark:bg-gray-900 p-3 sm:p-4">
                <MiniHomepyTab />
            </div>

            {/* 리사이즈 핸들 — 상/하/좌/우 + 네 모서리 */}
            {H("n", "top-0 left-3 right-3 h-1.5 cursor-ns-resize")}
            {H("s", "bottom-0 left-3 right-3 h-1.5 cursor-ns-resize")}
            {H("w", "top-3 bottom-3 left-0 w-1.5 cursor-ew-resize")}
            {H("e", "top-3 bottom-3 right-0 w-1.5 cursor-ew-resize")}
            {H("nw", "top-0 left-0 w-3.5 h-3.5 cursor-nwse-resize")}
            {H("ne", "top-0 right-0 w-3.5 h-3.5 cursor-nesw-resize")}
            {H("sw", "bottom-0 left-0 w-3.5 h-3.5 cursor-nesw-resize")}
            {H("se", "bottom-0 right-0 w-3.5 h-3.5 cursor-nwse-resize")}
        </div>
    );
}
