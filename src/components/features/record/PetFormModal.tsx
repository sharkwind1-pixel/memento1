/**
 * ============================================================================
 * PetFormModal.tsx
 * ============================================================================
 *
 * 반려동물 등록/수정 모달
 *
 * 구조:
 * - 4단계 스텝 폼
 *   1. 사진/이름: 프로필 사진 업로드, 이름 입력
 *   2. 기본정보: 종류, 품종, 생일, 성별, 몸무게
 *   3. 우리 이야기: 입양일, 만난 계기, 별명, 특이 행동
 *   4. 좋아하는 것: 음식, 활동, 장소 (+ 추모 모드 정보)
 *
 * 서브컴포넌트:
 * - pet-form/StepIndicator: 진행 표시
 * - pet-form/PetFormStep1~4: 각 단계 폼
 * - pet-form/petFormTypes: 공유 타입/상수
 *
 * ============================================================================
 */

"use client";

// ============================================================================
// 임포트
// ============================================================================
import { useState, useRef, useEffect } from "react";
import type { Pet } from "@/types";
import { Button } from "@/components/ui/button";
import { X, Check, ChevronLeft, ChevronRight } from "lucide-react";
import ImageCropper, { CropPosition } from "./ImageCropper";
import { toast } from "sonner";

// 서브컴포넌트
import { TOTAL_STEPS, INITIAL_FORM_DATA } from "./pet-form/petFormTypes";
import type { PetFormData } from "./pet-form/petFormTypes";
import StepIndicator from "./pet-form/StepIndicator";
import PetFormStep1 from "./pet-form/PetFormStep1";
import PetFormStep2 from "./pet-form/PetFormStep2";
import PetFormStep3 from "./pet-form/PetFormStep3";
import PetFormStep4 from "./pet-form/PetFormStep4";

// ============================================================================
// 타입 정의
// ============================================================================

/** 모달 Props */
interface PetFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    pet?: Pet | null;
    onSave: (pet: Omit<Pet, "id" | "createdAt" | "photos">) => void | Promise<void>;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function PetFormModal({
    isOpen,
    onClose,
    pet,
    onSave,
}: PetFormModalProps) {
    // ========================================================================
    // 상태 관리
    // ========================================================================
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<PetFormData>({ ...INITIAL_FORM_DATA });
    const [profilePreview, setProfilePreview] = useState<string>("");
    const [profileCropPosition, setProfileCropPosition] = useState<CropPosition>({
        x: 50, y: 50, scale: 1,
    });
    const [showCropper, setShowCropper] = useState(false);
    const [profileCropped, setProfileCropped] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setIsSubmitting(false);
            if (pet) {
                setFormData({
                    name: pet.name,
                    type: pet.type,
                    breed: pet.breed,
                    birthday: pet.birthday || "",
                    gender: pet.gender,
                    weight: pet.weight || "",
                    personality: pet.personality || "",
                    status: pet.status,
                    isPrimary: pet.isPrimary ?? false,
                    adoptedDate: pet.adoptedDate || "",
                    howWeMet: pet.howWeMet || "",
                    nicknames: pet.nicknames || "",
                    specialHabits: pet.specialHabits || "",
                    favoriteFood: pet.favoriteFood || "",
                    favoriteActivity: pet.favoriteActivity || "",
                    favoritePlace: pet.favoritePlace || "",
                    memorialDate: pet.memorialDate || "",
                    togetherPeriod: pet.togetherPeriod || "",
                    memorableMemory: pet.memorableMemory || "",
                });
                setProfilePreview(pet.profileImage || "");
                setProfileCropPosition({
                    x: pet.profileCropPosition?.x ?? 50,
                    y: pet.profileCropPosition?.y ?? 50,
                    scale: pet.profileCropPosition?.scale ?? 1,
                });
                setProfileCropped(!!pet.profileImage);
            } else {
                setFormData({ ...INITIAL_FORM_DATA });
                setProfilePreview("");
                setProfileCropPosition({ x: 50, y: 50, scale: 1 });
                setProfileCropped(false);
            }
        }
    }, [pet, isOpen]);

    if (!isOpen) return null;

    // ========================================================================
    // 핸들러
    // ========================================================================

    const hasUnsavedData = () => {
        if (pet) return true;
        return !!(
            formData.name || formData.breed || formData.birthday ||
            formData.weight || formData.personality || profilePreview
        );
    };

    const handleBackdropClose = () => {
        if (hasUnsavedData()) {
            setShowCloseConfirm(true);
        } else {
            onClose();
        }
    };

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
        if (step === 1) {
            if (!formData.name.trim()) {
                toast.warning("이름을 입력해주세요");
                return;
            }
            if (profilePreview && !profileCropped) {
                toast.warning("프로필 사진 영역을 선택해주세요");
                return;
            }
        }
        setStep(step + 1);
    };

    const handlePrev = () => setStep(step - 1);

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onSave({
                ...formData,
                howWeMet: formData.howWeMet || undefined,
                profileImage: profilePreview,
                profileCropPosition,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    /** 현재 스텝에 맞는 폼 렌더링 */
    const renderCurrentStep = () => {
        const stepProps = { formData, setFormData };
        switch (step) {
            case 1:
                return (
                    <PetFormStep1
                        {...stepProps}
                        profilePreview={profilePreview}
                        setProfilePreview={setProfilePreview}
                        profileCropPosition={profileCropPosition}
                        profileCropped={profileCropped}
                        setProfileCropped={setProfileCropped}
                        setShowCropper={setShowCropper}
                        fileInputRef={fileInputRef}
                        handleProfileUpload={handleProfileUpload}
                    />
                );
            case 2: return <PetFormStep2 {...stepProps} />;
            case 3: return <PetFormStep3 {...stepProps} />;
            case 4: return <PetFormStep4 {...stepProps} />;
            default: return null;
        }
    };

    // ========================================================================
    // 렌더링
    // ========================================================================

    return (
        <>
            {/* 전체 화면 컨테이너 - 스크롤 가능 */}
            <div
                className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50"
                style={{ WebkitOverflowScrolling: 'touch' }}
                onClick={handleBackdropClose}
            >
                {/* 모달 정렬 래퍼 */}
                <div className="min-h-full flex items-start justify-center pt-16 pb-4 px-4">
                    {/* 모달 본체 */}
                    <div
                        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl relative"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pet-form-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 헤더 - sticky */}
                        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t-2xl">
                            <h3 id="pet-form-title" className="text-lg font-semibold">
                                {pet ? "반려동물 수정" : "새 반려동물 등록"}
                            </h3>
                            <Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* 스텝 인디케이터 */}
                        <StepIndicator currentStep={step} />

                        {/* 스텝 컨텐츠 */}
                        <div className="p-4 sm:p-6">
                            {renderCurrentStep()}
                        </div>

                        {/* 네비게이션 버튼 - sticky bottom */}
                        <div
                            className="sticky bottom-0 z-10 flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-b-2xl"
                            style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))' }}
                        >
                            {step === 1 ? (
                                <Button variant="outline" onClick={onClose} className="flex-1">
                                    <X className="w-4 h-4 mr-2" />
                                    취소
                                </Button>
                            ) : (
                                <Button variant="outline" onClick={handlePrev} className="flex-1">
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    이전
                                </Button>
                            )}

                            {step < TOTAL_STEPS ? (
                                <Button
                                    onClick={handleNext}
                                    className="flex-1 bg-[#05B2DC] hover:bg-[#0891B2]"
                                >
                                    다음
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-[#05B2DC] hover:bg-[#0891B2] disabled:opacity-50"
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    {isSubmitting ? "저장 중..." : pet ? "수정하기" : "등록하기"}
                                </Button>
                            )}
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
                            반려동물 정보를 입력중이에요
                        </p>
                        <p className="text-center text-gray-500 text-sm mb-6">
                            지금 닫으면 입력한 내용이 사라져요
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
