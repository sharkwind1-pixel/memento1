/**
 * 쪽지 보내기 모달
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Search, User } from "lucide-react";
import { InlineLoading } from "@/components/ui/PawLoading";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface SendMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    replyTo?: { id: string; nickname: string } | null;
}

interface UserSearchResult {
    id: string;
    nickname: string;
    email: string;
}

export default function SendMessageModal({
    isOpen,
    onClose,
    onSuccess,
    replyTo,
}: SendMessageModalProps) {
    const { user } = useAuth();
    const [receiverId, setReceiverId] = useState("");
    const [receiverName, setReceiverName] = useState("");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    // 유저 검색
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    // 답장 모드 초기화
    useEffect(() => {
        if (replyTo) {
            setReceiverId(replyTo.id);
            setReceiverName(replyTo.nickname);
            setTitle(`RE: `);
            setShowSearch(false);
        } else {
            setReceiverId("");
            setReceiverName("");
            setTitle("");
            setShowSearch(true);
        }
        setContent("");
        setError("");
    }, [replyTo, isOpen]);

    // 유저 검색
    const searchUsers = useCallback(async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, nickname, email")
                .or(`nickname.ilike.%${query}%,email.ilike.%${query}%`)
                .neq("id", user?.id) // 자기 자신 제외
                .eq("is_banned", false) // 정지된 유저 제외
                .limit(5);

            if (error) throw error;

            setSearchResults(data || []);
        } catch (err) {
            console.error("User search error:", err);
        } finally {
            setIsSearching(false);
        }
    }, [user?.id]);

    // 검색어 변경 시 디바운스
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) {
                searchUsers(searchQuery);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, searchUsers]);

    // 유저 선택
    const selectUser = (selectedUser: UserSearchResult) => {
        setReceiverId(selectedUser.id);
        setReceiverName(selectedUser.nickname || selectedUser.email);
        setSearchQuery("");
        setSearchResults([]);
        setShowSearch(false);
    };

    // 쪽지 보내기
    const handleSubmit = async () => {
        if (!user) {
            setError("로그인이 필요합니다");
            return;
        }

        if (!receiverId) {
            setError("받는 사람을 선택해주세요");
            return;
        }

        if (!title.trim()) {
            setError("제목을 입력해주세요");
            return;
        }

        if (!content.trim()) {
            setError("내용을 입력해주세요");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const response = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    receiverId,
                    title: title.trim(),
                    content: content.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "쪽지 전송 실패");
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "오류가 발생했습니다");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setReceiverId("");
        setReceiverName("");
        setTitle("");
        setContent("");
        setError("");
        setSearchQuery("");
        setSearchResults([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            {/* 배경 */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* 모달 */}
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-sky-50 dark:bg-sky-900/20">
                    <div className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-sky-500" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                            쪽지 보내기
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 내용 */}
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* 받는 사람 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            받는 사람 <span className="text-red-500">*</span>
                        </label>

                        {receiverId && receiverName ? (
                            <div className="flex items-center justify-between p-3 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-200 dark:border-sky-700">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-sky-500" />
                                    <span className="font-medium text-gray-800 dark:text-white">
                                        {receiverName}
                                    </span>
                                </div>
                                {!replyTo && (
                                    <button
                                        onClick={() => {
                                            setReceiverId("");
                                            setReceiverName("");
                                            setShowSearch(true);
                                        }}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        변경
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="닉네임 또는 이메일로 검색..."
                                        className="pl-10"
                                    />
                                </div>

                                {/* 검색 결과 */}
                                {(isSearching || searchResults.length > 0) && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-10 max-h-48 overflow-y-auto">
                                        {isSearching ? (
                                            <div className="p-4 text-center">
                                                <InlineLoading />
                                            </div>
                                        ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                                            <div className="p-4 text-center text-gray-500 text-sm">
                                                검색 결과가 없습니다
                                            </div>
                                        ) : (
                                            searchResults.map((result) => (
                                                <button
                                                    key={result.id}
                                                    onClick={() => selectUser(result)}
                                                    className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b last:border-b-0 dark:border-gray-700"
                                                >
                                                    <p className="font-medium text-gray-800 dark:text-white">
                                                        {result.nickname || "사용자"}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {result.email}
                                                    </p>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 제목 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            제목 <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="쪽지 제목"
                            maxLength={100}
                        />
                    </div>

                    {/* 내용 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            내용 <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="쪽지 내용을 입력하세요"
                            rows={5}
                            maxLength={2000}
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">
                            {content.length}/2000
                        </p>
                    </div>

                    {/* 에러 */}
                    {error && (
                        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                            {error}
                        </p>
                    )}
                </div>

                {/* 푸터 */}
                <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
                    <Button variant="outline" onClick={handleClose}>
                        취소
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !receiverId}
                        className="bg-gradient-to-r from-sky-500 to-blue-500"
                    >
                        {isSubmitting ? (
                            <InlineLoading />
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                보내기
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
