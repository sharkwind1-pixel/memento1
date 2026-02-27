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
        prompt: "The pet looks tiny and young like a baby puppy or kitten. Cinematic 4K, shallow depth of field, soft bokeh background with warm pastel nursery setting. The small pet tilts its head curiously, blinks slowly, and wiggles. Gentle dolly zoom, warm golden hour lighting, film grain texture.",
        icon: "Baby",
        category: "transform",
    },
    {
        id: "flower-field",
        name: "꽃밭에서 뛰어노는 모습",
        description: "화사한 꽃밭에서 행복하게 뛰어노는 영상",
        prompt: "The pet runs joyfully through a vast field of colorful wildflowers. Cinematic 4K, wide angle establishing shot, bright golden sunlight streaming through. Flower petals drift in the gentle breeze. Slow motion tracking shot, anamorphic lens flare, vivid saturated colors, professional color grading.",
        icon: "Flower2",
        category: "fun",
    },
    {
        id: "rainbow-bridge",
        name: "무지개다리 건너편에서",
        description: "무지개빛 하늘 아래 평화로운 모습",
        prompt: "The pet sits peacefully on a lush green meadow under a magnificent rainbow arching across a dreamy sky. Cinematic 4K, ethereal soft golden light, volumetric god rays through clouds. Gentle breeze moves the fur. Slow push-in camera, heavenly atmosphere, warm color palette, film-quality depth of field.",
        icon: "Rainbow",
        category: "memorial",
    },
    {
        id: "beach-walk",
        name: "해변 산책",
        description: "석양 물드는 해변을 걷는 모습",
        prompt: "The pet walks along the shoreline of a beautiful beach at golden hour sunset. Cinematic 4K, orange and pink sky reflected on wet sand. Gentle waves lap at the shore. Low angle tracking shot, lens flare from setting sun, warm cinematic color grading, shallow depth of field, professional film quality.",
        icon: "Waves",
        category: "fun",
    },
    {
        id: "snow-play",
        name: "첫눈 오는 날",
        description: "하얀 눈 속에서 신나게 뛰어노는 모습",
        prompt: "The pet plays excitedly in fresh powdery snow, snowflakes falling all around. Cinematic 4K, crisp winter wonderland setting, soft diffused daylight. The pet leaps and pounces in the snow. Slow motion capture, shallow depth of field with bokeh snowflakes, cool blue and white color palette, professional cinematography.",
        icon: "Snowflake",
        category: "fun",
    },
    {
        id: "hero-moment",
        name: "슈퍼히어로 변신",
        description: "우리 아이가 영웅이 되는 순간",
        prompt: "The pet stands heroically wearing a flowing red cape on a rooftop at sunset. Cinematic 4K, dramatic low angle shot, epic golden backlight. The cape flutters in the wind. Dynamic camera movement orbiting the pet, lens flare, dramatic color grading with deep shadows and vibrant highlights, blockbuster movie quality.",
        icon: "Shield",
        category: "transform",
    },
    {
        id: "starry-night",
        name: "별이 빛나는 밤",
        description: "별빛 아래 평화로운 밤 풍경",
        prompt: "The pet rests peacefully under a breathtaking starry night sky full of twinkling stars and the Milky Way. Cinematic 4K, soft moonlight illumination, gentle ambient glow. The pet breathes softly, eyes reflecting starlight. Slow dolly out revealing the vast cosmos, deep blue color palette, film grain, professional night photography quality.",
        icon: "Star",
        category: "memorial",
    },
    {
        id: "autumn-leaves",
        name: "가을 낙엽 산책",
        description: "알록달록 가을 풍경 속 산책",
        prompt: "The pet walks through a scenic autumn forest path covered in red, orange, and golden leaves. Cinematic 4K, warm afternoon light filtering through the canopy. Leaves drift and swirl gently around the pet. Steady tracking shot, rich warm color grading, shallow depth of field with beautiful bokeh, professional film quality.",
        icon: "Leaf",
        category: "fun",
    },
];
