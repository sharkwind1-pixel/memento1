/**
 * agent/helpers.ts - 순수 유틸리티 함수
 *
 * 외부 의존성 없는 순수 함수들. 날짜 계산, 라벨 변환 등.
 */

import type { EmotionType, GriefStage } from "@/types";

/** 날짜 차이 계산 (오늘 기준 몇 일 전인지) */
export function getDaysAgo(dateStr: string): number {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/** 감정 타입 → 한국어 라벨 */
export function getEmotionLabel(emotion: EmotionType): string {
    const labels: Record<EmotionType, string> = {
        happy: "기쁨",
        sad: "슬픔",
        anxious: "불안",
        angry: "분노",
        grateful: "감사",
        lonely: "그리움",
        peaceful: "평화",
        excited: "설렘",
        neutral: "평온",
    };
    return labels[emotion] || "평온";
}

/**
 * 한국어 조사 후처리 — 펫 이름 뒤 조사를 받침 유무에 맞게 교정
 * GPT-4o-mini가 한국어 받침 규칙을 자주 틀리므로 코드 레벨에서 후처리
 *
 * 예: "꼼지이가" → "꼼지가", "꼼지이를" → "꼼지를", "꼼지이라고" → "꼼지라고"
 */
export function fixKoreanParticles(text: string, petName: string): string {
    if (!petName || petName.length === 0) return text;

    const lastChar = petName.charCodeAt(petName.length - 1);
    // 한글 유니코드 범위 체크 (가~힣)
    const isHangul = lastChar >= 0xAC00 && lastChar <= 0xD7A3;
    if (!isHangul) return text;

    // 받침 유무 판별: (코드 - 0xAC00) % 28 === 0이면 받침 없음
    const hasBatchim = (lastChar - 0xAC00) % 28 !== 0;

    if (hasBatchim) {
        // 받침 있음: "꼼지이가" → "꼼지가" (불필요한 "이" 제거)
        // 이가→이, 이를→을, 이는→은, 이와→과, 이라고→이라고(이건 맞음), 이에게→에게
        text = text.replaceAll(`${petName}이가`, `${petName}이`);
        text = text.replaceAll(`${petName}이를`, `${petName}을`);
        text = text.replaceAll(`${petName}이는`, `${petName}은`);
        text = text.replaceAll(`${petName}이와`, `${petName}과`);
        text = text.replaceAll(`${petName}이에게`, `${petName}에게`);
        // 받침 있으면: 이/을/은/과/아 사용 확인
        text = text.replaceAll(`${petName}가 `, `${petName}이 `);
        text = text.replaceAll(`${petName}를 `, `${petName}을 `);
        text = text.replaceAll(`${petName}는 `, `${petName}은 `);
        text = text.replaceAll(`${petName}와 `, `${petName}과 `);
        text = text.replaceAll(`${petName}야!`, `${petName}아!`);
        text = text.replaceAll(`${petName}야## `, `${petName}아~ `);
        text = text.replaceAll(`${petName}야~`, `${petName}아~`);
        text = text.replaceAll(`${petName}야.`, `${petName}아.`);
        text = text.replaceAll(`${petName}야,`, `${petName}아,`);
    } else {
        // 받침 없음: "꼼지이라고" → "꼼지라고" (불필요한 "이" 제거)
        // "꼼지이야" → "꼼지야", "꼼지이이야" → "꼼지야"
        // 먼저 "이이" 중복부터 제거 (GPT가 "이"를 여러 번 넣는 경우)
        text = text.replaceAll(`${petName}이이`, `${petName}이`);
        // 자기소개/호칭: "이야", "이다", "이잖아", "이거든", "이니까"
        text = text.replaceAll(`${petName}이야`, `${petName}야`);
        text = text.replaceAll(`${petName}이다`, `${petName}다`);
        text = text.replaceAll(`${petName}이잖아`, `${petName}잖아`);
        text = text.replaceAll(`${petName}이거든`, `${petName}거든`);
        text = text.replaceAll(`${petName}이니까`, `${petName}니까`);
        text = text.replaceAll(`${petName}이니`, `${petName}니`);
        text = text.replaceAll(`${petName}이지`, `${petName}지`);
        text = text.replaceAll(`${petName}이도`, `${petName}도`);
        // 조사
        text = text.replaceAll(`${petName}이가`, `${petName}가`);
        text = text.replaceAll(`${petName}이를`, `${petName}를`);
        text = text.replaceAll(`${petName}이는`, `${petName}는`);
        text = text.replaceAll(`${petName}이와`, `${petName}와`);
        text = text.replaceAll(`${petName}이에게`, `${petName}에게`);
        text = text.replaceAll(`${petName}이라고`, `${petName}라고`);
        text = text.replaceAll(`${petName}이라는`, `${petName}라는`);
        text = text.replaceAll(`${petName}이라서`, `${petName}라서`);
        text = text.replaceAll(`${petName}이랑`, `${petName}랑`);
        text = text.replaceAll(`${petName}이한테`, `${petName}한테`);
        // 받침 없으면: 가/를/는/와/야 사용 확인
        text = text.replaceAll(`${petName}이 `, `${petName}가 `);
        text = text.replaceAll(`${petName}을 `, `${petName}를 `);
        text = text.replaceAll(`${petName}은 `, `${petName}는 `);
        text = text.replaceAll(`${petName}과 `, `${petName}와 `);
        text = text.replaceAll(`${petName}아!`, `${petName}야!`);
        text = text.replaceAll(`${petName}아~`, `${petName}야~`);
        text = text.replaceAll(`${petName}아.`, `${petName}야.`);
        text = text.replaceAll(`${petName}아,`, `${petName}야,`);
    }

    return text;
}

/** 애도 단계 → 한국어 라벨 */
export function getGriefStageLabel(stage: GriefStage): string {
    const labels: Record<GriefStage, string> = {
        denial: "부정 단계 (아직 받아들이기 어려움)",
        anger: "분노 단계 (화남/자책)",
        bargaining: "타협 단계 (후회/만약에)",
        depression: "슬픔 단계 (깊은 그리움)",
        acceptance: "수용 단계 (점차 회복)",
        unknown: "불명확",
    };
    return labels[stage] || "불명확";
}
