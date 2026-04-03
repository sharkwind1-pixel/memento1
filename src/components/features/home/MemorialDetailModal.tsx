/**
 * MemorialDetailModal.tsx
 * 추모 펫 디테일 모달 - 프로필, 위로하기, 위로 메시지 목록/작성
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import { OptimizedImage } from "@/components/ui/optimized-image";
import type { CondolenceMessage } from "@/types";
import { safeStringSrc, getPetIcon } from "./homeUtils";

/** 위로 메시지 프리셋 문구 */
const CONDOLENCE_PRESETS = [
    "영원히 기억할게요",
    "마음속에 언제나 함께할 거예요",
    "무지개다리 너머에서 행복하길",
    "따뜻한 기억으로 남아주어 고마워요",
    "언제까지나 사랑해",
    "함께했던 시간이 소중했어요",
    "편히 쉬고 있을 거라 믿어요",
    "당신의 이야기가 따뜻합니다",
];

interface MemorialPetItem {
    id: string;
    name: string;
    type: string;
    breed: string;
    profileImage: string | null;
    isNewlyRegistered: boolean;
    yearsAgo: number | null;
    yearsLabel: string;
    condolenceCount: number;
}

interface MemorialDetailModalProps {
    pet: MemorialPetItem;
    isCondoled: boolean;
    onToggleCondolence: (petId: string) => void;
    onClose: () => void;
}

export default function MemorialDetailModal({
    pet,
    isCondoled,
    onToggleCondolence,
    onClose,
}: MemorialDetailModalProps) {
    const { user, isAdminUser } = useAuth();
    const [messages, setMessages] = useState<CondolenceMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [myMessageExists, setMyMessageExists] = useState(false);
    const [showPresets, setShowPresets] = useState(false);

    const src = safeStringSrc(pet.profileImage);

    // 메시지 목록 로드
    const loadMessages = useCallback(async () => {
        try {
            const res = await fetch(`/api/memorial-messages?petId=${pet.id}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
                if (user) {
                    setMyMessageExists(
                        (data.messages || []).some(
                            (m: CondolenceMessage) => m.userId === user.id
                        )
                    );
                }
            }
        } catch {
            // 조회 실패
        } finally {
            setIsLoadingMessages(false);
        }
    }, [pet.id, user]);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    // 프리셋 문구 선택 → 전송
    const handleSelectPreset = async (preset: string) => {
        if (isSending || !user) return;

        setIsSending(true);
        try {
            const res = await authFetch("/api/memorial-messages", {
                method: "POST",
                body: JSON.stringify({ petId: pet.id, message: preset }),
            });
            const data = await res.json();
            if (res.ok && data.message) {
                setMessages((prev) => [data.message, ...prev.filter((m) => m.userId !== user.id)]);
                setMyMessageExists(true);
                setShowPresets(false);
                toast.success("위로의 말이 전달되었습니다");
            } else {
                toast.error(data.error || "전송 실패");
            }
        } catch {
            toast.error("전송 중 오류가 발생했습니다");
        } finally {
            setIsSending(false);
        }
    };

    // 메시지 삭제
    const handleDelete = async (messageId: string) => {
        try {
            const res = await authFetch(`/api/memorial-messages?id=${messageId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setMessages((prev) => prev.filter((m) => m.id !== messageId));
                setMyMessageExists(false);
                toast.success("삭제되었습니다");
            } else {
                const data = await res.json();
                toast.error(data.error || "삭제 실패");
            }
        } catch {
            toast.error("삭제 중 오류가 발생했습니다");
        }
    };

    // 삭제 권한 확인
    const canDelete = (msg: CondolenceMessage) => {
        if (!user) return false;
        if (msg.userId === user.id) return true;
        if (isAdminUser) return true;
        return false;
    };

    // 날짜 포맷
    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            const month = d.getMonth() + 1;
            const day = d.getDate();
            return `${month}/${day}`;
        } catch {
            return "";
        }
    };

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50"
            onClick={onClose}
        >
            <div
                className="min-h-full flex items-start justify-center pt-16 pb-20 px-4"
                onClick={onClose}
            >
                <div
                    className="relative bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 닫기 버튼 */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 transition-colors"
                        aria-label="닫기"
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>

                    {/* 프로필 사진 */}
                    <div className="relative w-full aspect-square bg-gradient-to-br from-amber-100 to-orange-100 dark:from-gray-700 dark:to-gray-600">
                        {src ? (
                            <OptimizedImage
                                src={src}
                                alt={pet.name}
                                fill
                                className="w-full h-full"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                {(() => {
                                    const PetIcon = getPetIcon(pet.type);
                                    return <PetIcon className="w-24 h-24 text-amber-400/50" />;
                                })()}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    </div>

                    {/* 펫 정보 */}
                    <div className="px-5 pt-4 pb-3 text-center">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                            {pet.name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {pet.type}
                            {pet.breed ? ` / ${pet.breed}` : ""}
                        </p>
                        {pet.yearsLabel && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                                {pet.yearsLabel}
                            </p>
                        )}

                        {/* 위로하기 버튼 */}
                        <button
                            type="button"
                            onClick={() => onToggleCondolence(pet.id)}
                            className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full transition-all duration-200 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                        >
                            <Heart
                                className={`w-5 h-5 transition-all duration-300 ${
                                    isCondoled
                                        ? "fill-amber-500 text-amber-500 scale-110"
                                        : "text-amber-400"
                                }`}
                            />
                            <span
                                className={`text-sm font-medium ${
                                    isCondoled ? "text-amber-600" : "text-amber-500"
                                }`}
                            >
                                {pet.condolenceCount > 0
                                    ? `위로 ${pet.condolenceCount}`
                                    : "위로하기"}
                            </span>
                        </button>
                    </div>

                    {/* 구분선 */}
                    <div className="mx-5 border-t border-amber-200/50 dark:border-gray-700" />

                    {/* 위로의 말 섹션 */}
                    <div className="px-5 pt-3 pb-4">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                            위로의 말
                            {messages.length > 0 && (
                                <span className="text-amber-500 ml-1">
                                    {messages.length}
                                </span>
                            )}
                        </h3>

                        {/* 메시지 목록 */}
                        <div className="space-y-2.5 max-h-[200px] overflow-y-auto">
                            {isLoadingMessages ? (
                                <div className="text-center py-4 text-sm text-gray-400">
                                    불러오는 중...
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-6 text-sm text-gray-400">
                                    아직 위로의 말이 없습니다
                                    <br />
                                    <span className="text-xs text-gray-300 dark:text-gray-500">
                                        첫 번째 위로의 말을 남겨주세요
                                    </span>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className="group flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-900/10"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-700 dark:text-gray-200 break-words">
                                                {msg.message}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                {msg.nickname || "익명"}{" "}
                                                <span className="text-gray-300 dark:text-gray-600">
                                                    {formatDate(msg.createdAt)}
                                                </span>
                                            </p>
                                        </div>
                                        {canDelete(msg) && (
                                            <button
                                                onClick={() => handleDelete(msg.id)}
                                                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                                                aria-label="삭제"
                                            >
                                                <Trash2 className="w-3 h-3 text-red-400" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* 프리셋 문구 선택 */}
                        {user && !myMessageExists && (
                            <div className="mt-3">
                                {!showPresets ? (
                                    <button
                                        onClick={() => setShowPresets(true)}
                                        className="w-full py-2.5 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-xl transition-colors"
                                    >
                                        위로의 말 남기기
                                    </button>
                                ) : (
                                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                                        {CONDOLENCE_PRESETS.map((preset) => (
                                            <button
                                                key={preset}
                                                onClick={() => handleSelectPreset(preset)}
                                                disabled={isSending}
                                                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 rounded-xl transition-colors disabled:opacity-50"
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof window === "undefined") return modalContent;
    return createPortal(modalContent, document.body);
}
