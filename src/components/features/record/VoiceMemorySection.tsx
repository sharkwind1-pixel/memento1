/**
 * VoiceMemorySection.tsx
 * "다시 듣고 싶은 목소리" — 추모 모드 전용 진입점.
 * 업로드된 영상(원본 오디오 포함)을 모아 우리 아이의 진짜 목소리를 다시 들을 수 있게 한다.
 *
 * 재사용: selectedPet.photos(영상)·PhotoViewer(<video>). 새 저장소/업로드 경로 없음.
 * 수동재생(PhotoViewer autoPlay=false) — 갑작스러운 재생 방지 + 소리 있는 autoplay 브라우저 차단 회피.
 * 본인 RecordPage 안에서만 렌더 → 본인전용. pet-media는 public 버킷이지만 공개페이지엔 노출하지 않는다.
 */

"use client";

import { PetPhoto } from "@/contexts/PetContext";
import { Volume2, Play } from "lucide-react";

interface VoiceMemorySectionProps {
    petName: string;
    /** selectedPet.photos 전체 — 내부에서 영상만 추려 photos 기준 index로 재생 콜백 호출 */
    photos: PetPhoto[];
    /** photos 배열 기준 index 전달 (PhotoViewer가 동일 배열을 사용) */
    onPlayVideo: (index: number) => void;
    onUploadClick: () => void;
}

export default function VoiceMemorySection({
    petName,
    photos,
    onPlayVideo,
    onUploadClick,
}: VoiceMemorySectionProps) {
    const videos = photos
        .map((p, index) => ({ p, index }))
        .filter((x) => x.p.type === "video");

    return (
        <div className="bg-gradient-to-br from-memorial-50 to-orange-50 dark:from-memorial-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-memorial-200/50 dark:border-memorial-700/50 space-y-3">
            <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-memorial-500" />
                <h3 className="font-semibold text-memorial-800 dark:text-memorial-200">
                    다시 듣고 싶은 목소리
                </h3>
            </div>

            {videos.length === 0 ? (
                <div className="text-center py-6">
                    <p className="text-sm text-memorial-700/90 dark:text-memorial-300/90 leading-relaxed">
                        {petName}의 영상을 올리면<br />
                        언제든 그 목소리를 다시 들을 수 있어요.
                    </p>
                    <button
                        onClick={onUploadClick}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-memorial-500 hover:bg-memorial-600 text-white text-sm font-medium transition-colors"
                    >
                        영상 올리기
                    </button>
                </div>
            ) : (
                <>
                    <p className="text-xs text-memorial-600/80 dark:text-memorial-400/80">
                        조용한 곳에서 천천히 들어보세요. 소리가 함께 재생돼요.
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                        {videos.map(({ p, index }) => (
                            <button
                                key={p.id}
                                onClick={() => onPlayVideo(index)}
                                className="group relative flex-shrink-0 w-28 h-28 rounded-xl overflow-hidden bg-black/80 border border-memorial-200/60 dark:border-memorial-700/60"
                                aria-label={`${p.caption || petName} 영상 재생`}
                            >
                                {p.thumbnailUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={p.thumbnailUrl}
                                        alt={p.caption || petName}
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-memorial-200 to-orange-200 dark:from-memorial-800 dark:to-orange-900" />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-10 h-10 rounded-full bg-white/85 flex items-center justify-center shadow">
                                        <Play className="w-5 h-5 text-memorial-600 ml-0.5" fill="currentColor" />
                                    </div>
                                </div>
                                {p.caption && (
                                    <span className="absolute bottom-0 inset-x-0 px-2 py-1 text-[11px] text-white bg-black/50 truncate text-left">
                                        {p.caption}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
