/**
 * ============================================================================
 * tabs/AdminReportsTab.tsx
 * ============================================================================
 * 관리자 신고 관리 탭
 *
 * 📌 주요 기능:
 * - 신고 목록 조회 및 검색
 * - 신고 상태 변경 (검토중, 처리완료, 반려)
 * - 신고된 콘텐츠 삭제
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
    Flag,
} from "lucide-react";
import {
    ReportRow,
    REPORT_REASON_LABELS,
    REPORT_TARGET_LABELS,
} from "../types";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { API } from "@/config/apiEndpoints";

// ============================================================================
// Props 타입 정의
// ============================================================================

interface AdminReportsTabProps {
    /** 신고 목록 */
    reports: ReportRow[];
    /** 새로고침 함수 */
    onRefresh: () => void;
    /** 현재 관리자 ID */
    userId: string;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AdminReportsTab({
    reports,
    onRefresh,
    userId,
}: AdminReportsTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [deleteContentConfirm, setDeleteContentConfirm] = useState<{ isOpen: boolean; report: ReportRow | null }>({ isOpen: false, report: null });

    // ========================================================================
    // 신고 상태 변경 (서버 API 경유, RLS 우회)
    // ========================================================================
    const updateStatus = async (
        reportId: string,
        status: ReportRow["status"],
        adminNotes?: string
    ) => {
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const res = await fetch(API.ADMIN_REPORTS, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ reportId, status, adminNotes }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "상태 업데이트 실패");

            toast.success("신고 상태가 업데이트되었습니다");
            onRefresh();
            window.dispatchEvent(new CustomEvent("adminDataUpdated"));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "상태 업데이트 중 오류가 발생했습니다");
        }
    };

    // ========================================================================
    // 신고된 콘텐츠 삭제
    // ========================================================================
    const deleteContent = (report: ReportRow) => {
        setDeleteContentConfirm({ isOpen: true, report });
    };

    const executeDeleteContent = async (report: ReportRow) => {
        try {
            if (report.target_type === "user") {
                toast.error("삭제할 수 없는 대상입니다");
                return;
            }

            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const res = await fetch(API.ADMIN_REPORTS, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    reportId: report.id,
                    targetType: report.target_type,
                    targetId: report.target_id,
                }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "콘텐츠 삭제 실패");

            toast.success("콘텐츠가 삭제되었습니다");
            onRefresh();
            window.dispatchEvent(new CustomEvent("adminDataUpdated"));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "콘텐츠 삭제 중 오류가 발생했습니다");
        }
    };

    // ========================================================================
    // 필터링
    // ========================================================================
    const filteredReports = reports.filter(
        (r) =>
            (searchQuery === "" ||
                r.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (r.description || "").toLowerCase().includes(searchQuery.toLowerCase())) &&
            (selectedStatus === null || r.status === selectedStatus)
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
                        placeholder="신고 사유 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs"
                    />
                </div>
                <Button variant="outline" onClick={onRefresh} className="h-8 px-2 text-xs">
                    <RefreshCw className="w-3.5 h-3.5" />
                </Button>
            </div>

            {/* 상태 필터 - 한 줄 5개 */}
            <div className="flex gap-1 select-none">
                <button
                    type="button"
                    className={`flex-1 inline-flex items-center justify-center rounded-md px-1 py-1 text-[10px] font-semibold transition-all ${
                        selectedStatus === null
                            ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => setSelectedStatus(null)}
                >
                    전체 {reports.length}
                </button>
                <button
                    type="button"
                    className={`flex-1 inline-flex items-center justify-center rounded-md px-1 py-1 text-[10px] font-semibold transition-all ${
                        selectedStatus === "pending"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300 opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => setSelectedStatus(selectedStatus === "pending" ? null : "pending")}
                >
                    대기 {reports.filter((r) => r.status === "pending").length}
                </button>
                <button
                    type="button"
                    className={`flex-1 inline-flex items-center justify-center rounded-md px-1 py-1 text-[10px] font-semibold transition-all ${
                        selectedStatus === "reviewing"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => setSelectedStatus(selectedStatus === "reviewing" ? null : "reviewing")}
                >
                    검토 {reports.filter((r) => r.status === "reviewing").length}
                </button>
                <button
                    type="button"
                    className={`flex-1 inline-flex items-center justify-center rounded-md px-1 py-1 text-[10px] font-semibold transition-all ${
                        selectedStatus === "resolved"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => setSelectedStatus(selectedStatus === "resolved" ? null : "resolved")}
                >
                    완료 {reports.filter((r) => r.status === "resolved").length}
                </button>
                <button
                    type="button"
                    className={`flex-1 inline-flex items-center justify-center rounded-md px-1 py-1 text-[10px] font-semibold transition-all ${
                        selectedStatus === "rejected"
                            ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => setSelectedStatus(selectedStatus === "rejected" ? null : "rejected")}
                >
                    반려 {reports.filter((r) => r.status === "rejected").length}
                </button>
            </div>

            {/* 신고 목록 */}
            <Card>
                <CardContent className="pt-4">
                    {filteredReports.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                            <Flag className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                            <p className="text-sm">신고 내역이 없습니다</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredReports.map((report) => (
                                <ReportCard
                                    key={report.id}
                                    report={report}
                                    onUpdateStatus={(status, notes) =>
                                        updateStatus(report.id, status, notes)
                                    }
                                    onDeleteContent={() => deleteContent(report)}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                isOpen={deleteContentConfirm.isOpen}
                onClose={() => setDeleteContentConfirm({ isOpen: false, report: null })}
                onConfirm={() => deleteContentConfirm.report && executeDeleteContent(deleteContentConfirm.report)}
                title="콘텐츠 삭제"
                message="신고된 콘텐츠를 삭제하시겠습니까?"
                confirmText="삭제"
                destructive
            />
        </div>
    );
}

// ============================================================================
// 신고 카드 컴포넌트
// ============================================================================

interface ReportCardProps {
    report: ReportRow;
    onUpdateStatus: (status: ReportRow["status"], notes?: string) => void;
    onDeleteContent: () => void;
}

function ReportCard({ report, onUpdateStatus, onDeleteContent }: ReportCardProps) {
    const getBgColor = () => {
        switch (report.status) {
            case "resolved":
                return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50";
            case "reviewing":
                return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50";
            case "rejected":
                return "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700";
            default:
                return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50";
        }
    };

    return (
        <div className={`p-3 rounded-xl border transition-colors ${getBgColor()}`}>
            {/* 뱃지 + 날짜 한 줄 */}
            <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {REPORT_TARGET_LABELS[report.target_type] || report.target_type}
                </Badge>
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[10px] px-1.5 py-0">
                    {REPORT_REASON_LABELS[report.reason] || report.reason}
                </Badge>
                {report.status === "pending" && (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300 text-[10px] px-1.5 py-0">대기</Badge>
                )}
                {report.status === "reviewing" && (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] px-1.5 py-0">검토중</Badge>
                )}
                {report.status === "resolved" && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px] px-1.5 py-0">완료</Badge>
                )}
                {report.status === "rejected" && (
                    <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-[10px] px-1.5 py-0">반려</Badge>
                )}
                <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0">
                    {new Date(report.created_at).toLocaleDateString("ko-KR")}
                </span>
            </div>

            {/* 설명 */}
            {report.description && (
                <p className="text-[11px] text-gray-600 dark:text-gray-300 mb-1 line-clamp-2">{report.description}</p>
            )}

            {/* 신고자 */}
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5 truncate">
                {report.reporter_email || "알 수 없음"} | {report.target_id.slice(0, 8)}...
            </p>

            {/* 관리자 메모 */}
            {report.admin_notes && (
                <div className="p-1.5 bg-white dark:bg-gray-900 rounded border dark:border-gray-700 mb-1.5">
                    <p className="text-[10px] text-gray-600 dark:text-gray-300 line-clamp-2">
                        <span className="font-medium">메모:</span> {report.admin_notes}
                    </p>
                </div>
            )}

            {/* 액션 버튼 - 네이티브 button */}
            <div className="flex gap-1 pt-1.5 border-t border-gray-200 dark:border-gray-700">
                {report.status === "pending" && (
                    <button
                        type="button"
                        onClick={() => onUpdateStatus("reviewing")}
                        className="h-7 px-2 rounded border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 text-[10px] font-medium transition-colors"
                    >
                        검토
                    </button>
                )}
                {(report.status === "pending" || report.status === "reviewing") && (
                    <>
                        <button
                            type="button"
                            onClick={onDeleteContent}
                            className="h-7 px-2 rounded bg-red-500 text-white text-[10px] font-medium transition-colors hover:bg-red-600"
                        >
                            삭제
                        </button>
                        <button
                            type="button"
                            onClick={() => onUpdateStatus("resolved", "검토 후 처리 완료")}
                            className="h-7 px-2 rounded bg-green-500 text-white text-[10px] font-medium transition-colors hover:bg-green-600"
                        >
                            완료
                        </button>
                        <button
                            type="button"
                            onClick={() => onUpdateStatus("rejected", "신고 사유 불충분")}
                            className="h-7 px-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 text-[10px] font-medium transition-colors"
                        >
                            반려
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
