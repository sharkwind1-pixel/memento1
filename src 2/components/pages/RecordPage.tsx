/**
 * RecordPage.tsx
 * 우리의 기록 - 마이페이지
 * 반려동물 등록/수정/삭제, 사진 등록/삭제/크롭
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useCallback, useEffect } from "react";
import { usePets, Pet, PetPhoto } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
    CloudSun,
    ZoomIn,
    ZoomOut,
    Move,
    Check,
    Upload,
    Image as ImageIcon,
    AlertTriangle,
} from "lucide-react";

import { TabType } from "@/types";

interface RecordPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

// 이미지 크롭 컴포넌트
function ImageCropper({
    imageUrl,
    initialPosition,
    onSave,
    onCancel,
    aspectRatio = 1,
}: {
    imageUrl: string;
    initialPosition?: { x: number; y: number; scale: number };
    onSave: (position: { x: number; y: number; scale: number }) => void;
    onCancel: () => void;
    aspectRatio?: number;
}) {
    const [position, setPosition] = useState(initialPosition || { x: 50, y: 50, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        setPosition((prev) => ({
            ...prev,
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
        }));
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            return () => {
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleScale = (delta: number) => {
        setPosition((prev) => ({
            ...prev,
            scale: Math.max(1, Math.min(3, prev.scale + delta)),
        }));
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-lg w-full">
                <h3 className="text-lg font-semibold mb-4 text-center">
                    노출 영역 조정
                </h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                    드래그하여 보여줄 부분을 선택하세요
                </p>
                
                {/* 크롭 프리뷰 */}
                <div
                    ref={containerRef}
                    className="relative w-full aspect-square rounded-xl overflow-hidden cursor-move border-2 border-dashed border-[#05B2DC]"
                    onMouseDown={handleMouseDown}
                >
                    <img
                        src={imageUrl}
                        alt="Crop preview"
                        className="absolute w-full h-full transition-transform"
                        style={{
                            objectFit: "cover",
                            objectPosition: `${position.x}% ${position.y}%`,
                            transform: `scale(${position.scale})`,
                        }}
                        draggable={false}
                    />
                    
                    {/* 중앙 가이드 */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 border-2 border-white/50 rounded-full flex items-center justify-center">
                            <Move className="w-6 h-6 text-white/70" />
                        </div>
                    </div>
                </div>

                {/* 줌 컨트롤 */}
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

                {/* 버튼 */}
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
    onUpload: (photos: { url: string; caption: string; cropPosition?: { x: number; y: number; scale: number } }[]) => void;
}) {
    const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string; caption: string; cropPosition?: { x: number; y: number; scale: number } }[]>([]);
    const [cropIndex, setCropIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newFiles = files.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
            caption: "",
            cropPosition: { x: 50, y: 50, scale: 1 },
        }));
        setSelectedFiles((prev) => [...prev, ...newFiles]);
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

    const handleCropSave = (index: number, position: { x: number; y: number; scale: number }) => {
        setSelectedFiles((prev) =>
            prev.map((f, i) => (i === index ? { ...f, cropPosition: position } : f))
        );
        setCropIndex(null);
    };

    const handleUpload = () => {
        onUpload(
            selectedFiles.map((f) => ({
                url: f.preview,
                caption: f.caption,
                cropPosition: f.cropPosition,
            }))
        );
        setSelectedFiles([]);
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">사진 업로드</h3>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* 파일 선택 영역 */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-[#05B2DC] transition-colors"
                    >
                        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-600 dark:text-gray-300">
                            클릭하여 사진 선택
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            여러 장 선택 가능
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

                    {/* 선택된 파일 미리보기 */}
                    {selectedFiles.length > 0 && (
                        <div className="mt-4 space-y-4">
                            {selectedFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                                >
                                    <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                                        <img
                                            src={file.preview}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            style={{
                                                objectPosition: file.cropPosition
                                                    ? `${file.cropPosition.x}% ${file.cropPosition.y}%`
                                                    : "center",
                                            }}
                                        />
                                        <button
                                            onClick={() => setCropIndex(index)}
                                            className="absolute bottom-1 right-1 bg-black/50 text-white p-1 rounded-lg text-xs"
                                        >
                                            <Move className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            placeholder="캡션 입력 (선택)"
                                            value={file.caption}
                                            onChange={(e) =>
                                                handleCaptionChange(index, e.target.value)
                                            }
                                            className="mb-2"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemove(index)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            삭제
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 업로드 버튼 */}
                    <div className="flex gap-3 mt-6">
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            취소
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={selectedFiles.length === 0}
                            className="flex-1 bg-[#05B2DC] hover:bg-[#0891B2]"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            {selectedFiles.length}장 업로드
                        </Button>
                    </div>
                </div>
            </div>

            {/* 크롭 모달 */}
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

// 반려동물 등록/수정 모달
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
    const [formData, setFormData] = useState({
        name: pet?.name || "",
        type: pet?.type || ("강아지" as Pet["type"]),
        breed: pet?.breed || "",
        birthday: pet?.birthday || "",
        gender: pet?.gender || ("남아" as Pet["gender"]),
        weight: pet?.weight || "",
        personality: pet?.personality || "",
        status: pet?.status || ("active" as Pet["status"]),
        isPrimary: pet?.isPrimary || false,
    });
    const [profilePreview, setProfilePreview] = useState<string>(pet?.profileImage || "");
    const [profileCropPosition, setProfileCropPosition] = useState(
        pet?.profileCropPosition || { x: 50, y: 50, scale: 1 }
    );
    const [showCropper, setShowCropper] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
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
            setProfileCropPosition(pet.profileCropPosition || { x: 50, y: 50, scale: 1 });
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
        }
    }, [pet, isOpen]);

    if (!isOpen) return null;

    const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePreview(reader.result as string);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = () => {
        if (!formData.name.trim()) {
            alert("이름을 입력해주세요");
            return;
        }
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
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold">
                            {pet ? "반려동물 수정" : "새 반려동물 등록"}
                        </h3>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* 프로필 사진 */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-28 h-28 rounded-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center cursor-pointer overflow-hidden border-4 border-white shadow-lg"
                            >
                                {profilePreview ? (
                                    <img
                                        src={profilePreview}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                        style={{
                                            objectPosition: `${profileCropPosition.x}% ${profileCropPosition.y}%`,
                                        }}
                                    />
                                ) : (
                                    <Camera className="w-10 h-10 text-[#05B2DC]" />
                                )}
                            </div>
                            {profilePreview && (
                                <button
                                    onClick={() => setShowCropper(true)}
                                    className="absolute bottom-0 right-0 bg-[#05B2DC] text-white p-2 rounded-full shadow-lg"
                                >
                                    <Move className="w-4 h-4" />
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleProfileUpload}
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* 폼 필드 */}
                    <div className="space-y-4">
                        <div>
                            <Label>이름 *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                                }
                                placeholder="반려동물 이름"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>종류</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(v) =>
                                        setFormData((prev) => ({ ...prev, type: v as Pet["type"] }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="강아지">강아지</SelectItem>
                                        <SelectItem value="고양이">고양이</SelectItem>
                                        <SelectItem value="기타">기타</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>성별</Label>
                                <Select
                                    value={formData.gender}
                                    onValueChange={(v) =>
                                        setFormData((prev) => ({ ...prev, gender: v as Pet["gender"] }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="남아">남아</SelectItem>
                                        <SelectItem value="여아">여아</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label>품종</Label>
                            <Input
                                value={formData.breed}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, breed: e.target.value }))
                                }
                                placeholder="예: 말티즈, 페르시안"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>생일</Label>
                                <Input
                                    type="date"
                                    value={formData.birthday}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, birthday: e.target.value }))
                                    }
                                />
                            </div>
                            <div>
                                <Label>몸무게</Label>
                                <Input
                                    value={formData.weight}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, weight: e.target.value }))
                                    }
                                    placeholder="예: 3.2kg"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>성격/특징</Label>
                            <Textarea
                                value={formData.personality}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, personality: e.target.value }))
                                }
                                placeholder="성격이나 특징을 적어주세요"
                                rows={3}
                            />
                        </div>

                        <div>
                            <Label>상태</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(v) =>
                                    setFormData((prev) => ({ ...prev, status: v as Pet["status"] }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">
                                        <span className="flex items-center gap-2">
                                            <Heart className="w-4 h-4 text-pink-500" />
                                            함께하는 중
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="memorial">
                                        <span className="flex items-center gap-2">
                                            <CloudSun className="w-4 h-4 text-amber-500" />
                                            하늘나라
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-3 mt-6">
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            취소
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            className="flex-1 bg-[#05B2DC] hover:bg-[#0891B2]"
                        >
                            {pet ? "수정하기" : "등록하기"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* 프로필 크롭 모달 */}
            {showCropper && profilePreview && (
                <ImageCropper
                    imageUrl={profilePreview}
                    initialPosition={profileCropPosition}
                    onSave={(pos) => {
                        setProfileCropPosition(pos);
                        setShowCropper(false);
                    }}
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
                <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1">
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

// 사진 뷰어 모달
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
                    className="relative max-w-4xl w-full"
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
                    <img
                        src={photo.url}
                        alt={photo.caption}
                        className="w-full max-h-[80vh] object-contain rounded-2xl"
                        style={{
                            objectPosition: photo.cropPosition
                                ? `${photo.cropPosition.x}% ${photo.cropPosition.y}%`
                                : "center",
                        }}
                    />
                    <div className="text-center mt-4 text-white">
                        <p className="font-medium">{photo.caption || petName}</p>
                        <p className="text-sm text-gray-400">{photo.date}</p>
                    </div>
                </div>
            </div>

            <DeleteConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={onDelete}
                title="사진 삭제"
                message="이 사진을 삭제하시겠습니까? 삭제된 사진은 복구할 수 없습니다."
            />
        </>
    );
}

// 나이 계산 헬퍼
function calculateAge(birthday: string): string {
    if (!birthday) return "";
    const birth = new Date(birthday);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    const totalMonths = years * 12 + months;
    if (totalMonths < 12) return `${totalMonths}개월`;
    const remainingMonths = totalMonths % 12;
    return remainingMonths > 0
        ? `${Math.floor(totalMonths / 12)}살 ${remainingMonths}개월`
        : `${Math.floor(totalMonths / 12)}살`;
}

// 메인 컴포넌트
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

    // 반려동물 저장
    const handleSavePet = (petData: Omit<Pet, "id" | "createdAt" | "photos">) => {
        if (editingPet) {
            updatePet(editingPet.id, petData);
        } else {
            addPet(petData);
        }
        setEditingPet(null);
    };

    // 사진 업로드
    const handlePhotoUpload = (
        photos: { url: string; caption: string; cropPosition?: { x: number; y: number; scale: number } }[]
    ) => {
        if (!selectedPet) return;
        addPhotos(
            selectedPet.id,
            photos.map((p) => ({
                url: p.url,
                caption: p.caption,
                date: new Date().toISOString().split("T")[0],
                cropPosition: p.cropPosition,
            }))
        );
    };

    // 로딩 중
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

    // 로그인 안 한 경우
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
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent("openAuthModal"));
                        }}
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
            {/* 배경 */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />

            <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
                {/* 헤더 */}
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

                {/* 반려동물이 없는 경우 */}
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
                        {/* 반려동물 목록 (가로 스크롤) */}
                        <div className="mb-6">
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {pets.map((pet) => (
                                    <div
                                        key={pet.id}
                                        className="relative flex-shrink-0"
                                    >
                                        <button
                                            onClick={() => selectPet(pet.id)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                                                selectedPetId === pet.id
                                                    ? "bg-[#05B2DC] text-white shadow-lg"
                                                    : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow">
                                                {pet.profileImage ? (
                                                    <img
                                                        src={pet.profileImage}
                                                        alt={pet.name}
                                                        className="w-full h-full object-cover"
                                                        style={{
                                                            objectPosition: pet.profileCropPosition
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
                                                    <span className="font-semibold">{pet.name}</span>
                                                    {pet.isPrimary && (
                                                        <Crown className="w-3 h-3 text-amber-400" />
                                                    )}
                                                    {pet.status === "memorial" && (
                                                        <CloudSun className="w-3 h-3 text-amber-400" />
                                                    )}
                                                </div>
                                                <span
                                                    className={`text-xs ${
                                                        selectedPetId === pet.id
                                                            ? "text-white/80"
                                                            : "text-gray-500"
                                                    }`}
                                                >
                                                    {pet.breed} · {calculateAge(pet.birthday)}
                                                </span>
                                            </div>
                                        </button>

                                        {/* 메뉴 버튼 */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowPetMenu(showPetMenu === pet.id ? null : pet.id);
                                            }}
                                            className={`absolute -top-1 -right-1 p-1 rounded-full ${
                                                selectedPetId === pet.id
                                                    ? "bg-white/20 text-white"
                                                    : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                                            }`}
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>

                                        {/* 드롭다운 메뉴 */}
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

                                {/* 추가 버튼 */}
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

                        {/* 선택된 반려동물 상세 */}
                        {selectedPet && (
                            <>
                                {/* 프로필 카드 */}
                                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mb-6">
                                    <CardContent className="p-6">
                                        <div className="flex items-start gap-6">
                                            {/* 프로필 이미지 */}
                                            <div className="relative">
                                                <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg">
                                                    {selectedPet.profileImage ? (
                                                        <img
                                                            src={selectedPet.profileImage}
                                                            alt={selectedPet.name}
                                                            className="w-full h-full object-cover"
                                                            style={{
                                                                objectPosition: selectedPet.profileCropPosition
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
                                                    className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${
                                                        selectedPet.status === "memorial"
                                                            ? "bg-amber-100 text-amber-700"
                                                            : "bg-green-100 text-green-700"
                                                    }`}
                                                >
                                                    {selectedPet.status === "memorial" ? (
                                                        <>
                                                            <CloudSun className="w-3 h-3 mr-1" />
                                                            하늘나라
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Heart className="w-3 h-3 mr-1" />
                                                            함께하는 중
                                                        </>
                                                    )}
                                                </Badge>
                                            </div>

                                            {/* 정보 */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                                        {selectedPet.name}
                                                    </h2>
                                                    {selectedPet.isPrimary && (
                                                        <Badge className="bg-amber-100 text-amber-700">
                                                            <Crown className="w-3 h-3 mr-1" />
                                                            대표
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                                                    {selectedPet.type} · {selectedPet.breed} ·{" "}
                                                    {selectedPet.gender}
                                                </p>
                                                <div className="flex flex-wrap gap-2 text-sm">
                                                    {selectedPet.birthday && (
                                                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                                            <Calendar className="w-4 h-4" />
                                                            {calculateAge(selectedPet.birthday)}
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
                                                        {selectedPet.personality}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* 사진 갤러리 */}
                                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle className="text-lg">
                                            사진 앨범
                                            <span className="text-sm font-normal text-gray-500 ml-2">
                                                {selectedPet.photos.length}장
                                            </span>
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    setViewMode(viewMode === "grid" ? "list" : "grid")
                                                }
                                            >
                                                {viewMode === "grid" ? (
                                                    <List className="w-4 h-4" />
                                                ) : (
                                                    <Grid3X3 className="w-4 h-4" />
                                                )}
                                            </Button>
                                            <Button
                                                onClick={() => setIsPhotoUploadOpen(true)}
                                                size="sm"
                                                className="bg-[#05B2DC] hover:bg-[#0891B2]"
                                            >
                                                <Plus className="w-4 h-4 mr-1" />
                                                사진 추가
                                            </Button>
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
                                                    onClick={() => setIsPhotoUploadOpen(true)}
                                                    variant="outline"
                                                    className="border-[#05B2DC] text-[#05B2DC]"
                                                >
                                                    <Camera className="w-4 h-4 mr-2" />
                                                    사진 추가하기
                                                </Button>
                                            </div>
                                        ) : viewMode === "grid" ? (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                                {selectedPet.photos.map((photo) => (
                                                    <div
                                                        key={photo.id}
                                                        onClick={() => setViewingPhoto(photo)}
                                                        className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
                                                    >
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
                                                        {/* 삭제 버튼 (호버시 표시) */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm("이 사진을 삭제하시겠습니까?")) {
                                                                    deletePhoto(selectedPet.id, photo.id);
                                                                }
                                                            }}
                                                            className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {selectedPet.photos.map((photo) => (
                                                    <div
                                                        key={photo.id}
                                                        onClick={() => setViewingPhoto(photo)}
                                                        className="flex gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                                                    >
                                                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
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
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-800 dark:text-white">
                                                                {photo.caption || selectedPet.name}
                                                            </p>
                                                            <p className="text-sm text-gray-500">
                                                                {photo.date}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm("이 사진을 삭제하시겠습니까?")) {
                                                                    deletePhoto(selectedPet.id, photo.id);
                                                                }
                                                            }}
                                                            className="self-center p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* 모달들 */}
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
                    if (petToDelete) {
                        deletePet(petToDelete.id);
                    }
                }}
                title="반려동물 삭제"
                message={`"${petToDelete?.name}"의 모든 기록이 삭제됩니다. 삭제된 데이터는 복구할 수 없습니다.`}
            />

            {/* 외부 클릭시 메뉴 닫기 */}
            {showPetMenu && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowPetMenu(null)}
                />
            )}
        </div>
    );
}
