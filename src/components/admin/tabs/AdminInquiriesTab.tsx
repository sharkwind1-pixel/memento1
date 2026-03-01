/**
 * ============================================================================
 * tabs/AdminInquiriesTab.tsx
 * ============================================================================
 * 관리자 문의 관리 탭
 *
 * 📌 주요 기능:
 * - 문의 목록 조회 및 검색
 * - 문의 상태 변경 (처리중, 완료, 종료)
 * - 문의 답변 작성
 * ============================================================================
 */

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    Search,
    RefreshCw,
    HelpCircle,
    AlertTriangle,
    Lightbulb,
    CheckCircle,
    Clock,
    Send,
} from "lucide-react";
import { InquiryRow } from "../types";

// ============================================================================
// Props 타입 정의
// ============================================================================

interface AdminInquiriesTabProps {
    /** 문의 목록 */
    inquiries: InquiryRow[];
    /** 새로고침 함수 */
    onRefresh: () => void;
}

// ============================================================================
// 카테고리 설정
// ============================================================================

const CATEGORY_CONFIG = {
    question: {
        label: "질문",
        icon: HelpCircle,
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    },
    report: {
        label: "신고",
        icon: AlertTriangle,
        color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    },
    suggestion: {
        label: "건의",
        icon: Lightbulb,
        color: "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    },
} as const;

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AdminInquiriesTab({
    inquiries,
    onRefresh,
}: AdminInquiriesTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedInquiry, setSelectedInquiry] = useState<InquiryRow | null>(null);
    const [adminResponse, setAdminResponse] = useState("");
    const [isResponding, setIsResponding] = useState(false);

    // ========================================================================
    // 문의 상태 변경
    // ========================================================================
    const updateStatus = async (id: string, status: InquiryRow["status"]) => {
        try {
            const { error } = await supabase
                .from("support_inquiries")
                .update({ status })
                .eq("id", id);

            if (error) throw error;
            toast.success("상태가 업데이트되었습니다");
            onRefresh();
            window.dispatchEvent(new CustomEvent("adminDataUpdated"));
        } catch {
            toast.error("상태 업데이트 중 오류가 발생했습니다");
        }
    };

    // ========================================================================
    // 답변 제출
    // ========================================================================
    const submitResponse = async () => {
        if (!selectedInquiry || !adminResponse.trim()) return;

        setIsResponding(true);
        try {
            const { error } = await supabase
                .from("support_inquiries")
                .update({
                    admin_response: adminResponse.trim(),
                    status: "resolved",
                    responded_at: new Date().toISOString(),
                })
                .eq("id", selectedInquiry.id);

            if (error) throw error;

            toast.success("답변이 저장되었습니다");
            setSelectedInquiry(null);
            setAdminResponse("");
            onRefresh();
            window.dispatchEvent(new CustomEvent("adminDataUpdated"));
        } catch {
            toast.error("답변 저장 중 오류가 발생했습니다");
        } finally {
            setIsResponding(false);
        }
    };

    // ========================================================================
    // 필터링
    // ========================================================================
    const filteredInquiries = inquiries.filter(
        (i) =>
            (searchQuery === "" ||
                i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                i.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
            (selectedCategory === null || i.category === selectedCategory)
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
                        placeholder="제목 또는 이메일로 검색..."
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

            {/* 카테고리 필터 */}
            <div className="flex flex-wrap gap-2 text-sm">
                <Badge
                    className={`cursor-pointer transition-opacity ${
                        selectedCategory === null
                            ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => setSelectedCategory(null)}
                >
                    전체 ({inquiries.length})
                </Badge>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const count = inquiries.filter((i) => i.category === key).length;
                    return (
                        <Badge
                            key={key}
                            className={`cursor-pointer transition-opacity ${
                                selectedCategory === key
                                    ? config.color
                                    : config.color + " opacity-60 hover:opacity-100"
                            }`}
                            onClick={() =>
                                setSelectedCategory(selectedCategory === key ? null : key)
                            }
                        >
                            <Icon className="w-3 h-3 mr-1" />
                            {config.label} ({count})
                        </Badge>
                    );
                })}
            </div>

            {/* 문의 목록 */}
            <Card>
                <CardContent className="pt-6">
                    {filteredInquiries.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <HelpCircle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                            <p>문의 내역이 없습니다</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredInquiries.map((inquiry) => (
                                <InquiryCard
                                    key={inquiry.id}
                                    inquiry={inquiry}
                                    onUpdateStatus={(status) => updateStatus(inquiry.id, status)}
                                    onOpenResponse={() => {
                                        setSelectedInquiry(inquiry);
                                        setAdminResponse(inquiry.admin_response || "");
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 답변 모달 */}
            {selectedInquiry && (
                <ResponseModal
                    inquiry={selectedInquiry}
                    response={adminResponse}
                    onResponseChange={setAdminResponse}
                    onClose={() => {
                        setSelectedInquiry(null);
                        setAdminResponse("");
                    }}
                    onSubmit={submitResponse}
                    isSubmitting={isResponding}
                />
            )}
        </div>
    );
}

// ============================================================================
// 문의 카드 컴포넌트
// ============================================================================

interface InquiryCardProps {
    inquiry: InquiryRow;
    onUpdateStatus: (status: InquiryRow["status"]) => void;
    onOpenResponse: () => void;
}

function InquiryCard({ inquiry, onUpdateStatus, onOpenResponse }: InquiryCardProps) {
    const categoryConfig = CATEGORY_CONFIG[inquiry.category];
    const CategoryIcon = categoryConfig.icon;

    // 배경색 결정
    const getBgColor = () => {
        if (inquiry.status === "resolved") return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50";
        if (inquiry.status === "in_progress") return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50";
        if (inquiry.category === "report") return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50";
        return "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700";
    };

    return (
        <div className={`p-4 rounded-xl border transition-colors ${getBgColor()}`}>
            {/* 상단: 카테고리, 상태, 날짜 */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* 카테고리 뱃지 */}
                    <Badge className={categoryConfig.color}>
                        <CategoryIcon className="w-3 h-3 mr-1" />
                        {categoryConfig.label}
                    </Badge>

                    {/* 상태 뱃지 */}
                    {inquiry.status === "pending" && (
                        <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            대기중
                        </Badge>
                    )}
                    {inquiry.status === "in_progress" && (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs">
                            처리중
                        </Badge>
                    )}
                    {inquiry.status === "resolved" && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            답변완료
                        </Badge>
                    )}
                    {inquiry.status === "closed" && (
                        <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-xs">
                            종료
                        </Badge>
                    )}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(inquiry.created_at).toLocaleDateString("ko-KR")}
                </span>
            </div>

            {/* 제목 & 내용 */}
            <h4 className="font-medium text-gray-800 dark:text-gray-100 mb-1">{inquiry.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">{inquiry.content}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">보낸 사람: {inquiry.email}</p>

            {/* 관리자 답변 */}
            {inquiry.admin_response && (
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-green-200 dark:border-green-800/50 mb-3">
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">관리자 답변</p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">{inquiry.admin_response}</p>
                    {inquiry.responded_at && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(inquiry.responded_at).toLocaleString("ko-KR")}
                        </p>
                    )}
                </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {inquiry.status === "pending" && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateStatus("in_progress")}
                    >
                        처리 시작
                    </Button>
                )}
                {(inquiry.status === "pending" || inquiry.status === "in_progress") && (
                    <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={onOpenResponse}
                    >
                        <Send className="w-3 h-3 mr-1" />
                        답변하기
                    </Button>
                )}
                {(inquiry.status === "pending" || inquiry.status === "in_progress") && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                        onClick={() => onUpdateStatus("resolved")}
                    >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        확인 완료
                    </Button>
                )}
                {inquiry.status === "resolved" && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateStatus("closed")}
                    >
                        종료
                    </Button>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// 답변 모달 컴포넌트
// ============================================================================

interface ResponseModalProps {
    inquiry: InquiryRow;
    response: string;
    onResponseChange: (value: string) => void;
    onClose: () => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

function ResponseModal({
    inquiry,
    response,
    onResponseChange,
    onClose,
    onSubmit,
    isSubmitting,
}: ResponseModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
                {/* 헤더 */}
                <div className="p-4 border-b dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">문의 답변</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{inquiry.title}</p>
                </div>

                {/* 본문 */}
                <div className="p-4 space-y-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">문의 내용</p>
                        <p className="text-sm text-gray-800 dark:text-gray-100">{inquiry.content}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            답변 내용
                        </label>
                        <Textarea
                            value={response}
                            onChange={(e) => onResponseChange(e.target.value)}
                            placeholder="답변을 입력하세요..."
                            rows={5}
                        />
                    </div>
                </div>

                {/* 푸터 */}
                <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        취소
                    </Button>
                    <Button
                        className="bg-green-500 hover:bg-green-600"
                        onClick={onSubmit}
                        disabled={isSubmitting || !response.trim()}
                    >
                        {isSubmitting ? "저장 중..." : "답변 저장"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
