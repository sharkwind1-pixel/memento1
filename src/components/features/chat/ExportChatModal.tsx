/**
 * ExportChatModal.tsx
 * AI 펫톡 대화 내보내기 모달
 * 템플릿 선택 + 미리보기 + PNG/JPG 다운로드
 */

"use client";

import { useState, useRef, useCallback } from "react";
import useHorizontalScroll from "@/hooks/useHorizontalScroll";
import { X, Download, Image as ImageIcon, FileText, Star, Heart, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import type { Pet } from "@/types";
import type { ChatMessage } from "./chatTypes";
import ExportChatCard, { type CardTemplate } from "./ExportChatCard";

interface ExportChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    pet: Pet;
    isMemorialMode: boolean;
}

const TEMPLATES: { id: CardTemplate; name: string; icon: React.ReactNode; description: string }[] = [
    {
        id: "letter",
        name: "편지",
        icon: <FileText className="w-5 h-5" />,
        description: "따뜻한 편지 스타일",
    },
    {
        id: "polaroid",
        name: "폴라로이드",
        icon: <ImageIcon className="w-5 h-5" />,
        description: "심플한 사진 스타일",
    },
    {
        id: "memorial",
        name: "추모",
        icon: <Star className="w-5 h-5" />,
        description: "별이 빛나는 밤하늘",
    },
    {
        id: "cute",
        name: "귀여운",
        icon: <Heart className="w-5 h-5" />,
        description: "파스텔 그라데이션",
    },
];

export default function ExportChatModal({
    isOpen,
    onClose,
    messages,
    pet,
    isMemorialMode,
}: ExportChatModalProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate>(
        isMemorialMode ? "memorial" : "letter"
    );
    const [isExporting, setIsExporting] = useState(false);
    const [format, setFormat] = useState<"png" | "jpg">("png");
    const cardRef = useRef<HTMLDivElement>(null);
    const previewScrollRef = useHorizontalScroll();

    const handleExport = useCallback(async () => {
        if (!cardRef.current) return;

        setIsExporting(true);

        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 2, // 고해상도
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                logging: false,
            });

            const dataUrl = canvas.toDataURL(
                format === "png" ? "image/png" : "image/jpeg",
                0.95
            );

            // 다운로드 링크 생성
            const link = document.createElement("a");
            link.download = `${pet.name}_대화_${new Date().toISOString().split("T")[0]}.${format}`;
            link.href = dataUrl;
            link.click();

            toast.success("이미지가 저장되었어요");
            onClose();
        } catch (error) {
            console.error("Export failed:", error);
            toast.error("이미지 저장에 실패했어요. 다시 시도해주세요.");
        } finally {
            setIsExporting(false);
        }
    }, [format, pet.name, onClose]);

    const handleShare = useCallback(async () => {
        if (!cardRef.current) return;

        setIsExporting(true);

        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                logging: false,
            });

            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((b) => resolve(b!), "image/png", 0.95);
            });

            if (navigator.share && navigator.canShare) {
                const file = new File([blob], `${pet.name}_대화.png`, {
                    type: "image/png",
                });

                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `${pet.name}와의 대화`,
                        text: isMemorialMode
                            ? `${pet.name}와의 소중한 추억`
                            : `${pet.name}와의 대화`,
                    });
                    toast.success("공유되었어요");
                    onClose();
                    return;
                }
            }

            // Web Share API 미지원 시 클립보드 복사
            await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
            ]);
            toast.success("이미지가 클립보드에 복사되었어요");
        } catch (error) {
            if ((error as Error).name !== "AbortError") {
                console.error("Share failed:", error);
                toast.error("공유에 실패했어요");
            }
        } finally {
            setIsExporting(false);
        }
    }, [pet.name, isMemorialMode, onClose]);

    if (!isOpen) return null;

    // 유저/펫 메시지만 필터링
    const chatMessages = messages.filter(
        (m) => m.role === "user" || m.role === "pet"
    );

    if (chatMessages.length < 2) {
        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <div
                    className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm mx-4 text-center"
                    onClick={(e) => e.stopPropagation()}
                >
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        내보내기하려면 대화가 더 필요해요.
                        <br />
                        {pet.name}와 더 이야기해볼까요?
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-full bg-sky-500 text-white hover:bg-sky-600 transition-colors"
                    >
                        확인
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-modal-title"
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2
                        id="export-modal-title"
                        className="text-lg font-bold text-gray-900 dark:text-white"
                    >
                        대화 내보내기
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="닫기"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* 템플릿 선택 */}
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            템플릿 선택
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {TEMPLATES.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template.id)}
                                    className={`p-3 rounded-xl border-2 transition-all ${
                                        selectedTemplate === template.id
                                            ? isMemorialMode
                                                ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                                                : "border-sky-500 bg-sky-50 dark:bg-sky-900/20"
                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                    }`}
                                >
                                    <div
                                        className={`mb-2 ${
                                            selectedTemplate === template.id
                                                ? isMemorialMode
                                                    ? "text-amber-600"
                                                    : "text-sky-600"
                                                : "text-gray-500"
                                        }`}
                                    >
                                        {template.icon}
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {template.name}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {template.description}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 포맷 선택 */}
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            파일 형식
                        </h3>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setFormat("png")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    format === "png"
                                        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                }`}
                            >
                                PNG (고화질)
                            </button>
                            <button
                                onClick={() => setFormat("jpg")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    format === "jpg"
                                        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                }`}
                            >
                                JPG (작은 용량)
                            </button>
                        </div>
                    </div>

                    {/* 미리보기 */}
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            미리보기
                        </h3>
                        <div ref={previewScrollRef} className="flex justify-center overflow-x-auto pb-4">
                            <div className="transform scale-[0.85] origin-top">
                                <ExportChatCard
                                    ref={cardRef}
                                    messages={messages}
                                    pet={pet}
                                    isMemorialMode={isMemorialMode}
                                    template={selectedTemplate}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 푸터 */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                    <button
                        onClick={handleShare}
                        disabled={isExporting}
                        className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
                    >
                        공유하기
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className={`flex-1 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                            isMemorialMode
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                : "bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600"
                        }`}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                저장 중...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                저장하기
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
