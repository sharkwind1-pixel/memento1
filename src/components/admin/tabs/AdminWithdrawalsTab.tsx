/**
 * ============================================================================
 * tabs/AdminWithdrawalsTab.tsx
 * ============================================================================
 * 관리자 탈퇴자 관리 탭
 *
 * 📌 주요 기능:
 * - 탈퇴 처리된 유저 목록 조회
 * - 재가입 허용 처리
 * - 탈퇴 기록 삭제
 * ============================================================================
 */

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    Search,
    RefreshCw,
    Ban,
} from "lucide-react";
import { WithdrawnUser } from "../types";

// ============================================================================
// Props 타입 정의
// ============================================================================

interface AdminWithdrawalsTabProps {
    /** 탈퇴자 목록 */
    withdrawals: WithdrawnUser[];
    /** 새로고침 함수 */
    onRefresh: () => void;
    /** 현재 관리자 ID */
    userId: string;
}

// ============================================================================
// 탈퇴 유형 설정
// ============================================================================

const TYPE_CONFIG = {
    abuse_concern: {
        label: "악용 우려",
        color: "bg-amber-50 dark:bg-gray-700/20 border-amber-200 dark:border-gray-700/50",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    },
    banned: {
        label: "영구 차단",
        color: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50",
        badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    },
    error_resolution: {
        label: "오류 해결",
        color: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50",
        badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    },
} as const;

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AdminWithdrawalsTab({
    withdrawals,
    onRefresh,
    userId,
}: AdminWithdrawalsTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState<string | null>(null);

    // ========================================================================
    // 재가입 허용
    // ========================================================================
    const allowRejoin = async (w: WithdrawnUser) => {
        // 영구 차단 계정은 이중 확인
        if (w.withdrawal_type === "banned") {
            const reason = prompt(
                `[영구 차단 해제]\n${w.email}은 영구 차단된 계정입니다.\n정말 차단을 해제하시겠습니까?\n\n해제 사유를 입력하세요:`
            );
            if (!reason) return; // 취소 또는 빈 사유

            try {
                const { error } = await supabase
                    .from("withdrawn_users")
                    .update({
                        // banned → abuse_concern으로 변경 (error_resolution이 아님)
                        // 30일 재가입 대기 기간 부여
                        withdrawal_type: "abuse_concern",
                        rejoin_allowed_at: new Date().toISOString(),
                        reason: `[차단 해제] ${reason} (기존 사유: ${w.reason || "없음"})`,
                    })
                    .eq("id", w.id);

                if (error) throw error;
                toast.success("영구 차단이 해제되었습니다 (재가입 허용)");
                onRefresh();
            } catch {
                toast.error("차단 해제 처리 중 오류가 발생했습니다");
            }
            return;
        }

        // 악용 우려: 일반 재가입 허용
        if (!confirm(`${w.email}의 재가입을 허용하시겠습니까?`)) return;

        try {
            const { error } = await supabase
                .from("withdrawn_users")
                .update({
                    withdrawal_type: "error_resolution",
                    rejoin_allowed_at: new Date().toISOString(),
                })
                .eq("id", w.id);

            if (error) throw error;
            toast.success("재가입이 허용되었습니다");
            onRefresh();
        } catch {
            toast.error("재가입 허용 처리 중 오류가 발생했습니다");
        }
    };

    // ========================================================================
    // 탈퇴 기록 삭제
    // ========================================================================
    const deleteRecord = async (w: WithdrawnUser) => {
        if (!confirm(`${w.email}의 탈퇴 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

        try {
            const { error } = await supabase
                .from("withdrawn_users")
                .delete()
                .eq("id", w.id);

            if (error) throw error;
            toast.success("탈퇴 기록이 삭제되었습니다");
            onRefresh();
        } catch {
            toast.error("탈퇴 기록 삭제 중 오류가 발생했습니다");
        }
    };

    // ========================================================================
    // 필터링
    // ========================================================================
    const filteredWithdrawals = withdrawals.filter(
        (w) =>
            (searchQuery === "" ||
                w.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (w.nickname || "").toLowerCase().includes(searchQuery.toLowerCase())) &&
            (selectedType === null || w.withdrawal_type === selectedType)
    );

    // ========================================================================
    // 렌더링
    // ========================================================================
    return (
        <div className="space-y-4">
            {/* 검색 & 새로고침 */}
            <div className="flex gap-1.5">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input
                        placeholder="이메일/닉네임 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs"
                    />
                </div>
                <Button variant="outline" onClick={onRefresh} className="h-8 px-2 text-xs">
                    <RefreshCw className="w-3.5 h-3.5" />
                </Button>
            </div>

            {/* 유형 필터 - 한 줄 4개 */}
            <div className="flex gap-1 select-none">
                <button
                    type="button"
                    className={`flex-1 inline-flex items-center justify-center rounded-md px-1.5 py-1 text-[10px] font-semibold transition-all ${
                        selectedType === null
                            ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => setSelectedType(null)}
                >
                    전체 {withdrawals.length}
                </button>
                <button
                    type="button"
                    className={`flex-1 inline-flex items-center justify-center rounded-md px-1.5 py-1 text-[10px] font-semibold transition-all ${
                        selectedType === "abuse_concern"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300 opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => setSelectedType(selectedType === "abuse_concern" ? null : "abuse_concern")}
                >
                    악용 {withdrawals.filter((w) => w.withdrawal_type === "abuse_concern").length}
                </button>
                <button
                    type="button"
                    className={`flex-1 inline-flex items-center justify-center rounded-md px-1.5 py-1 text-[10px] font-semibold transition-all ${
                        selectedType === "banned"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => setSelectedType(selectedType === "banned" ? null : "banned")}
                >
                    차단 {withdrawals.filter((w) => w.withdrawal_type === "banned").length}
                </button>
                <button
                    type="button"
                    className={`flex-1 inline-flex items-center justify-center rounded-md px-1.5 py-1 text-[10px] font-semibold transition-all ${
                        selectedType === "error_resolution"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => setSelectedType(selectedType === "error_resolution" ? null : "error_resolution")}
                >
                    해결 {withdrawals.filter((w) => w.withdrawal_type === "error_resolution").length}
                </button>
            </div>

            {/* 탈퇴자 목록 */}
            <Card>
                <CardContent className="pt-4">
                    {filteredWithdrawals.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                            <Ban className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                            <p className="text-sm">탈퇴 처리된 유저가 없습니다</p>
                            <p className="text-[10px] mt-1 text-gray-400 dark:text-gray-500">
                                유저 관리 탭에서 탈퇴 처리 가능
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredWithdrawals.map((w) => (
                                <WithdrawnUserCard
                                    key={w.id}
                                    user={w}
                                    onAllowRejoin={() => allowRejoin(w)}
                                    onDelete={() => deleteRecord(w)}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================================================
// 탈퇴 유저 카드 컴포넌트
// ============================================================================

interface WithdrawnUserCardProps {
    user: WithdrawnUser;
    onAllowRejoin: () => void;
    onDelete: () => void;
}

function WithdrawnUserCard({ user, onAllowRejoin, onDelete }: WithdrawnUserCardProps) {
    const config = TYPE_CONFIG[user.withdrawal_type];
    const canRejoin =
        user.withdrawal_type === "error_resolution" ||
        (user.withdrawal_type === "abuse_concern" &&
            user.rejoin_allowed_at &&
            new Date(user.rejoin_allowed_at) <= new Date());

    return (
        <div className={`p-3 rounded-xl border ${config.color}`}>
            {/* 이메일 */}
            <p className="font-medium text-xs truncate">{user.email}</p>

            {/* 닉네임 + 유형 뱃지 + 날짜 */}
            <div className="flex items-center gap-1 mt-1 flex-wrap">
                {user.nickname && (
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {user.nickname}
                    </span>
                )}
                <Badge className={`${config.badge} text-[9px] px-1 py-0 leading-tight`}>
                    {config.label}
                </Badge>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0">
                    {new Date(user.withdrawn_at).toLocaleDateString("ko-KR")}
                </span>
            </div>

            {/* 사유 */}
            {user.reason && (
                <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1.5 p-1.5 bg-white dark:bg-gray-900 rounded border dark:border-gray-700 line-clamp-2">
                    {user.reason}
                </p>
            )}

            {/* 재가입 가능일 */}
            {user.withdrawal_type === "abuse_concern" && user.rejoin_allowed_at && (
                <p className="text-[10px] text-amber-600 mt-1">
                    재가입: {new Date(user.rejoin_allowed_at).toLocaleDateString("ko-KR")}
                    {canRejoin && " (가능)"}
                </p>
            )}

            {/* IP */}
            {user.ip_address && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    IP: <code className="bg-gray-100 dark:bg-gray-800 px-0.5 rounded text-[10px]">{user.ip_address}</code>
                </p>
            )}

            {/* 액션 버튼 - 네이티브 button */}
            <div className="flex gap-1 pt-1.5 mt-2 border-t border-gray-200 dark:border-gray-700">
                {user.withdrawal_type !== "error_resolution" && (
                    <button
                        type="button"
                        onClick={onAllowRejoin}
                        className={`h-7 px-2 rounded border text-[10px] font-medium transition-colors bg-white dark:bg-gray-800 ${
                            user.withdrawal_type === "banned"
                                ? "border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400"
                                : "border-green-300 dark:border-green-700 text-green-600 dark:text-green-400"
                        }`}
                    >
                        {user.withdrawal_type === "banned" ? "차단 해제" : "재가입 허용"}
                    </button>
                )}
                <button
                    type="button"
                    onClick={onDelete}
                    className="h-7 px-2 rounded border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 text-[10px] font-medium transition-colors"
                >
                    기록 삭제
                </button>
            </div>
        </div>
    );
}
