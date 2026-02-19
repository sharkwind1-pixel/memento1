/**
 * ============================================================================
 * modals/PointsAwardModal.tsx
 * ============================================================================
 * 관리자 포인트 지급 모달
 *
 * - 프리셋 금액 선택 또는 직접 입력
 * - 지급 후 예상 등급 미리보기
 * - 지급 사유 입력
 * ============================================================================
 */

"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star } from "lucide-react";
import { UserRow } from "../types";
import { getPointLevel, POINT_LEVELS } from "@/config/constants";

// ============================================================================
// Props
// ============================================================================

interface PointsAwardModalProps {
    user: UserRow;
    onClose: () => void;
    onAward: (points: number, reason: string) => Promise<void>;
}

// ============================================================================
// 프리셋 금액
// ============================================================================

const PRESETS = [
    { value: 100, label: "100P" },
    { value: 500, label: "500P" },
    { value: 1000, label: "1,000P" },
    { value: 3000, label: "3,000P" },
    { value: 10000, label: "10,000P" },
    { value: 50000, label: "50,000P" },
];

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function PointsAwardModal({ user, onClose, onAward }: PointsAwardModalProps) {
    const [amount, setAmount] = useState(100);
    const [customAmount, setCustomAmount] = useState("");
    const [useCustom, setUseCustom] = useState(false);
    const [reason, setReason] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const currentPoints = user.points ?? 0;
    const awardAmount = useCustom ? (parseInt(customAmount) || 0) : amount;
    const afterPoints = currentPoints + awardAmount;

    const currentLevel = useMemo(() => getPointLevel(currentPoints), [currentPoints]);
    const afterLevel = useMemo(() => getPointLevel(afterPoints), [afterPoints]);
    const isLevelUp = afterLevel.level > currentLevel.level;

    const handleSave = async () => {
        if (awardAmount <= 0) return;
        setIsSaving(true);
        try {
            await onAward(awardAmount, reason);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="points-award-title">
                {/* 헤더 */}
                <div className="p-4 border-b bg-gradient-to-r from-sky-50 to-violet-50">
                    <h3 id="points-award-title" className="font-bold text-gray-800 flex items-center gap-2">
                        <Star className="w-5 h-5 text-sky-500" />
                        포인트 지급
                    </h3>
                    <p className="text-sm text-gray-500">
                        {user.user_metadata?.nickname || user.email}
                        <span className="ml-2 text-xs text-gray-400">
                            현재 {currentPoints.toLocaleString()}P
                        </span>
                    </p>
                </div>

                {/* 본문 */}
                <div className="p-4 space-y-4">
                    {/* 금액 선택 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            지급 포인트
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {PRESETS.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => { setAmount(p.value); setUseCustom(false); }}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                        !useCustom && amount === p.value
                                            ? "bg-sky-500 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* 직접 입력 */}
                        <div className="mt-2 flex items-center gap-2">
                            <button
                                onClick={() => setUseCustom(true)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    useCustom
                                        ? "bg-sky-500 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                직접 입력
                            </button>
                            {useCustom && (
                                <Input
                                    type="number"
                                    value={customAmount}
                                    onChange={(e) => setCustomAmount(e.target.value)}
                                    placeholder="포인트 입력"
                                    className="flex-1"
                                    min={1}
                                    max={1000000}
                                    autoFocus
                                />
                            )}
                        </div>
                    </div>

                    {/* 사유 입력 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            지급 사유 (선택)
                        </label>
                        <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="예: 이벤트 당첨, 테스트, 등급 확인용 등"
                        />
                    </div>

                    {/* 미리보기 */}
                    <div className={`p-3 rounded-lg text-sm ${isLevelUp ? "bg-violet-50" : "bg-sky-50"}`}>
                        <p className={`font-medium mb-2 ${isLevelUp ? "text-violet-800" : "text-sky-800"}`}>
                            적용 미리보기
                        </p>
                        <div className="flex items-center gap-3">
                            {/* 현재 */}
                            <div className="flex flex-col items-center gap-1">
                                <Image
                                    src={currentLevel.icons.dog}
                                    alt={`Lv.${currentLevel.level}`}
                                    width={36}
                                    height={36}
                                    className="rounded-full"
                                    unoptimized
                                />
                                <span className="text-xs text-gray-500">Lv.{currentLevel.level}</span>
                                <span className="text-xs text-gray-400">{currentPoints.toLocaleString()}P</span>
                            </div>

                            {/* 화살표 */}
                            <span className="text-lg text-gray-400">→</span>

                            {/* 지급 후 */}
                            <div className="flex flex-col items-center gap-1">
                                <Image
                                    src={afterLevel.icons.dog}
                                    alt={`Lv.${afterLevel.level}`}
                                    width={36}
                                    height={36}
                                    className="rounded-full"
                                    unoptimized
                                />
                                <span className={`text-xs font-medium ${isLevelUp ? "text-violet-600" : "text-gray-500"}`}>
                                    Lv.{afterLevel.level}
                                </span>
                                <span className="text-xs text-gray-400">{afterPoints.toLocaleString()}P</span>
                            </div>

                            {isLevelUp && (
                                <span className="ml-1 text-xs font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                                    레벨업!
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 푸터 */}
                <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
                    <Button variant="outline" onClick={onClose}>
                        취소
                    </Button>
                    <Button
                        className="bg-sky-500 hover:bg-sky-600 text-white"
                        onClick={handleSave}
                        disabled={isSaving || awardAmount <= 0}
                    >
                        {isSaving ? "지급 중..." : `${awardAmount.toLocaleString()}P 지급`}
                    </Button>
                </div>
            </div>
        </div>
    );
}
