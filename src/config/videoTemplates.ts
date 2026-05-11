/**
 * AI 영상 생성 템플릿 (Veo 3.1 Fast 고도화 프롬프트)
 *
 * 설계 원칙 (Google Veo 3.1 공식 가이드 준수):
 *  1. [Cinematography] + [Subject Action 3-beat] + [Context Sensory] + [Lighting] + [Style/Lens]
 *  2. 카메라 워크를 맨 앞에 명시 (Veo가 우선 인식하는 신호)
 *  3. 8초 안에 시작→중간→끝 액션 시퀀스를 명확히 분배
 *  4. "Place this pet" 같은 명령형 제거 (image-to-video는 이미지에서 subject 자동 인식)
 *  5. "4K quality" 같은 모호한 키워드 대신 구체적 영화 레퍼런스 (35mm film, Studio Ghibli 등)
 *  6. 렌즈/심도 명시 (shallow depth of field, 85mm portrait 등)
 *  7. negative prompt를 inverse description으로 (예: "no glitches, no morphing")
 *
 * 카테고리 분배: 일상 9개 / 추모 8개 / 판타지 3개 = 총 20개
 *
 * 오디오 정책:
 *  - 현재 generate_audio: false 유지 (route.ts/lib/fal.ts)
 *  - 추후 일상 모드만 베타 토글 예정. 추모 모드는 영구 무음.
 */

import { VideoTemplate } from "@/types";

// ============================================================
// 스타일 접미사 — 영화적 레퍼런스 기반 (구체적일수록 Veo 인식 ↑)
// ============================================================

/** 일상 모드: 따뜻하고 생동감 있는 영화적 톤 */
const S_DAILY = `Shot on 35mm film with shallow depth of field, vibrant saturated yet natural color grading, photorealistic detail, smooth steady camera, golden hour cinematography aesthetic. Maintain consistent subject features throughout, no morphing, no glitches.`;

/** 추모 모드: 영화 같은 부드러움, 따뜻한 빛, 절제된 색감 */
const S_MEMORIAL = `Shot on 85mm portrait lens with creamy bokeh, ethereal pastel palette with golden highlights, dreamlike atmosphere reminiscent of Studio Ghibli cinematography, gentle smooth motion. Maintain consistent subject features, no harsh shadows, no abrupt transitions, no morphing.`;

/** 판타지/변환: Pixar 스타일 또는 디오라마 미학 */
const S_FANTASY = `Cinematic Pixar-style rendering with painterly textures, vivid storybook colors, dramatic depth of field, exaggerated whimsical motion. Maintain consistent subject identity, no glitches, no distorted anatomy.`;

// ============================================================
// 20개 템플릿
// ============================================================

export const VIDEO_TEMPLATES: VideoTemplate[] = [
    // ============================================================
    // 일상 모드 (9개) — 사계절 + 다양한 환경 + 시간대
    // ============================================================
    {
        id: "flower-field",
        name: "꽃밭에서 뛰어놀기",
        description: "화사한 봄 꽃밭을 신나게 달리는 모습",
        prompt: `Wide tracking shot following the pet from the side as it sprints joyfully through a vast sunlit lavender and wildflower meadow. Beat 1: the pet bounds forward, tongue lolling, ears bouncing rhythmically. Beat 2: it leaps over a small cluster of daisies mid-stride. Beat 3: it slows and turns its head toward camera with bright eyes. Wildflowers brush against its legs, petals drift through warm golden hour light, distant hills softly out of focus. ${S_DAILY}`,
        icon: "Flower2",
        category: "fun",
    },
    {
        id: "beach-sunset",
        name: "해변 석양 산책",
        description: "노을 물드는 해변을 걷는 모습",
        prompt: `Low-angle tracking shot at the waterline as the pet trots along a pristine beach at golden hour. Beat 1: paws press into wet sand, leaving glistening prints. Beat 2: a gentle wave foams over its feet, the pet pauses and shakes off droplets in slow motion. Beat 3: it gazes toward the orange-pink horizon, sunset sun flares washing across the lens. Sky painted in amber and rose, golden reflections shimmer on wet sand. ${S_DAILY}`,
        icon: "Waves",
        category: "fun",
    },
    {
        id: "snow-play",
        name: "첫눈 오는 날",
        description: "하얀 눈 속에서 신나게 뛰어노는 모습",
        prompt: `Medium tracking shot from a slight low angle, following the pet bounding through a magical snowy pine forest. Beat 1: it leaps into a fresh powder drift, snow exploding around it. Beat 2: it shakes its body vigorously, snowflakes flying off its fur in slow motion. Beat 3: it looks up as fresh snowflakes drift down, blinking. Frosted evergreens line the background, cool blue tones contrasted with warm rim light on the fur. ${S_DAILY}`,
        icon: "Snowflake",
        category: "fun",
    },
    {
        id: "autumn-walk",
        name: "단풍길 산책",
        description: "알록달록 단풍 속을 걷는 모습",
        prompt: `Slow cinematic dolly shot tracking the pet from behind along a scenic autumn forest path covered in crimson and gold maple leaves. Beat 1: it walks gracefully, leaves crunching softly underfoot. Beat 2: it pauses, lowers its head to sniff a single bright red leaf. Beat 3: a gust of wind swirls leaves into the air around it as it looks up. Warm afternoon sunlight filters through the colorful canopy, painting dappled patterns on the path. ${S_DAILY}`,
        icon: "Leaf",
        category: "fun",
    },
    {
        id: "park-picnic",
        name: "공원에서 소풍",
        description: "싱그러운 공원에서 행복한 한때",
        prompt: `Slow cinematic push-in toward the pet lounging on a checkered picnic blanket in a lush green park. Beat 1: it yawns wide, stretching its front paws forward lazily. Beat 2: it rolls onto its back, paws lifting playfully into the air. Beat 3: it settles back upright and tilts its head curiously toward camera. Dappled sunlight filters through swaying tree leaves, a gentle breeze ruffles its fur, warm pastel summer tones. ${S_DAILY}`,
        icon: "Sun",
        category: "fun",
    },
    {
        id: "rain-window",
        name: "비 오는 날 창가에서",
        description: "빗소리 들으며 창밖을 바라보는 모습",
        prompt: `Intimate close-up shot of the pet sitting on a cozy window sill, gazing at raindrops streaking down the glass. Beat 1: its eyes track a single droplet sliding down the pane. Beat 2: it blinks slowly, then exhales softly, fogging a small patch of glass. Beat 3: it tilts its head as a louder raindrop hits the window. Warm interior lamp light contrasts the cool blue-gray rain outside, soft focus on the misted window beyond. ${S_DAILY}`,
        icon: "CloudRain",
        category: "fun",
    },
    {
        id: "campfire-night",
        name: "모닥불 캠핑",
        description: "별빛 아래 모닥불 옆에서 따뜻하게",
        prompt: `Medium shot, slow orbiting camera around the pet curled up beside a glowing campfire in a forest clearing at night. Beat 1: flames flicker, casting warm dancing light across its fur. Beat 2: the pet's eyes catch the firelight as it watches sparks rise. Beat 3: it nestles deeper into a soft blanket, exhaling contentedly. Starry sky visible above pine silhouettes, ember sparks drift upward into the dark, rich orange firelight against cool blue night. ${S_DAILY}`,
        icon: "Flame",
        category: "fun",
    },
    {
        id: "cafe-terrace",
        name: "카페 테라스에서",
        description: "따뜻한 햇살 속 카페 한 켠",
        prompt: `Medium shot from a slightly elevated angle, the pet sitting beside a small ceramic cup on a sunlit cafe terrace table. Beat 1: it sniffs curiously at the cup, ears perked forward. Beat 2: a gentle breeze ruffles the menu paper on the table, the pet turns its head toward it. Beat 3: it looks back at camera and blinks slowly. Brick wall in soft bokeh background, climbing ivy plants, dappled sunlight through a striped awning, warm honey-gold midday tones. ${S_DAILY}`,
        icon: "Coffee",
        category: "fun",
    },
    {
        id: "bubble-play",
        name: "비누방울 놀이",
        description: "무지갯빛 비누방울 사이로 신나게",
        prompt: `Wide shot with floating bokeh particles, the pet playfully chasing iridescent rainbow soap bubbles in a sunny backyard. Beat 1: it jumps up to swat at a large bubble, tongue out. Beat 2: the bubble pops with a tiny shimmer of mist on its nose, it freezes in surprise. Beat 3: it bounds toward another cluster of bubbles drifting in the breeze. Green grass field, soft pastel summer sky, bubbles catching prism light reflections, slow whimsical motion. ${S_DAILY}`,
        icon: "Sparkles",
        category: "fun",
    },

    // ============================================================
    // 추모 모드 (8개) — 따뜻한 추억, 평화로운 분위기
    // ============================================================
    {
        id: "rainbow-bridge",
        name: "무지개다리 건너편에서",
        description: "무지개빛 하늘 아래 평화로운 초원",
        prompt: `Slow cinematic push-in toward the pet sitting serenely in an endless emerald meadow under a magnificent double rainbow arching across a dreamy pastel sky. Beat 1: its fur lifts gently in a warm breeze, eyes half-closed in contentment. Beat 2: it blinks slowly, then opens its eyes fully. Beat 3: it turns its head toward the camera with a peaceful, knowing gaze. Volumetric god rays pierce through soft cumulus clouds, a luminous rim of golden backlight outlines its silhouette. ${S_MEMORIAL}`,
        icon: "Rainbow",
        category: "memorial",
    },
    {
        id: "starry-garden",
        name: "별빛 정원에서",
        description: "별빛 가득한 정원에서 편안히 쉬는 모습",
        prompt: `Slow dolly-out from a tight close-up revealing the pet resting peacefully in a magical garden at night, surrounded by softly glowing white flowers and dancing fireflies. Beat 1: a firefly drifts close to its nose, the pet's eyes follow it. Beat 2: it exhales softly, breath visible in the cool air. Beat 3: the camera continues pulling back to reveal the Milky Way stretching across the sky above. Soft moonlight illuminates its fur, bioluminescent flowers cast gentle blue-white glow. ${S_MEMORIAL}`,
        icon: "Star",
        category: "memorial",
    },
    {
        id: "cloud-walk",
        name: "구름 위를 걷다",
        description: "부드러운 구름 위를 산책하는 모습",
        prompt: `Slow orbiting camera at eye level as the pet walks gracefully across soft, billowing white clouds high in a warm sunset sky. Beat 1: it steps lightly, paws sinking softly into the cloud surface. Beat 2: it pauses, looking outward over the cloudscape below, ears perked. Beat 3: a warm sunbeam breaks through and bathes it in golden light. Endless cloud horizon below, peach and gold tones in the sky, heavenly atmosphere with subtle particle motes drifting. ${S_MEMORIAL}`,
        icon: "Cloud",
        category: "memorial",
    },
    {
        id: "cherry-blossom",
        name: "벚꽃 아래에서",
        description: "분홍 벚꽃이 흩날리는 봄날",
        prompt: `Medium shot, slow upward tilt revealing the pet sitting beneath a magnificent cherry blossom tree in full bloom. Beat 1: a few pink petals drift down and settle on its head, the pet blinks slowly. Beat 2: a gentle breeze releases a cascade of petals swirling around it like soft pink snow. Beat 3: the pet looks up toward the canopy with peaceful, gentle eyes. Warm spring sunlight filters through the blossoms creating dappled pastel light, slow motion petal fall throughout. ${S_MEMORIAL}`,
        icon: "Flower2",
        category: "memorial",
    },
    {
        id: "memorial-beach",
        name: "황금빛 해변에서",
        description: "따뜻한 석양 아래 해변을 거니는 모습",
        prompt: `Wide cinematic side-tracking shot, the pet walking slowly along a quiet golden beach at sunset. Beat 1: gentle waves roll in, foam softly kissing its paws. Beat 2: the pet pauses, gazing out toward the horizon where the sun rests low. Beat 3: it lifts its head as a long golden ray illuminates its face, eyes glowing warmly. Sky painted in deep amber and rose, sun casting long golden reflections across wet sand, distant gulls silhouetted against the glow. ${S_MEMORIAL}`,
        icon: "Sunset",
        category: "memorial",
    },
    {
        id: "sunbeam-nap",
        name: "따스한 햇살 속 낮잠",
        description: "포근한 햇살을 받으며 편안히 잠든 모습",
        prompt: `Intimate slow push-in toward the pet sleeping peacefully on a soft cream cushion, bathed in a warm afternoon sunbeam. Beat 1: its chest rises and falls gently with each breath. Beat 2: an ear twitches faintly, paw flexing in a dream. Beat 3: it shifts slightly, settling deeper into sleep with a contented sigh. Golden dust motes float in the angled sunlight, warm honey-gold tones, soft window-frame shadows fall across the cushion, serene cozy interior atmosphere. ${S_MEMORIAL}`,
        icon: "Sun",
        category: "memorial",
    },
    {
        id: "lake-reflection",
        name: "호수 위 평온",
        description: "잔잔한 호수 앞에서의 고요한 시간",
        prompt: `Wide cinematic shot at lake level, the pet sitting at the edge of a perfectly still mirror-like lake at dawn. Beat 1: its reflection ripples gently as a soft breeze passes. Beat 2: a single fallen leaf lands on the water, creating slow concentric ripples. Beat 3: the pet looks down at its own reflection, head tilting slightly. Mist drifts low across the water surface, distant mountains in soft pastel haze, pale lavender and pink dawn sky reflecting on the lake. ${S_MEMORIAL}`,
        icon: "Droplet",
        category: "memorial",
    },
    {
        id: "misty-meadow",
        name: "새벽 안개 들꽃 언덕",
        description: "몽환적인 새벽 안개와 들꽃 속에서",
        prompt: `Medium tracking shot at low angle, the pet standing peacefully atop a wildflower-covered hillside at early dawn shrouded in soft mist. Beat 1: a delicate breeze sways tall grass and white wildflowers around its legs. Beat 2: it lifts its head and breathes in the cool morning air, breath visible. Beat 3: the rising sun pierces through the mist, casting long golden god rays around its silhouette. Pastel lavender mist, dew-laden flowers catching morning light, ethereal dreamlike haze. ${S_MEMORIAL}`,
        icon: "Mountain",
        category: "memorial",
    },

    // ============================================================
    // 판타지/변환 (3개) — 재미 + 시즌 마케팅 활용 가능
    // ============================================================
    {
        id: "hero-moment",
        name: "슈퍼히어로 변신",
        description: "우리 아이가 영웅이 되는 순간",
        prompt: `Dramatic low-angle shot, the pet standing heroically on a city rooftop at sunset wearing a flowing red superhero cape. Beat 1: the cape billows powerfully in the wind, the pet's gaze fixed on the horizon. Beat 2: it slowly turns its head toward camera, eyes confident and noble. Beat 3: the wind gusts stronger, cape rippling dramatically as warm sunset light flares behind. Sweeping city skyline silhouetted in golden hour glow, dramatic rim lighting, lens flare, epic cinematic mood. ${S_FANTASY}`,
        icon: "Shield",
        category: "transform",
    },
    {
        id: "astronaut",
        name: "우주 비행사 펫",
        description: "우주에서 떠다니는 작은 영웅",
        prompt: `Wide cinematic shot, the pet wearing a custom-fitted white astronaut suit with a clear bubble helmet, floating weightlessly in space. Beat 1: it slowly rotates, paws extended, ears floating upward in zero gravity. Beat 2: a small Earth globe appears in the background, glowing blue and white. Beat 3: the pet turns to face camera through the helmet visor, eyes wide with wonder. Distant stars and nebulae in deep cosmic backdrop, soft rim light on the suit, dreamy weightless motion. ${S_FANTASY}`,
        icon: "Rocket",
        category: "transform",
    },
    {
        id: "hanbok-festival",
        name: "한복 입은 우리 아이",
        description: "전통 한복을 입고 명절 분위기 속에서",
        prompt: `Medium shot, the pet wearing a tiny custom-fitted traditional Korean hanbok with delicate pastel silk patterns, sitting in a sunlit hanok courtyard. Beat 1: it sits regally, hanbok skirt gently fanning out around it. Beat 2: a single cherry blossom petal drifts down onto its head, it blinks. Beat 3: it tilts its head curiously toward camera, ears perked. Wooden hanok beams and paper lanterns in soft bokeh background, warm afternoon sunlight, traditional Korean color palette of soft pink, jade green, and pale gold. ${S_FANTASY}`,
        icon: "Flower",
        category: "transform",
    },
];
