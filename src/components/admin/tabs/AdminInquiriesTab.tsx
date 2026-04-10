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
} from "lucide-react";
import { InquiryRow } from "../types";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

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
        color: "bg-memento-200 text-memento-700 dark:bg-memento-900/30 dark:text-memento-300",
    },
    report: {
        label: "신고",
        icon: AlertTriangle,
        color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    },
    suggestion: {
        label: "건의",
        icon: Lightbulb,
        color: "bg-memorial-100 text-memorial-700 dark:bg-memorial-400/10 dark:text-memorial-300",
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
            <div className="flex gap-1.5">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input
                        placeholder="제목/이메일 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs"
                    />
                </div>
                <Button variant="outline" onClick={onRefresh} className="h-8 px-2 text-xs">
                    <RefreshCw className="w-3.5 h-3.5" />
                </Button>
            </div>

            {/* 카테고리 필터 - 한 줄에 4개 */}
            <div className="flex gap-1 select-none">
                <button
                    type="button"
                    className={`flex-1 inline-flex items-center justify-center rounded-md px-1.5 py-1 text-[10px] font-semibold transition-all ${
                        selectedCategory === null
                            ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => setSelectedCategory(null)}
                >
                    전체 {inquiries.length}
                </button>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const count = inquiries.filter((i) => i.category === key).length;
                    return (
                        <button
                            type="button"
                            key={key}
                            className={`flex-1 inline-flex items-center justify-center rounded-md px-1.5 py-1 text-[10px] font-semibold transition-all ${
                                selectedCategory === key
                                    ? config.color
                                    : config.color + " opacity-60 hover:opacity-100"
                            }`}
                            onClick={() =>
                                setSelectedCategory(selectedCategory === key ? null : key)
                            }
                        >
                            <Icon className="w-3 h-3 mr-0.5" />
                            {config.label} {count}
                        </button>
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
        if (inquiry.status === "in_progress") return "bg-memento-200 dark:bg-memento-900/20 border-memento-200 dark:border-memento-800/50";
        if (inquiry.category === "report") return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50";
        return "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700";
    };

    return (
        <div className={`p-3 rounded-xl border transition-colors ${getBgColor()}`}>
            {/* 상단: 카테고리+상태+날짜 한 줄 */}
            <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                <Badge className={`${categoryConfig.color} text-[10px] px-1.5 py-0`}>
                    <CategoryIcon className="w-2.5 h-2.5 mr-0.5" />
                    {categoryConfig.label}
                </Badge>
                {inquiry.status === "pending" && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">대기</Badge>
                )}
                {inquiry.status === "in_progress" && (
                    <Badge className="bg-memento-200 text-memento-700 dark:bg-memento-900/30 dark:text-memento-300 text-[10px] px-1.5 py-0">처리중</Badge>
                )}
                {inquiry.status === "resolved" && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px] px-1.5 py-0">완료</Badge>
                )}
                {inquiry.status === "closed" && (
                    <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-[10px] px-1.5 py-0">종료</Badge>
                )}
                <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0">
                    {new Date(inquiry.created_at).toLocaleDateString("ko-KR")}
                </span>
            </div>

            {/* 제목 & 내용 */}
            <h4 className="font-medium text-xs text-gray-800 dark:text-gray-100 mb-0.5 truncate">{inquiry.title}</h4>
            <p className="text-[11px] text-gray-600 dark:text-gray-300 mb-1 line-clamp-2">{inquiry.content}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 truncate">{inquiry.email}</p>

            {/* 관리자 답변 */}
            {inquiry.admin_response && (
                <div className="p-2 bg-white dark:bg-gray-900 rounded-lg border border-green-200 dark:border-green-800/50 mb-2">
                    <p className="text-[10px] text-green-600 dark:text-green-400 font-medium mb-0.5">관리자 답변</p>
                    <p className="text-[11px] text-gray-700 dark:text-gray-200 line-clamp-3">{inquiry.admin_response}</p>
                    {inquiry.responded_at && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {new Date(inquiry.responded_at).toLocaleString("ko-KR")}
                        </p>
                    )}
                </div>
            )}

            {/* 액션 버튼 - 네이티브 button */}
            <div className="flex gap-1 pt-1.5 border-t border-gray-200 dark:border-gray-700">
                {inquiry.status === "pending" && (
                    <button
                        type="button"
                        onClick={() => onUpdateStatus("in_progress")}
                        className="h-7 px-2 rounded border border-memento-300 dark:border-memento-700 text-memento-600 dark:text-memento-400 bg-white dark:bg-gray-800 text-[10px] font-medium transition-colors"
                    >
                        처리시작
                    </button>
                )}
                {(inquiry.status === "pending" || inquiry.status === "in_progress") && (
                    <button
                        type="button"
                        onClick={onOpenResponse}
                        className="h-7 px-2 rounded bg-green-500 text-white text-[10px] font-medium transition-colors hover:bg-green-600"
                    >
                        답변
                    </button>
                )}
                {(inquiry.status === "pending" || inquiry.status === "in_progress") && (
                    <button
                        type="button"
                        onClick={() => onUpdateStatus("resolved")}
                        className="h-7 px-2 rounded border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 bg-white dark:bg-gray-800 text-[10px] font-medium transition-colors"
                    >
                        완료
                    </button>
                )}
                {inquiry.status === "resolved" && (
                    <button
                        type="button"
                        onClick={() => onUpdateStatus("closed")}
                        className="h-7 px-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 text-[10px] font-medium transition-colors"
                    >
                        종료
                    </button>
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
    useEscapeClose(true, onClose);
    useBodyScrollLock(true);

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
