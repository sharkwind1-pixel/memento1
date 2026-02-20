/**
 * CardEditor - 카드 단위 매거진 기사 편집기
 *
 * 기사를 카드(슬라이드) 단위로 편집할 수 있는 래퍼 컴포넌트.
 * 내부적으로 RichTextEditor를 사용하며, 카드 간 경계를 <hr>로 join하여
 * 기존 content(HTML string) 형식을 그대로 유지한다.
 *
 * 데이터 흐름:
 *   [에디터] cards[] -> join("<hr>") -> onChange(html: string)
 *   [리더]  content string -> split("<hr>") -> 카드뉴스 렌더링
 */
"use client";

import { useState, useCallback, useRef, useEffect, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    FileText,
    ImageIcon,
    Quote,
} from "lucide-react";
import RichTextEditor from "./RichTextEditor";

// ──────────────────────────────────────────────
//  타입
// ──────────────────────────────────────────────

interface EditorCard {
    id: string;
    html: string;
}

interface CardEditorProps {
    /** 초기 콘텐츠 (HTML, <hr> 구분자 포함 가능) */
    content: string;
    /** 콘텐츠 변경 콜백. <hr>로 join된 HTML string 반환 */
    onChange: (html: string) => void;
    /** 이미지 업로드 콜백 (RichTextEditor에 전달) */
    onImageUpload?: (file: File) => Promise<string | null>;
}

// ──────────────────────────────────────────────
//  유틸 함수
// ──────────────────────────────────────────────

let cardIdCounter = 0;

function generateCardId(): string {
    cardIdCounter += 1;
    return `card-${Date.now()}-${cardIdCounter}`;
}

/** Tiptap 빈 콘텐츠 체크 */
function isEditorEmpty(html: string): boolean {
    if (!html) return true;
    const stripped = html
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, "")
        .trim();
    return stripped.length === 0;
}

/** HTML content를 <hr> 기준으로 카드 배열로 분할 */
function parseContentToCards(html: string): EditorCard[] {
    if (!html || isEditorEmpty(html)) {
        return [{ id: generateCardId(), html: "" }];
    }
    const parts = html.split(/<hr\s*\/?>/i).filter((p) => p.trim());
    if (parts.length === 0) {
        return [{ id: generateCardId(), html: "" }];
    }
    return parts.map((part) => ({
        id: generateCardId(),
        html: part.trim(),
    }));
}

/** 카드 배열을 <hr>로 join하여 HTML string으로 직렬화 */
function serializeCards(cards: EditorCard[]): string {
    return cards
        .map((c) => c.html)
        .filter((h) => !isEditorEmpty(h))
        .join("<hr>");
}

/** 카드 HTML에서 미리보기 텍스트 추출 */
function getPreviewText(html: string): string {
    if (!html || isEditorEmpty(html)) return "(빈 카드)";
    if (/<img/i.test(html)) return "이미지";
    if (/<blockquote/i.test(html)) return "인용";
    const text = html.replace(/<[^>]*>/g, "").trim();
    return text.length > 20 ? text.slice(0, 20) + "..." : text || "(빈 카드)";
}

/** 카드 타입 아이콘 결정 */
function getCardTypeIcon(html: string) {
    if (/<img/i.test(html)) return ImageIcon;
    if (/<blockquote/i.test(html)) return Quote;
    return FileText;
}

// ──────────────────────────────────────────────
//  메인 컴포넌트
// ──────────────────────────────────────────────

export default function CardEditor({ content, onChange, onImageUpload }: CardEditorProps) {
    const [cards, setCards] = useState<EditorCard[]>(() => parseContentToCards(content));
    const [activeIndex, setActiveIndex] = useState(0);
    const cardsRef = useRef(cards);
    cardsRef.current = cards;

    // 드래그 앤 드롭 상태
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

    // content prop 변경 시 카드 재파싱 (모달 재열기 대응)
    const prevContentRef = useRef(content);
    useEffect(() => {
        if (content !== prevContentRef.current) {
            prevContentRef.current = content;
            const newCards = parseContentToCards(content);
            setCards(newCards);
            setActiveIndex(0);
        }
    }, [content]);

    /** 상위로 변경 전파 */
    const emitChange = useCallback(
        (updatedCards: EditorCard[]) => {
            const html = serializeCards(updatedCards);
            prevContentRef.current = html;
            onChange(html);
        },
        [onChange]
    );

    /** 현재 활성 카드의 HTML 변경 */
    const handleCardContentChange = useCallback(
        (html: string) => {
            setCards((prev) => {
                const next = [...prev];
                next[activeIndex] = { ...next[activeIndex], html };
                // 비동기로 onChange 호출 (setState 내부에서 직접 호출 방지)
                requestAnimationFrame(() => emitChange(next));
                return next;
            });
        },
        [activeIndex, emitChange]
    );

    /** 카드 추가 */
    const addCard = useCallback(() => {
        const newCard: EditorCard = { id: generateCardId(), html: "" };
        setCards((prev) => {
            const next = [...prev];
            next.splice(activeIndex + 1, 0, newCard);
            requestAnimationFrame(() => emitChange(next));
            return next;
        });
        setActiveIndex((prev) => prev + 1);
    }, [activeIndex, emitChange]);

    /** 카드 삭제 */
    const removeCard = useCallback(
        (index: number) => {
            if (cards.length <= 1) return;
            setCards((prev) => {
                const next = prev.filter((_, i) => i !== index);
                requestAnimationFrame(() => emitChange(next));
                return next;
            });
            setActiveIndex((prev) => {
                if (prev >= cards.length - 1) return Math.max(0, cards.length - 2);
                if (prev > index) return prev - 1;
                if (prev === index) return Math.min(prev, cards.length - 2);
                return prev;
            });
        },
        [cards.length, emitChange]
    );

    /** 카드 이동 */
    const moveCard = useCallback(
        (fromIndex: number, direction: "up" | "down") => {
            const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
            if (toIndex < 0 || toIndex >= cards.length) return;
            setCards((prev) => {
                const next = [...prev];
                [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
                requestAnimationFrame(() => emitChange(next));
                return next;
            });
            setActiveIndex(toIndex);
        },
        [cards.length, emitChange]
    );

    /** 드래그 시작 */
    const handleDragStart = useCallback((e: DragEvent<HTMLButtonElement>, index: number) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // 드래그 중 반투명 효과를 위해 살짝 딜레이
        requestAnimationFrame(() => {
            (e.target as HTMLElement).style.opacity = "0.4";
        });
    }, []);

    /** 드래그 중 hover */
    const handleDragOver = useCallback((e: DragEvent<HTMLButtonElement>, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragIndex !== null && dragIndex !== index) {
            setDropTargetIndex(index);
        }
    }, [dragIndex]);

    /** 드래그 떠남 */
    const handleDragLeave = useCallback(() => {
        setDropTargetIndex(null);
    }, []);

    /** 드롭 */
    const handleDrop = useCallback((e: DragEvent<HTMLButtonElement>, toIndex: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === toIndex) {
            setDragIndex(null);
            setDropTargetIndex(null);
            return;
        }

        setCards((prev) => {
            const next = [...prev];
            const [moved] = next.splice(dragIndex, 1);
            next.splice(toIndex, 0, moved);
            requestAnimationFrame(() => emitChange(next));
            return next;
        });

        // activeIndex도 드래그에 따라 조정
        setActiveIndex((prev) => {
            if (prev === dragIndex) return toIndex;
            if (dragIndex < prev && toIndex >= prev) return prev - 1;
            if (dragIndex > prev && toIndex <= prev) return prev + 1;
            return prev;
        });

        setDragIndex(null);
        setDropTargetIndex(null);
    }, [dragIndex, emitChange]);

    /** 드래그 종료 (드롭 영역 밖) */
    const handleDragEnd = useCallback((e: DragEvent<HTMLButtonElement>) => {
        (e.target as HTMLElement).style.opacity = "1";
        setDragIndex(null);
        setDropTargetIndex(null);
    }, []);

    const activeCard = cards[activeIndex];

    return (
        <div className="space-y-3">
            {/* 상단: 카드 탭 목록 */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {cards.map((card, i) => {
                    const Icon = getCardTypeIcon(card.html);
                    const isActive = i === activeIndex;
                    const isDragTarget = dropTargetIndex === i && dragIndex !== i;
                    return (
                        <button
                            key={card.id}
                            type="button"
                            draggable
                            onClick={() => setActiveIndex(i)}
                            onDragStart={(e) => handleDragStart(e, i)}
                            onDragOver={(e) => handleDragOver(e, i)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, i)}
                            onDragEnd={handleDragEnd}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-grab active:cursor-grabbing ${
                                isDragTarget
                                    ? "bg-sky-50 border-sky-400 border-dashed ring-2 ring-sky-200 scale-105"
                                    : isActive
                                        ? "bg-sky-100 border-sky-400 text-sky-700 shadow-sm"
                                        : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300"
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span>카드 {i + 1}</span>
                            {!isEditorEmpty(card.html) && !isActive && (
                                <span className="text-gray-400 max-w-[80px] truncate">
                                    - {getPreviewText(card.html)}
                                </span>
                            )}
                        </button>
                    );
                })}

                {/* 카드 추가 버튼 */}
                <button
                    type="button"
                    onClick={addCard}
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-sky-400 hover:text-sky-500 hover:bg-sky-50 transition-all"
                >
                    <Plus className="w-3.5 h-3.5" />
                    추가
                </button>
            </div>

            {/* 중앙: 액션 바 */}
            <div className="flex items-center justify-between px-1">
                <span className="text-sm text-gray-500 font-medium">
                    카드 {activeIndex + 1} / {cards.length}
                </span>
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-gray-500"
                        disabled={activeIndex === 0}
                        onClick={() => moveCard(activeIndex, "up")}
                        title="앞으로 이동"
                    >
                        <ChevronUp className="w-3.5 h-3.5 mr-0.5" />
                        앞으로
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-gray-500"
                        disabled={activeIndex === cards.length - 1}
                        onClick={() => moveCard(activeIndex, "down")}
                        title="뒤로 이동"
                    >
                        뒤로
                        <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                    <div className="w-px h-4 bg-gray-200 mx-1" />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-red-400 hover:text-red-600 hover:bg-red-50"
                        disabled={cards.length <= 1}
                        onClick={() => removeCard(activeIndex)}
                        title="카드 삭제"
                    >
                        <Trash2 className="w-3.5 h-3.5 mr-0.5" />
                        삭제
                    </Button>
                </div>
            </div>

            {/* 하단: RichTextEditor (현재 카드만 편집) */}
            <div key={activeCard?.id}>
                <RichTextEditor
                    content={activeCard?.html || ""}
                    onChange={handleCardContentChange}
                    onImageUpload={onImageUpload}
                />
            </div>

            {/* 도움말 */}
            <p className="text-xs text-gray-400 px-1">
                각 카드는 카드뉴스의 한 페이지로 표시됩니다. 카드를 드래그하여 순서를 변경할 수 있습니다.
            </p>
        </div>
    );
}
