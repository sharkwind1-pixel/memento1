/**
 * PostDetailHeader - 게시글 상세 상단 네비게이션 바
 * 뒤로가기, 수정/숨기기/삭제 버튼, 드롭다운 메뉴, 상태 배너
 */
"use client";

import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    MoreHorizontal,
    Flag,
    Trash2,
    Edit3,
    EyeOff,
    Ban,
    Pin,
    Globe,
    Megaphone,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PostData } from "./postDetailTypes";

interface PostDetailHeaderProps {
    post: PostData;
    isOwner: boolean | null | undefined;
    canDelete: boolean | null | undefined;
    isAdminUser: boolean;
    isHidden: boolean;
    isTogglingHidden: boolean;
    isDeleting: boolean;
    isTogglingNotice: boolean;
    user: { id: string } | null;
    onBack: () => void;
    onToggleHidden: () => void;
    onStartEdit: () => void;
    onDelete: () => void;
    onReport: () => void;
    onBlockUser: (targetUserId: string, targetName: string) => void;
    onToggleNotice: (scope: "board" | "global" | null) => void;
}

export default function PostDetailHeader({
    post,
    isOwner,
    canDelete,
    isAdminUser,
    isHidden,
    isTogglingHidden,
    isDeleting,
    isTogglingNotice,
    user,
    onBack,
    onToggleHidden,
    onStartEdit,
    onDelete,
    onReport,
    onBlockUser,
    onToggleNotice,
}: PostDetailHeaderProps) {
    return (
        <>
            {/* 상단 네비게이션 */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="rounded-xl text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    목록
                </Button>

                <div className="flex items-center gap-1">
                    {isOwner && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg text-gray-500 hover:text-amber-600"
                                onClick={onToggleHidden}
                                disabled={isTogglingHidden}
                                title={isHidden ? "다시 공개" : "숨기기"}
                            >
                                <EyeOff className="w-4 h-4" />
                                <span className="text-xs ml-1">{isHidden ? "공개" : "숨기기"}</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg text-gray-500 hover:text-sky-600"
                                onClick={onStartEdit}
                                title="수정"
                            >
                                <Edit3 className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                    {canDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-gray-500 hover:text-red-600"
                            onClick={onDelete}
                            disabled={isDeleting}
                            title={isAdminUser && !isOwner ? "관리자 삭제" : "삭제"}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" aria-label="게시글 더보기" className="rounded-lg">
                                <MoreHorizontal className="w-4 h-4 text-gray-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => {
                                    if (!user) {
                                        window.dispatchEvent(new CustomEvent("openAuthModal"));
                                        return;
                                    }
                                    onReport();
                                }}
                                className="text-red-500 focus:text-red-600"
                            >
                                <Flag className="w-4 h-4 mr-2" />
                                신고하기
                            </DropdownMenuItem>
                            {/* 차단하기 (본인 글이 아닐 때만) */}
                            {!isOwner && post.user_id && (
                                <DropdownMenuItem
                                    onClick={() => onBlockUser(post.user_id, post.author_name)}
                                    className="text-orange-500 focus:text-orange-600"
                                >
                                    <Ban className="w-4 h-4 mr-2" />
                                    이 유저 차단
                                </DropdownMenuItem>
                            )}
                            {/* 관리자: 공지 설정 */}
                            {isAdminUser && !isTogglingNotice && (
                                <>
                                    {(!post.is_pinned || post.notice_scope !== "board") && (
                                        <DropdownMenuItem
                                            onClick={() => onToggleNotice("board")}
                                            className="text-red-500 focus:text-red-600"
                                        >
                                            <Pin className="w-4 h-4 mr-2" />
                                            게시판 공지
                                        </DropdownMenuItem>
                                    )}
                                    {(!post.is_pinned || post.notice_scope !== "global") && (
                                        <DropdownMenuItem
                                            onClick={() => onToggleNotice("global")}
                                            className="text-red-500 focus:text-red-600"
                                        >
                                            <Globe className="w-4 h-4 mr-2" />
                                            전체 공지
                                        </DropdownMenuItem>
                                    )}
                                    {post.is_pinned && (
                                        <DropdownMenuItem
                                            onClick={() => onToggleNotice(null)}
                                            className="text-gray-500 focus:text-gray-600"
                                        >
                                            <Megaphone className="w-4 h-4 mr-2" />
                                            공지 해제
                                        </DropdownMenuItem>
                                    )}
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* 숨김 상태 안내 */}
            {isHidden && isOwner && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl px-4 py-3 flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                        이 게시글은 숨김 상태입니다. 다른 사람들에게 보이지 않습니다.
                    </p>
                </div>
            )}

            {/* 공지 상태 안내 */}
            {post.is_pinned && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl px-4 py-3 flex items-center gap-2">
                    <Pin className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                        {post.notice_scope === "global" ? "전체 공지" : "게시판 공지"}
                    </p>
                </div>
            )}
        </>
    );
}
