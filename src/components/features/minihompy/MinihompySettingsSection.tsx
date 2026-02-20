/**
 * MinihompySettingsSection.tsx
 * 미니홈피 설정 섹션 - 공개/비공개, 인사말 편집, 배경 변경
 */

"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Settings, Globe, Lock, Pencil, Check, X, Palette } from "lucide-react";
import { MINIHOMPY } from "@/config/constants";
import type { MinihompySettings } from "@/types";
import BackgroundShopModal from "./BackgroundShopModal";

interface MinihompySettingsSectionProps {
    settings: MinihompySettings;
    onUpdate: (updates: Partial<MinihompySettings>) => Promise<void>;
}

export default function MinihompySettingsSection({
    settings,
    onUpdate,
}: MinihompySettingsSectionProps) {
    const [isEditingGreeting, setIsEditingGreeting] = useState(false);
    const [greetingDraft, setGreetingDraft] = useState(settings.greeting);
    const [showBgShop, setShowBgShop] = useState(false);
    const [updating, setUpdating] = useState(false);

    const handleTogglePublic = async () => {
        setUpdating(true);
        await onUpdate({ isPublic: !settings.isPublic });
        setUpdating(false);
    };

    const handleSaveGreeting = async () => {
        setUpdating(true);
        await onUpdate({ greeting: greetingDraft });
        setIsEditingGreeting(false);
        setUpdating(false);
    };

    const handleBgChange = async (slug: string) => {
        await onUpdate({ backgroundSlug: slug });
    };

    return (
        <>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border-0 shadow-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-5 h-5 text-[#05B2DC]" />
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                        미니홈피 설정
                    </h3>
                </div>

                <div className="space-y-3">
                    {/* 공개/비공개 토글 */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                        <div className="flex items-center gap-2">
                            {settings.isPublic ? (
                                <Globe className="w-4 h-4 text-emerald-500" />
                            ) : (
                                <Lock className="w-4 h-4 text-amber-500" />
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-200">
                                {settings.isPublic ? "공개" : "비공개"}
                            </span>
                        </div>
                        <button
                            onClick={handleTogglePublic}
                            disabled={updating}
                            className={cn(
                                "relative w-11 h-6 rounded-full transition-colors",
                                settings.isPublic
                                    ? "bg-emerald-400"
                                    : "bg-gray-300 dark:bg-gray-600"
                            )}
                        >
                            <div className={cn(
                                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                                settings.isPublic ? "left-[22px]" : "left-0.5"
                            )} />
                        </button>
                    </div>

                    {/* 인사말 편집 */}
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                인사말
                            </span>
                            {!isEditingGreeting && (
                                <button
                                    onClick={() => {
                                        setGreetingDraft(settings.greeting);
                                        setIsEditingGreeting(true);
                                    }}
                                    className="text-gray-400 hover:text-[#05B2DC] transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {isEditingGreeting ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={greetingDraft}
                                    onChange={(e) => setGreetingDraft(e.target.value.slice(0, MINIHOMPY.GREETING_MAX_LENGTH))}
                                    placeholder="인사말을 입력하세요..."
                                    className={cn(
                                        "flex-1 text-sm px-2 py-1.5 rounded-lg border",
                                        "bg-white dark:bg-gray-700",
                                        "border-gray-200 dark:border-gray-600",
                                        "text-gray-700 dark:text-gray-200",
                                        "focus:outline-none focus:ring-2 focus:ring-[#05B2DC]/50"
                                    )}
                                    autoFocus
                                    maxLength={MINIHOMPY.GREETING_MAX_LENGTH}
                                />
                                <button
                                    onClick={handleSaveGreeting}
                                    disabled={updating}
                                    className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-200 dark:hover:bg-emerald-900/30 transition-colors"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setIsEditingGreeting(false)}
                                    className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                                {settings.greeting || "(인사말이 없습니다)"}
                            </p>
                        )}

                        {isEditingGreeting && (
                            <p className="text-[10px] text-gray-400 mt-1 text-right">
                                {greetingDraft.length}/{MINIHOMPY.GREETING_MAX_LENGTH}
                            </p>
                        )}
                    </div>

                    {/* 배경 변경 */}
                    <button
                        onClick={() => setShowBgShop(true)}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 p-3 rounded-xl",
                            "bg-gradient-to-r from-violet-50 to-pink-50",
                            "dark:from-violet-900/20 dark:to-pink-900/20",
                            "hover:from-violet-100 hover:to-pink-100",
                            "dark:hover:from-violet-900/30 dark:hover:to-pink-900/30",
                            "transition-all text-sm font-medium text-violet-700 dark:text-violet-300"
                        )}
                    >
                        <Palette className="w-4 h-4" />
                        배경 꾸미기
                    </button>
                </div>
            </div>

            {showBgShop && (
                <BackgroundShopModal
                    isOpen={showBgShop}
                    onClose={() => setShowBgShop(false)}
                    currentSlug={settings.backgroundSlug}
                    onApply={handleBgChange}
                />
            )}
        </>
    );
}
