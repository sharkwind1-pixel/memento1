// 홈페이지 관련 타입 정의

export type LightboxItem = {
    title: string;
    subtitle?: string;
    meta?: string;
    src: string;
};

// 커뮤니티 포스트 타입
export type CommunityPost = {
    id: number;
    title: string;
    content: string;
    author: string;
    badge: string;
    likes: number;
    comments: number;
    time: string;
    avatar?: string;
};

// 댓글 타입
export type Comment = {
    id: number;
    author: string;
    content: string;
    time: string;
    likes: number;
};
