/**
 * 게스트 AI 펫톡 체험 API (비로그인 경량 경로)
 *
 * 펫홈 Phase 0 ③. 비회원이 가입 전 AI펫톡을 "맛보기"로 체험(기본 3회) → 가입 전환 유도.
 *
 * 메인 /api/chat 과 분리된 경량 경로:
 *  - 인증/DB/메모리/타임라인/사진매칭/포인트 전부 없음 (user.id 의존 0)
 *  - 코어 모델(gpt-4o-mini)·일상 시스템 프롬프트(getDailySystemPrompt)·가드만 재사용
 *  - 데모펫 사용 (일상 모드만 — 추모는 본인 펫 데이터 필요)
 *
 * 비용/악용 방어:
 *  - IP 분당 rate-limit(guestChat) + 전역 일일 비용캡(checkGlobalDailyLimit) + VPN 차단
 *  - 3회 제한은 클라 localStorage(UX) + 서버는 trialCount 보고값으로 가입유도(하드 비용방어는 위 3중 가드)
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { AI_CONFIG } from "@/config/constants";
import {
    getClientIP,
    checkRateLimit,
    checkDailyUsageDB,
    checkGlobalDailyLimit,
    checkGuestGlobalDailyLimit,
    getRateLimitHeaders,
    sanitizeInput,
    sanitizeAIOutput,
    detectPromptInjection,
    checkVPN,
    getVPNBlockResponse,
} from "@/lib/rate-limit";
import { getDailySystemPrompt } from "../chat-prompts";
import { fixKoreanParticles } from "@/lib/agent/helpers";
import type { PetInfo } from "../chat-helpers";

// 게스트 체험 기본 횟수 (클라 localStorage와 일치)
const GUEST_TRIAL_LIMIT = 3;
// 게스트 메시지 길이 상한 (무료 회원과 동일 — 비용/악용 방어)
const GUEST_MESSAGE_MAX = 200;
const GUEST_PET_NAME_MAX = 12;

// 게스트 데모펫 (고정) — 일상 모드 밝은 강아지
const DEMO_PET: PetInfo = {
    name: "초코",
    type: "강아지",
    breed: "푸들",
    gender: "남아",
    personality: "밝고 애교 많은",
    status: "active",
    favoriteFood: "고구마",
    favoriteActivity: "산책",
};

let openaiInstance: OpenAI | null = null;
function getOpenAI(): OpenAI {
    if (!openaiInstance) {
        openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openaiInstance;
}

export async function POST(request: NextRequest) {
    try {
        // 1. 가드: IP 분당 rate-limit → 전역 일일 비용캡 → VPN 차단
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "guestChat");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) },
            );
        }

        const globalLimit = await checkGlobalDailyLimit();
        if (!globalLimit.allowed) {
            console.error(`[guest-chat] Global daily limit reached: ${globalLimit.totalToday}`);
            return NextResponse.json(
                { error: "서버가 잠시 바빠요. 잠시 후 다시 시도해주세요." },
                { status: 503 },
            );
        }

        // 게스트 전용 전역 서브캡 — 게스트 대량 트래픽이 결제 유저 가용성을 잠식하는 것 차단
        const guestGlobal = await checkGuestGlobalDailyLimit();
        if (!guestGlobal.allowed) {
            console.warn(`[guest-chat] Guest global daily limit reached: ${guestGlobal.totalToday}`);
            return NextResponse.json(
                { error: "지금은 체험이 많아요. 무료로 가입하면 바로 대화할 수 있어요.", signupHint: true },
                { status: 503 },
            );
        }

        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            console.warn(`[guest-chat] VPN blocked: ${clientIP} - ${vpnCheck.reason}`);
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "서버 설정 오류가 발생했습니다." }, { status: 500 });
        }

        // 2. 입력 파싱 & 검증
        const body = await request.json().catch(() => null);
        const rawMessage = typeof body?.message === "string" ? body.message : "";
        const trialCount = typeof body?.trialCount === "number" && body.trialCount >= 0 ? body.trialCount : 0;

        // 체험 횟수 소진 → 가입 유도 (클라 보고값 기준. 비용 하드방어는 위 3중 가드가 담당)
        if (trialCount >= GUEST_TRIAL_LIMIT) {
            return NextResponse.json(
                { error: "guest_trial_exhausted", limit: GUEST_TRIAL_LIMIT },
                { status: 403 },
            );
        }

        if (!rawMessage.trim()) {
            return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
        }
        if (rawMessage.length > GUEST_MESSAGE_MAX) {
            return NextResponse.json(
                { error: `메시지는 ${GUEST_MESSAGE_MAX}자 이내로 입력해주세요. 더 길게 대화하려면 가입해보세요.` },
                { status: 400 },
            );
        }

        const sanitized = sanitizeInput(rawMessage);
        const injection = detectPromptInjection(sanitized);
        if (injection.detected) {
            return NextResponse.json({ error: "허용되지 않는 입력입니다." }, { status: 400 });
        }

        // 비용/악용 하드 방어 (서버리스 인스턴스 공유 = DB 기반):
        // identifier="guest:IP" + usage_type "ai_chat"로 기록 → (1) checkGlobalDailyLimit이 합산해
        // 게스트 트래픽이 전역 일일 비용캡(GLOBAL_DAILY_LIMIT)에 반영됨, (2) IP당 일일 하드캡(무료 10회)으로
        // 클라 trialCount 위조/스토리지 초기화로도 비용이 무한 확장되지 않음. 인메모리 캡의 인스턴스 분산 약점 보완.
        const guestId = `guest:${clientIP}`;
        const guestDaily = await checkDailyUsageDB(guestId, false);
        if (!guestDaily.allowed) {
            return NextResponse.json(
                { error: "guest_trial_exhausted", limit: GUEST_TRIAL_LIMIT },
                { status: 403 },
            );
        }

        // 게스트가 데모펫 이름을 직접 정했으면 반영 (안전 처리)
        const guestPetName =
            typeof body?.petName === "string" && body.petName.trim()
                ? sanitizeInput(body.petName).slice(0, GUEST_PET_NAME_MAX)
                : DEMO_PET.name;
        const pet: PetInfo = { ...DEMO_PET, name: guestPetName || DEMO_PET.name };

        // 3. 시스템 프롬프트 (일상 모드, 컨텍스트 없음, 첫 대화)
        const systemPrompt = getDailySystemPrompt(pet, "", "", "", false, true, true);

        // 4. OpenAI 스트리밍
        const openaiStream = await getOpenAI().chat.completions.create({
            model: AI_CONFIG.AI_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `<user_input>${sanitized}</user_input>` },
            ],
            max_tokens: AI_CONFIG.AI_MAX_TOKENS,
            temperature: AI_CONFIG.AI_TEMPERATURE_DAILY,
            presence_penalty: 0.7,
            frequency_penalty: 0.6,
            stream: true,
        });

        // 5. SSE 스트리밍 (메인 /api/chat 과 동일 프로토콜: delta / done)
        const encoder = new TextEncoder();
        const petName = pet.name;
        const remaining = Math.max(0, GUEST_TRIAL_LIMIT - trialCount - 1);
        const SUGGESTIONS_MARKER = "---SUGGESTIONS---";
        const PENDING_MARKER = "---PENDING_TOPIC---";

        const readableStream = new ReadableStream({
            async start(controller) {
                let fullText = "";
                let markerDetected = false;
                let sentLength = 0;
                try {
                    for await (const chunk of openaiStream) {
                        const delta = chunk.choices[0]?.delta?.content || "";
                        if (!delta) continue;
                        fullText += delta;
                        const corrected = fixKoreanParticles(fullText, petName);

                        if (!markerDetected) {
                            const sugIdx = corrected.indexOf(SUGGESTIONS_MARKER);
                            const ptIdx = corrected.indexOf(PENDING_MARKER);
                            const markerIdx = Math.min(
                                sugIdx >= 0 ? sugIdx : Infinity,
                                ptIdx >= 0 ? ptIdx : Infinity,
                            );
                            if (markerIdx !== Infinity) {
                                markerDetected = true;
                                const unsent = corrected.substring(sentLength, markerIdx);
                                if (unsent) {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: unsent })}\n\n`));
                                    sentLength = markerIdx;
                                }
                            } else {
                                // 마커(최대 19자 "---PENDING_TOPIC---") + 앞 공백/개행 여유 → 30자 홀드로 raw 마커 노출 방지
                                const safeEnd = corrected.length - 30;
                                if (safeEnd > sentLength) {
                                    const unsent = corrected.substring(sentLength, safeEnd);
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: unsent })}\n\n`));
                                    sentLength = safeEnd;
                                }
                            }
                        }
                    }

                    const finalCorrected = fixKoreanParticles(fullText, petName);
                    if (!markerDetected && sentLength < finalCorrected.length) {
                        const unsent = finalCorrected.substring(sentLength);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: unsent })}\n\n`));
                    }

                    // 마커 파싱 (간이): 본문 / 추천질문 분리
                    const bodyText = fullText.split(SUGGESTIONS_MARKER)[0].split(PENDING_MARKER)[0];
                    // 출력측 정보누출 방어 (메인 경로 sanitizeAIOutput 패리티 — 프롬프트 탈취 시 시스템프롬프트/모델명 차단)
                    // sanitizeAIOutput은 { cleaned, leaked, leakTypes } 객체 반환 → .cleaned 사용
                    const replyText = sanitizeAIOutput(fixKoreanParticles(bodyText, petName).trim()).cleaned;
                    let suggestedQuestions: string[] = [];
                    const sugPart = fullText.split(SUGGESTIONS_MARKER)[1];
                    if (sugPart) {
                        suggestedQuestions = sugPart
                            .split(PENDING_MARKER)[0]
                            .split("\n")
                            .map((s) => s.replace(/^[-*\d.\s]+/, "").trim())
                            .filter(Boolean)
                            .slice(0, 3);
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: "done",
                        reply: replyText,
                        suggestedQuestions,
                        emotion: "happy",
                        emotionScore: 0.7,
                        remaining,
                        guest: true,
                    })}\n\n`));
                } catch (streamErr) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: "error",
                        error: "AI 응답 생성 중 오류가 발생했습니다.",
                    })}\n\n`));
                    console.error("[guest-chat/stream-error]", streamErr instanceof Error ? streamErr.message : streamErr);
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        if (error instanceof OpenAI.APIError) {
            console.error(`[guest-chat/openai-error] status=${error.status} message=${error.message}`);
            if (error.status === 429) {
                return NextResponse.json(
                    { error: "지금 잠깐 붐벼요. 잠시 후 다시 시도해주세요." },
                    { status: 429 },
                );
            }
            return NextResponse.json(
                { error: "AI 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요." },
                { status: 503 },
            );
        }
        console.error("[guest-chat/error]", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "AI 응답을 생성하는 중 오류가 발생했습니다." },
            { status: 500 },
        );
    }
}
