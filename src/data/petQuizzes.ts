/**
 * petQuizzes.ts
 * 반려동물 자가진단/퀴즈 데이터
 *
 * 인터랙티브 퀴즈로 유저 참여 + 공유 유도 + SEO 유입.
 * 결과는 localStorage에 저장 (DB 불필요).
 *
 * 사용처: QuizModal.tsx (src/components/features/quiz/)
 */

export interface QuizQuestion {
    id: string;
    text: string;
    options: Array<{
        label: string;
        score: number; // 0-3
    }>;
}

export interface QuizResult {
    range: [number, number]; // [min, max] 점수 범위
    title: string;
    emoji: string; // CSS/텍스트 아이콘 (이모지 아님, 서비스 규칙)
    description: string;
    advice: string;
    color: string; // Tailwind 색상 클래스
}

export interface PetQuiz {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    petType: "dog" | "cat" | "all"; // 대상 종
    icon: string; // lucide 아이콘 이름
    questions: QuizQuestion[];
    results: QuizResult[];
    shareText: (result: QuizResult, petName?: string) => string;
}

// ===== 비만도 체크 =====

const obesityQuiz: PetQuiz = {
    id: "obesity-check",
    title: "우리 아이 비만도 체크",
    subtitle: "5문항으로 간단 확인",
    description: "반려동물의 체형을 관찰하고 간단한 질문에 답해보세요. 수의사 진료를 대체하지 않습니다.",
    petType: "all",
    icon: "Scale",
    questions: [
        {
            id: "ob-1",
            text: "위에서 내려다봤을 때 허리 라인이 보이나요?",
            options: [
                { label: "허리가 잘록하게 들어가 있다", score: 0 },
                { label: "약간 들어가 있다", score: 1 },
                { label: "일직선이다 (허리 라인 없음)", score: 2 },
                { label: "배가 양옆으로 나와 있다", score: 3 },
            ],
        },
        {
            id: "ob-2",
            text: "옆에서 봤을 때 배 라인은 어떤가요?",
            options: [
                { label: "배가 위로 올라가 있다 (턱업)", score: 0 },
                { label: "약간 올라가 있다", score: 1 },
                { label: "바닥과 평행하다", score: 2 },
                { label: "배가 처져 있다", score: 3 },
            ],
        },
        {
            id: "ob-3",
            text: "갈비뼈를 만져보면 어떤가요?",
            options: [
                { label: "쉽게 만져진다 (살짝 눌러도)", score: 0 },
                { label: "약간 눌러야 만져진다", score: 1 },
                { label: "세게 눌러야 겨우 만져진다", score: 2 },
                { label: "만져지지 않는다", score: 3 },
            ],
        },
        {
            id: "ob-4",
            text: "평소 활동량은 어떤가요?",
            options: [
                { label: "활발하게 뛰어다닌다", score: 0 },
                { label: "보통이다", score: 1 },
                { label: "많이 움직이지 않는다", score: 2 },
                { label: "거의 누워만 있다", score: 3 },
            ],
        },
        {
            id: "ob-5",
            text: "간식을 하루에 몇 번 주나요?",
            options: [
                { label: "거의 안 준다 (주 1-2회)", score: 0 },
                { label: "하루 1번", score: 1 },
                { label: "하루 2-3번", score: 2 },
                { label: "수시로 준다 (4번 이상)", score: 3 },
            ],
        },
    ],
    results: [
        {
            range: [0, 4],
            title: "건강한 체형",
            emoji: "v",
            description: "현재 아이의 체형은 건강한 범위에 있어요. 지금처럼 관리해주세요.",
            advice: "적절한 사료량과 규칙적인 산책을 유지하면 됩니다.",
            color: "text-green-600",
        },
        {
            range: [5, 8],
            title: "약간 과체중",
            emoji: "!",
            description: "살짝 과체중 경향이 있어요. 사료량과 간식을 점검해보세요.",
            advice: "간식을 줄이고 사료량을 10% 감량해보세요. 산책 시간을 5-10분 늘려보는 것도 도움이 됩니다.",
            color: "text-memorial-600",
        },
        {
            range: [9, 12],
            title: "비만 주의",
            emoji: "!!",
            description: "비만 경향이 보여요. 수의사 상담을 권장합니다.",
            advice: "다이어트 사료로 전환하고, 간식은 하루 1회 이하로 제한하세요. 수의사와 체중 관리 계획을 세우는 것이 좋습니다.",
            color: "text-red-600",
        },
        {
            range: [13, 15],
            title: "고도 비만",
            emoji: "!!!",
            description: "고도 비만 상태일 수 있어요. 가능한 빨리 수의사 진료를 받아주세요.",
            advice: "비만은 관절 질환, 당뇨, 심장병의 원인이 됩니다. 수의사와 함께 체중 감량 프로그램을 시작하세요.",
            color: "text-red-700",
        },
    ],
    shareText: (result, petName) =>
        `${petName ? `${petName}의 ` : "우리 아이 "}비만도 체크 결과: ${result.title}\n메멘토애니에서 확인해보세요 - mementoani.com`,
};

// ===== 분리불안 테스트 =====

const separationAnxietyQuiz: PetQuiz = {
    id: "separation-anxiety",
    title: "분리불안 자가 체크",
    subtitle: "7문항 간단 테스트",
    description: "보호자가 외출할 때 아이의 행동을 관찰하고 답해주세요.",
    petType: "dog",
    icon: "HeartCrack",
    questions: [
        {
            id: "sa-1",
            text: "외출 준비를 하면 아이가 어떻게 반응하나요?",
            options: [
                { label: "별다른 반응 없다", score: 0 },
                { label: "따라다니며 바라본다", score: 1 },
                { label: "낑낑거리거나 짖는다", score: 2 },
                { label: "극도로 흥분하거나 떤다", score: 3 },
            ],
        },
        {
            id: "sa-2",
            text: "혼자 있을 때 물건을 물어뜯거나 파괴하나요?",
            options: [
                { label: "전혀 없다", score: 0 },
                { label: "가끔 있다", score: 1 },
                { label: "자주 있다", score: 2 },
                { label: "매번 있다 (심각한 파괴)", score: 3 },
            ],
        },
        {
            id: "sa-3",
            text: "혼자 있을 때 짖음/울음이 있나요?",
            options: [
                { label: "없다", score: 0 },
                { label: "5-10분 정도", score: 1 },
                { label: "30분 이상", score: 2 },
                { label: "돌아올 때까지 계속", score: 3 },
            ],
        },
        {
            id: "sa-4",
            text: "혼자 있을 때 배변 실수가 있나요?",
            options: [
                { label: "없다 (정해진 곳에 한다)", score: 0 },
                { label: "가끔 실수한다", score: 1 },
                { label: "자주 실수한다", score: 2 },
                { label: "매번 아무 곳에 한다", score: 3 },
            ],
        },
        {
            id: "sa-5",
            text: "보호자가 돌아오면 어떻게 반응하나요?",
            options: [
                { label: "반갑지만 금방 진정한다", score: 0 },
                { label: "매우 흥분하며 반긴다 (1-2분)", score: 1 },
                { label: "극도로 흥분하며 오래 진정 못 한다", score: 2 },
                { label: "눈물을 흘리거나 몸을 떨며 매달린다", score: 3 },
            ],
        },
        {
            id: "sa-6",
            text: "집 안에서 보호자를 따라다니나요?",
            options: [
                { label: "자기 자리에서 편하게 쉰다", score: 0 },
                { label: "가끔 따라온다", score: 1 },
                { label: "항상 따라다닌다 (그림자 개)", score: 2 },
                { label: "화장실까지 따라온다", score: 3 },
            ],
        },
        {
            id: "sa-7",
            text: "보호자 없이 다른 가족과 있을 때는 어떤가요?",
            options: [
                { label: "괜찮다", score: 0 },
                { label: "약간 불안해한다", score: 1 },
                { label: "보호자를 계속 찾는다", score: 2 },
                { label: "보호자 없으면 아무도 안 된다", score: 3 },
            ],
        },
    ],
    results: [
        {
            range: [0, 5],
            title: "분리불안 없음",
            emoji: "v",
            description: "아이가 혼자 있는 것에 큰 스트레스를 받지 않는 것 같아요.",
            advice: "지금처럼 외출 시 담담하게 나가고 돌아오면 됩니다. 과한 인사는 오히려 분리불안을 유발할 수 있어요.",
            color: "text-green-600",
        },
        {
            range: [6, 10],
            title: "경미한 분리불안",
            emoji: "!",
            description: "약간의 분리불안 경향이 있어요. 지금 교정하면 충분히 나아질 수 있습니다.",
            advice: "짧은 시간 외출부터 시작해서 점차 늘려보세요. 외출 전 특별 간식(콩)을 주면 긍정 연결에 도움이 됩니다.",
            color: "text-memorial-600",
        },
        {
            range: [11, 15],
            title: "중등도 분리불안",
            emoji: "!!",
            description: "분리불안이 있는 것으로 보여요. 행동 교정이 필요합니다.",
            advice: "전문 훈련사 상담을 권장합니다. 혼자 있는 시간을 점진적으로 늘리는 체계적 둔감화 훈련이 효과적입니다.",
            color: "text-red-600",
        },
        {
            range: [16, 21],
            title: "심한 분리불안",
            emoji: "!!!",
            description: "심각한 분리불안 상태예요. 전문가 도움이 필요합니다.",
            advice: "수의사(행동 전문) + 전문 훈련사 상담을 받으세요. 심한 경우 약물 보조 치료도 고려할 수 있습니다.",
            color: "text-red-700",
        },
    ],
    shareText: (result, petName) =>
        `${petName ? `${petName}의 ` : "우리 아이 "}분리불안 체크 결과: ${result.title}\n메멘토애니에서 확인해보세요 - mementoani.com`,
};

// ===== 퀴즈 목록 =====

export const PET_QUIZZES: PetQuiz[] = [
    obesityQuiz,
    separationAnxietyQuiz,
];

/** ID로 퀴즈 찾기 */
export function getQuizById(id: string): PetQuiz | undefined {
    return PET_QUIZZES.find((q) => q.id === id);
}

/** 점수로 결과 찾기 */
export function getQuizResult(quiz: PetQuiz, totalScore: number): QuizResult {
    for (const result of quiz.results) {
        if (totalScore >= result.range[0] && totalScore <= result.range[1]) {
            return result;
        }
    }
    // 폴백: 마지막 결과
    return quiz.results[quiz.results.length - 1];
}
