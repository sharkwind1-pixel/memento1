/**
 * PaymentRefundCard
 *
 * 관리자 전용 결제 조회 + 강제 환불 카드.
 * AdminDashboardTab에 배치.
 *
 * 사용:
 * 1. imp_uid 혹은 merchant_uid 입력 → "조회" 클릭
 * 2. DB 상태 + 포트원 상태 비교 표시
 * 3. 불일치/stuck 상태면 경고 표시
 * 4. "강제 환불" 또는 "DB 동기화만" 버튼
 *
 * 보안: /api/admin/payment-refund가 관리자 이메일+is_admin 이중 체크
 */
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authFetch } from "@/lib/auth-fetch";

interface PortOnePayment {
    status: string;
    amount: number;
    cancel_amount: number;
    merchant_uid: string;
    imp_uid: string;
    pay_method: string;
    card_name?: string;
    paid_at: number;
    cancelled_at?: number;
    cancel_history?: Array<{ amount: number; cancelled_at: number; reason: string }>;
}

interface DbPayment {
    id: string;
    user_id: string;
    status: string;
    amount: number;
    merchant_uid: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

interface LookupResult {
    db_payment: DbPayment | null;
    portone_payment: PortOnePayment | null;
    profile: {
        id: string;
        nickname: string | null;
        is_premium: boolean;
        subscription_tier: string;
        subscription_phase: string;
        premium_expires_at: string | null;
    } | null;
    user_email: string | null;
    sync_ok: boolean | null;
}

export default function PaymentRefundCard() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [refunding, setRefunding] = useState(false);
    const [result, setResult] = useState<LookupResult | null>(null);
    const [customAmount, setCustomAmount] = useState("");

    const lookup = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const isImp = query.trim().startsWith("imp_");
            const param = isImp ? `imp_uid=${encodeURIComponent(query.trim())}` : `merchant_uid=${encodeURIComponent(query.trim())}`;
            const res = await authFetch(`/api/admin/payment-refund?${param}`);
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "조회 실패");
                return;
            }
            setResult(data);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "조회 실패");
        } finally {
            setLoading(false);
        }
    };

    const forceRefund = async (syncOnly: boolean) => {
        if (!result?.portone_payment?.imp_uid) return;
        const action = syncOnly ? "DB 동기화만" : "강제 환불";
        if (!confirm(`${action} 진행할까요?\nimp_uid: ${result.portone_payment.imp_uid}`)) return;

        setRefunding(true);
        try {
            const body: Record<string, unknown> = {
                imp_uid: result.portone_payment.imp_uid,
                reason: `관리자 수동 ${action}`,
                sync_only: syncOnly,
            };
            const amountNum = Number(customAmount);
            if (!syncOnly && amountNum > 0) body.amount = amountNum;

            const res = await authFetch("/api/admin/payment-refund", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "실패");
                return;
            }
            toast.success(`${action} 완료. 포트원 취소금액: ${(data.portone_cancel_amount ?? 0).toLocaleString()}원`);
            await lookup(); // 재조회
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "실패");
        } finally {
            setRefunding(false);
        }
    };

    return (
        <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    결제 강제 환불 / 상태 동기화
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex gap-2">
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="imp_uid 또는 merchant_uid"
                        className="text-sm"
                        onKeyDown={(e) => e.key === "Enter" && lookup()}
                    />
                    <Button onClick={lookup} disabled={loading || !query.trim()} size="sm">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                </div>

                {result && (
                    <div className="space-y-3">
                        {/* 싱크 상태 배지 */}
                        {result.sync_ok === false && (
                            <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded text-xs text-red-700 dark:text-red-300">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>
                                    <b>DB / 포트원 상태 불일치</b> — 강제 동기화 필요
                                </span>
                            </div>
                        )}
                        {result.sync_ok === true && (
                            <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded text-xs text-green-700 dark:text-green-300">
                                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                <span>DB / 포트원 상태 일치</span>
                            </div>
                        )}

                        {/* 포트원 */}
                        <div className="p-3 bg-memento-50 dark:bg-memento-900/20 rounded text-xs space-y-0.5">
                            <div className="font-semibold text-memento-700 dark:text-memento-300 mb-1">포트원 (실시간)</div>
                            {result.portone_payment ? (
                                <>
                                    <div>status: <b>{result.portone_payment.status}</b></div>
                                    <div>amount: {result.portone_payment.amount.toLocaleString()}원 / cancel: {result.portone_payment.cancel_amount.toLocaleString()}원</div>
                                    <div>merchant_uid: {result.portone_payment.merchant_uid}</div>
                                    <div>imp_uid: {result.portone_payment.imp_uid}</div>
                                    <div>카드: {result.portone_payment.card_name || "-"} ({result.portone_payment.pay_method})</div>
                                    <div>paid_at: {new Date(result.portone_payment.paid_at * 1000).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</div>
                                    {(result.portone_payment.cancel_history?.length ?? 0) > 0 && (
                                        <div className="mt-1 pt-1 border-t border-memento-200">
                                            cancel_history: {result.portone_payment.cancel_history!.length}건
                                            {result.portone_payment.cancel_history!.map((h, i) => (
                                                <div key={i} className="pl-2">• {h.amount.toLocaleString()}원 — {h.reason.slice(0, 40)}</div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-gray-500">포트원에 해당 결제 없음</div>
                            )}
                        </div>

                        {/* DB */}
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded text-xs space-y-0.5">
                            <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">메멘토 DB</div>
                            {result.db_payment ? (
                                <>
                                    <div>status: <b>{result.db_payment.status}</b></div>
                                    <div>amount: {result.db_payment.amount.toLocaleString()}원</div>
                                    <div>payment_id: {result.db_payment.id}</div>
                                    <div>created_at: {new Date(result.db_payment.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</div>
                                </>
                            ) : (
                                <div className="text-gray-500">DB에 해당 결제 없음</div>
                            )}
                        </div>

                        {/* 유저 */}
                        {result.profile && (
                            <div className="p-3 bg-memorial-50 dark:bg-memorial-900/20 rounded text-xs space-y-0.5">
                                <div className="font-semibold text-memorial-700 dark:text-memorial-300 mb-1">유저</div>
                                <div>이메일: {result.user_email || "-"}</div>
                                <div>닉네임: {result.profile.nickname || "-"}</div>
                                <div>is_premium: <b>{String(result.profile.is_premium)}</b> / tier: {result.profile.subscription_tier} / phase: {result.profile.subscription_phase}</div>
                                <div>premium_expires_at: {result.profile.premium_expires_at || "null"}</div>
                            </div>
                        )}

                        {/* 액션 */}
                        <div className="flex flex-col gap-2 pt-2 border-t">
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="부분 환불 금액 (비워두면 전액)"
                                    value={customAmount}
                                    onChange={(e) => setCustomAmount(e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => forceRefund(false)}
                                    disabled={refunding}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                                >
                                    {refunding ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                    강제 환불 + DB 동기화
                                </Button>
                                <Button
                                    onClick={() => forceRefund(true)}
                                    disabled={refunding}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                >
                                    DB만 동기화 (포트원 호출 X)
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
