"use client";

import { useState, useEffect } from "react";
import { PawPrint, RefreshCw } from "lucide-react";

interface PawLoadingProps {
    size?: "sm" | "md" | "lg";
    text?: string;
    className?: string;
}

const sizes = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-8 h-8",
};

const gaps = {
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-3",
};

export default function PawLoading({
    size = "md",
    text,
    className = ""
}: PawLoadingProps) {
    return (
        <div className={`text-center ${className}`}>
            <div className={`flex ${gaps[size]} justify-center ${text ? "mb-3" : ""}`}>
                {[0, 1, 2].map((i) => (
                    <PawPrint
                        key={i}
                        className={`${sizes[size]} text-[#05B2DC] animate-bounce`}
                        style={{
                            animationDelay: `${i * 0.15}s`,
                            animationDuration: "0.5s",
                        }}
                    />
                ))}
            </div>
            {text && <p className="text-gray-400 text-sm">{text}</p>}
        </div>
    );
}

// 전체 화면 로딩용 — 10초 이상 걸리면 새로고침 버튼 표시
export function FullPageLoading({ text = "로딩 중..." }: { text?: string }) {
    const [showRetry, setShowRetry] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowRetry(true), 10000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-sky-50 to-violet-50 gap-4">
            <PawLoading size="lg" text={text} />
            {showRetry && (
                <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-sky-600 bg-white/80 rounded-xl border border-gray-200 hover:border-sky-300 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    새로고침
                </button>
            )}
        </div>
    );
}

// 섹션 로딩용 - 페이지 전환 시 레이아웃 시프트 방지를 위해 고정 높이 사용
export function SectionLoading({ text }: { text?: string }) {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-200px)] opacity-0 animate-fade-in">
            <PawLoading size="md" text={text} />
        </div>
    );
}

// 인라인 로딩용 (버튼 내부 등)
export function InlineLoading() {
    return (
        <div className="flex gap-1 justify-center">
            {[0, 1, 2].map((i) => (
                <PawPrint
                    key={i}
                    className="w-4 h-4 text-current animate-bounce"
                    style={{
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: "0.4s",
                    }}
                />
            ))}
        </div>
    );
}
