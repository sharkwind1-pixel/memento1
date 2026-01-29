/**
 * 루트 레이아웃
 * AuthProvider로 전체 앱 감싸기
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PetProvider } from "@/contexts/PetContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "메멘토애니 - 반려동물과의 시간을 기록해도 괜찮은 장소",
    description: "일상부터 기억까지, 시간이 쌓이고 의미가 바뀌는 기록 플랫폼",
    keywords: ["반려동물", "펫", "추모", "기록", "커뮤니티", "AI 상담"],
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
            </body>
        </html>
    );
}
