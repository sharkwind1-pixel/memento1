/**
 * AI 펫톡 케어 레퍼런스 DB
 * 할루시네이션 방어를 위한 검증된 케어 정보
 *
 * 원칙:
 * 1. 수의학 교과서/공식 가이드라인 기반 정보만 수록
 * 2. 프롬프트 토큰 최적화를 위해 핵심만 압축
 * 3. 강아지(dog)와 고양이(cat) 분기
 * 4. "확실한 것만 말하고, 불확실하면 수의사 권장" 원칙
 */

// ============================================
// 1. 독성 음식 레퍼런스 (강아지/고양이 공통 + 개별)
// ============================================

/** 위험도 등급 */
export type ToxicityLevel = "fatal" | "dangerous" | "caution";

interface ToxicFood {
    name: string;
    level: ToxicityLevel;
    reason: string;
}

/** 강아지 독성 음식 (공통 포함) */
export const DOG_TOXIC_FOODS: ToxicFood[] = [
    // 치명적 (소량으로도 위험)
    { name: "자일리톨", level: "fatal", reason: "급격한 저혈당, 간 손상. 껌/치약/무설탕 식품 주의" },
    { name: "초콜릿", level: "fatal", reason: "테오브로민 성분. 다크>밀크>화이트 순 위험. 체중 1kg당 20mg 이상 위험" },
    { name: "포도/건포도", level: "fatal", reason: "신부전 유발. 품종/양 무관하게 소량도 위험" },
    { name: "양파/파/부추/마늘", level: "fatal", reason: "적혈구 파괴, 용혈성 빈혈. 익혀도 독성 유지" },
    { name: "마카다미아", level: "fatal", reason: "구토, 떨림, 고체온. 체중 1kg당 2g 이상 위험" },
    // 사람 약물 (절대 투여 금지)
    { name: "아세트아미노펜(타이레놀)", level: "fatal", reason: "특히 고양이 치명적. 간 괴사, 적혈구 손상. 절대 투여 금지" },
    { name: "이부프로펜(애드빌)", level: "fatal", reason: "위장관 출혈, 신부전. 사람 진통제 절대 투여 금지" },
    { name: "나프록센(탁센)", level: "fatal", reason: "NSAIDs 계열. 위궤양, 신장 손상. 사람 약 절대 금지" },
    // 위험 (중등도)
    { name: "아보카도", level: "dangerous", reason: "페르신 성분. 구토, 설사 유발" },
    { name: "카페인(커피/차)", level: "dangerous", reason: "심박수 증가, 발작 가능" },
    { name: "알코올", level: "dangerous", reason: "소량으로도 구토, 저혈당, 호흡곤란" },
    { name: "생감자/토마토(푸른 부분)", level: "dangerous", reason: "솔라닌 성분. 소화기 장애" },
    // 주의
    { name: "우유/유제품", level: "caution", reason: "유당불내증 개체 많음. 설사 가능" },
    { name: "날달걀", level: "caution", reason: "살모넬라 위험, 비오틴 흡수 방해" },
    { name: "생연어/송어", level: "caution", reason: "연어중독(네오리켓시아). 익히면 안전" },
    { name: "뼈(익힌 것)", level: "caution", reason: "조각이 날카롭게 부서져 장 천공 위험. 생뼈가 안전" },
];

/** 고양이 추가 독성 음식 (공통은 강아지와 동일 + 아래 추가) */
export const CAT_EXTRA_TOXIC_FOODS: ToxicFood[] = [
    { name: "백합/수선화", level: "fatal", reason: "꽃/잎/꽃가루 모두 급성 신부전 유발. 고양이에게 치명적" },
    { name: "참치(사람용 통조림)", level: "caution", reason: "수은 축적, 영양 불균형. 가끔 소량만" },
    { name: "개사료", level: "caution", reason: "타우린/아라키돈산 부족. 장기 급여 시 심장/시력 문제" },
    { name: "에센셜 오일/티트리", level: "dangerous", reason: "간 대사 불가. 피부 접촉도 위험" },
];

/** 안전한 음식 (강아지/고양이 공통) */
export const SAFE_FOODS = {
    dog: [
        "삶은 닭가슴살(무양념)", "삶은 소고기(기름 제거)", "당근(생/삶은)",
        "고구마(삶은/구운)", "호박(삶은)", "사과(씨/심 제거)",
        "블루베리", "수박(씨 제거)", "오이", "브로콜리(소량)",
        "삶은 달걀", "바나나(소량)", "삶은 연어",
    ],
    cat: [
        "삶은 닭가슴살(무양념)", "삶은 연어/참치(소량)", "호박(삶은/퓨레)",
        "삶은 달걀(소량)", "수박(씨 제거, 소량)", "당근(삶은/잘게)",
    ],
};

// ============================================
// 2. 증상별 긴급도 및 대응 가이드
// ============================================

export type UrgencyLevel = "emergency" | "urgent" | "monitor" | "normal";

interface SymptomGuide {
    symptom: string;
    urgency: UrgencyLevel;
    action: string;
    vetRequired: boolean;
}

export const SYMPTOM_GUIDES: SymptomGuide[] = [
    // 응급 (즉시 병원)
    { symptom: "발작/경련", urgency: "emergency", action: "즉시 동물병원. 억지로 입 벌리지 말 것. 주변 위험물 치우기", vetRequired: true },
    { symptom: "호흡곤란/잇몸 청색", urgency: "emergency", action: "즉시 동물병원. 기도 확보, 목 주변 압박물 제거", vetRequired: true },
    { symptom: "의식 저하/기절", urgency: "emergency", action: "즉시 동물병원. 체온 유지하며 이동", vetRequired: true },
    { symptom: "독성 물질 섭취", urgency: "emergency", action: "즉시 동물병원. 먹은 것/양/시간 기록. 임의로 구토 유발하지 말 것", vetRequired: true },
    { symptom: "교통사고/외상 출혈", urgency: "emergency", action: "즉시 동물병원. 깨끗한 천으로 압박 지혈. 움직임 최소화", vetRequired: true },
    { symptom: "배뇨 불능/계속 힘줌", urgency: "emergency", action: "특히 수컷 고양이는 24시간 내 치명적. 즉시 병원", vetRequired: true },

    // 긴급 (24시간 내 병원)
    { symptom: "구토 3회 이상/하루", urgency: "urgent", action: "금식 후 관찰. 혈액/이물질 섞이면 즉시 병원", vetRequired: true },
    { symptom: "피가 섞인 대변", urgency: "urgent", action: "사진 찍어두고 24시간 내 병원. 수분 섭취 유지", vetRequired: true },
    { symptom: "고열(39.5도 이상)", urgency: "urgent", action: "시원한 곳 이동, 물 제공. 해열제 임의 투여 금지. 당일 병원", vetRequired: true },
    { symptom: "2일 이상 식욕 부진", urgency: "urgent", action: "특히 고양이는 48시간 절식 시 지방간 위험. 병원 권장", vetRequired: true },
    { symptom: "심한 설사(지속)", urgency: "urgent", action: "탈수 주의. 전해질 보충. 24시간 지속 시 병원", vetRequired: true },

    // 관찰 (가정 관찰 + 필요시 병원)
    { symptom: "가벼운 기침", urgency: "monitor", action: "환기, 먼지 제거. 3일 이상 지속/악화 시 병원", vetRequired: false },
    { symptom: "귀 긁기/머리 흔들기", urgency: "monitor", action: "귀 안쪽 확인(냄새/분비물). 외이염 가능. 악화 시 병원", vetRequired: false },
    { symptom: "피부 긁기/붉어짐", urgency: "monitor", action: "알러지/기생충 가능. 부위 확인. 1주일 이상 시 병원", vetRequired: false },
    { symptom: "눈물/눈곱 증가", urgency: "monitor", action: "생리식염수로 닦아주기. 충혈/부종 동반 시 병원", vetRequired: false },
    { symptom: "발 핥기(과도한)", urgency: "monitor", action: "스트레스/알러지/통증 가능. 지속 시 병원", vetRequired: false },
];

// ============================================
// 3. 예방접종/정기 케어 스케줄
// ============================================

interface VaccineSchedule {
    name: string;
    puppy: string;   // 어린 시기
    adult: string;    // 성견/성묘
    note: string;
}

export const DOG_VACCINES: VaccineSchedule[] = [
    { name: "종합백신(DHPPL)", puppy: "6-8주 시작, 2-4주 간격 3-4회", adult: "매년 1회 추가접종", note: "홍역/파보/전염성간염/파라인플루엔자/렙토스피라" },
    { name: "광견병", puppy: "12-16주 첫 접종", adult: "매년 1회", note: "법정 의무접종" },
    { name: "켄넬코프(기관지염)", puppy: "6-8주 시작", adult: "매년 1회", note: "다견 환경/호텔/미용 시 필수" },
    { name: "심장사상충 예방", puppy: "12주부터", adult: "매월 1회(경구/외용)", note: "연중 예방 권장. 먹이기 전 검사 필수" },
    { name: "내/외부 구충", puppy: "2주부터 가능", adult: "1-3개월 간격", note: "구충제 종류에 따라 주기 상이" },
];

export const CAT_VACCINES: VaccineSchedule[] = [
    { name: "종합백신(FVRCP)", puppy: "6-8주 시작, 3-4주 간격 3회", adult: "매년-3년 1회", note: "범백/칼리시/허피스바이러스" },
    { name: "광견병", puppy: "12-16주", adult: "매년 1회", note: "실외 활동 시 필수" },
    { name: "FeLV(백혈병)", puppy: "8주 이후 2회", adult: "위험 환경 시 매년", note: "다묘 가정/실외 활동 시 권장" },
    { name: "심장사상충 예방", puppy: "8주부터", adult: "매월 1회(외용)", note: "실내 고양이도 권장" },
    { name: "내/외부 구충", puppy: "6주부터", adult: "1-3개월 간격", note: "고양이 전용 제품만 사용(개용 제품 독성)" },
];

// ============================================
// 4. 나이별 케어 포인트
// ============================================

interface AgeCareGuide {
    stage: string;
    ageRange: string;
    keyPoints: string[];
}

export const DOG_AGE_CARE: AgeCareGuide[] = [
    { stage: "퍼피", ageRange: "0-12개월", keyPoints: ["사회화 훈련(3-14주 골든타임)", "예방접종 스케줄 준수", "이물 삼킴 주의", "1일 3-4회 소량 급여"] },
    { stage: "성견", ageRange: "1-7세", keyPoints: ["연 1-2회 건강검진", "체중 관리(BCS 4-5/9)", "치석 관리(양치 주 3회+)", "정기 구충"] },
    { stage: "시니어", ageRange: "7세 이상", keyPoints: ["6개월 1회 건강검진+혈액검사", "관절 보조제 고려", "저칼로리 식이", "인지 기능 관찰", "치과 검진 강화"] },
];

export const CAT_AGE_CARE: AgeCareGuide[] = [
    { stage: "키튼", ageRange: "0-12개월", keyPoints: ["사회화(2-7주 골든타임)", "예방접종 스케줄 준수", "중성화(5-6개월 권장)", "1일 3-4회 소량 급여"] },
    { stage: "성묘", ageRange: "1-10세", keyPoints: ["연 1회 건강검진", "체중 관리(이상적 BCS 5/9)", "음수량 관찰(하루 체중 1kg당 40-60ml)", "비뇨기 건강 체크"] },
    { stage: "시니어", ageRange: "10세 이상", keyPoints: ["6개월 1회 건강검진+혈액/소변검사", "갑상선/신장 기능 모니터링", "관절 건강", "음수량/배뇨 패턴 변화 관찰"] },
];

// ============================================
// 5. 할루시네이션 방어 규칙
// ============================================

/**
 * 프롬프트에 삽입할 할루시네이션 방어 규칙 텍스트
 */
export const HALLUCINATION_GUARD_RULES = `### 케어 정확성 규칙
1. 위 레퍼런스 정보 -> 확신 있게. 품종 특성 -> "보통 ~하다고 하더라!" 식.
2. 모르는 것/개체차 -> "수의사 선생님이 더 잘 아실 거야~"
3. 절대 금지: 약 용량/처방/브랜드명/확률 수치 날조/사람 약/민간요법
4. 제품은 유형만 ("소형견용 덴탈 간식"). "펫샵에서 우리 품종에 맞는 걸 추천받아봐!"
5. 화법: 확실 -> "선생님한테 들었는데~" / 불확실 -> "선생님이 더 잘 아실 거야!"`;

/**
 * 펫이 케어 정보를 전달할 때의 프레이밍 규칙
 * HALLUCINATION_GUARD_RULES에 통합됨 — 하위 호환용 빈 문자열
 */
export const CARE_FRAMING_RULES = ``;

// ============================================
// 6. 프롬프트용 압축 레퍼런스 생성 함수
// ============================================

/**
 * 반려동물 타입에 따른 케어 레퍼런스 텍스트 생성
 * 프롬프트 삽입용 (토큰 최적화)
 */
export function buildCareReferencePrompt(petType: "강아지" | "고양이" | "기타"): string {
    const isDog = petType === "강아지";
    const isCat = petType === "고양이";

    // 기타 동물은 간략한 범용 정보만
    if (!isDog && !isCat) {
        return `### 케어 레퍼런스
일반: 초콜릿/포도/양파/자일리톨/카페인 모든 반려동물에 독성. 이상 증상 시 수의사 상담 권장.
${HALLUCINATION_GUARD_RULES}`;
    }

    // 독성 음식 압축
    const toxicFoods = isDog ? DOG_TOXIC_FOODS : [...DOG_TOXIC_FOODS, ...CAT_EXTRA_TOXIC_FOODS];
    const fatalFoods = toxicFoods.filter(f => f.level === "fatal").map(f => `${f.name}(${f.reason.split('.')[0]})`);
    const dangerousFoods = toxicFoods.filter(f => f.level === "dangerous").map(f => f.name);
    const cautionFoods = toxicFoods.filter(f => f.level === "caution").map(f => f.name);

    // 안전 음식
    const safeFoodList = isDog ? SAFE_FOODS.dog : SAFE_FOODS.cat;

    // 백신
    const vaccines = isDog ? DOG_VACCINES : CAT_VACCINES;
    const vaccineText = vaccines.map(v => `${v.name}: ${v.adult}`).join(", ");

    // 나이별 케어
    const ageCare = isDog ? DOG_AGE_CARE : CAT_AGE_CARE;
    const ageCareText = ageCare.map(a => `${a.stage}(${a.ageRange}): ${a.keyPoints.slice(0, 2).join(", ")}`).join(" / ");

    // 응급 증상 (최상위만)
    const emergencySymptoms = SYMPTOM_GUIDES
        .filter(s => s.urgency === "emergency")
        .map(s => s.symptom)
        .join(", ");

    const urgentSymptoms = SYMPTOM_GUIDES
        .filter(s => s.urgency === "urgent")
        .map(s => s.symptom)
        .join(", ");

    return `### ${isDog ? "강아지" : "고양이"} 케어 레퍼런스 (검증된 정보)
**절대 금지 음식**: ${fatalFoods.join(" / ")}
**위험 음식**: ${dangerousFoods.join(", ")}
**주의 음식**: ${cautionFoods.join(", ")}
**안전 음식**: ${safeFoodList.join(", ")}
**예방접종**: ${vaccineText}
**나이별 케어**: ${ageCareText}
**즉시 병원 증상**: ${emergencySymptoms}
**24시간 내 병원 증상**: ${urgentSymptoms}
${isDog ? "**산책**: 소형 20-30분, 중형 30분-1시간, 대형 1시간+" : "**운동**: 실내 놀이 15-30분/일, 캣타워/스크래쳐 필수"}
${isCat ? "**고양이 특이 주의**: 백합류 모든 부위 치명적, 개용 구충제 사용 금지, 에센셜오일 위험" : ""}

${HALLUCINATION_GUARD_RULES}`;
}

/**
 * 사용자 메시지가 케어 관련 질문인지 감지
 * Mode B 전환 판단 보조용
 */
export function isCareRelatedQuery(message: string): boolean {
    const careKeywords = [
        // 음식 관련
        "먹어도", "먹여도", "급여", "사료", "간식", "독성", "중독",
        // 건강 관련
        "아파", "아프", "아픈", "증상", "병원", "수의사", "진료",
        "구토", "설사", "기침", "열이", "피가", "출혈",
        "예방접종", "백신", "접종", "구충", "심장사상충",
        // 케어 관련
        "양치", "목욕", "미용", "발톱", "귀청소",
        "산책", "운동", "체중", "살이",
        // 행동 교정/훈련 관련
        "물어", "깨물", "입질", "짖", "짖어", "짖는",
        "분리불안", "혼자두면", "혼자 두면",
        "배변", "대소변", "오줌", "똥",
        "리드", "하네스", "목줄", "당기",
        "으르렁", "공격", "무서워",
        "파괴", "물어뜯", "긁어", "부숴",
        "훈련", "교정", "교육", "가르치",
        "발 닦", "발닦", "중성화",
        // 질문 패턴
        "해도 돼", "해도 될까", "괜찮아", "위험해", "안전해",
        "얼마나", "몇 번", "언제", "주기",
        "어떻게 해", "어떻게해", "방법",
    ];

    const normalized = message.replace(/\s/g, "").toLowerCase();
    return careKeywords.some(keyword => normalized.includes(keyword.replace(/\s/g, "")));
}

/**
 * 응급 키워드 감지 - 수의사 상담 강력 권장 트리거
 */
export function detectEmergencyKeywords(message: string): {
    isEmergency: boolean;
    isUrgent: boolean;
    matchedSymptoms: string[];
} {
    const normalized = message.replace(/\s/g, "").toLowerCase();

    const emergencyPatterns = [
        "발작", "경련", "의식", "기절", "쓰러졌", "호흡곤란", "숨못",
        "파랗", "청색", "피를많이", "대량출혈", "교통사고", "차에",
        "독", "먹었", "삼켰", "먹여", "먹이", "줬는데", "먹인",
        "자일리톨", "초콜릿먹", "타이레놀", "아세트아미노펜", "이부프로펜",
        "오줌못", "소변못",
    ];

    const urgentPatterns = [
        "구토", "토했", "토하", "설사", "피가섞", "혈변",
        "밥안먹", "안먹어", "식욕없", "이틀째", "3일째",
        "열이", "뜨거", "고열",
    ];

    const matchedEmergency = emergencyPatterns.filter(p => normalized.includes(p));
    const matchedUrgent = urgentPatterns.filter(p => normalized.includes(p));

    return {
        isEmergency: matchedEmergency.length > 0,
        isUrgent: matchedUrgent.length > 0,
        matchedSymptoms: [...matchedEmergency, ...matchedUrgent],
    };
}

// ============================================
// 8. 응답 후 검증 레이어 (Post-Response Validation)
// ============================================

/** 검증 결과 */
export interface ResponseValidation {
    /** 원본 또는 수정된 응답 */
    reply: string;
    /** 수정이 발생했는지 */
    wasModified: boolean;
    /** 감지된 위반 목록 (로깅용) */
    violations: string[];
}

/**
 * GPT 응답에서 할루시네이션 위험 패턴을 코드 레벨로 검증/수정
 * - 프롬프트만으로는 100% 방지 불가 → 코드에서 후처리
 * - 케어 관련 응답에서만 실행 (일상 잡담에는 불필요)
 */
export function validateAIResponse(
    reply: string,
    isCareQuery: boolean,
    userMessage?: string,
): ResponseValidation {
    // 케어 질문이 아니면 검증 스킵
    if (!isCareQuery) {
        return { reply, wasModified: false, violations: [] };
    }

    let modified = reply;
    const violations: string[] = [];

    // 1. 약 용량/처방 패턴 감지 → 수의사 권장 문구 추가 (수분 섭취 안내는 예외)
    const dosagePatterns = [
        /(\d+)\s*(mg|ml|밀리|그램|cc|정|알)/gi,
        /하루\s*(\d+)\s*(번|회|알|정)/g,
        /(\d+)\s*(시간|일)\s*간격/g,
    ];
    const waterKeywords = ["마시", "물", "수분", "음수량", "음수"];
    for (const pattern of dosagePatterns) {
        const match = modified.match(pattern);
        if (match) {
            // 수분 섭취 관련 문맥이면 스킵
            const matchIdx = modified.indexOf(match[0]);
            const surrounding = modified.slice(
                Math.max(0, matchIdx - 30),
                Math.min(modified.length, matchIdx + match[0].length + 30)
            );
            const isWaterContext = waterKeywords.some(k => surrounding.includes(k));
            if (isWaterContext) continue;

            violations.push(`dosage_detected: ${match[0]}`);
            // 용량 수치를 "수의사 상담 필요" 문구로 대체하지는 않음
            // (맥락 파괴 위험) → 대신 끝에 경고 추가
            if (!modified.includes("수의사") && !modified.includes("병원")) {
                modified = modified.trimEnd() + " 정확한 용량은 수의사 선생님한테 꼭 확인해봐!";
            }
            break; // 중복 추가 방지
        }
    }

    // 2. 과도한 단정 표현 완화 — 독성 음식 경고는 예외
    const toxicFoodKeywords = ["초콜릿", "포도", "자일리톨", "양파", "마카다미아", "파", "부추", "마늘", "독성", "중독", "위험한 음식"];
    const assertionReplacements: [RegExp, string][] = [
        [/100%\s*(확실|안전|괜찮)/g, "보통은 괜찮다고"],
        [/무조건\s*(~?해야|먹어야|가야|줘야)/g, "가능하면 $1"],
        [/반드시\s*(~?해야|먹어야|줘야)/g, "되도록 $1"],
        [/절대로?\s*(안\s*돼|하면\s*안)/g, "안 하는 게 좋"],
    ];
    for (const [pattern, replacement] of assertionReplacements) {
        if (pattern.test(modified)) {
            // 같은 문장에 독성 음식 키워드가 있으면 스킵 (정당한 경고)
            const matchStr = modified.match(pattern)?.[0] || "";
            const matchIdx = modified.indexOf(matchStr);
            const sentenceStart = modified.lastIndexOf(".", matchIdx);
            const sentenceEnd = modified.indexOf(".", matchIdx + matchStr.length);
            const sentence = modified.slice(
                sentenceStart >= 0 ? sentenceStart : 0,
                sentenceEnd >= 0 ? sentenceEnd : modified.length
            );
            const isToxicFoodWarning = toxicFoodKeywords.some(k => sentence.includes(k));
            if (isToxicFoodWarning) continue; // 독성 음식 경고는 약화하지 않음

            violations.push(`assertion: ${matchStr}`);
            modified = modified.replace(pattern, replacement);
        }
    }

    // 3. 브랜드명/상품명 감지 — 유저가 직접 언급한 브랜드는 예외
    const brandPatterns = [
        // 사료/간식 브랜드
        "로얄캐닌", "힐스", "뉴트로", "오리젠", "아카나", "퓨리나",
        "네츄럴코어", "하림펫푸드", "지위픽", "인스팅트", "블루버팔로",
        "나우프레시", "고프로", "웰니스", "캣츠파인푸드",
        // 영양제/약품 브랜드
        "뉴트리플러스", "펫에이지", "코세퀸", "다사퀸",
        // 용품 브랜드
        "페토이", "독터독",
    ];
    const replyLower = modified.toLowerCase().replace(/\s/g, "");
    const userMsgLower = (userMessage || "").toLowerCase().replace(/\s/g, "");
    for (const brand of brandPatterns) {
        const brandLower = brand.toLowerCase().replace(/\s/g, "");
        if (replyLower.includes(brandLower)) {
            // 유저가 해당 브랜드를 먼저 언급했으면 스킵
            if (userMsgLower.includes(brandLower)) continue;

            violations.push(`brand_detected: ${brand}`);
            // 브랜드명을 제품 유형으로 대체
            const brandRegex = new RegExp(brand, "gi");
            modified = modified.replace(brandRegex, "좋은 제품");
        }
    }

    // 4. 확률 날조 감지 ("30% 확률", "70%가" 등)
    const probabilityPattern = /(\d{1,3})\s*(%|퍼센트)\s*(확률|가능성|이상이|정도가)/g;
    if (probabilityPattern.test(modified)) {
        violations.push(`probability_fabrication: ${modified.match(probabilityPattern)?.[0]}`);
        modified = modified.replace(probabilityPattern, "경우에 따라");
    }

    // 5. 사람 약 추천 감지
    const humanDrugPatterns = [
        "타이레놀", "아세트아미노펜", "이부프로펜", "아스피린",
        "게보린", "판콜", "부루펜", "인사돌", "판피린",
    ];
    for (const drug of humanDrugPatterns) {
        if (replyLower.includes(drug.toLowerCase())) {
            violations.push(`human_drug: ${drug}`);
            const drugRegex = new RegExp(drug, "gi");
            modified = modified.replace(
                drugRegex,
                "사람 약(위험!)"
            );
            // 사람 약 감지 시 강력 경고 추가
            if (!modified.includes("절대") || !modified.includes("수의사")) {
                modified = modified.trimEnd() + " 사람 약은 절대 주면 안 돼! 수의사 선생님한테 바로 가자!";
            }
        }
    }

    return {
        reply: modified,
        wasModified: modified !== reply,
        violations,
    };
}
