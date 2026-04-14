/**
 * AI 영상 생성 템플릿
 * Veo 3.1 Fast 최적화 프롬프트 (8초, 1080p, 9:16 세로)
 *
 * ===== 프롬프트 작성 원칙 (CGI/카툰 방지) =====
 * 금지 단어: magical, ethereal, dreamlike, heavenly, mystical, cosmic,
 *           breathtaking, magnificent, divine, sacred, otherworldly, spiritual,
 *           enchanted, fairy-tale, fantasy
 * 필수 요소:
 *   1) 문장 시작에 "Real photograph / Real documentary footage" 명시
 *   2) 실제 카메라/렌즈 스펙 ("shot on Sony A7IV, 50mm f/1.8")
 *   3) 현실 조명 용어 ("golden hour", "blue hour", "overcast light")
 *   4) 자연스러운 질감 ("natural fur texture, real sunlight shadows")
 *   5) 네거티브 지시 ("no CGI, no cartoon, no stylization, no 3D render")
 * 장면 원칙:
 *   - 실제 존재하는 장소만 (초원, 해변, 도시, 집 안 등)
 *   - 판타지 공간 금지 (무지개다리 건너편, 구름 위 등)
 *   - 추모 모드도 현실적 서정 풍경 (일몰 초원, 반딧불 들판 등)
 */

import { VideoTemplate } from "@/types";

/** 공통 퀄리티 접미사 — 실사 강제 */
const Q_REAL = "Real photorealistic documentary footage, shot on Sony A7IV mirrorless camera, 50mm f/1.8 lens, natural skin and fur texture, authentic real-world lighting, no CGI, no animation, no cartoon style, no stylization, no 3D render, no illustration.";

/** 일상 모드 — 밝고 생동감 */
const Q_FUN = `${Q_REAL} Bright vivid colors, crisp sharp detail, fluid natural motion, professional nature photography.`;

/** 추모 모드 — 따뜻한 서정 (판타지 단어 배제) */
const Q_MEMORIAL = `${Q_REAL} Soft warm golden hour lighting, gentle color palette, peaceful atmosphere, slow graceful motion, cinematic documentary style.`;

export const VIDEO_TEMPLATES: VideoTemplate[] = [
    // ============================================================
    // ===== 일상 모드 (fun) — 실제 장소 기반 =====
    // ============================================================
    {
        id: "flower-field",
        name: "꽃밭에서 뛰어놀기",
        description: "봄 꽃밭을 신나게 달리는 모습",
        prompt: `Real documentary footage of this pet running through a sunlit lavender field, tongue out, ears bouncing naturally. Golden hour sunlight casts long shadows, real flower petals drift in a gentle breeze. Camera tracks the pet from the side at ground level. ${Q_FUN}`,
        icon: "Flower2",
        category: "fun",
    },
    {
        id: "beach-sunset",
        name: "해변 석양 산책",
        description: "노을이 지는 해변을 걷는 모습",
        prompt: `Real footage of this pet trotting along a wet sandy beach during golden hour sunset. Actual ocean waves gently touch its paws, real paw prints form in the sand. Natural orange and pink sunset sky. Low-angle handheld shot. ${Q_FUN}`,
        icon: "Waves",
        category: "fun",
    },
    {
        id: "snow-play",
        name: "첫눈 오는 날",
        description: "하얀 눈 속에서 신나게 노는 모습",
        prompt: `Real documentary footage of this pet leaping through fresh powdery snow in a real pine forest. Snow clings to its fur, breath visible in the cold air. Soft overcast daylight, real snowflakes falling. Slow motion capture, crisp winter details. ${Q_FUN}`,
        icon: "Snowflake",
        category: "fun",
    },
    {
        id: "autumn-walk",
        name: "단풍길 산책",
        description: "알록달록 단풍길을 걷는 모습",
        prompt: `Real footage of this pet walking on a forest path covered in actual maple leaves, warm afternoon sunlight filtering through the canopy. It pauses to sniff a leaf, natural head movements. Handheld tracking shot at pet eye-level. ${Q_FUN}`,
        icon: "Leaf",
        category: "fun",
    },
    {
        id: "park-picnic",
        name: "공원에서 소풍",
        description: "공원 잔디밭에서 뒹구는 모습",
        prompt: `Real footage of this pet relaxing on a checkered picnic blanket on green grass in a real city park. The pet yawns, stretches, rolls playfully. Dappled sunlight through tree leaves, real shadow play. Slow push-in from above. ${Q_FUN}`,
        icon: "Sun",
        category: "fun",
    },
    {
        id: "rain-window",
        name: "비 오는 날 창가에서",
        description: "빗방울을 바라보는 조용한 순간",
        prompt: `Real close-up footage of this pet sitting by a real window with rain streaks on the glass. Warm indoor lamp light, cool blue daylight outside. The pet watches a raindrop, blinks slowly, ears twitch naturally. Shallow depth of field. ${Q_FUN}`,
        icon: "CloudRain",
        category: "fun",
    },
    {
        id: "cafe-terrace",
        name: "카페 테라스에서",
        description: "햇살 좋은 카페에서 여유로운 시간",
        prompt: `Real footage of this pet sitting on a wooden chair at an outdoor cafe terrace. A coffee cup steams on the table, warm sunlight reflects off the glass. The pet looks around curiously, real head turns. Bokeh background with pedestrians. ${Q_FUN}`,
        icon: "Coffee",
        category: "fun",
    },
    {
        id: "city-walk",
        name: "도시 골목 산책",
        description: "감성 있는 골목길을 걷는 모습",
        prompt: `Real street photography footage of this pet walking down a cozy urban alley with vintage brick walls and hanging cafe signs. Natural late afternoon sunlight, real shadow contrast. Tracking shot following from behind at low angle. ${Q_FUN}`,
        icon: "Building",
        category: "fun",
    },
    {
        id: "poolside",
        name: "수영장 물놀이",
        description: "시원한 물가에서 더위 식히는 모습",
        prompt: `Real footage of this pet beside a clear swimming pool on a sunny summer day, water droplets glistening on its fur. It shakes off water in slow motion, real droplets flying. Bright natural sunlight, crisp water reflections. Side tracking shot. ${Q_FUN}`,
        icon: "Droplet",
        category: "fun",
    },
    {
        id: "camping-fire",
        name: "캠핑 모닥불 옆",
        description: "밤하늘 아래 따뜻한 모닥불과 함께",
        prompt: `Real footage of this pet lying on a wool blanket next to a real crackling campfire at dusk. Orange fire glow lights its fur, real embers rise gently. Natural twilight sky with actual stars emerging. Warm tones, intimate close-up. ${Q_FUN}`,
        icon: "Flame",
        category: "fun",
    },
    {
        id: "car-window",
        name: "자동차 여행",
        description: "바람 맞으며 차창 밖을 바라보는 모습",
        prompt: `Real footage of this pet riding in a car with its head out the window, ears flapping in the real wind. Road scenery blurs behind in natural motion blur. Warm afternoon sunlight on its face, genuine happy expression. Side close-up shot. ${Q_FUN}`,
        icon: "Car",
        category: "fun",
    },
    {
        id: "home-sofa",
        name: "집 소파에서 뒹굴기",
        description: "포근한 집에서 편안한 하루",
        prompt: `Real home-video footage of this pet sprawled on a cozy fabric sofa, sunlight streaming through a real window. It stretches, rolls, yawns naturally. Soft warm indoor lighting, natural fabric textures. Slow handheld push-in. ${Q_FUN}`,
        icon: "Home",
        category: "fun",
    },
    {
        id: "forest-trail",
        name: "숲길 탐험",
        description: "푸른 숲속 오솔길을 탐험하는 모습",
        prompt: `Real documentary footage of this pet walking a mossy forest trail surrounded by tall pine trees. Dappled sunbeams cut through real foliage, real dust motes visible in light. The pet sniffs the ground, ears alert. Gimbal tracking shot. ${Q_FUN}`,
        icon: "Trees",
        category: "fun",
    },

    // ============================================================
    // ===== 추모 모드 (memorial) — 현실적 서정 풍경 =====
    // ============================================================
    {
        id: "golden-meadow",
        name: "황금빛 초원에서",
        description: "노을이 물든 초원에서 평화로운 한때",
        prompt: `Real documentary footage of this pet standing in a wide grassy meadow during golden hour. Tall grass sways in a real breeze, warm backlit sunlight outlines its silhouette. It looks peacefully toward the horizon. Slow cinematic push-in, handheld subtle motion. ${Q_MEMORIAL}`,
        icon: "Sun",
        category: "memorial",
    },
    {
        id: "firefly-field",
        name: "반딧불이 들판",
        description: "반딧불이 빛나는 고요한 여름밤",
        prompt: `Real long-exposure nature footage of this pet sitting quietly in a grassy field at blue hour twilight. Actual fireflies glow around it naturally, soft deep blue sky above. Natural low-light photography, subtle ambient glow. Static wide shot. ${Q_MEMORIAL}`,
        icon: "Sparkles",
        category: "memorial",
    },
    {
        id: "mountain-ridge",
        name: "산 능선에서",
        description: "높은 산에서 바람을 맞으며 바라보는 모습",
        prompt: `Real documentary footage of this pet standing on a grassy mountain ridge, real clouds drifting below. Warm sunset light on its fur, real wind rustling the fur naturally. Wide cinematic landscape shot, gentle zoom out. ${Q_MEMORIAL}`,
        icon: "Mountain",
        category: "memorial",
    },
    {
        id: "cherry-blossom",
        name: "벚꽃 아래에서",
        description: "분홍 벚꽃잎이 흩날리는 봄날",
        prompt: `Real footage of this pet sitting under a real cherry blossom tree in full bloom. Actual pink petals fall softly in the breeze, natural dappled sunlight. The pet looks up gently as petals land on its fur. Low angle push-in, slow motion petals. ${Q_MEMORIAL}`,
        icon: "Flower2",
        category: "memorial",
    },
    {
        id: "memorial-beach",
        name: "황금빛 해변에서",
        description: "따뜻한 석양 해변을 거니는 모습",
        prompt: `Real footage of this pet walking slowly along a quiet beach at sunset. Real gentle waves touch its paws, real wet sand reflects the warm amber sky. It pauses, looks toward the horizon. Long slow tracking shot from the side. ${Q_MEMORIAL}`,
        icon: "Sunset",
        category: "memorial",
    },
    {
        id: "sunbeam-nap",
        name: "햇살 속 낮잠",
        description: "창으로 들어온 햇살을 받으며 잠든 모습",
        prompt: `Real intimate close-up footage of this pet sleeping on a soft cushion, warm afternoon sunbeams falling across its body through a window. Real dust motes float in the light. It breathes gently, an ear twitches. Slow push-in, warm honey tones. ${Q_MEMORIAL}`,
        icon: "Bed",
        category: "memorial",
    },
    {
        id: "lakeside-dawn",
        name: "새벽 호숫가",
        description: "물안개 낀 고요한 호수에서",
        prompt: `Real footage of this pet sitting by a calm lake at dawn, real morning mist hovering over the water. Soft pink and blue sunrise sky reflected on the water surface. The pet gazes at the water, still and peaceful. Wide static shot. ${Q_MEMORIAL}`,
        icon: "Waves",
        category: "memorial",
    },
    {
        id: "autumn-memorial",
        name: "가을 낙엽길",
        description: "단풍이 가득한 오후의 산책",
        prompt: `Real documentary footage of this pet walking slowly through real fallen maple and gingko leaves. Warm late-afternoon sun filters through bare branches. It stops, looks back gently. Handheld tracking at pet eye-level, warm amber tones. ${Q_MEMORIAL}`,
        icon: "Leaf",
        category: "memorial",
    },
    {
        id: "misty-forest",
        name: "안개 낀 숲",
        description: "고요한 아침 숲속에서",
        prompt: `Real footage of this pet standing in a real foggy forest at early morning. Soft diffused light filters through the mist between tree trunks. The pet stands still, ears alert, fur slightly damp from the fog. Slow slight dolly forward. ${Q_MEMORIAL}`,
        icon: "CloudFog",
        category: "memorial",
    },
    {
        id: "window-light",
        name: "창가 햇살 속에서",
        description: "커튼 사이로 들어온 빛 속에서",
        prompt: `Real indoor footage of this pet sitting in a patch of warm afternoon sunlight streaming through sheer curtains. Natural golden light outlines its fur, real dust particles dance in the beam. It blinks slowly, looks at the camera. Static shallow depth of field. ${Q_MEMORIAL}`,
        icon: "Sun",
        category: "memorial",
    },

    // ============================================================
    // ===== 변환 (transform) — 영화적 실사 ("판타지"가 아닌 "영화 씬") =====
    // ============================================================
    {
        id: "hero-moment",
        name: "슈퍼히어로 변신",
        description: "영화 속 영웅처럼 멋진 순간",
        prompt: `Cinematic live-action movie footage of this pet wearing a real red cape fluttering in the wind, standing on a real city rooftop at sunset. Dramatic low-angle shot, golden sky. Looks confident, heroic. Film-style color grading, real lighting. ${Q_REAL} Vivid cinematic contrast, natural sunset tones.`,
        icon: "Shield",
        category: "transform",
    },
    {
        id: "detective",
        name: "탐정 누와르",
        description: "비 오는 밤거리의 명탐정",
        prompt: `Cinematic film-noir style live-action footage of this pet wearing a small trench coat, sitting on a rainy city street at night under a real streetlamp. Real rain, real neon reflections on wet pavement. Moody blue and amber tones. Handheld detective-movie shot. ${Q_REAL}`,
        icon: "Search",
        category: "transform",
    },
    {
        id: "astronaut",
        name: "우주 비행사",
        description: "우주선 창문으로 지구를 바라보는 모습",
        prompt: `Cinematic live-action sci-fi movie footage of this pet wearing a small astronaut helmet, sitting inside a real spacecraft cabin. Real Earth visible through the window behind. Practical studio lighting, film-set realism. Slow zoom in. ${Q_REAL}`,
        icon: "Rocket",
        category: "transform",
    },
    {
        id: "vintage-photo",
        name: "빈티지 사진",
        description: "70년대 필름 사진 같은 느낌",
        prompt: `Real footage mimicking 1970s film photography of this pet in a sunlit vintage living room with wooden furniture and patterned wallpaper. Warm film-grain texture, natural window light, muted retro color palette. Slow handheld motion. ${Q_REAL}`,
        icon: "Camera",
        category: "transform",
    },

    // ============================================================
    // ===== 판타지 (fantasy) — "실사 영화 VFX" 스타일 =====
    // 카툰/애니메이션 금지, Lord of the Rings·Life of Pi 같은 라이브액션 판타지 영화 톤
    // ============================================================
    {
        id: "rainbow-bridge-real",
        name: "무지개가 뜬 초원",
        description: "무지개가 걸린 언덕을 바라보는 모습",
        prompt: `Live-action fantasy film footage of this pet standing on a real grassy hillside after rain, a practical real rainbow arcing across the sky. Wet grass glistens, real sunlight breaks through clouds. Shot on ARRI Alexa, anamorphic 35mm lens, cinematic color grade like Lord of the Rings. No animation, no cartoon, no stylization, no 3D render, real VFX compositing only.`,
        icon: "Rainbow",
        category: "fantasy",
    },
    {
        id: "milky-way-meadow",
        name: "은하수 들판",
        description: "은하수가 펼쳐진 밤하늘 아래",
        prompt: `Live-action astrophotography footage of this pet sitting on a real grassy field at night under a vivid Milky Way galaxy band. Real long-exposure night sky, practical starlight on fur, subtle moonlight. Shot on Sony A7S III high-ISO. No animation, no cartoon, no CGI stylization, real photography aesthetic of a BBC Planet Earth night sequence.`,
        icon: "Star",
        category: "fantasy",
    },
    {
        id: "aurora-forest",
        name: "오로라 아래 숲",
        description: "북극광이 춤추는 차가운 숲",
        prompt: `Live-action nature documentary footage of this pet standing in a real snowy pine forest under a real aurora borealis. Green and purple aurora lights the snow, breath visible in cold air. Shot on RED camera, National Geographic documentary style. No cartoon, no animation, no stylization, real long-exposure aurora photography.`,
        icon: "Sparkles",
        category: "fantasy",
    },
    {
        id: "cloud-ocean",
        name: "구름의 바다",
        description: "구름바다가 펼쳐진 고지대에서",
        prompt: `Live-action cinematic footage of this pet standing on a real rocky cliff overlooking a sea of clouds at sunrise, like real high-altitude mountain peaks above the cloud line. Warm amber sun breaking over cloud horizon. Shot on ARRI Alexa, Planet Earth documentary cinematography. No CGI stylization, no cartoon, no animation, real aerial-style cinematography.`,
        icon: "Cloud",
        category: "fantasy",
    },
    {
        id: "cherry-storm",
        name: "벚꽃 폭풍",
        description: "수많은 벚꽃잎이 휘몰아치는 순간",
        prompt: `Live-action cinematic slow-motion footage of this pet standing still as thousands of real cherry blossom petals swirl around in a strong wind. Shot on Phantom high-speed camera, real practical petals, natural late-afternoon sunlight. Film style like a Wong Kar-wai movie. No animation, no cartoon, no 3D render, practical effects only.`,
        icon: "Flower2",
        category: "fantasy",
    },
    {
        id: "underwater-light",
        name: "물속 빛의 향연",
        description: "물속에서 빛줄기가 내리는 모습",
        prompt: `Live-action underwater cinematography of this pet swimming gracefully in clear blue water, real god-rays of sunlight piercing the surface above. Real bubbles rise, natural water refraction. Shot on Red Dragon underwater housing, BBC Blue Planet documentary style. No animation, no cartoon, real underwater photography aesthetic.`,
        icon: "Droplet",
        category: "fantasy",
    },
    {
        id: "firefly-forest",
        name: "반딧불 숲의 밤",
        description: "수천 마리 반딧불이가 빛나는 밤의 숲",
        prompt: `Live-action long-exposure nature footage of this pet sitting in a real dark forest at night with thousands of real fireflies glowing around. Japanese Hotaru firefly photography style, deep blue night, subtle natural moonlight. Shot on Sony A7S III, high-ISO real photography. No cartoon, no animation, no CGI stylization.`,
        icon: "Sparkles",
        category: "fantasy",
    },
    {
        id: "lantern-festival",
        name: "등불 축제의 밤",
        description: "수많은 종이등이 떠오르는 아시아의 밤",
        prompt: `Live-action cinematic footage of this pet sitting by a calm river at night while real paper lanterns float up into the sky, like a real Thai or Taiwanese lantern festival. Warm orange lantern glow reflected on water. Shot on ARRI Alexa, film style like The Life of Pi. No animation, no cartoon, practical real-world lanterns only.`,
        icon: "Lamp",
        category: "fantasy",
    },
];
