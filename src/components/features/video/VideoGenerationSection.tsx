/**
 * VideoGenerationSection.tsx
 * AI 영상 생성 섹션 - RecordPage에서 PetPhotoAlbum과 RemindersSection 사이에 위치
 *
 * - 최근 생성 영상 목록 표시 (가로 스크롤, 최대 3개)
 * - 진행 중인 영상 생성 상태 폴링 (15초 간격)
 * - 영상 쿼터 표시 (무료/프리미엄 구분)
 * - VideoGenerateModal, VideoResultModal 연동
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback, useRef } from "react";
import { Film, Plus, Loader2, Clock, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/auth-fetch";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config/apiEndpoints";
import { VIDEO } from "@/config/constants";
import { VideoGeneration, VideoQuota } from "@/types";
import useHorizontalScroll from "@/hooks/useHorizontalScroll";
import VideoGenerateModal from "./VideoGenerateModal";
import VideoResultModal from "./VideoResultModal";

interface VideoGenerationSectionProps {
    pet: {
        id: string;
        name: string;
        photos: Array<{ id: string; url: string; type: string }>;
        status: string;
    };
    isPremium: boolean;
}

export default function VideoGenerationSection({
    pet,
    isPremium,
}: VideoGenerationSectionProps) {
    const { user } = useAuth();
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<VideoGeneration | null>(null);
    const [videos, setVideos] = useState<VideoGeneration[]>([]);
    const [activeGeneration, setActiveGeneration] = useState<VideoGeneration | null>(null);
    const [quota, setQuota] = useState<VideoQuota | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollCountRef = useRef(0);
    const videoScrollRef = useHorizontalScroll();

    // ---- 데이터 패칭 ----

    const fetchVideos = useCallback(async () => {
        try {
            const res = await authFetch(
                `${API.VIDEO_LIST}?petId=${pet.id}&limit=3`
            );
            if (!res.ok) throw new Error("영상 목록 조회 실패");

            const data = await res.json();
            const list: VideoGeneration[] = data.videos || [];
            setVideos(list);

            // 진행 중인 영상이 있으면 activeGeneration으로 설정
            const inProgress = list.find(
                (v) => v.status === "pending" || v.status === "processing"
            );
            if (inProgress) {
                setActiveGeneration(inProgress);
            }
        } catch {
            setVideos([]);
        }
    }, [pet.id]);

    const fetchQuota = useCallback(async () => {
        try {
            const res = await authFetch(API.VIDEO_QUOTA);
            if (!res.ok) throw new Error("쿼터 조회 실패");

            const data: VideoQuota = await res.json();
            setQuota(data);
        } catch {
            setQuota(null);
        }
    }, []);

    // 마운트 시 영상 목록 + 쿼터 패칭
    useEffect(() => {
        let cancelled = false;

        async function loadData() {
            setIsLoading(true);
            await Promise.all([fetchVideos(), fetchQuota()]);
            if (!cancelled) {
                setIsLoading(false);
            }
        }

        loadData();
        return () => { cancelled = true; };
    }, [fetchVideos, fetchQuota]);

    // ---- 폴링 ----

    const stopPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        pollCountRef.current = 0;
    }, []);

    const pollStatus = useCallback(async () => {
        if (!activeGeneration) return;

        pollCountRef.current += 1;

        // 최대 폴링 횟수 초과 시 중단
        if (pollCountRef.current > VIDEO.MAX_POLL_COUNT) {
            stopPolling();
            toast.error("영상 생성이 예상보다 오래 걸리고 있어요. 나중에 다시 확인해주세요.");
            setActiveGeneration(null);
            return;
        }

        try {
            const res = await authFetch(API.VIDEO_STATUS(activeGeneration.id));
            if (!res.ok) return;

            const data: VideoGeneration = await res.json();

            if (data.status === "completed") {
                stopPolling();
                setActiveGeneration(null);
                setSelectedVideo(data);

                // 영상 목록 갱신
                setVideos((prev) => {
                    const filtered = prev.filter((v) => v.id !== data.id);
                    return [data, ...filtered].slice(0, 3);
                });

                toast.success(`${pet.name}의 영상이 완성되었어요!`);
            } else if (data.status === "failed") {
                stopPolling();
                setActiveGeneration(null);

                // 영상 목록에서 실패한 항목 제거
                setVideos((prev) => prev.filter((v) => v.id !== data.id));

                toast.error(
                    data.errorMessage || "영상 생성에 실패했어요. 다시 시도해주세요."
                );
            } else {
                // pending 또는 processing: activeGeneration 업데이트
                setActiveGeneration(data);
            }
        } catch {
            // 네트워크 에러 시 폴링 유지 (다음 사이클에서 재시도)
        }
    }, [activeGeneration, pet.name, stopPolling]);

    useEffect(() => {
        if (!activeGeneration || activeGeneration.status === "completed" || activeGeneration.status === "failed") {
            stopPolling();
            return;
        }

        // 이미 폴링 중이면 중복 시작 방지
        if (pollIntervalRef.current) return;

        pollCountRef.current = 0;
        pollIntervalRef.current = setInterval(pollStatus, VIDEO.POLL_INTERVAL_MS);

        return () => {
            stopPolling();
        };
    }, [activeGeneration, pollStatus, stopPolling]);

    // ---- 핸들러 ----

    const handleOpenGenerateModal = useCallback(() => {
        // 횟수 초과 시 프리미엄 모달로 유도
        if (quota) {
            const remaining = quota.limit - quota.used;
            const exhausted = quota.isLifetimeFree ? quota.lifetimeFreeUsed : remaining <= 0;
            if (exhausted) {
                window.dispatchEvent(new CustomEvent("openPremiumModal", { detail: { feature: "ai-chat-limit" } }));
                return;
            }
        }
        setIsGenerateModalOpen(true);
    }, [quota]);

    const handleCloseGenerateModal = useCallback(() => {
        setIsGenerateModalOpen(false);
    }, []);

    const handleGenerationSuccess = useCallback(
        async (generationId: string) => {
            setIsGenerateModalOpen(false);

            const newGeneration: VideoGeneration = {
                id: generationId,
                userId: "",
                petId: pet.id,
                petName: pet.name,
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
            };

            setActiveGeneration(newGeneration);

            // 쿼터 새로고침
            await fetchQuota();

            toast.success("영상 생성을 시작했어요! 완성되면 알려드릴게요.");
        },
        [pet.id, pet.name, fetchQuota]
    );

    const handleVideoClick = useCallback((video: VideoGeneration) => {
        setSelectedVideo(video);
    }, []);

    const handleCloseResultModal = useCallback(() => {
        setSelectedVideo(null);
    }, []);

    // ---- 유틸 ----

    const formatDate = (dateStr: string): string => {
        try {
            const d = new Date(dateStr);
            return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
        } catch {
            return dateStr;
        }
    };

    const getElapsedTime = (createdAt: string): string => {
        try {
            const start = new Date(createdAt).getTime();
            const now = Date.now();
            const diffSec = Math.floor((now - start) / 1000);

            if (diffSec < 60) return `${diffSec}초`;
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return `${diffMin}분`;
            const diffHour = Math.floor(diffMin / 60);
            return `${diffHour}시간 ${diffMin % 60}분`;
        } catch {
            return "";
        }
    };

    const getQuotaText = (): string => {
        if (!quota) return "";

        const remaining = Math.max(0, quota.limit - quota.used);

        if (quota.isLifetimeFree) {
            if (quota.lifetimeFreeUsed) {
                return "무료 체험이 완료되었어요";
            }
            return `무료 체험 ${remaining}회 남음`;
        }

        return `이번 달 ${remaining}/${quota.limit}회 남음`;
    };

    // ---- 렌더 ----

    const hasVideos = videos.length > 0;
    const hasActiveGeneration = activeGeneration && (activeGeneration.status === "pending" || activeGeneration.status === "processing");

    // 로딩 스켈레톤
    if (isLoading) {
        return (
            <Card className="mt-6">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-gray-200 animate-pulse rounded" />
                            <div className="h-5 w-28 bg-gray-200 animate-pulse rounded" />
                        </div>
                        <div className="h-8 w-28 bg-gray-200 animate-pulse rounded-md" />
                    </div>
                    <div className="flex gap-3">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="w-52 flex-shrink-0 rounded-xl overflow-hidden"
                            >
                                <div className="aspect-video bg-gray-100 animate-pulse" />
                                <div className="p-2 space-y-1">
                                    <div className="h-3 bg-gray-100 animate-pulse rounded w-3/4" />
                                    <div className="h-3 bg-gray-50 animate-pulse rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="mt-6">
                <CardContent className="p-5">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <Film className="w-5 h-5 text-memento-500" />
                                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                                    AI 영상 만들기
                                </h3>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">
                                사진 한 장으로 특별한 영상을 만들어보세요
                            </p>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleOpenGenerateModal}
                            disabled={!!hasActiveGeneration}
                            className="bg-gradient-to-r from-memento-500 to-memento-400 text-white hover:opacity-90"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            새 영상 만들기
                        </Button>
                    </div>

                    {/* 진행 중인 생성 */}
                    {hasActiveGeneration && (
                        <div className="mb-4 p-3 rounded-lg bg-memento-500/5 border border-memento-500/20">
                            <div className="flex items-center gap-3">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-memento-500 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-memento-500" />
                                </span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                        영상을 만들고 있어요...
                                    </p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <Clock className="w-3 h-3 text-gray-400" />
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            경과 시간: {getElapsedTime(activeGeneration.createdAt)}
                                        </p>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        보통 5~10분 정도 소요돼요. 다른 페이지를 둘러보셔도 괜찮아요!
                                    </p>
                                </div>
                                <Loader2 className="w-5 h-5 text-memento-500 animate-spin" />
                            </div>
                        </div>
                    )}

                    {/* 최근 영상 목록 */}
                    {hasVideos && (
                        <div
                            ref={videoScrollRef}
                            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                            style={{ WebkitOverflowScrolling: "touch" }}
                        >
                            {videos
                                .filter((v) => v.status === "completed")
                                .map((video) => (
                                    <div
                                        key={video.id}
                                        onClick={() => handleVideoClick(video)}
                                        className="w-52 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:ring-2 hover:ring-memento-300 hover:shadow-md active:scale-[0.98]"
                                    >
                                        {/* 썸네일 */}
                                        <div className="aspect-video relative bg-gray-100 dark:bg-gray-700">
                                            {video.thumbnailUrl ? (
                                                <img
                                                    src={video.thumbnailUrl}
                                                    alt={`${video.petName || pet.name} 영상`}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-memento-50 to-memento-100">
                                                    <Film className="w-8 h-8 text-memento-300" />
                                                </div>
                                            )}
                                            {/* 재생 아이콘 오버레이 */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <PlayCircle className="w-12 h-12 text-white/80 drop-shadow-lg" />
                                            </div>
                                            {/* 재생 시간 */}
                                            {video.durationSeconds && (
                                                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-medium text-white bg-black/50 rounded backdrop-blur-sm">
                                                    {video.durationSeconds}초
                                                </span>
                                            )}
                                        </div>

                                        {/* 텍스트 영역 */}
                                        <div className="p-3">
                                            <p className="text-base font-medium text-gray-800 dark:text-gray-100 truncate">
                                                {video.petName || pet.name}
                                            </p>
                                            <p className="text-sm text-gray-400 mt-0.5">
                                                {formatDate(video.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* 빈 상태 (영상 없고 생성 중도 아닐 때) */}
                    {!hasVideos && !hasActiveGeneration && (
                        <div className="flex flex-col items-center py-8 text-center">
                            <div className="w-14 h-14 rounded-full bg-memento-50 dark:bg-memento-900/30 flex items-center justify-center mb-3">
                                <Film className="w-7 h-7 text-memento-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                아직 만든 영상이 없어요
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                                사진을 골라 첫 번째 영상을 만들어보세요
                            </p>
                            <Button
                                size="sm"
                                onClick={handleOpenGenerateModal}
                                className="bg-gradient-to-r from-memento-500 to-memento-400 text-white hover:opacity-90"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                영상 만들기
                            </Button>
                        </div>
                    )}

                    {/* 쿼터 표시 */}
                    {quota && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-400 text-center">
                                {getQuotaText()}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 영상 생성 모달 */}
            {isGenerateModalOpen && (
                <VideoGenerateModal
                    isOpen={isGenerateModalOpen}
                    onClose={handleCloseGenerateModal}
                    pet={pet}
                    onSuccess={handleGenerationSuccess}
                />
            )}

            {/* 영상 결과 모달 */}
            {selectedVideo && (
                <VideoResultModal
                    isOpen={!!selectedVideo}
                    onClose={handleCloseResultModal}
                    video={selectedVideo}
                    authorName={user?.user_metadata?.nickname || user?.email?.split("@")[0] || "익명"}
                    onShowOffSuccess={() => {
                        handleCloseResultModal();
                    }}
                />
            )}
        </>
    );
}
