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
                // 메멘토애니 브랜드 컬러 (웹과 동일)
                memento: {
                    50:  "#E0F7FF",
                    100: "#B3EDFF",
                    200: "#80E0FF",
                    300: "#4DD3FF",
                    400: "#26C8FF",
                    500: "#05B2DC",
                    600: "#0490B5",
                    700: "#036F8E",
                    800: "#024F66",
                    900: "#012F40",
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
