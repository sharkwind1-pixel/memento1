/**
 * LostPetPostCard.tsx
 * 분실동물 게시글 카드 컴포넌트
 * LostPage에서 분리 - 목록에서 개별 게시글 표시
 */

"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    MapPin,
    Clock,
    Eye,
    Calendar,
    Dog,
    Cat,
    Gift,
    PawPrint,
} from "lucide-react";
import type { LostPetPost } from "./lostTypes";
import { timeAgo, formatLocation } from "./lostTypes";

interface LostPetPostCardProps {
    post: LostPetPost;
    onClick: () => void;
}

export default function LostPetPostCard({ post, onClick }: LostPetPostCardProps) {
    return (
        <Card
            onClick={onClick}
            className={`bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-2 hover:shadow-lg transition-all duration-300 rounded-2xl cursor-pointer overflow-hidden ${
                post.type === "lost"
                    ? "border-orange-200 dark:border-orange-700/50 hover:border-orange-300 dark:hover:border-orange-600"
                    : "border-green-200 dark:border-green-700/50 hover:border-green-300 dark:hover:border-green-600"
            }`}
        >
            <div className="flex">
                {/* 이미지 */}
                <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-gray-100 dark:bg-gray-700 relative">
                    {post.imageUrl ? (
                        <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <PawPrint className="w-10 h-10 text-gray-300 dark:text-gray-500" />
                        </div>
                    )}
                    <Badge
                        className={`absolute top-2 left-2 ${
                            post.type === "lost"
                                ? "bg-orange-500"
                                : "bg-green-500"
                        } text-white`}
                    >
                        {post.type === "lost" ? "실종" : "발견"}
                    </Badge>
                    {post.reward && (
                        <Badge className="absolute bottom-2 left-2 bg-yellow-500 text-white">
                            <Gift className="w-3 h-3 mr-1" />
                            {post.reward}
                        </Badge>
                    )}
                </div>

                {/* 정보 */}
                <div className="flex-1 p-4">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 line-clamp-1 mb-2">
                        {post.title}
                    </h3>

                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300 mb-3">
                        <div className="flex items-center gap-2">
                            {post.petType === "강아지" ? (
                                <Dog className="w-4 h-4 flex-shrink-0" />
                            ) : post.petType === "고양이" ? (
                                <Cat className="w-4 h-4 flex-shrink-0" />
                            ) : (
                                <PawPrint className="w-4 h-4 flex-shrink-0" />
                            )}
                            <span className="line-clamp-1">
                                {[post.breed, post.color, post.gender].filter(Boolean).join(" / ") || post.petType}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="line-clamp-1">
                                {formatLocation(post.region, post.district, post.locationDetail)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span>
                                {post.type === "lost" ? "실종일" : "발견일"}: {post.date}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {post.views}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeAgo(post.createdAt)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
