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
} from "lucide-react";
import ImageCropper, { CropPosition } from "./ImageCropper";

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
        cropPositions: CropPosition[]
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
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                    thumbnail = (await generateVideoThumbnail(file)) || undefined;
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
            })
        );

        setSelectedFiles((prev) => [...prev, ...newFiles]);

        const firstImageIndex = selectedFiles.length + newFiles.findIndex((f) => !f.isVideo);
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
            prev.map((f, i) => (i === index ? { ...f, caption } : f))
        );
    };

    const handleCropSave = (index: number, position: CropPosition) => {
        setSelectedFiles((prev) =>
            prev.map((f, i) =>
                i === index ? { ...f, cropPosition: position, cropped: true } : f
            )
        );
        const nextUncropped = selectedFiles.findIndex(
            (f, i) => i > index && !f.cropped && !f.isVideo
        );
        setCropIndex(nextUncropped !== -1 ? nextUncropped : null);
    };

    const handleUpload = () => {
        const uncropped = selectedFiles.filter((f) => !f.cropped);
        if (uncropped.length > 0) {
            alert("모든 사진의 영역을 선택해주세요");
            return;
        }
        onUpload(
            selectedFiles.map((f) => f.file),
            selectedFiles.map((f) => f.caption),
            selectedFiles.map((f) => f.cropPosition)
        );
        setSelectedFiles([]);
        onClose();
    };

    const allCropped = selectedFiles.length > 0 && selectedFiles.every((f) => f.cropped);
    const imageCount = selectedFiles.filter((f) => !f.isVideo).length;
    const videoCount = selectedFiles.filter((f) => f.isVideo).length;

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">사진/영상 업로드</h3>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-[#05B2DC] transition-colors"
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
                            이미지: JPG, PNG, GIF / 영상: MP4, MOV, WebM (최대 100MB)
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
                                        className="text-[#05B2DC] animate-bounce text-xl"
                                        style={{
                                            animationDelay: `${i * 0.15}s`,
                                            animationDuration: "0.5s",
                                        }}
                                    >
                                        🐾
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
                                            : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200"
                                    }`}
                                >
                                    <div
                                        className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                                        onClick={() => !file.isVideo && setCropIndex(index)}
                                    >
                                        {file.isVideo ? (
                                            <>
                                                <img
                                                    src={file.thumbnail || file.preview}
                                                    alt=""
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
                                                    alt=""
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
                                                {(file.file.size / 1024 / 1024).toFixed(1)}MB
                                            </span>
                                        </div>
                                        <Input
                                            placeholder="캡션 (선택)"
                                            value={file.caption}
                                            onChange={(e) =>
                                                handleCaptionChange(index, e.target.value)
                                            }
                                            className="mb-2 h-8 text-sm"
                                        />
                                        <div className="flex gap-2">
                                            {!file.isVideo && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCropIndex(index)}
                                                    className="text-xs h-7"
                                                >
                                                    <Move className="w-3 h-3 mr-1" />
                                                    영역 수정
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemove(index)}
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
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            <X className="w-4 h-4 mr-2" />
                            취소
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={!allCropped || isLoading}
                            className="flex-1 bg-[#05B2DC] hover:bg-[#0891B2]"
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
