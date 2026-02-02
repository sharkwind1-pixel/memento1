/**
 * RecordPage.tsx
 * 우리의 기록 - 마이페이지
 * 사진 1:1 비율, 스텝 형식 등록, CRUD 완성
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useCallback, useEffect } from "react";
import { usePets, Pet, PetPhoto } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Camera,
    Plus,
    Heart,
    Calendar,
    Grid3X3,
    List,
    Star,
    MoreHorizontal,
    Pencil,
    Trash2,
    Crown,
    LogIn,
    PawPrint,
    X,
    ZoomIn,
    ZoomOut,
    Move,
    Check,
    Upload,
    Image as ImageIcon,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Video,
    Play,
    Film,
    BookOpen,
    Smile,
    Frown,
    Meh,
    Thermometer,
    Clock,
    User,
    Settings,
    Mail,
    LogOut,
    Shield,
    Bell,
    Loader2,
} from "lucide-react";

import { TabType } from "@/types";
import MemorialSwitchModal from "@/components/modals/MemorialSwitchModal";
import RemindersSection from "@/components/features/reminders/RemindersSection";

interface RecordPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

// 1:1 이미지 크롭 컴포넌트
function ImageCropper({
    imageUrl,
    initialPosition,
    onSave,
    onCancel,
}: {
    imageUrl: string;
    initialPosition?: { x: number; y: number; scale: number };
    onSave: (position: { x: number; y: number; scale: number }) => void;
    onCancel: () => void;
}) {
    const [position, setPosition] = useState(
        initialPosition || { x: 50, y: 50, scale: 1 },
    );
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setPosition((prev) => ({
                ...prev,
                x: Math.max(0, Math.min(100, x)),
                y: Math.max(0, Math.min(100, y)),
            }));
        },
        [isDragging],
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleTouchMove = useCallback(
        (e: TouchEvent) => {
            if (!isDragging || !containerRef.current) return;
            const touch = e.touches[0];
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((touch.clientX - rect.left) / rect.width) * 100;
            const y = ((touch.clientY - rect.top) / rect.height) * 100;
            setPosition((prev) => ({
                ...prev,
                x: Math.max(0, Math.min(100, x)),
                y: Math.max(0, Math.min(100, y)),
            }));
        },
        [isDragging],
    );

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            window.addEventListener("touchmove", handleTouchMove);
            window.addEventListener("touchend", handleTouchEnd);
            return () => {
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
                window.removeEventListener("touchmove", handleTouchMove);
                window.removeEventListener("touchend", handleTouchEnd);
            };
        }
    }, [
        isDragging,
        handleMouseMove,
        handleMouseUp,
        handleTouchMove,
        handleTouchEnd,
    ]);

    const handleScale = (delta: number) => {
        setPosition((prev) => ({
            ...prev,
            scale: Math.max(1, Math.min(3, prev.scale + delta)),
        }));
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
                <h3 className="text-lg font-semibold mb-2 text-center">
                    사진 영역 선택
                </h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                    1:1 비율로 보여질 영역을 선택하세요
                </p>

                <div
                    ref={containerRef}
                    className="relative w-full aspect-square rounded-xl overflow-hidden cursor-move border-4 border-[#05B2DC]"
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                >
                    <img
                        src={imageUrl}
                        alt="Crop preview"
                        className="absolute w-full h-full"
                        style={{
                            objectFit: "cover",
                            objectPosition: `${position.x}% ${position.y}%`,
                            transform: `scale(${position.scale})`,
                        }}
                        draggable={false}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-16 h-16 border-2 border-white/70 rounded-full flex items-center justify-center bg-black/20">
                            <Move className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-4 mt-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleScale(-0.2)}
                        disabled={position.scale <= 1}
                    >
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-500 w-16 text-center">
                        {Math.round(position.scale * 100)}%
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleScale(0.2)}
                        disabled={position.scale >= 3}
                    >
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex gap-3 mt-6">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1"
                    >
                        <X className="w-4 h-4 mr-2" />
                        취소
                    </Button>
                    <Button
                        onClick={() => onSave(position)}
                        className="flex-1 bg-[#05B2DC] hover:bg-[#0891B2]"
                    >
                        <Check className="w-4 h-4 mr-2" />
                        적용
                    </Button>
                </div>
            </div>
        </div>
    );
}

// 미디어 타입 체크 헬퍼
function isVideoFile(file: File): boolean {
    return file.type.startsWith("video/");
}

// 미디어 업로드 모달 (사진 + 영상)
function MediaUploadModal({
    isOpen,
    onClose,
    onUpload,
}: {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (
        files: File[],
        captions: string[],
        cropPositions: { x: number; y: number; scale: number }[],
    ) => void;
}) {
    const [selectedFiles, setSelectedFiles] = useState<
        {
            file: File;
            preview: string;
            thumbnail?: string; // 영상용 썸네일
            caption: string;
            cropPosition: { x: number; y: number; scale: number };
            cropped: boolean;
            isVideo: boolean;
        }[]
    >([]);
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
                    cropped: isVideo, // 영상은 크롭 불필요
                    isVideo,
                };
            })
        );

        setSelectedFiles((prev) => [...prev, ...newFiles]);

        // 첫 번째 이미지에 크롭 인덱스 설정
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
            prev.map((f, i) => (i === index ? { ...f, caption } : f)),
        );
    };

    const handleCropSave = (
        index: number,
        position: { x: number; y: number; scale: number },
    ) => {
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
            alert("모든 사진의 영역을 선택해주세요");
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
            <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">
                            사진/영상 업로드
                        </h3>
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
                            <div className="animate-spin w-6 h-6 border-2 border-[#05B2DC] border-t-transparent rounded-full mx-auto mb-2" />
                            영상 썸네일 생성 중...
                        </div>
                    )}

                    {selectedFiles.length > 0 && (
                        <div className="mt-4 space-y-4">
                            {selectedFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className={`flex gap-4 p-3 rounded-xl ${file.cropped ? "bg-green-50 dark:bg-green-900/20 border border-green-200" : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200"}`}
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
                                                handleCaptionChange(
                                                    index,
                                                    e.target.value,
                                                )
                                            }
                                            className="mb-2 h-8 text-sm"
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

            {cropIndex !== null && selectedFiles[cropIndex] && !selectedFiles[cropIndex].isVideo && (
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

// 반려동물 등록/수정 모달 (스텝 형식)
function PetModal({
    isOpen,
    onClose,
    pet,
    onSave,
}: {
    isOpen: boolean;
    onClose: () => void;
    pet?: Pet | null;
    onSave: (pet: Omit<Pet, "id" | "createdAt" | "photos">) => void | Promise<void>;
}) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: "",
        type: "강아지" as Pet["type"],
        breed: "",
        birthday: "",
        gender: "남아" as Pet["gender"],
        weight: "",
        personality: "",
        status: "active" as Pet["status"],
        isPrimary: false,
    });
    const [profilePreview, setProfilePreview] = useState<string>("");
    const [profileCropPosition, setProfileCropPosition] = useState({
        x: 50,
        y: 50,
        scale: 1,
    });
    const [showCropper, setShowCropper] = useState(false);
    const [profileCropped, setProfileCropped] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            if (pet) {
                setFormData({
                    name: pet.name,
                    type: pet.type,
                    breed: pet.breed,
                    birthday: pet.birthday,
                    gender: pet.gender,
                    weight: pet.weight,
                    personality: pet.personality,
                    status: pet.status,
                    isPrimary: pet.isPrimary,
                });
                setProfilePreview(pet.profileImage);
                setProfileCropPosition(
                    pet.profileCropPosition || { x: 50, y: 50, scale: 1 },
                );
                setProfileCropped(!!pet.profileImage);
            } else {
                setFormData({
                    name: "",
                    type: "강아지",
                    breed: "",
                    birthday: "",
                    gender: "남아",
                    weight: "",
                    personality: "",
                    status: "active",
                    isPrimary: false,
                });
                setProfilePreview("");
                setProfileCropPosition({ x: 50, y: 50, scale: 1 });
                setProfileCropped(false);
            }
        }
    }, [pet, isOpen]);

    if (!isOpen) return null;

    const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePreview(reader.result as string);
                setProfileCropped(false);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropSave = (position: {
        x: number;
        y: number;
        scale: number;
    }) => {
        setProfileCropPosition(position);
        setProfileCropped(true);
        setShowCropper(false);
    };

    const handleNext = () => {
        if (!formData.name.trim()) {
            alert("이름을 입력해주세요");
            return;
        }
        if (profilePreview && !profileCropped) {
            alert("프로필 사진 영역을 선택해주세요");
            return;
        }
        setStep(2);
    };

    const handleSubmit = async () => {
        await onSave({
            ...formData,
            profileImage: profilePreview,
            profileCropPosition,
        });
        // onClose는 handleSavePet에서 처리됨
    };

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl max-w-md w-full overflow-hidden max-h-[90vh] flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold">
                            {pet ? "반려동물 수정" : "새 반려동물 등록"}
                        </h3>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="flex items-center justify-center gap-2 py-3 bg-gray-50 dark:bg-gray-800">
                        <div
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${step === 1 ? "bg-[#05B2DC] text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}
                        >
                            <Camera className="w-4 h-4" />
                            사진/이름
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <div
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${step === 2 ? "bg-[#05B2DC] text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}
                        >
                            <PawPrint className="w-4 h-4" />
                            상세정보
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                        {step === 1 ? (
                            <div className="space-y-6">
                                <div className="flex flex-col items-center">
                                    <div
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        className={`relative w-40 h-40 rounded-2xl cursor-pointer overflow-hidden border-4 transition-all ${profilePreview && !profileCropped ? "border-amber-400" : profilePreview ? "border-green-400" : "border-dashed border-[#05B2DC] hover:border-solid"} shadow-lg bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD]`}
                                    >
                                        {profilePreview ? (
                                            <img
                                                src={profilePreview}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                                style={{
                                                    objectPosition: `${profileCropPosition.x}% ${profileCropPosition.y}%`,
                                                    transform: `scale(${profileCropPosition.scale})`,
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-[#05B2DC]">
                                                <Camera className="w-12 h-12 mb-2" />
                                                <span className="text-sm font-medium">
                                                    사진 등록
                                                </span>
                                                <span className="text-xs text-gray-400 mt-1">
                                                    클릭하여 선택
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {profilePreview && (
                                        <div className="flex gap-2 mt-3">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setShowCropper(true)
                                                }
                                                className="text-xs"
                                            >
                                                <Move className="w-3 h-3 mr-1" />
                                                영역 수정
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setProfilePreview("");
                                                    setProfileCropped(false);
                                                }}
                                                className="text-xs text-red-500 hover:text-red-600"
                                            >
                                                <Trash2 className="w-3 h-3 mr-1" />
                                                삭제
                                            </Button>
                                        </div>
                                    )}
                                    {profilePreview && !profileCropped && (
                                        <p className="text-amber-600 text-xs mt-2 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            영역 선택이 필요해요
                                        </p>
                                    )}
                                    {profilePreview && profileCropped && (
                                        <p className="text-green-600 text-xs mt-2 flex items-center gap-1">
                                            <Check className="w-3 h-3" />
                                            사진 준비 완료
                                        </p>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleProfileUpload}
                                        className="hidden"
                                    />
                                </div>

                                <div>
                                    <Label className="text-base font-medium">
                                        이름 *
                                    </Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                name: e.target.value,
                                            }))
                                        }
                                        placeholder="반려동물 이름을 입력하세요"
                                        className="mt-2 h-12 text-lg"
                                    />
                                </div>

                                <div>
                                    <Label className="text-base font-medium">
                                        종류
                                    </Label>
                                    <div className="flex gap-2 mt-2">
                                        {["강아지", "고양이", "기타"].map(
                                            (type) => (
                                                <Button
                                                    key={type}
                                                    type="button"
                                                    variant={
                                                        formData.type === type
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    onClick={() =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            type: type as Pet["type"],
                                                        }))
                                                    }
                                                    className={
                                                        formData.type === type
                                                            ? "bg-[#05B2DC] hover:bg-[#0891B2]"
                                                            : ""
                                                    }
                                                >
                                                    {type}
                                                </Button>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>성별</Label>
                                        <Select
                                            value={formData.gender}
                                            onValueChange={(v) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    gender: v as Pet["gender"],
                                                }))
                                            }
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="남아">
                                                    남아
                                                </SelectItem>
                                                <SelectItem value="여아">
                                                    여아
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>품종</Label>
                                        <Input
                                            value={formData.breed}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    breed: e.target.value,
                                                }))
                                            }
                                            placeholder="예: 말티즈"
                                            className="mt-1"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>생일</Label>
                                        <Input
                                            type="date"
                                            value={formData.birthday}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    birthday: e.target.value,
                                                }))
                                            }
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label>몸무게</Label>
                                        <Input
                                            value={formData.weight}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    weight: e.target.value,
                                                }))
                                            }
                                            placeholder="예: 3.2kg"
                                            className="mt-1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label>성격/특징</Label>
                                    <Textarea
                                        value={formData.personality}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                personality: e.target.value,
                                            }))
                                        }
                                        placeholder="우리 아이만의 특징을 적어주세요"
                                        rows={3}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>현재 상태</Label>
                                    <div className="flex gap-2 mt-2">
                                        <Button
                                            type="button"
                                            variant={
                                                formData.status === "active"
                                                    ? "default"
                                                    : "outline"
                                            }
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    status: "active",
                                                }))
                                            }
                                            className={`flex-1 ${formData.status === "active" ? "bg-green-500 hover:bg-green-600" : ""}`}
                                        >
                                            <Heart className="w-4 h-4 mr-2" />
                                            함께하는 중
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={
                                                formData.status === "memorial"
                                                    ? "default"
                                                    : "outline"
                                            }
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    status: "memorial",
                                                }))
                                            }
                                            className={`flex-1 ${formData.status === "memorial" ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                                        >
                                            <Star className="w-4 h-4 mr-2" />
                                            기억 속에서 함께해요
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                        {step === 1 ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    className="flex-1"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    취소
                                </Button>
                                <Button
                                    onClick={handleNext}
                                    className="flex-1 bg-[#05B2DC] hover:bg-[#0891B2]"
                                >
                                    다음
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(1)}
                                    className="flex-1"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    이전
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    className="flex-1 bg-[#05B2DC] hover:bg-[#0891B2]"
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    {pet ? "수정하기" : "등록하기"}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showCropper && profilePreview && (
                <ImageCropper
                    imageUrl={profilePreview}
                    initialPosition={profileCropPosition}
                    onSave={handleCropSave}
                    onCancel={() => setShowCropper(false)}
                />
            )}
        </>
    );
}

// 삭제 확인 모달
function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {message}
                </p>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                    >
                        <X className="w-4 h-4 mr-2" />
                        취소
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                    </Button>
                </div>
            </div>
        </div>
    );
}

// 사진 뷰어
// 미디어 뷰어 (사진/영상)
function PhotoViewer({
    photo,
    petName,
    onClose,
    onDelete,
}: {
    photo: PetPhoto;
    petName: string;
    onClose: () => void;
    onDelete: () => void;
}) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isVideo = photo.type === "video";

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-black/90 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <div
                    className="relative max-w-md w-full"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-white hover:bg-red-500/20 rounded-full"
                        >
                            <Trash2 className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="text-white hover:bg-white/20 rounded-full"
                        >
                            <X className="w-6 h-6" />
                        </Button>
                    </div>

                    {isVideo ? (
                        <div className="rounded-2xl overflow-hidden bg-black">
                            <video
                                src={photo.url}
                                controls
                                autoPlay
                                className="w-full max-h-[70vh] object-contain"
                                poster={photo.thumbnailUrl}
                            >
                                브라우저가 비디오를 지원하지 않습니다.
                            </video>
                        </div>
                    ) : (
                        <div className="aspect-square rounded-2xl overflow-hidden">
                            <img
                                src={photo.url}
                                alt={photo.caption}
                                className="w-full h-full object-cover"
                                style={{
                                    objectPosition: photo.cropPosition
                                        ? `${photo.cropPosition.x}% ${photo.cropPosition.y}%`
                                        : "center",
                                }}
                            />
                        </div>
                    )}

                    <div className="text-center mt-4 text-white">
                        <div className="flex items-center justify-center gap-2">
                            {isVideo && (
                                <Badge className="bg-purple-600 text-white text-xs">
                                    <Video className="w-3 h-3 mr-1" />
                                    영상
                                </Badge>
                            )}
                            <p className="font-medium">
                                {photo.caption || petName}
                            </p>
                        </div>
                        <p className="text-sm text-gray-400">{photo.date}</p>
                    </div>
                </div>
            </div>
            <DeleteConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={onDelete}
                title={isVideo ? "영상 삭제" : "사진 삭제"}
                message={isVideo ? "이 영상을 삭제하시겠습니까?" : "이 사진을 삭제하시겠습니까?"}
            />
        </>
    );
}

// 나이 계산
function calculateAge(birthday: string): string {
    if (!birthday) return "";
    const birth = new Date(birthday);
    const now = new Date();
    const totalMonths =
        (now.getFullYear() - birth.getFullYear()) * 12 +
        (now.getMonth() - birth.getMonth());
    if (totalMonths < 12) return `${totalMonths}개월`;
    const remainingMonths = totalMonths % 12;
    return remainingMonths > 0
        ? `${Math.floor(totalMonths / 12)}살 ${remainingMonths}개월`
        : `${Math.floor(totalMonths / 12)}살`;
}

// 기분 아이콘 매핑
const moodIcons = {
    happy: { icon: Smile, color: "text-green-500", bg: "bg-green-100", label: "좋음" },
    normal: { icon: Meh, color: "text-blue-500", bg: "bg-blue-100", label: "보통" },
    sad: { icon: Frown, color: "text-amber-500", bg: "bg-amber-100", label: "우울" },
    sick: { icon: Thermometer, color: "text-red-500", bg: "bg-red-100", label: "아픔" },
};

// 타임라인 섹션 컴포넌트
function TimelineSection({ petId, petName }: { petId: string; petName: string }) {
    const { timeline, fetchTimeline, addTimelineEntry, updateTimelineEntry, deleteTimelineEntry } = usePets();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        title: "",
        content: "",
        mood: "normal" as "happy" | "normal" | "sad" | "sick",
    });

    // 펫 변경 시 타임라인 로드
    useEffect(() => {
        if (petId) {
            fetchTimeline(petId);
        }
    }, [petId, fetchTimeline]);

    // 새 일기 작성 모달 열기
    const openAddModal = () => {
        setEditingEntryId(null);
        setFormData({
            date: new Date().toISOString().split("T")[0],
            title: "",
            content: "",
            mood: "normal",
        });
        setIsModalOpen(true);
    };

    // 수정 모달 열기
    const openEditModal = (entry: typeof timeline[0]) => {
        setEditingEntryId(entry.id);
        setFormData({
            date: entry.date,
            title: entry.title,
            content: entry.content || "",
            mood: entry.mood || "normal",
        });
        setIsModalOpen(true);
    };

    // 저장 (추가 또는 수정)
    const handleSave = async () => {
        if (!formData.title.trim()) {
            alert("제목을 입력해주세요");
            return;
        }

        if (editingEntryId) {
            // 수정 모드
            await updateTimelineEntry(editingEntryId, {
                date: formData.date,
                title: formData.title,
                content: formData.content,
                mood: formData.mood,
            });
        } else {
            // 추가 모드
            const result = await addTimelineEntry(petId, {
                date: formData.date,
                title: formData.title,
                content: formData.content,
                mood: formData.mood,
            });

            if (!result) {
                alert("일기 저장에 실패했습니다. 다시 시도해주세요.");
                return;
            }
        }

        setIsModalOpen(false);
        setEditingEntryId(null);
    };

    const handleDelete = async (entryId: string) => {
        if (confirm("이 일기를 삭제하시겠습니까?")) {
            await deleteTimelineEntry(entryId);
        }
    };

    // 비로그인 시 안내
    if (!user) {
        return (
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mt-6">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-[#05B2DC]" />
                        타임라인 일기
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-gray-500">
                        <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p>로그인하시면 매일의 일상을 기록할 수 있어요</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mt-6">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-[#05B2DC]" />
                        타임라인 일기
                        <span className="text-sm font-normal text-gray-500">
                            {timeline.length}개
                        </span>
                    </CardTitle>
                    <Button
                        size="sm"
                        onClick={openAddModal}
                        className="bg-[#05B2DC] hover:bg-[#0891B2]"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        일기 쓰기
                    </Button>
                </CardHeader>
                <CardContent>
                    {timeline.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="w-16 h-16 rounded-full bg-[#E0F7FF] flex items-center justify-center mx-auto mb-4">
                                <BookOpen className="w-8 h-8 text-[#05B2DC]" />
                            </div>
                            <h3 className="font-medium text-gray-700 mb-2">
                                아직 기록된 일기가 없어요
                            </h3>
                            <p className="text-sm text-gray-400 mb-4">
                                오늘 하루를 기록해보세요
                            </p>
                            <Button
                                onClick={openAddModal}
                                variant="outline"
                                className="border-[#05B2DC] text-[#05B2DC] hover:bg-[#E0F7FF]"
                            >
                                <Pencil className="w-4 h-4 mr-2" />
                                첫 일기 쓰기
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {timeline.map((entry) => {
                                const moodInfo = moodIcons[entry.mood || "normal"];
                                const MoodIcon = moodInfo.icon;

                                return (
                                    <div
                                        key={entry.id}
                                        className="relative pl-6 pb-4 border-l-2 border-[#05B2DC]/30 last:pb-0"
                                    >
                                        {/* 타임라인 dot */}
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#05B2DC] border-2 border-white" />

                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 group">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-500">
                                                        {entry.date}
                                                    </span>
                                                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${moodInfo.bg} ${moodInfo.color}`}>
                                                        <MoodIcon className="w-3 h-3" />
                                                        {moodInfo.label}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openEditModal(entry)}
                                                        className="p-1 text-gray-400 hover:text-[#05B2DC]"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(entry.id)}
                                                        className="p-1 text-gray-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <h4 className="font-medium text-gray-800 dark:text-white mb-1">
                                                {entry.title}
                                            </h4>
                                            {entry.content && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                                    {entry.content}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 일기 작성/수정 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-[#05B2DC]" />
                                {editingEntryId ? "일기 수정" : `${petName}의 일기`}
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsModalOpen(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label>날짜</Label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, date: e.target.value }))
                                    }
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label>오늘의 기분</Label>
                                <div className="grid grid-cols-4 gap-2 mt-2">
                                    {(Object.entries(moodIcons) as [keyof typeof moodIcons, typeof moodIcons[keyof typeof moodIcons]][]).map(
                                        ([mood, info]) => {
                                            const Icon = info.icon;
                                            return (
                                                <button
                                                    key={mood}
                                                    type="button"
                                                    onClick={() =>
                                                        setFormData((prev) => ({ ...prev, mood }))
                                                    }
                                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                                                        formData.mood === mood
                                                            ? `${info.bg} ring-2 ring-offset-2 ring-[#05B2DC]`
                                                            : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700"
                                                    }`}
                                                >
                                                    <Icon className={`w-6 h-6 ${info.color}`} />
                                                    <span className="text-xs">{info.label}</span>
                                                </button>
                                            );
                                        }
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label>제목 *</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                                    }
                                    placeholder="오늘의 한 줄"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label>내용</Label>
                                <Textarea
                                    value={formData.content}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, content: e.target.value }))
                                    }
                                    placeholder="오늘 있었던 일을 기록해보세요..."
                                    rows={4}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1"
                            >
                                <X className="w-4 h-4 mr-2" />
                                취소
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="flex-1 bg-[#05B2DC] hover:bg-[#0891B2]"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                {editingEntryId ? "수정" : "저장"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// 메인
export default function RecordPage({ setSelectedTab }: RecordPageProps) {
    const { user, loading: authLoading, signOut, updateProfile } = useAuth();
    const {
        pets,
        selectedPetId,
        selectedPet,
        addPet,
        updatePet,
        deletePet,
        selectPet,
        addMedia,
        deletePhoto,
        deletePhotos,
        isLoading: petsLoading,
    } = usePets();

    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [isPetModalOpen, setIsPetModalOpen] = useState(false);
    const [editingPet, setEditingPet] = useState<Pet | null>(null);
    const [isPhotoUploadOpen, setIsPhotoUploadOpen] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState<PetPhoto | null>(null);
    const [petToDelete, setPetToDelete] = useState<Pet | null>(null);

    // 마이페이지 상태
    const [activeTab, setActiveTab] = useState<"pets" | "profile">("pets");
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [nickname, setNickname] = useState("");
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // 사용자 닉네임 초기화
    useEffect(() => {
        if (user?.user_metadata?.nickname) {
            setNickname(user.user_metadata.nickname);
        } else if (user?.email) {
            setNickname(user.email.split("@")[0]);
        }
    }, [user]);

    // 닉네임 저장
    const handleSaveNickname = async () => {
        if (!nickname.trim()) {
            alert("닉네임을 입력해주세요");
            return;
        }
        setIsSavingProfile(true);
        const { error } = await updateProfile({ nickname: nickname.trim() });
        setIsSavingProfile(false);
        if (error) {
            alert("닉네임 변경에 실패했습니다.");
        } else {
            setIsEditingNickname(false);
        }
    };

    // 로그아웃
    const handleSignOut = async () => {
        if (confirm("로그아웃 하시겠습니까?")) {
            await signOut();
        }
    };
    const [showPetMenu, setShowPetMenu] = useState<string | null>(null);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
    const [isMemorialModalOpen, setIsMemorialModalOpen] = useState(false);

    // 리마인더 섹션 ref (스크롤용)
    const remindersSectionRef = useRef<HTMLDivElement>(null);

    const scrollToReminders = () => {
        remindersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // 분기점 전환 처리
    const handleMemorialSwitch = (memorialDate: string) => {
        if (!selectedPet) return;
        updatePet(selectedPet.id, {
            status: "memorial",
            memorialDate: memorialDate,
        });
    };

    const handleSelectAll = () => {
        if (!selectedPet) return;
        setSelectedPhotos(
            selectedPhotos.length === selectedPet.photos.length
                ? []
                : selectedPet.photos.map((p) => p.id),
        );
    };

    const togglePhotoSelect = (photoId: string) => {
        setSelectedPhotos((prev) =>
            prev.includes(photoId)
                ? prev.filter((id) => id !== photoId)
                : [...prev, photoId],
        );
    };

    const handleSavePet = async (
        petData: Omit<Pet, "id" | "createdAt" | "photos">,
    ) => {
        try {
            if (editingPet) {
                await updatePet(editingPet.id, petData);
            } else {
                await addPet(petData);
            }
            setEditingPet(null);
            setIsPetModalOpen(false);
        } catch (error) {
            console.error("Pet save error:", error);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

    const handleMediaUpload = async (
        files: File[],
        captions: string[],
        cropPositions: { x: number; y: number; scale: number }[],
    ) => {
        if (!selectedPet) return;

        setIsUploading(true);
        try {
            await addMedia(
                selectedPet.id,
                files,
                captions,
                files.map(() => new Date().toISOString().split("T")[0]),
                (current, total) => setUploadProgress({ current, total }),
            );
        } catch (error) {
            console.error("Upload failed:", error);
            alert("업로드 중 오류가 발생했습니다.");
        } finally {
            setIsUploading(false);
            setUploadProgress({ current: 0, total: 0 });
        }
    };

    // 기존 호환용 (deprecated)
    const handlePhotoUpload = (
        photos: {
            url: string;
            caption: string;
            cropPosition: { x: number; y: number; scale: number };
        }[],
    ) => {
        // 이 함수는 더 이상 사용되지 않음 - MediaUploadModal이 handleMediaUpload 사용
        console.warn("handlePhotoUpload is deprecated, use handleMediaUpload");
    };

    // 선택 삭제 핸들러
    const handleDeleteSelected = async () => {
        if (!selectedPet || selectedPhotos.length === 0) return;
        if (!confirm(`선택한 ${selectedPhotos.length}개의 항목을 삭제하시겠습니까?`)) return;

        await deletePhotos(selectedPet.id, selectedPhotos);
        setSelectedPhotos([]);
        setIsSelectMode(false);
    };

    useEffect(() => {
        if (!isSelectMode) setSelectedPhotos([]);
    }, [isSelectMode]);
    useEffect(() => {
        setIsSelectMode(false);
        setSelectedPhotos([]);
    }, [selectedPetId]);

    if (authLoading || petsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="relative w-12 h-12 mx-auto mb-4">
                        <PawPrint className="w-12 h-12 text-[#05B2DC]/20" />
                        <Loader2 className="w-12 h-12 text-[#05B2DC] animate-spin absolute inset-0" />
                    </div>
                    <p className="text-gray-500">불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
                <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center mb-6">
                        <LogIn className="w-12 h-12 text-[#05B2DC]" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                        로그인이 필요해요
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                        우리 아이의 소중한 기록을 남기려면
                        <br />
                        먼저 로그인해주세요
                    </p>
                    <Button
                        onClick={() =>
                            window.dispatchEvent(
                                new CustomEvent("openAuthModal"),
                            )
                        }
                        className="bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#05B2DC] text-white px-8"
                    >
                        <LogIn className="w-4 h-4 mr-2" />
                        로그인하기
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden pb-24">
            <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
            <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
                {/* 페이지 헤더 */}
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        우리의 기록
                    </h1>
                </div>

                {/* 탭 네비게이션 */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab("pets")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                            activeTab === "pets"
                                ? "bg-[#05B2DC] text-white shadow-lg"
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                    >
                        <PawPrint className="w-4 h-4" />
                        반려동물
                    </button>
                    <button
                        onClick={() => setActiveTab("profile")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                            activeTab === "profile"
                                ? "bg-[#05B2DC] text-white shadow-lg"
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                    >
                        <User className="w-4 h-4" />
                        내 정보
                    </button>
                </div>

                {/* 내 정보 탭 */}
                {activeTab === "profile" && (
                    <div className="space-y-4">
                        {/* 프로필 카드 */}
                        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="w-5 h-5 text-[#05B2DC]" />
                                    프로필 정보
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* 닉네임 */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#05B2DC] to-[#38BDF8] flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">
                                                {nickname?.charAt(0)?.toUpperCase() || "?"}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">닉네임</p>
                                            {isEditingNickname ? (
                                                <Input
                                                    value={nickname}
                                                    onChange={(e) => setNickname(e.target.value)}
                                                    className="mt-1 h-8"
                                                    placeholder="닉네임 입력"
                                                    autoFocus
                                                />
                                            ) : (
                                                <p className="font-medium text-gray-800 dark:text-white">
                                                    {nickname || "닉네임 없음"}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {isEditingNickname ? (
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setIsEditingNickname(false);
                                                    setNickname(user?.user_metadata?.nickname || user?.email?.split("@")[0] || "");
                                                }}
                                            >
                                                취소
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleSaveNickname}
                                                disabled={isSavingProfile}
                                                className="bg-[#05B2DC] hover:bg-[#0891B2]"
                                            >
                                                {isSavingProfile ? "저장 중..." : "저장"}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setIsEditingNickname(true)}
                                        >
                                            <Pencil className="w-4 h-4 mr-1" />
                                            수정
                                        </Button>
                                    )}
                                </div>

                                {/* 이메일 */}
                                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">이메일</p>
                                        <p className="font-medium text-gray-800 dark:text-white">
                                            {user?.email || "이메일 없음"}
                                        </p>
                                    </div>
                                </div>

                                {/* 가입일 */}
                                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">가입일</p>
                                        <p className="font-medium text-gray-800 dark:text-white">
                                            {user?.created_at
                                                ? new Date(user.created_at).toLocaleDateString("ko-KR", {
                                                      year: "numeric",
                                                      month: "long",
                                                      day: "numeric",
                                                  })
                                                : "정보 없음"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 통계 카드 */}
                        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Heart className="w-5 h-5 text-pink-500" />
                                    나의 기록
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] rounded-xl">
                                        <p className="text-2xl font-bold text-[#05B2DC]">{pets.length}</p>
                                        <p className="text-sm text-gray-600">반려동물</p>
                                    </div>
                                    <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl">
                                        <p className="text-2xl font-bold text-pink-500">
                                            {pets.reduce((acc, pet) => acc + pet.photos.length, 0)}
                                        </p>
                                        <p className="text-sm text-gray-600">사진/영상</p>
                                    </div>
                                    <div className="text-center p-4 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl">
                                        <p className="text-2xl font-bold text-violet-500">
                                            {pets.filter((p) => p.status === "memorial").length}
                                        </p>
                                        <p className="text-sm text-gray-600">추억 속에</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 계정 관리 */}
                        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-gray-500" />
                                    계정 관리
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>로그아웃</span>
                                </button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 반려동물 탭 */}
                {activeTab === "pets" && (
                    <>
                        {/* 새 반려동물 추가 버튼 */}
                        <div className="flex justify-end mb-4">
                            <Button
                                onClick={() => {
                                    setEditingPet(null);
                                    setIsPetModalOpen(true);
                                }}
                                className="bg-[#05B2DC] hover:bg-[#0891B2]"
                            >
                                <Plus className="w-4 h-4 mr-2" />새 반려동물
                            </Button>
                        </div>

                        {pets.length === 0 ? (
                    <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center mb-4">
                                <PawPrint className="w-10 h-10 text-[#05B2DC]" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                                아직 등록된 반려동물이 없어요
                            </h3>
                            <p className="text-gray-500 text-center mb-6">
                                소중한 반려동물을 등록하고
                                <br />
                                함께한 추억을 기록해보세요
                            </p>
                            <Button
                                onClick={() => {
                                    setEditingPet(null);
                                    setIsPetModalOpen(true);
                                }}
                                className="bg-gradient-to-r from-[#05B2DC] to-[#38BDF8]"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                반려동물 등록하기
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* 펫 카드 그리드 - 1:1 비율 */}
                        <div className="mb-6">
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {pets.map((pet) => (
                                    <div
                                        key={pet.id}
                                        className="relative"
                                    >
                                        <button
                                            onClick={() => selectPet(pet.id)}
                                            className={`relative w-full aspect-square rounded-2xl overflow-hidden transition-all ${
                                                selectedPetId === pet.id
                                                    ? "ring-4 ring-[#05B2DC] shadow-lg scale-[1.02]"
                                                    : "ring-2 ring-transparent hover:ring-gray-200 dark:hover:ring-gray-600"
                                            }`}
                                        >
                                            {/* 프로필 이미지 */}
                                            {pet.profileImage ? (
                                                <img
                                                    src={pet.profileImage}
                                                    alt={pet.name}
                                                    className="w-full h-full object-cover"
                                                    style={{
                                                        objectPosition:
                                                            pet.profileCropPosition
                                                                ? `${pet.profileCropPosition.x}% ${pet.profileCropPosition.y}%`
                                                                : "center",
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center">
                                                    <PawPrint className="w-10 h-10 text-[#05B2DC]" />
                                                </div>
                                            )}

                                            {/* 하단 정보 오버레이 */}
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2 pt-6">
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="font-semibold text-white text-sm truncate">
                                                        {pet.name}
                                                    </span>
                                                    {pet.isPrimary && (
                                                        <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                                    )}
                                                    {pet.status === "memorial" && (
                                                        <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-white/70 text-xs text-center truncate">
                                                    {pet.breed}
                                                </p>
                                            </div>

                                            {/* 선택됨 표시 */}
                                            {selectedPetId === pet.id && (
                                                <div className="absolute top-2 left-2 w-5 h-5 bg-[#05B2DC] rounded-full flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </button>

                                        {/* 더보기 메뉴 버튼 */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowPetMenu(
                                                    showPetMenu === pet.id
                                                        ? null
                                                        : pet.id,
                                                );
                                            }}
                                            className="absolute top-1 right-1 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center active:scale-95"
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>

                                        {/* 드롭다운 메뉴 */}
                                        {showPetMenu === pet.id && (
                                            <div className="absolute top-10 right-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 min-w-[140px] animate-in fade-in-0 zoom-in-95">
                                                <button
                                                    onClick={() => {
                                                        setEditingPet(pet);
                                                        setIsPetModalOpen(true);
                                                        setShowPetMenu(null);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4 text-gray-500" />
                                                    <span>정보 수정</span>
                                                </button>
                                                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1 mx-2" />
                                                <button
                                                    onClick={() => {
                                                        setPetToDelete(pet);
                                                        setShowPetMenu(null);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    <span>삭제하기</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {/* 새 펫 추가 버튼 - 1:1 비율 */}
                                <button
                                    onClick={() => {
                                        setEditingPet(null);
                                        setIsPetModalOpen(true);
                                    }}
                                    className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center hover:border-[#05B2DC] hover:bg-[#05B2DC]/5 active:scale-95 transition-all min-h-[80px]"
                                >
                                    <Plus className="w-8 h-8 text-gray-400 mb-1" />
                                    <span className="text-xs text-gray-400">추가</span>
                                </button>
                            </div>
                        </div>

                        {selectedPet && (
                            <>
                                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mb-6">
                                    <CardContent className="p-4 sm:p-6">
                                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                                            <div className="relative">
                                                <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg">
                                                    {selectedPet.profileImage ? (
                                                        <img
                                                            src={
                                                                selectedPet.profileImage
                                                            }
                                                            alt={
                                                                selectedPet.name
                                                            }
                                                            className="w-full h-full object-cover"
                                                            style={{
                                                                objectPosition:
                                                                    selectedPet.profileCropPosition
                                                                        ? `${selectedPet.profileCropPosition.x}% ${selectedPet.profileCropPosition.y}%`
                                                                        : "center",
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center">
                                                            <PawPrint className="w-10 h-10 text-[#05B2DC]" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                                        {selectedPet.name}
                                                    </h2>
                                                    {selectedPet.isPrimary && (
                                                        <Badge className="bg-amber-100 text-amber-700 text-xs">
                                                            <Crown className="w-3 h-3 mr-1" />
                                                            대표
                                                        </Badge>
                                                    )}
                                                    <Badge
                                                        className={`text-xs ${selectedPet.status === "memorial" ? "bg-violet-100 text-violet-700" : "bg-green-100 text-green-700"}`}
                                                    >
                                                        {selectedPet.status ===
                                                        "memorial" ? (
                                                            <>
                                                                <Star className="w-3 h-3 mr-1" />
                                                                추억 속에
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Heart className="w-3 h-3 mr-1" />
                                                                함께하는 중
                                                            </>
                                                        )}
                                                    </Badge>
                                                </div>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                                                    {selectedPet.type} ·{" "}
                                                    {selectedPet.breed} ·{" "}
                                                    {selectedPet.gender}
                                                </p>
                                                <div className="flex flex-wrap gap-2 text-sm">
                                                    {selectedPet.birthday && (
                                                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                                            <Calendar className="w-4 h-4" />
                                                            {calculateAge(
                                                                selectedPet.birthday,
                                                            )}
                                                        </span>
                                                    )}
                                                    {selectedPet.weight && (
                                                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                                            <Star className="w-4 h-4" />
                                                            {selectedPet.weight}
                                                        </span>
                                                    )}
                                                </div>
                                                {selectedPet.personality && (
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                                                        {
                                                            selectedPet.personality
                                                        }
                                                    </p>
                                                )}

                                                {/* 분기점 전환/리마인더 버튼 - active 상태일 때만 표시 */}
                                                {selectedPet.status === "active" && (
                                                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                                                        <Button
                                                            onClick={scrollToReminders}
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-[#05B2DC] text-[#05B2DC] hover:bg-[#E0F7FF] hover:text-[#0891B2]"
                                                        >
                                                            <Bell className="w-4 h-4 mr-2" />
                                                            케어 알림
                                                        </Button>
                                                        <Button
                                                            onClick={() => setIsMemorialModalOpen(true)}
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-amber-300 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/30"
                                                        >
                                                            <Star className="w-4 h-4 mr-2" />
                                                            분기점 전환
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* 추모 모드일 때 - 일상 모드 복구 옵션 */}
                                                {selectedPet.status === "memorial" && (
                                                    <div className="mt-4 space-y-2">
                                                        <p className="text-xs text-amber-600 dark:text-amber-400">
                                                            {selectedPet.memorialDate &&
                                                                `무지개다리를 건넌 날: ${selectedPet.memorialDate}`
                                                            }
                                                        </p>
                                                        <Button
                                                            onClick={() => {
                                                                if (confirm("일상 모드로 되돌리시겠습니까?")) {
                                                                    updatePet(selectedPet.id, {
                                                                        status: "active",
                                                                        memorialDate: undefined,
                                                                    });
                                                                }
                                                            }}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-gray-500 hover:text-gray-700 text-xs"
                                                        >
                                                            <Heart className="w-3 h-3 mr-1" />
                                                            일상 모드로 복구
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle className="text-lg">
                                            사진/영상 앨범
                                            <span className="text-sm font-normal text-gray-500 ml-2">
                                                {selectedPet.photos.length}개
                                            </span>
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            {selectedPet.photos.length > 0 && (
                                                <Button
                                                    variant={
                                                        isSelectMode
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    size="sm"
                                                    onClick={() => {
                                                        setIsSelectMode(
                                                            !isSelectMode,
                                                        );
                                                        setSelectedPhotos([]);
                                                    }}
                                                    className={
                                                        isSelectMode
                                                            ? "bg-gray-500 hover:bg-gray-600"
                                                            : ""
                                                    }
                                                >
                                                    {isSelectMode
                                                        ? "취소"
                                                        : "선택"}
                                                </Button>
                                            )}
                                            {isSelectMode && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={
                                                            handleSelectAll
                                                        }
                                                    >
                                                        {selectedPhotos.length ===
                                                        selectedPet.photos
                                                            .length
                                                            ? "전체 해제"
                                                            : "전체 선택"}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={
                                                            handleDeleteSelected
                                                        }
                                                        disabled={
                                                            selectedPhotos.length ===
                                                            0
                                                        }
                                                        className="bg-red-500 hover:bg-red-600 text-white"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" />
                                                        {selectedPhotos.length}
                                                        장 삭제
                                                    </Button>
                                                </>
                                            )}
                                            {!isSelectMode && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            setViewMode(
                                                                viewMode ===
                                                                    "grid"
                                                                    ? "list"
                                                                    : "grid",
                                                            )
                                                        }
                                                    >
                                                        {viewMode === "grid" ? (
                                                            <List className="w-4 h-4" />
                                                        ) : (
                                                            <Grid3X3 className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        onClick={() =>
                                                            setIsPhotoUploadOpen(
                                                                true,
                                                            )
                                                        }
                                                        size="sm"
                                                        className="bg-[#05B2DC] hover:bg-[#0891B2]"
                                                    >
                                                        <Plus className="w-4 h-4 mr-1" />
                                                        사진 추가
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedPet.photos.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="w-16 h-16 rounded-full bg-[#E0F7FF] dark:bg-[#05B2DC]/20 flex items-center justify-center mx-auto mb-4">
                                                    <Camera className="w-8 h-8 text-[#05B2DC]" />
                                                </div>
                                                <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-2">
                                                    아직 등록된 사진이 없어요
                                                </h3>
                                                <p className="text-sm text-gray-400 mb-4">
                                                    소중한 순간을 담아보세요
                                                </p>
                                                <Button
                                                    onClick={() =>
                                                        setIsPhotoUploadOpen(
                                                            true,
                                                        )
                                                    }
                                                    variant="outline"
                                                    className="border-[#05B2DC] text-[#05B2DC] hover:bg-[#E0F7FF]"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    첫 사진 추가하기
                                                </Button>
                                            </div>
                                        ) : viewMode === "grid" ? (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                                {selectedPet.photos.map(
                                                    (photo) => (
                                                        <div
                                                            key={photo.id}
                                                            onClick={() => {
                                                                if (isSelectMode) {
                                                                    togglePhotoSelect(photo.id);
                                                                } else {
                                                                    setViewingPhoto(photo);
                                                                }
                                                            }}
                                                            className={`aspect-square rounded-xl overflow-hidden cursor-pointer transition-all relative group ${isSelectMode && selectedPhotos.includes(photo.id) ? "ring-4 ring-[#05B2DC]" : "hover:opacity-90"}`}
                                                        >
                                                            {photo.type === "video" ? (
                                                                <>
                                                                    <img
                                                                        src={photo.thumbnailUrl || photo.url}
                                                                        alt={photo.caption}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                                                            <Play className="w-6 h-6 text-gray-800 fill-gray-800 ml-1" />
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <img
                                                                    src={photo.url}
                                                                    alt={photo.caption}
                                                                    className="w-full h-full object-cover"
                                                                    style={{
                                                                        objectPosition: photo.cropPosition
                                                                            ? `${photo.cropPosition.x}% ${photo.cropPosition.y}%`
                                                                            : "center",
                                                                    }}
                                                                />
                                                            )}
                                                            {isSelectMode && (
                                                                <div
                                                                    className={`absolute top-2 left-2 w-7 h-7 rounded-full border-2 flex items-center justify-center ${selectedPhotos.includes(photo.id) ? "bg-[#05B2DC] border-[#05B2DC]" : "bg-white/80 border-gray-300"}`}
                                                                >
                                                                    {selectedPhotos.includes(photo.id) && (
                                                                        <Check className="w-4 h-4 text-white" />
                                                                    )}
                                                                </div>
                                                            )}
                                                            {!isSelectMode && (
                                                                <button
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm("삭제하시겠습니까?")) {
                                                                            await deletePhoto(selectedPet.id, photo.id);
                                                                        }
                                                                    }}
                                                                    className="absolute top-1 right-1 p-1.5 bg-black/50 text-white rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity min-w-[28px] min-h-[28px] flex items-center justify-center active:scale-95"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {selectedPet.photos.map(
                                                    (photo) => (
                                                        <div
                                                            key={photo.id}
                                                            onClick={() => {
                                                                if (
                                                                    isSelectMode
                                                                )
                                                                    togglePhotoSelect(
                                                                        photo.id,
                                                                    );
                                                                else
                                                                    setViewingPhoto(
                                                                        photo,
                                                                    );
                                                            }}
                                                            className={`flex gap-4 p-3 rounded-xl cursor-pointer transition-colors group ${isSelectMode && selectedPhotos.includes(photo.id) ? "bg-[#E0F7FF] ring-2 ring-[#05B2DC]" : "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100"}`}
                                                        >
                                                            {isSelectMode && (
                                                                <div
                                                                    className={`self-center w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedPhotos.includes(photo.id) ? "bg-[#05B2DC] border-[#05B2DC]" : "bg-white border-gray-300"}`}
                                                                >
                                                                    {selectedPhotos.includes(
                                                                        photo.id,
                                                                    ) && (
                                                                        <Check className="w-4 h-4 text-white" />
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                                                                {photo.type === "video" ? (
                                                                    <>
                                                                        <img
                                                                            src={photo.thumbnailUrl || photo.url}
                                                                            alt={photo.caption}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                                            <Play className="w-5 h-5 text-white fill-white" />
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <img
                                                                        src={photo.url}
                                                                        alt={photo.caption}
                                                                        className="w-full h-full object-cover"
                                                                        style={{
                                                                            objectPosition: photo.cropPosition
                                                                                ? `${photo.cropPosition.x}% ${photo.cropPosition.y}%`
                                                                                : "center",
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-800 dark:text-white">
                                                                    {photo.caption ||
                                                                        selectedPet.name}
                                                                </p>
                                                                <p className="text-sm text-gray-500">
                                                                    {photo.date}
                                                                </p>
                                                            </div>
                                                            {!isSelectMode && (
                                                                <button
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm("삭제하시겠습니까?")) {
                                                                            await deletePhoto(selectedPet.id, photo.id);
                                                                        }
                                                                    }}
                                                                    className="self-center p-2 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* 타임라인 일기 섹션 */}
                                <TimelineSection
                                    petId={selectedPet.id}
                                    petName={selectedPet.name}
                                />

                                {/* 케어 리마인더 섹션 - 일상 기록 중인 펫만 */}
                                {selectedPet.status !== "memorial" && (
                                    <div ref={remindersSectionRef}>
                                        <RemindersSection
                                            petId={selectedPet.id}
                                            petName={selectedPet.name}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
                    </>
                )}
            </div>

            <PetModal
                isOpen={isPetModalOpen}
                onClose={() => {
                    setIsPetModalOpen(false);
                    setEditingPet(null);
                }}
                pet={editingPet}
                onSave={handleSavePet}
            />
            <MediaUploadModal
                isOpen={isPhotoUploadOpen}
                onClose={() => setIsPhotoUploadOpen(false)}
                onUpload={handleMediaUpload}
            />
            {viewingPhoto && selectedPet && (
                <PhotoViewer
                    photo={viewingPhoto}
                    petName={selectedPet.name}
                    onClose={() => setViewingPhoto(null)}
                    onDelete={async () => {
                        await deletePhoto(selectedPet.id, viewingPhoto.id);
                        setViewingPhoto(null);
                    }}
                />
            )}
            <DeleteConfirmModal
                isOpen={!!petToDelete}
                onClose={() => setPetToDelete(null)}
                onConfirm={async () => {
                    if (petToDelete) {
                        await deletePet(petToDelete.id);
                        setPetToDelete(null);
                    }
                }}
                title="반려동물 삭제"
                message={`"${petToDelete?.name}"의 모든 기록이 삭제됩니다.`}
            />

            {/* 분기점 전환 모달 */}
            {selectedPet && (
                <MemorialSwitchModal
                    pet={selectedPet}
                    isOpen={isMemorialModalOpen}
                    onClose={() => setIsMemorialModalOpen(false)}
                    onConfirm={handleMemorialSwitch}
                />
            )}

            {showPetMenu && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowPetMenu(null)}
                />
            )}
        </div>
    );
}
