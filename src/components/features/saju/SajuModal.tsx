/**
 * SajuModal — 반려 사주 (입양자용). window "openSaju" 이벤트로 열림.
 * 생년월일[+시각] 입력 → /api/saju (만세력 엔진 + GPT) → 4기둥·오행·띠 + 맞는 반려동물/이름/시기.
 * 톤: 재미로 보는 가벼운 안내, 이모지 없음. 헤더 transform 탈출 위해 body로 portal.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, RotateCcw } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";

interface PillarText { ko: string; hanja: string; }
interface SajuChartView {
    year: PillarText; month: PillarText; day: PillarText; hour: PillarText | null;
    elements: Record<string, number>;
    dayMasterElement: string;
    zodiac: string;
    knownTime: boolean;
}
interface SajuReading {
    summary?: string;
    matchPets?: { type: string; reason: string }[];
    naming?: { guide?: string; themes?: string[] };
    timing?: string;
}

const ELEMENT_COLOR: Record<string, string> = {
    목: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    화: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    토: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    금: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
    수: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

export default function SajuModal() {
    const [open, setOpen] = useState(false);
    const [phase, setPhase] = useState<"form" | "loading" | "result">("form");
    const [error, setError] = useState<string | null>(null);

    const [birth, setBirth] = useState("");        // YYYY-MM-DD
    const [gender, setGender] = useState<"남" | "여" | null>(null);
    const [knownTime, setKnownTime] = useState(false);
    const [time, setTime] = useState("");          // HH:MM

    const [chart, setChart] = useState<SajuChartView | null>(null);
    const [reading, setReading] = useState<SajuReading | null>(null);

    useEffect(() => {
        const onOpen = () => { setOpen(true); setPhase("form"); setError(null); };
        window.addEventListener("openSaju", onOpen);
        return () => window.removeEventListener("openSaju", onOpen);
    }, []);

    useEffect(() => {
        if (!open) return;
        const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("keydown", onEsc);
        return () => document.removeEventListener("keydown", onEsc);
    }, [open]);

    const reset = useCallback(() => {
        setPhase("form"); setChart(null); setReading(null); setError(null);
    }, []);

    const submit = useCallback(async () => {
        setError(null);
        if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) {
            setError("생년월일을 선택해주세요.");
            return;
        }
        const [y, m, d] = birth.split("-").map(Number);
        let hour: number | undefined, minute: number | undefined;
        if (knownTime) {
            if (!time || !/^\d{2}:\d{2}$/.test(time)) { setError("태어난 시각을 입력하거나 '시간 모름'을 선택해주세요."); return; }
            [hour, minute] = time.split(":").map(Number);
        }
        setPhase("loading");
        try {
            const res = await authFetch("/api/saju", {
                method: "POST",
                body: JSON.stringify({ year: y, month: m, day: d, hour, minute, knownTime, gender }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data?.error || "사주를 보지 못했어요."); setPhase("form"); return; }
            setChart(data.chart); setReading(data.reading); setPhase("result");
        } catch {
            setError("네트워크 문제로 사주를 보지 못했어요."); setPhase("form");
        }
    }, [birth, knownTime, time, gender]);

    if (!open || typeof document === "undefined") return null;

    const pillars = chart
        ? [
            { label: "시", p: chart.hour },
            { label: "일", p: chart.day },
            { label: "월", p: chart.month },
            { label: "년", p: chart.year },
        ]
        : [];

    return createPortal(
        <div
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="w-full sm:max-w-lg max-h-[92vh] bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="px-5 py-4 bg-gradient-to-r from-memento-500 to-memento-400 text-white flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        <h2 className="text-lg font-bold">반려 사주</h2>
                    </div>
                    <button onClick={() => setOpen(false)} aria-label="닫기" className="p-1 rounded-lg hover:bg-white/20">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-5">
                    {/* 폼 */}
                    {phase === "form" && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                재미로 보는 반려 사주예요. 생년월일을 넣으면 오행을 풀어 잘 맞는 반려동물과 이름,
                                만남에 좋은 시기를 살짝 짚어드려요.
                            </p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">생년월일</label>
                                <input
                                    type="date"
                                    value={birth}
                                    min="1900-01-01" max="2100-12-31"
                                    onChange={(e) => setBirth(e.target.value)}
                                    className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">성별 (선택)</label>
                                <div className="flex gap-2">
                                    {(["남", "여"] as const).map((g) => (
                                        <button
                                            key={g}
                                            onClick={() => setGender(gender === g ? null : g)}
                                            className={`flex-1 h-11 rounded-xl border text-sm font-medium transition ${
                                                gender === g
                                                    ? "bg-memento-500 text-white border-memento-500"
                                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                                            }`}
                                        >{g}</button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                                    <input type="checkbox" checked={knownTime} onChange={(e) => setKnownTime(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-memento-500 focus:ring-memento-500" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">태어난 시각을 알아요 (시주까지 봄)</span>
                                </label>
                                {knownTime && (
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    />
                                )}
                            </div>

                            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                            <button
                                onClick={submit}
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-memento-500 to-memento-400 text-white font-bold hover:from-memento-600 hover:to-memento-500 transition"
                            >사주 보기</button>
                            <p className="text-[11px] text-gray-400 text-center">한국 표준시 기준이에요. 가벼운 재미로 봐주세요.</p>
                        </div>
                    )}

                    {/* 로딩 */}
                    {phase === "loading" && (
                        <div className="py-16 text-center">
                            <Sparkles className="w-8 h-8 text-memento-400 mx-auto mb-3 animate-pulse" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">오행을 풀어보는 중이에요...</p>
                        </div>
                    )}

                    {/* 결과 */}
                    {phase === "result" && chart && (
                        <div className="space-y-5">
                            {/* 4기둥 */}
                            <div>
                                <div className="grid grid-cols-4 gap-2">
                                    {pillars.map(({ label, p }) => (
                                        <div key={label} className="text-center">
                                            <div className="text-[11px] text-gray-400 mb-1">{label}주</div>
                                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 bg-gray-50 dark:bg-gray-800">
                                                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{p ? p.hanja : "—"}</div>
                                                <div className="text-[11px] text-gray-500 dark:text-gray-400">{p ? p.ko : "시간모름"}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{chart.zodiac}띠 · 일간 {chart.dayMasterElement}</span>
                                    {Object.entries(chart.elements).map(([e, n]) => (
                                        <span key={e} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ELEMENT_COLOR[e] || "bg-gray-100 text-gray-600"}`}>{e} {n}</span>
                                    ))}
                                </div>
                            </div>

                            {reading?.summary && (
                                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed bg-memento-50 dark:bg-memento-900/20 rounded-xl p-3">
                                    {reading.summary}
                                </p>
                            )}

                            {reading?.matchPets && reading.matchPets.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">나와 잘 맞는 반려동물</h3>
                                    <div className="space-y-2">
                                        {reading.matchPets.map((m, i) => (
                                            <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3">
                                                <div className="text-sm font-semibold text-memento-600 dark:text-memento-400">{m.type}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.reason}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {reading?.naming && (reading.naming.guide || (reading.naming.themes && reading.naming.themes.length > 0)) && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">이름에 담으면 좋은 기운</h3>
                                    {reading.naming.guide && (
                                        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{reading.naming.guide}</p>
                                    )}
                                    {reading.naming.themes && reading.naming.themes.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {reading.naming.themes.map((t, i) => (
                                                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-memento-50 dark:bg-memento-900/20 text-memento-700 dark:text-memento-300">{t}</span>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-[11px] text-gray-400 mt-2">완성된 이름 대신, 이런 기운을 담아 직접 지어보세요.</p>
                                </div>
                            )}

                            {reading?.timing && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">만남에 좋은 시기</h3>
                                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{reading.timing}</p>
                                </div>
                            )}

                            {!reading && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">사주는 계산됐는데 풀이를 받지 못했어요. 다시 시도해주세요.</p>
                            )}

                            <button
                                onClick={reset}
                                className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                            >
                                <RotateCcw className="w-4 h-4" /> 다시 보기
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
