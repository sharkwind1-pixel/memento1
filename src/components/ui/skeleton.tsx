/**
 * 스켈레톤 로딩 컴포넌트
 * 콘텐츠 로딩 중 플레이스홀더 표시
 */

import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
                className
            )}
        />
    );
}

// 펫 카드 스켈레톤
export function PetCardSkeleton() {
    return (
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
            <Skeleton className="w-full h-full" />
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-12" />
            </div>
        </div>
    );
}

// 포스트 카드 스켈레톤
export function PostCardSkeleton() {
    return (
        <div className="min-w-[260px] rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-lg">
            <Skeleton className="h-32 w-full" />
            <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-3 pt-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                </div>
            </div>
        </div>
    );
}

// 사진 그리드 스켈레톤
export function PhotoGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
        </div>
    );
}

// 타임라인 스켈레톤
export function TimelineSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="relative pl-6 pb-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-5 w-3/4 mb-1" />
                    <Skeleton className="h-4 w-full" />
                </div>
            ))}
        </div>
    );
}

// 채팅 메시지 스켈레톤
export function ChatMessageSkeleton({ isUser = false }: { isUser?: boolean }) {
    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            {!isUser && <Skeleton className="w-8 h-8 rounded-full mr-2" />}
            <Skeleton
                className={cn(
                    "h-12 rounded-2xl",
                    isUser ? "w-40 rounded-br-md" : "w-56 rounded-bl-md"
                )}
            />
        </div>
    );
}

// 리마인더 카드 스켈레톤
export function ReminderCardSkeleton() {
    return (
        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="w-12 h-6 rounded-full" />
            </div>
        </div>
    );
}

// 프로필 스켈레톤
export function ProfileSkeleton() {
    return (
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="space-y-2 text-center sm:text-left">
                <Skeleton className="h-6 w-32 mx-auto sm:mx-0" />
                <Skeleton className="h-4 w-48 mx-auto sm:mx-0" />
                <Skeleton className="h-4 w-24 mx-auto sm:mx-0" />
            </div>
        </div>
    );
}
