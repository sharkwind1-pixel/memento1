/**
 * TimelineExportModal
 *
 * 타임라인 일기를 수의사 상담용으로 내보내기.
 * 블로그/매거진 글 약속: "수의학적 상담의 핵심 정보 — 정확한 시기/빈도 데이터"
 *
 * 동작:
 * - 인쇄 친화적 레이아웃 (날짜순, 카테고리별, mood, 사진 url 텍스트)
 * - 기간 선택 (전체 / 최근 30일 / 최근 90일 / 최근 1년)
 * - 카테고리 필터
 * - "인쇄 / PDF로 저장" 버튼 → window.print()
 * - 추가 라이브러리 의존 없음 (html2canvas 등 X — 브라우저 기본 인쇄 활용)
 */

"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, X, Download, FileText } from "lucide-react";
import type { TimelineEntry } from "@/types";
import { TIMELINE_CATEGORY_OPTIONS, type TimelineCategory } from "@/types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    petName: string;
    petBreed?: string;
    petAge?: string;
    timeline: TimelineEntry[];
}

const PERIOD_OPTIONS = [
    { value: "all", label: "전체" },
    { value: "30", label: "최근 30일" },
    { value: "90", label: "최근 90일" },
    { value: "365", label: "최근 1년" },
] as const;

type PeriodValue = typeof PERIOD_OPTIONS[number]["value"];

export default function TimelineExportModal({ isOpen, onClose, petName, petBreed, petAge, timeline }: Props) {
    const [period, setPeriod] = useState<PeriodValue>("90");
    const [filterCategory, setFilterCategory] = useState<TimelineCategory | "">("");

    const filtered = useMemo(() => {
        let list = [...timeline];
        if (period !== "all") {
            const days = parseInt(period, 10);
            const since = new Date();
            since.setDate(since.getDate() - days);
            const sinceStr = since.toISOString().split("T")[0];
            list = list.filter((e) => e.date >= sinceStr);
        }
        if (filterCategory) {
            list = list.filter((e) => e.category === filterCategory);
        }
        // 최신순
        return list.sort((a, b) => (a.date < b.date ? 1 : -1));
    }, [timeline, period, filterCategory]);

    // 카테고리별 통계 (수의사 상담 시 빈도 정보)
    const categoryStats = useMemo(() => {
        const map = new Map<string, number>();
        filtered.forEach((e) => {
            const k = e.category || "분류 없음";
            map.set(k, (map.get(k) || 0) + 1);
        });
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    }, [filtered]);

    const moodStats = useMemo(() => {
        const map = new Map<string, number>();
        filtered.forEach((e) => {
            if (e.mood) map.set(e.mood, (map.get(e.mood) || 0) + 1);
        });
        return map;
    }, [filtered]);

    if (!isOpen) return null;

    const exportedAt = new Date().toLocaleDateString("ko-KR", {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

    function handlePrint() {
        // 브라우저 인쇄 다이얼로그 → "PDF로 저장" 옵션 선택 가능
        window.print();
    }

    function handleDownloadText() {
        // 평문 텍스트로 다운로드 (수의사에게 이메일 첨부 등)
        const lines: string[] = [];
        lines.push(`${petName}의 건강·생활 기록`);
        if (petBreed || petAge) lines.push(`${petBreed ?? ""} ${petAge ?? ""}`.trim());
        lines.push(`내보낸 시각: ${exportedAt}`);
        lines.push(`기간: ${PERIOD_OPTIONS.find((p) => p.value === period)?.label} · 총 ${filtered.length}건`);
        lines.push("");
        lines.push("[카테고리별 빈도]");
        categoryStats.forEach(([cat, count]) => lines.push(`  ${cat}: ${count}건`));
        lines.push("");
        lines.push("[일기 목록]");
        filtered.forEach((e) => {
            lines.push(`\n────────────────────────────────`);
            lines.push(`${e.date} ${e.mood ? `· 컨디션: ${e.mood}` : ""} ${e.category ? `· ${e.category}` : ""}`);
            lines.push(`제목: ${e.title}`);
            if (e.content) lines.push(`내용: ${e.content}`);
        });
        const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${petName}_기록_${new Date().toISOString().split("T")[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 print:bg-white print:p-0 print:items-start">
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto print:rounded-none print:max-h-none print:max-w-none print:w-full print:bg-white print:dark:bg-white print:text-black">
                {/* 컨트롤 영역 (인쇄 시 숨김) */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 z-10 print:hidden">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-memento-600" />
                            수의사 상담용 내보내기
                        </h2>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="닫기">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* 기간 + 카테고리 */}
                    <div className="space-y-2 mb-3">
                        <div className="flex gap-1.5 flex-wrap">
                            {PERIOD_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setPeriod(opt.value)}
                                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${
                                        period === opt.value
                                            ? "bg-memento-500 text-white"
                                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                            <button
                                onClick={() => setFilterCategory("")}
                                className={`text-xs px-2.5 py-1 rounded-full font-medium border transition ${
                                    filterCategory === ""
                                        ? "bg-gray-200 dark:bg-gray-700 border-gray-300 text-gray-700 dark:text-gray-200"
                                        : "border-gray-200 dark:border-gray-700 text-gray-500"
                                }`}
                            >
                                전체 카테고리
                            </button>
                            {TIMELINE_CATEGORY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setFilterCategory(opt.value)}
                                    className={`text-xs px-2.5 py-1 rounded-full font-medium border transition ${
                                        filterCategory === opt.value
                                            ? "bg-memento-500 text-white border-memento-500"
                                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                                    }`}
                                >
                                    {opt.value}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handlePrint} className="flex-1 bg-memento-500 hover:bg-memento-600">
                            <Printer className="w-4 h-4 mr-2" />
                            인쇄 / PDF 저장
                        </Button>
                        <Button onClick={handleDownloadText} variant="outline" className="flex-1">
                            <Download className="w-4 h-4 mr-2" />
                            텍스트 다운
                        </Button>
                    </div>
                </div>

                {/* 인쇄될 내용 */}
                <div className="p-6 print:p-8 print:text-black">
                    <div className="border-b border-gray-300 pb-4 mb-4">
                        <h1 className="text-2xl font-bold text-gray-900 print:text-black">
                            {petName}의 건강·생활 기록
                        </h1>
                        <p className="text-sm text-gray-600 mt-1 print:text-gray-700">
                            {petBreed && <span>{petBreed}</span>}
                            {petBreed && petAge && <span> · </span>}
                            {petAge && <span>{petAge}</span>}
                        </p>
                        <p className="text-xs text-gray-500 mt-2 print:text-gray-600">
                            내보낸 시각: {exportedAt} · 기간: {PERIOD_OPTIONS.find((p) => p.value === period)?.label} · 총 {filtered.length}건
                        </p>
                    </div>

                    {/* 통계 요약 */}
                    {filtered.length > 0 && (
                        <div className="mb-6 print:mb-8">
                            <h2 className="text-base font-semibold text-gray-800 mb-2 print:text-black">카테고리별 빈도</h2>
                            <div className="flex flex-wrap gap-2 text-xs">
                                {categoryStats.map(([cat, count]) => (
                                    <span key={cat} className="px-2 py-1 bg-gray-100 rounded text-gray-700 print:bg-gray-200 print:text-black">
                                        {cat}: {count}건
                                    </span>
                                ))}
                            </div>
                            {moodStats.size > 0 && (
                                <div className="flex flex-wrap gap-2 text-xs mt-2">
                                    {Array.from(moodStats.entries()).map(([mood, count]) => (
                                        <span key={mood} className="px-2 py-1 bg-amber-50 rounded text-amber-700 print:bg-gray-100 print:text-black">
                                            컨디션 {mood}: {count}건
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 일기 목록 */}
                    {filtered.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-12">선택한 기간/카테고리에 기록이 없습니다.</p>
                    ) : (
                        <div className="space-y-3">
                            {filtered.map((e) => (
                                <div
                                    key={e.id}
                                    className="border-l-2 border-memento-400 pl-3 py-1 break-inside-avoid print:border-l-gray-400"
                                >
                                    <div className="flex items-center gap-2 text-xs text-gray-500 print:text-gray-700">
                                        <span className="font-mono">{e.date}</span>
                                        {e.category && <span className="px-1.5 py-0.5 bg-memento-100 text-memento-700 rounded print:bg-gray-200 print:text-black">{e.category}</span>}
                                        {e.mood && <span>· 컨디션: {e.mood}</span>}
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-900 mt-1 print:text-black">{e.title}</h3>
                                    {e.content && (
                                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap print:text-gray-900">{e.content}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center print:text-gray-600">
                        메멘토애니 — 반려동물 일기·케어 기록 플랫폼
                    </div>
                </div>
            </div>
        </div>
    );
}
