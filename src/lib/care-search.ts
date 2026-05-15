/**
 * care-search.ts - 케어 질문 웹 검색 (Tavily Search API)
 *
 * 케어 질문(입질, 짖음, 건강, 훈련 등) 감지 시 실시간 웹 검색으로
 * 전문적인 정보를 GPT 컨텍스트에 주입한다.
 *
 * 흐름: 유저 케어 질문 → 검색 쿼리 생성 → Tavily API → 스니펫 추출 → GPT 주입
 */

import { tavily } from "@tavily/core";

/** Tavily 클라이언트 (싱글턴) */
function getTavilyClient() {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        console.warn("[CareSearch] TAVILY_API_KEY 미설정");
        return null;
    }
    return tavily({ apiKey });
}

/**
 * 케어 질문을 검색 쿼리로 변환
 * 유저 메시지에서 반려동물 종류 + 핵심 키워드를 추출하여 검색 쿼리 생성
 */
function buildSearchQuery(userMessage: string, petType: string, petBreed?: string): string {
    const typeText = petType === "강아지" ? "강아지" : petType === "고양이" ? "고양이" : "반려동물";
    const breedText = petBreed ? ` ${petBreed}` : "";

    // 메시지에서 핵심 키워드 추출 (간단한 룰 기반)
    const message = userMessage.replace(/[~!?.]/g, "").trim();

    // 행동 문제 키워드 매핑
    const behaviorKeywords: Record<string, string> = {
        "물어": "입질 깨무는 행동 교정 훈련법",
        "깨물": "입질 깨무는 행동 교정 훈련법",
        "입질": "입질 교정 방법 단계별",
        "짖": "짖는 이유 교정 훈련 방법",
        "분리불안": "분리불안 증상 훈련 방법",
        "혼자": "분리불안 혼자 두기 훈련",
        "배변": "배변 훈련 방법 장소 유도",
        "대소변": "배변 훈련 실수 대처법",
        "산책": "산책 훈련 리드줄 당기기",
        "리드": "리드줄 당기기 교정 방법",
        "하네스": "하네스 거부 적응 훈련",
        "으르렁": "으르렁거리는 이유 공격성 교정",
        "공격": "공격성 원인 교정 전문가",
        "밥그릇": "자원보호 밥그릇 공격성 교정",
        "파괴": "파괴행동 원인 교정 방법",
        "물어뜯": "가구 물어뜯는 이유 교정",
        "발 닦": "발 닦을 때 거부 둔감화 훈련",
        "발톱": "발톱 깎기 거부 둔감화 훈련",
        "목욕": "목욕 거부 적응 훈련 방법",
        "구토": "구토 원인 응급처치 수의사",
        "설사": "설사 원인 대처법 수의사",
        "기침": "기침 원인 켄넬코프 수의사",
        "피부": "피부병 가려움 원인 치료",
        "귀": "귀 감염 외이염 증상 치료",
        "눈물": "눈물자국 원인 관리법",
        "사료": "사료 추천 선택 기준 연령별 영양성분 비교",
        "간식": "간식 추천 안전한 간식 위험한 음식 수제간식 만드는 법",
        "영양제": "영양제 추천 종류 성분 효과 급여량 주의사항",
        "보조제": "건강보조제 종류 효과 급여 가이드",
        "유산균": "장 건강 유산균 프로바이오틱 효과 급여법",
        "관절": "관절 건강 영양제 글루코사민 노령 관리",
        "노령": "노령 건강관리 식단 운동 정기검진 체크리스트",
        "시니어": "시니어 건강관리 영양 노화 신호 관리법",
        "비만": "비만 다이어트 식단 운동 체중관리 방법",
        "다이어트": "체중감량 식이조절 운동 칼로리 가이드",
        "스케일링": "치아 스케일링 시기 비용 마취 위험 양치 관리",
        "치아": "치아 관리 치석 제거 양치 방법 구강 건강",
        "슬개골": "슬개골 탈구 증상 단계 관리 수술 시기",
        "알러지": "알레르기 원인 증상 식이 환경 관리법",
        "임신": "임신 징후 기간 관리 출산 준비 영양",
        "출산": "출산 과정 준비물 신생아 관리 주의사항",
        "발정": "발정 주기 증상 관리 중성화 시기",
        "털빠짐": "털빠짐 환절기 탈모 원인 관리 영양",
        "예방접종": "예방접종 스케줄 종류 시기",
        "중성화": "중성화 수술 시기 장단점",
        // 장례/추모 실용
        "장례": "반려동물 장례 절차 방법 장례식장 추천",
        "화장": "반려동물 화장 장묘 비용 절차",
        "장묘": "반려동물 장묘 시설 추모공원 비용",
        "납골": "반려동물 납골당 추모공원 위치 비용",
        "수습": "반려동물 사후 수습 방법 절차",
        "유골": "반려동물 유골 보관 방법 납골",
    };

    // 매칭되는 키워드 찾기
    let searchSuffix = "";
    for (const [keyword, query] of Object.entries(behaviorKeywords)) {
        if (message.includes(keyword)) {
            searchSuffix = query;
            break;
        }
    }

    // 매칭 안 되면 원본 메시지 사용
    if (!searchSuffix) {
        searchSuffix = message.slice(0, 50);
    }

    return `${typeText}${breedText} ${searchSuffix}`;
}

/**
 * 케어 질문에 대해 웹 검색 수행 후 GPT 주입용 텍스트 반환
 *
 * @param userMessage 유저 메시지
 * @param petType 반려동물 종류 ("강아지" | "고양이" | 기타)
 * @param petBreed 견종/묘종 (선택)
 * @returns GPT 시스템 프롬프트에 삽입할 참고 자료 텍스트 (빈 문자열이면 검색 실패)
 */
export async function searchCareInfo(
    userMessage: string,
    petType: string,
    petBreed?: string
): Promise<string> {
    try {
        const client = getTavilyClient();
        if (!client) return "";

        const query = buildSearchQuery(userMessage, petType, petBreed);

        // advanced + maxResults 상향 + 도메인 화이트리스트 제거
        //  - 기존 8개 도메인 제한이 수의학 정보 품질을 크게 떨어뜨림 (조사 결과)
        //  - 도메인 제한 없이 Tavily 자체 랭킹 신뢰, includeAnswer로 요약 확보
        //  - 토큰: 결과는 아래에서 600자 × 5로 캡, 출력단 sanitizeAIOutput로 누출 방어 유지
        const response = await client.search(query, {
            searchDepth: "advanced",
            maxResults: 5,
            includeAnswer: true,
        });

        // 결과 조합
        const parts: string[] = [];

        // Tavily 요약 답변 (있으면)
        if (response.answer) {
            parts.push(`요약: ${response.answer}`);
        }

        // 상위 결과 스니펫 (300→600자, 3→5개 — 수의학 정보는 맥락이 길어야 정확)
        if (response.results && response.results.length > 0) {
            for (let i = 0; i < Math.min(5, response.results.length); i++) {
                const r = response.results[i];
                if (r.content) {
                    parts.push(`출처${i + 1}: ${r.content.slice(0, 600)}`);
                }
            }
        }

        if (parts.length === 0) return "";

        return `\n## 참고 자료 (검색 결과 기반 — 정확한 정보 전달 우선)
아래 정보를 바탕으로 답변하되, 캐릭터 톤(반려동물 1인칭)은 유지합니다.
답변에 반드시 포함할 것:
1. 왜 그런 행동/증상이 나타나는지 (원인)
2. 구체적 단계별 방법 (1→2→3) — 두루뭉술 금지, 실제로 따라할 수 있게
3. 절대 하면 안 되는 것
4. 심각하면 "수의사/훈련사 상담" 안내

추가 지시 (구체성 강화):
- 간식/사료/영양제 질문이면: 일반론("닭고기 좋아")으로 끝내지 말고
  성분/영양소 기준, 연령·체중별 급여량 가이드, 피해야 할 성분까지 구체적으로.
  단 특정 브랜드를 "이게 최고"라고 단정하지 말 것 (제품 유형/성분 위주로).
- 수치(용량/주기/기간)는 검색 자료에 있는 값만 인용, 없으면 "수의사 확인" 안내.
- 검색 자료에 근거가 약하면 단정하지 말고 "일반적으로는 ~지만 개체차가 있어"로.

${parts.join("\n\n")}`;
    } catch (err) {
        console.error("[CareSearch] 검색 실패:", err instanceof Error ? err.message : err);
        return "";
    }
}
