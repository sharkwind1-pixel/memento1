/**
 * ConfirmDialog - 범용 확인 다이얼로그
 * 네이티브 confirm() 대체용 커스텀 모달
 */

"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, X } from "lucide-react";
import { useEscapeClose } from "@/hooks/useEscapeClose";

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    /** 확인 버튼 텍스트 (기본: "확인") */
    confirmText?: string;
    /** 취소 버튼 텍스트 (기본: "취소") */
    cancelText?: string;
    /** 위험한 작업 여부 (기본: false). true면 빨간색 확인 버튼 */
    destructive?: boolean;
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "확인",
    cancelText = "취소",
    destructive = false,
}: ConfirmDialogProps) {
    useEscapeClose(isOpen, onClose);
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        destructive
                            ? "bg-red-100 dark:bg-red-900/30"
                            : "bg-sky-100 dark:bg-sky-900/30"
                    }`}>
                        <AlertTriangle className={`w-5 h-5 ${
                            destructive ? "text-red-600" : "text-sky-600"
                        }`} />
                    </div>
                    <h3 id="confirm-dialog-title" className="text-lg font-semibold text-gray-800 dark:text-white">
                        {title}
                    </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-line">
                    {message}
                </p>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        <X className="w-4 h-4 mr-2" />
                        {cancelText}
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 ${
                            destructive
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "bg-sky-500 hover:bg-sky-600 text-white"
                        }`}
                    >
                        <Check className="w-4 h-4 mr-2" />
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
