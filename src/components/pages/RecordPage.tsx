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
} from "lucide-react";

import { TabType } from "@/types";

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

// 사진 업로드 모달
function PhotoUploadModal({
    isOpen,
    onClose,
    onUpload,
}: {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (
        photos: {
            url: string;
            caption: string;
            cropPosition: { x: number; y: number; scale: number };
        }[],
    ) => void;
}) {
    const [selectedFiles, setSelectedFiles] = useState<
        {
            file: File;
            preview: string;
            caption: string;
            cropPosition: { x: number; y: number; scale: number };
            cropped: boolean;
        }[]
    >([]);
    const [cropIndex, setCropIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) {
            selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
            setSelectedFiles([]);
            setCropIndex(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newFiles = files.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
            caption: "",
            cropPosition: { x: 50, y: 50, scale: 1 },
            cropped: false,
        }));
        setSelectedFiles((prev) => [...prev, ...newFiles]);
        if (newFiles.length > 0) {
            setCropIndex(selectedFiles.length);
        }
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
            (f, i) => i > index && !f.cropped,
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
            selectedFiles.map((f) => ({
                url: f.preview,
                caption: f.caption,
                cropPosition: f.cropPosition,
            })),
        );
        setSelectedFiles([]);
        onClose();
    };

    const allCropped =
        selectedFiles.length > 0 && selectedFiles.every((f) => f.cropped);

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">
                            사진 업로드 (1:1)
                        </h3>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-[#05B2DC] transition-colors"
                    >
                        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-600 dark:text-gray-300">
                            클릭하여 사진 선택
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            여러 장 선택 가능 · 1:1 비율로 크롭됩니다
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="mt-4 space-y-4">
                            {selectedFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className={`flex gap-4 p-3 rounded-xl ${file.cropped ? "bg-green-50 dark:bg-green-900/20 border border-green-200" : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200"}`}
                                >
                                    <div
                                        className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                                        onClick={() => setCropIndex(index)}
                                    >
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
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            {file.cropped ? (
                                                <Badge className="bg-green-100 text-green-700 text-xs">
                                                    <Check className="w-3 h-3 mr-1" />
                                                    완료
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-amber-100 text-amber-700 text-xs">
                                                    영역 선택 필요
                                                </Badge>
                                            )}
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
                            취소
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={!allCropped}
                            className="flex-1 bg-[#05B2DC] hover:bg-[#0891B2]"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            {selectedFiles.length}장 업로드
                        </Button>
                    </div>
                </div>
            </div>

            {cropIndex !== null && selectedFiles[cropIndex] && (
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
    onSave: (pet: Omit<Pet, "id" | "createdAt" | "photos">) => void;
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

    const handleSubmit = () => {
        onSave({
            ...formData,
            profileImage: profilePreview,
            profileCropPosition,
        });
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full overflow-hidden">
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

                    <div className="p-6">
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
                        취소
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    >
                        삭제
                    </Button>
                </div>
            </div>
        </div>
    );
}

// 사진 뷰어
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
                    <div className="text-center mt-4 text-white">
                        <p className="font-medium">
                            {photo.caption || petName}
                        </p>
                        <p className="text-sm text-gray-400">{photo.date}</p>
                    </div>
                </div>
            </div>
            <DeleteConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={onDelete}
                title="사진 삭제"
                message="이 사진을 삭제하시겠습니까?"
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

// 메인
export default function RecordPage({ setSelectedTab }: RecordPageProps) {
    const { user, loading: authLoading } = useAuth();
    const {
        pets,
        selectedPetId,
        selectedPet,
        addPet,
        updatePet,
        deletePet,
        selectPet,
        addPhotos,
        deletePhoto,
        isLoading: petsLoading,
    } = usePets();

    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [isPetModalOpen, setIsPetModalOpen] = useState(false);
    const [editingPet, setEditingPet] = useState<Pet | null>(null);
    const [isPhotoUploadOpen, setIsPhotoUploadOpen] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState<PetPhoto | null>(null);
    const [petToDelete, setPetToDelete] = useState<Pet | null>(null);
    const [showPetMenu, setShowPetMenu] = useState<string | null>(null);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

    const handleSelectAll = () => {
        if (!selectedPet) return;
        setSelectedPhotos(
            selectedPhotos.length === selectedPet.photos.length
                ? []
                : selectedPet.photos.map((p) => p.id),
        );
    };

    const handleDeleteSelected = () => {
        if (!selectedPet || selectedPhotos.length === 0) return;
        if (
            confirm(
                `선택한 ${selectedPhotos.length}장의 사진을 삭제하시겠습니까?`,
            )
        ) {
            selectedPhotos.forEach((photoId) =>
                deletePhoto(selectedPet.id, photoId),
            );
            setSelectedPhotos([]);
            setIsSelectMode(false);
        }
    };

    const togglePhotoSelect = (photoId: string) => {
        setSelectedPhotos((prev) =>
            prev.includes(photoId)
                ? prev.filter((id) => id !== photoId)
                : [...prev, photoId],
        );
    };

    const handleSavePet = (
        petData: Omit<Pet, "id" | "createdAt" | "photos">,
    ) => {
        if (editingPet) {
            updatePet(editingPet.id, petData);
        } else {
            addPet(petData);
        }
        setEditingPet(null);
    };

    const handlePhotoUpload = (
        photos: {
            url: string;
            caption: string;
            cropPosition: { x: number; y: number; scale: number };
        }[],
    ) => {
        if (!selectedPet) return;
        addPhotos(
            selectedPet.id,
            photos.map((p) => ({
                url: p.url,
                caption: p.caption,
                date: new Date().toISOString().split("T")[0],
                cropPosition: p.cropPosition,
            })),
        );
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
                    <PawPrint className="w-12 h-12 text-[#05B2DC] animate-bounce mx-auto mb-4" />
                    <p className="text-gray-500">로딩 중...</p>
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
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        우리의 기록
                    </h1>
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
                        <div className="mb-6">
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {pets.map((pet) => (
                                    <div
                                        key={pet.id}
                                        className="relative flex-shrink-0"
                                    >
                                        <button
                                            onClick={() => selectPet(pet.id)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${selectedPetId === pet.id ? "bg-[#05B2DC] text-white shadow-lg" : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                                        >
                                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow">
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
                                                        <PawPrint className="w-6 h-6 text-[#05B2DC]" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-left">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-semibold">
                                                        {pet.name}
                                                    </span>
                                                    {pet.isPrimary && (
                                                        <Crown className="w-3 h-3 text-amber-400" />
                                                    )}
                                                    {pet.status ===
                                                        "memorial" && (
                                                        <Star className="w-3 h-3 text-amber-400" />
                                                    )}
                                                </div>
                                                <span
                                                    className={`text-xs ${selectedPetId === pet.id ? "text-white/80" : "text-gray-500"}`}
                                                >
                                                    {pet.breed}{" "}
                                                    {pet.birthday &&
                                                        `· ${calculateAge(pet.birthday)}`}
                                                </span>
                                            </div>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowPetMenu(
                                                    showPetMenu === pet.id
                                                        ? null
                                                        : pet.id,
                                                );
                                            }}
                                            className={`absolute -top-1 -right-1 p-1 rounded-full ${selectedPetId === pet.id ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                        {showPetMenu === pet.id && (
                                            <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 min-w-[120px]">
                                                <button
                                                    onClick={() => {
                                                        setEditingPet(pet);
                                                        setIsPetModalOpen(true);
                                                        setShowPetMenu(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                    수정
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setPetToDelete(pet);
                                                        setShowPetMenu(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    삭제
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        setEditingPet(null);
                                        setIsPetModalOpen(true);
                                    }}
                                    className="flex-shrink-0 w-12 h-full min-h-[72px] rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-[#05B2DC] transition-colors"
                                >
                                    <Plus className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {selectedPet && (
                            <>
                                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mb-6">
                                    <CardContent className="p-6">
                                        <div className="flex items-start gap-6">
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
                                                <Badge
                                                    className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs ${selectedPet.status === "memorial" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}
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
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                                        {selectedPet.name}
                                                    </h2>
                                                    {selectedPet.isPrimary && (
                                                        <Badge className="bg-amber-100 text-amber-700 text-xs">
                                                            <Crown className="w-3 h-3 mr-1" />
                                                            대표
                                                        </Badge>
                                                    )}
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
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle className="text-lg">
                                            사진 앨범
                                            <span className="text-sm font-normal text-gray-500 ml-2">
                                                {selectedPet.photos.length}장
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
                                                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                                                    <ImageIcon className="w-8 h-8 text-gray-400" />
                                                </div>
                                                <p className="text-gray-500 mb-4">
                                                    아직 등록된 사진이 없어요
                                                </p>
                                                <Button
                                                    onClick={() =>
                                                        setIsPhotoUploadOpen(
                                                            true,
                                                        )
                                                    }
                                                    variant="outline"
                                                    className="border-[#05B2DC] text-[#05B2DC]"
                                                >
                                                    <Camera className="w-4 h-4 mr-2" />
                                                    사진 추가하기
                                                </Button>
                                            </div>
                                        ) : viewMode === "grid" ? (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
                                                            className={`aspect-square rounded-xl overflow-hidden cursor-pointer transition-all relative group ${isSelectMode && selectedPhotos.includes(photo.id) ? "ring-4 ring-[#05B2DC]" : "hover:opacity-90"}`}
                                                        >
                                                            <img
                                                                src={photo.url}
                                                                alt={
                                                                    photo.caption
                                                                }
                                                                className="w-full h-full object-cover"
                                                                style={{
                                                                    objectPosition:
                                                                        photo.cropPosition
                                                                            ? `${photo.cropPosition.x}% ${photo.cropPosition.y}%`
                                                                            : "center",
                                                                }}
                                                            />
                                                            {isSelectMode && (
                                                                <div
                                                                    className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPhotos.includes(photo.id) ? "bg-[#05B2DC] border-[#05B2DC]" : "bg-white/80 border-gray-300"}`}
                                                                >
                                                                    {selectedPhotos.includes(
                                                                        photo.id,
                                                                    ) && (
                                                                        <Check className="w-4 h-4 text-white" />
                                                                    )}
                                                                </div>
                                                            )}
                                                            {!isSelectMode && (
                                                                <button
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        if (
                                                                            confirm(
                                                                                "삭제하시겠습니까?",
                                                                            )
                                                                        )
                                                                            deletePhoto(
                                                                                selectedPet.id,
                                                                                photo.id,
                                                                            );
                                                                    }}
                                                                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <X className="w-3 h-3" />
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
                                                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                                                <img
                                                                    src={
                                                                        photo.url
                                                                    }
                                                                    alt={
                                                                        photo.caption
                                                                    }
                                                                    className="w-full h-full object-cover"
                                                                    style={{
                                                                        objectPosition:
                                                                            photo.cropPosition
                                                                                ? `${photo.cropPosition.x}% ${photo.cropPosition.y}%`
                                                                                : "center",
                                                                    }}
                                                                />
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
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        if (
                                                                            confirm(
                                                                                "삭제하시겠습니까?",
                                                                            )
                                                                        )
                                                                            deletePhoto(
                                                                                selectedPet.id,
                                                                                photo.id,
                                                                            );
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
            <PhotoUploadModal
                isOpen={isPhotoUploadOpen}
                onClose={() => setIsPhotoUploadOpen(false)}
                onUpload={handlePhotoUpload}
            />
            {viewingPhoto && selectedPet && (
                <PhotoViewer
                    photo={viewingPhoto}
                    petName={selectedPet.name}
                    onClose={() => setViewingPhoto(null)}
                    onDelete={() => {
                        deletePhoto(selectedPet.id, viewingPhoto.id);
                        setViewingPhoto(null);
                    }}
                />
            )}
            <DeleteConfirmModal
                isOpen={!!petToDelete}
                onClose={() => setPetToDelete(null)}
                onConfirm={() => {
                    if (petToDelete) deletePet(petToDelete.id);
                }}
                title="반려동물 삭제"
                message={`"${petToDelete?.name}"의 모든 기록이 삭제됩니다.`}
            />
            {showPetMenu && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowPetMenu(null)}
                />
            )}
        </div>
    );
}
