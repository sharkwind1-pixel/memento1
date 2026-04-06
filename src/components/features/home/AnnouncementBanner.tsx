/**
 * AnnouncementBanner - 홈 상단 전체 공지 배너
 * 전체 공지(global)를 최대 3개 표시, 개별 닫기 가능
 */

"use client";

import { useState, useEffect } from "react";
import { Megaphone, X, ChevronRight } from "lucide-react";
import type { TabType, CommunitySubcategory } from "@/types";
import { API } from "@/config/apiEndpoints";

interface Notice {
    id: string;
    title: string;
    boardType: string;
    createdAt: string;
}

interface AnnouncementBannerProps {
    setSelectedTab: (tab: TabType, sub?: CommunitySubcategory) => void;
    onSelectPost?: (postId: string) => void;
}

export default function AnnouncementBanner({ setSelectedTab, onSelectPost }: AnnouncementBannerProps) {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNotices = async () => {
            try {
                const response = await fetch(`${API.POSTS}?notice_scope=global&limit=3`);
                if (!response.ok) return;

                const data = await response.json();
                const posts = data.posts || [];
                setNotices(posts.map((p: Record<string, string | number>) => ({
                    id: p.id,
                    title: p.title,
                    boardType: p.boardType || "free",
                    createdAt: p.createdAt,
                })));
            } catch {
                // 조회 실패 시 배너 미표시
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotices();
    }, []);

    const handleDismiss = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDismissedIds(prev => new Set(prev).add(id));
    };

    const handleClick = (notice: Notice) => {
        if (onSelectPost) {
            onSelectPost(notice.id);
        } else {
            // 커뮤니티 탭으로 이동
            setSelectedTab("community", (notice.boardType || "free") as CommunitySubcategory);
        }
    };

    const visibleNotices = notices.filter(n => !dismissedIds.has(n.id));

    if (isLoading || visibleNotices.length === 0) return null;

    return (
        <div className="space-y-2 px-4 sm:px-6 max-w-4xl mx-auto">
            {visibleNotices.map((notice) => (
                <div
                    key={notice.id}
                    onClick={() => handleClick(notice)}
                    className="flex items-center gap-3 px-4 py-3 bg-red-50/80 dark:bg-red-900/20 border border-red-200/70 dark:border-red-700/50 rounded-xl cursor-pointer hover:bg-red-100/80 dark:hover:bg-red-900/30 transition-colors group"
                >
                    <Megaphone className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-300 flex-1 truncate">
                        [공지] {notice.title}
                    </span>
                    <ChevronRight className="w-4 h-4 text-red-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button
                        onClick={(e) => handleDismiss(notice.id, e)}
                        className="p-1 hover:bg-red-200/50 dark:hover:bg-red-800/50 rounded-full flex-shrink-0"
                        aria-label="공지 닫기"
                    >
                        <X className="w-3.5 h-3.5 text-red-400" />
                    </button>
                </div>
            ))}
        </div>
    );
}
