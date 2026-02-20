/**
 * PetFormStep4 - 좋아하는 것 입력 단계
 */

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Cookie, Sparkles, Home } from "lucide-react";
import type { StepFormProps } from "./petFormTypes";

export default function PetFormStep4({ formData, setFormData }: StepFormProps) {
    return (
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
}
