/** @type {import('next').NextConfig} */

// CSP 헤더는 src/middleware.ts에서 nonce 기반으로 생성 (unsafe-inline 제거)

const path = require("path");

const nextConfig = {
    // Strict Mode - 개발 모드에서 하이드레이션 버그 감지
    reactStrictMode: true,
    // Turbopack root 설정 (worktree 환경에서 root 인식 문제 해결)
    turbopack: {
        root: path.resolve(__dirname),
    },
    // gzip 압축 활성화
    compress: true,
    // 보안 - X-Powered-By 헤더 제거
    poweredByHeader: false,
    // 보안 및 캐시 헤더
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    // CSP는 middleware.ts에서 nonce 포함하여 설정
                    {
                        key: "X-Frame-Options",
                        value: "DENY",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=(self)",
                    },
                ],
            },
            {
                source: "/icons/:path*",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=86400, must-revalidate",
                    },
                ],
            },
            {
                source: "/fonts/:path*",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=31536000, immutable",
                    },
                ],
            },
            {
                source: "/(logo\\.png|logo2\\.png|og-image\\.png|icon-192\\.png|icon-512\\.png)",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=86400, must-revalidate",
                    },
                ],
            },
        ];
    },
    images: {
        formats: ["image/avif", "image/webp"],
        deviceSizes: [640, 750, 828, 1080, 1200],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
        minimumCacheTTL: 60 * 60 * 24,
        remotePatterns: [
            // Dog/Cat API 이미지
            {
                protocol: "https",
                hostname: "images.dog.ceo",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "cdn2.thecatapi.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "25.media.tumblr.com",
                pathname: "/**",
            },
            // Supabase Storage
            {
                protocol: "https",
                hostname: "*.supabase.co",
                pathname: "/storage/v1/object/public/**",
            },
            {
                protocol: "https",
                hostname: "kuqhjgrlrzskvuutqbce.supabase.co",
                pathname: "/**",
            },
            // Unsplash 이미지 (매거진 목업 등)
            {
                protocol: "https",
                hostname: "images.unsplash.com",
                pathname: "/**",
            },
            // 기타 외부 이미지 (나중에 필요시 추가)
            {
                protocol: "https",
                hostname: "via.placeholder.com",
                pathname: "/**",
            },
            // fal.ai 영상 생성 결과 (썸네일 등)
            {
                protocol: "https",
                hostname: "*.fal.ai",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "fal.media",
                pathname: "/**",
            },
        ],
    },
};

module.exports = nextConfig;
