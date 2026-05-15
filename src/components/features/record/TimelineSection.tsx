/**
 * TimelineSection.tsx
 * 타임라인 일기 섹션 - useTimeline()으로 분리된 context 사용
 *
 * RecordPage에서 추출한 독립 컴포넌트
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useTimeline, usePets } from "@/contexts/PetContext";
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
    Search,
    FileText,
    AlertTriangle,
    Info,
    Stethoscope,
} from "lucide-react";
import KakaoShareButton from "@/components/common/KakaoShareButton";
import { TIMELINE_CATEGORY_OPTIONS, type TimelineCategory } from "@/types";
import TimelineExportModal from "./TimelineExportModal";
import { getTopPattern } from "@/lib/agent/timeline-patterns";

interface TimelineSectionProps {
    petId: string;
    petName: string;
}

export default function TimelineSection({ petId, petName }: TimelineSectionProps) {
    const { timeline, fetchTimeline, addTimelineEntry, updateTimelineEntry, deleteTimelineEntry } = useTimeline();
    const { pets } = usePets();
    const { user } = useAuth();
    const currentPet = pets.find((p) => p.id === petId);
    const petPhotos = currentPet?.photos ?? [];
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        title: "",
        content: "",
        mood: "normal" as "happy" | "normal" | "sad" | "sick",
        category: "" as TimelineCategory | "",
        mediaIds: [] as string[],
        tags: [] as string[],
    });
    const [tagInput, setTagInput] = useState("");
    // 검색/필터 (블로그 글이 약속한 "검색 용이")
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState<TimelineCategory | "">("");

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
            category: "",
            mediaIds: [],
            tags: [],
        });
        setTagInput("");
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
            category: (entry.category as TimelineCategory) || "",
            mediaIds: entry.mediaIds || [],
            tags: entry.tags || [],
        });
        setTagInput("");
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
                category: formData.category || undefined,
                mediaIds: formData.mediaIds.length > 0 ? formData.mediaIds : undefined,
                tags: formData.tags.length > 0 ? formData.tags : undefined,
            });
            toast.success("일기가 수정되었습니다");
        } else {
            const result = await addTimelineEntry(petId, {
                date: formData.date,
                title: formData.title,
                content: formData.content,
                mood: formData.mood,
                category: formData.category || undefined,
                mediaIds: formData.mediaIds.length > 0 ? formData.mediaIds : undefined,
                tags: formData.tags.length > 0 ? formData.tags : undefined,
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

    // 패턴 분석 (블로그 글 약속: 조기 건강 신호 감지)
    const topPattern = useMemo(() => getTopPattern(timeline), [timeline]);

    // 사용자가 X로 닫은 패턴은 24시간 동안 숨김 (UI 배너 vs AI 멘트 채널 분리)
    // - UI 배너: 영구 표시. 사용자가 X 누르면 24h dismiss
    // - AI 멘트: chat-pipeline 코드 레벨 dedup (최근 5턴 동일 패턴 검출)
    const [patternDismissed, setPatternDismissed] = useState(false);
    useEffect(() => {
        if (!topPattern) {
            setPatternDismissed(false);
            return;
        }
        try {
            const key = `timeline_pattern_dismiss_${petId}_${topPattern.code}`;
            const ts = localStorage.getItem(key);
            if (ts) {
                const dismissedAt = parseInt(ts, 10);
                if (!isNaN(dismissedAt) && Date.now() - dismissedAt < 24 * 60 * 60 * 1000) {
                    setPatternDismissed(true);
                    return;
                }
            }
            setPatternDismissed(false);
        } catch { /* localStorage 비활성 환경 무시 */ }
    }, [topPattern, petId]);

    const handleDismissPattern = () => {
        if (!topPattern) return;
        try {
            const key = `timeline_pattern_dismiss_${petId}_${topPattern.code}`;
            localStorage.setItem(key, String(Date.now()));
            setPatternDismissed(true);
        } catch { /* 저장 실패 시 일시적으로만 닫힘 */ setPatternDismissed(true); }
    };

    // 검색 + 카테고리 필터 적용된 timeline (블로그 글이 약속한 검색)
    // 태그 검색: #으로 시작하면 태그 우선 매치
    const filteredTimeline = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const tagQuery = q.startsWith("#") ? q.slice(1) : null;
        return timeline.filter((entry) => {
            if (filterCategory && entry.category !== filterCategory) return false;
            if (q) {
                if (tagQuery) {
                    // 태그 검색: 정확 매치 우선
                    if (!entry.tags?.some((t) => t.toLowerCase().includes(tagQuery))) return false;
                } else {
                    const inTitle = entry.title.toLowerCase().includes(q);
                    const inContent = (entry.content || "").toLowerCase().includes(q);
                    const inTags = entry.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
                    if (!inTitle && !inContent && !inTags) return false;
                }
            }
            return true;
        });
    }, [timeline, searchQuery, filterCategory]);

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
                    <div className="flex gap-1.5">
                        {timeline.length > 0 && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsExportOpen(true)}
                                className="border-memento-500 text-memento-600 hover:bg-memento-50"
                                title="수의사 상담용으로 내보내기"
                            >
                                <FileText className="w-4 h-4 mr-1" />
                                내보내기
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={openAddModal}
                            className="bg-memento-500 hover:bg-memento-600"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            일기 쓰기
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* AI 패턴 분석 배너 (블로그 글 약속: 조기 건강 신호 감지) */}
                    {topPattern && !patternDismissed && (
                        <div className={`mb-4 p-3 rounded-xl border flex items-start gap-2.5 ${
                            topPattern.severity === "alert"
                                ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800"
                                : topPattern.severity === "warn"
                                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                        }`}>
                            <div className="flex-shrink-0 mt-0.5">
                                {topPattern.severity === "alert" ? (
                                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                ) : topPattern.severity === "warn" ? (
                                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                ) : (
                                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className={`text-sm font-medium ${
                                    topPattern.severity === "alert"
                                        ? "text-rose-800 dark:text-rose-200"
                                        : topPattern.severity === "warn"
                                            ? "text-amber-800 dark:text-amber-200"
                                            : "text-blue-800 dark:text-blue-200"
                                }`}>
                                    {topPattern.message}
                                </p>
                                {topPattern.needsVetConsult && (
                                    <p className="text-xs mt-1 flex items-center gap-1 text-rose-700 dark:text-rose-300">
                                        <Stethoscope className="w-3 h-3" />
                                        수의사 상담 권장 — 위 &lsquo;내보내기&rsquo; 버튼으로 기록을 정리해 가세요
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={handleDismissPattern}
                                aria-label="패턴 알림 닫기 (24시간)"
                                className="flex-shrink-0 p-1 -m-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition"
                            >
                                <X className={`w-4 h-4 ${
                                    topPattern.severity === "alert"
                                        ? "text-rose-600 dark:text-rose-400"
                                        : topPattern.severity === "warn"
                                            ? "text-amber-600 dark:text-amber-400"
                                            : "text-blue-600 dark:text-blue-400"
                                }`} />
                            </button>
                        </div>
                    )}

                    {/* 검색 + 카테고리 필터 (블로그 글이 약속한 "검색 용이") */}
                    {timeline.length > 0 && (
                        <div className="space-y-2 mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="키워드 검색 (제목·내용)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                                <button
                                    onClick={() => setFilterCategory("")}
                                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${
                                        filterCategory === ""
                                            ? "bg-memento-500 text-white"
                                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                                    }`}
                                >
                                    전체
                                </button>
                                {TIMELINE_CATEGORY_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setFilterCategory(opt.value)}
                                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${
                                            filterCategory === opt.value
                                                ? "bg-memento-500 text-white"
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                                        }`}
                                    >
                                        {opt.value}
                                    </button>
                                ))}
                            </div>
                            {(searchQuery || filterCategory) && (
                                <p className="text-xs text-gray-500">
                                    {filteredTimeline.length}개 결과
                                    {filteredTimeline.length === 0 && " · 검색 조건을 바꿔보세요"}
                                </p>
                            )}
                        </div>
                    )}
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
                            {filteredTimeline.map((entry) => {
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
                                                            : "bg-memento-200 text-memento-700 dark:bg-memento-900/30 dark:text-memento-400"
                                                        }`}>
                                                            {entry.category}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <KakaoShareButton
                                                        shareParams={{
                                                            title: `${petName}의 일기 - ${entry.title}`,
                                                            description: entry.content?.slice(0, 100) || "",
                                                            pageUrl: "/",
                                                        }}
                                                        size="md"
                                                    />
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
                                            {/* 태그 칩 */}
                                            {entry.tags && entry.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {entry.tags.map((t) => (
                                                        <span
                                                            key={t}
                                                            className="text-[11px] text-memento-700 dark:text-memento-300 bg-memento-100/70 dark:bg-memento-900/30 px-2 py-0.5 rounded-full cursor-pointer hover:bg-memento-200"
                                                            onClick={() => setSearchQuery(`#${t}`)}
                                                            title="이 태그로 검색"
                                                        >
                                                            #{t}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {/* 첨부 사진 썸네일 */}
                                            {entry.mediaIds && entry.mediaIds.length > 0 && petPhotos.length > 0 && (
                                                <div className="flex gap-1.5 mt-2 flex-wrap">
                                                    {entry.mediaIds
                                                        .map((mid) => petPhotos.find((p) => p.id === mid))
                                                        .filter((p): p is typeof petPhotos[0] => !!p)
                                                        .slice(0, 4)
                                                        .map((photo) => (
                                                            <div key={photo.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                                                <Image
                                                                    src={photo.url}
                                                                    alt=""
                                                                    fill
                                                                    sizes="64px"
                                                                    className="object-cover"
                                                                    unoptimized
                                                                />
                                                            </div>
                                                        ))}
                                                </div>
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
                                    placeholder="오늘 있었던 일을 기록해보세요... (예: 사료 절반 먹음 / 산책 30분 / 평소보다 잠 많이 잠)"
                                    rows={4}
                                    className="mt-1"
                                />
                            </div>

                            {/* 사진 첨부 (선택) — 펫의 기존 사진 중 골라서 일기에 연결 */}
                            {petPhotos.length > 0 && (
                                <div>
                                    <Label>
                                        사진 첨부 <span className="text-xs text-gray-400 font-normal">(선택 · {formData.mediaIds.length}/4)</span>
                                    </Label>
                                    <div className="grid grid-cols-4 gap-1.5 mt-1.5 max-h-40 overflow-y-auto">
                                        {petPhotos.slice(0, 24).map((p) => {
                                            const selected = formData.mediaIds.includes(p.id);
                                            const reachedMax = !selected && formData.mediaIds.length >= 4;
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    disabled={reachedMax}
                                                    onClick={() => setFormData((prev) => ({
                                                        ...prev,
                                                        mediaIds: selected
                                                            ? prev.mediaIds.filter((x) => x !== p.id)
                                                            : [...prev.mediaIds, p.id],
                                                    }))}
                                                    className={`relative aspect-square rounded-md overflow-hidden border-2 transition ${
                                                        selected
                                                            ? "border-memento-500 ring-2 ring-memento-200"
                                                            : reachedMax
                                                                ? "border-gray-200 opacity-40 cursor-not-allowed"
                                                                : "border-gray-200 hover:border-gray-300"
                                                    }`}
                                                >
                                                    <Image
                                                        src={p.url}
                                                        alt=""
                                                        fill
                                                        sizes="80px"
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                    {selected && (
                                                        <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-memento-500 text-white flex items-center justify-center">
                                                            <Check className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 카테고리 선택 (블로그 글이 약속한 사료/배변/행동 분류) */}
                            <div>
                                <Label>카테고리 <span className="text-xs text-gray-400 font-normal">(선택)</span></Label>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setFormData((prev) => ({ ...prev, category: "" }))}
                                        className={`text-xs px-2.5 py-1 rounded-full border transition ${
                                            formData.category === ""
                                                ? "bg-gray-200 dark:bg-gray-700 border-gray-300 text-gray-700 dark:text-gray-200"
                                                : "border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100"
                                        }`}
                                    >
                                        없음
                                    </button>
                                    {TIMELINE_CATEGORY_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setFormData((prev) => ({ ...prev, category: opt.value }))}
                                            className={`text-xs px-2.5 py-1 rounded-full border transition ${
                                                formData.category === opt.value
                                                    ? "bg-memento-500 text-white border-memento-500"
                                                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-memento-50 dark:hover:bg-memento-900/20"
                                            }`}
                                            title={opt.description}
                                        >
                                            {opt.value}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 태그 입력 (자유 키워드, 검색·필터 보조) */}
                            <div>
                                <Label>
                                    태그 <span className="text-xs text-gray-400 font-normal">(선택 · 최대 8개)</span>
                                </Label>
                                <div className="flex gap-1.5 mt-1.5">
                                    <Input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === ",") {
                                                e.preventDefault();
                                                const t = tagInput.trim().replace(/,/g, "");
                                                if (t && !formData.tags.includes(t) && formData.tags.length < 8) {
                                                    setFormData((prev) => ({ ...prev, tags: [...prev.tags, t] }));
                                                    setTagInput("");
                                                }
                                            }
                                        }}
                                        placeholder="예: 산책, 친구만남 (Enter로 추가)"
                                        className="flex-1"
                                        maxLength={20}
                                    />
                                </div>
                                {formData.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {formData.tags.map((t) => (
                                            <span
                                                key={t}
                                                className="inline-flex items-center gap-1 text-xs bg-memento-100 dark:bg-memento-900/30 text-memento-700 dark:text-memento-300 px-2 py-1 rounded-full"
                                            >
                                                #{t}
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData((prev) => ({
                                                        ...prev,
                                                        tags: prev.tags.filter((x) => x !== t),
                                                    }))}
                                                    className="hover:text-rose-600"
                                                    aria-label={`${t} 태그 제거`}
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
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

            {/* 수의사 상담용 내보내기 모달 — 전체 timeline 전달 (모달 내부에서 자체 기간/카테고리 필터) */}
            <TimelineExportModal
                isOpen={isExportOpen}
                onClose={() => setIsExportOpen(false)}
                petName={petName}
                petBreed={currentPet?.breed}
                petAge={
                    currentPet?.birthday
                        ? (() => {
                            const birth = new Date(currentPet.birthday);
                            const now = new Date();
                            const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
                            if (months < 12) return `${months}개월령`;
                            const years = Math.floor(months / 12);
                            const rem = months % 12;
                            return rem > 0 ? `${years}살 ${rem}개월령` : `${years}살`;
                        })()
                        : undefined
                }
                timeline={timeline}
            />
        </>
    );
}
