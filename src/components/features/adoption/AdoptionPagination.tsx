/**
 * AdoptionPagination.tsx
 * 입양 정보 페이지네이션 UI
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdoptionPaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function AdoptionPagination({
    page,
    totalPages,
    onPageChange,
}: AdoptionPaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-2 pt-4">
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                aria-label="이전 페이지"
                className="rounded-xl"
            >
                <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                        pageNum = i + 1;
                    } else if (page <= 3) {
                        pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                    } else {
                        pageNum = page - 2 + i;
                    }
                    return (
                        <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => onPageChange(pageNum)}
                            className={`rounded-xl w-9 h-9 p-0 ${
                                page === pageNum ? "bg-memento-500" : ""
                            }`}
                        >
                            {pageNum}
                        </Button>
                    );
                })}
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                aria-label="다음 페이지"
                className="rounded-xl"
            >
                <ChevronRight className="w-4 h-4" />
            </Button>
        </div>
    );
}
