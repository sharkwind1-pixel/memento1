/**
 * StoryCreateModal.tsx
 * 스토리 작성 모달
 *
 * - 사진 업로드 또는 텍스트 입력
 * - 배경색 선택 (텍스트 전용)
 * - 24시간 후 자동 삭제 안내
 */

"use client";

import React, { useState, useRef } from "react";
import { X, Camera, Type, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { authFetch } from "@/lib/auth-fetch";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface StoryCreateModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const BG_COLORS = [
    "#05B2DC", // memento blue
    "#F59E0B", // memorial amber
    "#8B5CF6", // violet
    "#EC4899", // pink
    "#10B981", // emerald
    "#F97316", // orange
    "#3B82F6", // blue
    "#EF4444", // red
];

type StoryMode = "photo" | "text";

export default function StoryCreateModal({ onClose, onSuccess }: StoryCreateModalProps) {
    const [mode, setMode] = useState<StoryMode>("text");
    const [textContent, setTextContent] = useState("");
    const [bgColor, setBgColor] = useState(BG_COLORS[0]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error("10MB 이하의 이미지만 가능합니다");
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setMode("photo");
    };

    const handleSubmit = async () => {
        if (mode === "text" && !textContent.trim()) {
            toast.error("텍스트를 입력해주세요");
            return;
        }
        if (mode === "photo" && !imageFile) {
            toast.error("사진을 선택해주세요");
            return;
        }

        setSubmitting(true);
        try {
            let imageUrl: string | null = null;

            // 사진 모드: Storage 업로드
            if (mode === "photo" && imageFile) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("로그인 필요");

                const ext = imageFile.name.split(".").pop() || "jpg";
                const path = `stories/${user.id}/${Date.now()}.${ext}`;

                const { error: uploadErr } = await supabase.storage
                    .from("pet-media")
                    .upload(path, imageFile, {
                        cacheControl: "86400",
                        upsert: false,
                    });

                if (uploadErr) throw new Error("이미지 업로드 실패");

                const { data: { publicUrl } } = supabase.storage
                    .from("pet-media")
                    .getPublicUrl(path);

                imageUrl = publicUrl;
            }

            // API 호출
            const res = await authFetch("/api/stories", {
                method: "POST",
                body: JSON.stringify({
                    imageUrl,
                    textContent: mode === "text" ? textContent.trim() : null,
                    backgroundColor: mode === "text" ? bgColor : null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "스토리 작성 실패");
            }

            toast.success("스토리가 올라갔어요 (24시간 후 자동 삭제)");
            onSuccess();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "스토리 작성 실패";
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl">
                {/* 헤더 */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">스토리 올리기</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* 모드 선택 */}
                <div className="px-5 pt-4 flex gap-2">
                    <button
                        onClick={() => setMode("photo")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                            mode === "photo"
                                ? "border-memento-500 bg-memento-50 text-memento-600"
                                : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                        }`}
                    >
                        <Camera className="w-4 h-4" />
                        사진
                    </button>
                    <button
                        onClick={() => setMode("text")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                            mode === "text"
                                ? "border-memento-500 bg-memento-50 text-memento-600"
                                : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                        }`}
                    >
                        <Type className="w-4 h-4" />
                        텍스트
                    </button>
                </div>

                {/* 콘텐츠 */}
                <div className="px-5 py-4">
                    {mode === "photo" ? (
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            {imagePreview ? (
                                <div className="relative rounded-2xl overflow-hidden aspect-[9/16] max-h-[300px]">
                                    <img src={imagePreview} alt="미리보기" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                                        className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full aspect-[9/16] max-h-[300px] rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-memento-400 hover:text-memento-500 transition-colors"
                                >
                                    <Camera className="w-8 h-8" />
                                    <span className="text-sm">사진 선택</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div>
                            {/* 미리보기 */}
                            <div
                                className="rounded-2xl aspect-[9/16] max-h-[200px] flex items-center justify-center px-6 mb-3"
                                style={{ backgroundColor: bgColor }}
                            >
                                <p className="text-white text-center font-bold text-lg leading-relaxed drop-shadow">
                                    {textContent || "여기에 텍스트가 표시됩니다"}
                                </p>
                            </div>

                            <Textarea
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                                placeholder="오늘의 한마디..."
                                rows={2}
                                maxLength={500}
                                className="mb-3"
                            />

                            {/* 배경색 선택 */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">배경</span>
                                {BG_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setBgColor(color)}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                                            bgColor === color ? "border-gray-800 dark:border-white scale-110" : "border-transparent"
                                        }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 발행 */}
                <div className="px-5 pb-5">
                    <p className="text-[10px] text-gray-400 mb-3 text-center">
                        스토리는 24시간 후 자동으로 사라집니다
                    </p>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || (mode === "text" && !textContent.trim()) || (mode === "photo" && !imageFile)}
                        className="w-full bg-memento-500 hover:bg-memento-600 text-white rounded-xl"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "스토리 올리기"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
