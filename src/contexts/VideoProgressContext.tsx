/**
 * VideoProgressContext — 글로벌 AI 영상 생성 진행 상태
 *
 * 어느 페이지에서 영상 만들기를 시작해도 (RecordPage, 함께 보기, 영상 만들기 진입점 등)
 * 진행 상황을 floating widget으로 표시 + 완료 시 즉시 결과 모달 또는 알림.
 *
 * 폴링은 이 Context가 단일 소스로 담당 → 컴포넌트별 중복 폴링 제거.
 * 완료 시 자동 모달 열기 + 토스트 발생을 한 번만 처리.
 */

"use client";

import {
    createContext, useContext, useEffect, useRef, useState,
    useCallback, ReactNode,
} from "react";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { VIDEO } from "@/config/constants";
import type { VideoGeneration } from "@/types";
import { toast } from "sonner";

interface VideoProgressContextValue {
    /** 현재 진행 중인 영상 (없으면 null) */
    active: VideoGeneration | null;
    /** 진행 시작 — generateId만 알려주면 폴링 시작 */
    startTracking: (generationId: string, petName?: string) => void;
    /** 사용자가 위젯 닫기 (백그라운드는 유지) */
    dismiss: () => void;
    /** 완료 후 결과 모달 열기 요청 (자동 열림 토글) */
    autoOpenResultOnComplete: boolean;
    setAutoOpenResultOnComplete: (open: boolean) => void;
    /** 완료된 영상이 결과 모달로 표시되어야 함 (모달 컴포넌트가 구독) */
    completedVideo: VideoGeneration | null;
    /** 결과 모달 닫혔을 때 호출 */
    clearCompleted: () => void;
}

const VideoProgressContext = createContext<VideoProgressContextValue | null>(null);

export function VideoProgressProvider({ children }: { children: ReactNode }) {
    const [active, setActive] = useState<VideoGeneration | null>(null);
    const [petNameForToast, setPetNameForToast] = useState<string>("");
    const [completedVideo, setCompletedVideo] = useState<VideoGeneration | null>(null);
    const [autoOpenResultOnComplete, setAutoOpenResultOnComplete] = useState(true);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollCountRef = useRef(0);
    const completedToastShownRef = useRef<Set<string>>(new Set());

    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        pollCountRef.current = 0;
    }, []);

    const dismiss = useCallback(() => {
        setActive(null);
        // 폴링은 유지 — 완료 알림은 여전히 보내기. 다만 위젯만 숨김.
        // 완전히 멈추려면 stopPolling()도 호출해야 하지만, 백그라운드 처리를 위해 유지.
    }, []);

    const clearCompleted = useCallback(() => {
        setCompletedVideo(null);
    }, []);

    const startTracking = useCallback((generationId: string, petName?: string) => {
        // 이미 같은 ID 추적 중이면 무시 (중복 시작 방지)
        if (active?.id === generationId) return;
        setPetNameForToast(petName ?? "");
        // 초기 상태로 active 설정 — 즉시 위젯 표시
        setActive({
            id: generationId,
            userId: "",
            petId: null,
            petName: petName ?? null,
            sourcePhotoUrl: "",
            templateId: null,
            customPrompt: null,
            falRequestId: null,
            status: "pending",
            videoUrl: null,
            falVideoUrl: null,
            thumbnailUrl: null,
            durationSeconds: null,
            errorMessage: null,
            isSinglePurchase: false,
            createdAt: new Date().toISOString(),
            completedAt: null,
        });
        pollCountRef.current = 0;
    }, [active?.id]);

    // ===== 폴링 (단일 소스) =====
    useEffect(() => {
        if (!active || active.status === "completed" || active.status === "failed") {
            stopPolling();
            return;
        }
        if (intervalRef.current) return; // 이미 폴링 중

        const tick = async () => {
            pollCountRef.current += 1;
            if (pollCountRef.current > VIDEO.MAX_POLL_COUNT) {
                stopPolling();
                toast.error("영상 생성이 예상보다 오래 걸리고 있어요. 잠시 후 다시 확인해주세요.");
                setActive(null);
                return;
            }
            try {
                const res = await authFetch(API.VIDEO_STATUS(active.id));
                if (!res.ok) return;
                const data: VideoGeneration = await res.json();

                if (data.status === "completed") {
                    stopPolling();
                    // 중복 토스트 방지: 같은 영상 ID에 대해 한 번만 토스트
                    if (!completedToastShownRef.current.has(data.id)) {
                        completedToastShownRef.current.add(data.id);
                        const name = data.petName || petNameForToast;
                        toast.success(
                            name ? `${name}의 영상이 완성되었어요!` : "영상이 완성되었어요!",
                            {
                                duration: 6000,
                                action: {
                                    label: "재생하기",
                                    onClick: () => setCompletedVideo(data),
                                },
                            },
                        );
                    }
                    if (autoOpenResultOnComplete) {
                        setCompletedVideo(data);
                    }
                    setActive(null);
                } else if (data.status === "failed") {
                    stopPolling();
                    toast.error(data.errorMessage || "영상 생성에 실패했어요.");
                    setActive(null);
                } else {
                    // pending or processing — 진행률 업데이트
                    setActive(data);
                }
            } catch {
                // 네트워크 에러 시 폴링 유지
            }
        };

        // 즉시 한 번 + 인터벌 시작
        tick();
        intervalRef.current = setInterval(tick, VIDEO.POLL_INTERVAL_MS);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [active, autoOpenResultOnComplete, petNameForToast, stopPolling]);

    return (
        <VideoProgressContext.Provider
            value={{
                active,
                startTracking,
                dismiss,
                autoOpenResultOnComplete,
                setAutoOpenResultOnComplete,
                completedVideo,
                clearCompleted,
            }}
        >
            {children}
        </VideoProgressContext.Provider>
    );
}

export function useVideoProgress() {
    const ctx = useContext(VideoProgressContext);
    if (!ctx) {
        throw new Error("useVideoProgress must be used within VideoProgressProvider");
    }
    return ctx;
}
