/**
 * VideoGenerateModal.tsx
 * AI 영상 생성 3단계 모달
 *
 * Step 1: 사진 선택
 * Step 2: 템플릿 선택 (프리셋 또는 직접 입력)
 * Step 3: 확인 및 생성
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
    X,
    Check,
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    Loader2,
    Baby,
    Flower2,
    Rainbow,
    Waves,
    Snowflake,
    Shield,
    Star,
    Leaf,
    ImagePlus,
    Sun,
    CloudRain,
    Cloud,
    Sunset,
} from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { VIDEO_TEMPLATES } from "@/config/videoTemplates";
import type { VideoTemplate, VideoQuota } from "@/types";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { uploadMedia } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";


// ============================================
// Icon mapping for dynamic template rendering
// ============================================
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    Baby,
    Flower2,
    Rainbow,
    Waves,
    Snowflake,
    Shield,
    Star,
    Leaf,
    Sun,
    CloudRain,
    Cloud,
    Sunset,
};

// ============================================
// Category badge configuration
// ============================================
const CATEGORY_BADGE: Record<string, { label: string; className: string }> = {
    fun: {
        label: "재미",
        className: "bg-memento-200 text-memento-700 dark:bg-memento-900/30 dark:text-memento-300",
    },
    memorial: {
        label: "기억",
        className: "bg-memorial-100 text-memorial-700 dark:bg-memorial-900/30 dark:text-memorial-300",
    },
    transform: {
        label: "변신",
        className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    },
};

const CUSTOM_PROMPT_MAX_LENGTH = 200;

// ============================================
// Props
// ============================================
interface VideoGenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (generationId: string) => void;
    pet: {
        id: string;
        name: string;
        photos: Array<{ id: string; url: string; type: string }>;
        status?: string;
    };
}

export default function VideoGenerateModal({
    isOpen,
    onClose,
    onSuccess,
    pet,
}: VideoGenerateModalProps) {
    // ============================================
    // State
    // ============================================
    const [step, setStep] = useState(1);
    const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(null);
    const [customPrompt, setCustomPrompt] = useState("");
    const [isCustomPromptOpen, setIsCustomPromptOpen] = useState(false);
    const [quota, setQuota] = useState<VideoQuota | null>(null);
    const [isLoadingQuota, setIsLoadingQuota] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [directUploadUrl, setDirectUploadUrl] = useState<string | null>(null);
    const [directUploadPreview, setDirectUploadPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { user } = useAuth();

    // ============================================
    // Derived
    // ============================================
    const imagePhotos = pet.photos.filter((p) => p.type !== "video");

    const canProceedStep1 = selectedPhotoUrl !== null;
    const canProceedStep2 = selectedTemplate !== null || customPrompt.trim().length > 0;
    const canSubmit = !isSubmitting && canProceedStep1 && canProceedStep2;

    // ============================================
    // Escape key handler + body scroll lock
    // ============================================
    useEscapeClose(isOpen, onClose);

    // ============================================
    // Reset state when modal opens
    // ============================================
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedPhotoUrl(null);
            setSelectedTemplate(null);
            setCustomPrompt("");
            setIsCustomPromptOpen(false);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    // ============================================
    // Fetch quota when reaching step 3
    // ============================================
    useEffect(() => {
        if (!isOpen || step !== 3) return;

        let cancelled = false;
        async function fetchQuota() {
            setIsLoadingQuota(true);
            try {
                const res = await authFetch(API.VIDEO_QUOTA);
                if (!res.ok) throw new Error("쿼터 정보를 불러올 수 없습니다.");
                const data = await res.json();
                if (!cancelled) setQuota(data);
            } catch {
                if (!cancelled) setQuota(null);
            } finally {
                if (!cancelled) setIsLoadingQuota(false);
            }
        }
        fetchQuota();
        return () => { cancelled = true; };
    }, [isOpen, step]);

    // ============================================
    // Handlers
    // ============================================
    const handleOverlayClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose]
    );

    const handleSelectTemplate = useCallback((template: VideoTemplate) => {
        setSelectedTemplate(template);
        setCustomPrompt("");
        setIsCustomPromptOpen(false);
    }, []);

    const handleCustomPromptChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const value = e.target.value;
            if (value.length <= CUSTOM_PROMPT_MAX_LENGTH) {
                setCustomPrompt(value);
                if (value.trim().length > 0) {
                    setSelectedTemplate(null);
                }
            }
        },
        []
    );

    const handleCustomPromptFocus = useCallback(() => {
        if (customPrompt.trim().length > 0) {
            setSelectedTemplate(null);
        }
    }, [customPrompt]);

    const handleSubmit = useCallback(async () => {
        if (!canSubmit || !selectedPhotoUrl) return;

        setIsSubmitting(true);
        try {
            const body: Record<string, string> = {
                petId: pet.id,
                petName: pet.name,
                sourcePhotoUrl: selectedPhotoUrl,
            };
            if (selectedTemplate) {
                body.templateId = selectedTemplate.id;
            }
            if (customPrompt.trim()) {
                body.customPrompt = customPrompt.trim();
            }

            const res = await authFetch(API.VIDEO_GENERATE, {
                method: "POST",
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                // 횟수 초과(403) 또는 서비스 미설정(502/503) → 프리미엄 모달로 유도
                if (res.status === 403 || res.status === 502 || res.status === 503) {
                    toast.error(errorData?.error || "영상 생성 서비스를 이용하려면 프리미엄 구독이 필요합니다.");
                    onClose();
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent("openVideoPurchaseModal"));
                    }, 300);
                    return;
                }
                const errorMsg = errorData?.error || errorData?.msg || "영상 생성 요청에 실패했습니다.";
                const detail = errorData?.detail ? ` (${errorData.detail})` : "";
                throw new Error(errorMsg + detail);
            }

            const data = await res.json();
            toast("영상을 만들고 있어요! 완성되면 알려드릴게요.");
            onSuccess(data.id);
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : "영상 생성 요청에 실패했습니다.";
            // 서버 에러/네트워크 에러 → 프리미엄 모달로 유도
            if (message.includes("Forbidden") || message.includes("502") || message.includes("503") || message.includes("Failed to fetch") || message.includes("서비스")) {
                toast.error("영상 생성 서비스를 이용하려면 프리미엄 구독이 필요합니다.");
                onClose();
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent("openVideoPurchaseModal"));
                }, 300);
            } else {
                toast.error(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [canSubmit, selectedPhotoUrl, selectedTemplate, customPrompt, pet.id, pet.name, onSuccess, onClose]);

    // ============================================
    // Render guard
    // ============================================
    if (!isOpen) return null;

    // ============================================
    // Sub-renders
    // ============================================

    /** Step indicator dots */
    const renderStepIndicator = () => (
        <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
                <div
                    key={s}
                    className={`w-2 h-2 rounded-full transition-colors ${
                        s === step
                            ? "bg-memento-500"
                            : s < step
                              ? "bg-memento-300"
                              : "bg-gray-300 dark:bg-gray-600"
                    }`}
                />
            ))}
        </div>
    );

    /** Step 1: Photo selection */
    const renderStep1 = () => (
        <div className="p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                영상으로 만들 사진을 선택해주세요
            </h3>

            {/* 직접 업로드 버튼 */}
            <label className={`flex items-center justify-center gap-2 w-full py-3 mb-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                directUploadUrl
                    ? "border-memento-500 bg-memento-500/5 text-memento-600"
                    : "border-gray-300 dark:border-gray-600 text-gray-500 hover:border-memento-400 hover:text-memento-500"
            }`}>
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !user) return;
                        if (file.size > 10 * 1024 * 1024) {
                            toast.error("10MB 이하의 이미지만 업로드 가능합니다.");
                            return;
                        }
                        setIsUploading(true);
                        try {
                            const preview = URL.createObjectURL(file);
                            setDirectUploadPreview(preview);
                            const result = await uploadMedia(file, user.id, pet.id);
                            if (result.success && result.url) {
                                setDirectUploadUrl(result.url);
                                setSelectedPhotoUrl(result.url);
                            } else {
                                toast.error(result.error || "업로드에 실패했습니다.");
                                setDirectUploadPreview(null);
                            }
                        } catch {
                            toast.error("업로드 중 오류가 발생했습니다.");
                            setDirectUploadPreview(null);
                        } finally {
                            setIsUploading(false);
                        }
                    }}
                />
                {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <ImagePlus className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">
                    {directUploadUrl ? "다른 사진으로 변경" : "사진 직접 업로드"}
                </span>
            </label>

            {/* 직접 업로드한 이미지 미리보기 */}
            {(directUploadPreview || directUploadUrl) && (
                <div className="mb-4">
                    <button
                        type="button"
                        onClick={() => directUploadUrl && setSelectedPhotoUrl(directUploadUrl)}
                        className={`relative w-24 h-24 rounded-xl overflow-hidden border-2 transition-all ${
                            selectedPhotoUrl === directUploadUrl
                                ? "border-memento-500 ring-2 ring-memento-500/30"
                                : "border-transparent"
                        }`}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={directUploadPreview || directUploadUrl || ""} alt="업로드한 사진" className="w-full h-full object-cover" />
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                            </div>
                        )}
                        {!isUploading && selectedPhotoUrl === directUploadUrl && (
                            <div className="absolute inset-0 bg-memento-500/20 flex items-center justify-center">
                                <div className="w-7 h-7 bg-memento-500 rounded-full flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        )}
                    </button>
                </div>
            )}

            {imagePhotos.length === 0 && !directUploadUrl ? (
                <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">위 버튼으로 사진을 업로드하면 영상을 만들 수 있어요</p>
                </div>
            ) : imagePhotos.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {imagePhotos.map((photo) => {
                        const isSelected = selectedPhotoUrl === photo.url;
                        return (
                            <button
                                key={photo.id}
                                type="button"
                                onClick={() => setSelectedPhotoUrl(photo.url)}
                                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                                    isSelected
                                        ? "border-memento-500 ring-2 ring-memento-500/30"
                                        : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                                }`}
                            >
                                <OptimizedImage
                                    src={photo.url}
                                    alt={`${pet.name} 사진`}
                                    fill
                                    className="w-full h-full"
                                />
                                {isSelected && (
                                    <div className="absolute inset-0 bg-memento-500/20 flex items-center justify-center">
                                        <div className="w-7 h-7 bg-memento-500 rounded-full flex items-center justify-center">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            ) : null}

            {/* Footer */}
            <div className="mt-6">
                <button
                    type="button"
                    disabled={!canProceedStep1}
                    onClick={() => setStep(2)}
                    className={`w-full py-3 rounded-xl font-semibold text-white transition-all ${
                        canProceedStep1
                            ? "bg-gradient-to-r from-memento-500 to-memento-400 hover:shadow-lg"
                            : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
                    }`}
                >
                    다음
                </button>
            </div>
        </div>
    );

    /** Step 2: Template selection */
    const renderStep2 = () => (
        <div className="p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                어떤 영상을 만들까요?
            </h3>

            {/* Template grid — 일상/추모 모드별 필터링 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                {VIDEO_TEMPLATES.filter((t) =>
                    pet.status === "memorial"
                        ? t.category === "memorial" || t.category === "transform"
                        : t.category === "fun" || t.category === "transform"
                ).map((template) => {
                    const IconComponent = ICON_MAP[template.icon];
                    const badge = CATEGORY_BADGE[template.category];
                    const isSelected = selectedTemplate?.id === template.id;

                    return (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => handleSelectTemplate(template)}
                            className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                                isSelected
                                    ? "border-memento-500 bg-memento-50 dark:bg-memento-900/20 ring-2 ring-memento-500/30"
                                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                            }`}
                        >
                            {/* Category badge */}
                            {badge && (
                                <span
                                    className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-2 ${badge.className}`}
                                >
                                    {badge.label}
                                </span>
                            )}

                            {/* Icon and name */}
                            <div className="flex items-center gap-2 mb-1">
                                {IconComponent && (
                                    <IconComponent
                                        className={`w-5 h-5 flex-shrink-0 ${
                                            isSelected
                                                ? "text-memento-500"
                                                : "text-gray-500 dark:text-gray-400"
                                        }`}
                                    />
                                )}
                                <span
                                    className={`font-semibold text-sm ${
                                        isSelected
                                            ? "text-memento-600 dark:text-memento-400"
                                            : "text-gray-800 dark:text-white"
                                    }`}
                                >
                                    {template.name}
                                </span>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                {template.description}
                            </p>

                            {/* Selected check */}
                            {isSelected && (
                                <div className="absolute top-2 right-2">
                                    <div className="w-5 h-5 bg-memento-500 rounded-full flex items-center justify-center">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Custom prompt expandable section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                    type="button"
                    onClick={() => setIsCustomPromptOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                    <span>직접 입력</span>
                    {isCustomPromptOpen ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                </button>
                {isCustomPromptOpen && (
                    <div className="px-4 pb-4">
                        <textarea
                            value={customPrompt}
                            onChange={handleCustomPromptChange}
                            onFocus={handleCustomPromptFocus}
                            placeholder="원하는 영상을 설명해주세요. 예: 우리 아이가 구름 위를 걷는 모습"
                            maxLength={CUSTOM_PROMPT_MAX_LENGTH}
                            rows={3}
                            className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-memento-500/40 focus:border-memento-500 transition-colors"
                        />
                        <div className="flex justify-end mt-1">
                            <span className="text-xs text-gray-400">
                                {customPrompt.length}/{CUSTOM_PROMPT_MAX_LENGTH}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer buttons */}
            <div className="mt-6 flex gap-3">
                <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center justify-center gap-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                >
                    <ChevronLeft className="w-4 h-4" />
                    이전
                </button>
                <button
                    type="button"
                    disabled={!canProceedStep2}
                    onClick={() => setStep(3)}
                    className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${
                        canProceedStep2
                            ? "bg-gradient-to-r from-memento-500 to-memento-400 hover:shadow-lg"
                            : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
                    }`}
                >
                    다음
                </button>
            </div>
        </div>
    );

    /** Quota display helper */
    const renderQuotaInfo = () => {
        if (isLoadingQuota) {
            return (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    사용량 확인 중...
                </div>
            );
        }
        if (!quota) return null;

        if (quota.isLifetimeFree) {
            return (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    무료 체험 1회 중 {quota.used}회 사용
                </p>
            );
        }
        return (
            <p className="text-sm text-gray-500 dark:text-gray-400">
                이번 달 {quota.used}/{quota.limit}회 사용
            </p>
        );
    };

    /** Step 3: Confirmation */
    const renderStep3 = () => (
        <div className="p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                영상 생성 확인
            </h3>

            {/* Selected photo */}
            <div className="flex items-start gap-4 mb-5">
                {selectedPhotoUrl && (
                    <div className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        <OptimizedImage
                            src={selectedPhotoUrl}
                            alt="선택된 사진"
                            fill
                            className="w-full h-full"
                        />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        선택한 스타일
                    </p>
                    {selectedTemplate ? (
                        <p className="text-base font-semibold text-gray-800 dark:text-white">
                            {selectedTemplate.name}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                            {customPrompt}
                        </p>
                    )}
                </div>
            </div>

            {/* Quota info */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3 mb-4">
                {renderQuotaInfo()}
            </div>

            {/* 안내 문구 */}
            <div className="bg-memento-50 dark:bg-memento-900/20 border border-memento-200 dark:border-memento-800/30 rounded-xl px-4 py-3 mb-6">
                <p className="text-sm text-memento-700 dark:text-memento-300 font-medium leading-relaxed">
                    AI가 사진을 분석해 영상을 만들어요.
                    <br />
                    보통 5~10분 정도 걸리며, 완성되면 알려드릴게요.
                    <br />
                    <span className="text-memento-500">
                        이 페이지를 떠나셔도 괜찮아요!
                    </span>
                </p>
            </div>

            {/* Footer buttons */}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center justify-center gap-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                >
                    <ChevronLeft className="w-4 h-4" />
                    이전
                </button>
                <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={handleSubmit}
                    className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                        canSubmit
                            ? "bg-gradient-to-r from-memento-500 to-memento-400 hover:shadow-lg"
                            : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
                    }`}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            생성 중...
                        </>
                    ) : (
                        "영상 만들기"
                    )}
                </button>
            </div>
        </div>
    );

    // ============================================
    // Main render
    // ============================================
    return (
        <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            onClick={handleOverlayClick}
        >
            <div className="flex justify-center pt-4 sm:pt-8 pb-8 px-3 sm:px-4">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="video-generate-modal-title"
                    className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-lg relative animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-5 pb-2">
                        <div className="flex items-center gap-3">
                            <h2
                                id="video-generate-modal-title"
                                className="text-lg font-bold text-gray-800 dark:text-white"
                            >
                                AI 영상 만들기
                            </h2>
                            {renderStepIndicator()}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="닫기"
                        >
                            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Step content */}
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>
            </div>
        </div>
    );
}
