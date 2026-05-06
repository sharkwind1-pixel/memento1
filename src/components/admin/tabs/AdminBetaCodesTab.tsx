/**
 * 관리자 - 베타 코드 발급/관리 탭
 *
 * - 단일/대량 발급 (BETA-XXXXXX)
 * - 사용 횟수, 만료일, 메모 관리
 * - 클립보드 복사 / 비활성화
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Plus, RefreshCw, Ticket, Megaphone, Square, CheckSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface BetaCode {
    code: string;
    max_uses: number;
    used_count: number;
    points_reward: number;
    discount_months: number;
    discount_percent: number;
    expires_at: string | null;
    note: string | null;
    created_at: string;
}

interface BetaPromotion {
    enabled: boolean;
    start_at: string | null;
    end_at: string | null;
    points_reward: number;
    discount_months: number;
    discount_percent: number;
}

export default function AdminBetaCodesTab() {
    const [codes, setCodes] = useState<BetaCode[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [bulk, setBulk] = useState(1);
    const [maxUses, setMaxUses] = useState(1);
    const [points, setPoints] = useState(3000);
    const [months, setMonths] = useState(3);
    const [note, setNote] = useState("");
    const [customCode, setCustomCode] = useState("");
    const [promo, setPromo] = useState<BetaPromotion | null>(null);
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoDays, setPromoDays] = useState(30);

    const loadPromo = useCallback(async () => {
        const { data } = await supabase
            .from("beta_promotion")
            .select("enabled, start_at, end_at, points_reward, discount_months, discount_percent")
            .eq("id", 1)
            .maybeSingle();
        if (data) setPromo(data as BetaPromotion);
    }, []);

    useEffect(() => { loadPromo(); }, [loadPromo]);

    async function handleStartPromo() {
        if (!confirm(`${promoDays}일간 베타 프로모션을 시작합니다.\n신규 가입자 모두 자동으로 ${promo?.points_reward ?? 3000}P + 3개월 50% 할인 적용.\n진행할까요?`)) return;
        setPromoLoading(true);
        try {
            const { data, error } = await supabase.rpc("start_beta_promotion", { _days: promoDays });
            const result = data as { success?: boolean; error?: string } | null;
            if (error || !result?.success) {
                alert(result?.error ?? error?.message ?? "활성화 실패");
                return;
            }
            await loadPromo();
            alert(`베타 프로모션 시작 (${promoDays}일)`);
        } finally {
            setPromoLoading(false);
        }
    }

    async function handleStopPromo() {
        if (!confirm("베타 프로모션을 즉시 종료할까요? (이미 가입한 사용자의 혜택은 유지됨)")) return;
        setPromoLoading(true);
        try {
            const { data, error } = await supabase.rpc("stop_beta_promotion");
            const result = data as { success?: boolean; error?: string } | null;
            if (error || !result?.success) {
                alert(result?.error ?? error?.message ?? "종료 실패");
                return;
            }
            await loadPromo();
            alert("베타 프로모션 종료됨");
        } finally {
            setPromoLoading(false);
        }
    }

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch("/api/admin/beta-codes", {
                cache: "no-store",
                headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
            });
            const json = await res.json();
            if (res.ok) setCodes(json.codes ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    async function handleCreate() {
        setCreating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch("/api/admin/beta-codes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
                body: JSON.stringify({
                    code: bulk === 1 && customCode ? customCode : undefined,
                    max_uses: maxUses,
                    points_reward: points,
                    discount_months: months,
                    note: note || undefined,
                    bulk,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                alert(json.error ?? "발급 실패");
                return;
            }
            setCustomCode("");
            setNote("");
            await refresh();
            const created = json.created as BetaCode[];
            const codesText = created.map((c) => c.code).join("\n");
            if (created.length > 1) {
                navigator.clipboard.writeText(codesText).catch(() => {});
                alert(`${created.length}개 발급 완료. 클립보드에 복사되었습니다.`);
            } else {
                alert(`발급 완료: ${created[0]?.code}`);
            }
        } finally {
            setCreating(false);
        }
    }

    function copyCode(code: string) {
        navigator.clipboard.writeText(code).catch(() => {});
    }

    const promoActive = !!(promo?.enabled && promo.start_at && promo.end_at &&
        new Date(promo.end_at) > new Date());
    const promoEndDateText = promo?.end_at
        ? new Date(promo.end_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : null;

    return (
        <div className="space-y-6">
            {/* 1) 자동 프로모션 토글 (정식 출시 후 1번만 활성화) */}
            <div className={`rounded-xl p-5 border ${promoActive
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                : "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700"
            }`}>
                <div className="flex items-start gap-3 mb-3">
                    <Megaphone size={22} className={promoActive ? "text-emerald-500" : "text-gray-400"} />
                    <div className="flex-1">
                        <h3 className="font-bold text-sm">베타 프로모션 자동 적용</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            활성화 기간 동안 가입한 모든 신규 사용자에게 3,000P + 3개월 50% 할인 자동 부여
                        </p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${promoActive
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}>
                        {promoActive ? "활성" : "비활성"}
                    </span>
                </div>

                {promoActive ? (
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="text-sm">
                            <CheckSquare size={14} className="inline mr-1 text-emerald-500" />
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                {promoEndDateText}까지
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 ml-2">
                                자동 적용 진행 중
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleStopPromo}
                            disabled={promoLoading}
                            className="text-xs bg-red-500 hover:bg-red-600 text-white rounded px-3 py-1.5"
                        >
                            즉시 종료
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                        <Square size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">기간:</span>
                        <input
                            type="number"
                            min={1}
                            max={365}
                            value={promoDays}
                            onChange={(e) => setPromoDays(Math.max(1, Math.min(365, Number(e.target.value) || 30)))}
                            className="w-16 rounded border px-2 py-1 text-sm"
                        />
                        <span className="text-xs text-gray-500">일</span>
                        <button
                            type="button"
                            onClick={handleStartPromo}
                            disabled={promoLoading}
                            className="ml-auto bg-memento-500 hover:bg-memento-600 text-white rounded px-3 py-1.5 text-xs font-semibold"
                        >
                            {promoLoading ? "처리 중..." : "프로모션 시작"}
                        </button>
                    </div>
                )}
            </div>

            {/* 2) 개별 코드 관리 (기존 시스템 유지 — 별도 프로모션/특별 케이스용) */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Ticket size={18} className="text-memento-500" />
                    베타 코드 관리 <span className="text-xs font-normal text-gray-400">(개별 발급)</span>
                </h2>
                <button
                    type="button"
                    onClick={refresh}
                    disabled={loading}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    새로고침
                </button>
            </div>

            <div className="bg-memento-50 dark:bg-gray-900 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-sm">새 코드 발급</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <label className="flex flex-col gap-1 text-xs">
                        대량 발급 수
                        <input
                            type="number"
                            min={1}
                            max={100}
                            value={bulk}
                            onChange={(e) => setBulk(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                            className="rounded-lg border px-2 py-1 text-sm"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                        코드당 사용 횟수
                        <input
                            type="number"
                            min={1}
                            max={10000}
                            value={maxUses}
                            onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value) || 1))}
                            className="rounded-lg border px-2 py-1 text-sm"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                        지급 포인트
                        <input
                            type="number"
                            min={0}
                            step={100}
                            value={points}
                            onChange={(e) => setPoints(Math.max(0, Number(e.target.value) || 0))}
                            className="rounded-lg border px-2 py-1 text-sm"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                        할인 개월
                        <input
                            type="number"
                            min={0}
                            max={12}
                            value={months}
                            onChange={(e) => setMonths(Math.max(0, Math.min(12, Number(e.target.value) || 0)))}
                            className="rounded-lg border px-2 py-1 text-sm"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                        커스텀 코드 (1개일 때)
                        <input
                            type="text"
                            placeholder="BETA-XXXXXX"
                            value={customCode}
                            onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                            disabled={bulk !== 1}
                            className="rounded-lg border px-2 py-1 text-sm"
                        />
                    </label>
                </div>
                <input
                    type="text"
                    placeholder="메모 (예: 인스타 인플루언서 김민지)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                />
                <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex items-center gap-1 bg-memento-500 hover:bg-memento-600 text-white rounded-lg px-4 py-2 text-sm font-semibold"
                >
                    <Plus size={14} />
                    {creating ? "발급 중..." : `${bulk}개 발급`}
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b text-left text-xs text-gray-500">
                            <th className="py-2 px-2">코드</th>
                            <th className="py-2 px-2">사용</th>
                            <th className="py-2 px-2">포인트</th>
                            <th className="py-2 px-2">할인</th>
                            <th className="py-2 px-2">메모</th>
                            <th className="py-2 px-2">생성일</th>
                            <th className="py-2 px-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {codes.length === 0 && !loading && (
                            <tr><td colSpan={7} className="py-6 text-center text-gray-400">발급된 코드가 없습니다.</td></tr>
                        )}
                        {codes.map((c) => (
                            <tr key={c.code} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                                <td className="py-2 px-2 font-mono font-bold">{c.code}</td>
                                <td className="py-2 px-2">{c.used_count} / {c.max_uses}</td>
                                <td className="py-2 px-2">{c.points_reward.toLocaleString()}P</td>
                                <td className="py-2 px-2">{c.discount_months}개월 {c.discount_percent}%</td>
                                <td className="py-2 px-2 text-gray-500">{c.note ?? "-"}</td>
                                <td className="py-2 px-2 text-gray-400">{new Date(c.created_at).toLocaleDateString("ko-KR")}</td>
                                <td className="py-2 px-2">
                                    <button
                                        type="button"
                                        onClick={() => copyCode(c.code)}
                                        className="text-memento-500 hover:text-memento-600"
                                        title="복사"
                                    >
                                        <Copy size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
