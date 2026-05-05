/**
 * AI 영상 생성 템플릿 (모바일)
 *
 * 웹 src/config/videoTemplates.ts와 id/category 동기화.
 * 프롬프트 본문은 서버가 보유 — 클라이언트는 id만 전송한다.
 */

import { Ionicons } from "@expo/vector-icons";

export type VideoTemplateCategory = "fun" | "memorial" | "transform";

export interface MobileVideoTemplate {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    category: VideoTemplateCategory;
}

export const VIDEO_TEMPLATES: MobileVideoTemplate[] = [
    // ===== 일상 모드 (fun) =====
    { id: "flower-field", name: "꽃밭에서 뛰어놀기", description: "화사한 봄 꽃밭을 신나게 달리는 모습", icon: "flower-outline", category: "fun" },
    { id: "beach-sunset", name: "해변 석양 산책", description: "노을 물드는 해변을 걷는 모습", icon: "water-outline", category: "fun" },
    { id: "snow-play", name: "첫눈 오는 날", description: "하얀 눈 속에서 신나게 뛰어노는 모습", icon: "snow-outline", category: "fun" },
    { id: "autumn-walk", name: "단풍길 산책", description: "알록달록 단풍 속을 걷는 모습", icon: "leaf-outline", category: "fun" },
    { id: "park-picnic", name: "공원에서 소풍", description: "싱그러운 공원에서 행복한 한때", icon: "sunny-outline", category: "fun" },
    { id: "rain-window", name: "비 오는 날 창가에서", description: "빗소리 들으며 창밖을 바라보는 모습", icon: "rainy-outline", category: "fun" },

    // ===== 추모 모드 (memorial) =====
    { id: "rainbow-bridge", name: "무지개다리 건너편에서", description: "무지개빛 하늘 아래 평화로운 초원", icon: "color-palette-outline", category: "memorial" },
    { id: "starry-garden", name: "별빛 정원에서", description: "별빛 가득한 정원에서 편안히 쉬는 모습", icon: "star-outline", category: "memorial" },
    { id: "cloud-walk", name: "구름 위를 걷다", description: "부드러운 구름 위를 산책하는 모습", icon: "cloud-outline", category: "memorial" },
    { id: "cherry-blossom", name: "벚꽃 아래에서", description: "분홍 벚꽃이 흩날리는 봄날", icon: "flower-outline", category: "memorial" },
    { id: "memorial-beach", name: "황금빛 해변에서", description: "따뜻한 석양 아래 해변을 거니는 모습", icon: "partly-sunny-outline", category: "memorial" },
    { id: "sunbeam-nap", name: "따스한 햇살 속 낮잠", description: "포근한 햇살을 받으며 편안히 잠든 모습", icon: "sunny-outline", category: "memorial" },

    // ===== 변환 (transform) =====
    { id: "hero-moment", name: "슈퍼히어로 변신", description: "우리 아이가 영웅이 되는 순간", icon: "shield-outline", category: "transform" },
];

export const CATEGORY_LABEL: Record<VideoTemplateCategory, string> = {
    fun: "재미",
    memorial: "기억",
    transform: "변신",
};
