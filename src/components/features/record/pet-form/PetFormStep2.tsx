/**
 * PetFormStep2 - 기본정보 입력 단계
 */

"use client";

import type { Pet } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Heart, Star } from "lucide-react";
import type { StepFormProps } from "./petFormTypes";

export default function PetFormStep2({ formData, setFormData }: StepFormProps) {
    return (
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
}
