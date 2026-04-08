/**
 * TimelineSection.tsx
 * 타임라인 일기 섹션 - useTimeline()으로 분리된 context 사용
 *
 * RecordPage에서 추출한 독립 컴포넌트
 */

"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTimeline } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus,
    Pencil,
    Trash2,
    X,
    Check,
    BookOpen,
    Clock,
} from "lucide-react";

interface TimelineSectionProps {
    petId: string;
    petName: string;
}

export default function TimelineSection({ petId, petName }: TimelineSectionProps) {
    const { timeline, fetchTimeline, addTimelineEntry, updateTimelineEntry, deleteTimelineEntry } = useTimeline();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        title: "",
        content: "",
        mood: "normal" as "happy" | "normal" | "sad" | "sick",
    });

    // 펫 변경 시 타임라인 로드
    useEffect(() => {
        if (petId) {
            fetchTimeline(petId);
        }
    }, [petId, fetchTimeline]);

    // 새 일기 작성 모달 열기
    const openAddModal = () => {
        setEditingEntryId(null);
        setFormData({
            date: new Date().toISOString().split("T")[0],
            title: "",
            content: "",
            mood: "normal",
        });
        setIsModalOpen(true);
    };

    // 수정 모달 열기
    const openEditModal = (entry: typeof timeline[0]) => {
        setEditingEntryId(entry.id);
        setFormData({
            date: entry.date,
            title: entry.title,
            content: entry.content || "",
            mood: entry.mood || "normal",
        });
        setIsModalOpen(true);
    };

    // 저장 (추가 또는 수정)
    const handleSave = async () => {
        if (!formData.title.trim()) {
            toast.error("제목을 입력해주세요");
            return;
        }

        if (editingEntryId) {
            await updateTimelineEntry(editingEntryId, {
                date: formData.date,
                title: formData.title,
                content: formData.content,
                mood: formData.mood,
            });
            toast.success("일기가 수정되었습니다");
        } else {
            const result = await addTimelineEntry(petId, {
                date: formData.date,
                title: formData.title,
                content: formData.content,
                mood: formData.mood,
            });

            if (!result) {
                toast.error("일기 저장에 실패했습니다. 다시 시도해주세요.");
                return;
            }
            toast.success("일기가 저장되었습니다");
        }

        setIsModalOpen(false);
        setEditingEntryId(null);
    };

    const handleDelete = async (entryId: string) => {
        toast("이 일기를 삭제할까요?", {
            action: {
                label: "삭제",
                onClick: async () => {
                    await deleteTimelineEntry(entryId);
                    toast.success("일기가 삭제되었습니다");
                },
            },
            cancel: {
                label: "취소",
                onClick: () => {},
            },
        });
    };

    // 비로그인 시 안내
    if (!user) {
        return (
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mt-6">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-memento-600" />
                        타임라인 일기
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-gray-500">
                        <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p>로그인하시면 매일의 일상을 기록할 수 있어요</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mt-6">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-memento-600" />
                        타임라인 일기
                        <span className="text-sm font-normal text-gray-500">
                            {timeline.length}개
                        </span>
                    </CardTitle>
                    <Button
                        size="sm"
                        onClick={openAddModal}
                        className="bg-memento-500 hover:bg-memento-600"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        일기 쓰기
                    </Button>
                </CardHeader>
                <CardContent>
                    {timeline.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="w-16 h-16 rounded-full bg-memento-100 dark:bg-memento-500/20 flex items-center justify-center mx-auto mb-4">
                                <BookOpen className="w-8 h-8 text-memento-600 dark:text-memento-400" />
                            </div>
                            <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-2">
                                아직 기록된 일기가 없어요
                            </h3>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                                오늘 하루를 기록해보세요
                            </p>
                            <Button
                                onClick={openAddModal}
                                variant="outline"
                                className="border-memento-500 text-memento-600 hover:bg-memento-100"
                            >
                                <Pencil className="w-4 h-4 mr-2" />
                                첫 일기 쓰기
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {timeline.map((entry) => {
                                return (
                                    <div
                                        key={entry.id}
                                        className="relative pl-6 pb-4 border-l-2 border-memento-500/30 last:pb-0"
                                    >
                                        {/* 타임라인 dot (카테고리별 색상) */}
                                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${
                                            entry.category === "건강" ? "bg-emerald-500"
                                            : entry.category === "기념일" || entry.category === "특별한날" ? "bg-rose-400"
                                            : entry.category === "여행" ? "bg-violet-500"
                                            : "bg-memento-500"
                                        }`} />

                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 group">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-500">
                                                        {entry.date}
                                                    </span>
                                                    {entry.category && (
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                            entry.category === "건강" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                            : entry.category === "기념일" || entry.category === "특별한날" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                                            : entry.category === "여행" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                                                            : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                                                        }`}>
                                                            {entry.category}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openEditModal(entry)}
                                                        className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-memento-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                        aria-label="일기 수정"
                                                    >
                                                        <Pencil className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(entry.id)}
                                                        className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        aria-label="일기 삭제"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                            <h4 className="font-medium text-gray-800 dark:text-white mb-1 line-clamp-2">
                                                {entry.title}
                                            </h4>
                                            {entry.content && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                                    {entry.content}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 일기 작성/수정 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full" role="dialog" aria-modal="true" aria-labelledby="timeline-modal-title">
                        <div className="flex items-center justify-between mb-4">
                            <h3 id="timeline-modal-title" className="text-lg font-semibold flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-memento-600" />
                                {editingEntryId ? "일기 수정" : `${petName}의 일기`}
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsModalOpen(false)}
                                aria-label="닫기"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label>날짜</Label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, date: e.target.value }))
                                    }
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label>제목 *</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                                    }
                                    placeholder="오늘의 한 줄"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label>내용</Label>
                                <Textarea
                                    value={formData.content}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, content: e.target.value }))
                                    }
                                    placeholder="오늘 있었던 일을 기록해보세요..."
                                    rows={4}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1"
                            >
                                <X className="w-4 h-4 mr-2" />
                                취소
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="flex-1 bg-memento-500 hover:bg-memento-600"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                {editingEntryId ? "수정" : "저장"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
