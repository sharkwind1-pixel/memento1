/**
 * ============================================================================
 * EmotionTracker.tsx
 * ============================================================================
 *
 * 감정 분석 시각화 패널 - AI 펫톡 대화에서 감지된 감정 트렌드를 시각화
 *
 * 주요 기능:
 * - 최근 7일간 감정 변화 추이 SVG 차트 (라이브러리 없이 순수 SVG)
 * - 추모 모드: 치유의 여정 (Kubler-Ross 애도 5단계 진행도)
 * - 대화 통계 (총 대화 수, 가장 많은 감정, 마지막 대화 시간)
 * - 감정 범례
 *
 * ============================================================================
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { X, MessageCircle, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

// ============================================================================
// 타입 정의
// ============================================================================

interface EmotionTrackerProps {
    isOpen: boolean;
    onClose: () => void;
    petId: string;
    petName: string;
    isMemorialMode: boolean;
    userId: string;
}

/** Supabase chat_messages 행의 감정 데이터 */
interface EmotionRecord {
    emotion: string;
    emotion_score: number | null;
    created_at: string;
}

/** 일별 감정 집계 데이터 */
interface DailyEmotion {
    date: string;
    dayLabel: string;
    avgScore: number;
    dominantEmotion: string;
    count: number;
}

// ============================================================================
// 상수 정의
// ============================================================================

/** 감정별 차트 색상 */
const EMOTION_COLORS: Record<string, string> = {
    happy: "#EAB308",
    sad: "#8B5CF6",
    anxious: "#6B7280",
    grateful: "#EC4899",
    lonely: "#6366F1",
    peaceful: "#10B981",
    excited: "#F59E0B",
    neutral: "#9CA3AF",
    angry: "#EF4444",
};

/** 감정 한국어 라벨 */
const EMOTION_LABELS: Record<string, string> = {
    happy: "기쁨",
    sad: "슬픔",
    anxious: "걱정",
    grateful: "감사",
    lonely: "외로움",
    peaceful: "평온",
    excited: "신남",
    neutral: "보통",
    angry: "화남",
};

/** 요일 라벨 */
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/** 애도 5단계 */
const GRIEF_STAGES = [
    { key: "denial", label: "부정", description: "아직 실감이 나지 않는 시기예요. 천천히 받아들여도 괜찮아요." },
    { key: "anger", label: "분노", description: "화가 나는 건 자연스러운 감정이에요. 마음이 아픈 만큼 사랑했던 거예요." },
    { key: "bargaining", label: "타협", description: "후회와 미련이 드는 시기예요. 그때의 선택도 사랑이었어요." },
    { key: "depression", label: "슬픔", description: "깊은 슬픔을 느끼는 시기예요. 울고 싶을 때 울어도 돼요." },
    { key: "acceptance", label: "수용", description: "조금씩 추억을 따뜻하게 떠올릴 수 있게 되는 시기예요." },
];

// ============================================================================
// 유틸 함수
// ============================================================================

/**
 * 날짜를 YYYY-MM-DD 형식 문자열로 변환
 */
function toDateString(date: Date): string {
    return date.toISOString().split("T")[0];
}

/**
 * 상대 시간 표시 (방금 전, N분 전, N시간 전, N일 전)
 */
function formatRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 30) return `${diffDay}일 전`;
    return `${Math.floor(diffDay / 30)}개월 전`;
}

// ============================================================================
// SVG 라인 차트 컴포넌트
// ============================================================================

function EmotionLineChart({
    data,
    isMemorialMode,
}: {
    data: DailyEmotion[];
    isMemorialMode: boolean;
}) {
    if (data.length === 0) {
        return (
            <div className={`flex items-center justify-center h-[180px] rounded-xl border ${
                isMemorialMode
                    ? "bg-amber-50/50 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-700/50 text-amber-600 dark:text-amber-400"
                    : "bg-sky-50/50 dark:bg-sky-900/20 border-sky-200/50 dark:border-sky-700/50 text-sky-600 dark:text-sky-400"
            }`}>
                <p className="text-sm">아직 감정 데이터가 없어요</p>
            </div>
        );
    }

    // SVG 차트 치수
    const width = 320;
    const height = 160;
    const paddingLeft = 30;
    const paddingRight = 10;
    const paddingTop = 15;
    const paddingBottom = 30;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // 데이터 포인트 좌표 계산
    const points = data.map((d, i) => {
        const x = paddingLeft + (data.length === 1 ? chartWidth / 2 : (i / (data.length - 1)) * chartWidth);
        const y = paddingTop + chartHeight - d.avgScore * chartHeight;
        return { x, y, ...d };
    });

    // 폴리라인 좌표 문자열
    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

    // 그라데이션 영역 (차트 아래쪽 채우기)
    const areaPath = `M${points[0].x},${paddingTop + chartHeight} ${points.map((p) => `L${p.x},${p.y}`).join(" ")} L${points[points.length - 1].x},${paddingTop + chartHeight} Z`;

    // Y축 라벨
    const yLabels = [0, 0.25, 0.5, 0.75, 1.0];

    return (
        <div className="w-full overflow-x-auto scrollbar-hide">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full max-w-[400px] mx-auto"
                preserveAspectRatio="xMidYMid meet"
            >
                {/* 그라데이션 정의 */}
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop
                            offset="0%"
                            stopColor={isMemorialMode ? "#F59E0B" : "#05B2DC"}
                            stopOpacity="0.3"
                        />
                        <stop
                            offset="100%"
                            stopColor={isMemorialMode ? "#F59E0B" : "#05B2DC"}
                            stopOpacity="0.02"
                        />
                    </linearGradient>
                </defs>

                {/* 가로 그리드 라인 */}
                {yLabels.map((val) => {
                    const y = paddingTop + chartHeight - val * chartHeight;
                    return (
                        <g key={val}>
                            <line
                                x1={paddingLeft}
                                y1={y}
                                x2={width - paddingRight}
                                y2={y}
                                stroke="#E5E7EB"
                                strokeWidth="0.5"
                                strokeDasharray="3,3"
                            />
                            <text
                                x={paddingLeft - 5}
                                y={y + 3}
                                textAnchor="end"
                                fontSize="8"
                                fill="#9CA3AF"
                            >
                                {val.toFixed(1)}
                            </text>
                        </g>
                    );
                })}

                {/* 영역 채우기 */}
                <path d={areaPath} fill="url(#areaGradient)" />

                {/* 라인 */}
                <polyline
                    points={polylinePoints}
                    fill="none"
                    stroke={isMemorialMode ? "#F59E0B" : "#05B2DC"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* 데이터 포인트 */}
                {points.map((p, i) => (
                    <g key={i}>
                        {/* 외부 원 (하이라이트) */}
                        <circle
                            cx={p.x}
                            cy={p.y}
                            r="6"
                            fill={EMOTION_COLORS[p.dominantEmotion] || "#9CA3AF"}
                            fillOpacity="0.2"
                        />
                        {/* 내부 원 */}
                        <circle
                            cx={p.x}
                            cy={p.y}
                            r="3.5"
                            fill={EMOTION_COLORS[p.dominantEmotion] || "#9CA3AF"}
                            stroke="white"
                            strokeWidth="1.5"
                        />
                        {/* X축 라벨 (요일) */}
                        <text
                            x={p.x}
                            y={height - 8}
                            textAnchor="middle"
                            fontSize="9"
                            fill="#6B7280"
                        >
                            {p.dayLabel}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

// ============================================================================
// 애도 진행도 컴포넌트
// ============================================================================

function GriefProgress({ currentStage }: { currentStage: string }) {
    const stageIndex = GRIEF_STAGES.findIndex((s) => s.key === currentStage);
    const activeIndex = stageIndex >= 0 ? stageIndex : 0;
    const currentStageInfo = GRIEF_STAGES[activeIndex];

    return (
        <div className="mt-4">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3">
                치유의 여정
            </h3>

            {/* 진행 바 */}
            <div className="relative flex items-center justify-between mb-2">
                {/* 연결 라인 (배경) */}
                <div className="absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-amber-200 dark:bg-amber-700 -translate-y-1/2" />
                {/* 연결 라인 (진행) */}
                <div
                    className="absolute top-1/2 left-[10%] h-0.5 bg-amber-500 -translate-y-1/2 transition-all duration-500"
                    style={{
                        width: `${activeIndex > 0 ? (activeIndex / (GRIEF_STAGES.length - 1)) * 80 : 0}%`,
                    }}
                />

                {GRIEF_STAGES.map((stage, i) => (
                    <div key={stage.key} className="relative z-10 flex flex-col items-center">
                        <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                i <= activeIndex
                                    ? "bg-amber-500 text-white shadow-md"
                                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-400 border border-amber-200 dark:border-amber-700"
                            } ${i === activeIndex ? "ring-2 ring-amber-300 ring-offset-1 scale-110" : ""}`}
                        >
                            {i + 1}
                        </div>
                        <span
                            className={`text-[10px] mt-1.5 whitespace-nowrap ${
                                i === activeIndex
                                    ? "text-amber-700 dark:text-amber-300 font-semibold"
                                    : "text-amber-400 dark:text-amber-500"
                            }`}
                        >
                            {stage.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* 현재 단계 설명 */}
            <div className="mt-3 bg-amber-100/60 dark:bg-amber-900/30 rounded-lg p-3 border border-amber-200/50 dark:border-amber-700/50">
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    {currentStageInfo.description}
                </p>
            </div>
        </div>
    );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function EmotionTracker({
    isOpen,
    onClose,
    petId,
    petName,
    isMemorialMode,
    userId,
}: EmotionTrackerProps) {
    // ========================================================================
    // 상태 관리
    // ========================================================================
    const [dailyEmotions, setDailyEmotions] = useState<DailyEmotion[]>([]);
    const [totalMessages, setTotalMessages] = useState(0);
    const [mostCommonEmotion, setMostCommonEmotion] = useState<string>("neutral");
    const [lastMessageTime, setLastMessageTime] = useState<string | null>(null);
    const [griefStage, setGriefStage] = useState<string>("unknown");
    const [isLoading, setIsLoading] = useState(false);
    const [emotionsInData, setEmotionsInData] = useState<string[]>([]);

    // ========================================================================
    // 데이터 가져오기
    // ========================================================================

    const fetchEmotionData = useCallback(async () => {
        if (!petId || !userId) return;
        setIsLoading(true);

        try {
            // 최근 50개 감정 데이터
            const { data: emotionData, error: emotionError } = await supabase
                .from("chat_messages")
                .select("emotion, emotion_score, created_at")
                .eq("pet_id", petId)
                .eq("user_id", userId)
                .not("emotion", "is", null)
                .order("created_at", { ascending: true })
                .limit(50);

            if (emotionError || !emotionData) {
                setIsLoading(false);
                return;
            }

            // 총 대화 수
            const { count } = await supabase
                .from("chat_messages")
                .select("*", { count: "exact", head: true })
                .eq("pet_id", petId)
                .eq("user_id", userId);

            setTotalMessages(count || 0);

            // 마지막 메시지 시간
            const { data: lastMsg } = await supabase
                .from("chat_messages")
                .select("created_at")
                .eq("pet_id", petId)
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(1);

            if (lastMsg && lastMsg.length > 0) {
                setLastMessageTime(lastMsg[0].created_at);
            }

            // 감정 데이터를 일별로 그룹화 (최근 7일)
            processEmotionData(emotionData as EmotionRecord[]);

            // 추모 모드: grief progress 가져오기
            if (isMemorialMode) {
                const { data: summaryData } = await supabase
                    .from("conversation_summaries")
                    .select("grief_progress")
                    .eq("pet_id", petId)
                    .eq("user_id", userId)
                    .not("grief_progress", "is", null)
                    .order("created_at", { ascending: false })
                    .limit(1);

                if (summaryData && summaryData.length > 0 && summaryData[0].grief_progress) {
                    setGriefStage(summaryData[0].grief_progress);
                }
            }
        } catch {
            // 에러 발생 시 조용히 무시
        } finally {
            setIsLoading(false);
        }
    }, [petId, userId, isMemorialMode]);

    /**
     * 감정 데이터를 일별로 그룹화하고 통계 계산
     */
    function processEmotionData(records: EmotionRecord[]) {
        if (records.length === 0) {
            setDailyEmotions([]);
            setMostCommonEmotion("neutral");
            setEmotionsInData([]);
            return;
        }

        // 최근 7일 날짜 배열 생성
        const today = new Date();
        const dateKeys: string[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dateKeys.push(toDateString(d));
        }

        // 일별 그룹화
        const grouped: Record<string, EmotionRecord[]> = {};
        for (const dateKey of dateKeys) {
            grouped[dateKey] = [];
        }
        for (const record of records) {
            const dateKey = toDateString(new Date(record.created_at));
            if (grouped[dateKey]) {
                grouped[dateKey].push(record);
            }
        }

        // 일별 집계
        const dailyData: DailyEmotion[] = [];
        const allEmotionCounts: Record<string, number> = {};
        const uniqueEmotions = new Set<string>();

        for (const dateKey of dateKeys) {
            const dayRecords = grouped[dateKey];
            if (dayRecords.length === 0) continue;

            // 평균 점수
            const scores = dayRecords
                .map((r) => r.emotion_score)
                .filter((s): s is number => s !== null && s !== undefined);
            const avgScore = scores.length > 0
                ? scores.reduce((sum, s) => sum + s, 0) / scores.length
                : 0.5;

            // 가장 빈번한 감정
            const emotionCounts: Record<string, number> = {};
            for (const r of dayRecords) {
                if (r.emotion) {
                    emotionCounts[r.emotion] = (emotionCounts[r.emotion] || 0) + 1;
                    allEmotionCounts[r.emotion] = (allEmotionCounts[r.emotion] || 0) + 1;
                    uniqueEmotions.add(r.emotion);
                }
            }
            const dominantEmotion = Object.entries(emotionCounts).sort(
                (a, b) => b[1] - a[1]
            )[0]?.[0] || "neutral";

            // 요일 라벨
            const dayOfWeek = new Date(dateKey).getDay();
            const dayLabel = DAY_LABELS[dayOfWeek];

            dailyData.push({
                date: dateKey,
                dayLabel,
                avgScore,
                dominantEmotion,
                count: dayRecords.length,
            });
        }

        setDailyEmotions(dailyData);

        // 전체 기간 가장 많은 감정
        const sortedEmotions = Object.entries(allEmotionCounts).sort(
            (a, b) => b[1] - a[1]
        );
        setMostCommonEmotion(sortedEmotions[0]?.[0] || "neutral");

        // 데이터에 나타난 감정 목록
        setEmotionsInData(Array.from(uniqueEmotions));
    }

    // 패널이 열릴 때 데이터 로드
    useEffect(() => {
        if (isOpen) {
            fetchEmotionData();
        }
    }, [isOpen, fetchEmotionData]);

    // ========================================================================
    // 렌더링
    // ========================================================================

    if (!isOpen) return null;

    return (
        <>
            {/* 오버레이 */}
            <div
                className="fixed inset-0 bg-black/40 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* 바텀시트 */}
            <div
                className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-2xl transition-transform duration-300 ${
                    isMemorialMode
                        ? "bg-gradient-to-b from-amber-50 to-white dark:from-amber-900/20 dark:to-gray-900"
                        : "bg-gradient-to-b from-sky-50 to-white dark:from-sky-900/20 dark:to-gray-900"
                }`}
                style={{ maxHeight: "70vh" }}
            >
                {/* 핸들 바 */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                </div>

                {/* 헤더 */}
                <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <TrendingUp
                            className={`w-5 h-5 ${
                                isMemorialMode ? "text-amber-500" : "text-sky-500"
                            }`}
                        />
                        <h2 className="text-base font-bold text-gray-800 dark:text-white">
                            {petName}의 감정 분석
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* 본문 (스크롤) */}
                <div className="overflow-y-auto px-5 py-4 space-y-5" style={{ maxHeight: "calc(70vh - 80px)" }}>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${
                                isMemorialMode ? "border-amber-400" : "border-sky-400"
                            }`} />
                        </div>
                    ) : (
                        <>
                            {/* ============================================
                                1. 감정 변화 추이 차트
                            ============================================ */}
                            <section>
                                <h3 className={`text-sm font-semibold mb-2 ${
                                    isMemorialMode ? "text-amber-800 dark:text-amber-300" : "text-gray-700 dark:text-gray-200"
                                }`}>
                                    최근 7일 감정 변화
                                </h3>
                                <EmotionLineChart
                                    data={dailyEmotions}
                                    isMemorialMode={isMemorialMode}
                                />
                            </section>

                            {/* ============================================
                                2. 추모 모드: 치유의 여정
                            ============================================ */}
                            {isMemorialMode && (
                                <section>
                                    <GriefProgress currentStage={griefStage} />
                                </section>
                            )}

                            {/* ============================================
                                3. 대화 통계 카드
                            ============================================ */}
                            <section>
                                <h3 className={`text-sm font-semibold mb-2 ${
                                    isMemorialMode ? "text-amber-800 dark:text-amber-300" : "text-gray-700 dark:text-gray-200"
                                }`}>
                                    대화 통계
                                </h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {/* 총 대화 수 */}
                                    <div className={`rounded-xl p-3 text-center border ${
                                        isMemorialMode
                                            ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-700/50"
                                            : "bg-sky-50 dark:bg-sky-900/20 border-sky-200/50 dark:border-sky-700/50"
                                    }`}>
                                        <MessageCircle
                                            className={`w-4 h-4 mx-auto mb-1 ${
                                                isMemorialMode ? "text-amber-500" : "text-sky-500"
                                            }`}
                                        />
                                        <p className="text-lg font-bold text-gray-800 dark:text-white">
                                            {totalMessages}
                                        </p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">총 대화</p>
                                    </div>

                                    {/* 가장 많은 감정 */}
                                    <div className={`rounded-xl p-3 text-center border ${
                                        isMemorialMode
                                            ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-700/50"
                                            : "bg-sky-50 dark:bg-sky-900/20 border-sky-200/50 dark:border-sky-700/50"
                                    }`}>
                                        <div
                                            className="w-4 h-4 rounded-full mx-auto mb-1"
                                            style={{
                                                backgroundColor: EMOTION_COLORS[mostCommonEmotion] || "#9CA3AF",
                                            }}
                                        />
                                        <p className="text-lg font-bold text-gray-800 dark:text-white">
                                            {EMOTION_LABELS[mostCommonEmotion] || "보통"}
                                        </p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">주요 감정</p>
                                    </div>

                                    {/* 마지막 대화 */}
                                    <div className={`rounded-xl p-3 text-center border ${
                                        isMemorialMode
                                            ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-700/50"
                                            : "bg-sky-50 dark:bg-sky-900/20 border-sky-200/50 dark:border-sky-700/50"
                                    }`}>
                                        <Clock
                                            className={`w-4 h-4 mx-auto mb-1 ${
                                                isMemorialMode ? "text-amber-500" : "text-sky-500"
                                            }`}
                                        />
                                        <p className="text-sm font-bold text-gray-800 dark:text-white">
                                            {lastMessageTime
                                                ? formatRelativeTime(lastMessageTime)
                                                : "-"}
                                        </p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">마지막 대화</p>
                                    </div>
                                </div>
                            </section>

                            {/* ============================================
                                4. 감정 범례
                            ============================================ */}
                            {emotionsInData.length > 0 && (
                                <section>
                                    <h3 className={`text-sm font-semibold mb-2 ${
                                        isMemorialMode ? "text-amber-800 dark:text-amber-300" : "text-gray-700 dark:text-gray-200"
                                    }`}>
                                        감정 범례
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {emotionsInData.map((emotion) => (
                                            <div
                                                key={emotion}
                                                className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-full px-2.5 py-1 border border-gray-100 dark:border-gray-700"
                                            >
                                                <div
                                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                    style={{
                                                        backgroundColor: EMOTION_COLORS[emotion] || "#9CA3AF",
                                                    }}
                                                />
                                                <span>{EMOTION_LABELS[emotion] || emotion}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
