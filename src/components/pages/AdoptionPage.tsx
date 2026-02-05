/**
 * AdoptionPage.tsx
 * 입양 정보 전용 페이지
 * - 타일형 이미지 갤러리 (클릭하면 라이트박스)
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, MapPin, Phone, Users, X } from "lucide-react";
import PawLoading from "@/components/ui/PawLoading";

import { TabType } from "@/types";
import { bestPosts } from "@/data/posts";
import { usePetImages } from "@/hooks/usePetImages";

interface AdoptionPageProps {
    setSelectedTab: (tab: TabType) => void;
}

type LightboxItem = {
    title: string;
    subtitle?: string;
    meta?: string;
    src: string;
};

const safeStringSrc = (v: unknown): string | null =>
    typeof v === "string" && v.trim().length ? v.trim() : null;

/* ---------------- Lightbox ---------------- */
function Lightbox({
    item,
    onClose,
}: {
    item: LightboxItem | null;
    onClose: () => void;
}) {
    useEffect(() => {
        if (!item) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [item, onClose]);

    if (!item) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/70 dark:border-gray-800">
                    <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {item.title}
                        </div>
                        {(item.subtitle || item.meta) && (
                            <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                {[item.subtitle, item.meta]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </div>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl"
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="relative w-full bg-black">
                    <img
                        src={item.src}
                        alt={item.title}
                        className="w-full max-h-[70vh] object-contain"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                    />
                </div>

                {/* 입양 문의 버튼 */}
                <div className="p-4 border-t border-gray-200/70 dark:border-gray-800">
                    <div className="flex gap-3">
                        <Button className="flex-1 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 rounded-xl">
                            <Phone className="w-4 h-4 mr-2" />
                            입양 문의하기
                        </Button>
                        <Button variant="outline" className="rounded-xl">
                            <Heart className="w-4 h-4 mr-2" />
                            관심 등록
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ---------------- AdoptionPage ---------------- */
export default function AdoptionPage({ setSelectedTab }: AdoptionPageProps) {
    // usePetImages: adoptionImages는 string[] 배열
    const { adoptionImages } = usePetImages();
    const [lightboxItem, setLightboxItem] = useState<LightboxItem | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // 입양 타일 아이템 생성 (adoptionImages는 string[] 배열)
    const adoptionTileItems = useMemo<LightboxItem[]>(() => {
        return bestPosts.adoption
            .map((pet, index) => {
                const src = safeStringSrc(adoptionImages[index]);
                if (!src) return null;
                return {
                    title: pet.title,
                    subtitle: `${pet.location} · ${pet.age}`,
                    meta: pet.badge,
                    src,
                };
            })
            .filter(Boolean) as LightboxItem[];
    }, [adoptionImages]);

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* 배경 */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-200/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <Lightbox
                item={lightboxItem}
                onClose={() => setLightboxItem(null)}
            />

            <div className="relative z-10 space-y-8 pb-8">
                {/* 헤더 - 모바일 최적화 */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedTab("home")}
                            className="rounded-xl flex-shrink-0"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-gradient-to-r from-sky-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">
                                    입양 정보
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                    새 가족을 기다리는 친구들
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                                variant={viewMode === "grid" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setViewMode("grid")}
                                className="rounded-xl px-2 sm:px-3"
                            >
                                <span className="sm:hidden">🔲</span>
                                <span className="hidden sm:inline">그리드</span>
                            </Button>
                            <Button
                                variant={viewMode === "list" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setViewMode("list")}
                                className="rounded-xl px-2 sm:px-3"
                            >
                                <span className="sm:hidden">📋</span>
                                <span className="hidden sm:inline">리스트</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 메인 컨텐츠 */}
                {viewMode === "grid" ? (
                    <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-lg rounded-3xl p-6 border border-white/50 dark:border-gray-700/50">
                        {adoptionTileItems.length ? (
                            <div className="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                                {adoptionTileItems.map((it, idx) => (
                                    <button
                                        key={`${it.title}-${idx}`}
                                        onClick={() => setLightboxItem(it)}
                                        className="group text-left"
                                        type="button"
                                    >
                                        <div className="rounded-2xl overflow-hidden bg-white/60 dark:bg-gray-800/60 border border-white/50 dark:border-gray-700/60 shadow-sm hover:shadow-lg transition-all">
                                            <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                                                <img
                                                    src={it.src}
                                                    alt={it.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer"
                                                />
                                                {it.meta && (
                                                    <div className="absolute top-2 left-2">
                                                        <Badge
                                                            variant={
                                                                it.meta ===
                                                                "긴급"
                                                                    ? "destructive"
                                                                    : "default"
                                                            }
                                                            className={
                                                                it.meta ===
                                                                "긴급"
                                                                    ? "bg-red-500 text-white"
                                                                    : "bg-white/90 dark:bg-gray-800/90"
                                                            }
                                                        >
                                                            {it.meta}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                    {it.title}
                                                </div>
                                                {it.subtitle && (
                                                    <div className="text-sm text-gray-600 dark:text-gray-300 truncate flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {it.subtitle}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-500 py-10">
                                <PawLoading size="lg" text="이미지 불러오는 중..." />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bestPosts.adoption.map((pet, i) => {
                            const src = safeStringSrc(adoptionImages[i]);
                            return (
                                <Card
                                    key={i}
                                    className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 rounded-2xl overflow-hidden"
                                >
                                    <div className="flex">
                                        <div className="w-48 h-48 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                                            {src ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setLightboxItem({
                                                            title: pet.title,
                                                            subtitle: `${pet.location} · ${pet.age}`,
                                                            meta: pet.badge,
                                                            src,
                                                        })
                                                    }
                                                    className="w-full h-full"
                                                >
                                                    <img
                                                        src={src}
                                                        alt={pet.title}
                                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                </button>
                                            ) : null}
                                        </div>
                                        <div className="flex-1 p-6">
                                            <div className="flex items-start justify-between mb-2">
                                                <CardTitle className="text-xl text-gray-800 dark:text-gray-100">
                                                    {pet.title}
                                                </CardTitle>
                                                <Badge
                                                    variant={
                                                        pet.badge === "긴급"
                                                            ? "destructive"
                                                            : "default"
                                                    }
                                                    className={
                                                        pet.badge === "긴급"
                                                            ? "bg-red-500 text-white"
                                                            : ""
                                                    }
                                                >
                                                    {pet.badge}
                                                </Badge>
                                            </div>
                                            <CardDescription className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-4">
                                                <MapPin className="w-4 h-4" />
                                                {pet.location} · {pet.age}
                                            </CardDescription>
                                            <div className="flex gap-2">
                                                <Button className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 rounded-xl">
                                                    <Phone className="w-4 h-4 mr-2" />
                                                    입양 문의
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="rounded-xl"
                                                >
                                                    <Heart className="w-4 h-4 mr-2" />
                                                    관심
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
