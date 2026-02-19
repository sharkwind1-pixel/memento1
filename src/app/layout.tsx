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
    title: "메멘토애니 - 특별한 매일을 함께",
    description: "일상부터 기억까지, 시간이 쌓이고 의미가 바뀌는 기록 플랫폼",
    keywords: ["반려동물", "펫", "추모", "기록", "커뮤니티", "AI 상담"],
    icons: {
        icon: "/logo.png",
        apple: "/logo.png",
    },
    openGraph: {
        title: "메멘토애니 - 특별한 매일을 함께",
        description: "일상부터 기억까지, 시간이 쌓이고 의미가 바뀌는 기록 플랫폼",
        images: ["/logo.png"],
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
                        style: {
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                        },
                        className: 'shadow-lg',
                    }}
                    richColors
                    closeButton
                />
            </body>
        </html>
    );
}
