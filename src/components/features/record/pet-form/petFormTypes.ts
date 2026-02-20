/**
 * PetFormModal 서브컴포넌트 공유 타입 및 상수
 */

import type { Pet } from "@/types";
import type { CropPosition } from "../ImageCropper";
import { Camera, Heart, PawPrint, Sparkles } from "lucide-react";

// ============================================================================
// 타입 정의
// ============================================================================

/** 폼 데이터 */
export interface PetFormData {
    name: string;
    type: Pet["type"];
    breed: string;
    birthday: string;
    gender: Pet["gender"];
    weight: string;
    personality: string;
    status: Pet["status"];
    isPrimary: boolean;
    adoptedDate: string;
    howWeMet: Pet["howWeMet"] | "";
    nicknames: string;
    specialHabits: string;
    favoriteFood: string;
    favoriteActivity: string;
    favoritePlace: string;
    memorialDate: string;
    togetherPeriod: string;
    memorableMemory: string;
}

/** 스텝 폼 공통 Props */
export interface StepFormProps {
    formData: PetFormData;
    setFormData: React.Dispatch<React.SetStateAction<PetFormData>>;
}

/** Step 1 전용 Props */
export interface Step1Props extends StepFormProps {
    profilePreview: string;
    setProfilePreview: (v: string) => void;
    profileCropPosition: CropPosition;
    profileCropped: boolean;
    setProfileCropped: (v: boolean) => void;
    setShowCropper: (v: boolean) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleProfileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// ============================================================================
// 상수 정의
// ============================================================================

/** 총 스텝 수 */
export const TOTAL_STEPS = 4;

/** 각 스텝별 아이콘과 라벨 */
export const STEP_INFO = [
    { icon: Camera, label: "사진/이름" },
    { icon: PawPrint, label: "기본정보" },
    { icon: Heart, label: "우리 이야기" },
    { icon: Sparkles, label: "좋아하는 것" },
];

/** 폼 초기값 */
export const INITIAL_FORM_DATA: PetFormData = {
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
};
