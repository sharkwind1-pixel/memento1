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
