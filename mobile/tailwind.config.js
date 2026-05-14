/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                // 메멘토애니 브랜드 컬러 (mobile/lib/theme.ts와 단일 출처 일치)
                // 50/75/100은 따뜻한 크림 (페이지 배경), 200부터 sky 계열
                memento: {
                    50:  "#FDF8F3",
                    75:  "#FEFAF6",
                    100: "#FFF3E8",
                    200: "#BAE6FD",
                    300: "#7DD3FC",
                    400: "#38BDF8",
                    500: "#05B2DC",
                    600: "#0891B2",
                    700: "#0369A1",
                    800: "#075985",
                    900: "#0C4A6E",
                    950: "#082F49",
                },
                memorial: {
                    50:  "#FFFBEB",
                    100: "#FEF3C7",
                    200: "#FDE68A",
                    300: "#FCD34D",
                    400: "#FBBF24",
                    500: "#F59E0B",
                    600: "#D97706",
                    700: "#B45309",
                    800: "#92400E",
                    900: "#78350F",
                },
            },
            fontFamily: {
                sans: ["System"],
            },
        },
    },
    plugins: [],
};
