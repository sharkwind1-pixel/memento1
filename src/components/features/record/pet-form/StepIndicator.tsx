/**
 * StepIndicator - 폼 단계 진행 표시
 */

"use client";

import { Check, ChevronRight } from "lucide-react";
import { STEP_INFO } from "./petFormTypes";

interface StepIndicatorProps {
    currentStep: number;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
    return (
        <div className="sticky top-[57px] z-10 flex items-center justify-center gap-1 py-3 px-4 bg-gray-50 dark:bg-gray-800 overflow-x-auto">
            {STEP_INFO.map((info, idx) => {
                const Icon = info.icon;
                const stepNum = idx + 1;
                const isActive = currentStep === stepNum;
                const isPast = currentStep > stepNum;
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
    );
}
