/**
 * NotificationSettingsSection.tsx
 * 알림 설정, 화면 설정(간편 모드), 위치기반 서비스 섹션
 */

"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, MapPin, Eye } from "lucide-react";
import { toast } from "sonner";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";

interface NotificationSettingsSectionProps {
    isOpen: boolean;
    userId: string;
    isSimpleMode: boolean;
    toggleSimpleMode: () => void;
}

export default function NotificationSettingsSection({
    isOpen,
    userId,
    isSimpleMode,
    toggleSimpleMode,
}: NotificationSettingsSectionProps) {
    // 알림 설정
    const [notifComment, setNotifComment] = useState(true);
    const [notifLike, setNotifLike] = useState(true);
    const [notifReminder, setNotifReminder] = useState(true);
    const [locationConsent, setLocationConsent] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // 알림 설정 + 위치 동의 로드
    useEffect(() => {
        const loadNotifSettings = () => {
            const saved = safeGetItem("memento-notif-settings");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setNotifComment(parsed.comment ?? true);
                    setNotifLike(parsed.like ?? true);
                    setNotifReminder(parsed.reminder ?? true);
                } catch {
                    // 기본값 유지
                }
            }
        };

        const loadLocationConsent = async () => {
            const { data } = await supabase
                .from("profiles")
                .select("location_consent")
                .eq("id", userId)
                .single();

            setLocationConsent(data?.location_consent || false);
        };

        if (isOpen) {
            loadNotifSettings();
            loadLocationConsent();
        }
    }, [isOpen, userId]);

    // 알림 설정 저장 (localStorage)
    const handleNotifToggle = (key: "comment" | "like" | "reminder", value: boolean) => {
        const newSettings = {
            comment: key === "comment" ? value : notifComment,
            like: key === "like" ? value : notifLike,
            reminder: key === "reminder" ? value : notifReminder,
        };
        if (key === "comment") setNotifComment(value);
        if (key === "like") setNotifLike(value);
        if (key === "reminder") setNotifReminder(value);

        safeSetItem("memento-notif-settings", JSON.stringify(newSettings));
    };

    // 위치정보 동의 토글
    const handleLocationToggle = async (value: boolean) => {
        setIsSavingSettings(true);

        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    location_consent: value,
                    location_consent_at: value ? new Date().toISOString() : null,
                })
                .eq("id", userId);

            if (error) throw error;
            setLocationConsent(value);
            toast.success(value ? "위치기반 서비스 이용에 동의했습니다" : "위치기반 서비스 동의를 철회했습니다");
        } catch {
            toast.error("설정 변경에 실패했습니다");
        } finally {
            setIsSavingSettings(false);
        }
    };

    return (
        <>
            {/* 알림 설정 */}
            <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-3">
                    <Bell className="w-4 h-4" />
                    알림 설정
                </h3>
                <div className="space-y-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-600 dark:text-gray-400">댓글 알림</span>
                        <button
                            role="switch"
                            aria-checked={notifComment}
                            onClick={() => handleNotifToggle("comment", !notifComment)}
                            className={`relative w-10 h-6 rounded-full transition-colors ${
                                notifComment ? "bg-memento-500" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                        >
                            <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                    notifComment ? "translate-x-4" : ""
                                }`}
                            />
                        </button>
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-600 dark:text-gray-400">좋아요 알림</span>
                        <button
                            role="switch"
                            aria-checked={notifLike}
                            onClick={() => handleNotifToggle("like", !notifLike)}
                            className={`relative w-10 h-6 rounded-full transition-colors ${
                                notifLike ? "bg-memento-500" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                        >
                            <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                    notifLike ? "translate-x-4" : ""
                                }`}
                            />
                        </button>
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-600 dark:text-gray-400">케어 리마인더 알림</span>
                        <button
                            role="switch"
                            aria-checked={notifReminder}
                            onClick={() => handleNotifToggle("reminder", !notifReminder)}
                            className={`relative w-10 h-6 rounded-full transition-colors ${
                                notifReminder ? "bg-memento-500" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                        >
                            <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                    notifReminder ? "translate-x-4" : ""
                                }`}
                            />
                        </button>
                    </label>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                    푸시 알림은 추후 업데이트에서 지원됩니다
                </p>
            </div>

            {/* 구분선 */}
            <hr className="border-gray-200 dark:border-gray-700" />

            {/* 화면 설정 (간편모드) */}
            <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-3">
                    <Eye className="w-4 h-4" />
                    화면 설정
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">크게 보기</span>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                                홈 화면을 큰 버튼으로 간편하게 표시합니다
                            </p>
                        </div>
                        <button
                            role="switch"
                            aria-checked={isSimpleMode}
                            onClick={toggleSimpleMode}
                            className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${
                                isSimpleMode ? "bg-memento-500" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                        >
                            <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                    isSimpleMode ? "translate-x-4" : ""
                                }`}
                            />
                        </button>
                    </label>
                </div>
            </div>

            {/* 구분선 */}
            <hr className="border-gray-200 dark:border-gray-700" />

            {/* 위치정보 동의 관리 */}
            <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-3">
                    <MapPin className="w-4 h-4" />
                    위치정보 서비스
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">위치기반 서비스 이용 동의</span>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                                주변 동물병원, 지역 정보 등 맞춤 서비스 제공
                            </p>
                        </div>
                        <button
                            role="switch"
                            aria-checked={locationConsent}
                            onClick={() => handleLocationToggle(!locationConsent)}
                            disabled={isSavingSettings}
                            className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${
                                locationConsent ? "bg-memento-500" : "bg-gray-300 dark:bg-gray-600"
                            } ${isSavingSettings ? "opacity-50" : ""}`}
                        >
                            <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                    locationConsent ? "translate-x-4" : ""
                                }`}
                            />
                        </button>
                    </label>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                    <a href="/location-terms" target="_blank" className="underline hover:text-memento-500">
                        위치기반 서비스 이용약관
                    </a>
                    {" "}| 언제든지 동의를 철회할 수 있습니다
                </p>
            </div>
        </>
    );
}
