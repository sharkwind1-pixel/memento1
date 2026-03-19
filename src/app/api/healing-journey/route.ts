/**
 * 치유의 여정 API
 * 추모 모드 대화의 감정 추이 및 애도 단계 진행 상황 집계
 *
 * GET /api/healing-journey?petId={petId}
 *
 * 응답:
 * - emotionTrend: 날짜별 감정 분포
 * - griefProgress: 애도 단계 진행 추이
 * - conversationCount: 총 대화 세션 수
 * - lastConversation: 마지막 대화 날짜
 * - healingMilestones: 치유 마일스톤 달성 여부
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createServerSupabase } from "@/lib/supabase-server";
import type { EmotionType, GriefStage } from "@/types";
import { isValidEmotion, isValidGriefStage } from "@/types";

// 애도 단계 순서 (치유 진행 방향)
const GRIEF_STAGE_ORDER: GriefStage[] = ["denial", "anger", "bargaining", "depression", "acceptance", "unknown"];

// 감정 분류 (긍정/중립/부정)
const EMOTION_CATEGORIES: Record<EmotionType, "positive" | "neutral" | "negative"> = {
    happy: "positive",
    excited: "positive",
    grateful: "positive",
    peaceful: "positive",
    neutral: "neutral",
    sad: "negative",
    lonely: "negative",
    anxious: "negative",
    angry: "negative",
};

interface EmotionTrendItem {
    date: string;
    emotions: Record<EmotionType, number>;
    dominant: EmotionType;
    category: "positive" | "neutral" | "negative";
}

interface GriefProgressItem {
    date: string;
    stage: GriefStage;
    stageIndex: number; // 0-5 (낮을수록 초기, 5=acceptance)
}

interface HealingMilestone {
    id: string;
    title: string;
    description: string;
    achieved: boolean;
    achievedDate?: string;
}

export async function GET(request: NextRequest) {
    try {
        // 인증 체크
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        // petId 파라미터 확인
        const { searchParams } = new URL(request.url);
        const petId = searchParams.get("petId");

        if (!petId) {
            return NextResponse.json(
                { error: "petId 파라미터가 필요합니다." },
                { status: 400 }
            );
        }

        const supabase = await createServerSupabase();

        // 1. 해당 펫이 유저 소유인지 + 추모 모드인지 확인
        const { data: pet, error: petError } = await supabase
            .from("pets")
            .select("id, name, status")
            .eq("id", petId)
            .eq("user_id", user.id)
            .single();

        if (petError || !pet) {
            return NextResponse.json(
                { error: "반려동물을 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        if (pet.status !== "memorial") {
            return NextResponse.json(
                { error: "기억 모드 반려동물만 치유의 여정을 조회할 수 있습니다." },
                { status: 400 }
            );
        }

        // 2. conversation_summaries에서 감정/애도 데이터 조회
        const { data: summaries, error: summaryError } = await supabase
            .from("conversation_summaries")
            .select("session_date, emotional_tone, grief_progress, key_topics")
            .eq("pet_id", petId)
            .eq("user_id", user.id)
            .order("session_date", { ascending: true })
            .limit(500);

        if (summaryError) {
            console.error("[healing-journey] summaries query error:", summaryError.message);
            return NextResponse.json(
                { error: "데이터를 불러오는 중 오류가 발생했습니다." },
                { status: 500 }
            );
        }

        // 3. 감정 추이 집계 (날짜별)
        const emotionByDate: Record<string, Record<EmotionType, number>> = {};
        const griefByDate: Record<string, GriefStage> = {};

        for (const s of summaries || []) {
            const date = s.session_date;
            const emotion: EmotionType = isValidEmotion(s.emotional_tone) ? s.emotional_tone : "neutral";
            const grief: GriefStage | null = isValidGriefStage(s.grief_progress) ? s.grief_progress : null;

            // 감정 카운트
            if (!emotionByDate[date]) {
                emotionByDate[date] = {} as Record<EmotionType, number>;
            }
            emotionByDate[date][emotion] = (emotionByDate[date][emotion] || 0) + 1;

            // 애도 단계 (마지막 값 사용)
            if (grief) {
                griefByDate[date] = grief;
            }
        }

        // 4. 감정 추이 배열 생성
        const emotionTrend: EmotionTrendItem[] = Object.entries(emotionByDate).map(([date, emotions]) => {
            // 가장 많은 감정 찾기
            let dominant: EmotionType = "neutral";
            let maxCount = 0;
            for (const [emotion, count] of Object.entries(emotions)) {
                if (count > maxCount) {
                    maxCount = count;
                    dominant = emotion as EmotionType;
                }
            }

            return {
                date,
                emotions,
                dominant,
                category: EMOTION_CATEGORIES[dominant] || "neutral",
            };
        });

        // 5. 애도 단계 진행 배열 생성
        const griefProgress: GriefProgressItem[] = Object.entries(griefByDate).map(([date, stage]) => ({
            date,
            stage,
            stageIndex: GRIEF_STAGE_ORDER.indexOf(stage),
        }));

        // 6. 치유 마일스톤 계산
        const milestones: HealingMilestone[] = [];

        // 마일스톤 1: 첫 대화
        const firstConversation = summaries && summaries.length > 0;
        milestones.push({
            id: "first_conversation",
            title: "첫 대화",
            description: `${pet.name}와(과) 다시 이야기를 시작했어요`,
            achieved: firstConversation,
            achievedDate: firstConversation ? summaries[0].session_date : undefined,
        });

        // 마일스톤 2: 10회 대화
        const tenConversations = summaries && summaries.length >= 10;
        milestones.push({
            id: "ten_conversations",
            title: "꾸준한 대화",
            description: `${pet.name}와(과) 10번 이상 대화했어요`,
            achieved: tenConversations,
            achievedDate: tenConversations ? summaries[9].session_date : undefined,
        });

        // 마일스톤 3: 긍정 감정 등장
        const hasPositiveEmotion = emotionTrend.some(e => e.category === "positive");
        const firstPositiveDate = emotionTrend.find(e => e.category === "positive")?.date;
        milestones.push({
            id: "first_positive",
            title: "따뜻한 순간",
            description: "대화 중 긍정적인 감정을 느꼈어요",
            achieved: hasPositiveEmotion,
            achievedDate: firstPositiveDate,
        });

        // 마일스톤 4: acceptance 단계 도달
        const reachedAcceptance = griefProgress.some(g => g.stage === "acceptance");
        const acceptanceDate = griefProgress.find(g => g.stage === "acceptance")?.date;
        milestones.push({
            id: "acceptance",
            title: "함께한 시간의 소중함",
            description: "이별을 받아들이고 추억을 감사히 여기게 됐어요",
            achieved: reachedAcceptance,
            achievedDate: acceptanceDate,
        });

        // 마일스톤 5: 30일 연속 (또는 30회)
        const thirtyConversations = summaries && summaries.length >= 30;
        milestones.push({
            id: "thirty_conversations",
            title: "한 달의 치유",
            description: `${pet.name}와(과) 30번 이상 대화하며 치유의 시간을 보냈어요`,
            achieved: thirtyConversations,
            achievedDate: thirtyConversations ? summaries[29].session_date : undefined,
        });

        // 7. 최근 감정 상태 (마지막 5개 평균)
        const recentEmotions = emotionTrend.slice(-5);
        const recentPositiveRatio = recentEmotions.length > 0
            ? recentEmotions.filter(e => e.category === "positive").length / recentEmotions.length
            : 0;

        // 8. 응답 구성
        return NextResponse.json({
            petId,
            petName: pet.name,
            conversationCount: summaries?.length || 0,
            lastConversation: summaries && summaries.length > 0
                ? summaries[summaries.length - 1].session_date
                : null,
            emotionTrend,
            griefProgress,
            milestones,
            recentPositiveRatio,
            // 요약 통계
            summary: {
                totalSessions: summaries?.length || 0,
                milestonesAchieved: milestones.filter(m => m.achieved).length,
                totalMilestones: milestones.length,
                currentGriefStage: griefProgress.length > 0
                    ? griefProgress[griefProgress.length - 1].stage
                    : null,
            },
        });
    } catch (error) {
        console.error("[healing-journey] error:", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
