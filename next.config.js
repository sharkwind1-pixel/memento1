/** @type {import('next').NextConfig} */
const nextConfig = {
    // Strict Mode - 개발 모드에서 하이드레이션 버그 감지
    reactStrictMode: true,
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
                        value: "public, max-age=31536000, immutable",
                    },
                ],
            },
        ];
    },
    images: {
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
        ],
    },
};

module.exports = nextConfig;
