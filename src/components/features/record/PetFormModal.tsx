"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react";
import { Pet } from "@/contexts/PetContext";
import { Button } from "@/components/ui/button";
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
    Heart,
    Star,
    PawPrint,
    X,
    Move,
    Check,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Trash2,
} from "lucide-react";
import ImageCropper, { CropPosition } from "./ImageCropper";

interface PetFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    pet?: Pet | null;
    onSave: (pet: Omit<Pet, "id" | "createdAt" | "photos">) => void | Promise<void>;
}

export default function PetFormModal({
    isOpen,
    onClose,
    pet,
    onSave,
}: PetFormModalProps) {
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
    const [profileCropPosition, setProfileCropPosition] = useState<CropPosition>({
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
                    pet.profileCropPosition || { x: 50, y: 50, scale: 1 }
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

    const handleCropSave = (position: CropPosition) => {
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
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                                step === 1
                                    ? "bg-[#05B2DC] text-white"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                            }`}
                        >
                            <Camera className="w-4 h-4" />
                            사진/이름
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <div
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                                step === 2
                                    ? "bg-[#05B2DC] text-white"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                            }`}
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
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`relative w-40 h-40 rounded-2xl cursor-pointer overflow-hidden border-4 transition-all ${
                                            profilePreview && !profileCropped
                                                ? "border-amber-400"
                                                : profilePreview
                                                  ? "border-green-400"
                                                  : "border-dashed border-[#05B2DC] hover:border-solid"
                                        } shadow-lg bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD]`}
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
                                                <span className="text-sm font-medium">사진 등록</span>
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
                                                onClick={() => setShowCropper(true)}
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
                                    <Label className="text-base font-medium">이름 *</Label>
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
                                    <Label className="text-base font-medium">종류</Label>
                                    <div className="flex gap-2 mt-2">
                                        {(["강아지", "고양이", "기타"] as const).map((type) => (
                                            <Button
                                                key={type}
                                                type="button"
                                                variant={formData.type === type ? "default" : "outline"}
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        type,
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
                                        ))}
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
                                                <SelectItem value="남아">남아</SelectItem>
                                                <SelectItem value="여아">여아</SelectItem>
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
                                            variant={formData.status === "active" ? "default" : "outline"}
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    status: "active",
                                                }))
                                            }
                                            className={`flex-1 ${
                                                formData.status === "active"
                                                    ? "bg-green-500 hover:bg-green-600"
                                                    : ""
                                            }`}
                                        >
                                            <Heart className="w-4 h-4 mr-2" />
                                            함께하는 중
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={formData.status === "memorial" ? "default" : "outline"}
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    status: "memorial",
                                                }))
                                            }
                                            className={`flex-1 ${
                                                formData.status === "memorial"
                                                    ? "bg-amber-500 hover:bg-amber-600"
                                                    : ""
                                            }`}
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
                                <Button variant="outline" onClick={onClose} className="flex-1">
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
