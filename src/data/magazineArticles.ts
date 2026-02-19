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

export const getBadgeStyle = (badge: string) => {
    switch (badge) {
        case "필독":
            return "bg-red-500 text-white";
        case "인기":
            return "bg-orange-500 text-white";
        case "추천":
            return "bg-blue-500 text-white";
        case "팁":
            return "bg-green-500 text-white";
        case "시즌":
            return "bg-purple-500 text-white";
        case "가이드":
            return "bg-sky-500 text-white";
        case "심화":
            return "bg-indigo-500 text-white";
        default:
            return "bg-gray-500 text-white";
    }
};
