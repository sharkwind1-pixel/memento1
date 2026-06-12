/**
 * NeighborNewsSection — 광장(홈) "이웃 새소식" (싸이월드 일촌 새글 엔진)
 *
 * 내가 이웃 맺은 유저들의 최근 커뮤니티 글을 가로 카드로 노출.
 * 이웃을 맺으면 광장에 그 보람(이웃 소식)이 보여야 팔로우→재방문 루프가 돈다.
 * 비로그인/이웃 0명/새글 0건이면 섹션 자체를 렌더하지 않음 (광장 소음 금지).
 */

"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Waves, Heart, ChevronRight } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import type { User } from "@supabase/supabase-js";

interface FeedItem {
    postId: string;
    userId: string;
    nickname: string;
    avatarUrl: string | null;
    title: string;
    badge: string | null;
    boardType: string;
    createdAt: string;
    likes: number;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "방금";
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}일 전`;
    return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function NeighborNewsSection({ user, isMemorial, onOpenPost }: {
    user: User | null;
    isMemorial: boolean;
    onOpenPost?: (postId: string) => void;
}) {
    const [items, setItems] = useState<FeedItem[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!user) { setLoaded(true); return; }
        let cancelled = false;
        (async () => {
            try {
                const res = await authFetch(API.NEIGHBORS_FEED);
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled && Array.isArray(data.items)) setItems(data.items);
            } catch { /* 새소식 실패는 silent — 광장 본 피드는 영향 없음 */
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    if (!loaded || items.length === 0) return null;

    const accent = isMemorial ? "text-memorial-500" : "text-memento-500";
    const chipBg = isMemorial
        ? "bg-memorial-50 text-memorial-600 dark:bg-memorial-900/20 dark:text-memorial-300"
        : "bg-memento-50 text-memento-600 dark:bg-memento-900/20 dark:text-memento-300";

    return (
        <section className="px-4">
            <div className="flex items-center gap-2 mb-3">
                <Waves className={`w-5 h-5 ${accent}`} />
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">이웃 새소식</h2>
                <span className="text-xs text-gray-400">이웃들이 광장에 남긴 이야기</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide snap-x">
                {items.map((it) => (
                    <button
                        key={it.postId}
                        onClick={() => onOpenPost?.(it.postId)}
                        className="snap-start flex-shrink-0 w-60 text-left bg-white/85 dark:bg-gray-800/85 backdrop-blur-sm border border-gray-100 dark:border-gray-700 rounded-2xl p-3.5 shadow-sm hover:shadow transition active:scale-[0.99]"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            {it.avatarUrl ? (
                                <Image src={it.avatarUrl} alt={it.nickname} width={28} height={28} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                            ) : (
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${chipBg}`}>
                                    {it.nickname.slice(0, 1)}
                                </span>
                            )}
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{it.nickname}</span>
                            <span className="text-[11px] text-gray-400 flex-shrink-0 ml-auto">{timeAgo(it.createdAt)}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 line-clamp-2 leading-snug min-h-[2.5rem]">
                            {it.badge ? <span className={`inline-block mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold align-middle ${chipBg}`}>{it.badge}</span> : null}
                            {it.title}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-400">
                            <Heart className="w-3 h-3" />
                            {it.likes}
                            <ChevronRight className="w-3 h-3 ml-auto" />
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
}
