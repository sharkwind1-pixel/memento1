/**
 * Open100AdminSection.tsx
 * 관리자 대시보드 하단에 붙는 Open 100 이벤트 진행 현황 섹션.
 * - 진행률(N/100) + 남은 자리
 * - 최근 지급자 테이블 (이메일/닉네임/지급시각)
 */
"use client";

import { useEffect, useState } from "react";
import { Sparkles, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth-fetch";

interface AwardedUser {
    id: string;
    email: string | null;
    nickname: string | null;
    open100_awarded_at: string;
    points: number;
}

interface Open100AdminData {
    awarded: number;
    remaining: number;
    isClosed: boolean;
    limit: number;
    users: AwardedUser[];
}

export default function Open100AdminSection() {
    const [data, setData] = useState<Open100AdminData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await authFetch("/api/admin/open100", { cache: "no-store" });
                if (!res.ok) return;
                const json = (await res.json()) as Open100AdminData;
                if (!cancelled) setData(json);
            } catch {
                /* 무시 */
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) return null;
    if (!data) return null;

    const progressPercent = Math.round((data.awarded / data.limit) * 100);

    return (
        <Card className="mt-4">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-memento-500" />
                    Open 100 오픈 이벤트
                    {data.isClosed && (
                        <Badge variant="secondary" className="ml-auto">
                            종료
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* 진행률 */}
                <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400">
                            지급 {data.awarded} / {data.limit}명
                        </span>
                        <span className="font-medium text-memento-600 dark:text-memento-400">
                            남은 자리 {data.remaining}명
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-memento-400 to-memento-600 transition-all"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* 지급자 리스트 */}
                {data.users.length > 0 ? (
                    <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">#</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">이메일</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">닉네임</th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">지급시각</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.users.map((u, idx) => (
                                    <tr
                                        key={u.id}
                                        className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                    >
                                        <td className="px-3 py-1.5 text-gray-500">{data.users.length - idx}</td>
                                        <td className="px-3 py-1.5 text-gray-900 dark:text-gray-100">{u.email ?? "-"}</td>
                                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{u.nickname ?? "-"}</td>
                                        <td className="px-3 py-1.5 text-gray-500">
                                            {new Date(u.open100_awarded_at).toLocaleString("ko-KR", {
                                                timeZone: "Asia/Seoul",
                                                year: "numeric",
                                                month: "2-digit",
                                                day: "2-digit",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 py-6 text-xs text-gray-500">
                        <Users className="h-4 w-4" />
                        아직 달성자가 없습니다.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
