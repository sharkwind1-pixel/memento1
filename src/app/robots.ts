/**
 * robots.ts
 * 검색 엔진 크롤러 설정
 */

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mementoani.com";

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/api/", "/auth/"],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}
