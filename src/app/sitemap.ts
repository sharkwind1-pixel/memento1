/**
 * sitemap.ts
 * 동적 사이트맵 생성 — 정적 페이지 + 발행된 매거진 글 전체.
 * Supabase에서 magazine_articles(status=published) 조회 후 /magazine/[id] URL로 추가.
 */

import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getPublishedMagazineUrls(siteUrl: string): Promise<MetadataRoute.Sitemap> {
    if (!SUPABASE_URL || !SUPABASE_ANON) return [];
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await supabase
            .from("magazine_articles")
            .select("id, updated_at, published_at")
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(1000);

        if (error || !data) return [];

        return data.map((row) => ({
            url: `${siteUrl}/magazine/${row.id}`,
            lastModified: new Date(row.updated_at || row.published_at || Date.now()),
            changeFrequency: "monthly" as const,
            priority: 0.7,
        }));
    } catch {
        return [];
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mementoani.com";
    const now = new Date();

    const staticEntries: MetadataRoute.Sitemap = [
        {
            url: siteUrl,
            lastModified: now,
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: `${siteUrl}/terms`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.3,
        },
        {
            url: `${siteUrl}/privacy`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.3,
        },
        {
            url: `${siteUrl}/community-guidelines`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.3,
        },
        {
            url: `${siteUrl}/location-terms`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.3,
        },
        {
            url: `${siteUrl}/opensource`,
            lastModified: now,
            changeFrequency: "yearly",
            priority: 0.2,
        },
    ];

    const magazineEntries = await getPublishedMagazineUrls(siteUrl);
    return [...staticEntries, ...magazineEntries];
}
