/**
 * 글쓰기 모달
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Send } from "lucide-react";
import { InlineLoading } from "@/components/ui/PawLoading";
import { useAuth } from "@/contexts/AuthContext";

interface WritePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardType: string;
    onSuccess: () => void;
}

const BADGES_BY_BOARD: Record<string, string[]> = {
    free: ["일상", "자랑", "질문", "수다"],
    info: ["정보", "꿀팁", "자료", "추천"],
    pets: ["일상", "자랑", "먹방", "귀여움", "질문"],
    healing: ["위로", "추억", "고민", "감사"],
};

export default function WritePostModal({
    isOpen,
    onClose,
    boardType,
    onSuccess,
}: WritePostModalProps) {
    const { user } = useAuth();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [badge, setBadge] = useState("");
    const [authorName, setAuthorName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const badges = BADGES_BY_BOARD[boardType] || BADGES_BY_BOARD.free;

    const handleSubmit = async () => {
        if (!user) {
            setError("로그인이 필요합니다");
            return;
        }

        if (!title.trim() || !content.trim() || !badge || !authorName.trim()) {
            setError("모든 필드를 입력해주세요");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const response = await fetch("/api/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    boardType,
                    badge,
                    title: title.trim(),
                    content: content.trim(),
                    authorName: authorName.trim(),
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "게시글 작성 실패");
            }

            // 성공
            setTitle("");
            setContent("");
            setBadge("");
            setAuthorName("");
            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "오류가 발생했습니다");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 배경 */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 모달 */}
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                        글쓰기
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 내용 */}
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* 닉네임 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            닉네임
                        </label>
                        <Input
                            value={authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            placeholder="표시될 닉네임"
                            maxLength={20}
                        />
                    </div>

                    {/* 태그 선택 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            태그
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {badges.map((b) => (
                                <button
                                    key={b}
                                    onClick={() => setBadge(b)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                        badge === b
                                            ? "bg-sky-500 text-white"
                                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                                    }`}
                                >
                                    {b}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 제목 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            제목
                        </label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="제목을 입력하세요"
                            maxLength={100}
                        />
                    </div>

                    {/* 내용 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            내용
                        </label>
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="내용을 입력하세요"
                            rows={6}
                            maxLength={5000}
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">
                            {content.length}/5000
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
                    <Button variant="outline" onClick={onClose}>
                        취소
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-gradient-to-r from-sky-500 to-blue-500"
                    >
                        {isSubmitting ? (
                            <InlineLoading />
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                등록
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
