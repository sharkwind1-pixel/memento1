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
    Eye,
    Trash2,
    CheckCircle,
    Clock,
} from "lucide-react";
import {
    ReportRow,
    REPORT_REASON_LABELS,
    REPORT_TARGET_LABELS,
    ReportTargetType,
} from "../types";

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

    // ========================================================================
    // 신고 상태 변경
    // ========================================================================
    const updateStatus = async (
        reportId: string,
        status: ReportRow["status"],
        adminNotes?: string
    ) => {
        try {
            const updateData: Record<string, unknown> = {
                status,
                resolved_by: userId,
                resolved_at: new Date().toISOString(),
            };
            if (adminNotes) {
                updateData.admin_notes = adminNotes;
            }

            const { error } = await supabase
                .from("reports")
                .update(updateData)
                .eq("id", reportId);

            if (error) throw error;
            toast.success("신고 상태가 업데이트되었습니다");
            onRefresh();
        } catch {
            toast.error("상태 업데이트 중 오류가 발생했습니다");
        }
    };

    // ========================================================================
    // 신고된 콘텐츠 삭제
    // ========================================================================
    const deleteContent = async (report: ReportRow) => {
        if (!confirm("신고된 콘텐츠를 삭제하시겠습니까?")) return;

        try {
            // 대상 유형에 따라 테이블 결정
            const tableMap: Record<ReportTargetType, string> = {
                post: "community_posts",
                comment: "comments",
                user: "", // 유저는 삭제하지 않음
                pet_memorial: "pet_memorials",
            };

            const tableName = tableMap[report.target_type];
            if (!tableName) {
                toast.error("삭제할 수 없는 대상입니다");
                return;
            }

            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq("id", report.target_id);

            if (error) throw error;

            // 신고 상태 업데이트
            await updateStatus(report.id, "resolved", "콘텐츠 삭제 처리");
            toast.success("콘텐츠가 삭제되었습니다");
        } catch {
            toast.error("콘텐츠 삭제 중 오류가 발생했습니다");
        }
    };

    // ========================================================================
    // 필터링
    // ========================================================================
    const filteredReports = reports.filter(
        (r) =>
            searchQuery === "" ||
            r.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.description || "").toLowerCase().includes(searchQuery.toLowerCase())
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
                        placeholder="신고 사유로 검색..."
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

            {/* 상태 범례 */}
            <div className="flex flex-wrap gap-2 text-sm">
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <Clock className="w-3 h-3 mr-1" />
                    대기중
                </Badge>
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <Eye className="w-3 h-3 mr-1" />
                    검토중
                </Badge>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    처리완료
                </Badge>
                <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">반려</Badge>
            </div>

            {/* 신고 목록 */}
            <Card>
                <CardContent className="pt-6">
                    {filteredReports.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <Flag className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                            <p>신고 내역이 없습니다</p>
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
    // 배경색 결정
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
        <div className={`p-4 rounded-xl border transition-colors ${getBgColor()}`}>
            {/* 상단: 대상 유형, 사유, 상태, 날짜 */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* 대상 유형 */}
                    <Badge variant="secondary" className="text-xs">
                        {REPORT_TARGET_LABELS[report.target_type] || report.target_type}
                    </Badge>

                    {/* 사유 */}
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        {REPORT_REASON_LABELS[report.reason] || report.reason}
                    </Badge>

                    {/* 상태 */}
                    {report.status === "pending" && (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            대기중
                        </Badge>
                    )}
                    {report.status === "reviewing" && (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            검토중
                        </Badge>
                    )}
                    {report.status === "resolved" && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            처리완료
                        </Badge>
                    )}
                    {report.status === "rejected" && (
                        <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs">반려</Badge>
                    )}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(report.created_at).toLocaleDateString("ko-KR")}
                </span>
            </div>

            {/* 설명 */}
            {report.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                    {report.description}
                </p>
            )}

            {/* 신고자 정보 */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                신고자: {report.reporter_email || "알 수 없음"} | 대상 ID:{" "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    {report.target_id.slice(0, 8)}...
                </code>
            </p>

            {/* 관리자 메모 */}
            {report.admin_notes && (
                <div className="p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 mb-3 text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-200">관리자 메모: </span>
                    <span className="text-gray-600 dark:text-gray-300">{report.admin_notes}</span>
                </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {report.status === "pending" && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateStatus("reviewing")}
                    >
                        <Eye className="w-3 h-3 mr-1" />
                        검토 시작
                    </Button>
                )}

                {(report.status === "pending" || report.status === "reviewing") && (
                    <>
                        <Button
                            size="sm"
                            className="bg-red-500 hover:bg-red-600"
                            onClick={onDeleteContent}
                        >
                            <Trash2 className="w-3 h-3 mr-1" />
                            콘텐츠 삭제
                        </Button>
                        <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600"
                            onClick={() => onUpdateStatus("resolved", "검토 후 처리 완료")}
                        >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            처리 완료
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdateStatus("rejected", "신고 사유 불충분")}
                        >
                            반려
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
