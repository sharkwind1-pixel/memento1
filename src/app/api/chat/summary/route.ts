/**
 * 대화 세션 요약 저장 API
 * 새 대화 시작 시 이전 대화를 요약하여 DB에 저장
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createServerSupabase } from "@/lib/supabase-server";
import { checkRateLimitDB } from "@/lib/rate-limit";

// 비용 가드 상수 (GPT 호출 입력 캡)
const MAX_MESSAGES = 60;          // messages 배열 최대 개수 (최근 우선)
const MAX_CONTENT_LENGTH = 1000;  // 항목당 content 최대 길이
const MAX_TOTAL_CHARS = 8000;     // 전체 텍스트 절단 (끝부분 우선 보존 — 최근 대화가 중요)

export async function POST(request: NextRequest) {
    try {
        // 인증 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "인증이 필요합니다." },
                { status: 401 }
            );
        }

        // 비용 가드: 분당 rate limit (DB 기반)
        const rate = await checkRateLimitDB(user.id, "general");
        if (!rate.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요." },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { petId, petName, messages, isMemorial } = body;

        if (!petId || !petName || !messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: "필수 파라미터가 누락되었습니다." },
                { status: 400 }
            );
        }

        // 펫 소유권 검증 (다른 유저의 petId 사용 방지)
        const supabase = await createServerSupabase();
        const { data: ownedPet } = await supabase
            .from("pets")
            .select("id")
            .eq("id", petId)
            .eq("user_id", user.id)
            .single();

        if (!ownedPet) {
            return NextResponse.json(
                { error: "잘못된 접근입니다." },
                { status: 403 }
            );
        }

        // 대화가 너무 짧으면 요약 불필요 (인사말만 있는 경우 등)
        if (messages.length < 4) {
            return NextResponse.json({ saved: false, reason: "대화가 너무 짧습니다." });
        }

        // 비용 가드: 최대 60개(최근 우선) + 항목당 content 1000자 캡 (초과분은 잘라서 진행)
        const cappedMessages = (messages as Array<{ role?: unknown; content?: unknown }>)
            .slice(-MAX_MESSAGES)
            .map((msg) => ({
                role: String(msg?.role ?? "user"),
                content: String(msg?.content ?? "").slice(0, MAX_CONTENT_LENGTH),
            }));

        // 비용 가드: 전체 텍스트 8000자 절단 — 뒤(최근 대화)부터 채워서 끝부분 우선 보존
        const trimmedMessages: Array<{ role: string; content: string }> = [];
        let totalChars = 0;
        for (let i = cappedMessages.length - 1; i >= 0; i--) {
            const msg = cappedMessages[i];
            if (totalChars + msg.content.length > MAX_TOTAL_CHARS) {
                const remaining = MAX_TOTAL_CHARS - totalChars;
                if (remaining > 0) {
                    // 마지막으로 들어가는 (가장 오래된) 메시지는 뒷부분만 보존
                    trimmedMessages.unshift({ role: msg.role, content: msg.content.slice(-remaining) });
                }
                break;
            }
            trimmedMessages.unshift(msg);
            totalChars += msg.content.length;
        }

        // agent 모듈 동적 import (빌드 시점 환경변수 에러 방지)
        const agent = await import("@/lib/agent");

        // 대화 요약 생성
        const summary = await agent.generateConversationSummary(
            trimmedMessages,
            petName,
            isMemorial ?? false
        );

        if (!summary) {
            return NextResponse.json({ saved: false, reason: "요약 생성 실패" });
        }

        // 요약 저장 — 모드 태깅으로 일상/추모 데이터 분리
        const chatMode = isMemorial ? "memorial" : "daily";
        const result = await agent.saveConversationSummary(user.id, petId, summary, chatMode);

        if (!result) {
            return NextResponse.json({ saved: false, reason: "저장 실패" });
        }

        return NextResponse.json({ saved: true, summary: summary.summary });
    } catch (error) {
        console.error("[chat/summary]", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "세션 요약 저장 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
