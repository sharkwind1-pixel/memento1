/**
 * MemoryAlbumsSection.tsx
 * 추모 모드 반려동물의 추억 앨범 수평 스크롤 카드 리스트
 *
 * - 추억 앨범 목록을 가로 스크롤 카드로 표시
 * - 카드 클릭 시 MemoryAlbumViewer 모달 오픈
 * - 미읽은 앨범 NEW 뱃지 표시
 * - initialAlbumId로 푸시 알림 딥링크 지원
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback } from "react";
import { Image as ImageIcon } from "lucide-react";
import useHorizontalScroll from "@/hooks/useHorizontalScroll";
import { MemoryAlbum } from "@/types";
import { API } from "@/config/apiEndpoints";
import { authFetch } from "@/lib/auth-fetch";
import MemoryAlbumViewer from "./MemoryAlbumViewer";

interface MemoryAlbumsSectionProps {
    petId: string;
    petName: string;
    /** URL 쿼리 파라미터에서 전달받은 앨범 ID (푸시 알림 딥링크용) */
    initialAlbumId?: string | null;
}

export default function MemoryAlbumsSection({
    petId,
    petName,
    initialAlbumId,
}: MemoryAlbumsSectionProps) {
    const [albums, setAlbums] = useState<MemoryAlbum[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAlbum, setSelectedAlbum] = useState<MemoryAlbum | null>(null);
    const [initialAlbumHandled, setInitialAlbumHandled] = useState(false);
    const albumScrollRef = useHorizontalScroll();

    // 앨범 목록 fetch
    useEffect(() => {
        let cancelled = false;

        async function fetchAlbums() {
            setIsLoading(true);
            try {
                const res = await authFetch(`${API.MEMORY_ALBUMS}?petId=${petId}`);
                if (!res.ok) throw new Error("앨범 조회 실패");

                const data = await res.json();
                if (!cancelled) {
                    setAlbums(data.albums || []);
                    setUnreadCount(data.unreadCount || 0);
                }
            } catch {
                if (!cancelled) {
                    setAlbums([]);
                    setUnreadCount(0);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        fetchAlbums();
        return () => { cancelled = true; };
    }, [petId]);

    // initialAlbumId 딥링크 처리: 데이터 로드 후 자동 오픈
    useEffect(() => {
        if (initialAlbumHandled || isLoading || !initialAlbumId || albums.length === 0) {
            return;
        }

        const targetAlbum = albums.find((a) => a.id === initialAlbumId);
        if (targetAlbum) {
            setSelectedAlbum(targetAlbum);
            // URL에서 쿼리 파라미터 제거
            const url = new URL(window.location.href);
            url.searchParams.delete("album");
            window.history.replaceState({}, "", url.toString());
        }
        setInitialAlbumHandled(true);
    }, [initialAlbumId, albums, isLoading, initialAlbumHandled]);

    // petId 변경 시 딥링크 핸들링 리셋
    useEffect(() => {
        setInitialAlbumHandled(false);
    }, [petId]);

    // 앨범 카드 클릭
    const handleAlbumClick = useCallback((album: MemoryAlbum) => {
        setSelectedAlbum(album);
    }, []);

    // 뷰어 닫기 + 읽음 처리
    const handleViewerClose = useCallback(async () => {
        if (selectedAlbum && !selectedAlbum.isRead) {
            // 로컬 상태 즉시 업데이트
            setAlbums((prev) =>
                prev.map((a) =>
                    a.id === selectedAlbum.id ? { ...a, isRead: true } : a
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));

            // 서버에 읽음 처리 요청
            try {
                await authFetch(API.MEMORY_ALBUM_READ(selectedAlbum.id), {
                    method: "PATCH",
                });
            } catch {
                // 읽음 처리 실패해도 UX에는 영향 없음
            }
        }
        setSelectedAlbum(null);
    }, [selectedAlbum]);

    // 날짜 포맷팅 (YYYY-MM-DD -> M월 D일)
    const formatDate = (dateStr: string): string => {
        try {
            const d = new Date(dateStr);
            return `${d.getMonth() + 1}월 ${d.getDate()}일`;
        } catch {
            return dateStr;
        }
    };

    // 로딩 중 스켈레톤
    if (isLoading) {
        return (
            <section className="mb-6">
                <div className="flex items-center gap-2 mb-3 px-1">
                    <ImageIcon className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-semibold text-gray-800">
                        추억 앨범
                    </h3>
                </div>
                <div
                    className="flex gap-3 overflow-x-auto pb-2"
                    style={{ WebkitOverflowScrolling: "touch" }}
                >
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="w-32 flex-shrink-0 rounded-xl overflow-hidden"
                        >
                            <div className="aspect-[3/4] bg-amber-100/60 animate-pulse rounded-xl" />
                            <div className="p-2 space-y-1.5">
                                <div className="h-4 bg-amber-100/60 animate-pulse rounded w-3/4" />
                                <div className="h-3 bg-amber-50/60 animate-pulse rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    // 앨범이 없으면 렌더링하지 않음
    if (albums.length === 0) {
        return null;
    }

    return (
        <>
            <section className="mb-6">
                {/* 섹션 헤더 */}
                <div className="flex items-center gap-2 mb-3 px-1">
                    <ImageIcon className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-semibold text-gray-800">
                        추억 앨범
                    </h3>
                    {unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-amber-500 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>

                {/* 수평 스크롤 카드 리스트 */}
                <div
                    ref={albumScrollRef}
                    className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                    style={{ WebkitOverflowScrolling: "touch" }}
                >
                    {albums.map((album) => {
                        const coverPhoto = album.photos?.[0];
                        const coverUrl = coverPhoto?.url;

                        return (
                            <div
                                key={album.id}
                                onClick={() => handleAlbumClick(album)}
                                className="w-32 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 transition-all duration-200 hover:ring-2 hover:ring-amber-300 hover:scale-[1.02] active:ring-2 active:ring-amber-300 active:scale-[1.02]"
                            >
                                {/* 커버 이미지 */}
                                <div className="aspect-[3/4] relative bg-amber-100/40">
                                    {coverUrl ? (
                                        <img
                                            src={coverUrl}
                                            alt={album.title}
                                            className="w-full h-full object-cover"
                                            style={{
                                                objectPosition: coverPhoto?.cropPosition
                                                    ? `${coverPhoto.cropPosition.x}% ${coverPhoto.cropPosition.y}%`
                                                    : "center",
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-10 h-10 text-amber-300" />
                                        </div>
                                    )}

                                    {/* 미읽은 앨범 NEW 뱃지 */}
                                    {!album.isRead && (
                                        <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold text-white bg-amber-500 rounded-md shadow-sm">
                                            NEW
                                        </span>
                                    )}

                                    {/* 사진 수 표시 */}
                                    {album.photos && album.photos.length > 1 && (
                                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[10px] font-medium text-white bg-black/40 rounded-md backdrop-blur-sm">
                                            {album.photos.length}장
                                        </span>
                                    )}
                                </div>

                                {/* 카드 텍스트 영역 */}
                                <div className="p-2">
                                    <p className="text-sm font-medium text-gray-800 truncate">
                                        {album.title}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {formatDate(album.createdDate)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* 앨범 뷰어 모달 */}
            {selectedAlbum && (
                <MemoryAlbumViewer
                    album={selectedAlbum}
                    onClose={handleViewerClose}
                />
            )}
        </>
    );
}
