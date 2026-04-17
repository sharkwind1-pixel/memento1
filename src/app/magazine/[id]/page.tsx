/**
 * /magazine/[id]
 * 매거진 단건 SSR 페이지 — 검색엔진 크롤러 + 공유 미리보기용.
 *
 * - Supabase에서 published 상태 글만 조회
 * - generateMetadata로 글별 title/OG/Twitter 카드 동적 생성
 * - Article JSON-LD 구조화 데이터 추가
 * - UI는 기존 MagazineReader 재사용 (hydration 안전)
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase-server";
import { dbArticleToMagazineArticle, type MagazineArticle } from "@/data/magazineArticles";
import MagazineArticleClient from "./MagazineArticleClient";

export const dynamic = "force-dynamic";

interface DbArticleRow {
    id: string;
    category: string;
    title: string;
    summary: string;
    content: string | null;
    author: string;
    author_role: string | null;
    image_url: string | null;
    read_time: string | null;
    views: number;
    likes: number;
    badge: string | null;
    tags: string[] | null;
    status: string;
    published_at: string | null;
    created_at: string;
    updated_at: string | null;
}

async function getArticle(id: string): Promise<DbArticleRow | null> {
    const supabase = await createServerSupabase();
    const { data } = await supabase
        .from("magazine_articles")
        .select("id, category, title, summary, content, author, author_role, image_url, read_time, views, likes, badge, tags, status, published_at, created_at, updated_at")
        .eq("id", id)
        .eq("status", "published")
        .single();
    return (data as DbArticleRow | null) ?? null;
}

function toMagazineArticle(row: DbArticleRow): MagazineArticle {
    return dbArticleToMagazineArticle({
        id: row.id,
        category: row.category,
        title: row.title,
        summary: row.summary,
        content: row.content,
        author: row.author,
        authorRole: row.author_role,
        imageUrl: row.image_url,
        readTime: row.read_time,
        views: row.views,
        likes: row.likes,
        badge: row.badge,
        tags: row.tags || [],
        publishedAt: row.published_at,
        createdAt: row.created_at,
    });
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const row = await getArticle(id);
    if (!row) {
        return {
            title: "찾을 수 없는 매거진",
            description: "요청하신 매거진 글을 찾을 수 없어요.",
            robots: { index: false, follow: false },
        };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mementoani.com";
    const url = `${siteUrl}/magazine/${row.id}`;
    const images = row.image_url ? [{ url: row.image_url }] : undefined;

    return {
        title: row.title,
        description: row.summary,
        alternates: { canonical: url },
        openGraph: {
            type: "article",
            url,
            title: row.title,
            description: row.summary,
            siteName: "메멘토애니",
            locale: "ko_KR",
            images,
            publishedTime: row.published_at ?? undefined,
            modifiedTime: row.updated_at ?? undefined,
            authors: [row.author],
            tags: row.tags ?? undefined,
        },
        twitter: {
            card: "summary_large_image",
            title: row.title,
            description: row.summary,
            images: row.image_url ? [row.image_url] : undefined,
        },
    };
}

export default async function MagazineDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const row = await getArticle(id);
    if (!row) notFound();

    const article = toMagazineArticle(row);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mementoani.com";
    const pageUrl = `${siteUrl}/magazine/${row.id}`;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: row.title,
        description: row.summary,
        image: row.image_url ? [row.image_url] : undefined,
        author: {
            "@type": "Person",
            name: row.author,
        },
        publisher: {
            "@type": "Organization",
            name: "메멘토애니",
            logo: {
                "@type": "ImageObject",
                url: `${siteUrl}/logo.png`,
            },
        },
        datePublished: row.published_at,
        dateModified: row.updated_at || row.published_at,
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": pageUrl,
        },
        keywords: row.tags?.join(", "),
        articleSection: row.category,
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            {/* 크롤러용 텍스트 폴백 — 카드뉴스 UI 외에 본문 원문을 순수 텍스트로도 제공 */}
            <div className="sr-only">
                <h1>{row.title}</h1>
                <p>{row.summary}</p>
                {row.content && <div>{row.content}</div>}
                <footer>
                    <span>작성자: {row.author}</span>
                    {row.tags && row.tags.length > 0 && (
                        <ul>
                            {row.tags.map((t) => (
                                <li key={t}>{t}</li>
                            ))}
                        </ul>
                    )}
                </footer>
            </div>
            <MagazineArticleClient article={article} />
        </>
    );
}
