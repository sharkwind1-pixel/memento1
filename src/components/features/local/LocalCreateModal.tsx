/**
 * LocalCreateModal.tsx
 * 지역 게시판 게시글 작성 모달
 * LocalPage에서 분리 - 작성 폼 렌더링 담당
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    X,
    Loader2,
    Plus,
    ImagePlus,
} from "lucide-react";
import type { PostFormData } from "./localTypes";
import { REGIONS, CATEGORIES, BADGE_OPTIONS } from "./localTypes";

interface LocalCreateModalProps {
    form: PostFormData;
    setForm: React.Dispatch<React.SetStateAction<PostFormData>>;
    imagePreview: string | null;
    formDistricts: string[];
    submitting: boolean;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveImage: () => void;
    onSubmit: () => void;
    onClose: () => void;
}

export default function LocalCreateModal({
    form,
    setForm,
    imagePreview,
    formDistricts,
    submitting,
    fileInputRef,
    onImageSelect,
    onRemoveImage,
    onSubmit,
    onClose,
}: LocalCreateModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                role="dialog"
                aria-modal="true"
                aria-labelledby="local-create-title"
            >
                {/* 헤더 */}
                <div className="sticky top-0 z-10 px-6 py-4 rounded-t-3xl flex items-center justify-between bg-gradient-to-r from-blue-500 to-sky-500">
                    <h2 id="local-create-title" className="text-lg font-bold text-white">글쓰기</h2>
                    <button onClick={onClose} aria-label="닫기" className="text-white/80 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* 카테고리 & 배지 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">카테고리 *</Label>
                            <Select
                                value={form.category}
                                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                            >
                                <SelectTrigger className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.filter(c => c.id !== "all").map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">말머리</Label>
                            <Select
                                value={form.badge}
                                onValueChange={(v) => setForm((f) => ({ ...f, badge: v }))}
                            >
                                <SelectTrigger className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {BADGE_OPTIONS.map((b) => (
                                        <SelectItem key={b} value={b}>{b}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* 지역 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">시/도</Label>
                            <Select
                                value={form.region}
                                onValueChange={(v) => setForm((f) => ({ ...f, region: v, district: "" }))}
                            >
                                <SelectTrigger className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600">
                                    <SelectValue placeholder="시/도" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(REGIONS).map((r) => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {formDistricts.length > 0 && (
                            <div>
                                <Label className="text-gray-700 dark:text-gray-300">구/군</Label>
                                <Select
                                    value={form.district}
                                    onValueChange={(v) => setForm((f) => ({ ...f, district: v }))}
                                >
                                    <SelectTrigger className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600">
                                        <SelectValue placeholder="구/군" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {formDistricts.map((d) => (
                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* 제목 */}
                    <div>
                        <Label className="text-gray-700 dark:text-gray-300">제목 *</Label>
                        <Input
                            placeholder="제목을 입력하세요"
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600"
                            maxLength={200}
                        />
                    </div>

                    {/* 내용 */}
                    <div>
                        <Label className="text-gray-700 dark:text-gray-300">내용</Label>
                        <Textarea
                            placeholder="내용을 작성해주세요."
                            value={form.content}
                            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                            className="mt-1 rounded-xl min-h-[120px] dark:bg-gray-700 dark:border-gray-600"
                            maxLength={5000}
                        />
                    </div>

                    {/* 이미지 업로드 */}
                    <div>
                        <Label className="text-gray-700 dark:text-gray-300">사진</Label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={onImageSelect}
                            className="hidden"
                        />
                        {imagePreview ? (
                            <div className="mt-2 relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
                                <img src={imagePreview} alt="미리보기" className="w-full h-48 object-cover" />
                                <button
                                    onClick={onRemoveImage}
                                    aria-label="이미지 제거"
                                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-2 w-full h-28 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:border-blue-400 hover:text-blue-400 dark:hover:border-blue-500 dark:hover:text-blue-500 transition-colors"
                            >
                                <ImagePlus className="w-8 h-8" />
                                <span className="text-sm">사진 추가</span>
                            </button>
                        )}
                    </div>

                    {/* 제출 */}
                    <Button
                        onClick={onSubmit}
                        disabled={submitting || !form.title.trim()}
                        className="w-full rounded-xl text-white py-3 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                등록 중...
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-2" />
                                글 등록
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
