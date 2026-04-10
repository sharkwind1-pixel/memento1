import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/constants/**/*.{js,ts}",
    "./src/data/**/*.{js,ts}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['Pretendard', 'system-ui', '-apple-system', 'sans-serif'],
  			display: ['Jalnan2', 'Pretendard', 'system-ui', 'sans-serif'],
  		},
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			wiggle: {
  				'0%, 100%': { transform: 'rotate(0deg)' },
  				'25%': { transform: 'rotate(-8deg)' },
  				'75%': { transform: 'rotate(8deg)' },
  			}
  		},
  		animation: {
  			wiggle: 'wiggle 2s ease-in-out infinite',
  		},
  		colors: {
  			// 메멘토 브랜드 색상 — 일상 모드 (Cyan-Blue)
  			memento: {
  				50:  '#FDF8F3',  // 페이지 배경 시작 (따뜻한 크림)
  				75:  '#FEFAF6',  // 페이지 배경 중간 (따뜻한 크림)
  				100: '#FFF3E8',  // Surface (카드, 호버, 배지)
  				200: '#BAE6FD',  // Light Surface (= sky-200)
  				300: '#7DD3FC',  // Border Accent (= sky-300)
  				400: '#38BDF8',  // Primary Light (= sky-400)
  				500: '#05B2DC',  // Primary (CTA 배경, 아이콘)
  				600: '#0891B2',  // Hover + 텍스트 (AA 5.9:1)
  				700: '#0369A1',  // Dark Text (AAA 7.1:1)
  				800: '#075985',  // Dark mode 텍스트
  				900: '#0C4A6E',  // Dark mode 배경
  				950: '#082F49',  // 최심 다크 배경
  			},
  			// 추모 모드 색상 — Memorial (Amber-Gold)
  			memorial: {
  				50:  '#FFFBEB',  // 추모 배경 (가장 밝은 금빛)
  				100: '#FEF3C7',  // 추모 Surface
  				200: '#FDE68A',  // 추모 Light
  				300: '#FCD34D',  // 추모 Accent
  				400: '#FBBF24',  // 추모 Primary Light
  				500: '#F59E0B',  // 추모 Primary
  				600: '#D97706',  // 추모 Hover
  				700: '#B45309',  // 추모 Dark Text
  				800: '#92400E',  // 추모 Dark mode
  				900: '#78350F',  // 추모 Dark bg
  				950: '#451A03',  // 추모 최심 다크
  			},
  			// shadcn/ui 색상
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
export default config;
