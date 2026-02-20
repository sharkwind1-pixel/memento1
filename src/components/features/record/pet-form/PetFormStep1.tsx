/**
 * PetFormStep1 - 사진/이름 입력 단계
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Move, Trash2, AlertTriangle } from "lucide-react";
import type { Step1Props } from "./petFormTypes";

export default function PetFormStep1({
    formData,
    setFormData,
    profilePreview,
    setProfilePreview,
    profileCropPosition,
    profileCropped,
    setProfileCropped,
    setShowCropper,
    fileInputRef,
    handleProfileUpload,
}: Step1Props) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative w-36 h-36 rounded-2xl cursor-pointer overflow-hidden border-4 transition-all ${
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
                            <Camera className="w-10 h-10 mb-2" />
                            <span className="text-sm font-medium">사진 등록</span>
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
                <input
                    ref={fileInputRef as React.RefObject<HTMLInputElement>}
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
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
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
                            onClick={() => setFormData((prev) => ({ ...prev, type }))}
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
    );
}
