/**
 * manifest.ts
 * PWA 웹 앱 매니페스트
 */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "메멘토애니 - 특별한 매일을 함께",
        short_name: "메멘토애니",
        description: "일상부터 기억까지, 시간이 쌓이고 의미가 바뀌는 기록 플랫폼",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0EA5E9",
        orientation: "portrait",
        categories: ["lifestyle", "social"],
        icons: [
            {
                src: "/logo.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/logo.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}
