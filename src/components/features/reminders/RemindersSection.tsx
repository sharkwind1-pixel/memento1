/**
 * RemindersSection.tsx
 * 우리의 기록 페이지 내 케어 리마인더 섹션
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Bell,
    Plus,
    Clock,
    Footprints,
    Pill,
    Syringe,
    Scissors,
    Stethoscope,
    UtensilsCrossed,
    Trash2,
    ToggleLeft,
    ToggleRight,
    CalendarDays,
    X,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import PawLoading from "@/components/ui/PawLoading";

interface Reminder {
    id: string;
    petId: string;
    type: string;
    title: string;
    description?: string;
    schedule: {
        type: string;
        time: string;
        dayOfWeek?: number;
        dayOfMonth?: number;
        date?: string;
    };
    enabled: boolean;
}

const REMINDER_TYPES = [
    { value: "walk", label: "산책", icon: Footprints, color: "text-green-500", bg: "bg-green-50" },
    { value: "meal", label: "식사", icon: UtensilsCrossed, color: "text-orange-500", bg: "bg-orange-50" },
    { value: "medicine", label: "약/영양제", icon: Pill, color: "text-blue-500", bg: "bg-blue-50" },
    { value: "vaccine", label: "예방접종", icon: Syringe, color: "text-purple-500", bg: "bg-purple-50" },
    { value: "grooming", label: "미용/목욕", icon: Scissors, color: "text-pink-500", bg: "bg-pink-50" },
    { value: "vet", label: "병원", icon: Stethoscope, color: "text-red-500", bg: "bg-red-50" },
    { value: "custom", label: "기타", icon: Bell, color: "text-gray-500", bg: "bg-gray-50" },
];

const SCHEDULE_TYPES = [
    { value: "daily", label: "매일" },
    { value: "weekly", label: "매주" },
    { value: "monthly", label: "매월" },
    { value: "once", label: "1회" },
];

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

interface RemindersSectionProps {
    petId: string;
    petName: string;
}

export default function RemindersSection({ petId, petName }: RemindersSectionProps) {
    const { user } = useAuth();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    // 새 리마인더 폼 상태
    const [newReminder, setNewReminder] = useState({
        type: "walk",
        title: "",
        scheduleType: "daily",
        time: "09:00",
        dayOfWeek: 1,
        dayOfMonth: 1,
        date: "",
    });

    // 리마인더 목록 불러오기
    const fetchReminders = useCallback(async () => {
        if (!user?.id || !petId) return;

        setIsLoading(true);
        try {
            const params = new URLSearchParams({ petId });
            const response = await fetch(`/api/reminders?${params}`, {
                credentials: "include", // 쿠키 포함 (인증)
            });

            // 인증 실패 등 에러는 빈 배열 처리
            if (!response.ok) {
                setReminders([]);
                return;
            }

            const data = await response.json();
            if (data.reminders) {
                setReminders(data.reminders);
            }
        } catch {
            setReminders([]);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, petId]);

    useEffect(() => {
        fetchReminders();
    }, [fetchReminders]);

    // 리마인더 생성
    const handleCreateReminder = async () => {
        if (!user?.id || !petId || !newReminder.title) return;

        try {
            const response = await fetch("/api/reminders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    petId,
                    type: newReminder.type,
                    title: newReminder.title,
                    schedule: {
                        type: newReminder.scheduleType,
                        time: newReminder.time,
                        dayOfWeek: newReminder.scheduleType === "weekly" ? newReminder.dayOfWeek : undefined,
                        dayOfMonth: newReminder.scheduleType === "monthly" ? newReminder.dayOfMonth : undefined,
                        date: newReminder.scheduleType === "once" ? newReminder.date : undefined,
                    },
                }),
            });

            if (response.ok) {
                setShowAddForm(false);
                setNewReminder({
                    type: "walk",
                    title: "",
                    scheduleType: "daily",
                    time: "09:00",
                    dayOfWeek: 1,
                    dayOfMonth: 1,
                    date: "",
                });
                fetchReminders();
            }
        } catch {}

    };

    // 리마인더 토글
    const handleToggle = async (id: string, currentEnabled: boolean) => {
        try {
            const response = await fetch(`/api/reminders/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ toggleEnabled: !currentEnabled }),
            });

            if (response.ok) {
                setReminders(prev =>
                    prev.map(r => r.id === id ? { ...r, enabled: !currentEnabled } : r)
                );
            }
        } catch {}

    };

    // 리마인더 삭제
    const handleDelete = async (id: string) => {
        if (!confirm("이 리마인더를 삭제할까요?")) return;

        try {
            const response = await fetch(`/api/reminders/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setReminders(prev => prev.filter(r => r.id !== id));
            }
        } catch {}

    };

    // 타입에 따른 아이콘 반환
    const getTypeInfo = (type: string) => {
        return REMINDER_TYPES.find(t => t.value === type) || REMINDER_TYPES[6];
    };

    // 스케줄 설명 생성
    const getScheduleText = (schedule: Reminder["schedule"]) => {
        const time = schedule.time?.slice(0, 5) || "00:00";

        switch (schedule.type) {
            case "daily":
                return `매일 ${time}`;
            case "weekly":
                return `매주 ${DAYS_OF_WEEK[schedule.dayOfWeek || 0]}요일 ${time}`;
            case "monthly":
                return `매월 ${schedule.dayOfMonth}일 ${time}`;
            case "once":
                return `${schedule.date} ${time}`;
            default:
                return time;
        }
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Bell className="w-5 h-5 text-[#05B2DC]" />
                        케어 리마인더
                        {reminders.length > 0 && (
                            <span className="text-sm font-normal text-gray-500">
                                ({reminders.filter(r => r.enabled).length}개 활성)
                            </span>
                        )}
                    </CardTitle>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="pt-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <PawLoading size="md" text="불러오는 중..." />
                        </div>
                    ) : (
                        <>
                            {/* 리마인더 목록 */}
                            {reminders.length > 0 ? (
                                <div className="space-y-2 mb-4">
                                    {reminders.map(reminder => {
                                        const typeInfo = getTypeInfo(reminder.type);
                                        const TypeIcon = typeInfo.icon;

                                        return (
                                            <div
                                                key={reminder.id}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                                    reminder.enabled
                                                        ? "border-gray-100 bg-white"
                                                        : "border-gray-200 bg-gray-50 opacity-60"
                                                }`}
                                            >
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${typeInfo.bg}`}>
                                                    <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm text-gray-800 truncate">
                                                        {reminder.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <CalendarDays className="w-3 h-3" />
                                                        {getScheduleText(reminder.schedule)}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleToggle(reminder.id, reminder.enabled)}
                                                        className={`p-1.5 rounded-lg transition-colors ${
                                                            reminder.enabled
                                                                ? "text-[#05B2DC] hover:bg-[#E0F7FF]"
                                                                : "text-gray-400 hover:bg-gray-100"
                                                        }`}
                                                    >
                                                        {reminder.enabled ? (
                                                            <ToggleRight className="w-5 h-5" />
                                                        ) : (
                                                            <ToggleLeft className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(reminder.id)}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-6 mb-4">
                                    <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">
                                        {petName}의 케어 알림을 설정해보세요
                                    </p>
                                </div>
                            )}

                            {/* 추가 폼 */}
                            {showAddForm ? (
                                <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-sm text-gray-700">새 리마인더</span>
                                        <button
                                            onClick={() => setShowAddForm(false)}
                                            className="p-1 hover:bg-gray-200 rounded-full"
                                        >
                                            <X className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">타입</label>
                                            <Select
                                                value={newReminder.type}
                                                onValueChange={(v) => setNewReminder(prev => ({ ...prev, type: v }))}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {REMINDER_TYPES.map(type => (
                                                        <SelectItem key={type.value} value={type.value}>
                                                            <span className="flex items-center gap-2">
                                                                <type.icon className={`w-4 h-4 ${type.color}`} />
                                                                {type.label}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">반복</label>
                                            <Select
                                                value={newReminder.scheduleType}
                                                onValueChange={(v) => setNewReminder(prev => ({ ...prev, scheduleType: v }))}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {SCHEDULE_TYPES.map(type => (
                                                        <SelectItem key={type.value} value={type.value}>
                                                            {type.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">제목</label>
                                        <Input
                                            value={newReminder.title}
                                            onChange={(e) => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder={`${petName} 아침 산책`}
                                            className="h-9"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">시간</label>
                                            <Input
                                                type="time"
                                                value={newReminder.time}
                                                onChange={(e) => setNewReminder(prev => ({ ...prev, time: e.target.value }))}
                                                className="h-9"
                                            />
                                        </div>

                                        {newReminder.scheduleType === "weekly" && (
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">요일</label>
                                                <Select
                                                    value={String(newReminder.dayOfWeek)}
                                                    onValueChange={(v) => setNewReminder(prev => ({ ...prev, dayOfWeek: parseInt(v) }))}
                                                >
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {DAYS_OF_WEEK.map((day, i) => (
                                                            <SelectItem key={i} value={String(i)}>
                                                                {day}요일
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {newReminder.scheduleType === "once" && (
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">날짜</label>
                                                <Input
                                                    type="date"
                                                    value={newReminder.date}
                                                    onChange={(e) => setNewReminder(prev => ({ ...prev, date: e.target.value }))}
                                                    className="h-9"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        onClick={handleCreateReminder}
                                        disabled={!newReminder.title}
                                        className="w-full bg-[#05B2DC] hover:bg-[#0891B2] text-white h-9"
                                    >
                                        추가하기
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowAddForm(true)}
                                    className="w-full border-dashed border-[#05B2DC] text-[#05B2DC] hover:bg-[#E0F7FF]"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    리마인더 추가
                                </Button>
                            )}
                        </>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
