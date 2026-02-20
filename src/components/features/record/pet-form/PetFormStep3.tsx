/**
 * PetFormStep3 - 우리 이야기 입력 단계
 */

"use client";

import type { Pet } from "@/types";
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
import type { StepFormProps } from "./petFormTypes";

export default function PetFormStep3({ formData, setFormData }: StepFormProps) {
    return (
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
}
