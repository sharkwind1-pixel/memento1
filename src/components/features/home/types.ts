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

// 자랑하기 게시글 타입 (홈 섹션용 + 함께 보기 갤러리)
export type ShowcasePost = {
    id: string;
    title: string;
    content: string;
    authorName: string;
    imageUrls?: string[];
    videoUrl?: string;
    likes: number;
    comments: number;
    createdAt: string;
};
