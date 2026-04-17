/**
 * Open100Banner.tsx
 * 홈 상단 오픈 100 이벤트 진행률 배너.
 *
 * 노출 정책: **관리자 전용**. 일반 유저에게 "선착순 N명 남음" 카운트를
 * 노출하면 메멘토애니 톤(희노애락을 함께하는 곳)과 충돌하고 역효과가
 * 커서 감춘다. 미션 완주 보상은 조용히 지급되고, 관리자만 홈에서
 * 진행률을 한눈에 보기 위한 내부 도구.
 */
"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { API } from "@/config/apiEndpoints";
import { useAuth } from "@/contexts/AuthContext";

interface Open100Status {
    awarded: number;
    remaining: number;
    isClosed: boolean;
    limit: number;
}

export default function Open100Banner() {
    const { isAdminUser } = useAuth();
    const [status, setStatus] = useState<Open100Status | null>(null);

    useEffect(() => {
        if (!isAdminUser) return;
        let cancelled = false;
        const load = async () => {
            try {
                const res = await fetch(API.EVENT_OPEN100, { cache: "no-store" });
                if (!res.ok) return;
                const data = (await res.json()) as Open100Status;
                if (!cancelled) setStatus(data);
            } catch {
                /* 실패해도 앱 동작 영향 없음 */
            }
        };
        load();
        // 누군가 이벤트 달성하면 즉시 리프레시
        const onAwarded = () => load();
        window.addEventListener("open100-awarded", onAwarded);
        return () => {
            cancelled = true;
            window.removeEventListener("open100-awarded", onAwarded);
        };
    }, [isAdminUser]);

    if (!isAdminUser) return null;
    if (!status) return null;

    const progressPercent = Math.round((status.awarded / status.limit) * 100);

    if (status.isClosed) {
        return (
            <div className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-memento-200 bg-memento-50/60 px-4 py-2 text-xs text-memento-700 dark:border-memento-800/40 dark:bg-memento-900/20 dark:text-memento-300">
                <span className="rounded bg-memento-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">ADMIN</span>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Open 100 이벤트 종료 — 100명 전원 달성</span>
            </div>
        );
    }

    return (
        <div className="mb-3 overflow-hidden rounded-2xl border border-memento-200 bg-gradient-to-r from-memento-50 via-white to-blue-50 p-4 shadow-sm dark:border-memento-800/40 dark:from-memento-900/30 dark:via-gray-900 dark:to-blue-900/20">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-memento-100 text-memento-600 dark:bg-memento-900/40 dark:text-memento-300">
                    <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="rounded bg-memento-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">ADMIN</span>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Open 100 진행률
                        </p>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                        온보딩 미션 완주 시 <b className="text-memento-600 dark:text-memento-400">1,000P</b> 자동 지급 (관리자 전용 모니터링).
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-memento-100 dark:bg-memento-900/50">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-memento-400 to-memento-600 transition-all"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="whitespace-nowrap text-xs font-medium text-memento-700 dark:text-memento-300">
                            {status.awarded}/{status.limit}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
