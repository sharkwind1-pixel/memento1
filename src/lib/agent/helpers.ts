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
        // 받침 없음: 이름 뒤 불필요한 "이" 제거
        // 정규식으로 "이" 1개 이상 + 조사/어미를 한 번에 처리
        // "꼼지이야", "꼼지이이야", "꼼지이이이야" 모두 → "꼼지야"
        const escaped = petName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const suffixMap: [RegExp, string][] = [
            // 어미 (이+야, 이+다, 이+잖아 등)
            [new RegExp(`${escaped}이+야`, "g"), `${petName}야`],
            [new RegExp(`${escaped}이+다`, "g"), `${petName}다`],
            [new RegExp(`${escaped}이+잖아`, "g"), `${petName}잖아`],
            [new RegExp(`${escaped}이+거든`, "g"), `${petName}거든`],
            [new RegExp(`${escaped}이+니까`, "g"), `${petName}니까`],
            [new RegExp(`${escaped}이+니`, "g"), `${petName}니`],
            [new RegExp(`${escaped}이+지`, "g"), `${petName}지`],
            [new RegExp(`${escaped}이+도`, "g"), `${petName}도`],
            // 조사
            [new RegExp(`${escaped}이+가`, "g"), `${petName}가`],
            [new RegExp(`${escaped}이+를`, "g"), `${petName}를`],
            [new RegExp(`${escaped}이+는`, "g"), `${petName}는`],
            [new RegExp(`${escaped}이+와`, "g"), `${petName}와`],
            [new RegExp(`${escaped}이+에게`, "g"), `${petName}에게`],
            [new RegExp(`${escaped}이+라고`, "g"), `${petName}라고`],
            [new RegExp(`${escaped}이+라는`, "g"), `${petName}라는`],
            [new RegExp(`${escaped}이+라서`, "g"), `${petName}라서`],
            [new RegExp(`${escaped}이+랑`, "g"), `${petName}랑`],
            [new RegExp(`${escaped}이+한테`, "g"), `${petName}한테`],
        ];
        for (const [regex, replacement] of suffixMap) {
            text = text.replace(regex, replacement);
        }
        // 단독 "이" + 공백 (꼼지이 → 꼼지가)
        text = text.replace(new RegExp(`${escaped}이+ `, "g"), `${petName}가 `);
        // 잘못된 조사 교정
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
