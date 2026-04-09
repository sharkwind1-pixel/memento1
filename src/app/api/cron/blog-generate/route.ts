/**
 * 네이버 블로그 초안 자동 생성 크론
 * GET /api/cron/blog-generate
 *
 * 매일 09시(KST) 실행
 * GPT-4o-mini로 반려동물 관련 블로그 글 초안 생성 → 텔레그램 전송
 * 승빈님이 복사해서 네이버 블로그에 게시
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyCronSecret, getKstTime } from "@/lib/cron-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ============================================================
// 카테고리 & 토픽 풀
// ============================================================

interface BlogTopic {
    category: "반려동물 정보" | "펫로스를 이겨내기" | "메멘토애니소식";
    topic: string;
    keywords: string[];
}

const BLOG_TOPICS: BlogTopic[] = [
    // 반려동물 정보 (검색 유입용)
    { category: "반려동물 정보", topic: "강아지 산책 시간과 횟수, 계절별로 다르게", keywords: ["강아지산책", "강아지산책시간", "반려견산책"] },
    { category: "반려동물 정보", topic: "고양이 예방접종 시기와 종류 총정리", keywords: ["고양이예방접종", "고양이백신", "반려묘건강"] },
    { category: "반려동물 정보", topic: "강아지가 풀을 뜯어먹는 이유와 대처법", keywords: ["강아지풀", "강아지행동", "반려견건강"] },
    { category: "반려동물 정보", topic: "고양이 구토 원인과 병원에 가야 할 때", keywords: ["고양이구토", "고양이건강", "반려묘"] },
    { category: "반려동물 정보", topic: "반려동물 건강검진 체크리스트와 적정 주기", keywords: ["반려동물건강검진", "강아지건강검진", "고양이건강검진"] },
    { category: "반려동물 정보", topic: "강아지 분리불안 증상과 훈련 방법", keywords: ["강아지분리불안", "분리불안훈련", "반려견행동"] },
    { category: "반려동물 정보", topic: "고양이 사료 선택 가이드 (건사료 vs 습식)", keywords: ["고양이사료", "고양이사료추천", "반려묘사료"] },
    { category: "반려동물 정보", topic: "강아지 이빨 관리와 양치 방법", keywords: ["강아지양치", "강아지치석", "반려견치아관리"] },
    { category: "반려동물 정보", topic: "반려동물과 함께하는 여행 준비 체크리스트", keywords: ["반려동물여행", "강아지여행", "펫프렌들리"] },
    { category: "반려동물 정보", topic: "고양이 스트레스 신호와 해소 방법", keywords: ["고양이스트레스", "고양이행동", "반려묘케어"] },
    { category: "반려동물 정보", topic: "강아지 간식 고르는 법과 주의사항", keywords: ["강아지간식", "강아지간식추천", "반려견간식"] },
    { category: "반려동물 정보", topic: "다묘가정 고양이 합사 방법 단계별 가이드", keywords: ["고양이합사", "다묘가정", "고양이사회화"] },
    { category: "반려동물 정보", topic: "강아지 피부병 종류와 관리 방법", keywords: ["강아지피부병", "강아지아토피", "반려견피부"] },
    { category: "반려동물 정보", topic: "반려동물 보험 비교와 가입 시 체크포인트", keywords: ["반려동물보험", "펫보험", "강아지보험"] },
    { category: "반려동물 정보", topic: "고양이 화장실 모래 종류별 장단점", keywords: ["고양이모래", "고양이화장실", "반려묘용품"] },

    // 펫로스를 이겨내기 (핵심 타겟)
    { category: "펫로스를 이겨내기", topic: "펫로스 증후군이란? 증상과 극복 방법", keywords: ["펫로스", "펫로스증후군", "반려동물이별"] },
    { category: "펫로스를 이겨내기", topic: "반려동물을 떠나보낸 후 일상을 회복하는 법", keywords: ["펫로스극복", "반려동물추모", "무지개다리"] },
    { category: "펫로스를 이겨내기", topic: "아이를 보내고 나서 죄책감이 드는 당신에게", keywords: ["펫로스죄책감", "반려동물이별", "펫로스마음"] },
    { category: "펫로스를 이겨내기", topic: "가족이 펫로스를 겪고 있을 때 도와주는 방법", keywords: ["펫로스가족", "펫로스위로", "반려동물상실"] },
    { category: "펫로스를 이겨내기", topic: "아이와의 추억을 따뜻하게 간직하는 5가지 방법", keywords: ["반려동물추억", "펫메모리얼", "추모방법"] },
    { category: "펫로스를 이겨내기", topic: "두 번째 반려동물을 맞이해도 괜찮을까", keywords: ["펫로스후입양", "반려동물재입양", "새반려동물"] },
    { category: "펫로스를 이겨내기", topic: "무지개다리를 건넌 아이에게 보내는 편지", keywords: ["무지개다리", "반려동물편지", "펫로스치유"] },
    { category: "펫로스를 이겨내기", topic: "반려동물 장례 절차와 준비 방법", keywords: ["반려동물장례", "펫장례", "동물장례식장"] },
];

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

        // 날짜 기반으로 토픽 선택 (매일 다른 토픽, 순환)
        const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % BLOG_TOPICS.length;
        const selectedTopic = BLOG_TOPICS[dayIndex];

        // GPT로 블로그 글 생성
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 2000,
            temperature: 0.8,
            messages: [
                {
                    role: "system",
                    content: `당신은 반려동물 전문 블로거입니다. 네이버 블로그에 게시할 글을 작성합니다.

규칙:
- 한국어로 작성
- 친근하고 따뜻한 말투 (반말 X, 존댓말 O, ~해요/~됩니다 체)
- 1500~2000자 분량
- 소제목 3~4개로 구성
- 실용적이고 구체적인 정보 포함
- 마지막에 자연스럽게 메멘토애니(mementoani.com) 언급 (반려동물 기록/AI 펫톡/추모 서비스)
- 이모지 사용 금지
- 의학적 확정 진단은 피하고 "수의사 상담을 권장합니다" 포함
- 네이버 SEO를 위해 핵심 키워드를 자연스럽게 2~3회 반복

출력 형식:
[제목]
(블로그 제목, 30자 이내)

[본문]
(소제목과 본문)

[태그]
(쉼표로 구분된 해시태그 10~15개)`,
                },
                {
                    role: "user",
                    content: `주제: ${selectedTopic.topic}\n카테고리: ${selectedTopic.category}\n핵심 키워드: ${selectedTopic.keywords.join(", ")}`,
                },
            ],
        });

        const content = completion.choices[0]?.message?.content || "";

        // 제목/본문/태그 파싱
        const titleMatch = content.match(/\[제목\]\s*\n(.+)/);
        const bodyMatch = content.match(/\[본문\]\s*\n([\s\S]+?)\[태그\]/);
        const tagMatch = content.match(/\[태그\]\s*\n(.+)/);

        const title = titleMatch?.[1]?.trim() || selectedTopic.topic;
        const body = bodyMatch?.[1]?.trim() || content;
        const tags = tagMatch?.[1]?.trim() || selectedTopic.keywords.map(k => `#${k}`).join(" ");

        // 텔레그램으로 초안 전송
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
        const CHAT_ID = process.env.TELEGRAM_CHAT_SYSTEM || process.env.TELEGRAM_CHAT_ID || "";

        if (BOT_TOKEN && CHAT_ID) {
            // 텔레그램 메시지 길이 제한 (4096자)이 있으므로 분할 전송
            const header = [
                `<b>[블로그 초안 - ${dateStr}]</b>`,
                `카테고리: ${selectedTopic.category}`,
                `제목: ${title}`,
                ``,
                `태그: ${tags}`,
                ``,
                `--- 본문 ---`,
            ].join("\n");

            // 헤더 전송
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: header,
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                }),
            });

            // 본문 분할 전송 (4000자씩)
            const chunks: string[] = [];
            for (let i = 0; i < body.length; i += 3500) {
                chunks.push(body.slice(i, i + 3500));
            }

            for (const chunk of chunks) {
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: CHAT_ID,
                        text: chunk,
                        disable_web_page_preview: true,
                    }),
                });
            }
        }

        return NextResponse.json({
            success: true,
            date: dateStr,
            category: selectedTopic.category,
            title,
            bodyLength: body.length,
            tags,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";

        // 에러 텔레그램 알림
        import("@/lib/telegram").then(({ notifyError }) =>
            notifyError({ endpoint: "blog-generate", error: msg })
        ).catch(() => {});

        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
