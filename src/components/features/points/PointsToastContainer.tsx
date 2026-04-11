/**
 * PointsToastContainer.tsx
 * 전역 포인트 토스트 컨테이너 (Layout 최상단에 한 번만 마운트)
 *
 * 동작:
 * - window.dispatchEvent(new CustomEvent("memento:points-earned", { detail: { earned, label, actionType } }))
 *   를 수신하여 화면 하단에 토스트 표시
 * - 동시에 여러 개 발생 시 큐잉 → 순차적으로 표시 (한 번에 하나씩)
 * - +N P / -N P 형식으로 색상 구분 (양수: 초록, 음수: 빨강)
 *
 * 호출 예시:
 * window.dispatchEvent(new CustomEvent("memento:points-earned", {
 *     detail: { earned: 10, label: "게시글 작성", actionType: "write_post" }
 * }));
 *
 * 사용처:
 * - PetContext (pet_registration / photo_upload / timeline_entry)
 * - 응답 파싱 헬퍼 (write_post / write_comment / receive_like / receive_dislike)
 * - 향후 Realtime 구독 (받은 좋아요)
 */

"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Star, ArrowDown, ArrowUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { POINTS } from "@/config/constants";
import type { PointAction } from "@/types";

export interface PointsToastEvent {
    /** 적립/차감된 포인트 (음수 가능) */
    earned: number;
    /** 활동 라벨 (예: "게시글 작성") */
    label: string;
    /** 활동 타입 (선택) */
    actionType?: string;
}

interface ToastItem extends PointsToastEvent {
    id: number;
}

const TOAST_DURATION_MS = 2400;
const FADE_OUT_MS = 300;

let toastIdCounter = 0;

export default function PointsToastContainer() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    // 다중 발생 시 큐잉 → 0.4초 간격으로 순차 표시
    const queueRef = useRef<PointsToastEvent[]>([]);
    const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const addToast = useCallback((evt: PointsToastEvent) => {
        const id = ++toastIdCounter;
        setToasts((prev) => [...prev, { ...evt, id }]);
        // 자동 제거 (페이드아웃 후)
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, TOAST_DURATION_MS + FADE_OUT_MS);
    }, []);

    const flushQueue = useCallback(() => {
        const next = queueRef.current.shift();
        if (next) {
            addToast(next);
            // 0.4초 간격으로 다음 토스트
            if (queueRef.current.length > 0) {
                flushTimerRef.current = setTimeout(flushQueue, 400);
            }
        }
    }, [addToast]);

    useEffect(() => {
        function handlePointsEarned(e: Event) {
            const customEvent = e as CustomEvent<PointsToastEvent>;
            const detail = customEvent.detail;
            if (!detail || typeof detail.earned !== "number") return;
            // 0이면 무시 (적립도 차감도 아님)
            if (detail.earned === 0) return;

            queueRef.current.push(detail);

            // 첫 토스트면 즉시 flush, 이미 흐름 중이면 큐만 추가
            if (toasts.length === 0 && !flushTimerRef.current) {
                flushQueue();
            }
        }

        window.addEventListener("memento:points-earned", handlePointsEarned);
        return () => {
            window.removeEventListener("memento:points-earned", handlePointsEarned);
            if (flushTimerRef.current) {
                clearTimeout(flushTimerRef.current);
                flushTimerRef.current = null;
            }
        };
    }, [flushQueue, toasts.length]);

    // Realtime 구독: 본인 포인트 거래 INSERT 감지 → 즉시 토스트
    // (다른 유저가 좋아요/비추천 누른 경우, 본인이 화면에 있을 때 알 수 있음)
    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;
        let cancelled = false;

        async function setupRealtime() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;

            channel = supabase
                .channel(`points-toast-${user.id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "point_transactions",
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        const row = payload.new as {
                            action_type?: string;
                            points_earned?: number;
                        };
                        if (!row.action_type || typeof row.points_earned !== "number") return;
                        if (row.points_earned === 0) return;

                        // 본인이 직접 트리거한 활동(write_post 등)은 응답으로 이미 토스트가 떴을 수 있음.
                        // 하지만 같은 트랜잭션을 두 번 표시하면 어색하므로,
                        // "수동" 활동(receive_*)만 Realtime으로 표시한다.
                        if (!row.action_type.startsWith("receive_")) return;

                        const label =
                            (POINTS.LABELS as Record<string, string>)[
                                row.action_type as PointAction
                            ] || row.action_type;

                        emitPointsToast(row.points_earned, label, row.action_type);
                    }
                )
                .subscribe();
        }

        void setupRealtime();

        return () => {
            cancelled = true;
            if (channel) {
                void supabase.removeChannel(channel);
            }
        };
    }, []);

    // 토스트가 모두 사라지면 큐 flush 타이머 해제
    useEffect(() => {
        if (toasts.length === 0 && queueRef.current.length === 0 && flushTimerRef.current) {
            clearTimeout(flushTimerRef.current);
            flushTimerRef.current = null;
        }
    }, [toasts.length]);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
            {toasts.map((toast) => (
                <PointsToastItem key={toast.id} toast={toast} />
            ))}
        </div>
    );
}

function PointsToastItem({ toast }: { toast: ToastItem }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // 등장
        const enterTimer = requestAnimationFrame(() => setVisible(true));
        // 페이드아웃
        const fadeTimer = setTimeout(() => setVisible(false), TOAST_DURATION_MS);
        return () => {
            cancelAnimationFrame(enterTimer);
            clearTimeout(fadeTimer);
        };
    }, []);

    const isPositive = toast.earned > 0;
    const sign = isPositive ? "+" : "";  // 음수는 자동으로 - 붙음

    return (
        <div
            className={cn(
                "transition-all duration-300 ease-out",
                visible
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 translate-y-3 scale-95"
            )}
        >
            <div
                className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl border",
                    "text-sm font-semibold backdrop-blur-md",
                    isPositive
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 border-green-300/50 text-white"
                        : "bg-gradient-to-r from-red-500 to-rose-500 border-red-300/50 text-white"
                )}
            >
                {isPositive ? (
                    <Star className="w-4 h-4 flex-shrink-0 fill-white" />
                ) : (
                    <ArrowDown className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="whitespace-nowrap">
                    {sign}
                    {toast.earned}P
                </span>
                <span className="text-white/80 text-xs whitespace-nowrap">{toast.label}</span>
                {isPositive && <ArrowUp className="w-3 h-3 flex-shrink-0 opacity-80" />}
            </div>
        </div>
    );
}

/**
 * 헬퍼: API 응답에 pointAward 메타가 있으면 토스트 발행
 *
 * 사용 예:
 * ```ts
 * const res = await fetch("/api/posts", { ... });
 * const data = await res.json();
 * showPointsFromResponse(data);  // data.pointAward가 있으면 토스트 표시
 * ```
 */

interface ResponseWithPointAward {
    pointAward?: { earned: number; actionType: string } | null;
}

export function showPointsFromResponse(response: unknown): void {
    if (!response || typeof response !== "object") return;
    const resp = response as ResponseWithPointAward;
    if (!resp.pointAward) return;
    const { earned, actionType } = resp.pointAward;
    if (typeof earned !== "number" || earned === 0) return;

    const label =
        (POINTS.LABELS as Record<string, string>)[actionType as PointAction] || actionType;

    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent("memento:points-earned", {
                detail: { earned, label, actionType },
            }),
        );
    }
}

/**
 * 헬퍼: 직접 토스트 발행
 */
export function emitPointsToast(earned: number, label: string, actionType?: string): void {
    if (typeof window === "undefined" || earned === 0) return;
    window.dispatchEvent(
        new CustomEvent("memento:points-earned", {
            detail: { earned, label, actionType },
        }),
    );
}
