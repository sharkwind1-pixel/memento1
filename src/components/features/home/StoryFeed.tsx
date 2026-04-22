/**
 * StoryFeed.tsx
 * 홈 화면 상단 스토리 피드 (인스타그램 스타일)
 *
 * 구조:
 * - 가로 스크롤 아바타 목록
 * - 첫 번째: "+" 버튼 (내 스토리 추가)
 * - 클릭 시 StoryViewer 모달 (풀스크린)
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Camera } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import dynamic from "next/dynamic";

const StoryViewer = dynamic(() => import("./StoryViewer"), { ssr: false });
const StoryCreateModal = dynamic(() => import("./StoryCreateModal"), { ssr: false });

interface StoryUser {
    userId: string;
    nickname: string;
    avatar: string | null;
    stories: Array<{
        id: string;
        image_url: string | null;
        text_content: string | null;
        background_color: string;
        created_at: string;
    }>;
}

export default function StoryFeed() {
    const { user } = useAuth();
    const [storyFeed, setStoryFeed] = useState<StoryUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<StoryUser | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const loadStories = useCallback(async () => {
        try {
            const res = await fetch(`${API.STORIES}`);
            if (!res.ok) return;
            const data = await res.json();
            setStoryFeed(data.feed || []);
        } catch {
            // 스토리 로드 실패 시 빈 피드
        }
    }, []);

    useEffect(() => {
        loadStories();
    }, [loadStories]);

    const handleCreateSuccess = () => {
        setShowCreate(false);
        loadStories(); // 새 스토리 후 피드 갱신
    };

    if (!user && storyFeed.length === 0) return null;

    return (
        <>
            <section className="px-4 -mt-2 mb-2">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {/* 내 스토리 추가 버튼 */}
                    {user && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="flex-shrink-0 flex flex-col items-center gap-1"
                        >
                            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-memento-400 flex items-center justify-center">
                                <Plus className="w-5 h-5 text-memento-500" />
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">내 스토리</span>
                        </button>
                    )}

                    {/* 유저별 스토리 아바타 */}
                    {storyFeed.map((su) => (
                        <button
                            key={su.userId}
                            onClick={() => setSelectedUser(su)}
                            className="flex-shrink-0 flex flex-col items-center gap-1"
                        >
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-memento-500 to-violet-500 p-0.5">
                                <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 p-0.5">
                                    {su.avatar ? (
                                        <img
                                            src={su.avatar}
                                            alt={su.nickname}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-memento-200 dark:bg-memento-900/50 flex items-center justify-center">
                                            <Camera className="w-4 h-4 text-memento-500" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-600 dark:text-gray-400 max-w-[56px] truncate">
                                {su.nickname}
                            </span>
                        </button>
                    ))}

                    {storyFeed.length === 0 && user && (
                        <div className="flex items-center gap-2 text-xs text-gray-400 ml-2">
                            첫 번째 스토리를 올려보세요
                        </div>
                    )}
                </div>
            </section>

            {/* 스토리 뷰어 모달 */}
            {selectedUser && (
                <StoryViewer
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}

            {/* 스토리 작성 모달 */}
            {showCreate && (
                <StoryCreateModal
                    onClose={() => setShowCreate(false)}
                    onSuccess={handleCreateSuccess}
                />
            )}
        </>
    );
}
