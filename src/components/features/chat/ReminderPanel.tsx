/**
 * ReminderPanel.tsx
 * ================
 * 케어 알림 관리 패널 (Bottom Sheet)
 *
 * 기능:
 * - 알림 목록 조회 (GET /api/reminders)
 * - 알림 ON/OFF 토글 (PUT /api/reminders/{id})
 * - 알림 삭제 (DELETE /api/reminders/{id})
 * - 새 알림 추가 (POST /api/reminders)
 *
 * 모바일 퍼스트 디자인, 하단에서 올라오는 바텀시트 UI
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { formatScheduleText, DAY_LABELS } from "@/lib/schedule-utils";
import {
    X,
    Bell,
    Footprints,
    UtensilsCrossed,
    Pill,
    Syringe,
    Scissors,
    Stethoscope,
    Trash2,
    Plus,
    Loader2,
} from "lucide-react";
import { API } from "@/config/apiEndpoints";
import { authFetch } from "@/lib/auth-fetch";
import { toast } from "sonner";
import type { Reminder } from "@/types";

// ============================================================================
// 타입 정의
// ============================================================================

interface ReminderPanelProps {
    isOpen: boolean;
    onClose: () => void;
    petId: string;
    petName: string;
    isMemorialMode: boolean;
}

/** 알림 추가 폼 데이터 */
interface AddReminderForm {
    type: string;
    title: string;
    time: string;
    repeatType: string;
    dayOfWeek: number;
    dayOfMonth: number;
}

// ============================================================================
// 상수 정의
// ============================================================================

/** 리마인더 타입별 아이콘/라벨/색상 매핑 */
const REMINDER_TYPES = [
    { key: "walk", label: "산책", Icon: Footprints, color: "border-green-400", bg: "bg-green-50", text: "text-green-600" },
    { key: "meal", label: "식사", Icon: UtensilsCrossed, color: "border-orange-400", bg: "bg-orange-50", text: "text-orange-600" },
    { key: "medicine", label: "약", Icon: Pill, color: "border-blue-400", bg: "bg-blue-50", text: "text-blue-600" },
    { key: "vaccine", label: "접종", Icon: Syringe, color: "border-purple-400", bg: "bg-purple-50", text: "text-purple-600" },
    { key: "grooming", label: "미용", Icon: Scissors, color: "border-pink-400", bg: "bg-pink-50", text: "text-pink-600" },
    { key: "vet", label: "병원", Icon: Stethoscope, color: "border-red-400", bg: "bg-red-50", text: "text-red-600" },
    { key: "custom", label: "기타", Icon: Bell, color: "border-gray-400", bg: "bg-gray-50", text: "text-gray-600" },
] as const;

/** 반복 타입 옵션 */
const REPEAT_OPTIONS = [
    { value: "daily", label: "매일" },
    { value: "weekly", label: "매주" },
    { value: "monthly", label: "매월" },
    { value: "once", label: "한번" },
];

// ============================================================================
// 유틸 함수
// ============================================================================

/** 리마인더 타입으로 설정 정보 찾기 */
function getTypeConfig(type: string) {
    return REMINDER_TYPES.find((t) => t.key === type) || REMINDER_TYPES[REMINDER_TYPES.length - 1];
}


// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function ReminderPanel({
    isOpen,
    onClose,
    petId,
    petName,
    isMemorialMode,
}: ReminderPanelProps) {
    // 상태 관리
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState<AddReminderForm>({
        type: "walk",
        title: "",
        time: "09:00",
        repeatType: "daily",
        dayOfWeek: 1,
        dayOfMonth: 1,
    });

    // ========================================================================
    // 데이터 로딩
    // ========================================================================

    const fetchReminders = useCallback(async () => {
        if (!petId) return;
        setIsLoading(true);
        try {
            const response = await authFetch(`${API.REMINDERS}?petId=${petId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch reminders");
            }
            const data = await response.json();
            if (data.reminders && Array.isArray(data.reminders)) {
                setReminders(data.reminders);
            }
        } catch {
            toast.error("알림을 불러오지 못했어요.");
        } finally {
            setIsLoading(false);
        }
    }, [petId]);

    useEffect(() => {
        if (isOpen && petId) {
            fetchReminders();
        }
    }, [isOpen, petId, fetchReminders]);

    // ========================================================================
    // 이벤트 핸들러
    // ========================================================================

    /** 알림 ON/OFF 토글 */
    const handleToggle = async (reminder: Reminder) => {
        const newEnabled = !reminder.enabled;
        setTogglingIds((prev) => new Set(prev).add(reminder.id));

        // Optimistic update
        setReminders((prev) =>
            prev.map((r) => (r.id === reminder.id ? { ...r, enabled: newEnabled } : r))
        );

        try {
            const response = await authFetch(API.REMINDER_DETAIL(reminder.id), {
                method: "PUT",
                body: JSON.stringify({ toggleEnabled: newEnabled }),
            });

            if (!response.ok) {
                throw new Error("Toggle failed");
            }
        } catch {
            // Rollback on error
            setReminders((prev) =>
                prev.map((r) => (r.id === reminder.id ? { ...r, enabled: !newEnabled } : r))
            );
            toast.error("알림 변경에 실패했어요.");
        } finally {
            setTogglingIds((prev) => {
                const next = new Set(prev);
                next.delete(reminder.id);
                return next;
            });
        }
    };

    /** 알림 삭제 */
    const handleDelete = async (reminderId: string) => {
        if (!confirm("이 알림을 삭제하시겠어요?")) return;

        setDeletingId(reminderId);
        try {
            const response = await authFetch(API.REMINDER_DETAIL(reminderId), {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Delete failed");
            }

            setReminders((prev) => prev.filter((r) => r.id !== reminderId));
            toast.success("알림이 삭제되었어요.");
        } catch {
            toast.error("알림 삭제에 실패했어요.");
        } finally {
            setDeletingId(null);
        }
    };

    /** 새 알림 추가 */
    const handleAddReminder = async () => {
        if (!form.title.trim()) {
            toast.error("알림 제목을 입력해주세요.");
            return;
        }

        setIsSubmitting(true);
        try {
            const scheduleData: Record<string, unknown> = {
                type: form.repeatType,
                time: form.time,
            };

            if (form.repeatType === "weekly") {
                scheduleData.dayOfWeek = form.dayOfWeek;
            }
            if (form.repeatType === "monthly") {
                scheduleData.dayOfMonth = form.dayOfMonth;
            }

            const response = await authFetch(API.REMINDERS, {
                method: "POST",
                body: JSON.stringify({
                    petId,
                    type: form.type,
                    title: form.title.trim(),
                    schedule: scheduleData,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to add reminder");
            }

            toast.success("알림이 추가되었어요!");
            setShowAddForm(false);
            setForm({
                type: "walk",
                title: "",
                time: "09:00",
                repeatType: "daily",
                dayOfWeek: 1,
                dayOfMonth: 1,
            });

            // 목록 새로고침
            fetchReminders();
        } catch {
            toast.error("알림 추가에 실패했어요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    /** 오버레이 클릭 시 닫기 */
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // ========================================================================
    // 렌더링
    // ========================================================================

    if (!isOpen) return null;

    // 테마 색상
    const themeAccent = isMemorialMode ? "amber" : "sky";
    const headerBg = isMemorialMode
        ? "bg-gradient-to-r from-amber-100 to-orange-100"
        : "bg-gradient-to-r from-sky-100 to-blue-100";
    const headerText = isMemorialMode ? "text-amber-800" : "text-sky-800";
    const headerIcon = isMemorialMode ? "text-amber-500" : "text-sky-500";

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={handleOverlayClick}
        >
            {/* 어두운 오버레이 */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

            {/* 바텀시트 패널 */}
            <div
                className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl animate-slide-up"
                style={{ maxHeight: "70vh" }}
            >
                {/* 드래그 핸들 */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                </div>

                {/* 헤더 */}
                <div className={`px-5 py-3 flex items-center justify-between ${headerBg} mx-3 rounded-xl`}>
                    <div className="flex items-center gap-2">
                        <Bell className={`w-5 h-5 ${headerIcon}`} />
                        <h2 className={`font-bold text-base ${headerText}`}>
                            {petName}의 케어 알림
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* 스크롤 가능한 본문 */}
                <div
                    className="overflow-y-auto px-4 py-3"
                    style={{ maxHeight: "calc(70vh - 140px)" }}
                >
                    {/* 로딩 상태 */}
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="animate-pulse flex items-center gap-3 p-4 rounded-xl bg-gray-100 dark:bg-gray-800"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                                        <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                                    </div>
                                    <div className="w-10 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
                                </div>
                            ))}
                        </div>
                    ) : reminders.length === 0 && !showAddForm ? (
                        /* 빈 상태 */
                        <div className="text-center py-10 px-4">
                            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                                isMemorialMode ? "bg-amber-100" : "bg-sky-100"
                            }`}>
                                <Bell className={`w-8 h-8 ${
                                    isMemorialMode ? "text-amber-400" : "text-sky-400"
                                }`} />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                등록된 알림이 없어요.
                                <br />
                                대화 중에 알림을 추가해보세요!
                            </p>
                        </div>
                    ) : (
                        /* 리마인더 목록 */
                        <div className="space-y-2">
                            {reminders.map((reminder) => {
                                const config = getTypeConfig(reminder.type);
                                const TypeIcon = config.Icon;
                                const isToggling = togglingIds.has(reminder.id);
                                const isDeleting = deletingId === reminder.id;

                                return (
                                    <div
                                        key={reminder.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-l-4 bg-white dark:bg-gray-800 shadow-sm transition-all ${
                                            config.color
                                        } ${isDeleting ? "opacity-50" : ""} ${
                                            !reminder.enabled ? "opacity-60" : ""
                                        }`}
                                    >
                                        {/* 타입 아이콘 */}
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                                            <TypeIcon className={`w-5 h-5 ${config.text}`} />
                                        </div>

                                        {/* 제목 + 스케줄 */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                                                {reminder.title}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {formatScheduleText(reminder.schedule)}
                                            </p>
                                        </div>

                                        {/* 토글 스위치 */}
                                        <button
                                            onClick={() => handleToggle(reminder)}
                                            disabled={isToggling}
                                            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                                                reminder.enabled
                                                    ? isMemorialMode
                                                        ? "bg-amber-500"
                                                        : "bg-sky-500"
                                                    : "bg-gray-300 dark:bg-gray-600"
                                            }`}
                                            aria-label={reminder.enabled ? "알림 끄기" : "알림 켜기"}
                                        >
                                            <div
                                                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                                                    reminder.enabled ? "translate-x-[22px]" : "translate-x-0.5"
                                                }`}
                                            />
                                        </button>

                                        {/* 삭제 버튼 */}
                                        <button
                                            onClick={() => handleDelete(reminder.id)}
                                            disabled={isDeleting}
                                            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                                            aria-label="알림 삭제"
                                        >
                                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 알림 추가 폼 */}
                    {showAddForm && (
                        <div className={`mt-4 p-4 rounded-xl border ${
                            isMemorialMode
                                ? "border-amber-200 bg-amber-50/50"
                                : "border-sky-200 bg-sky-50/50"
                        }`}>
                            <h3 className={`font-bold text-sm mb-3 ${
                                isMemorialMode ? "text-amber-800" : "text-sky-800"
                            }`}>
                                새 알림 추가
                            </h3>

                            {/* 타입 선택 (아이콘 그리드) */}
                            <div className="mb-3">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    종류
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {REMINDER_TYPES.map((typeOption) => {
                                        const OptionIcon = typeOption.Icon;
                                        const isSelected = form.type === typeOption.key;
                                        return (
                                            <button
                                                key={typeOption.key}
                                                onClick={() => setForm((prev) => ({ ...prev, type: typeOption.key }))}
                                                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-xs ${
                                                    isSelected
                                                        ? isMemorialMode
                                                            ? "border-amber-400 bg-amber-100"
                                                            : "border-sky-400 bg-sky-100"
                                                        : "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-600 hover:border-gray-300"
                                                }`}
                                            >
                                                <OptionIcon className={`w-5 h-5 ${isSelected ? typeOption.text : "text-gray-400"}`} />
                                                <span className={isSelected ? "font-medium text-gray-700" : "text-gray-500"}>
                                                    {typeOption.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 제목 입력 */}
                            <div className="mb-3">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    제목
                                </label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                                    placeholder="예: 아침 산책"
                                    maxLength={100}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-600 placeholder-gray-400"
                                />
                            </div>

                            {/* 시간 선택 */}
                            <div className="mb-3">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    시간
                                </label>
                                <input
                                    type="time"
                                    value={form.time}
                                    onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-600"
                                />
                            </div>

                            {/* 반복 설정 */}
                            <div className="mb-3">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    반복
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {REPEAT_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setForm((prev) => ({ ...prev, repeatType: option.value }))}
                                            className={`py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                                                form.repeatType === option.value
                                                    ? isMemorialMode
                                                        ? "border-amber-400 bg-amber-100 text-amber-700"
                                                        : "border-sky-400 bg-sky-100 text-sky-700"
                                                    : "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-500 hover:border-gray-300"
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 매주 선택 시: 요일 선택 */}
                            {form.repeatType === "weekly" && (
                                <div className="mb-3">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5 block">
                                        요일
                                    </label>
                                    <div className="flex gap-1.5">
                                        {DAY_LABELS.map((label, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setForm((prev) => ({ ...prev, dayOfWeek: idx }))}
                                                className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                                                    form.dayOfWeek === idx
                                                        ? isMemorialMode
                                                            ? "border-amber-400 bg-amber-100 text-amber-700"
                                                            : "border-sky-400 bg-sky-100 text-sky-700"
                                                        : "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-500 hover:border-gray-300"
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 매월 선택 시: 날짜 선택 */}
                            {form.repeatType === "monthly" && (
                                <div className="mb-3">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5 block">
                                        날짜
                                    </label>
                                    <select
                                        value={form.dayOfMonth}
                                        onChange={(e) => setForm((prev) => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-600"
                                    >
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                            <option key={day} value={day}>
                                                매월 {day}일
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* 버튼들 */}
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleAddReminder}
                                    disabled={isSubmitting || !form.title.trim()}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                                        isMemorialMode
                                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                            : "bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600"
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4" />
                                    )}
                                    추가하기
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 하단 추가 버튼 */}
                {!showAddForm && (
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                        <button
                            onClick={() => setShowAddForm(true)}
                            className={`w-full py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                isMemorialMode
                                    ? "bg-amber-100 hover:bg-amber-200 text-amber-700"
                                    : "bg-sky-100 hover:bg-sky-200 text-sky-700"
                            }`}
                        >
                            <Plus className="w-4 h-4" />
                            알림 추가하기
                        </button>
                    </div>
                )}
            </div>

            {/* slideUp 애니메이션: globals.css */}
        </div>
    );
}
