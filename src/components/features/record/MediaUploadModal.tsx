"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    X,
    Upload,
    Image as ImageIcon,
    Film,
    Play,
    Move,
    Check,
    Video,
    Trash2,
    PawPrint,
} from "lucide-react";
import ImageCropper, { CropPosition } from "./ImageCropper";
import { toast } from "sonner";

function isVideoFile(file: File): boolean {
    return file.type.startsWith("video/");
}

interface SelectedFile {
    file: File;
    preview: string;
    thumbnail?: string;
    caption: string;
    cropPosition: CropPosition;
    cropped: boolean;
    isVideo: boolean;
}

interface MediaUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (
        files: File[],
        captions: string[],
        cropPositions: CropPosition[],
    ) => void;
}

export default function MediaUploadModal({
    isOpen,
    onClose,
    onUpload,
}: MediaUploadModalProps) {
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
    const [cropIndex, setCropIndex] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 모달 열림/닫힘 시 body 스크롤 제어
    // position: fixed 대신 overflow: hidden + touchmove 차단 — iOS 네이티브 사진 선택기 스크롤 충돌 방지
    useEffect(() => {
        if (!isOpen) return;

        document.body.style.overflow = 'hidden';

        // iOS Safari rubber band 오버스크롤 방지 — body 직접 터치만 차단
        // 네이티브 사진 선택기는 별도 시스템 레이어라 영향 없음
        const preventBodyScroll = (e: TouchEvent) => {
            if (e.target === document.body || e.target === document.documentElement) {
                e.preventDefault();
            }
        };
        document.body.addEventListener('touchmove', preventBodyScroll, { passive: false });

        return () => {
            document.body.style.overflow = '';
            document.body.removeEventListener('touchmove', preventBodyScroll);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
            setSelectedFiles([]);
            setCropIndex(null);
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClose = () => {
        if (selectedFiles.length > 0) {
            setShowCloseConfirm(true);
        } else {
            onClose();
        }
    };

    const generateVideoThumbnail = (file: File): Promise<string | null> => {
        return new Promise((resolve) => {
            const video = document.createElement("video");
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            video.preload = "metadata";
            video.muted = true;
            video.playsInline = true;

            video.onloadedmetadata = () => {
                video.currentTime = Math.min(1, video.duration / 2);
            };

            video.onseeked = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.7));
                URL.revokeObjectURL(video.src);
            };

            video.onerror = () => {
                resolve(null);
                URL.revokeObjectURL(video.src);
            };

            video.src = URL.createObjectURL(file);
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setIsLoading(true);

        const newFiles = await Promise.all(
            files.map(async (file) => {
                const isVideo = isVideoFile(file);
                let thumbnail: string | undefined;

                if (isVideo) {
                    thumbnail =
                        (await generateVideoThumbnail(file)) || undefined;
                }

                return {
                    file,
                    preview: URL.createObjectURL(file),
                    thumbnail,
                    caption: "",
                    cropPosition: { x: 50, y: 50, scale: 1 },
                    cropped: isVideo,
                    isVideo,
                };
            }),
        );

        setSelectedFiles((prev) => [...prev, ...newFiles]);

        const firstImageIndex =
            selectedFiles.length + newFiles.findIndex((f) => !f.isVideo);
        if (firstImageIndex >= selectedFiles.length) {
            setCropIndex(firstImageIndex);
        }

        setIsLoading(false);
    };

    const handleRemove = (index: number) => {
        setSelectedFiles((prev) => {
            URL.revokeObjectURL(prev[index].preview);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleCaptionChange = (index: number, caption: string) => {
        setSelectedFiles((prev) =>
            prev.map((f, i) => (i === index ? { ...f, caption } : f)),
        );
    };

    const handleCropSave = (index: number, position: CropPosition) => {
        setSelectedFiles((prev) =>
            prev.map((f, i) =>
                i === index
                    ? { ...f, cropPosition: position, cropped: true }
                    : f,
            ),
        );
        const nextUncropped = selectedFiles.findIndex(
            (f, i) => i > index && !f.cropped && !f.isVideo,
        );
        setCropIndex(nextUncropped !== -1 ? nextUncropped : null);
    };

    const handleUpload = () => {
        const uncropped = selectedFiles.filter((f) => !f.cropped);
        if (uncropped.length > 0) {
            toast.warning("모든 사진의 영역을 선택해주세요");
            return;
        }
        onUpload(
            selectedFiles.map((f) => f.file),
            selectedFiles.map((f) => f.caption),
            selectedFiles.map((f) => f.cropPosition),
        );
        setSelectedFiles([]);
        onClose();
    };

    const allCropped =
        selectedFiles.length > 0 && selectedFiles.every((f) => f.cropped);
    const imageCount = selectedFiles.filter((f) => !f.isVideo).length;
    const videoCount = selectedFiles.filter((f) => f.isVideo).length;

    return (
        <>
            {/* useBodyScrollLock 미사용 — iOS 네이티브 사진 선택기 스크롤 충돌 방지 */}
            {/* PetFormModal 패턴: backdrop 자체가 스크롤 컨테이너 */}
            <div
                className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50"
                style={{ WebkitOverflowScrolling: 'touch' }}
                onClick={handleBackdropClose}
            >
                <div className="min-h-full flex items-start justify-center pt-8 pb-8 px-4">
                <div
                    className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl p-6"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="media-upload-title"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 id="media-upload-title" className="text-lg font-semibold">
                            사진/영상 업로드
                        </h3>
                        <Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-memento-500 transition-colors"
                    >
                        <div className="flex justify-center gap-4 mb-2">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                            <Film className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-300">
                            클릭하여 사진 또는 영상 선택
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            여러 파일 선택 가능 · 사진은 1:1 비율로 크롭됩니다
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            이미지: JPG, PNG, GIF / 영상: MP4, MOV, WebM (최대
                            100MB)
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    {isLoading && (
                        <div className="mt-4 text-center text-gray-500">
                            <div className="flex gap-2 justify-center mb-2">
                                {[0, 1, 2].map((i) => (
                                    <span
                                        key={i}
                                        className="inline-flex text-memento-600 animate-bounce"
                                        style={{
                                            animationDelay: `${i * 0.15}s`,
                                            animationDuration: "0.5s",
                                        }}
                                    >
                                        <PawPrint className="w-5 h-5" />
                                    </span>
                                ))}
                            </div>
                            영상 썸네일 생성 중...
                        </div>
                    )}

                    {selectedFiles.length > 0 && (
                        <div className="mt-4 space-y-4">
                            {selectedFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className={`flex gap-4 p-3 rounded-xl ${
                                        file.cropped
                                            ? "bg-green-50 dark:bg-green-900/20 border border-green-200"
                                            : "bg-amber-50 dark:bg-gray-700/20 border border-amber-200"
                                    }`}
                                >
                                    <div
                                        className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                                        onClick={() =>
                                            !file.isVideo && setCropIndex(index)
                                        }
                                    >
                                        {file.isVideo ? (
                                            <>
                                                <img
                                                    src={
                                                        file.thumbnail ||
                                                        file.preview
                                                    }
                                                    alt="영상 미리보기"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                    <Play className="w-6 h-6 text-white fill-white" />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <img
                                                    src={file.preview}
                                                    alt="사진 미리보기"
                                                    className="w-full h-full object-cover"
                                                    style={{
                                                        objectPosition: `${file.cropPosition.x}% ${file.cropPosition.y}%`,
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                    <Move className="w-5 h-5 text-white" />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            {file.isVideo ? (
                                                <Badge className="bg-purple-100 text-purple-700 text-xs">
                                                    <Video className="w-3 h-3 mr-1" />
                                                    영상
                                                </Badge>
                                            ) : file.cropped ? (
                                                <Badge className="bg-green-100 text-green-700 text-xs">
                                                    <Check className="w-3 h-3 mr-1" />
                                                    완료
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-amber-100 text-amber-700 text-xs">
                                                    영역 선택 필요
                                                </Badge>
                                            )}
                                            <span className="text-xs text-gray-400">
                                                {(
                                                    file.file.size /
                                                    1024 /
                                                    1024
                                                ).toFixed(1)}
                                                MB
                                            </span>
                                        </div>
                                        <Input
                                            placeholder="캡션 (선택)"
                                            value={file.caption}
                                            onChange={(e) =>
                                                handleCaptionChange(
                                                    index,
                                                    e.target.value,
                                                )
                                            }
                                            className="mb-2 h-8 text-sm"
                                            aria-label="사진 캡션"
                                        />
                                        <div className="flex gap-2">
                                            {!file.isVideo && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setCropIndex(index)
                                                    }
                                                    className="text-xs h-7"
                                                >
                                                    <Move className="w-3 h-3 mr-1" />
                                                    영역 수정
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleRemove(index)
                                                }
                                                className="text-red-500 hover:text-red-600 text-xs h-7"
                                            >
                                                <Trash2 className="w-3 h-3 mr-1" />
                                                삭제
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            <X className="w-4 h-4 mr-2" />
                            취소
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={!allCropped || isLoading}
                            className="flex-1 bg-memento-500 hover:bg-memento-600"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            {imageCount > 0 && `사진 ${imageCount}장`}
                            {imageCount > 0 && videoCount > 0 && " + "}
                            {videoCount > 0 && `영상 ${videoCount}개`}
                            {" 업로드"}
                        </Button>
                    </div>
                </div>
                </div>
            </div>

            {/* 닫기 확인 다이얼로그 */}
            {showCloseConfirm && (
                <div
                    className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4"
                    onClick={() => setShowCloseConfirm(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                        role="alertdialog"
                        aria-modal="true"
                        aria-label="닫기 확인"
                    >
                        <p className="text-center text-gray-800 dark:text-gray-200 font-medium mb-2">
                            사진/영상을 선택중이에요
                        </p>
                        <p className="text-center text-gray-500 text-sm mb-6">
                            지금 닫으면 선택한 파일이 사라져요
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowCloseConfirm(false)}
                            >
                                계속 작성
                            </Button>
                            <Button
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                                onClick={() => {
                                    setShowCloseConfirm(false);
                                    onClose();
                                }}
                            >
                                닫기
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {cropIndex !== null &&
                selectedFiles[cropIndex] &&
                !selectedFiles[cropIndex].isVideo && (
                    <ImageCropper
                        imageUrl={selectedFiles[cropIndex].preview}
                        initialPosition={selectedFiles[cropIndex].cropPosition}
                        onSave={(pos) => handleCropSave(cropIndex, pos)}
                        onCancel={() => setCropIndex(null)}
                    />
                )}
        </>
    );
}
