/**
 * MemoryPanel.tsx
 * ===============
 * AI 펫톡 메모리 패널 - 반려동물에 대한 AI 기억 목록
 *
 * 바텀시트 UI로 구현되며, 메모리 타입별 그룹화/삭제 기능 제공
 * 모바일 퍼스트 디자인 (하단에서 슬라이드업)
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
    X,
    Heart,
    Camera,
    Stethoscope,
    Sparkles,
    Users,
    MapPin,
    Clock,
    Calendar,
    Trash2,
    ChevronDown,
    ChevronRight,
} from "lucide-react";

// ============================================================================
// 타입 정의
// ============================================================================

/** 메모리 패널 Props */
interface MemoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    petId: string;
    petName: string;
    isMemorialMode: boolean;
}

/** 메모리 타입 */
type MemoryType =
    | "preference"
    | "episode"
    | "health"
    | "personality"
    | "relationship"
    | "place"
    | "routine"
    | "schedule";

/** 메모리 아이템 (DB에서 가져온 후 변환) */
interface MemoryItem {
    id: string;
    petId: string;
    memoryType: MemoryType;
    title: string;
    content: string;
    importance: number;
    timeInfo?: {
        type: "daily" | "weekly" | "monthly" | "once";
        time?: string;
        dayOfWeek?: number;
        dayOfMonth?: number;
    };
}

/** DB 레코드 (snake_case) */
interface MemoryRecord {
    id: string;
    pet_id: string;
    memory_type: string;
    title: string;
    content: string;
    importance: number;
    time_info?: {
        type: "daily" | "weekly" | "monthly" | "once";
        time?: string;
        dayOfWeek?: number;
        dayOfMonth?: number;
    };
}

// ============================================================================
// 상수 정의
// ============================================================================

/** 메모리 타입별 라벨 및 아이콘 매핑 */
const MEMORY_TYPE_CONFIG: Record<
    MemoryType,
    {
        label: string;
        Icon: typeof Heart;
    }
> = {
    preference: { label: "좋아하는 것", Icon: Heart },
    episode: { label: "특별한 추억", Icon: Camera },
    health: { label: "건강 기록", Icon: Stethoscope },
    personality: { label: "성격/습관", Icon: Sparkles },
    relationship: { label: "관계", Icon: Users },
    place: { label: "좋아하는 장소", Icon: MapPin },
    routine: { label: "일상 루틴", Icon: Clock },
    schedule: { label: "일정", Icon: Calendar },
};

/** 최대 중요도 점수 (표시용) */
const MAX_DISPLAY_DOTS = 5;

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * DB 레코드를 메모리 아이템으로 변환 (snake_case -> camelCase)
 */
function recordToMemoryItem(record: MemoryRecord): MemoryItem {
    return {
        id: record.id,
        petId: record.pet_id,
        memoryType: record.memory_type as MemoryType,
        title: record.title,
        content: record.content,
        importance: record.importance,
        timeInfo: record.time_info,
    };
}

/**
 * importance(1-10)를 5단계 점수로 변환
 */
function importanceToDots(importance: number): number {
    return Math.max(1, Math.min(MAX_DISPLAY_DOTS, Math.round(importance / 2)));
}

// ============================================================================
// 서브 컴포넌트
// ============================================================================

/**
 * 중요도 표시 컴포넌트 (점 5개)
 */
function ImportanceDots({
    importance,
    isMemorialMode,
}: {
    importance: number;
    isMemorialMode: boolean;
}) {
    const filledCount = importanceToDots(importance);
    return (
        <div className="flex items-center gap-0.5">
            {Array.from({ length: MAX_DISPLAY_DOTS }).map((_, i) => (
                <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i < filledCount
                            ? isMemorialMode
                                ? "bg-amber-400"
                                : "bg-sky-400"
                            : "bg-gray-200 dark:bg-gray-600"
                    }`}
                />
            ))}
        </div>
    );
}

/**
 * 로딩 스켈레톤 컴포넌트
 */
function MemorySkeleton() {
    return (
        <div className="space-y-3 px-4">
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 animate-pulse"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600" />
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded" />
                    </div>
                    <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded mb-1.5" />
                    <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-700 rounded" />
                </div>
            ))}
        </div>
    );
}

/**
 * 삭제 확인 다이얼로그
 */
function DeleteConfirmDialog({
    isOpen,
    onConfirm,
    onCancel,
    memoryTitle,
    isMemorialMode,
}: {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    memoryTitle: string;
    isMemorialMode: boolean;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/40"
                onClick={onCancel}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    기억을 삭제할까요?
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                    &quot;{memoryTitle}&quot; 기억이 영구적으로 삭제됩니다.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 rounded-xl text-white font-medium text-sm transition-colors ${
                            isMemorialMode
                                ? "bg-amber-500 hover:bg-amber-600"
                                : "bg-red-500 hover:bg-red-600"
                        }`}
                    >
                        삭제
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * 개별 메모리 카드
 */
function MemoryCard({
    memory,
    isMemorialMode,
    onDelete,
}: {
    memory: MemoryItem;
    isMemorialMode: boolean;
    onDelete: (id: string, title: string) => void;
}) {
    const config = MEMORY_TYPE_CONFIG[memory.memoryType];
    const IconComponent = config?.Icon || Sparkles;

    return (
        <div
            className={`bg-white dark:bg-gray-800 rounded-xl p-3.5 border transition-all hover:shadow-md ${
                isMemorialMode
                    ? "border-amber-100 dark:border-amber-800/50 hover:border-amber-200"
                    : "border-sky-100 dark:border-sky-800/50 hover:border-sky-200"
            }`}
        >
            <div className="flex items-start gap-3">
                {/* 아이콘 */}
                <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isMemorialMode
                            ? "bg-amber-50 dark:bg-amber-900/30"
                            : "bg-sky-50 dark:bg-sky-900/30"
                    }`}
                >
                    <IconComponent
                        className={`w-4 h-4 ${
                            isMemorialMode
                                ? "text-amber-500"
                                : "text-sky-500"
                        }`}
                    />
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-800 dark:text-white truncate">
                            {memory.title}
                        </h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <ImportanceDots
                                importance={memory.importance}
                                isMemorialMode={isMemorialMode}
                            />
                            <button
                                onClick={() => onDelete(memory.id, memory.title)}
                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                                title="기억 삭제"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                        {memory.content}
                    </p>
                    {memory.timeInfo && (
                        <span
                            className={`inline-flex items-center gap-1 text-[10px] mt-1.5 px-2 py-0.5 rounded-full ${
                                isMemorialMode
                                    ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                                    : "bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400"
                            }`}
                        >
                            <Clock className="w-2.5 h-2.5" />
                            {memory.timeInfo.time || memory.timeInfo.type}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * 메모리 타입별 그룹 섹션 (접기/펼치기)
 */
function MemoryGroup({
    memoryType,
    memories,
    isMemorialMode,
    onDelete,
}: {
    memoryType: MemoryType;
    memories: MemoryItem[];
    isMemorialMode: boolean;
    onDelete: (id: string, title: string) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const config = MEMORY_TYPE_CONFIG[memoryType];
    const IconComponent = config?.Icon || Sparkles;

    return (
        <div className="mb-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center gap-2 w-full px-2 py-2 rounded-lg transition-colors ${
                    isMemorialMode
                        ? "hover:bg-amber-50 dark:hover:bg-amber-900/10"
                        : "hover:bg-sky-50 dark:hover:bg-sky-900/10"
                }`}
            >
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                <IconComponent
                    className={`w-4 h-4 ${
                        isMemorialMode ? "text-amber-500" : "text-sky-500"
                    }`}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {config?.label || memoryType}
                </span>
                <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isMemorialMode
                            ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                    }`}
                >
                    {memories.length}
                </span>
            </button>
            {isExpanded && (
                <div className="space-y-2 mt-1 pl-2">
                    {memories.map((memory) => (
                        <MemoryCard
                            key={memory.id}
                            memory={memory}
                            isMemorialMode={isMemorialMode}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function MemoryPanel({
    isOpen,
    onClose,
    petId,
    petName,
    isMemorialMode,
}: MemoryPanelProps) {
    const [memories, setMemories] = useState<MemoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{
        id: string;
        title: string;
    } | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // 메모리 데이터 로드
    const fetchMemories = useCallback(async () => {
        if (!petId) return;
        setIsLoading(true);

        try {
            const { data, error } = await supabase
                .from("pet_memories")
                .select("*")
                .eq("pet_id", petId)
                .order("importance", { ascending: false });

            if (error) {
                throw error;
            }

            if (data) {
                setMemories(
                    data.map((record: MemoryRecord) =>
                        recordToMemoryItem(record)
                    )
                );
            }
        } catch {
            // 메모리 로드 실패 - 빈 목록 유지
            setMemories([]);
        } finally {
            setIsLoading(false);
        }
    }, [petId]);

    // 패널 열릴 때 데이터 로드
    useEffect(() => {
        if (isOpen && petId) {
            fetchMemories();
        }
    }, [isOpen, petId, fetchMemories]);

    // ESC 키로 닫기
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // 메모리 삭제 핸들러
    const handleDeleteRequest = (id: string, title: string) => {
        setDeleteTarget({ id, title });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;

        try {
            const { error } = await supabase
                .from("pet_memories")
                .delete()
                .eq("id", deleteTarget.id);

            if (error) {
                throw error;
            }

            // 로컬 상태에서 제거
            setMemories((prev) =>
                prev.filter((m) => m.id !== deleteTarget.id)
            );
        } catch {
            // 삭제 실패 - 사용자에게 조용히 실패 처리
        } finally {
            setDeleteTarget(null);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteTarget(null);
    };

    // 메모리를 타입별로 그룹화
    const groupedMemories = memories.reduce(
        (groups, memory) => {
            const type = memory.memoryType;
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(memory);
            return groups;
        },
        {} as Record<MemoryType, MemoryItem[]>
    );

    // 타입 순서 정의
    const typeOrder: MemoryType[] = [
        "preference",
        "episode",
        "health",
        "personality",
        "relationship",
        "place",
        "routine",
        "schedule",
    ];

    const sortedTypes = typeOrder.filter(
        (type) => groupedMemories[type] && groupedMemories[type].length > 0
    );

    return (
        <>
            {/* 어두운 오버레이 */}
            <div
                className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
                    isOpen
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                }`}
                onClick={onClose}
            />

            {/* 바텀시트 패널 */}
            <div
                ref={panelRef}
                className={`fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-out ${
                    isOpen ? "translate-y-0" : "translate-y-full"
                }`}
                style={{ maxHeight: "70vh" }}
            >
                <div
                    className={`rounded-t-2xl shadow-2xl flex flex-col overflow-hidden ${
                        isMemorialMode
                            ? "bg-amber-50 dark:bg-gray-900"
                            : "bg-[#F0F9FF] dark:bg-gray-900"
                    }`}
                    style={{ maxHeight: "70vh" }}
                >
                    {/* 드래그 핸들 (시각적 표시) */}
                    <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                        <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    </div>

                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Sparkles
                                className={`w-5 h-5 ${
                                    isMemorialMode
                                        ? "text-amber-500"
                                        : "text-sky-500"
                                }`}
                            />
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                                {petName}의 기억
                            </h2>
                            {memories.length > 0 && (
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                        isMemorialMode
                                            ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                                            : "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                                    }`}
                                >
                                    {memories.length}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                            title="닫기"
                        >
                            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* 내용 영역 (스크롤) */}
                    <div className="flex-1 overflow-y-auto px-4 pb-6">
                        {isLoading ? (
                            <MemorySkeleton />
                        ) : memories.length === 0 ? (
                            /* 빈 상태 */
                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                <div
                                    className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                                        isMemorialMode
                                            ? "bg-amber-100 dark:bg-amber-900/30"
                                            : "bg-sky-100 dark:bg-sky-900/30"
                                    }`}
                                >
                                    <Sparkles
                                        className={`w-8 h-8 ${
                                            isMemorialMode
                                                ? "text-amber-400"
                                                : "text-sky-400"
                                        }`}
                                    />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                                    아직 기억이 없어요.
                                    <br />
                                    대화하면서 기억이 쌓여요!
                                </p>
                            </div>
                        ) : (
                            /* 그룹화된 메모리 목록 */
                            <div>
                                {sortedTypes.map((type) => (
                                    <MemoryGroup
                                        key={type}
                                        memoryType={type}
                                        memories={groupedMemories[type]}
                                        isMemorialMode={isMemorialMode}
                                        onDelete={handleDeleteRequest}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 삭제 확인 다이얼로그 */}
            <DeleteConfirmDialog
                isOpen={deleteTarget !== null}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
                memoryTitle={deleteTarget?.title || ""}
                isMemorialMode={isMemorialMode}
            />
        </>
    );
}
