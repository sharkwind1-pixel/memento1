/**
 * 네이버 블로그 초안 자동 생성 크론
 * GET /api/cron/blog-generate
 *
 * 매일 09시(KST) 실행
 * 1. 토픽 선택 (카테고리별 세부 주제, 계절 반영)
 * 2. Tavily로 최신 정보/학술 자료 검색
 * 3. 검색 결과를 GPT 컨텍스트에 주입 → 검증된 정보 기반 블로그 글 생성
 * 4. 텔레그램으로 초안 전송
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { tavily } from "@tavily/core";
import { verifyCronSecret, getKstTime } from "@/lib/cron-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ============================================================
// 토픽 풀 — 디테일한 세부 주제
// ============================================================

interface BlogTopic {
    category: "반려동물 정보" | "펫로스를 이겨내기";
    topic: string;
    searchQuery: string; // Tavily 검색 쿼리
    keywords: string[];
    seasonal?: number[]; // 해당 월에만 등장 (없으면 연중)
}

const BLOG_TOPICS: BlogTopic[] = [
    // ============================================================
    // 강아지 건강/케어
    // ============================================================
    { category: "반려동물 정보", topic: "강아지 발톱 안전하게 깎는 방법과 출혈 대처법", searchQuery: "강아지 발톱 깎기 방법 출혈 응급처치 수의사", keywords: ["강아지발톱", "강아지발톱깎기", "반려견케어"] },
    { category: "반려동물 정보", topic: "강아지 구강 관리 — 치석 제거와 양치 습관 들이기", searchQuery: "강아지 양치 방법 치석 제거 구강관리 수의사 권장", keywords: ["강아지양치", "강아지치석", "반려견구강관리"] },
    { category: "반려동물 정보", topic: "강아지 귀 청소 주기와 올바른 방법 (외이염 예방)", searchQuery: "강아지 귀 청소 외이염 예방 수의사 방법", keywords: ["강아지귀청소", "강아지외이염", "반려견건강"] },
    { category: "반려동물 정보", topic: "강아지 피부병 종류와 증상별 관리법", searchQuery: "강아지 피부병 아토피 습진 종류 치료 수의사", keywords: ["강아지피부병", "강아지아토피", "반려견피부관리"] },
    { category: "반려동물 정보", topic: "강아지 슬개골 탈구 등급별 증상과 예방 운동", searchQuery: "강아지 슬개골 탈구 등급 증상 예방 운동 수의사", keywords: ["강아지슬개골", "슬개골탈구", "소형견건강"] },
    { category: "반려동물 정보", topic: "강아지 예방접종 스케줄과 부스터 접종 시기", searchQuery: "강아지 예방접종 스케줄 종합백신 광견병 부스터 2024 2025", keywords: ["강아지예방접종", "강아지백신", "반려견건강검진"] },
    { category: "반려동물 정보", topic: "강아지 분리불안 — 원인 분석과 단계별 훈련법", searchQuery: "강아지 분리불안 훈련 방법 행동교정 강형욱", keywords: ["강아지분리불안", "분리불안훈련", "강아지행동교정"] },
    { category: "반려동물 정보", topic: "강아지 산책 후 발바닥 관리와 패드 보호법", searchQuery: "강아지 발바닥 패드 갈라짐 관리 보호 여름 겨울", keywords: ["강아지발바닥", "강아지패드", "반려견산책"] },

    // ============================================================
    // 강아지 사료/영양
    // ============================================================
    { category: "반려동물 정보", topic: "강아지 사료 성분표 읽는 법 — 원재료 순서의 비밀", searchQuery: "강아지 사료 성분표 읽는법 원재료 단백질 조지방 분석", keywords: ["강아지사료성분", "사료분석", "반려견영양"] },
    { category: "반려동물 정보", topic: "강아지 생식 vs 건사료 vs 습식 — 수의 영양학 관점 비교", searchQuery: "강아지 생식 건사료 습식 사료 비교 수의 영양학 장단점", keywords: ["강아지사료비교", "생식사료", "반려견식단"] },
    { category: "반려동물 정보", topic: "강아지가 먹으면 안 되는 음식 완전 정리 (포도, 자일리톨 등)", searchQuery: "강아지 못 먹는 음식 위험 식품 포도 초콜릿 자일리톨 양파", keywords: ["강아지위험음식", "강아지못먹는음식", "반려견식품안전"] },
    { category: "반려동물 정보", topic: "노견 사료 선택 가이드 — 관절, 소화, 체중 관리", searchQuery: "노견 시니어 강아지 사료 관절 소화 체중 영양 수의사 추천", keywords: ["노견사료", "시니어강아지", "노견건강관리"] },

    // ============================================================
    // 견종별 특징
    // ============================================================
    { category: "반려동물 정보", topic: "말티즈 키울 때 꼭 알아야 할 건강 주의점 5가지", searchQuery: "말티즈 건강 주의점 슬개골 눈물자국 치아 유전질환", keywords: ["말티즈", "말티즈건강", "소형견주의점"] },
    { category: "반려동물 정보", topic: "푸들 종류와 성격 차이 — 스탠다드부터 토이까지", searchQuery: "푸들 종류 스탠다드 미니어처 토이 성격 차이 특징", keywords: ["푸들종류", "토이푸들", "푸들성격"] },
    { category: "반려동물 정보", topic: "골든리트리버 성격과 운동량, 건강 관리 포인트", searchQuery: "골든리트리버 성격 운동량 건강관리 고관절 피부", keywords: ["골든리트리버", "대형견", "골든리트리버건강"] },
    { category: "반려동물 정보", topic: "시바견 특유의 성격과 훈련 시 주의할 점", searchQuery: "시바견 시바이누 성격 특징 훈련 주의점 고집", keywords: ["시바견", "시바이누", "시바견성격"] },
    { category: "반려동물 정보", topic: "포메라니안 미용 주기와 이중모 관리의 모든 것", searchQuery: "포메라니안 미용 이중모 관리 클리핑 빗질 방법", keywords: ["포메라니안", "포메라니안미용", "이중모관리"] },

    // ============================================================
    // 고양이 건강/케어
    // ============================================================
    { category: "반려동물 정보", topic: "고양이 구토 색깔별 원인과 병원 가야 할 타이밍", searchQuery: "고양이 구토 원인 색깔 노란 분홍 갈색 병원 수의사", keywords: ["고양이구토", "고양이건강", "반려묘병원"] },
    { category: "반려동물 정보", topic: "고양이 하부요로계 질환(FLUTD) 예방과 관리", searchQuery: "고양이 하부요로계 질환 FLUTD 방광염 요로결석 예방 수의사", keywords: ["고양이방광염", "FLUTD", "고양이요로결석"] },
    { category: "반려동물 정보", topic: "고양이 스트레스 신호 7가지와 환경 개선 방법", searchQuery: "고양이 스트레스 증상 신호 행동 변화 환경 풍부화", keywords: ["고양이스트레스", "고양이행동", "고양이환경풍부화"] },
    { category: "반려동물 정보", topic: "고양이 양치와 구강 관리 — 치은염 예방법", searchQuery: "고양이 양치 방법 치은염 구내염 구강관리 수의사", keywords: ["고양이양치", "고양이치은염", "반려묘구강관리"] },
    { category: "반려동물 정보", topic: "고양이 예방접종 종류와 실내묘도 맞아야 하는 이유", searchQuery: "고양이 예방접종 종류 실내묘 종합백신 광견병 수의사", keywords: ["고양이예방접종", "고양이백신", "실내묘건강"] },

    // ============================================================
    // 고양이 사료/영양
    // ============================================================
    { category: "반려동물 정보", topic: "고양이 사료 성분 분석 — 단백질 함량과 곡물 프리의 진실", searchQuery: "고양이 사료 성분 분석 단백질 곡물 프리 그레인프리 수의 영양학", keywords: ["고양이사료성분", "그레인프리", "반려묘영양"] },
    { category: "반려동물 정보", topic: "고양이 음수량 늘리는 방법 — 신장 건강의 핵심", searchQuery: "고양이 물 안마심 음수량 늘리기 방법 신장 건강 수의사", keywords: ["고양이음수량", "고양이물", "고양이신장건강"] },
    { category: "반려동물 정보", topic: "고양이 습식 사료의 중요성과 급여 가이드", searchQuery: "고양이 습식 사료 장점 수분 섭취 급여 방법 혼합급여", keywords: ["고양이습식사료", "고양이사료추천", "혼합급여"] },

    // ============================================================
    // 묘종별 특징
    // ============================================================
    { category: "반려동물 정보", topic: "코리안숏헤어 성격과 건강 — 한국 고양이의 매력", searchQuery: "코리안숏헤어 코숏 성격 건강 특징 유전질환", keywords: ["코리안숏헤어", "코숏", "한국고양이"] },
    { category: "반려동물 정보", topic: "러시안블루 성격과 키울 때 주의할 점", searchQuery: "러시안블루 성격 특징 건강 주의점 예민", keywords: ["러시안블루", "러시안블루성격", "반려묘종류"] },
    { category: "반려동물 정보", topic: "브리티시숏헤어 체중 관리와 건강 체크 포인트", searchQuery: "브리티시숏헤어 체중 관리 비만 건강 심장병 수의사", keywords: ["브리티시숏헤어", "브숏", "고양이비만관리"] },
    { category: "반려동물 정보", topic: "스코티시폴드 귀 관절 유전 질환의 진실", searchQuery: "스코티시폴드 유전 질환 접힌귀 관절 골연골이형성증", keywords: ["스코티시폴드", "스코티시폴드유전질환", "고양이유전병"] },

    // ============================================================
    // 계절 한정 (해당 월에만)
    // ============================================================
    { category: "반려동물 정보", topic: "봄철 반려동물 산책 시 진드기/벼룩 예방법", searchQuery: "봄 강아지 고양이 진드기 벼룩 예방 외부기생충 넥스가드", keywords: ["진드기예방", "벼룩예방", "봄산책"], seasonal: [3, 4, 5] },
    { category: "반려동물 정보", topic: "여름 반려동물 열사병 증상과 응급 대처법", searchQuery: "강아지 고양이 열사병 증상 응급처치 여름 더위", keywords: ["강아지열사병", "반려동물여름", "열사병응급"], seasonal: [6, 7, 8] },
    { category: "반려동물 정보", topic: "가을 환절기 반려동물 호흡기 질환 주의보", searchQuery: "가을 환절기 강아지 고양이 기침 호흡기 질환 예방", keywords: ["환절기건강", "강아지기침", "가을반려동물"], seasonal: [9, 10] },
    { category: "반려동물 정보", topic: "겨울철 반려동물 보온과 산책 시 동상 예방", searchQuery: "겨울 강아지 산책 보온 동상 방지 발바닥 보호", keywords: ["겨울산책", "강아지보온", "겨울반려동물"], seasonal: [11, 12, 1, 2] },

    // ============================================================
    // 펫로스를 이겨내기
    // ============================================================
    { category: "펫로스를 이겨내기", topic: "펫로스 증후군 — 의학적으로 인정된 상실 반응의 이해", searchQuery: "펫로스 증후군 증상 극복 상실감 심리학 연구 의학", keywords: ["펫로스", "펫로스증후군", "반려동물상실"] },
    { category: "펫로스를 이겨내기", topic: "반려동물을 떠나보낸 후 죄책감이 드는 마음에 대하여", searchQuery: "펫로스 죄책감 안락사 결정 후회 심리 상담", keywords: ["펫로스죄책감", "반려동물이별", "펫로스마음"] },
    { category: "펫로스를 이겨내기", topic: "아이와의 추억을 따뜻하게 간직하는 방법들", searchQuery: "반려동물 추모 방법 추억 보관 메모리얼 디지털 기록", keywords: ["반려동물추모", "펫메모리얼", "추억간직"] },
    { category: "펫로스를 이겨내기", topic: "아이를 보내고 일상으로 돌아가는 과정", searchQuery: "펫로스 극복 일상 회복 애도 과정 시간 치유", keywords: ["펫로스극복", "반려동물이별후", "애도과정"] },
    { category: "펫로스를 이겨내기", topic: "아이가 아플 때 보호자가 알아두면 좋은 것들 — 마지막 시간의 준비", searchQuery: "반려동물 임종 준비 호스피스 마지막 시간 보호자 가이드", keywords: ["반려동물임종", "펫호스피스", "마지막시간준비"] },
    { category: "펫로스를 이겨내기", topic: "가족 구성원이 펫로스를 겪을 때 옆에서 할 수 있는 일", searchQuery: "펫로스 위로 방법 가족 친구 도움 공감 하지말아야할말", keywords: ["펫로스위로", "펫로스가족", "반려동물공감"] },
    { category: "펫로스를 이겨내기", topic: "두 번째 아이를 맞이하는 마음의 준비", searchQuery: "펫로스 후 새 반려동물 입양 시기 마음 준비 죄책감", keywords: ["펫로스후입양", "새반려동물", "반려동물재입양"] },
    { category: "펫로스를 이겨내기", topic: "반려동물 장례 절차 — 화장, 수목장, 자연장 비교", searchQuery: "반려동물 장례 화장 수목장 자연장 비용 절차 장례식장", keywords: ["반려동물장례", "펫장례", "동물장례식장"] },
];

// ============================================================
// Tavily 검색
// ============================================================

async function searchTopicInfo(query: string): Promise<string> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return "";

    try {
        const client = tavily({ apiKey });
        // 1차: 전문 자료 검색
        const response = await client.search(query, {
            searchDepth: "advanced",
            maxResults: 5,
            includeAnswer: true,
            includeDomains: [
                "royalcanin.com", "fitpetmall.com", "mypetlife.co.kr",
                "petzlp.com", "wayopet.com", "naver.com",
                "tistory.com", "brunch.co.kr", "pubmed.ncbi.nlm.nih.gov",
                "youtube.com",
            ],
        });

        // 2차: YouTube 전문가 영상 검색 (강형욱, 수의사 채널 등)
        const ytResponse = await client.search(`${query} 강형욱 OR 수의사 OR 동물행동전문가 site:youtube.com`, {
            searchDepth: "basic",
            maxResults: 3,
            includeAnswer: true,
        }).catch(() => null);

        const parts: string[] = [];

        if (response.answer) {
            parts.push(`[검색 요약] ${response.answer}`);
        }

        if (response.results) {
            for (let i = 0; i < Math.min(5, response.results.length); i++) {
                const r = response.results[i];
                if (r.content) {
                    parts.push(`[출처${i + 1}: ${r.url}]\n${r.content.slice(0, 500)}`);
                }
            }
        }

        // YouTube 전문가 영상 결과 추가
        if (ytResponse?.results) {
            for (let i = 0; i < Math.min(3, ytResponse.results.length); i++) {
                const r = ytResponse.results[i];
                if (r.content) {
                    parts.push(`[YouTube 전문가: ${r.title || ""}]\n${r.content.slice(0, 400)}`);
                }
            }
        }
        if (ytResponse?.answer) {
            parts.push(`[YouTube 요약] ${ytResponse.answer}`);
        }

        return parts.join("\n\n");
    } catch {
        return "";
    }
}

// ============================================================
// 텔레그램 전송
// ============================================================

async function sendToTelegram(header: string, body: string): Promise<void> {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
    const CHAT_ID = process.env.TELEGRAM_CHAT_SYSTEM || process.env.TELEGRAM_CHAT_ID || "";
    if (!BOT_TOKEN || !CHAT_ID) return;

    const send = async (text: string, parseMode?: string) => {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text,
                ...(parseMode ? { parse_mode: parseMode } : {}),
                disable_web_page_preview: true,
            }),
        });
    };

    await send(header, "HTML");

    // 본문 분할 (3500자씩)
    for (let i = 0; i < body.length; i += 3500) {
        await send(body.slice(i, i + 3500));
    }
}

// ============================================================
// 메인 핸들러
// ============================================================

export async function GET(request: NextRequest) {
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "OPENAI_API_KEY_MISSING" }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey });
        const { dateStr } = getKstTime();
        const currentMonth = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCMonth() + 1;

        // 현재 월에 맞는 토픽만 필터 (계절 한정 + 연중)
        const availableTopics = BLOG_TOPICS.filter(
            t => !t.seasonal || t.seasonal.includes(currentMonth)
        );

        // 날짜 기반 토픽 선택 (매일 순환)
        const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % availableTopics.length;
        const selectedTopic = availableTopics[dayIndex];

        // 1. Tavily로 최신 정보 검색
        const searchContext = await searchTopicInfo(selectedTopic.searchQuery);

        // 2. GPT로 블로그 글 생성 (검색 결과 주입)
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 3000,
            temperature: 0.75,
            messages: [
                {
                    role: "system",
                    content: `당신은 수의학 지식을 갖춘 반려동물 전문 블로거입니다. 네이버 블로그에 게시할 정보성 글을 작성합니다.

## 작성 규칙
- 한국어, 존댓말 (~해요/~됩니다 체)
- 1800~2500자 분량
- 소제목 4~5개로 구조화
- 수의사/전문가 의견을 인용하는 느낌으로 (예: "수의사들은 ~을 권장합니다")
- YouTube 전문가(강형욱, 수의사 채널 등) 정보가 있으면 "강형욱 훈련사에 따르면~", "반려동물 전문 수의사 채널에서는~" 식으로 자연스럽게 인용
- 구체적 수치, 방법, 단계를 포함 (예: "하루 2~3회, 한 번에 15~20분")
- 의학적 확정 진단은 피하고 반드시 "수의사 상담을 권장합니다" 포함
- 이모지 사용 금지
- 네이버 SEO: 핵심 키워드를 제목/소제목/본문에 자연스럽게 3~4회 반복
- 마지막 단락에서 메멘토애니(mementoani.com)를 자연스럽게 1회 언급
  - 반려동물 정보글: "반려동물의 건강 기록과 케어 리마인더를 한곳에서 관리하고 싶다면 메멘토애니(mementoani.com)를 활용해보세요"
  - 펫로스글: "반려동물과의 소중한 추억을 따뜻하게 간직하고 싶다면 메멘토애니(mementoani.com)에서 디지털 메모리얼을 만들어보세요"

## 절대 하지 말 것
- 근거 없는 민간요법 추천
- 특정 브랜드 사료/약품 직접 추천 (성분 기준으로만 설명)
- 수의사 진료를 대체하는 진단/처방
- 과장된 효과나 공포 마케팅

## 출력 형식
[제목]
(네이버 검색에 잘 걸리는 30자 이내 제목)

[본문]
(소제목과 본문, 줄바꿈으로 구분)

[태그]
(#해시태그1 #해시태그2 ... 12~15개)`,
                },
                {
                    role: "user",
                    content: `주제: ${selectedTopic.topic}
카테고리: ${selectedTopic.category}
핵심 키워드: ${selectedTopic.keywords.join(", ")}

${searchContext ? `## 참고 자료 (아래 검색 결과를 바탕으로 정확한 정보를 작성하세요)\n\n${searchContext}` : "## 참고 자료 없음\n일반적으로 알려진 수의학 지식을 바탕으로 작성하세요."}`,
                },
            ],
        });

        const content = completion.choices[0]?.message?.content || "";

        // 제목/본문/태그 파싱
        const titleMatch = content.match(/\[제목\]\s*\n(.+)/);
        const bodyMatch = content.match(/\[본문\]\s*\n([\s\S]+?)(?:\[태그\]|$)/);
        const tagMatch = content.match(/\[태그\]\s*\n(.+)/);

        const title = titleMatch?.[1]?.trim() || selectedTopic.topic;
        const body = bodyMatch?.[1]?.trim() || content;
        const tags = tagMatch?.[1]?.trim() || selectedTopic.keywords.map(k => `#${k}`).join(" ");

        // 3. 텔레그램 전송
        const header = [
            `<b>[블로그 초안 - ${dateStr}]</b>`,
            `카테고리: ${selectedTopic.category}`,
            `제목: ${title}`,
            `검색 소스: ${searchContext ? "Tavily 검색 결과 반영" : "일반 지식 기반"}`,
            ``,
            `태그: ${tags}`,
            ``,
            `--- 본문 (아래 복사해서 네이버 블로그에 붙여넣기) ---`,
        ].join("\n");

        await sendToTelegram(header, body);

        // 4. 오늘의 릴스/쇼츠 대본 생성 + 전송
        const reelsCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 800,
            temperature: 0.85,
            messages: [
                {
                    role: "system",
                    content: `당신은 메멘토애니(반려동물 메모리얼 플랫폼)의 숏폼 콘텐츠 기획자입니다.
인스타그램 릴스/유튜브 쇼츠용 15~30초 대본을 작성합니다.

## 규칙
- 첫 1초에 강한 훅 (질문, 숫자, 감성 문장)
- 자막 기반 (음소거로 보는 유저 대응)
- 마지막에 메멘토애니 자연스럽게 언급 (매번 다른 방식으로)
- 존댓말, 이모지 없음
- 매일 다른 컨셉: 감성/공감, 정보/꿀팁, 트렌딩/밈, 서비스 소개 중 하나

## 컨셉 분배 (4일 주기)
- 1일차: 감성/공감 (반려동물과의 일상, 이별, 그리움)
- 2일차: 정보/꿀팁 (수의학 기반 건강/케어/사료 정보)
- 3일차: 트렌딩/밈 (유머, 공감, 바이럴 포맷)
- 4일차: 서비스 소개 (AI 펫톡, AI 영상, 미니홈피, 타임라인 등)

## 출력 형식
[컨셉] (한 줄 설명)
[대본] (자막 텍스트, 줄바꿈으로 구분)
[영상 연출] (촬영/편집 가이드 3줄)
[해시태그] (12~15개)`,
                },
                {
                    role: "user",
                    content: `오늘 날짜: ${dateStr}\n오늘은 ${dayIndex % 4 + 1}일차 컨셉으로 작성하세요.\n\n오늘의 블로그 주제가 "${selectedTopic.topic}" (${selectedTopic.category})이니, 가능하면 비슷한 주제로 릴스도 만들되 형식은 완전히 다르게 (짧고 임팩트 있게).`,
                },
            ],
        });

        const reelsContent = reelsCompletion.choices[0]?.message?.content || "";

        const reelsHeader = [
            ``,
            `<b>[오늘의 릴스/쇼츠 대본 - ${dateStr}]</b>`,
            `컨셉 타입: ${["감성/공감", "정보/꿀팁", "트렌딩/밈", "서비스 소개"][dayIndex % 4]}`,
            ``,
            `--- 아래 복사해서 촬영/편집 ---`,
        ].join("\n");

        await sendToTelegram(reelsHeader, reelsContent);

        return NextResponse.json({
            success: true,
            date: dateStr,
            category: selectedTopic.category,
            title,
            bodyLength: body.length,
            hasSearchContext: !!searchContext,
            tags,
            reels: true,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        import("@/lib/telegram").then(({ notifyError }) =>
            notifyError({ endpoint: "blog-generate", error: msg })
        ).catch(() => {});
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
