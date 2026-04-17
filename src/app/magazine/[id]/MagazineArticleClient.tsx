/**
 * MagazineArticleClient
 * 매거진 상세 SSR 페이지의 클라이언트 부분.
 * 기존 MagazineReader 컴포넌트를 재사용하되, onBack을 Next.js 라우터로 처리.
 */
"use client";

import { useRouter } from "next/navigation";
import MagazineReader from "@/components/features/magazine/MagazineReader";
import type { MagazineArticle } from "@/data/magazineArticles";

export default function MagazineArticleClient({ article }: { article: MagazineArticle }) {
    const router = useRouter();
    return <MagazineReader article={article} onBack={() => router.push("/?tab=magazine")} />;
}
