/**
 * homeUtils.ts
 * 홈페이지에서 사용하는 유틸 함수 및 상수
 */

import {
    PawPrint,
    Dog,
    Cat,
    type LucideIcon,
} from "lucide-react";
import { TabType } from "@/types";

// 안전한 이미지 소스 변환
export const safeStringSrc = (val: unknown): string | null => {
    if (typeof val === "string" && val.trim().length) return val;
    return null;
};

// 펫 타입에 따른 아이콘 반환
export const getPetIcon = (petType: string): LucideIcon => {
    const lower = petType.toLowerCase();
    if (lower.includes("고양이") || lower.includes("냥") || lower.includes("cat")) return Cat;
    if (lower.includes("강아지") || lower.includes("개") || lower.includes("dog") ||
        lower.includes("리트리버") || lower.includes("말티즈") || lower.includes("푸들") ||
        lower.includes("테리어") || lower.includes("진돗개")) return Dog;
    return PawPrint;
};

// HERO 메시지 (모든 유저 공통)
export const HERO_CONTENT = {
    title: "특별한 매일을 함께",
    subtitle: "하루하루가 추억이 되는 곳",
    ctaLabel: "지금 만나러 가기",
    ctaTab: "ai-chat" as TabType,
};
