/**
 * ============================================================================
 * modals/PremiumModal.tsx
 * ============================================================================
 * 프리미엄 부여 모달
 *
 * 📌 기능:
 * - 프리미엄 기간 선택 (7일 ~ 무기한)
 * - 부여 사유 입력
 * ============================================================================
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown } from "lucide-react";
import { UserRow } from "../types";

// ============================================================================
// Props 타입 정의
// ============================================================================

interface PremiumModalProps {
    /** 프리미엄을 부여할 유저 */
    user: UserRow;
    /** 모달 닫기 */
    onClose: () => void;
    /** 프리미엄 부여 (기간, 사유) */
    onGrant: (duration: string, reason: string) => Promise<void>;
}

// ============================================================================
// 기간 옵션
// ============================================================================

const DURATION_OPTIONS = [
    { value: "7", label: "7일" },
    { value: "30", label: "30일" },
    { value: "90", label: "90일" },
    { value: "180", label: "6개월" },
    { value: "365", label: "1년" },
    { value: "unlimited", label: "무기한" },
];

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function PremiumModal({ user, onClose, onGrant }: PremiumModalProps) {
    const [duration, setDuration] = useState("30");
    const [reason, setReason] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // 저장 처리
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onGrant(duration, reason);
        } finally {
            setIsSaving(false);
        }
    };

    // 만료일 계산
    const getExpiryDate = () => {
        if (duration === "unlimited") return "무기한";
        const days = parseInt(duration);
        return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString("ko-KR");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 배경 오버레이 */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* 모달 본체 */}
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="admin-premium-title">
                {/* 헤더 */}
                <div className="p-4 border-b bg-gradient-to-r from-amber-50 to-orange-50">
                    <h3 id="admin-premium-title" className="font-bold text-gray-800 flex items-center gap-2">
                        <Crown className="w-5 h-5 text-amber-500" />
                        프리미엄 부여
                    </h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                </div>

                {/* 본문 */}
                <div className="p-4 space-y-4">
                    {/* 기간 선택 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            프리미엄 기간
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {DURATION_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setDuration(option.value)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                        duration === option.value
                                            ? "bg-amber-500 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 사유 입력 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            부여 사유 (선택)
                        </label>
                        <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="예: 이벤트 당첨, 테스트 계정 등"
                        />
                    </div>

                    {/* 적용 미리보기 */}
                    <div className="p-3 bg-amber-50 rounded-lg text-sm">
                        <p className="font-medium text-amber-800 mb-1">적용 내용</p>
                        <ul className="text-amber-700 space-y-1">
                            <li>- AI 펫톡 무제한 사용</li>
                            <li>- 만료: {getExpiryDate()}</li>
                        </ul>
                    </div>
                </div>

                {/* 푸터 */}
                <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
                    <Button variant="outline" onClick={onClose}>
                        취소
                    </Button>
                    <Button
                        className="bg-amber-500 hover:bg-amber-600"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? "저장 중..." : "저장하고 즉시 적용"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
