/**
 * AI 펫톡 에이전트 API Route
 * 장기 메모리 + 감정 인식 시스템
 *
 * 헬퍼/컨텍스트 빌더 -> chat-helpers.ts
 * 시스템 프롬프트 생성 -> chat-prompts.ts
 */

// Next.js 빌드 시점 정적 분석 방지 (환경변수 런타임 접근 필요)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { awardPoints } from "@/lib/points";
import { getAuthUser, createServerSupabase } from "@/lib/supabase-server";
import { API, FREE_LIMITS } from "@/config/constants";
import {
    getClientIP,
    checkRateLimit,
    checkDailyUsageDB,
    getRateLimitHeaders,
    sanitizeInput,
    detectPromptInjection,
    checkVPN,
    getVPNBlockResponse,
} from "@/lib/rate-limit";
import {
    detectEmergencyKeywords,
    isCareRelatedQuery,
    validateAIResponse,
} from "@/lib/care-reference";
import {
    detectCrisis,
    getCrisisSystemPromptAddition,
    buildCrisisAlert,
    type CrisisDetectionResult,
} from "@/lib/crisis-detection";

// 로컬 헬퍼/타입 & 프롬프트
import type { EmotionType, GriefStage } from "@/types";
import {
    type PetInfo,
    type ChatMessage,
    type TimelineEntry,
    type PhotoMemory,
    type ReminderInfo,
    type OnboardingContext,
    extractKeywordsFromReply,
    timelineToContext,
    photoMemoriesToContext,
    remindersToContext,
    remindersToMemorialContext,
    getPersonalizationContext,
    getOnboardingContext,
    buildEmotionTrendContext,
    buildPrioritizedContext,
    extractRecentTopics,
    filterMemorialSuggestions,
    getSpecialDayContext,
} from "./chat-helpers";
import { getDailySystemPrompt, getMemorialSystemPrompt } from "./chat-prompts";

// ---- 싱글턴 ----

function getPointsSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
    if (!openaiInstance) {
        openaiInstance = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiInstance;
}

// agent 모듈 동적 import 함수
async function getAgentModule() {
    return await import("@/lib/agent");
}

// ---- POST 핸들러 ----

export async function POST(request: NextRequest) {
    try {
        // 1. IP 기반 Rate Limiting
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "aiChat");

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn),
                }
            );
        }

        // 1.5. VPN/프록시 감지
        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            console.warn(`[Security] VPN blocked: ${clientIP} - ${vpnCheck.reason}`);
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // API 키 확인
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "OpenAI API 키가 설정되지 않았습니다." },
                { status: 500 }
            );
        }

        // 인증 체크 - 세션 토큰으로 사용자 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        // 프리미엄 상태 확인 (서버 검증 - 보안 중요)
        const supabase = await createServerSupabase();
        const { data: profile } = await supabase
            .from("profiles")
            .select("is_premium, premium_expires_at, onboarding_data, user_type")
            .eq("id", user.id)
            .single();

        const isPremium = profile?.is_premium &&
            (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());

        // 온보딩 데이터 추출 (AI 개인화에 활용)
        const onboardingData = profile?.onboarding_data as OnboardingContext | null;

        // agent 모듈 동적 import (런타임에만 로드)
        const agent = await getAgentModule();

        const body = await request.json();
        const {
            message,
            pet,
            chatHistory = [],
            timeline = [],
            photoMemories = [],
            reminders = [],
            enableAgent = true,
        } = body as {
            message: string;
            pet: PetInfo;
            chatHistory: ChatMessage[];
            timeline?: TimelineEntry[];
            photoMemories?: PhotoMemory[];
            reminders?: ReminderInfo[];
            enableAgent?: boolean;
        };

        // 유효성 검사
        if (!message || !pet) {
            return NextResponse.json(
                { error: "메시지와 반려동물 정보가 필요합니다." },
                { status: 400 }
            );
        }

        // pet.id 소유권 검증 (클라이언트가 다른 유저의 pet UUID를 넣는 것 방지)
        if (pet.id) {
            const { data: ownedPet } = await supabase
                .from("pets")
                .select("id")
                .eq("id", pet.id)
                .eq("user_id", user.id)
                .single();
            if (!ownedPet) {
                return NextResponse.json(
                    { error: "잘못된 접근입니다." },
                    { status: 403 }
                );
            }
        }

        // 입력 크기 제한 (토큰 비용 폭증 + DoS 방지)
        if (typeof message !== "string" || message.length > 1000) {
            return NextResponse.json(
                { error: "메시지가 너무 길어요. 1000자 이내로 작성해주세요." },
                { status: 400 }
            );
        }
        if (chatHistory.length > 30) {
            chatHistory.splice(0, chatHistory.length - 30); // 최근 30개만 유지
        }
        if (timeline.length > 20) {
            timeline.splice(0, timeline.length - 20);
        }
        if (photoMemories.length > 20) {
            photoMemories.splice(0, photoMemories.length - 20);
        }
        if (reminders.length > 30) {
            reminders.splice(0, reminders.length - 30);
        }

        // 2. 모드 결정 (isMemorialMode 하나로 통합)
        const isMemorialMode = pet.status === "memorial";

        // 3. 일일 사용량 체크 (프리미엄은 무제한, 무료는 10회)
        // 프리미엄 회원은 제한 없이 통과
        let dailyUsage = { allowed: true, remaining: Infinity, isWarning: false };

        if (!isPremium) {
            // 무료 회원: FREE_LIMITS.DAILY_CHATS (10회) 제한
            const identifier = user.id;
            dailyUsage = await checkDailyUsageDB(identifier, false); // false = 무료 회원 제한 적용

            // 무료 회원 제한은 10회이므로 별도 체크
            if (dailyUsage.remaining < 0 || !dailyUsage.allowed) {
                return NextResponse.json(
                    {
                        error: isMemorialMode
                            ? `오늘은 여기까지 이야기 나눌 수 있어요. ${pet?.name || "아이"}는 내일도 여기서 기다리고 있을게요. 프리미엄 구독 시 무제한 대화가 가능합니다.`
                            : `오늘의 무료 대화 횟수(${FREE_LIMITS.DAILY_CHATS}회)를 모두 사용했어요. 프리미엄 구독 시 무제한 대화가 가능합니다!`,
                        remaining: 0,
                        isLimitReached: true,
                    },
                    { status: 429 }
                );
            }
        }

        // 4. 입력값 검증 (XSS, 과도한 길이 방지)
        const sanitizedMessage = sanitizeInput(message);

        // 4.0.5 프롬프트 인젝션(탈옥) 감지
        const injectionCheck = detectPromptInjection(sanitizedMessage);
        if (injectionCheck.detected) {
            console.warn(`[Security] Prompt injection detected: type=${injectionCheck.type}, ip=${clientIP}, user=${user.id}`);
            // 탈옥 시도 시 펫 캐릭터로 자연스럽게 거절 응답 반환
            const petName = pet?.name || "반려동물";
            return NextResponse.json({
                reply: `${petName}은(는) 그런 이야기는 잘 모르겠어~ 다른 이야기 하자!`,
                suggestedQuestions: ["오늘 뭐 했어?", "같이 놀자!", "기분이 어때?"],
                emotion: "neutral",
                emotionScore: 0.5,
                remaining: dailyUsage.remaining,
                isWarning: dailyUsage.isWarning,
            });
        }

        // 4.1 위기 감지 (Crisis Safety Net)
        const crisisResult: CrisisDetectionResult = detectCrisis(sanitizedMessage, isMemorialMode);

        // 4.5. 반려동물 응급/긴급 증상 감지 (케어 할루시네이션 방어)
        const emergencyDetection = detectEmergencyKeywords(sanitizedMessage);

        let emotionGuide = "";
        let griefGuideText = "";
        let memoryContext = "";
        let userEmotion: EmotionType = "neutral";
        let emotionScore = 0.5;
        let griefStage: GriefStage | undefined;

        // mode 문자열 (API 파라미터용)
        const mode = isMemorialMode ? "memorial" : "daily";

        // 에이전트 기능 활성화 시 -- 독립적인 비동기 작업을 병렬 실행하여 응답 속도 개선
        let conversationContext = "";
        let emotionTrendContext = "";
        if (enableAgent) {
            // Promise.all로 독립적인 작업 5개를 병렬 실행:
            // A. 감정 분석 (GPT 호출 가능)
            // B. 메모리 조회 (DB)
            // C. pending_topic 조회 (DB)
            // D. 대화 맥락 컨텍스트 빌드 (DB 2개)
            // E. 최근 감정 추세 조회 (DB)
            const [emotionResult, memories, pendingTopicMem, convCtx, recentEmotions] = await Promise.all([
                // A. 감정 분석
                agent.analyzeEmotion(sanitizedMessage, isMemorialMode),
                // B. 메모리 조회
                pet.id
                    ? agent.getPetMemories(pet.id, 5).catch(() => [])
                    : Promise.resolve([]),
                // C. pending_topic 조회
                pet.id
                    ? agent.getLatestPendingTopic(pet.id).catch(() => null)
                    : Promise.resolve(null),
                // D. 대화 맥락 컨텍스트
                pet.id
                    ? agent.buildConversationContext(user.id, pet.id, pet.name, isMemorialMode).catch(() => "")
                    : Promise.resolve(""),
                // E. 최근 감정 추세 (최근 10개 대화의 감정)
                pet.id
                    ? supabase
                        .from("chat_messages")
                        .select("emotion, created_at")
                        .eq("pet_id", pet.id)
                        .eq("role", "user")
                        .not("emotion", "is", null)
                        .order("created_at", { ascending: false })
                        .limit(10)
                        .then(({ data, error }) => error ? [] : (data || []))
                    : Promise.resolve([] as { emotion: string; created_at: string }[]),
            ]);

            // 감정 분석 결과 적용
            userEmotion = emotionResult.emotion;
            emotionScore = emotionResult.score;
            griefStage = emotionResult.griefStage;

            // 감정 응답 가이드 생성 (동기, 빠름)
            emotionGuide = agent.getEmotionResponseGuide(userEmotion, mode);

            // 추모 모드에서 애도 단계 가이드
            if (isMemorialMode && griefStage && griefStage !== "unknown") {
                griefGuideText = agent.getGriefStageResponseGuide(griefStage);
            }

            // 메모리 컨텍스트 조합
            memoryContext = agent.memoriesToContext(memories);
            if (pendingTopicMem) {
                memoryContext += `\n\n[다음에 이어갈 주제]: "${pendingTopicMem}" -- 기회 되면 자연스럽게 언급해보세요.`;
            }

            // 대화 맥락 컨텍스트
            conversationContext = convCtx;

            // 감정 추세 컨텍스트
            emotionTrendContext = buildEmotionTrendContext(recentEmotions);

            // 새로운 메모리 추출 (fire-and-forget, 응답 속도에 영향 없음)
            if (pet.id) {
                const petIdForMemory = pet.id;
                agent.extractMemories(sanitizedMessage, pet.name).then(async (newMemories) => {
                    if (newMemories && newMemories.length > 0) {
                        for (const mem of newMemories) {
                            await agent.saveMemory(user.id, petIdForMemory, mem);
                        }
                    }
                }).catch((err) => { console.error("[chat/memory-extract]", err instanceof Error ? err.message : err); });
            }
        }

        // 타임라인 컨텍스트 생성
        const timelineContext = timelineToContext(timeline);

        // 사진 캡션 컨텍스트 생성
        const photoContext = photoMemoriesToContext(photoMemories);

        // 특별한 날 컨텍스트 생성
        const specialDayContext = getSpecialDayContext(pet);

        // 리마인더 컨텍스트 생성
        // 일상 모드: 케어 일정으로 활용
        // 추모 모드: 함께했던 일상 루틴을 추억으로 활용
        const reminderContext = isMemorialMode
            ? remindersToMemorialContext(reminders, pet.name)
            : remindersToContext(reminders, pet.name);

        // 개인화 컨텍스트 생성 (별명, 좋아하는 것, 습관, 체중 등)
        const personalizationContext = getPersonalizationContext(pet);

        // 온보딩 컨텍스트 생성 (사용자 배경: 초보/경험자, 떠나보낸 기간 등)
        const onboardingContext = getOnboardingContext(onboardingData, isMemorialMode);

        // 이번 세션 토픽 추적 (AI 응답 반복 방지)
        const recentTopicsContext = extractRecentTopics(chatHistory);

        // 통합 컨텍스트 (우선순위 기반 예산 시스템)
        const contextItems = isMemorialMode
            ? [
                { content: onboardingContext, priority: 7 },
                { content: emotionTrendContext, priority: 6 },
                { content: recentTopicsContext, priority: 6 },
                { content: personalizationContext, priority: 5 },
                { content: specialDayContext, priority: 5 },
                { content: conversationContext, priority: 4 },
                { content: timelineContext, priority: 3 },
                { content: photoContext, priority: 3 },
                { content: reminderContext, priority: 2 },
            ]
            : [
                { content: onboardingContext, priority: 7 },
                { content: emotionTrendContext, priority: 6 },
                { content: recentTopicsContext, priority: 6 },
                { content: personalizationContext, priority: 5 },
                { content: specialDayContext, priority: 4 },
                { content: reminderContext, priority: 4 },
                { content: conversationContext, priority: 3 },
                { content: timelineContext, priority: 2 },
                { content: photoContext, priority: 1 },
            ];
        const maxContextChars = isMemorialMode ? 2500 : 3000;
        const combinedContext = buildPrioritizedContext(contextItems, maxContextChars);

        // 케어 관련 질문 감지 (조건부 프롬프트 삽입용)
        // 응급/긴급 증상 감지 시에도 케어 규칙 활성화
        const isCareQuery = isCareRelatedQuery(sanitizedMessage)
            || emergencyDetection.isEmergency
            || emergencyDetection.isUrgent;

        // 첫 대화 감지: 대화 기록이 없으면 첫 대화
        const isFirstChat = chatHistory.length === 0;

        // 모드에 따른 시스템 프롬프트 선택
        let systemPrompt =
            isMemorialMode
                ? getMemorialSystemPrompt(pet, emotionGuide, memoryContext, combinedContext, griefGuideText, isFirstChat)
                : getDailySystemPrompt(pet, emotionGuide, memoryContext, combinedContext, isCareQuery, isFirstChat);

        // 위기 감지 시 시스템 프롬프트에 위기 대응 지시 추가
        if (crisisResult.detected && crisisResult.level !== "none") {
            const crisisPrompt = getCrisisSystemPromptAddition(
                pet.name,
                crisisResult.level as "medium" | "high"
            );
            systemPrompt = `${crisisPrompt}\n\n${systemPrompt}`;
        }

        // 응급/긴급 증상 감지 시 수의사 상담 강력 권장 지시 삽입
        if (emergencyDetection.isEmergency || emergencyDetection.isUrgent) {
            const urgencyLevel = emergencyDetection.isEmergency ? "응급" : "긴급";
            const vetUrgencyPrompt = `## ${urgencyLevel} 상황 감지 - 수의사 상담 권장 필수 삽입
사용자가 반려동물의 ${urgencyLevel} 증상을 언급했습니다.
반드시 응답에 "수의사 선생님한테 ${emergencyDetection.isEmergency ? "지금 바로" : "빨리"} 가보는 게 좋겠어!"를 자연스럽게 포함하세요.
${emergencyDetection.isEmergency ? "이것은 즉시 병원에 가야 하는 상황입니다. 가정 치료를 권하지 마세요." : "24시간 내에 병원 방문을 권하세요."}`;
            systemPrompt = `${vetUrgencyPrompt}\n\n${systemPrompt}`;
        }

        // 대화 히스토리 구성 (최근 10개 - 더 긴 맥락으로 반복 방지 강화)
        // role 필터링: "system" 주입 방지 (런타임에서 user/assistant만 허용)
        const recentHistory = chatHistory.slice(-10)
            .filter((msg) => msg.role === "user" || msg.role === "assistant")
            .map((msg) => ({
                role: msg.role as "user" | "assistant",
                content: String(msg.content).slice(0, 1000),
            }));

        // OpenAI API 호출 (모드별 설정 최적화)
        // 랜덤 seed로 매 요청마다 다른 응답 유도
        const randomSeed = Math.floor(Math.random() * 1000000);
        const completion = await getOpenAI().chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                ...recentHistory,
                { role: "user", content: `<user_input>${sanitizedMessage}</user_input>` },
            ],
            max_tokens: 400, // 추모/일상 동일 -- 성격 표현을 위한 충분한 토큰
            // temperature: 추모 모드는 안정적 응답 우선 (constants에서 관리)
            temperature: mode === "memorial" ? API.AI_TEMPERATURE_MEMORIAL : API.AI_TEMPERATURE_DAILY,
            // presence_penalty 상향: 이미 언급된 주제 재등장 억제
            presence_penalty: 0.7,
            // frequency_penalty 상향: 같은 단어/표현 반복 억제
            frequency_penalty: 0.6,
            // 랜덤 seed: 같은 입력이라도 다른 응답 생성
            seed: randomSeed,
        });

        // 응답에서 마커 파싱 (PENDING_TOPIC, SUGGESTIONS 순서)
        const rawReply = completion.choices[0]?.message?.content || "";
        let reply = rawReply;
        let suggestedQuestions: string[] = [];
        let pendingTopic: string | undefined;

        const suggestionsMarker = "---SUGGESTIONS---";
        const pendingTopicMarker = "---PENDING_TOPIC---";

        // 1. PENDING_TOPIC을 rawReply에서 먼저 분리
        if (rawReply.includes(pendingTopicMarker)) {
            const ptParts = rawReply.split(pendingTopicMarker);
            reply = ptParts[0].trim();
            pendingTopic = ptParts[1]?.trim().split("\n")[0]?.trim();
        }

        // 2. SUGGESTIONS 분리
        if (reply.includes(suggestionsMarker)) {
            const sgParts = reply.split(suggestionsMarker);
            reply = sgParts[0].trim();
            suggestedQuestions = sgParts[1]
                .trim()
                .split("\n")
                .map(s => s.replace(/^[-\d.)\s]+/, "").trim())
                .filter(s => s.length > 0 && s.length <= 20)
                .slice(0, 3);
        }

        // 추모 모드: 후속 질문에서 음식/케어 키워드 필터링
        if (isMemorialMode && suggestedQuestions.length > 0) {
            suggestedQuestions = filterMemorialSuggestions(suggestedQuestions);
        }

        // 추모 모드: 느낌표 후처리 (SUGGESTIONS 분리 이후에 실행)
        if (isMemorialMode) {
            // "!!!" -> "." / "!!" -> "~" / 단독 "!" 는 최대 1개만 허용
            reply = reply.replace(/!{3,}/g, ".");
            reply = reply.replace(/!!/g, "~");
            let exclamationCount = 0;
            reply = reply.replace(/!/g, () => {
                exclamationCount++;
                return exclamationCount <= 1 ? "!" : ".";
            });
        }

        // 응답 후 검증 레이어 -- 케어 응답에서 할루시네이션 위험 패턴 코드 레벨 검증
        const validation = validateAIResponse(reply, isCareQuery, sanitizedMessage);
        if (validation.wasModified) {
            reply = validation.reply;
            console.warn(
                `[chat/post-validation] 응답 수정됨: violations=${validation.violations.join(", ")}`
            );
        }

        // 대화 내 사진 연동 -- AI 응답에서 키워드 추출 -> pet_media 캡션 매칭
        let matchedPhoto: { url: string; caption: string } | undefined;
        if (pet.id) {
            try {
                const keywords = extractKeywordsFromReply(reply, pet);
                if (keywords.length > 0) {
                    const { data: matchedMedia } = await supabase
                        .from("pet_media")
                        .select("url, caption")
                        .eq("pet_id", pet.id)
                        .not("caption", "is", null)
                        .limit(50);

                    if (matchedMedia && matchedMedia.length > 0) {
                        for (const keyword of keywords) {
                            const match = matchedMedia.find(
                                (m) => m.caption && m.caption.toLowerCase().includes(keyword.toLowerCase())
                            );
                            if (match && match.url && match.caption) {
                                matchedPhoto = { url: match.url, caption: match.caption };
                                break;
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("[chat/photo-match]", err instanceof Error ? err.message : err);
            }
        }

        // 대화 저장 (DB 연동 시) -- 모드 태깅으로 일상/추모 데이터 분리
        if (enableAgent && pet.id) {
            Promise.all([
                agent.saveMessage(user.id, pet.id, "user", sanitizedMessage, userEmotion, emotionScore, mode),
                agent.saveMessage(user.id, pet.id, "assistant", reply, undefined, undefined, mode),
            ]).catch((err) => { console.error("[chat/save-message]", err instanceof Error ? err.message : err); });

            // pending_topic 저장 (다음 대화에서 이어갈 주제)
            if (pendingTopic && pendingTopic.length > 0 && pendingTopic.length <= 50) {
                agent.saveMemory(user.id, pet.id, {
                    memoryType: "pending_topic",
                    title: "다음에 이어갈 주제",
                    content: pendingTopic,
                    importance: 3,
                }).catch((err) => { console.error("[chat/pending-topic]", err instanceof Error ? err.message : err); });
            }
        }

        // 세션 요약 생성 (10번째 메시지마다 비동기로) -- 모드 태깅 포함 + 타임라인 자동 생성
        if (enableAgent && pet.id && chatHistory.length > 0 && chatHistory.length % 10 === 0) {
            const petIdForSummary = pet.id;
            const modeForSummary = mode;
            const isMemorialForSummary = isMemorialMode;
            const allMessages = [...chatHistory, { role: "user", content: sanitizedMessage }, { role: "assistant", content: reply }];
            agent.generateConversationSummary(allMessages, pet.name, isMemorialMode)
                .then(async (summary) => {
                    if (summary) {
                        await agent.saveConversationSummary(user.id, petIdForSummary, summary, modeForSummary);

                        if (summary.keyTopics.length >= 2 || summary.importantMentions.length > 0) {
                            await agent.saveAutoTimelineEntry(
                                user.id,
                                petIdForSummary,
                                summary,
                                isMemorialForSummary
                            );
                        }
                    }
                })
                .catch((err) => { console.error("[chat/session-summary]", err instanceof Error ? err.message : err); });
        }

        // 포인트 적립 (AI 펫톡 +1P, 비동기)
        try {
            const pointsSb = getPointsSupabase();
            if (pointsSb) {
                awardPoints(pointsSb, user.id, "ai_chat").catch((err) => {
                    console.error("[chat] 포인트 적립 실패:", err);
                });
            }
        } catch {
            // 포인트 적립 실패 무시
        }

        // 위기 감지 시 crisisAlert 생성
        const crisisAlert = crisisResult.detected && crisisResult.level !== "none"
            ? buildCrisisAlert(crisisResult.level as "medium" | "high")
            : undefined;

        if (crisisAlert) {
            suggestedQuestions = [];
        }

        if (crisisResult.detected) {
            console.warn(
                `[Crisis Detection] level=${crisisResult.level}, mode=${mode}, keywords=${crisisResult.matchedKeywords.length}`
            );
        }

        // 과사용 감지 - 추모 모드에서 30턴 이상 시 부드러운 세션 종료 제안
        let sessionEndingSuggestion: string | undefined;
        if (isMemorialMode && chatHistory.length >= 30 && chatHistory.length % 10 === 0) {
            sessionEndingSuggestion = `${pet.name}과(와)의 대화가 길어졌네요. 오늘은 여기서 천천히 쉬어가도 좋아요. ${pet.name}은(는) 언제든 여기 있을 거예요.`;
        }

        return NextResponse.json({
            reply,
            suggestedQuestions,
            emotion: userEmotion,
            emotionScore,
            griefStage: isMemorialMode ? griefStage : undefined,
            usage: completion.usage,
            remaining: dailyUsage.remaining,
            isWarning: dailyUsage.isWarning,
            crisisAlert,
            sessionEndingSuggestion,
            matchedPhoto,
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
