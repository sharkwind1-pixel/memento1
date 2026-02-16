/**
 * 글쓰기 모달
 * v2: 추모 공개 옵션 + 말머리 시스템 추가
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Home, Eye, EyeOff } from "lucide-react";
import { InlineLoading } from "@/components/ui/PawLoading";
import { useAuth } from "@/contexts/AuthContext";
import type { CommunitySubcategory, PostTag } from "@/types";

interface WritePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardType: string; // CommunitySubcategory
    onSuccess: () => void;
}

// 서브카테고리별 배지 옵션
const BADGES_BY_SUBCATEGORY: Record<string, string[]> = {
    free: ["일상", "자랑", "질문", "수다", "꿀팁"],
    memorial: ["위로", "추억", "고민", "감사"],
    adoption: ["입양", "분양", "긴급"],
    local: ["추천", "정보", "모임", "후기"],
    lost: ["분실", "발견"],
};

// 자유게시판 말머리 옵션
const POST_TAGS: { id: PostTag; label: string }[] = [
    { id: "일상", label: "일상" },
    { id: "정보", label: "정보" },
    { id: "질문", label: "질문" },
    { id: "강아지", label: "강아지" },
    { id: "고양이", label: "고양이" },
    { id: "새", label: "새" },
    { id: "물고기", label: "물고기" },
    { id: "토끼", label: "토끼" },
    { id: "파충류", label: "파충류" },
];

// 서브카테고리별 라벨
const SUBCATEGORY_LABELS: Record<string, string> = {
    free: "자유게시판",
    memorial: "추모게시판",
    adoption: "입양정보",
    local: "지역정보",
    lost: "분실동물",
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
    const [tag, setTag] = useState<PostTag | "">("");
    const [isPublic, setIsPublic] = useState(false); // 홈화면 공개 여부
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    // 가입된 닉네임 사용
    const userNickname =
        user?.user_metadata?.nickname || user?.email?.split("@")[0] || "익명";

    const isMemorial = boardType === "memorial";
    const isFreeBoard = boardType === "free";
    const badges =
        BADGES_BY_SUBCATEGORY[boardType] || BADGES_BY_SUBCATEGORY.free;

    // boardType 변경 시 상태 초기화
    useEffect(() => {
        setBadge("");
        setTag("");
        setIsPublic(false);
    }, [boardType]);

    const handleSubmit = async () => {
        if (!user) {
            setError("로그인이 필요합니다");
            return;
        }

        if (!title.trim() || !content.trim() || !badge) {
            setError("모든 필드를 입력해주세요");
            return;
        }

        // 자유게시판은 말머리 필수
        if (isFreeBoard && !tag) {
            setError("말머리를 선택해주세요");
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
                    subcategory: boardType,
                    badge,
                    tag: isFreeBoard ? tag : undefined,
                    title: title.trim(),
                    content: content.trim(),
                    authorName: userNickname,
                    isPublic: isMemorial ? isPublic : undefined,
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
            setTag("");
            setIsPublic(false);
            onSuccess();
            onClose();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "오류가 발생했습니다",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
            {/* 배경 */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* 모달 */}
            <div className="relative w-full sm:max-w-lg sm:mx-4 bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[calc(100vh-140px)] sm:max-h-[85vh] flex flex-col mb-[80px] sm:mb-0">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                            글쓰기
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {SUBCATEGORY_LABELS[boardType] || "커뮤니티"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 내용 */}
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* 닉네임 (자동) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            작성자
                        </label>
                        <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 text-sm">
                            {userNickname}
                        </div>
                    </div>

                    {/* 말머리 선택 (자유게시판만) */}
                    {isFreeBoard && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                말머리 <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {POST_TAGS.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTag(t.id)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                            tag === t.id
                                                ? "bg-sky-500 text-white"
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

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

                    {/* 홈화면 공개 옵션 (추모게시판만) */}
                    {isMemorial && (
                        <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-700/50">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPublic}
                                    onChange={(e) =>
                                        setIsPublic(e.target.checked)
                                    }
                                    className="mt-1 w-5 h-5 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-100">
                                        <Home className="w-4 h-4 text-violet-500" />
                                        홈화면에 공개
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        체크하면 홈화면의 &apos;추모의
                                        공간&apos;에 글이 노출됩니다. 다른
                                        사용자들과 함께 위로와 추억을 나눌 수
                                        있어요.
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                        {isPublic ? (
                                            <>
                                                <Eye className="w-3.5 h-3.5 text-violet-500" />
                                                <span className="text-violet-600 dark:text-violet-400">
                                                    공개 상태로 설정됨
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <EyeOff className="w-3.5 h-3.5" />
                                                <span>
                                                    비공개 (커뮤니티
                                                    추모게시판에서만 볼 수 있음)
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </label>
                        </div>
                    )}

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
