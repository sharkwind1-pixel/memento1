/**
 * LostPetCreateModal.tsx
 * 분실/발견 동물 신고 작성 모달
 * LostPage에서 분리 - 폼 입력, 이미지 업로드, 지역 선택
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
    AlertTriangle,
    Eye,
    X,
    Loader2,
    Plus,
    ImagePlus,
} from "lucide-react";
import type { PostFormData } from "./lostTypes";
import { REGIONS } from "./lostTypes";

interface LostPetCreateModalProps {
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

export default function LostPetCreateModal({
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
}: LostPetCreateModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lost-create-title"
            >
                {/* 헤더 */}
                <div className={`sticky top-0 z-10 px-6 py-4 rounded-t-3xl flex items-center justify-between ${
                    form.type === "lost"
                        ? "bg-gradient-to-r from-orange-500 to-red-500"
                        : "bg-gradient-to-r from-green-500 to-emerald-500"
                }`}>
                    <h2 id="lost-create-title" className="text-lg font-bold text-white">
                        {form.type === "lost" ? "실종 신고" : "발견 신고"}
                    </h2>
                    <button onClick={onClose} aria-label="닫기" className="text-white/80 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* 유형 토글 */}
                    <div className="flex gap-2">
                        <Button
                            variant={form.type === "lost" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setForm((f) => ({ ...f, type: "lost" }))}
                            className={`rounded-xl flex-1 ${form.type === "lost" ? "bg-orange-500 border-0" : "border-orange-300 text-orange-600 dark:border-orange-600 dark:text-orange-400"}`}
                        >
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            실종
                        </Button>
                        <Button
                            variant={form.type === "found" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setForm((f) => ({ ...f, type: "found" }))}
                            className={`rounded-xl flex-1 ${form.type === "found" ? "bg-green-500 border-0" : "border-green-300 text-green-600 dark:border-green-600 dark:text-green-400"}`}
                        >
                            <Eye className="w-4 h-4 mr-1" />
                            발견
                        </Button>
                    </div>

                    {/* 제목 */}
                    <div>
                        <Label className="text-gray-700 dark:text-gray-300">제목 *</Label>
                        <Input
                            placeholder="예: 포메라니안 찾습니다"
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600"
                            maxLength={200}
                        />
                    </div>

                    {/* 동물 정보 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">동물 종류 *</Label>
                            <Select
                                value={form.petType}
                                onValueChange={(v) => setForm((f) => ({ ...f, petType: v }))}
                            >
                                <SelectTrigger className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="강아지">강아지</SelectItem>
                                    <SelectItem value="고양이">고양이</SelectItem>
                                    <SelectItem value="기타">기타</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">품종</Label>
                            <Input
                                placeholder="예: 포메라니안"
                                value={form.breed}
                                onChange={(e) => setForm((f) => ({ ...f, breed: e.target.value }))}
                                className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">색상</Label>
                            <Input
                                placeholder="예: 크림색"
                                value={form.color}
                                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                                className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">성별</Label>
                            <Select
                                value={form.gender}
                                onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}
                            >
                                <SelectTrigger className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600">
                                    <SelectValue placeholder="선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="수컷">수컷</SelectItem>
                                    <SelectItem value="암컷">암컷</SelectItem>
                                    <SelectItem value="미상">미상</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">나이</Label>
                            <Input
                                placeholder="예: 3살"
                                value={form.age}
                                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                                className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">
                                {form.type === "lost" ? "실종일" : "발견일"} *
                            </Label>
                            <Input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>

                    {/* 위치 */}
                    <div className="space-y-3">
                        <Label className="text-gray-700 dark:text-gray-300">
                            {form.type === "lost" ? "실종 장소" : "발견 장소"}
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                            <Select
                                value={form.region}
                                onValueChange={(v) => setForm((f) => ({ ...f, region: v, district: "" }))}
                            >
                                <SelectTrigger className="rounded-xl dark:bg-gray-700 dark:border-gray-600">
                                    <SelectValue placeholder="시/도" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(REGIONS).filter(r => r !== "전체").map((region) => (
                                        <SelectItem key={region} value={region}>
                                            {region}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {formDistricts.length > 0 && (
                                <Select
                                    value={form.district}
                                    onValueChange={(v) => setForm((f) => ({ ...f, district: v }))}
                                >
                                    <SelectTrigger className="rounded-xl dark:bg-gray-700 dark:border-gray-600">
                                        <SelectValue placeholder="구/군" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {formDistricts.map((d) => (
                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <Input
                            placeholder="상세 위치 (예: 역삼역 2번 출구 근처)"
                            value={form.locationDetail}
                            onChange={(e) => setForm((f) => ({ ...f, locationDetail: e.target.value }))}
                            className="rounded-xl dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>

                    {/* 상세 설명 */}
                    <div>
                        <Label className="text-gray-700 dark:text-gray-300">상세 설명</Label>
                        <Textarea
                            placeholder="특징, 입고 있는 옷, 목줄 색상 등 자세히 적어주세요."
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            className="mt-1 rounded-xl min-h-[100px] dark:bg-gray-700 dark:border-gray-600"
                            maxLength={5000}
                        />
                    </div>

                    {/* 연락처 & 사례금 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">연락처</Label>
                            <Input
                                placeholder="010-0000-0000"
                                value={form.contact}
                                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                                className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        {form.type === "lost" && (
                            <div>
                                <Label className="text-gray-700 dark:text-gray-300">사례금</Label>
                                <Input
                                    placeholder="예: 100만원"
                                    value={form.reward}
                                    onChange={(e) => setForm((f) => ({ ...f, reward: e.target.value }))}
                                    className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        )}
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
                                <img
                                    src={imagePreview}
                                    alt="미리보기"
                                    className="w-full h-48 object-cover"
                                />
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
                                className="mt-2 w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:border-orange-400 hover:text-orange-400 dark:hover:border-orange-500 dark:hover:text-orange-500 transition-colors"
                            >
                                <ImagePlus className="w-8 h-8" />
                                <span className="text-sm">사진 추가</span>
                            </button>
                        )}
                    </div>

                    {/* 제출 버튼 */}
                    <Button
                        onClick={onSubmit}
                        disabled={submitting || !form.title.trim()}
                        className={`w-full rounded-xl text-white py-3 ${
                            form.type === "lost"
                                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                                : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        }`}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                등록 중...
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-2" />
                                {form.type === "lost" ? "실종 신고 등록" : "발견 신고 등록"}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
