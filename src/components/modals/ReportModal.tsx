/**
 * ReportModal.tsx
 * 신고 모달 - 게시물/댓글/회원 신고
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, AlertTriangle, Flag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { InlineLoading } from "@/components/ui/PawLoading";
import { useEscapeClose } from "@/hooks/useEscapeClose";

type ReportTargetType = "post" | "comment" | "user" | "pet_memorial";
type ReportReason = "spam" | "abuse" | "inappropriate" | "harassment" | "misinformation" | "copyright" | "other";

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetType: ReportTargetType;
    targetId: string;
    targetTitle?: string; // 표시용 (예: 게시물 제목, 사용자 이름)
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
    { value: "spam", label: "스팸/광고", description: "상업적 광고, 홍보성 콘텐츠" },
    { value: "abuse", label: "욕설/비방", description: "욕설, 비속어, 타인 비방" },
    { value: "inappropriate", label: "부적절한 콘텐츠", description: "폭력적, 선정적, 혐오 콘텐츠" },
    { value: "harassment", label: "괴롭힘", description: "특정인 대상 지속적 괴롭힘" },
    { value: "misinformation", label: "허위정보", description: "거짓 정보, 사기성 콘텐츠" },
    { value: "copyright", label: "저작권 침해", description: "타인의 저작물 무단 사용" },
    { value: "other", label: "기타", description: "위 항목에 해당하지 않는 경우" },
];

const TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
    post: "게시물",
    comment: "댓글",
    user: "회원",
    pet_memorial: "추모 공간",
};

export default function ReportModal({
    isOpen,
    onClose,
    targetType,
    targetId,
    targetTitle,
}: ReportModalProps) {
    const { user } = useAuth();
    useEscapeClose(isOpen, onClose);
    const [reason, setReason] = useState<ReportReason | "">("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!user) {
            toast.error("로그인이 필요합니다");
            return;
        }

        if (!reason) {
            toast.error("신고 사유를 선택해주세요");
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.from("reports").insert({
                reporter_id: user.id,
                target_type: targetType,
                target_id: targetId,
                reason,
                description: description.trim() || null,
            });

            if (error) {
                // 중복 신고 체크
                if (error.code === "23505") {
                    toast.error("이미 신고한 콘텐츠입니다");
                } else {
                    throw error;
                }
            } else {
                toast.success("신고가 접수되었습니다. 검토 후 조치하겠습니다.");
                onClose();
            }
        } catch {
            toast.error("신고 접수 중 오류가 발생했습니다");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setReason("");
        setDescription("");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
                    <div className="flex items-center gap-2">
                        <Flag className="w-5 h-5 text-red-500" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                            {TARGET_TYPE_LABELS[targetType]} 신고
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-4 space-y-4">
                    {/* 신고 대상 표시 */}
                    {targetTitle && (
                        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400">신고 대상</p>
                            <p className="text-gray-800 dark:text-white font-medium truncate">
                                {targetTitle}
                            </p>
                        </div>
                    )}

                    {/* 경고 메시지 */}
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            허위 신고는 서비스 이용에 제한이 있을 수 있습니다.
                            신중하게 신고해주세요.
                        </p>
                    </div>

                    {/* 신고 사유 선택 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            신고 사유 <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                            {REPORT_REASONS.map((item) => (
                                <label
                                    key={item.value}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                        reason === item.value
                                            ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                                            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={item.value}
                                        checked={reason === item.value}
                                        onChange={(e) => setReason(e.target.value as ReportReason)}
                                        className="mt-1 w-4 h-4 text-red-500 focus:ring-red-500"
                                    />
                                    <div>
                                        <p className="font-medium text-gray-800 dark:text-white">
                                            {item.label}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {item.description}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 상세 설명 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            상세 설명 <span className="text-gray-400">(선택)</span>
                        </label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="추가로 설명이 필요하면 작성해주세요..."
                            className="resize-none"
                            rows={3}
                            maxLength={500}
                        />
                        <p className="text-xs text-gray-400 text-right">
                            {description.length}/500
                        </p>
                    </div>
                </div>

                {/* 버튼 */}
                <div className="p-4 border-t dark:border-gray-700 flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        className="flex-1"
                        disabled={loading}
                    >
                        취소
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !reason}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    >
                        {loading ? <InlineLoading /> : "신고하기"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
