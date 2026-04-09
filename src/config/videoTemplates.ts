/**
 * AI 영상 생성 템플릿
 * Kling 2.6 Pro 최적화 프롬프트 (10초, 4K 시네마틱 실사)
 *
 * 공통 프롬프트 규칙:
 * - 반드시 "Ultra-realistic, photorealistic, cinematic 4K" 포함
 * - 카메라 움직임 명시 (tracking, dolly, orbiting 등)
 * - 조명/색감 톤앤매너 명시
 * - 동물의 구체적 움직임/액션 명시
 */

import { VideoTemplate } from "@/types";

/** 공통 퀄리티 접미사 */
const Q = "Ultra-realistic, photorealistic, cinematic 4K UHD, shot on ARRI Alexa, shallow depth of field, natural film grain, professional color grading.";

export const VIDEO_TEMPLATES: VideoTemplate[] = [
    // ===== 일상 모드 (fun) =====
    {
        id: "flower-field",
        name: "꽃밭에서 뛰어놀기",
        description: "화사한 봄 꽃밭을 신나게 달리는 모습",
        prompt: `The pet runs joyfully through a vast sunlit meadow filled with lavender, daisies, and wildflowers. It leaps playfully, tongue out, ears flapping in the wind. Bright golden hour sunlight streaming through, flower petals swirling in the gentle breeze. Wide angle tracking shot following the pet, anamorphic lens flare, vivid saturated warm tones. ${Q}`,
        icon: "Flower2",
        category: "fun",
    },
    {
        id: "beach-sunset",
        name: "해변 석양 산책",
        description: "노을 물드는 해변을 함께 걷는 모습",
        prompt: `The pet trots happily along the wet shoreline of a pristine beach at golden hour sunset. Gentle waves lap at its paws, leaving tiny footprints in the sand. Orange, pink, and purple sky reflected on the water surface. Low angle cinematic tracking shot, warm golden backlight with sun flares, rich warm color palette. ${Q}`,
        icon: "Waves",
        category: "fun",
    },
    {
        id: "snow-play",
        name: "첫눈 오는 날",
        description: "하얀 눈 속에서 신나게 뛰어노는 모습",
        prompt: `The pet plays excitedly in fresh powdery snow in a magical winter forest. It leaps, pounces, and rolls in the snow, shaking snowflakes off its fur. Soft snowflakes falling all around, crisp winter wonderland with frosted pine trees. Slow motion tracking shot, cool blue and white palette with warm highlights on the fur, bokeh snowflakes. ${Q}`,
        icon: "Snowflake",
        category: "fun",
    },
    {
        id: "autumn-walk",
        name: "가을 단풍길 산책",
        description: "알록달록 단풍 속을 걷는 모습",
        prompt: `The pet walks gracefully through a scenic autumn forest path, golden and crimson maple leaves carpeting the ground. It pauses to sniff a leaf, then continues walking as leaves drift and swirl around. Warm afternoon light filtering through the canopy, rich amber and orange color grading. Steady dolly tracking shot. ${Q}`,
        icon: "Leaf",
        category: "fun",
    },
    {
        id: "park-picnic",
        name: "공원에서 소풍",
        description: "싱그러운 공원에서 행복한 한때",
        prompt: `The pet lies on a cozy picnic blanket in a lush green park, surrounded by soft cushions and a wicker basket. It yawns contentedly, stretches, and rolls over playfully. Dappled sunlight through tree leaves, gentle breeze rustling the grass. Slow push-in camera movement, warm pastel tones, dreamy soft focus background. ${Q}`,
        icon: "Sun",
        category: "fun",
    },
    {
        id: "rain-window",
        name: "비 오는 날 창가에서",
        description: "빗소리 들으며 창밖을 바라보는 모습",
        prompt: `The pet sits on a window sill, peacefully watching rain drops streak down the glass. Cozy warm interior lighting, raindrops creating beautiful patterns on the window. The pet's eyes follow a raindrop, then it blinks slowly and yawns. Intimate close-up, soft warm interior vs cool blue rain outside, gentle dolly zoom. ${Q}`,
        icon: "CloudRain",
        category: "fun",
    },

    // ===== 추모 모드 (memorial) =====
    {
        id: "rainbow-bridge",
        name: "무지개다리 건너편에서",
        description: "무지개빛 하늘 아래 평화로운 초원",
        prompt: `The pet sits peacefully on an endless lush green meadow under a magnificent double rainbow arching across a dreamy golden sky. Ethereal volumetric god rays pierce through soft clouds, illuminating the pet with warm heavenly light. The pet looks content, fur gently swaying in a warm breeze. Slow cinematic push-in, heavenly warm golden atmosphere. ${Q}`,
        icon: "Rainbow",
        category: "memorial",
    },
    {
        id: "starry-night",
        name: "별이 빛나는 밤",
        description: "별빛 아래 평화롭게 쉬는 모습",
        prompt: `The pet rests peacefully on a hilltop under a breathtaking starry night sky, the Milky Way stretching across the cosmos. Soft moonlight gently illuminates its fur, eyes reflecting the twinkling starlight. Fireflies dance softly around. Ultra slow dolly out revealing the vast night sky, deep blue and indigo palette with warm moonlight accents. ${Q}`,
        icon: "Star",
        category: "memorial",
    },
    {
        id: "cloud-walk",
        name: "구름 위를 걷다",
        description: "부드러운 구름 위를 산책하는 모습",
        prompt: `The pet walks gracefully on soft fluffy white clouds high above the earth, bathed in warm golden sunset light. It steps lightly, leaving gentle impressions in the cloud surface, occasionally looking down at the beautiful world below. Ethereal atmosphere, volumetric light, heavenly warm peach and gold tones. Slow orbiting camera movement. ${Q}`,
        icon: "Cloud",
        category: "memorial",
    },
    {
        id: "cherry-blossom",
        name: "벚꽃 아래에서",
        description: "분홍 벚꽃이 흩날리는 봄날의 모습",
        prompt: `The pet sits serenely under a magnificent cherry blossom tree in full bloom. Pink petals cascade gently around it like soft snow, some landing on its fur. Warm spring sunlight filters through the blossoms, creating dappled light patterns. The pet looks up at the falling petals with a gentle expression. Slow motion, dreamy soft pink and warm tones. ${Q}`,
        icon: "Flower2",
        category: "memorial",
    },
    {
        id: "memorial-beach",
        name: "황금빛 해변에서",
        description: "따뜻한 석양 아래 해변을 거니는 모습",
        prompt: `The pet walks slowly along a quiet golden beach at sunset, gentle waves softly touching its paws. The sky is painted in warm amber and rose hues, the sun low on the horizon casting a long golden reflection on the water. The pet pauses, looks toward the horizon peacefully. Cinematic slow tracking shot, warm nostalgic golden tones. ${Q}`,
        icon: "Sunset",
        category: "memorial",
    },
    {
        id: "sunbeam-nap",
        name: "따스한 햇살 속 낮잠",
        description: "포근한 햇살을 받으며 편안히 잠든 모습",
        prompt: `The pet sleeps peacefully on a soft cushion by a sunlit window, warm afternoon sunbeams falling across its body. It breathes gently, occasionally twitching an ear in a dream. Dust motes float in the golden light. Intimate close-up, ultra slow dolly, warm honey-gold tones, cozy and serene atmosphere. ${Q}`,
        icon: "Sun",
        category: "memorial",
    },

    // ===== 변환 (transform) — 양쪽 모드 공통 =====
    {
        id: "hero-moment",
        name: "슈퍼히어로 변신",
        description: "우리 아이가 영웅이 되는 순간",
        prompt: `The pet stands heroically on a city rooftop at sunset, wearing a flowing red superhero cape that billows dramatically in the wind. Dynamic low angle shot looking up at the pet against the golden sky. The cape flutters powerfully, the pet's expression is confident and noble. Epic orchestral mood, dramatic rim lighting, bold cinematic contrast. ${Q}`,
        icon: "Shield",
        category: "transform",
    },
];
