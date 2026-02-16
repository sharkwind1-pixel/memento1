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
 * 모바일 최적화:
 * - 하단 시트 형태 (모바일) / 중앙 모달 (데스크톱)
 * - 스크롤 가능한 컨텐츠 영역
 * - Safe Area Inset 대응
 * - touch-manipulation으로 터치 응답성 향상
 *
 * ============================================================================
 */

"use client";

/* eslint-disable @next/next/no-img-element */

// ============================================================================
// 임포트
// ============================================================================
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
    Sparkles,
    Home,
    Cookie,
} from "lucide-react";
import ImageCropper, { CropPosition } from "./ImageCropper";
import { toast } from "sonner";

// ============================================================================
// 타입 및 상수 정의
// ============================================================================

/** 모달 Props */
interface PetFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    pet?: Pet | null;
    onSave: (pet: Omit<Pet, "id" | "createdAt" | "photos">) => void | Promise<void>;
}

/** 총 스텝 수 */
const TOTAL_STEPS = 4;

/** 각 스텝별 아이콘과 라벨 */
const STEP_INFO = [
    { icon: Camera, label: "사진/이름" },
    { icon: PawPrint, label: "기본정보" },
    { icon: Heart, label: "우리 이야기" },
    { icon: Sparkles, label: "좋아하는 것" },
];

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
    const [step, setStep] = useState(1);              // 현재 스텝 (1-4)
    const [isSubmitting, setIsSubmitting] = useState(false);  // 제출 중 상태
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
        // 새로운 필드들
        adoptedDate: "",
        howWeMet: "" as Pet["howWeMet"] | "",
        nicknames: "",
        specialHabits: "",
        favoriteFood: "",
        favoriteActivity: "",
        favoritePlace: "",
        memorialDate: "",
        togetherPeriod: "",
        memorableMemory: "",
    });
    const [profilePreview, setProfilePreview] = useState<string>("");
    const [profileCropPosition, setProfileCropPosition] = useState<CropPosition>({
        x: 50,
        y: 50,
        scale: 1,
    });
    const [showCropper, setShowCropper] = useState(false);
    const [profileCropped, setProfileCropped] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setIsSubmitting(false); // 초기화
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
                    adoptedDate: "",
                    howWeMet: "",
                    nicknames: "",
                    specialHabits: "",
                    favoriteFood: "",
                    favoriteActivity: "",
                    favoritePlace: "",
                    memorialDate: "",
                    togetherPeriod: "",
                    memorableMemory: "",
                });
                setProfilePreview("");
                setProfileCropPosition({ x: 50, y: 50, scale: 1 });
                setProfileCropped(false);
            }
        }
    }, [pet, isOpen]);

    if (!isOpen) return null;

    // 입력된 데이터가 있는지 체크 (새 등록일 때만 — 수정 모드는 이미 데이터가 있으므로 항상 true)
    const hasUnsavedData = () => {
        if (pet) return true; // 수정 모드에서는 항상 확인
        return !!(
            formData.name ||
            formData.breed ||
            formData.birthday ||
            formData.weight ||
            formData.personality ||
            profilePreview
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
        // Step 1 검증
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

    const handlePrev = () => {
        setStep(step - 1);
    };

    const handleSubmit = async () => {
        // 중복 제출 방지
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

    // Step 1: 사진/이름
    const renderStep1 = () => (
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

    // Step 2: 기본 정보
    const renderStep2 = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>성별</Label>
                    <Select
                        value={formData.gender}
                        onValueChange={(v) =>
                            setFormData((prev) => ({ ...prev, gender: v as Pet["gender"] }))
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
                            setFormData((prev) => ({ ...prev, breed: e.target.value }))
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
                            setFormData((prev) => ({ ...prev, birthday: e.target.value }))
                        }
                        className="mt-1"
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
                        className="mt-1"
                    />
                </div>
            </div>

            <div>
                <Label>현재 상태</Label>
                <div className="flex gap-2 mt-2">
                    <Button
                        type="button"
                        variant={formData.status === "active" ? "default" : "outline"}
                        onClick={() =>
                            setFormData((prev) => ({ ...prev, status: "active" }))
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
                            setFormData((prev) => ({ ...prev, status: "memorial" }))
                        }
                        className={`flex-1 ${
                            formData.status === "memorial"
                                ? "bg-violet-500 hover:bg-violet-600"
                                : ""
                        }`}
                    >
                        <Star className="w-4 h-4 mr-2" />
                        추억 속에
                    </Button>
                </div>
            </div>

            {formData.status === "memorial" && (
                <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl space-y-3">
                    <div>
                        <Label className="text-violet-700 dark:text-violet-300">무지개다리 건넌 날</Label>
                        <Input
                            type="date"
                            value={formData.memorialDate}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, memorialDate: e.target.value }))
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-violet-700 dark:text-violet-300">함께한 기간</Label>
                        <Input
                            value={formData.togetherPeriod}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, togetherPeriod: e.target.value }))
                            }
                            placeholder="예: 15년, 2010년부터 2025년까지"
                            className="mt-1"
                        />
                    </div>
                </div>
            )}
        </div>
    );

    // Step 3: 우리 이야기
    const renderStep3 = () => (
        <div className="space-y-4">
            <div className="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-xl">
                <p className="text-sm text-sky-700 dark:text-sky-300 mb-3">
                    {formData.name || "우리 아이"}와 처음 만난 이야기를 들려주세요
                </p>
                <div className="space-y-3">
                    <div>
                        <Label>처음 만난 날</Label>
                        <Input
                            type="date"
                            value={formData.adoptedDate}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, adoptedDate: e.target.value }))
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label>어떻게 만났어요?</Label>
                        <Select
                            value={formData.howWeMet}
                            onValueChange={(v) =>
                                setFormData((prev) => ({ ...prev, howWeMet: v as Pet["howWeMet"] }))
                            }
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="선택해주세요" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="펫샵">펫샵에서</SelectItem>
                                <SelectItem value="분양">분양 받았어요</SelectItem>
                                <SelectItem value="보호소">보호소에서 입양</SelectItem>
                                <SelectItem value="지인">지인에게서</SelectItem>
                                <SelectItem value="길에서">길에서 만났어요</SelectItem>
                                <SelectItem value="기타">기타</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div>
                <Label>부르는 별명들</Label>
                <Input
                    value={formData.nicknames}
                    onChange={(e) =>
                        setFormData((prev) => ({ ...prev, nicknames: e.target.value }))
                    }
                    placeholder="예: 콩이, 콩콩이, 콩순이"
                    className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">쉼표로 구분해서 여러 개 입력할 수 있어요</p>
            </div>

            <div>
                <Label>특별한 버릇이나 습관</Label>
                <Textarea
                    value={formData.specialHabits}
                    onChange={(e) =>
                        setFormData((prev) => ({ ...prev, specialHabits: e.target.value }))
                    }
                    placeholder="예: 배를 긁어주면 다리를 흔들어요, 산책 전에 빙글빙글 돌아요"
                    rows={3}
                    className="mt-1"
                />
            </div>
        </div>
    );

    // Step 4: 좋아하는 것
    const renderStep4 = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <Cookie className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <Label className="text-amber-700 dark:text-amber-300">좋아하는 간식</Label>
                        <Input
                            value={formData.favoriteFood}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, favoriteFood: e.target.value }))
                            }
                            placeholder="예: 닭가슴살, 고구마, 치즈"
                            className="mt-1"
                        />
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <Sparkles className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <Label className="text-green-700 dark:text-green-300">좋아하는 놀이/활동</Label>
                        <Input
                            value={formData.favoriteActivity}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, favoriteActivity: e.target.value }))
                            }
                            placeholder="예: 공놀이, 터그놀이, 산책"
                            className="mt-1"
                        />
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <Home className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <Label className="text-blue-700 dark:text-blue-300">좋아하는 장소</Label>
                        <Input
                            value={formData.favoritePlace}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, favoritePlace: e.target.value }))
                            }
                            placeholder="예: 근처 공원, 소파 위, 햇볕 드는 창가"
                            className="mt-1"
                        />
                    </div>
                </div>
            </div>

            <div>
                <Label>성격/특징</Label>
                <Textarea
                    value={formData.personality}
                    onChange={(e) =>
                        setFormData((prev) => ({ ...prev, personality: e.target.value }))
                    }
                    placeholder="우리 아이만의 성격이나 특징을 자유롭게 적어주세요"
                    rows={3}
                    className="mt-1"
                />
            </div>

            {formData.status === "memorial" && (
                <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                    <Label className="text-violet-700 dark:text-violet-300">기억하고 싶은 순간</Label>
                    <Textarea
                        value={formData.memorableMemory}
                        onChange={(e) =>
                            setFormData((prev) => ({ ...prev, memorableMemory: e.target.value }))
                        }
                        placeholder="가장 기억에 남는 순간이나 함께한 추억을 적어주세요"
                        rows={3}
                        className="mt-1"
                    />
                </div>
            )}
        </div>
    );

    /** 현재 스텝에 맞는 폼 렌더링 */
    const renderCurrentStep = () => {
        switch (step) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            default: return null;
        }
    };

    // ========================================================================
    // 렌더링
    // ========================================================================
    // 모달 구조:
    // - 오버레이 (z-9998): 배경 딤처리, 클릭 시 닫기
    // - 모달 (z-9999): 실제 콘텐츠
    //   - 모바일: 하단 시트 (bottom sheet)
    //   - 데스크톱: 중앙 모달

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
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 헤더 - sticky */}
                        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t-2xl">
                            <h3 className="text-lg font-semibold">
                                {pet ? "반려동물 수정" : "새 반려동물 등록"}
                            </h3>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* 스텝 인디케이터 - sticky */}
                        <div className="sticky top-[57px] z-10 flex items-center justify-center gap-1 py-3 px-4 bg-gray-50 dark:bg-gray-800 overflow-x-auto">
                            {STEP_INFO.map((info, idx) => {
                                const Icon = info.icon;
                                const stepNum = idx + 1;
                                const isActive = step === stepNum;
                                const isPast = step > stepNum;
                                return (
                                    <div key={idx} className="flex items-center">
                                        <div
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-all ${
                                                isActive
                                                    ? "bg-[#05B2DC] text-white"
                                                    : isPast
                                                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                                        : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                                            }`}
                                        >
                                            {isPast ? (
                                                <Check className="w-3.5 h-3.5" />
                                            ) : (
                                                <Icon className="w-3.5 h-3.5" />
                                            )}
                                            <span className="hidden sm:inline">{info.label}</span>
                                        </div>
                                        {idx < STEP_INFO.length - 1 && (
                                            <ChevronRight className="w-3 h-3 text-gray-400 mx-0.5" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

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
