/**
 * 질문/신고 & 건의사항 모달
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    X,
    Send,
    HelpCircle,
    Lightbulb,
    AlertTriangle,
    MessageSquare,
} from "lucide-react";
import { InlineLoading } from "@/components/ui/PawLoading";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEscapeClose } from "@/hooks/useEscapeClose";

type SupportType = "question" | "report" | "suggestion";

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: "inquiry" | "suggestion"; // inquiry = 질문/신고, suggestion = 건의사항
}

const INQUIRY_CATEGORIES = [
    { id: "question", label: "질문", icon: HelpCircle, color: "text-blue-500" },
    { id: "report", label: "신고", icon: AlertTriangle, color: "text-red-500" },
];

export default function SupportModal({
    isOpen,
    onClose,
    type,
}: SupportModalProps) {
    const { user } = useAuth();
    useEscapeClose(isOpen, onClose);
    const [category, setCategory] = useState<SupportType>(
        type === "inquiry" ? "question" : "suggestion",
    );
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!user) {
            setError("로그인 후 이용해주세요");
            return;
        }

        if (!title.trim() || !content.trim()) {
            setError("제목과 내용을 입력해주세요");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const { error: dbError } = await supabase
                .from("support_inquiries")
                .insert({
                    user_id: user.id,
                    email: user.email,
                    category: category,
                    title: title.trim(),
                    content: content.trim(),
                    status: "pending",
                });

            if (dbError) throw dbError;

            setSuccess(true);
            setTimeout(() => {
                setTitle("");
                setContent("");
                setEmail("");
                setSuccess(false);
                onClose();
            }, 2000);
        } catch {
            setError("문의 등록에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setTitle("");
        setContent("");
        setEmail("");
        setError("");
        setSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    const isInquiry = type === "inquiry";
    const modalTitle = isInquiry ? "질문/신고" : "건의사항";
    const modalIcon = isInquiry ? HelpCircle : Lightbulb;
    const ModalIcon = modalIcon;

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
            {/* 배경 */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={handleClose}
            />

            {/* 모달 */}
            <div className="relative w-full sm:max-w-lg sm:mx-4 bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[calc(100vh-140px)] sm:max-h-[85vh] mb-[80px] sm:mb-0">
                {/* 헤더 */}
                <div
                    className={`flex items-center justify-between p-4 border-b dark:border-gray-700 ${
                        isInquiry
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : "bg-amber-50 dark:bg-amber-900/20"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <ModalIcon
                            className={`w-5 h-5 ${isInquiry ? "text-blue-500" : "text-amber-500"}`}
                        />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                            {modalTitle}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {success ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                            접수되었습니다
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            빠른 시일 내에 답변드리겠습니다
                        </p>
                    </div>
                ) : (
                    <>
                        {/* 내용 */}
                        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* 카테고리 (질문/신고만) */}
                            {isInquiry && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        유형
                                    </label>
                                    <div className="flex gap-2">
                                        {INQUIRY_CATEGORIES.map((cat) => {
                                            const Icon = cat.icon;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    onClick={() =>
                                                        setCategory(
                                                            cat.id as SupportType,
                                                        )
                                                    }
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                                                        category === cat.id
                                                            ? "border-sky-500 bg-sky-50 dark:bg-sky-900/30"
                                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                                                    }`}
                                                >
                                                    <Icon
                                                        className={`w-4 h-4 ${cat.color}`}
                                                    />
                                                    <span className="font-medium">
                                                        {cat.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 비로그인 안내 */}
                            {!user && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                                        로그인 후 문의하실 수 있습니다
                                    </p>
                                </div>
                            )}

                            {/* 제목 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    제목 <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={
                                        isInquiry
                                            ? "문의 제목을 입력하세요"
                                            : "건의사항 제목을 입력하세요"
                                    }
                                    maxLength={100}
                                    className="rounded-lg"
                                />
                            </div>

                            {/* 내용 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    내용 <span className="text-red-500">*</span>
                                </label>
                                <Textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder={
                                        isInquiry
                                            ? category === "report"
                                                ? "신고 내용을 상세히 작성해주세요 (게시글 링크, 유저 정보 등)"
                                                : "궁금한 점을 자세히 작성해주세요"
                                            : "서비스 개선을 위한 의견을 자유롭게 작성해주세요"
                                    }
                                    rows={5}
                                    maxLength={2000}
                                    className="rounded-lg"
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">
                                    {content.length}/2000
                                </p>
                            </div>

                            {/* 에러 */}
                            {error && (
                                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                                    {error}
                                </p>
                            )}
                        </div>

                        {/* 푸터 */}
                        <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
                            <Button variant="outline" onClick={handleClose}>
                                취소
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className={`${
                                    isInquiry
                                        ? "bg-gradient-to-r from-blue-500 to-sky-500"
                                        : "bg-gradient-to-r from-amber-500 to-orange-500"
                                }`}
                            >
                                {isSubmitting ? (
                                    <InlineLoading />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        제출
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
