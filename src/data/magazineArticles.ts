/**
 * 펫매거진 데이터 유틸리티
 * MagazineArticle 타입, DB 변환 함수, 배지 스타일
 */

export interface MagazineArticle {
    id: number | string;
    category: string;
    title: string;
    summary: string;
    author: string;
    authorRole: string;
    date: string;
    readTime: string;
    views: number;
    likes: number;
    badge: string;
    image: string;
    tags: string[];
}

/** DB 기사 데이터를 MagazineArticle 형식으로 변환 */
export function dbArticleToMagazineArticle(row: {
    id: string;
    category: string;
    title: string;
    summary: string;
    author: string;
    authorRole?: string | null;
    imageUrl?: string | null;
    readTime?: string | null;
    views: number;
    likes: number;
    badge?: string | null;
    tags?: string[];
    publishedAt?: string | null;
    createdAt?: string;
}): MagazineArticle {
    const dateStr = row.publishedAt || row.createdAt || new Date().toISOString();
    const d = new Date(dateStr);
    const formatted = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    return {
        id: row.id,
        category: row.category,
        title: row.title,
        summary: row.summary,
        author: row.author,
        authorRole: row.authorRole || "",
        date: formatted,
        readTime: row.readTime || "5분",
        views: row.views,
        likes: row.likes,
        badge: row.badge || "",
        image: row.imageUrl || "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
        tags: row.tags || [],
    };
}

/** 단계별 배지 표시 라벨 */
export const getBadgeLabel = (badge: string) => {
    switch (badge) {
        case "beginner":
            return "처음 키워요";
        case "companion":
            return "함께 성장해요";
        case "senior":
            return "오래오래 함께";
        default:
            return badge;
    }
};

export const getBadgeStyle = (badge: string) => {
    switch (badge) {
        case "beginner":
            return "bg-sky-500 text-white";
        case "companion":
            return "bg-emerald-500 text-white";
        case "senior":
            return "bg-amber-500 text-white";
        default:
            return "bg-gray-500 text-white";
    }
};
