/** @type {import('next').NextConfig} */

// Content-Security-Policy 헤더 값
const ContentSecurityPolicy = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: *.supabase.co *.supabase.in;
    font-src 'self';
    connect-src 'self' *.supabase.co *.supabase.in api.openai.com apis.data.go.kr;
    frame-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
`
    .replace(/\s{2,}/g, " ")
    .trim();

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
                        key: "Content-Security-Policy",
                        value: ContentSecurityPolicy,
                    },
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
