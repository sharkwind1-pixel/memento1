"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Trash2 } from "lucide-react";

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

export default function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
}: DeleteConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        <X className="w-4 h-4 mr-2" />
                        취소
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                    </Button>
                </div>
            </div>
        </div>
    );
}
