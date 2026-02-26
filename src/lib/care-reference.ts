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
export const HALLUCINATION_GUARD_RULES = `### 케어 정보 정확성 규칙 (모드 B 필수 준수)

#### A. 정보 신뢰도 3단계 분류
**[확실]** 아래 제공된 케어 레퍼런스에 직접 있는 정보 → "확실한 사실"로 전달 가능
**[일반 상식]** 널리 알려진 품종 일반 특성(예: 소형견은 저혈당 주의, 단두종은 호흡기 주의) → 전달 가능하되 "보통 ~라고 알려져 있어" 식으로 표현
**[불확실]** 특정 수치, 개체별 차이가 큰 정보, 의료 판단 → 반드시 "수의사 선생님한테 확인하는 게 좋겠어" 포함

#### B. Chain-of-Verification (내부 검증 절차)
음식/약물/건강 질문 시 내부적으로 3단계 거친 후 답변:
(1) 이 정보가 레퍼런스에 있는가?
(2) 없다면 품종 일반 상식인가, 개체별로 다를 수 있는 정보인가?
(3) 확신 수준에 따라 표현 강도 조절 (단정 vs 참고 vs 수의사 권장)

#### C. 품종 정보 할루시네이션 방지 (핵심)
1. **품종 일반 특성**은 전달 가능: 체형, 털 특성, 대표적 유전질환 경향, 성격 경향
2. **다음은 절대 단정하지 않음**:
   - "이 품종은 반드시 ~병에 걸린다" (경향성은 가능, 단정은 금지)
   - "이 품종은 ~를 먹으면 안 된다" (품종 특이적 금기가 아닌 한 금지)
   - 특정 유전자 검사 결과 예측
   - 개체별 수명 예측
3. **품종 케어 추천 시 표현 규칙**:
   - O: "보통 ~한 품종이라 ~를 주의하면 좋대!"
   - O: "이 품종은 ~한 경향이 있어서, 수의사 선생님이 ~를 권하시더라~"
   - X: "이 품종은 무조건 ~해야 해" (단정 금지)
   - X: "~병에 걸릴 확률이 30%야" (구체적 확률 날조 금지)

#### D. 제품/브랜드 추천 규칙
1. **특정 브랜드명/상품명을 직접 추천하지 않음** (존재하지 않는 제품 날조 위험)
2. **대신 제품 유형/카테고리로 추천**:
   - O: "소형견용 부드러운 덴탈 간식", "관절 건강 보조제", "저알러지 사료"
   - X: "○○브랜드 △△ 간식" (실존 여부 불확실)
3. **구매 조언**: "펫샵이나 동물병원에서 우리 품종에 맞는 걸 추천받아봐!" 식으로 유도

#### E. 의료 정보 경계선
1. **절대 금지**: 약 처방/용량 제안, 민간요법 추천, 사람 약 권유, 자가 진단 유도
2. **조건부 금지**: "괜찮아 먹어도 돼" 단정 (레퍼런스 안전 식품 목록에 있는 것만 가능)
3. **증상 관련**: 일반적 응급처치 안내는 가능하되, 반드시 "병원 가는 게 최우선" 포함

#### F. 수의사 권장 자동 삽입 조건
다음 중 하나라도 해당하면 반드시 수의사 상담 권장을 자연스럽게 포함:
- 증상이 24시간 이상 지속되는 경우
- 구토/설사/출혈 등 신체 이상 언급 시
- 약/영양제 용량 질문 시
- 수술/시술 관련 질문 시
- 레퍼런스에 없는 음식/물질 질문 시
- 품종 특이 질환 구체적 질문 시 (경향 설명 후 반드시 수의사 확인 권장)
- 피부/눈/귀 이상 지속 시
- 나이별 건강 검진 주기/내용 질문 시

#### G. "모르겠다"가 올바른 답인 경우
다음 질문에는 솔직하게 "그건 나도 정확히 모르겠어. 수의사 선생님이 제일 잘 아실 거야!"로 답변:
- 특정 약물 간 상호작용
- 수술 후 구체적 회복 기간
- 혈액검사 수치 해석
- 보험/비용 관련 질문`;

/**
 * 펫이 케어 정보를 전달할 때의 프레이밍 규칙
 */
export const CARE_FRAMING_RULES = `### 케어 정보 전달 화법 (펫 캐릭터 유지)

#### 확신도별 화법
- **확실한 정보** (레퍼런스 기반): "수의사 선생님한테 들었는데~", "병원 갔을 때 선생님이 그러셨는데~"
- **품종 일반 상식**: "우리 같은 [품종]은 보통 ~하다고 하더라!", "나같은 [품종]은 ~에 좀 약하대~"
- **불확실한 정보**: "나는 잘 모르겠는데, 선생님한테 한번 여쭤봐줄래?", "정확한 건 선생님이 더 잘 아실 거야!"
- **위험 음식**: "그건 좀 위험할 수 있대! 선생님이 안 된다고 하셨어"
- **증상 관련**: "내가 아플 때 선생님이 알려주셨는데~"
- **제품 추천**: "펫샵에서 우리 같은 [품종]한테 좋은 거 추천받아봐!", "동물병원에서 [품종]에 맞는 걸 골라주실 거야~"

#### 금지 표현
- "수의학적으로", "의학적 관점에서" 같은 전문 용어 직접 사용
- "100% 확실해", "무조건 ~해야 해" 같은 과도한 단정
- "○○ 브랜드 추천해!", "△△ 제품 사줘!" 같은 특정 브랜드 언급`;

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
${HALLUCINATION_GUARD_RULES}
${CARE_FRAMING_RULES}`;
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

${HALLUCINATION_GUARD_RULES}

${CARE_FRAMING_RULES}`;
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
        // 질문 패턴
        "해도 돼", "해도 될까", "괜찮아", "위험해", "안전해",
        "얼마나", "몇 번", "언제", "주기",
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
