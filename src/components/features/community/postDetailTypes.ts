/**
 * postDetailTypes - PostDetailView 공유 타입, 헬퍼 함수, 상수
 */
import type { CommunitySubcategory } from "@/types";

export interface PostComment {
    id: string;
    postId: string;
    userId: string;
    content: string;
    authorNickname: string;
    authorAvatar?: string;
    createdAt: string;
    // 좋아요/비추천
    likes?: number;
    dislikes?: number;
    userLiked?: boolean;
    userDisliked?: boolean;
    // 레거시 필드 호환
    author_name?: string;
    author_nickname?: string;
    author_avatar?: string;
    user_id?: string;
    post_id?: string;
    created_at?: string;
}

export interface PostData {
    id: string;
    user_id: string;
    board_type?: string;
    animal_type?: string;
    badge?: string;
    title: string;
    content: string;
    author_name: string;
    likes: number;
    views: number;
    comments: PostComment[] | number;
    image_urls?: string[];
    video_url?: string;
    is_hidden?: boolean;
    is_pinned?: boolean;
    notice_scope?: "board" | "global" | null;
    authorMinimiSlug?: string | null;
    authorPoints?: number;
    authorIsAdmin?: boolean;
    created_at: string;
    updated_at?: string;
}

// 배지 색상
export const getBadgeStyle = (badge: string) => {
    const styles: Record<string, string> = {
        "공지": "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-700",
        "자랑": "bg-memento-200 text-memento-700",
        "일상": "bg-memento-100 text-memento-700",
        "질문": "bg-memorial-100 text-memorial-700",
        "꿀팁": "bg-emerald-100 text-emerald-700",
        "위로": "bg-violet-100 text-violet-700",
        "추억": "bg-pink-100 text-pink-700",
        "입양": "bg-rose-100 text-rose-700",
        "긴급": "bg-red-100 text-red-700",
        "분양": "bg-pink-100 text-pink-700",
        "추천": "bg-emerald-100 text-emerald-700",
        "정보": "bg-teal-100 text-teal-700",
        "모임": "bg-cyan-100 text-cyan-700",
        "분실": "bg-red-100 text-red-700",
        "발견": "bg-emerald-100 text-emerald-700",
        "완료": "bg-gray-100 text-gray-700",
        "수다": "bg-purple-100 text-purple-700",
        "고민": "bg-memorial-100 text-memorial-700",
        "감사": "bg-pink-100 text-pink-700",
        "후기": "bg-teal-100 text-teal-700",
    };
    return styles[badge] || "bg-gray-100 text-gray-700";
};

// 게시판별 뱃지 옵션 (수정 모드용)
export const getBadgeOptions = (subcategory: CommunitySubcategory): string[] => {
    switch (subcategory) {
        case "free":
            return ["일상", "질문", "수다", "꿀팁"];
        case "memorial":
            return ["위로", "추억", "정보", "고민"];
        case "adoption":
            return ["입양", "분양", "긴급"];
        case "local":
            return ["추천", "정보", "모임"];
        case "lost":
            return ["분실", "발견", "완료"];
        default:
            return ["일상", "질문", "꿀팁"];
    }
};

// 시간 포맷
export const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
};
