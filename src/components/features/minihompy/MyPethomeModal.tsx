/**
 * MyPethomeModal — 내 펫홈을 "창(팝업)"으로 띄움 (싸이월드 미니홈피 감성).
 *
 * 기존엔 기록 탭 안 인라인 섹션이었고 타인 펫홈만 팝업이라 비대칭이었다.
 * 사이드바/히어로 "내 펫홈"이 이 모달을 열어 MiniHomepyTab(꾸미기·섹션 전부)을 창으로 표시.
 * 전역 'openMyPethome' 이벤트로 어디서든 열림(page.tsx에서 수신·렌더).
 *
 * z-40: MiniHomepyTab 내부 모달들(상점/방명록방문/이웃 z-50)이 위로 쌓이게.
 * 스크롤: backdrop이 스크롤 컨테이너(useBodyScrollLock 미사용 — 모바일 모달 스크롤 교훈).
 *
 * TODO(다음 단계): 데스크탑 좌우 2단(미니룸/콘텐츠) 레이아웃, 기록 탭 펫홈 서브탭 제거(팝업 일원화).
 */

"use client";

import React from "react";
import { X, Home } from "lucide-react";
import MiniHomepyTab from "./MiniHomepyTab";

export default function MyPethomeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-40 overflow-y-auto bg-black/45 flex justify-center pt-5 pb-12 px-3 sm:px-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl h-fit"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 창 헤더 (스크롤해도 상단 고정) */}
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

                {/* 본문 — 기존 MiniHomepyTab 그대로(꾸미기·섹션 전부) */}
                <div className="bg-memento-50/60 dark:bg-gray-900 rounded-b-2xl p-3 sm:p-4">
                    <MiniHomepyTab />
                </div>
            </div>
        </div>
    );
}
