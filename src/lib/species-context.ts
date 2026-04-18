/**
 * species-context.ts
 * 종별 사육 컨텍스트 — AI 펫톡 / 매거진 / 블로그 / 릴스 모두에서 공통 사용
 *
 * 메멘토애니는 "여러 반려동물을 함께 관리하는" 플랫폼 USP를 가진다.
 * 따라서 모든 AI 콘텐츠 생성 지점에서 이 모듈을 통해 종별 정확한 정보를 주입해야 한다.
 *
 * 사용처:
 * - src/app/api/cron/blog-generate/route.ts (블로그 + 릴스 대본)
 * - src/app/api/cron/magazine-generate/route.ts (매거진 기사)
 * - src/lib/magazine-generator.ts (매거진 generateArticle)
 * - src/app/api/chat/chat-prompts.ts (AI 펫톡 시스템 프롬프트)
 *
 * 새 AI 콘텐츠 생성 지점을 만들 때는 반드시 이 모듈에서 컨텍스트 가져와 주입할 것.
 */

import type { PetType } from "@/types";

/**
 * 반려동물 종 분류 (AI 콘텐츠 생성용)
 *
 * Pet.type은 "강아지|고양이|기타" 3분류이지만,
 * AI 콘텐츠는 더 세분화된 종을 알아야 정확한 정보를 줄 수 있다.
 * "기타" 종은 breed 필드로부터 추론한다 (inferSpeciesFromPet 참고).
 */
export type PetSpecies =
    | "강아지" | "고양이"
    | "햄스터" | "기니피그" | "토끼" | "친칠라" | "고슴도치" | "페럿"
    | "앵무새" | "문조" | "카나리아"
    | "거북이" | "도마뱀" | "게코" | "이구아나"
    | "물고기" | "새우"
    | "공통"; // 종 무관 (펫로스, 계절, 보편 주제)

/**
 * 종별 핵심 사육 컨텍스트
 * - 한국에서 잘못 알려진 정보를 정확히 교정
 * - 분류학적 특성, 흔한 사망 원인, 응급 상황
 * - AI에 주입되어 정확하고 종별 특화된 답변/콘텐츠 생성
 */
export const SPECIES_CONTEXT: Record<PetSpecies, string> = {
    "강아지": "강아지는 사회적 동물로 분리불안에 민감합니다. 견종마다 운동량/유전질환이 크게 다르므로 견종별 특성을 반영하세요. 한국에서는 소형견 위주(말티즈, 푸들, 포메라니안 등)가 많아 슬개골 탈구, 치주질환, 기관허탈 등이 흔합니다.",
    "고양이": "고양이는 영역 동물이며 환경 변화에 매우 민감합니다. 의무적 육식동물(obligate carnivore)이라 단백질 요구량이 개보다 높습니다. 만성신부전(CKD), 하부요로계 질환(FLUTD), 비만이 가장 흔한 건강 문제입니다.",
    "햄스터": "햄스터는 야행성 단독 생활 동물입니다. 합사 절대 금지(시리안), 드워프류도 어렸을 때만 일시 합사 가능. 평균 수명 2~3년으로 짧고, 종양 발생률이 높습니다. 케이지 최소 면적은 시리안 기준 60×40cm 이상 권장. 쳇바퀴는 시리안 21cm, 드워프 17cm 이상이 척추 건강에 필수.",
    "기니피그": "기니피그는 군집 동물로 1마리 사육이 동물복지법상 권장되지 않습니다. 비타민C를 체내 합성 못하므로 사료/채소로 매일 보충 필요. 케이지는 2마리 기준 0.7m² 이상. 발바닥피부염(bumblefoot)과 부정교합이 흔한 질환.",
    "토끼": "토끼는 의무적 초식동물로 건초가 식단의 80% 이상이어야 합니다. 한국에서 흔한 오해: 펠릿 위주 급여, 당근 과다 급여 → 위정체와 비만의 원인. 케이지 사육보다 방사 사육 권장. 부정교합과 요로결석이 가장 흔한 질환.",
    "친칠라": "친칠라는 안데스 고지대 출신으로 25도 이상 열에 매우 취약합니다(열사병 위험). 모래목욕 필수(주 2~3회), 물목욕 절대 금지(곰팡이 감염). 평균 수명 15~20년으로 길어 장기 책임이 필요합니다. 부정교합, 모피탈락, 소화기 정체가 흔한 질환.",
    "고슴도치": "고슴도치는 야행성 단독 동물로 합사 금지. 곤충식 위주(고품질 고양이 사료 + 밀웜 보충 가능). 적정 온도 24~28도(저온 시 위면 hibernation으로 사망 가능). 한국에서 가장 흔한 사망 원인은 저온, WHS(Wobbly Hedgehog Syndrome), 종양.",
    "페럿": "페럿은 의무적 육식동물이며 매우 활동적이라 하루 최소 4시간 방사 필요. 일반 시리얼/과일 절대 금지(인슐린종 위험). 평균 수명 6~8년. 부신질환, 인슐린종, 림프종이 노령 페럿의 3대 사망 원인. 종합백신(디스템퍼)과 광견병 접종 필수.",
    "앵무새": "앵무새는 매우 지능이 높고 사회적입니다(까마귀와 비슷한 인지 수준). 종에 따라 수명 10~80년까지 다양. 깃털뽑기(feather plucking)는 스트레스/지루함의 신호. 아보카도, 카페인, 초콜릿, PTFE(테플론) 가스 절대 금지(즉사 위험). PBFD, 사이타쿠스병 같은 전염병 주의.",
    "문조": "문조는 군집성 작은 핀치과 새. 단독 사육 시 외로움/스트레스가 큽니다. 고온다습 환경 출신이라 한국 겨울에 보온 필수(20도 이상 유지). 평균 수명 7~10년. 알막힘(egg binding), 호흡기 감염이 흔한 질환.",
    "카나리아": "카나리아는 노래를 부르는 핀치과 새로 수컷만 노래합니다. 단독 사육이 일반적이며, 짝짓기 외에는 합사 시 싸움 위험. 비만과 진드기 감염이 흔한 문제. 평균 수명 10~15년.",
    "거북이": "거북이는 변온동물로 UVB 조명과 적정 온도(종마다 다름)가 필수. 한국에서 흔한 오해: 채광이 자외선이라고 착각 → UVB 조명 없이 사육 시 대사성 골질환(MBD) 발생. 수생/반수생/육생 따라 사육 방식이 완전히 다릅니다.",
    "도마뱀": "도마뱀은 종마다 사육 환경이 극단적으로 다릅니다(사막/열대우림/초지). UVB와 온도구배(basking spot vs cool zone) 필수. 비어디 드래곤, 레오파드 게코, 크레스티드 게코가 한국에서 가장 흔한 종.",
    "게코": "게코(특히 레오파드 게코, 크레스티드 게코)는 초보자에게 적합한 도마뱀이지만 UVB는 여전히 권장됩니다(과거에는 불필요하다고 알려졌으나 최근 연구는 D3 합성에 도움). 레오파드 게코는 사막종이라 보온이 중요(주간 28~32도, 야간 21~24도).",
    "이구아나": "이구아나는 100% 초식이며, 동물성 단백질 급여 시 신부전으로 이어집니다. 성체는 1.5m 이상 자라며 매우 공격적이 될 수 있습니다. UVB 필수, 일광욕 권장. 한국에서는 사육 환경 부족으로 방치되거나 유기되는 경우가 많아 신중한 입양이 필요합니다.",
    "물고기": "관상어는 종마다 수질 요구가 다릅니다. 사이클링(질소 사이클) 없이 입수 시 질소 중독으로 사망. 어항 크기, pH, 경도, 온도 매개변수가 핵심. 디스커스/구피/베타/금붕어 등 종별로 케어 차이가 큽니다.",
    "새우": "관상새우(체리쉬림프, 크리스탈쉬림프 등)는 수질에 매우 민감하며, 구리(Cu) 함유 약품에 즉사. 어항은 안정화된 후 입수해야 합니다. TDS, GH, KH가 종별로 다릅니다.",
    "공통": "메멘토애니는 '희노애락을 함께하는 곳' — 단순 정보 제공을 넘어 보호자의 마음을 어루만지는 톤이 중요합니다.",
};

/**
 * 종별 영문 학술 검색 키워드 (Tavily 검색용)
 * 한국어 자료가 부족한 엑조틱 종은 영문 키워드를 함께 던져 학술 자료를 보강.
 */
export const SPECIES_ENGLISH_KEYWORDS: Partial<Record<PetSpecies, string>> = {
    "햄스터": "hamster care welfare RSPCA exotic vet",
    "기니피그": "guinea pig care welfare cavies vitamin C",
    "토끼": "rabbit care welfare RWAF House Rabbit Society",
    "친칠라": "chinchilla care temperature exotic vet",
    "고슴도치": "hedgehog care wobbly hedgehog syndrome WHS exotic",
    "페럿": "ferret care insulinoma adrenal disease exotic vet",
    "앵무새": "parrot care avian vet feather plucking PTFE",
    "문조": "java sparrow finch care",
    "카나리아": "canary care breeding song",
    "거북이": "turtle tortoise care UVB MBD reptile",
    "도마뱀": "lizard care UVB temperature gradient reptile",
    "게코": "gecko care leopard crested UVB reptile",
    "이구아나": "green iguana herbivore care reptile",
    "물고기": "aquarium fish nitrogen cycle care",
    "새우": "cherry shrimp neocaridina aquarium care",
};

/**
 * 펫의 type + breed로부터 정확한 PetSpecies를 추론한다.
 *
 * Pet.type이 "강아지" / "고양이"면 그대로 매핑.
 * "기타"인 경우 breed 필드를 분석해 18종 중 매칭되는 것을 찾는다.
 *
 * 매칭 안 되면 "공통"을 반환하지 않고 가장 가까운 카테고리(기본: 햄스터/소형 포유류)로 폴백.
 * 단, breed가 비어있고 type이 "기타"면 "공통"으로 폴백 (USP 보호: 일반화 X).
 */
export function inferSpeciesFromPet(petType: PetType, breed?: string | null): PetSpecies {
    if (petType === "강아지") return "강아지";
    if (petType === "고양이") return "고양이";

    // type === "기타" — breed로 추론
    if (!breed) return "공통";

    const b = breed.toLowerCase().trim();

    // 한글 + 영문 키워드 매칭 (가장 specific 한 것부터)
    const matchers: Array<{ keywords: string[]; species: PetSpecies }> = [
        // 작은 포유류
        { keywords: ["햄스터", "hamster", "시리안", "드워프", "로보로브스키", "로보"], species: "햄스터" },
        { keywords: ["기니피그", "guinea pig", "guineapig", "기니"], species: "기니피그" },
        { keywords: ["토끼", "rabbit", "bunny", "라빗", "더치", "롭이어", "안고라"], species: "토끼" },
        { keywords: ["친칠라", "chinchilla"], species: "친칠라" },
        { keywords: ["고슴도치", "hedgehog", "헤지호그"], species: "고슴도치" },
        { keywords: ["페럿", "페릿", "ferret", "fitch"], species: "페럿" },

        // 새
        { keywords: ["문조", "java sparrow", "자바스패로우"], species: "문조" },
        { keywords: ["카나리아", "canary"], species: "카나리아" },
        { keywords: [
            "앵무", "parrot", "코카티엘", "왕관앵무", "회색앵무", "그레이",
            "사랑새", "버드지", "budgie", "마카오", "macaw", "코뉴어", "conure",
            "아마존", "amazon", "로리", "lory", "잉꼬",
        ], species: "앵무새" },

        // 파충류
        { keywords: [
            "게코", "gecko", "레오파드", "크레스티드", "크레", "톡케이",
            "크레스", "lepard",
        ], species: "게코" },
        { keywords: ["이구아나", "iguana"], species: "이구아나" },
        { keywords: [
            "도마뱀", "lizard", "비어디", "bearded", "스킹크", "skink",
            "모니터", "monitor", "카멜레온", "chameleon",
        ], species: "도마뱀" },
        { keywords: [
            "거북", "turtle", "tortoise", "터틀", "남생이", "자라", "쿠터",
            "슬라이더", "헤르만", "리쿠가메",
        ], species: "거북이" },

        // 수서
        { keywords: [
            "새우", "쉬림프", "shrimp", "체리", "비쉬림프", "크리스탈",
            "수정새우", "타이거", "neocaridina", "caridina",
        ], species: "새우" },
        { keywords: [
            "물고기", "fish", "구피", "guppy", "베타", "betta", "디스커스", "discus",
            "금붕어", "goldfish", "엔젤", "angelfish", "테트라", "tetra",
            "코리도라스", "코리", "관상어", "열대어", "민물고기", "해수어",
        ], species: "물고기" },
    ];

    for (const m of matchers) {
        if (m.keywords.some((kw) => b.includes(kw))) {
            return m.species;
        }
    }

    // 매칭 실패 — 보호자가 등록한 breed를 알 수 없는 종.
    // "공통"으로 폴백 (일반화된 톤으로 응답하되 breed는 그대로 노출)
    return "공통";
}

/**
 * 종별 의성어/인사말 — AI 펫톡 오프닝/의성어 주입용.
 * 서버·클라이언트 모두 공통 사용 (chat-prompts.ts / chatUtils.ts 등).
 * 18종 + "공통" 모두 커버.
 */
export function getSpeciesSound(species: PetSpecies): string {
    switch (species) {
        case "강아지": return "멍멍!";
        case "고양이": return "야옹~";
        case "햄스터": return "찌익~";
        case "기니피그": return "위잇위잇~";
        case "토끼": return "쀼우~";
        case "친칠라": return "키킥~";
        case "고슴도치": return "푸~";
        case "페럿": return "독독독~";
        case "앵무새": return "안녕~";
        case "문조": return "삐익~";
        case "카나리아": return "찌리리~";
        case "거북이": return "..."; // 거북이는 조용
        case "도마뱀":
        case "게코": return "쩝~";
        case "이구아나": return "푸쉬~";
        case "물고기": return "뽀그르~";
        case "새우": return "또각~";
        case "공통":
        default: return "안녕!";
    }
}

/**
 * 종별 사람 친화적 라벨 — UI 문구용.
 * pet.type은 DB값(강아지/고양이/기타)이지만 "기타"는 유저에게 어색하므로
 * breed 기반 species로 추론해 구체 종명을 노출한다.
 */
export function getSpeciesLabel(species: PetSpecies): string {
    if (species === "공통") return "반려동물";
    return species;
}

/**
 * 시스템 프롬프트에 주입할 종별 컨텍스트 블록 생성
 * 사용처: 블로그/매거진/AI 펫톡 어디든 동일한 형식으로 주입 가능
 *
 * @param species 종 분류
 * @param options.includeKorMisconceptions 한국 오해 교정 지침 포함 여부 (기본 true)
 * @param options.includeExoticGuidance 엑조틱 지침 포함 여부 (기본 true)
 */
export function getSpeciesContextBlock(
    species: PetSpecies,
    options: { includeKorMisconceptions?: boolean; includeExoticGuidance?: boolean } = {}
): string {
    const { includeKorMisconceptions = true, includeExoticGuidance = true } = options;

    const baseContext = SPECIES_CONTEXT[species] || SPECIES_CONTEXT["공통"];
    const isExotic = !["강아지", "고양이", "공통"].includes(species);

    const blocks: string[] = [
        `## 종별 핵심 컨텍스트 (${species})`,
        baseContext,
    ];

    if (isExotic && includeExoticGuidance) {
        blocks.push(
            "",
            "## 특수반려동물(엑조틱) 작성 지침",
            "- 한국에서 잘못 알려진 정보를 정확히 교정 (예: \"예전에는 ~라고 알려졌지만, 최신 연구는 ~\")",
            "- 분류학적 특성을 자연스럽게 녹임 (야행성/주행성, 사회성/단독성, 변온/항온 등)",
            "- 일반 동물병원이 아닌 \"엑조틱 전문 동물병원\"이 필요한 경우 명시",
            "- 사육이 \"쉬워 보이지만 실제로는 까다로운\" 측면을 솔직하게 전달",
        );
    }

    if (includeKorMisconceptions) {
        blocks.push(
            "",
            "## 절대 하지 말 것",
            "- \"강아지/고양이만 반려동물\"이라는 뉘앙스 (메멘토애니는 모든 종을 평등하게 다룸)",
            "- 종별 특성을 무시한 일반론 (예: 햄스터에게 \"산책시키세요\")",
            "- 근거 없는 민간요법, 특정 브랜드 직접 추천, 수의사 진료 대체 진단",
        );
    }

    return blocks.join("\n");
}

/**
 * Tavily 검색 쿼리에 종별 영문 키워드를 자동으로 부착
 */
export function enhanceSearchQueryWithSpecies(baseQuery: string, species: PetSpecies): string {
    const eng = SPECIES_ENGLISH_KEYWORDS[species];
    if (!eng) return baseQuery;
    return `${baseQuery} ${eng}`;
}

/**
 * 엑조틱 종 여부 (강아지/고양이/공통이 아닌 모든 종)
 */
export function isExoticSpecies(species: PetSpecies): boolean {
    return !["강아지", "고양이", "공통"].includes(species);
}
