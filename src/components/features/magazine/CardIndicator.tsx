/**
 * CardIndicator - 매거진 카드 페이지 인디케이터
 * 8장 이하: 도트 인디케이터, 9장 이상: 숫자 표시
 */
"use client";

// ──────────────────────────────────────────────
//  카드 인디케이터
// ──────────────────────────────────────────────

export function CardIndicator({
    current,
    total,
    onCardClick,
}: {
    current: number;
    total: number;
    onCardClick: (idx: number) => void;
}) {
    if (total <= 8) {
        return (
            <div className="fixed bottom-6 left-0 right-0 z-[60] flex justify-center gap-1.5">
                {Array.from({ length: total }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => onCardClick(i)}
                        className={`h-1.5 rounded-full transition-all duration-200 ${
                            i === current
                                ? "w-5 bg-emerald-500"
                                : "w-1.5 bg-gray-300 dark:bg-gray-600"
                        }`}
                        aria-label={`${i + 1}번 카드`}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="fixed bottom-6 right-4 z-[60] bg-black/50 dark:bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm">
            {current + 1} / {total}
        </div>
    );
}
