/**
 * AI 영상 생성 템플릿
 * 사용자가 선택할 수 있는 프리셋 프롬프트 모음
 */

import { VideoTemplate } from "@/types";

export const VIDEO_TEMPLATES: VideoTemplate[] = [
    {
        id: "puppy-days",
        name: "아기 시절로 돌아가기",
        description: "사랑스러운 아기 시절의 모습으로 변신",
        prompt: "Transform this pet photo into an adorable puppy/kitten version, make it playful and cute, gentle camera movement, soft warm lighting",
        icon: "Baby",
        category: "transform",
    },
    {
        id: "flower-field",
        name: "꽃밭에서 뛰어노는 모습",
        description: "화사한 꽃밭에서 행복하게 뛰어노는 영상",
        prompt: "Animate this pet running happily through a beautiful flower field, bright sunny day, gentle breeze, flowers swaying, joyful movement",
        icon: "Flower2",
        category: "fun",
    },
    {
        id: "rainbow-bridge",
        name: "무지개다리 건너편에서",
        description: "무지개빛 하늘 아래 평화로운 모습",
        prompt: "Place this pet in a peaceful heavenly meadow with rainbow-colored sky, soft golden light, gentle clouds, serene atmosphere, slow gentle camera movement",
        icon: "Rainbow",
        category: "memorial",
    },
    {
        id: "beach-walk",
        name: "해변 산책",
        description: "석양 물드는 해변을 걷는 모습",
        prompt: "Animate this pet walking along a beautiful beach at sunset, waves gently crashing, golden hour lighting, peaceful atmosphere",
        icon: "Waves",
        category: "fun",
    },
    {
        id: "snow-play",
        name: "첫눈 오는 날",
        description: "하얀 눈 속에서 신나게 뛰어노는 모습",
        prompt: "Animate this pet playing joyfully in fresh snow, snowflakes falling gently, winter wonderland setting, playful energy",
        icon: "Snowflake",
        category: "fun",
    },
    {
        id: "hero-moment",
        name: "슈퍼히어로 변신",
        description: "우리 아이가 영웅이 되는 순간",
        prompt: "Transform this pet into a superhero with a cape, dramatic heroic pose, dynamic camera movement, epic lighting, fun atmosphere",
        icon: "Shield",
        category: "transform",
    },
    {
        id: "starry-night",
        name: "별이 빛나는 밤",
        description: "별빛 아래 평화로운 밤 풍경",
        prompt: "Place this pet under a beautiful starry night sky, cozy and peaceful atmosphere, moonlight illumination, gentle breathing animation, warm feeling",
        icon: "Star",
        category: "memorial",
    },
    {
        id: "autumn-leaves",
        name: "가을 낙엽 산책",
        description: "알록달록 가을 풍경 속 산책",
        prompt: "Animate this pet walking through autumn leaves, colorful fall foliage, leaves gently falling, warm golden light, cozy atmosphere",
        icon: "Leaf",
        category: "fun",
    },
];
