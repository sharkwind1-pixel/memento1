/**
 * 루트 레이아웃
 * AuthProvider로 전체 앱 감싸기
 */

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PetProvider } from "@/contexts/PetContext";
import { Toaster } from "sonner";
import CookieConsentBanner from "@/components/features/cookie/CookieConsentBanner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mementoani.com";

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: "메멘토애니 - 특별한 매일을 함께",
        template: "%s | 메멘토애니",
    },
    description:
        "반려동물과 함께하는 모든 순간을 기록하고, 이별 후에도 따뜻한 추억을 간직할 수 있는 메모리얼 커뮤니티 플랫폼. AI 펫톡, 타임라인, 케어 리마인더 등.",
    keywords: [
        "반려동물",
        "펫",
        "추모",
        "기록",
        "커뮤니티",
        "AI 상담",
        "메모리얼",
        "반려견",
        "반려묘",
        "펫로스",
        "무지개다리",
        "타임라인",
        "케어 리마인더",
        "펫매거진",
    ],
    authors: [{ name: "메멘토애니" }],
    creator: "메멘토애니",
    alternates: {
        canonical: siteUrl,
    },
    icons: {
        icon: [
            { url: "/favicon.ico", sizes: "32x32" },
            { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        ],
        apple: "/icon-192.png",
    },
    openGraph: {
        type: "website",
        locale: "ko_KR",
        url: siteUrl,
        siteName: "메멘토애니",
        title: "메멘토애니 - 특별한 매일을 함께",
        description:
            "반려동물과 함께하는 모든 순간을 기록하고, 이별 후에도 따뜻한 추억을 간직하세요.",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "메멘토애니 - 반려동물 메모리얼 커뮤니티 플랫폼",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "메멘토애니 - 특별한 매일을 함께",
        description:
            "반려동물과 함께하는 모든 순간을 기록하고, 이별 후에도 따뜻한 추억을 간직하세요.",
        images: ["/og-image.png"],
    },
    other: {
        "naver-site-verification": "079ddcf23ad1ee15036c259a96423de3684e9d01",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    document.documentElement.classList.add('js-loading');
                                    var d = localStorage.getItem('darkMode');
                                    if (d === 'true') {
                                        document.documentElement.classList.add('dark');
                                    }
                                    var s = localStorage.getItem('memento-simple-mode');
                                    if (s === 'true') {
                                        document.documentElement.classList.add('simple-mode');
                                    }
                                } catch(e) {}
                            })();
                        `,
                    }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@graph": [
                                {
                                    "@type": "WebSite",
                                    "name": "메멘토애니",
                                    "url": siteUrl,
                                    "description": "반려동물과 함께하는 모든 순간을 기록하고, 이별 후에도 따뜻한 추억을 간직할 수 있는 메모리얼 커뮤니티 플랫폼",
                                },
                                {
                                    "@type": "Organization",
                                    "name": "메멘토애니",
                                    "url": siteUrl,
                                    "logo": `${siteUrl}/logo.png`,
                                    "address": {
                                        "@type": "PostalAddress",
                                        "streetAddress": "덕릉로41길 78-5, 1층 102호(번동)",
                                        "addressLocality": "강북구",
                                        "addressRegion": "서울특별시",
                                        "addressCountry": "KR",
                                    },
                                    "taxID": "687-08-03135",
                                    "telephone": "010-5458-2506",
                                    "email": "sharkwind1@gmail.com",
                                    "founder": { "@type": "Person", "name": "안승빈" },
                                },
                                {
                                    "@type": "Product",
                                    "name": "메멘토애니 베이직 플랜",
                                    "description": "AI 펫톡 하루 50회, 반려동물 3마리, 사진 펫당 200장, AI 영상 월 3회",
                                    "offers": {
                                        "@type": "Offer",
                                        "price": "7900",
                                        "priceCurrency": "KRW",
                                        "priceValidUntil": "2027-12-31",
                                        "availability": "https://schema.org/InStock",
                                    },
                                },
                                {
                                    "@type": "Product",
                                    "name": "메멘토애니 프리미엄 플랜",
                                    "description": "AI 펫톡 무제한, 반려동물 10마리, 사진 펫당 1,000장, AI 영상 월 6회, 우선 고객 지원",
                                    "offers": {
                                        "@type": "Offer",
                                        "price": "14900",
                                        "priceCurrency": "KRW",
                                        "priceValidUntil": "2027-12-31",
                                        "availability": "https://schema.org/InStock",
                                    },
                                },
                            ],
                        }),
                    }}
                />
            </head>
            <body className={`${inter.variable} font-sans`}>
                <AuthProvider>
                    <PetProvider>{children}</PetProvider>
                </AuthProvider>
                <CookieConsentBanner />

                {/* SSR Footer - 크롤러/봇이 JS 없이도 사업자정보, 법적 링크, 가격 정보를 볼 수 있도록 서버 렌더링 */}
                <footer className="border-t border-gray-200 bg-gray-50 text-xs text-gray-600 py-8 px-4">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* 서비스 소개 및 가격 */}
                        <section>
                            <h2 className="text-sm font-bold text-gray-800 mb-2">메멘토애니 - 반려동물 메모리얼 커뮤니티 플랫폼</h2>
                            <p className="mb-3">반려동물과 함께하는 모든 순간을 기록하고, 이별 후에도 따뜻한 추억을 간직할 수 있는 플랫폼입니다. AI 펫톡, 타임라인, 커뮤니티, 펫매거진 등 다양한 서비스를 제공합니다.</p>
                            <h3 className="text-sm font-semibold text-gray-700 mb-1">요금제 안내</h3>
                            <ul className="space-y-1">
                                <li>무료 플랜: AI 펫톡 하루 10회, 반려동물 1마리, 사진 펫당 50장</li>
                                <li>베이직 플랜: 월 7,900원 - AI 펫톡 하루 50회, 반려동물 3마리, 사진 펫당 200장, AI 영상 월 3회</li>
                                <li>프리미엄 플랜: 월 14,900원 - AI 펫톡 무제한, 반려동물 10마리, 사진 펫당 1,000장, AI 영상 월 6회, 우선 고객 지원</li>
                            </ul>
                        </section>

                        {/* 환불 정책 요약 */}
                        <section>
                            <h3 className="text-sm font-semibold text-gray-700 mb-1">환불 정책</h3>
                            <p>결제일로부터 7일 이내 청약철회 가능. 서비스 이용 이력이 있는 경우 이용일수에 해당하는 금액을 차감 후 환불. 환불 처리 기간은 3~7 영업일 소요. 자세한 내용은 <a href="/terms" className="underline">이용약관 제8조</a>를 참고해주세요.</p>
                        </section>

                        {/* 법적 링크 */}
                        <nav className="flex flex-wrap gap-3">
                            <a href="/terms" className="underline">이용약관</a>
                            <a href="/privacy" className="font-semibold underline">개인정보처리방침</a>
                            <a href="/community-guidelines" className="underline">커뮤니티 가이드라인</a>
                            <a href="/location-terms" className="underline">위치기반 서비스 이용약관</a>
                        </nav>

                        {/* 사업자 정보 */}
                        <div className="space-y-1 pt-2 border-t border-gray-200">
                            <p><strong>메멘토애니</strong> | 대표 안승빈</p>
                            <p>사업자등록번호: 687-08-03135 | 업태: 정보통신업 | 종목: 포털 및 기타 인터넷 정보 매개 서비스업</p>
                            <p>소재지: 서울특별시 강북구 덕릉로41길 78-5, 1층 102호(번동)</p>
                            <p>전화: 010-5458-2506 | 이메일: sharkwind1@gmail.com</p>
                            <p className="pt-1">2026 메멘토애니. 모든 권리 보유.</p>
                        </div>
                    </div>
                </footer>
                <Toaster
                    position="top-center"
                    duration={5000}
                    toastOptions={{
                        className: 'shadow-2xl !bg-white dark:!bg-gray-800 !border-2 !border-gray-200 dark:!border-gray-700 !text-gray-800 dark:!text-gray-100 !text-base !font-medium !py-4 !px-5',
                        style: {
                            borderRadius: '14px',
                        },
                    }}
                    richColors
                    closeButton
                />
            </body>
        </html>
    );
}
