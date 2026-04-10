/**
 * ============================================================================
 * modals/WithdrawalModal.tsx
 * ============================================================================
 * 탈퇴 처리 모달
 *
 * 📌 기능:
 * - 탈퇴 유형 선택 (악용 우려 / 영구 차단 / 오류 해결)
 * - 탈퇴 사유 입력
 * ============================================================================
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Ban, Clock, CheckCircle } from "lucide-react";
import { UserRow, WithdrawalType } from "../types";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

// ============================================================================
// Props 타입 정의
// ============================================================================

interface WithdrawalModalProps {
    /** 탈퇴 처리할 유저 */
    user: UserRow;
    /** 모달 닫기 */
    onClose: () => void;
    /** 탈퇴 처리 실행 */
    onProcess: (type: WithdrawalType, reason: string) => Promise<void>;
    /** 처리 중 상태 */
    isProcessing: boolean;
}

// ============================================================================
// 탈퇴 유형 옵션
// ============================================================================

const WITHDRAWAL_OPTIONS: {
    type: WithdrawalType;
    label: string;
    description: string;
    icon: typeof Clock;
    color: string;
    selectedColor: string;
}[] = [
    {
        type: "abuse_concern",
        label: "악용 우려",
        description: "30일 후 재가입 가능",
        icon: Clock,
        color: "text-memorial-500",
        selectedColor: "border-memorial-500 bg-memorial-50",
    },
    {
        type: "banned",
        label: "영구 차단",
        description: "재가입 불가, IP 차단",
        icon: Ban,
        color: "text-red-500",
        selectedColor: "border-red-500 bg-red-50",
    },
    {
        type: "error_resolution",
        label: "오류 해결",
        description: "즉시 재가입 가능",
        icon: CheckCircle,
        color: "text-green-500",
        selectedColor: "border-green-500 bg-green-50",
    },
];

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function WithdrawalModal({
    user,
    onClose,
    onProcess,
    isProcessing,
}: WithdrawalModalProps) {
    useEscapeClose(true, onClose);
    useBodyScrollLock(true);

    const [withdrawalType, setWithdrawalType] = useState<WithdrawalType>("abuse_concern");
    const [reason, setReason] = useState("");

    // 처리 실행
    const handleProcess = () => {
        onProcess(withdrawalType, reason);
    };

    // 버튼 색상 결정
    const getButtonColor = () => {
        switch (withdrawalType) {
            case "banned":
                return "bg-red-500 hover:bg-red-600";
            case "abuse_concern":
                return "bg-memorial-500 hover:bg-memorial-600";
            case "error_resolution":
                return "bg-green-500 hover:bg-green-600";
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <Card className="w-full max-w-md" role="dialog" aria-modal="true" aria-labelledby="withdrawal-title" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                {/* 헤더 */}
                <CardHeader>
                    <CardTitle id="withdrawal-title" className="flex items-center gap-2">
                        <Ban className="w-5 h-5 text-red-500" />
                        탈퇴 처리
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* 유저 정보 */}
                    <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-gray-500">
                            {user.user_metadata?.nickname || "닉네임 없음"}
                        </p>
                    </div>

                    {/* 탈퇴 유형 선택 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">탈퇴 유형</label>
                        <div className="grid grid-cols-1 gap-2">
                            {WITHDRAWAL_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                const isSelected = withdrawalType === option.type;

                                return (
                                    <button
                                        key={option.type}
                                        onClick={() => setWithdrawalType(option.type)}
                                        className={`p-3 rounded-lg border text-left transition-colors ${
                                            isSelected
                                                ? option.selectedColor
                                                : "border-gray-200 hover:bg-gray-50"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon className={`w-4 h-4 ${option.color}`} />
                                            <span className="font-medium">{option.label}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {option.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 사유 입력 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">사유 (선택)</label>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="탈퇴/차단 사유를 입력하세요..."
                            rows={3}
                        />
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleProcess}
                            disabled={isProcessing}
                            className={`flex-1 ${getButtonColor()}`}
                        >
                            {isProcessing ? "처리 중..." : "탈퇴 처리"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
