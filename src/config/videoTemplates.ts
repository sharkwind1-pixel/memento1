/**
 * AI 영상 생성 템플릿
 * Veo 3.1 Fast 최적화 프롬프트 (8초, 1080p, 9:16 세로)
 *
 * Veo 3.1은 장면 생성 능력이 뛰어나므로 배경 변환이 가능.
 * 프롬프트에 입력 이미지의 펫을 자연스럽게 새 환경에 배치하도록 유도.
 */

import { VideoTemplate } from "@/types";

/** 공통 퀄리티 접미사 */
const Q_FUN = "Hyper-realistic, cinematic 4K quality, vivid saturated colors, crisp detail, bright natural lighting, smooth fluid motion, professional cinematography.";
const Q_MEMORIAL = "Hyper-realistic, cinematic 4K quality, soft diffused golden lighting, gentle desaturation, dreamlike ethereal atmosphere, smooth fluid motion, professional cinematography.";

export const VIDEO_TEMPLATES: VideoTemplate[] = [
    // ===== 일상 모드 (fun) =====
    {
        id: "flower-field",
        name: "꽃밭에서 뛰어놀기",
        description: "화사한 봄 꽃밭을 신나게 달리는 모습",
        prompt: `Place this pet in a vast sunlit meadow filled with lavender and wildflowers. The pet runs joyfully, tongue out, ears bouncing. Bright golden sunlight, flower petals drifting in the breeze. Camera smoothly tracks the pet from the side. ${Q_FUN}`,
        icon: "Flower2",
        category: "fun",
    },
    {
        id: "beach-sunset",
        name: "해변 석양 산책",
        description: "노을 물드는 해변을 걷는 모습",
        prompt: `Place this pet on a pristine beach at golden hour sunset. The pet trots along the wet shoreline, gentle waves touching its paws, leaving footprints in the sand. Gorgeous orange and pink sky. Low angle cinematic shot with warm sun flares. ${Q_FUN}`,
        icon: "Waves",
        category: "fun",
    },
    {
        id: "snow-play",
        name: "첫눈 오는 날",
        description: "하얀 눈 속에서 신나게 뛰어노는 모습",
        prompt: `Place this pet in a magical snowy winter forest. The pet leaps and plays in fresh powdery snow, shaking snowflakes off its fur. Soft snowflakes falling everywhere, frosted pine trees in background. Slow motion, cool blue tones with warm highlights on the fur. ${Q_FUN}`,
        icon: "Snowflake",
        category: "fun",
    },
    {
        id: "autumn-walk",
        name: "단풍길 산책",
        description: "알록달록 단풍 속을 걷는 모습",
        prompt: `Place this pet on a scenic autumn forest path covered in golden and crimson maple leaves. The pet walks gracefully, occasionally pausing to sniff a leaf. Warm afternoon sunlight filtering through colorful canopy, leaves swirling gently. ${Q_FUN}`,
        icon: "Leaf",
        category: "fun",
    },
    {
        id: "park-picnic",
        name: "공원에서 소풍",
        description: "싱그러운 공원에서 행복한 한때",
        prompt: `Place this pet on a cozy picnic blanket in a lush green park. The pet yawns, stretches, and rolls over playfully. Dappled sunlight through tree leaves, gentle breeze. Slow cinematic push-in, warm pastel tones, dreamy atmosphere. ${Q_FUN}`,
        icon: "Sun",
        category: "fun",
    },
    {
        id: "rain-window",
        name: "비 오는 날 창가에서",
        description: "빗소리 들으며 창밖을 바라보는 모습",
        prompt: `This pet sits on a cozy window sill, watching raindrops streak down the glass. Warm interior lighting, rain creating beautiful patterns on the window. The pet's eyes follow a raindrop, then blinks slowly. Intimate close-up, warm interior contrasting cool rainy outside. ${Q_FUN}`,
        icon: "CloudRain",
        category: "fun",
    },

    // ===== 추모 모드 (memorial) =====
    {
        id: "rainbow-bridge",
        name: "무지개다리 건너편에서",
        description: "무지개빛 하늘 아래 평화로운 초원",
        prompt: `Place this pet on an endless lush green meadow under a magnificent double rainbow arching across a dreamy sky. Ethereal golden light, volumetric god rays through soft clouds. The pet looks peaceful and content, fur gently swaying in warm breeze. Slow cinematic push-in. ${Q_MEMORIAL}`,
        icon: "Rainbow",
        category: "memorial",
    },
    {
        id: "starry-garden",
        name: "별빛 정원에서",
        description: "별빛 가득한 정원에서 편안히 쉬는 모습",
        prompt: `Place this pet in a magical garden at night, surrounded by softly glowing flowers and fireflies. Breathtaking starry sky with the Milky Way above. The pet rests peacefully, soft moonlight illuminating its fur. Slow dolly out revealing the cosmic garden. ${Q_MEMORIAL}`,
        icon: "Star",
        category: "memorial",
    },
    {
        id: "cloud-walk",
        name: "구름 위를 걷다",
        description: "부드러운 구름 위를 산책하는 모습",
        prompt: `Place this pet walking gracefully on soft fluffy white clouds high above, bathed in warm golden sunset light. The pet steps lightly on cloud surfaces, looking peaceful and free. Heavenly atmosphere, warm peach and gold tones. Slow orbiting camera. ${Q_MEMORIAL}`,
        icon: "Cloud",
        category: "memorial",
    },
    {
        id: "cherry-blossom",
        name: "벚꽃 아래에서",
        description: "분홍 벚꽃이 흩날리는 봄날",
        prompt: `Place this pet under a magnificent cherry blossom tree in full bloom. Pink petals cascade gently around the pet like soft pink snow. Warm spring sunlight filters through the blossoms creating dappled light. The pet looks up at falling petals with gentle eyes. Slow motion. ${Q_MEMORIAL}`,
        icon: "Flower2",
        category: "memorial",
    },
    {
        id: "memorial-beach",
        name: "황금빛 해변에서",
        description: "따뜻한 석양 아래 해변을 거니는 모습",
        prompt: `Place this pet walking slowly along a quiet golden beach at sunset. Gentle waves softly touching its paws. Sky painted in warm amber and rose, sun low on horizon casting long golden reflections. The pet pauses and looks toward the horizon peacefully. ${Q_MEMORIAL}`,
        icon: "Sunset",
        category: "memorial",
    },
    {
        id: "sunbeam-nap",
        name: "따스한 햇살 속 낮잠",
        description: "포근한 햇살을 받으며 편안히 잠든 모습",
        prompt: `This pet sleeps peacefully on a soft cushion, warm afternoon sunbeams falling across its body. It breathes gently, occasionally twitching an ear. Golden dust motes float in the light. Intimate close-up, slow push-in, warm honey-gold tones, serene cozy atmosphere. ${Q_MEMORIAL}`,
        icon: "Sun",
        category: "memorial",
    },

    // ===== 변환 (transform) — 양쪽 모드 공통 =====
    {
        id: "hero-moment",
        name: "슈퍼히어로 변신",
        description: "우리 아이가 영웅이 되는 순간",
        prompt: `Transform this pet into a superhero standing on a city rooftop at sunset, wearing a flowing red cape billowing in the wind. Dramatic low angle shot, golden sky behind. The pet looks confident and heroic. Epic cinematic mood, dramatic rim lighting. ${Q_FUN}`,
        icon: "Shield",
        category: "transform",
    },
];
