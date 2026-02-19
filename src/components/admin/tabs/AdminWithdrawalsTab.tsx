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
    Trash2,
    CheckCircle,
    Clock,
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
        color: "bg-amber-50 border-amber-200",
        badge: "bg-amber-100 text-amber-700",
    },
    banned: {
        label: "영구 차단",
        color: "bg-red-50 border-red-200",
        badge: "bg-red-100 text-red-700",
    },
    error_resolution: {
        label: "오류 해결",
        color: "bg-green-50 border-green-200",
        badge: "bg-green-100 text-green-700",
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

    // ========================================================================
    // 재가입 허용
    // ========================================================================
    const allowRejoin = async (w: WithdrawnUser) => {
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
            searchQuery === "" ||
            w.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (w.nickname || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ========================================================================
    // 렌더링
    // ========================================================================
    return (
        <div className="space-y-4">
            {/* 검색 & 새로고침 */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="이메일로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button variant="outline" onClick={onRefresh}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    새로고침
                </Button>
            </div>

            {/* 유형 범례 */}
            <div className="flex flex-wrap gap-2 text-sm">
                <Badge className="bg-amber-100 text-amber-700">
                    <Clock className="w-3 h-3 mr-1" />
                    악용 우려 (30일 대기)
                </Badge>
                <Badge className="bg-red-100 text-red-700">
                    <Ban className="w-3 h-3 mr-1" />
                    영구 차단
                </Badge>
                <Badge className="bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    오류 해결 (즉시 가능)
                </Badge>
            </div>

            {/* 탈퇴자 목록 */}
            <Card>
                <CardContent className="pt-6">
                    {filteredWithdrawals.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Ban className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>탈퇴 처리된 유저가 없습니다</p>
                            <p className="text-xs mt-2 text-gray-400">
                                * 유저 관리 탭에서 탈퇴 처리할 수 있습니다
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
        <div className={`p-4 rounded-xl border ${config.color}`}>
            {/* 상단: 이메일, 유형, 날짜 */}
            <div className="flex items-start justify-between mb-2">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{user.email}</span>
                        <Badge className={config.badge}>{config.label}</Badge>
                    </div>
                    {user.nickname && (
                        <p className="text-sm text-gray-500">닉네임: {user.nickname}</p>
                    )}
                </div>
                <span className="text-xs text-gray-500">
                    {new Date(user.withdrawn_at).toLocaleDateString("ko-KR")}
                </span>
            </div>

            {/* 사유 */}
            {user.reason && (
                <p className="text-sm text-gray-600 mb-2 p-2 bg-white rounded border">
                    사유: {user.reason}
                </p>
            )}

            {/* 재가입 가능일 (악용 우려인 경우) */}
            {user.withdrawal_type === "abuse_concern" && user.rejoin_allowed_at && (
                <p className="text-xs text-amber-600 mb-2">
                    재가입 가능일: {new Date(user.rejoin_allowed_at).toLocaleDateString("ko-KR")}
                    {canRejoin && " (재가입 가능)"}
                </p>
            )}

            {/* IP 주소 */}
            {user.ip_address && (
                <p className="text-xs text-gray-500 mb-2">
                    IP: <code className="bg-gray-100 px-1 rounded">{user.ip_address}</code>
                </p>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-2 pt-2 border-t border-gray-200">
                {user.withdrawal_type !== "error_resolution" && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        onClick={onAllowRejoin}
                    >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        재가입 허용
                    </Button>
                )}
                <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={onDelete}
                >
                    <Trash2 className="w-3 h-3 mr-1" />
                    기록 삭제
                </Button>
            </div>
        </div>
    );
}
