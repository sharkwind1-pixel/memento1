/**
 * AI 펫톡 에이전트 API Route
 * 장기 메모리 + 감정 인식 시스템
 *
 * 파이프라인 함수 -> chat-pipeline.ts
 * 헬퍼/컨텍스트 빌더 -> chat-helpers.ts
 * 시스템 프롬프트 생성 -> chat-prompts.ts
 */

// Next.js 빌드 시점 정적 분석 방지 (환경변수 런타임 접근 필요)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { AI_CONFIG, AI_INPUT_LIMITS } from "@/config/constants";
import {
    validateAndParseInput,
    checkSecurityLimits,
    buildAIContext,
    postProcessResponse,
    saveAndRespond,
} from "./chat-pipeline";

// ---- 싱글턴 ----

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
    if (!openaiInstance) {
        openaiInstance = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiInstance;
}

// ---- POST 핸들러 (지휘자) ----

export async function POST(request: NextRequest) {
    try {
        // 1단계: 입력 검증 & 파싱
        const parseResult = await validateAndParseInput(request);
        if (parseResult instanceof NextResponse) return parseResult;
        const parsedInput = parseResult;

        // 2단계: 보안 검증 (rate-limit, 인증, 프리미엄, 쿨다운, 인젝션)
        const securityResult = await checkSecurityLimits(parsedInput);
        if (securityResult instanceof NextResponse) return securityResult;
        const security = securityResult;

        // 3단계: AI 컨텍스트 빌드 (감정, 메모리, 프롬프트 생성)
        const aiContext = await buildAIContext(parsedInput, security);

        // 3.5단계: 범위 밖 반복 시도 → GPT 호출 스킵, 고정 응답 반환
        if (aiContext.offTopicBlock?.blocked) {
            const encoder = new TextEncoder();
            const fixedReply = aiContext.offTopicBlock.fixedReply;
            const readableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: fixedReply })}\n\n`));
                    const isMemorial = aiContext.isMemorialMode;
                    const offTopicSuggestions = isMemorial
                        ? ["좋았던 기억 얘기해줘", "너와 함께한 날들", "보고 싶은 마음"]
                        : ["오늘 산책 갔어?", "뭐 하고 놀까?", "간식 뭐 줄까?"];
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: "done",
                        reply: fixedReply,
                        suggestedQuestions: offTopicSuggestions,
                        emotion: "neutral",
                        emotionScore: 0.5,
                        remaining: security.dailyUsage.remaining,
                        isWarning: security.dailyUsage.isWarning,
                    })}\n\n`));
                    controller.close();
                },
            });
            return new Response(readableStream, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            });
        }

        // 4단계: OpenAI API 스트리밍 호출
        const randomSeed = Math.floor(Math.random() * 1000000);
        const openaiStream = await getOpenAI().chat.completions.create({
            model: AI_CONFIG.AI_MODEL,
            messages: [
                { role: "system", content: aiContext.systemPrompt },
                ...aiContext.recentHistory,
                { role: "user", content: `<user_input>${parsedInput.sanitizedMessage}</user_input>` },
            ],
            max_tokens: AI_CONFIG.AI_MAX_TOKENS,
            temperature: aiContext.mode === "memorial" ? AI_CONFIG.AI_TEMPERATURE_MEMORIAL : AI_CONFIG.AI_TEMPERATURE_DAILY,
            presence_penalty: aiContext.isMemorialMode ? 0.5 : 0.7,
            frequency_penalty: aiContext.isMemorialMode ? 0.3 : 0.6,
            seed: randomSeed,
            stream: true,
        });

        // 5단계: SSE 스트리밍 응답 생성
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                let fullText = "";
                const suggestionsMarker = "---SUGGESTIONS---";
                const pendingTopicMarker = "---PENDING_TOPIC---";

                let markerDetected = false;
                let sentLength = 0;

                try {
                    // 스트림 청크 수신 및 클라이언트 전송
                    for await (const chunk of openaiStream) {
                        const delta = chunk.choices[0]?.delta?.content || "";
                        if (!delta) continue;

                        fullText += delta;

                        if (!markerDetected) {
                            const sugIdx = fullText.indexOf(suggestionsMarker);
                            const ptIdx = fullText.indexOf(pendingTopicMarker);
                            const markerIdx = Math.min(
                                sugIdx >= 0 ? sugIdx : Infinity,
                                ptIdx >= 0 ? ptIdx : Infinity,
                            );

                            if (markerIdx !== Infinity) {
                                markerDetected = true;
                                const unsent = fullText.substring(sentLength, markerIdx);
                                if (unsent) {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: unsent })}\n\n`));
                                    sentLength = markerIdx;
                                }
                            } else {
                                const safeEnd = fullText.length - 20;
                                if (safeEnd > sentLength) {
                                    const unsent = fullText.substring(sentLength, safeEnd);
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: unsent })}\n\n`));
                                    sentLength = safeEnd;
                                }
                            }
                        }
                    }

                    // 스트림 완료 - 남은 텍스트 전송
                    if (!markerDetected && sentLength < fullText.length) {
                        const unsent = fullText.substring(sentLength);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: unsent })}\n\n`));
                    }

                    // 6단계: 응답 후처리 (마커 파싱, 검증, 매칭)
                    const processed = await postProcessResponse(fullText, parsedInput, security, aiContext);

                    // 최종 메타데이터 이벤트 전송
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: "done",
                        reply: processed.reply,
                        suggestedQuestions: processed.suggestedQuestions,
                        emotion: aiContext.userEmotion,
                        emotionScore: aiContext.emotionScore,
                        griefStage: aiContext.isMemorialMode ? aiContext.griefStage : undefined,
                        remaining: security.dailyUsage.remaining,
                        isWarning: security.dailyUsage.isWarning,
                        crisisAlert: aiContext.crisisAlert,
                        sessionEndingSuggestion: aiContext.sessionEndingSuggestion,
                        matchedPhoto: processed.matchedPhoto,
                        matchedTimeline: processed.matchedTimeline,
                        suggestedReminder: processed.suggestedReminder,
                        ...(aiContext.nearbyPlaces.length > 0 ? {
                            nearbyPlaces: {
                                query: aiContext.placeKeyword,
                                places: aiContext.nearbyPlaces.map(p => ({
                                    name: p.name,
                                    category: p.category,
                                    distance: p.distance,
                                    address: p.address,
                                    mapUrl: p.mapUrl,
                                })),
                            },
                        } : {}),
                    })}\n\n`));

                    // 7단계: 저장 & 후속 처리 (fire-and-forget)
                    saveAndRespond(parsedInput, security, aiContext, processed);

                } catch (streamErr) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: "error",
                        error: "AI 응답 생성 중 오류가 발생했습니다.",
                    })}\n\n`));
                    console.error("[chat/stream-error]", streamErr instanceof Error ? streamErr.message : streamErr);
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error) {
        // OpenAI API 에러 처리
        if (error instanceof OpenAI.APIError) {
            console.error(`[chat/openai-error] status=${error.status} message=${error.message}`);
            if (error.status === 401) {
                return NextResponse.json(
                    { error: "OpenAI API 인증에 실패했습니다." },
                    { status: 401 }
                );
            }
            if (error.status === 429) {
                return NextResponse.json(
                    { error: "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." },
                    { status: 429 }
                );
            }
            if (error.status === 500 || error.status === 502 || error.status === 503) {
                return NextResponse.json(
                    { error: "AI 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요." },
                    { status: 503 }
                );
            }
        }

        console.error("[chat/error]", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "AI 응답을 생성하는 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
