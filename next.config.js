/** @type {import('next').NextConfig} */
const nextConfig = {
    // Strict Mode 비활성화 - 개발 모드에서 이중 렌더링 방지
    reactStrictMode: false,
    // 보안 헤더
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
