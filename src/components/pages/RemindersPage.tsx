/**
 * RemindersPage.tsx
 * 반려동물 케어 리마인더 관리 페이지
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { usePets } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    PawPrint,
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
    LogIn,
    X,
} from "lucide-react";
import PawLoading, { FullPageLoading } from "@/components/ui/PawLoading";

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
    pet?: {
        id: string;
        name: string;
        type: string;
        profileImage?: string;
    };
}

const REMINDER_TYPES = [
    { value: "walk", label: "산책", icon: Footprints, color: "text-green-500" },
    { value: "meal", label: "식사", icon: UtensilsCrossed, color: "text-orange-500" },
    { value: "medicine", label: "약/영양제", icon: Pill, color: "text-blue-500" },
    { value: "vaccine", label: "예방접종", icon: Syringe, color: "text-purple-500" },
    { value: "grooming", label: "미용/목욕", icon: Scissors, color: "text-pink-500" },
    { value: "vet", label: "병원", icon: Stethoscope, color: "text-red-500" },
    { value: "custom", label: "기타", icon: Bell, color: "text-gray-500" },
];

const SCHEDULE_TYPES = [
    { value: "daily", label: "매일" },
    { value: "weekly", label: "매주" },
    { value: "monthly", label: "매월" },
    { value: "once", label: "1회" },
];

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export default function RemindersPage() {
    const { user, loading: authLoading } = useAuth();
    const { pets, selectedPetId, isLoading: petsLoading } = usePets();

    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 새 리마인더 폼 상태
    const [newReminder, setNewReminder] = useState({
        petId: "",
        type: "walk",
        title: "",
        description: "",
        scheduleType: "daily",
        time: "09:00",
        dayOfWeek: 1,
        dayOfMonth: 1,
        date: "",
    });

    // 리마인더 목록 불러오기
    const fetchReminders = useCallback(async () => {
        if (!user?.id) return;

        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedPetId) {
                params.append("petId", selectedPetId);
            }

            const response = await fetch(`/api/reminders?${params}`, {
                credentials: "include", // 쿠키 포함 (인증)
            });

            // 인증 실패 등 에러는 무시 (상태 변경 안 함 - 무한 루프 방지)
            if (!response.ok) {
                if (response.status !== 401) {
                    toast.error("리마인더를 불러오지 못했습니다");
                }
                return;
            }

            const data = await response.json();
            if (data.reminders) {
                setReminders(data.reminders);
            }
        } catch {
            toast.error("리마인더 로딩 중 오류가 발생했습니다");
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, selectedPetId]);

    useEffect(() => {
        fetchReminders();
    }, [fetchReminders]);

    // 모달 열 때 기본값 설정
    useEffect(() => {
        if (isModalOpen && selectedPetId) {
            setNewReminder(prev => ({ ...prev, petId: selectedPetId }));
        }
    }, [isModalOpen, selectedPetId]);

    // 리마인더 생성
    const handleCreateReminder = async () => {
        if (!user?.id || !newReminder.petId || !newReminder.title) return;

        try {
            const response = await fetch("/api/reminders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    petId: newReminder.petId,
                    type: newReminder.type,
                    title: newReminder.title,
                    description: newReminder.description,
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
                toast.success("리마인더가 생성되었습니다");
                setIsModalOpen(false);
                setNewReminder({
                    petId: selectedPetId || "",
                    type: "walk",
                    title: "",
                    description: "",
                    scheduleType: "daily",
                    time: "09:00",
                    dayOfWeek: 1,
                    dayOfMonth: 1,
                    date: "",
                });
                fetchReminders();
            } else {
                toast.error("리마인더 생성에 실패했습니다");
            }
        } catch {
            toast.error("리마인더 생성 중 오류가 발생했습니다");
        }

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
            } else {
                toast.error("리마인더 상태 변경에 실패했습니다");
            }
        } catch {
            toast.error("리마인더 변경 중 오류가 발생했습니다");
        }
    };

    // 리마인더 삭제
    const handleDelete = async (id: string) => {
        toast("이 리마인더를 삭제할까요?", {
            action: {
                label: "삭제",
                onClick: async () => {
                    try {
                        const response = await fetch(`/api/reminders/${id}`, {
                            method: "DELETE",
                        });

                        if (response.ok) {
                            setReminders(prev => prev.filter(r => r.id !== id));
                            toast.success("리마인더가 삭제되었습니다");
                        } else {
                            toast.error("삭제에 실패했습니다");
                        }
                    } catch {
                        toast.error("삭제 중 오류가 발생했습니다");
                    }
                },
            },
            cancel: {
                label: "취소",
                onClick: () => {},
            },
        });
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

    // 로딩 화면 완전 제거 - 떨림 방지

    if (!user) {
        return (
            <div className="min-h-screen relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white" />
                <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center mb-6">
                        <LogIn className="w-12 h-12 text-[#05B2DC]" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        로그인이 필요해요
                    </h2>
                    <p className="text-gray-500 text-center mb-6">
                        리마인더를 설정하려면<br />먼저 로그인해주세요
                    </p>
                    <Button
                        onClick={() => window.dispatchEvent(new CustomEvent("openAuthModal"))}
                        className="bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#05B2DC] text-white px-8"
                    >
                        <LogIn className="w-4 h-4 mr-2" />
                        로그인하기
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white">
            {/* 헤더 */}
            <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 px-4 py-3 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-[#05B2DC]" />
                        <h1 className="font-semibold text-gray-800">케어 리마인더</h1>
                    </div>

                    <Button
                        size="sm"
                        onClick={() => setIsModalOpen(true)}
                        className="bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#05B2DC] text-white"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        리마인더 추가
                    </Button>
                </div>
            </div>

            {/* 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsModalOpen(false)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-2xl">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                                <Bell className="w-5 h-5 text-[#05B2DC]" />
                                새 리마인더
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* 반려동물 선택 */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    반려동물
                                </label>
                                <Select
                                    value={newReminder.petId}
                                    onValueChange={(v) => setNewReminder(prev => ({ ...prev, petId: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="선택하세요" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pets.map(pet => (
                                            <SelectItem key={pet.id} value={pet.id}>
                                                <span className="flex items-center gap-2">
                                                    <PawPrint className="w-4 h-4" />
                                                    {pet.name}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* 리마인더 타입 */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    타입
                                </label>
                                <Select
                                    value={newReminder.type}
                                    onValueChange={(v) => setNewReminder(prev => ({ ...prev, type: v }))}
                                >
                                    <SelectTrigger>
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

                            {/* 제목 */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    제목
                                </label>
                                <Input
                                    value={newReminder.title}
                                    onChange={(e) => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="예: 아침 산책"
                                />
                            </div>

                            {/* 스케줄 타입 */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    반복
                                </label>
                                <Select
                                    value={newReminder.scheduleType}
                                    onValueChange={(v) => setNewReminder(prev => ({ ...prev, scheduleType: v }))}
                                >
                                    <SelectTrigger>
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

                            {/* 시간 */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    시간
                                </label>
                                <Input
                                    type="time"
                                    value={newReminder.time}
                                    onChange={(e) => setNewReminder(prev => ({ ...prev, time: e.target.value }))}
                                />
                            </div>

                            {/* 요일 선택 (weekly) */}
                            {newReminder.scheduleType === "weekly" && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                        요일
                                    </label>
                                    <Select
                                        value={String(newReminder.dayOfWeek)}
                                        onValueChange={(v) => setNewReminder(prev => ({ ...prev, dayOfWeek: parseInt(v) }))}
                                    >
                                        <SelectTrigger>
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

                            {/* 날짜 선택 (monthly) */}
                            {newReminder.scheduleType === "monthly" && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                        날짜
                                    </label>
                                    <Select
                                        value={String(newReminder.dayOfMonth)}
                                        onValueChange={(v) => setNewReminder(prev => ({ ...prev, dayOfMonth: parseInt(v) }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                                <SelectItem key={day} value={String(day)}>
                                                    {day}일
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* 특정 날짜 (once) */}
                            {newReminder.scheduleType === "once" && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                        날짜
                                    </label>
                                    <Input
                                        type="date"
                                        value={newReminder.date}
                                        onChange={(e) => setNewReminder(prev => ({ ...prev, date: e.target.value }))}
                                    />
                                </div>
                            )}

                            {/* 생성 버튼 */}
                            <Button
                                onClick={handleCreateReminder}
                                disabled={!newReminder.petId || !newReminder.title}
                                className="w-full bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#05B2DC] text-white"
                            >
                                리마인더 추가
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 리마인더 목록 */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <PawLoading size="lg" text="리마인더 불러오는 중..." />
                    </div>
                ) : reminders.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-600 mb-2">
                            리마인더가 없어요
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                            산책, 식사, 약 시간 등을 잊지 않도록<br />리마인더를 설정해보세요
                        </p>
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            variant="outline"
                            className="border-[#05B2DC] text-[#05B2DC] hover:bg-[#E0F7FF]"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            첫 리마인더 만들기
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {reminders.map(reminder => {
                            const typeInfo = getTypeInfo(reminder.type);
                            const TypeIcon = typeInfo.icon;

                            return (
                                <div
                                    key={reminder.id}
                                    className={`bg-white rounded-xl p-4 shadow-sm border transition-all ${
                                        reminder.enabled
                                            ? "border-gray-100"
                                            : "border-gray-200 opacity-60"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* 아이콘 */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            reminder.enabled ? "bg-[#E0F7FF]" : "bg-gray-100"
                                        }`}>
                                            <TypeIcon className={`w-5 h-5 ${
                                                reminder.enabled ? typeInfo.color : "text-gray-400"
                                            }`} />
                                        </div>

                                        {/* 내용 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-gray-800 truncate">
                                                    {reminder.title}
                                                </span>
                                                {reminder.pet && (
                                                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                                        {reminder.pet.name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <CalendarDays className="w-3.5 h-3.5" />
                                                <span>{getScheduleText(reminder.schedule)}</span>
                                            </div>
                                        </div>

                                        {/* 액션 버튼들 */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleToggle(reminder.id, reminder.enabled)}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    reminder.enabled
                                                        ? "text-[#05B2DC] hover:bg-[#E0F7FF]"
                                                        : "text-gray-400 hover:bg-gray-100"
                                                }`}
                                                title={reminder.enabled ? "비활성화" : "활성화"}
                                            >
                                                {reminder.enabled ? (
                                                    <ToggleRight className="w-5 h-5" />
                                                ) : (
                                                    <ToggleLeft className="w-5 h-5" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(reminder.id)}
                                                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                title="삭제"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
