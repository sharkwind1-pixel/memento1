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

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
};

export const metadata: Metadata = {
    metadataBase: new URL(
        process.env.NEXT_PUBLIC_SITE_URL || "https://mementoani.com"
    ),
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
    icons: {
        icon: "/logo.png",
        apple: "/logo.png",
    },
    openGraph: {
        type: "website",
        locale: "ko_KR",
        siteName: "메멘토애니",
        title: "메멘토애니 - 특별한 매일을 함께",
        description:
            "반려동물과 함께하는 모든 순간을 기록하고, 이별 후에도 따뜻한 추억을 간직하세요.",
        images: [
            {
                url: "/logo.png",
                width: 512,
                height: 512,
                alt: "메멘토애니 로고",
            },
        ],
    },
    twitter: {
        card: "summary",
        title: "메멘토애니 - 특별한 매일을 함께",
        description:
            "반려동물과 함께하는 모든 순간을 기록하고, 이별 후에도 따뜻한 추억을 간직하세요.",
        images: ["/logo.png"],
    },
    other: {
        "naver-site-verification": "",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko">
            <body className={inter.className}>
                <AuthProvider>
                    <PetProvider>{children}</PetProvider>
                </AuthProvider>
                <Toaster
                    position="top-center"
                    toastOptions={{
                        className: 'shadow-lg !bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !text-gray-800 dark:!text-gray-100',
                        style: {
                            borderRadius: '12px',
                        },
                    }}
                    richColors
                    closeButton
                />
            </body>
        </html>
    );
}
