/**
 * LostPetDetailModal.tsx
 * 분실동물 게시글 상세 보기 모달
 * LostPage에서 분리 - 상세 정보, 연락처, 본인 액션(삭제/해결)
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    MapPin,
    Clock,
    Eye,
    Calendar,
    Dog,
    Cat,
    Gift,
    Share2,
    X,
    Loader2,
    Phone,
    Trash2,
    CheckCircle2,
    PawPrint,
} from "lucide-react";
import { toast } from "sonner";
import type { LostPetPost } from "./lostTypes";
import { timeAgo, formatLocation } from "./lostTypes";

interface LostPetDetailModalProps {
    post: LostPetPost;
    loading: boolean;
    isOwner: boolean;
    onClose: () => void;
    onDelete: (id: string) => void;
    onResolve: (id: string) => void;
}

/** 상세 모달 내 행 */
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            {icon && <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{icon}</span>}
            {!icon && <span className="w-4" />}
            <span className="text-gray-500 dark:text-gray-400 min-w-[60px]">{label}</span>
            <span className="text-gray-800 dark:text-gray-200 font-medium">{value}</span>
        </div>
    );
}

export default function LostPetDetailModal({
    post,
    loading,
    isOwner,
    onClose,
    onDelete,
    onResolve,
}: LostPetDetailModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lost-detail-title"
            >
                {/* 닫기 */}
                <button
                    onClick={onClose}
                    aria-label="닫기"
                    className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* 이미지 */}
                {post.imageUrl ? (
                    <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700 rounded-t-3xl overflow-hidden">
                        <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                        <Badge
                            className={`absolute top-4 left-4 text-sm ${
                                post.type === "lost" ? "bg-orange-500" : "bg-green-500"
                            } text-white`}
                        >
                            {post.type === "lost" ? "실종" : "발견"}
                        </Badge>
                    </div>
                ) : (
                    <div className="relative w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-t-3xl flex items-center justify-center">
                        <PawPrint className="w-16 h-16 text-gray-300 dark:text-gray-500" />
                        <Badge
                            className={`absolute top-4 left-4 text-sm ${
                                post.type === "lost" ? "bg-orange-500" : "bg-green-500"
                            } text-white`}
                        >
                            {post.type === "lost" ? "실종" : "발견"}
                        </Badge>
                    </div>
                )}

                {/* 콘텐츠 */}
                <div className="p-6 space-y-4">
                    {loading && (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                        </div>
                    )}

                    {/* 제목 & 사례금 */}
                    <div>
                        <h2 id="lost-detail-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                            {post.title}
                        </h2>
                        {post.reward && (
                            <Badge className="bg-yellow-500 text-white">
                                <Gift className="w-3 h-3 mr-1" />
                                사례금 {post.reward}
                            </Badge>
                        )}
                    </div>

                    {/* 동물 정보 */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 space-y-2">
                        <DetailRow
                            icon={post.petType === "강아지" ? <Dog className="w-4 h-4" /> : post.petType === "고양이" ? <Cat className="w-4 h-4" /> : <PawPrint className="w-4 h-4" />}
                            label="종류"
                            value={post.petType}
                        />
                        {post.breed && <DetailRow icon={<PawPrint className="w-4 h-4" />} label="품종" value={post.breed} />}
                        {post.color && <DetailRow icon={null} label="색상" value={post.color} />}
                        {post.gender && <DetailRow icon={null} label="성별" value={post.gender} />}
                        {post.age && <DetailRow icon={null} label="나이" value={post.age} />}
                    </div>

                    {/* 위치 & 날짜 */}
                    <div className="space-y-2">
                        <DetailRow
                            icon={<MapPin className="w-4 h-4 text-orange-500" />}
                            label={post.type === "lost" ? "실종 장소" : "발견 장소"}
                            value={formatLocation(post.region, post.district, post.locationDetail)}
                        />
                        <DetailRow
                            icon={<Calendar className="w-4 h-4 text-orange-500" />}
                            label={post.type === "lost" ? "실종일" : "발견일"}
                            value={post.date}
                        />
                    </div>

                    {/* 설명 */}
                    {post.description && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">상세 설명</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                                {post.description}
                            </p>
                        </div>
                    )}

                    {/* 연락처 */}
                    {post.contact && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 flex items-center gap-3">
                            <Phone className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                            <div>
                                <span className="text-xs text-blue-600 dark:text-blue-400">연락처</span>
                                <p className="font-medium text-blue-700 dark:text-blue-300">{post.contact}</p>
                            </div>
                        </div>
                    )}

                    {/* 메타 정보 */}
                    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                조회 {post.views}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeAgo(post.createdAt)}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-lg"
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                toast.success("링크가 복사되었습니다.");
                            }}
                        >
                            <Share2 className="w-3 h-3 mr-1" />
                            공유
                        </Button>
                    </div>

                    {/* 본인 액션 */}
                    {isOwner && (
                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl text-green-600 border-green-300 dark:border-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"
                                onClick={() => onResolve(post.id)}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                찾았어요!
                            </Button>
                            <Button
                                variant="outline"
                                className="rounded-xl text-red-600 border-red-300 dark:border-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                                onClick={() => onDelete(post.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
