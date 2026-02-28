/**
 * ShowcaseBanner.tsx
 * 커뮤니티 페이지 상단에 항상 표시되는 "함께 보기" 배너
 * 클릭 시 갤러리 뷰(ShowcaseGalleryView)로 전환
 */

"use client";

import React from "react";
import { Star, ArrowRight, Camera } from "lucide-react";

interface ShowcaseBannerProps {
    previewImages: string[];
    postCount: number;
    onOpen: () => void;
}

export default function ShowcaseBanner({ previewImages, postCount, onOpen }: ShowcaseBannerProps) {
    return (
        <div className="px-4">
            <button
                onClick={onOpen}
                className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 dark:from-amber-500 dark:via-orange-500 dark:to-rose-500 p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.98] text-left"
            >
                {/* 배경 장식 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative flex items-center gap-4">
                    {/* 미리보기 이미지 스택 */}
                    <div className="flex-shrink-0 flex items-center">
                        {previewImages.length > 0 ? (
                            <div className="flex -space-x-3">
                                {previewImages.slice(0, 4).map((img, idx) => (
                                    <div
                                        key={idx}
                                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white shadow-md overflow-hidden"
                                        style={{ zIndex: 4 - idx }}
                                    >
                                        <img
                                            src={img}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                ))}
                                {postCount > 4 && (
                                    <div
                                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white shadow-md bg-black/40 flex items-center justify-center text-white text-xs font-bold"
                                        style={{ zIndex: 0 }}
                                    >
                                        +{postCount - 4}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                                <Camera className="w-7 h-7 text-white" />
                            </div>
                        )}
                    </div>

                    {/* 텍스트 */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Star className="w-4 h-4 text-white flex-shrink-0" />
                            <h3 className="text-white font-bold text-base sm:text-lg">
                                함께 보기
                            </h3>
                        </div>
                        <p className="text-white/80 text-xs sm:text-sm truncate">
                            우리 아이들의 사진과 영상을 함께 감상해요
                        </p>
                    </div>

                    {/* 화살표 */}
                    <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </div>
                </div>
            </button>
        </div>
    );
}
