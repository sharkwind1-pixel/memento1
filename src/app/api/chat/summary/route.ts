/**
 * 대화 세션 요약 저장 API
 * 새 대화 시작 시 이전 대화를 요약하여 DB에 저장
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase-server";

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

        const body = await request.json();
        const { petId, petName, messages, isMemorial } = body;

        if (!petId || !petName || !messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: "필수 파라미터가 누락되었습니다." },
                { status: 400 }
            );
        }

        // 대화가 너무 짧으면 요약 불필요 (인사말만 있는 경우 등)
        if (messages.length < 4) {
            return NextResponse.json({ saved: false, reason: "대화가 너무 짧습니다." });
        }

        // agent 모듈 동적 import (빌드 시점 환경변수 에러 방지)
        const agent = await import("@/lib/agent");

        // 대화 요약 생성
        const summary = await agent.generateConversationSummary(
            messages.map((msg: { role: string; content: string }) => ({
                role: msg.role,
                content: msg.content,
            })),
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
