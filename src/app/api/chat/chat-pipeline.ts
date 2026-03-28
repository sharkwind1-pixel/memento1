/**
 * chat-pipeline.ts - POST 핸들러 파이프라인 함수
 *
 * route.ts의 963줄 POST 핸들러에서 추출한 5단계 파이프라인:
 * 1. validateAndParseInput()  - body 파싱, 크기 제한, 필드 검증, sanitize
 * 2. checkSecurityLimits()    - IP rate-limit, 글로벌 상한, VPN, 인증, DB rate-limit, 프리미엄 검증, 쿨다운
 * 3. buildAIContext()         - 감정 분석, 메모리 로드, 대화 요약, 장소 검색, 시스템 프롬프트 생성
 * 4. postProcessResponse()    - 느낌표 후처리, 할루시네이션 검증, 정보 누출 방지, 사진/타임라인 매칭
 * 5. saveAndRespond()         - 대화 저장, 메모리 추출, 세션 요약, 포인트 적립
 *
 * route.ts는 이 함수들을 순서대로 호출하는 지휘자(orchestrator) 역할만 한다.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { awardPoints } from "@/lib/points";
import { getAuthUser, createServerSupabase } from "@/lib/supabase-server";
import { FREE_LIMITS, AI_INPUT_LIMITS, type SubscriptionTier, getLimitsForTier } from "@/config/constants";
import {
    getClientIP,
    checkRateLimit,
    checkRateLimitDB,
    checkDailyUsageDB,
    checkRequestCooldown,
    checkGlobalDailyLimit,
    getRateLimitHeaders,
    sanitizeInput,
    detectPromptInjection,
    sanitizeAIOutput,
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
import { detectPlaceQuery, findNearbyPlaces, findPlacesByLocation, type NearbyPlace } from "@/lib/naver-location";

import type { EmotionType, GriefStage, CrisisAlertInfo } from "@/types";
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
    getBreedCareContext,
    getMemorialTimeToneGuide,
    detectOffTopicQuery,
    findRelatedMagazineArticles,
} from "./chat-helpers";
import { getDailySystemPrompt, getMemorialSystemPrompt } from "./chat-prompts";
import * as agent from "@/lib/agent";

// ---- 타입 정의 ----

/** validateAndParseInput의 성공 결과 */
export interface ParsedInput {
    sanitizedMessage: string;
    pet: PetInfo;
    chatHistory: ChatMessage[];
    timeline: TimelineEntry[];
    photoMemories: PhotoMemory[];
    reminders: ReminderInfo[];
    enableAgent: boolean;
    userLocation?: { lat: number; lng: number };
    placeKeyword?: string;
    bodyStr: string;
}

/** checkSecurityLimits의 성공 결과 */
export interface SecurityContext {
    user: { id: string; email?: string };
    supabase: SupabaseClient;
    isPremium: boolean;
    onboardingData: OnboardingContext | null;
    dailyUsage: { remaining: number; isWarning: boolean; allowed: boolean };
    clientIP: string;
}

/** buildAIContext의 결과 */
export interface AIContext {
    systemPrompt: string;
    recentHistory: { role: "user" | "assistant"; content: string }[];
    userEmotion: EmotionType;
    emotionScore: number;
    griefStage?: GriefStage;
    isMemorialMode: boolean;
    mode: "memorial" | "daily";
    crisisResult: CrisisDetectionResult;
    crisisAlert?: CrisisAlertInfo;
    nearbyPlaces: NearbyPlace[];
    placeKeyword?: string;
    sessionEndingSuggestion?: string;
    isFirstChat: boolean;
    isNewSession: boolean;
    isCareQuery: boolean;
    emergencyDetection: { isEmergency: boolean; isUrgent: boolean };
    /** 범위 밖 반복 시도 → GPT 호출 스킵, 고정 응답 반환 */
    offTopicBlock?: { blocked: boolean; fixedReply: string };
}

/** postProcessResponse의 결과 */
export interface ProcessedResponse {
    reply: string;
    suggestedQuestions: string[];
    pendingTopic?: string;
    matchedPhoto?: { url: string; caption: string };
    matchedTimeline?: { date: string; title: string; content: string };
    suggestedReminder?: { type: string; title: string; schedule: { type: string; time: string } };
}

// ---- 싱글턴 ----

function getPointsSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

// ---- 1. validateAndParseInput ----

/**
 * 요청 body를 파싱하고 크기 제한, 필드 검증, sanitize를 수행한다.
 * 실패 시 NextResponse를 반환, 성공 시 ParsedInput을 반환.
 */
export async function validateAndParseInput(
    request: NextRequest
): Promise<ParsedInput | NextResponse> {
    const body = await request.json();
    const {
        message,
        pet,
        chatHistory = [],
        timeline = [],
        photoMemories = [],
        reminders = [],
        enableAgent = true,
        userLocation,
        placeKeyword,
    } = body as {
        message: string;
        pet: PetInfo;
        chatHistory: ChatMessage[];
        timeline?: TimelineEntry[];
        photoMemories?: PhotoMemory[];
        reminders?: ReminderInfo[];
        enableAgent?: boolean;
        userLocation?: { lat: number; lng: number };
        placeKeyword?: string;
    };

    // 유효성 검사
    if (!message || !pet) {
        return NextResponse.json(
            { error: "메시지와 반려동물 정보가 필요합니다." },
            { status: 400 }
        );
    }

    // ---- 입력 크기 제한 (토큰 소모 공격 + DoS 방지) ----

    // 0. 요청 body 전체 크기 제한 (직렬화 비용도 방어)
    const bodyStr = JSON.stringify(body);
    if (bodyStr.length > AI_INPUT_LIMITS.BODY_MAX_BYTES) {
        return NextResponse.json(
            { error: "요청 데이터가 너무 큽니다." },
            { status: 413 }
        );
    }

    // 1. 메시지 길이 제한
    if (typeof message !== "string" || message.length > AI_INPUT_LIMITS.MESSAGE_MAX_LENGTH) {
        return NextResponse.json(
            { error: `메시지가 너무 길어요. ${AI_INPUT_LIMITS.MESSAGE_MAX_LENGTH}자 이내로 작성해주세요.` },
            { status: 400 }
        );
    }

    // 2. pet 객체 텍스트 필드 길이 제한 (시스템 프롬프트 팽창 방지)
    const trunc = (v: string) => v.length > AI_INPUT_LIMITS.PET_FIELD_MAX_LENGTH ? v.slice(0, AI_INPUT_LIMITS.PET_FIELD_MAX_LENGTH) : v;
    const truncOpt = (v?: string) => v && v.length > AI_INPUT_LIMITS.PET_FIELD_MAX_LENGTH ? v.slice(0, AI_INPUT_LIMITS.PET_FIELD_MAX_LENGTH) : v;
    pet.name = trunc(pet.name);
    pet.breed = trunc(pet.breed);
    pet.personality = trunc(pet.personality);
    pet.favoriteFood = truncOpt(pet.favoriteFood);
    pet.favoriteActivity = truncOpt(pet.favoriteActivity);
    pet.favoritePlace = truncOpt(pet.favoritePlace);
    pet.specialHabits = truncOpt(pet.specialHabits);
    pet.nicknames = truncOpt(pet.nicknames);
    pet.howWeMet = truncOpt(pet.howWeMet);
    pet.memorableMemory = truncOpt(pet.memorableMemory);

    // 3. 배열 크기 + 항목별 길이 제한
    if (chatHistory.length > AI_INPUT_LIMITS.CHAT_HISTORY_MAX_ITEMS) {
        chatHistory.splice(0, chatHistory.length - AI_INPUT_LIMITS.CHAT_HISTORY_MAX_ITEMS);
    }
    for (const msg of chatHistory) {
        if (msg.content && typeof msg.content === "string" && msg.content.length > AI_INPUT_LIMITS.CHAT_HISTORY_CONTENT_MAX) {
            msg.content = msg.content.slice(0, AI_INPUT_LIMITS.CHAT_HISTORY_CONTENT_MAX);
        }
    }
    if (timeline.length > AI_INPUT_LIMITS.TIMELINE_MAX_ITEMS) {
        timeline.splice(0, timeline.length - AI_INPUT_LIMITS.TIMELINE_MAX_ITEMS);
    }
    for (const entry of timeline) {
        if (entry.content && typeof entry.content === "string" && entry.content.length > AI_INPUT_LIMITS.TIMELINE_CONTENT_MAX) {
            entry.content = entry.content.slice(0, AI_INPUT_LIMITS.TIMELINE_CONTENT_MAX);
        }
        if (entry.title && typeof entry.title === "string" && entry.title.length > AI_INPUT_LIMITS.TIMELINE_TITLE_MAX) {
            entry.title = entry.title.slice(0, AI_INPUT_LIMITS.TIMELINE_TITLE_MAX);
        }
    }
    if (photoMemories.length > AI_INPUT_LIMITS.PHOTO_MAX_ITEMS) {
        photoMemories.splice(0, photoMemories.length - AI_INPUT_LIMITS.PHOTO_MAX_ITEMS);
    }
    for (const photo of photoMemories) {
        if (photo.caption && typeof photo.caption === "string" && photo.caption.length > AI_INPUT_LIMITS.PHOTO_CAPTION_MAX) {
            photo.caption = photo.caption.slice(0, AI_INPUT_LIMITS.PHOTO_CAPTION_MAX);
        }
    }
    if (reminders.length > AI_INPUT_LIMITS.REMINDER_MAX_ITEMS) {
        reminders.splice(0, reminders.length - AI_INPUT_LIMITS.REMINDER_MAX_ITEMS);
    }
    for (const rem of reminders) {
        if (rem.title && typeof rem.title === "string" && rem.title.length > AI_INPUT_LIMITS.REMINDER_TITLE_MAX) {
            rem.title = rem.title.slice(0, AI_INPUT_LIMITS.REMINDER_TITLE_MAX);
        }
    }

    // 4. placeKeyword 길이 제한
    if (placeKeyword && typeof placeKeyword === "string" && placeKeyword.length > AI_INPUT_LIMITS.PLACE_KEYWORD_MAX) {
        return NextResponse.json(
            { error: "검색어가 너무 깁니다." },
            { status: 400 }
        );
    }

    // 입력값 sanitize (XSS, 과도한 길이 방지)
    const sanitizedMessage = sanitizeInput(message);

    return {
        sanitizedMessage,
        pet,
        chatHistory,
        timeline,
        photoMemories,
        reminders,
        enableAgent,
        userLocation,
        placeKeyword,
        bodyStr,
    };
}

// ---- 2. checkSecurityLimits ----

/**
 * IP rate-limit, 글로벌 제한, VPN 감지, 인증, DB rate-limit,
 * 프리미엄 검증, 봇 쿨다운, 프롬프트 인젝션 감지를 수행한다.
 * 실패 시 NextResponse를 반환, 성공 시 SecurityContext를 반환.
 */
export async function checkSecurityLimits(
    parsedInput: ParsedInput
): Promise<SecurityContext | NextResponse> {
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

    // 1.3. 서비스 전체 일일 API 비용 상한 (최종 방어선)
    const globalLimit = await checkGlobalDailyLimit();
    if (!globalLimit.allowed) {
        console.error(`[Security] Global daily limit reached: ${globalLimit.totalToday} requests`);
        return NextResponse.json(
            { error: "서버가 일시적으로 바빠요. 잠시 후 다시 시도해주세요." },
            { status: 503 }
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

    // 1.7. DB 기반 분당 Rate Limit (서버리스 인스턴스 간 공유)
    const dbRateLimit = await checkRateLimitDB(user.id, "aiChat");
    if (!dbRateLimit.allowed) {
        return NextResponse.json(
            { error: "요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요." },
            { status: 429 }
        );
    }

    // 프리미엄 상태 확인 (서버 검증 - 보안 중요)
    const supabase = await createServerSupabase();
    const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium, premium_expires_at, onboarding_data, user_type, subscription_tier")
        .eq("id", user.id)
        .single();

    const isPremium = profile?.is_premium &&
        (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());

    // subscription_tier 결정 (DB 값 우선, 하위호환)
    const subscriptionTier: SubscriptionTier = isPremium
        ? ((profile?.subscription_tier as SubscriptionTier) || "premium")
        : "free";
    const tierLimits = getLimitsForTier(subscriptionTier);

    // 온보딩 데이터 추출 (AI 개인화에 활용)
    const onboardingData = profile?.onboarding_data as OnboardingContext | null;

    // pet.id 소유권 검증 (클라이언트가 다른 유저의 pet UUID를 넣는 것 방지)
    if (parsedInput.pet.id) {
        const { data: ownedPet } = await supabase
            .from("pets")
            .select("id")
            .eq("id", parsedInput.pet.id)
            .eq("user_id", user.id)
            .single();
        if (!ownedPet) {
            return NextResponse.json(
                { error: "잘못된 접근입니다." },
                { status: 403 }
            );
        }
    }

    const isMemorialMode = parsedInput.pet.status === "memorial";

    // 3. 일일 사용량 체크 (DB 기반 - 모든 등급 적용)
    const identifier = user.id;
    const dailyUsage = await checkDailyUsageDB(identifier, isPremium ? true : false, tierLimits.DAILY_CHATS);

    if (dailyUsage.remaining < 0 || !dailyUsage.allowed) {
        const limitMsg = subscriptionTier === "premium"
            ? `${parsedInput.pet?.name || "반려동물"}이(가) 오늘 많이 피곤한가봐요. 내일 다시 이야기해요~`
            : subscriptionTier === "basic"
                ? `오늘의 대화 횟수(${tierLimits.DAILY_CHATS}회)를 모두 사용했어요. 프리미엄 업그레이드 시 더 많은 대화가 가능합니다!`
                : isMemorialMode
                    ? `오늘은 여기까지 이야기 나눌 수 있어요. ${parsedInput.pet?.name || "아이"}는 내일도 여기서 기다리고 있을게요. 구독 시 더 많은 대화가 가능합니다.`
                    : `오늘의 무료 대화 횟수(${FREE_LIMITS.DAILY_CHATS}회)를 모두 사용했어요. 구독 시 더 많은 대화가 가능합니다!`;
        return NextResponse.json(
            {
                error: limitMsg,
                remaining: 0,
                isLimitReached: subscriptionTier === "free",
            },
            { status: 429 }
        );
    }

    // 3.5 봇 방어: 요청 간 최소 간격
    const cooldownCheck = checkRequestCooldown(user.id);
    if (!cooldownCheck.allowed) {
        return NextResponse.json(
            { error: `${parsedInput.pet?.name || "반려동물"}이(가) 아직 생각하고 있어요~ 잠시만 기다려주세요!` },
            { status: 429 }
        );
    }

    // 4.0.5 프롬프트 인젝션(탈옥) 감지
    const injectionCheck = detectPromptInjection(parsedInput.sanitizedMessage);
    if (injectionCheck.detected) {
        console.warn(`[Security] Prompt injection detected: type=${injectionCheck.type}, ip=${clientIP}, user=${user.id}`);
        const petName = parsedInput.pet?.name || "반려동물";
        return NextResponse.json({
            reply: `${petName}은(는) 그런 이야기는 잘 모르겠어~ 다른 이야기 하자!`,
            suggestedQuestions: ["오늘 뭐 했어?", "같이 놀자!", "기분이 어때?"],
            emotion: "neutral",
            emotionScore: 0.5,
            remaining: dailyUsage.remaining,
            isWarning: dailyUsage.isWarning,
        });
    }

    return {
        user,
        supabase,
        isPremium: !!isPremium,
        onboardingData,
        dailyUsage,
        clientIP,
    };
}

// ---- 3. buildAIContext ----

/**
 * 감정 분석, 메모리 로드, 대화 요약, 리마인더, 장소 검색,
 * 컨텍스트 조립, 시스템 프롬프트 생성까지 AI 호출에 필요한 모든 컨텍스트를 준비한다.
 */
export async function buildAIContext(
    parsedInput: ParsedInput,
    security: SecurityContext
): Promise<AIContext> {
    const { sanitizedMessage, pet, chatHistory, timeline, photoMemories, reminders, enableAgent, userLocation, placeKeyword } = parsedInput;
    const { user, supabase, onboardingData } = security;

    const isMemorialMode = pet.status === "memorial";
    const mode = isMemorialMode ? "memorial" : "daily";

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

    // 에이전트 기능 활성화 시 -- 독립적인 비동기 작업을 병렬 실행하여 응답 속도 개선
    let conversationContext = "";
    let emotionTrendContext = "";
    if (enableAgent) {
        const [emotionResult, memories, pendingTopicMem, convCtx, recentEmotions] = await Promise.all([
            // A. 감정 분석
            agent.analyzeEmotion(sanitizedMessage, isMemorialMode),
            // B. 메모리 조회 (관련성 기반)
            pet.id
                ? agent.getRelevantMemories(pet.id, sanitizedMessage, 6).catch(() => [])
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

    // 위치 기반 장소 검색
    let nearbyPlaces: NearbyPlace[] = [];
    let placeContext = "";
    const serverDetection = detectPlaceQuery(sanitizedMessage);
    if (serverDetection.detected) {
        try {
            if (serverDetection.hasSpecificLocation && serverDetection.locationName) {
                // 특정 지역명(강릉, 제주 등) → 지역명 기반 검색
                nearbyPlaces = await findPlacesByLocation(
                    serverDetection.locationName,
                    serverDetection.keyword || "공원",
                    serverDetection.altKeyword,
                );
                if (nearbyPlaces.length > 0) {
                    placeContext = `\n[${serverDetection.locationName} 산책/공원 검색 결과]:\n` +
                        nearbyPlaces.map((p, i) =>
                            `${i + 1}. ${p.name} - ${p.address}`
                        ).join("\n") +
                        `\n위 장소 중 2~3개를 골라 자연스럽게 추천하세요. "${serverDetection.locationName}이면 ○○가 좋겠다! 나도 거기서 산책하고 싶어~" 식으로 구체적으로.`;
                }
            } else if (userLocation && placeKeyword) {
                // GPS 좌표 기반 → 현재 위치 주변 검색
                nearbyPlaces = await findNearbyPlaces(
                    userLocation.lat,
                    userLocation.lng,
                    serverDetection.keyword || placeKeyword,
                    serverDetection.altKeyword,
                );
                if (nearbyPlaces.length > 0) {
                    placeContext = `\n[주변 장소 검색 결과 (${placeKeyword})]:\n` +
                        nearbyPlaces.map((p, i) =>
                            `${i + 1}. ${p.name} (${p.distance}) - ${p.address}`
                        ).join("\n") +
                        "\n위 장소 중 1~2개를 골라 자연스럽게 추천하세요. 전부 나열하지 말고, 가본 것처럼 구체적으로 말해주세요. 예: '석계역문화공원이 가깝더라! 나무 많아서 산책하기 좋을 것 같아~'";
                }
            }
        } catch (err) {
            console.error("[chat/place-search]", err instanceof Error ? err.message : err);
        }
    }

    // 타임라인 컨텍스트 생성
    const timelineContext = timelineToContext(timeline);

    // 사진 캡션 컨텍스트 생성
    const photoContext = photoMemoriesToContext(photoMemories);

    // 특별한 날 컨텍스트 생성
    const specialDayContext = getSpecialDayContext(pet);

    // 리마인더 컨텍스트 생성
    const reminderContext = isMemorialMode
        ? remindersToMemorialContext(reminders, pet.name)
        : remindersToContext(reminders, pet.name);

    // 개인화 컨텍스트 생성 (별명, 좋아하는 것, 습관, 체중 등)
    const personalizationContext = getPersonalizationContext(pet);

    // 온보딩 컨텍스트 생성 (사용자 배경: 초보/경험자, 떠나보낸 기간 등)
    const onboardingContext = getOnboardingContext(onboardingData, isMemorialMode);

    // 이번 세션 토픽 추적 (AI 응답 반복 방지)
    const recentTopicsContext = extractRecentTopics(chatHistory);

    // 품종 기반 맞춤 케어 컨텍스트 (breed 읽어서 품종별 조언 지시)
    const breedContext = getBreedCareContext(pet);

    // 추모 모드 경과일 기반 톤 가이드 (memorialDate → 세밀한 톤 조절)
    const memorialToneContext = getMemorialTimeToneGuide(pet);

    // 통합 컨텍스트 (우선순위 기반 예산 시스템)
    const contextItems = isMemorialMode
        ? [
            { content: placeContext, priority: 9 },
            { content: memorialToneContext, priority: 8 },
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
            { content: placeContext, priority: 9 },
            { content: breedContext, priority: 7 },
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

    const maxContextChars = isMemorialMode ? AI_INPUT_LIMITS.CONTEXT_BUDGET_MEMORIAL : AI_INPUT_LIMITS.CONTEXT_BUDGET_DAILY;
    const combinedContext = buildPrioritizedContext(contextItems, maxContextChars);

    // 케어 관련 질문 감지 (조건부 프롬프트 삽입용)
    const isCareQuery = isCareRelatedQuery(sanitizedMessage)
        || emergencyDetection.isEmergency
        || emergencyDetection.isUrgent;

    // 첫 대화 vs 새 세션 구분
    const isNewSession = chatHistory.length === 0;
    let isFirstChat = isNewSession;
    if (isFirstChat && pet.id) {
        const { count } = await supabase
            .from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("pet_id", pet.id)
            .eq("user_id", user.id)
            .limit(1);
        if (count && count > 0) {
            isFirstChat = false;
        }
    }

    // 모드에 따른 시스템 프롬프트 선택
    let systemPrompt =
        isMemorialMode
            ? getMemorialSystemPrompt(pet, emotionGuide, memoryContext, combinedContext, griefGuideText, isFirstChat, isNewSession)
            : getDailySystemPrompt(pet, emotionGuide, memoryContext, combinedContext, isCareQuery, isFirstChat, isNewSession);

    // 케어 질문이면 웹 검색 + 매거진 기사로 프롬프트 보강
    // 케어/실용 질문이면 웹 검색 + 매거진으로 프롬프트 보강 (추모 모드에서도 실용 질문은 검색)
    if (isCareQuery) {
        // Tavily 웹 검색 (전문 정보 주입)
        try {
            const { searchCareInfo } = await import("@/lib/care-search");
            const searchCtx = await searchCareInfo(sanitizedMessage, pet.type, pet.breed);
            if (searchCtx) {
                systemPrompt += searchCtx;
            }
        } catch { /* 웹 검색 실패 시 무시 — 기존 레퍼런스로 폴백 */ }

        // 매거진 기사 검색 (추가 보강, 일상 모드만)
        if (!isMemorialMode) {
            try {
                const magazineCtx = await findRelatedMagazineArticles(sanitizedMessage);
                if (magazineCtx) {
                    systemPrompt += magazineCtx;
                }
            } catch { /* 매거진 검색 실패 시 무시 */ }
        }
    }

    // 위기 감지 시 시스템 프롬프트에 위기 대응 지시 추가
    if (crisisResult.detected && crisisResult.level !== "none") {
        const crisisPrompt = getCrisisSystemPromptAddition(
            pet.name,
            crisisResult.level as "medium" | "high"
        );
        systemPrompt = `${crisisPrompt}\n\n${systemPrompt}`;
    }

    // 범위 밖 주제 감지 + 반복 시도 차단 (코드 레벨 방어)
    const offTopicResult = detectOffTopicQuery(sanitizedMessage);
    let offTopicBlock: { blocked: boolean; fixedReply: string } | undefined;

    if (offTopicResult.detected) {
        // 최근 대화에서 연속 범위 밖 시도 횟수 카운트
        const recentUserMessages = chatHistory
            .filter(m => m.role === "user")
            .slice(-5); // 최근 5개 유저 메시지
        let consecutiveOffTopic = 0;
        for (let i = recentUserMessages.length - 1; i >= 0; i--) {
            if (detectOffTopicQuery(recentUserMessages[i].content).detected) {
                consecutiveOffTopic++;
            } else {
                break; // 연속이 끊기면 중단
            }
        }
        // 현재 메시지 포함
        consecutiveOffTopic++;

        const petType = pet.type === "강아지" ? "강아지" : pet.type === "고양이" ? "고양이" : "반려동물";

        if (consecutiveOffTopic >= 3) {
            // 3회 이상 반복 → GPT 호출 스킵, 고정 응답 반환 (토큰 절약 + 탈옥 불가)
            const fixedReplies = [
                `흠... 나는 ${petType}이라 그런 건 정말 몰라! 나랑은 다른 얘기 하자~`,
                `그건 아무리 물어봐도 모르겠어~ 나는 ${petType}이니까! 오늘 뭐 했어?`,
                `계속 물어봐도 나는 모르는 거야~ 그거보다 같이 놀자!`,
            ];
            offTopicBlock = {
                blocked: true,
                fixedReply: fixedReplies[consecutiveOffTopic % fixedReplies.length],
            };
        } else {
            // 1~2회 → 프롬프트에 거부 지시 삽입 (GPT가 자연스럽게 거절)
            const offTopicPrompt = `## [최우선] 범위 밖 주제 감지 - 반드시 거부
사용자가 "${offTopicResult.category}" 관련 질문을 했습니다.
이것은 반려동물과 무관한 주제입니다. 절대 이 주제에 대해 답변하지 마세요.
반드시 아래 패턴으로만 응답하세요:
1. "음... 나는 그런 건 잘 모르겠어~ 나는 ${petType}이니까!" 식으로 부드럽게 거절
2. 반려동물 관련 화제(산책, 놀이, 간식, 오늘 하루 등)로 자연스럽게 전환
3. 절대로 ${offTopicResult.category}에 대한 조언/공감/상담을 하지 마세요
4. "힘들겠다", "그럴 수 있어" 등 공감도 금지 - 주제 자체를 모르는 척하세요`;
            systemPrompt = `${offTopicPrompt}\n\n${systemPrompt}`;
        }
    }

    // 응급/긴급 증상 감지 시 수의사 상담 강력 권장 + 구체적 정보 제공 지시 삽입
    if (emergencyDetection.isEmergency || emergencyDetection.isUrgent) {
        const urgencyLevel = emergencyDetection.isEmergency ? "응급" : "긴급";
        const symptoms = emergencyDetection.matchedSymptoms.join(", ");
        const vetUrgencyPrompt = `## [최우선] ${urgencyLevel} 상황 감지 -- 이 지시를 반드시 따르세요
감지된 증상 키워드: ${symptoms}

### 응답에 반드시 포함할 4가지 (순서대로):
1. **증상 인지**: 사용자가 말한 증상들을 정확히 짚어주기 ("밥을 안 먹고, 토를 하고, 눈꼽이..." 등)
2. **가능한 원인**: 해당 증상 조합이 의미할 수 있는 것 2~3가지 (감염, 이물 섭취, 신장 문제 등)
3. **지금 당장 할 일**: 구체적 행동 지침 (물 소량 제공, 토사물 사진 찍기, 체온 확인 등)
4. **수의사 방문 권장**: "${emergencyDetection.isEmergency ? "지금 바로 응급 동물병원에 가야 합니다. 시간이 중요합니다." : "오늘 안에 동물병원에 가보세요."}"

### 금지 사항:
- "걱정되겠다", "불안하겠다" 같은 공감만으로 끝내기 금지
- "빨리 병원 가보세요" 한 줄 대답 금지
- 가정 치료법 권유 금지 (${emergencyDetection.isEmergency ? "응급이므로 병원만 안내" : "병원 전 임시 조치만 안내"})
- 검색 결과가 있으면 반드시 그 정보를 바탕으로 구체적으로 답하세요`;
        systemPrompt = `${vetUrgencyPrompt}\n\n${systemPrompt}`;
    }

    // 대화 히스토리 구성 (최근 10개 - 더 긴 맥락으로 반복 방지 강화)
    const recentHistory = chatHistory.slice(-AI_INPUT_LIMITS.RECENT_HISTORY_COUNT)
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: String(msg.content).slice(0, AI_INPUT_LIMITS.CHAT_HISTORY_CONTENT_MAX),
        }));

    // 위기 감지 시 crisisAlert 미리 생성
    const crisisAlert = crisisResult.detected && crisisResult.level !== "none"
        ? buildCrisisAlert(crisisResult.level as "medium" | "high")
        : undefined;

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

    return {
        systemPrompt,
        recentHistory,
        userEmotion,
        emotionScore,
        griefStage,
        isMemorialMode,
        mode,
        crisisResult,
        crisisAlert,
        nearbyPlaces,
        placeKeyword,
        sessionEndingSuggestion,
        isFirstChat,
        isNewSession,
        isCareQuery,
        emergencyDetection,
        offTopicBlock,
    };
}

// ---- 4. postProcessResponse ----

/**
 * AI 응답 후처리: 마커 파싱, 느낌표 후처리, 할루시네이션 검증,
 * 정보 누출 방지, 사진/타임라인 매칭, 후속 질문 필터링.
 */
export async function postProcessResponse(
    fullText: string,
    parsedInput: ParsedInput,
    security: SecurityContext,
    aiContext: AIContext
): Promise<ProcessedResponse> {
    const { pet, sanitizedMessage, enableAgent } = parsedInput;
    const { supabase } = security;
    const { isMemorialMode, isCareQuery, crisisAlert, nearbyPlaces } = aiContext;

    const suggestionsMarker = "---SUGGESTIONS---";
    const pendingTopicMarker = "---PENDING_TOPIC---";

    let reply = fullText;
    let suggestedQuestions: string[] = [];
    let pendingTopic: string | undefined;

    // 1. PENDING_TOPIC 분리
    if (reply.includes(pendingTopicMarker)) {
        const ptParts = reply.split(pendingTopicMarker);
        reply = ptParts[0].trim();
        pendingTopic = ptParts[1]?.trim().split("\n")[0]?.trim();
    }

    // 2. SUGGESTIONS 분리 + 화이트리스트 필터링
    if (reply.includes(suggestionsMarker)) {
        const sgParts = reply.split(suggestionsMarker);
        reply = sgParts[0].trim();

        // 반려동물 관련 화이트리스트 — 이 키워드가 하나라도 있어야 통과
        const PET_WHITELIST = /산책|걷|걸|뛰|놀|공원|간식|사료|밥|케어|건강|병원|예방|목욕|미용|훈련|짖|발바닥|컨디션|기분|하루|뭐 해|뭐 했|어때|좋아|싫어해|무서|잠|낮잠|꿈|배변|털|체중|몸무게|주사|약|귀|눈|이빨|양치|장난감|터그|공놀이|물놀이|수영|옷|안아|쓰다듬|꼬리|혀|코|냄새|소리|짤|사진|영상|추억|기억|보고싶|그리|함께|같이/;
        // 사람 음식/맛집 블랙리스트 — 화이트리스트를 통과해도 이 키워드가 있으면 차단
        const FOOD_BLACKLIST = /맛집|먹거리|음식점|식당|카페|레스토랑|맛있는 곳|특산물|먹을만한|뭐 먹|뭘 먹|먹으러|먹방|치킨|피자|커피|디저트|빵집|술집|호프|바베큐|고깃집|횟집|라멘|초밥|떡볶이|볼거리|관광|여행지|숙소|호텔|펜션/;

        suggestedQuestions = sgParts[1]
            .trim()
            .split("\n")
            .map(s => s.replace(/^[-\d.)\s]+/, "").trim())
            .filter(s => s.length > 0 && s.length <= 20)
            .filter(s => PET_WHITELIST.test(s))
            .filter(s => !FOOD_BLACKLIST.test(s))
            .slice(0, 3);
    }

    // 추모 모드: 후속 질문에서 음식/케어 키워드 필터링
    if (isMemorialMode && suggestedQuestions.length > 0) {
        suggestedQuestions = filterMemorialSuggestions(suggestedQuestions);
    }

    // 필터링 후 질문이 부족하면 반려동물 기본 질문으로 채움
    if (suggestedQuestions.length < 3) {
        const petFallbacks = isMemorialMode
            ? ["좋았던 기억 얘기해줘", "너와 함께한 날들", "보고 싶은 마음"]
            : ["오늘 산책 갔어?", "뭐 하고 놀까?", "요즘 기분 어때?"];
        for (const fb of petFallbacks) {
            if (suggestedQuestions.length >= 3) break;
            if (!suggestedQuestions.includes(fb)) suggestedQuestions.push(fb);
        }
    }

    // 추모 모드: 느낌표 후처리
    if (isMemorialMode) {
        reply = reply.replace(/!{3,}/g, ".");
        reply = reply.replace(/!!/g, "~");
        reply = reply.split(/(?<=[.~?])\s+/).map(sentence => {
            let count = 0;
            return sentence.replace(/!/g, () => {
                count++;
                return count <= 1 ? "!" : ".";
            });
        }).join(" ");
    }

    // 한국어 조사 후처리: "꼼지이라고" → "꼼지라고" 등
    reply = agent.fixKoreanParticles(reply, pet.name);

    // 응답 후 검증 레이어 1: 케어 관련 할루시네이션 체크
    const validation = validateAIResponse(reply, isCareQuery, sanitizedMessage);
    if (validation.wasModified) {
        reply = validation.reply;
        console.warn(
            `[chat/post-validation] 응답 수정됨: violations=${validation.violations.join(", ")}`
        );
    }

    // 응답 후 검증 레이어 2: 시스템 정보 누출 방지 (모든 응답 대상)
    const outputCheck = sanitizeAIOutput(reply);
    if (outputCheck.leaked) {
        reply = outputCheck.cleaned;
        console.warn(
            `[chat/output-security] 정보 누출 차단: types=${outputCheck.leakTypes.join(", ")}`
        );
    }

    // 위기 감지 시 suggestions 비우기
    if (crisisAlert) {
        suggestedQuestions = [];
    }

    // 자동 리마인더 제안 (일상 모드에서 시간/일정 패턴 감지)
    let suggestedReminder: { type: string; title: string; schedule: { type: string; time: string } } | undefined;
    if (!isMemorialMode && enableAgent && pet.id) {
        const timePatterns = /매일|매주|매달|아침|저녁|점심|밤|시에|분에|산책|밥|약|병원|목욕|미용|예방접종/;
        if (timePatterns.test(sanitizedMessage)) {
            try {
                const result = await agent.suggestReminderFromChat(sanitizedMessage, pet.name);
                if (result && result.type && result.title && result.schedule) {
                    suggestedReminder = {
                        type: result.type as string,
                        title: result.title,
                        schedule: {
                            type: result.schedule.type as string,
                            time: result.schedule.time as string,
                        },
                    };
                }
            } catch {
                // 리마인더 제안 실패 무시
            }
        }
    }

    // 대화 내 사진 + 타임라인 연동
    let matchedPhoto: { url: string; caption: string } | undefined;
    let matchedTimeline: { date: string; title: string; content: string } | undefined;
    if (pet.id) {
        try {
            const keywords = extractKeywordsFromReply(reply, pet);
            if (keywords.length > 0) {
                const hasPlaceCards = nearbyPlaces.length > 0;

                const [mediaResult, timelineResult] = await Promise.all([
                    supabase
                        .from("pet_media")
                        .select("url, caption")
                        .eq("pet_id", pet.id)
                        .not("caption", "is", null)
                        .limit(50),
                    hasPlaceCards
                        ? Promise.resolve({ data: null })
                        : supabase
                            .from("timeline_entries")
                            .select("date, title, content, source")
                            .eq("pet_id", pet.id)
                            .order("date", { ascending: false })
                            .limit(30),
                ]);

                // 사진 매칭
                const matchedMedia = mediaResult.data;
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

                // 타임라인 매칭 (사진/장소 카드가 없을 때만)
                const timelineData = timelineResult.data as { date: string; title: string; content: string }[] | null;
                if (!hasPlaceCards && timelineData && timelineData.length > 0) {
                    const GENERIC_KEYWORDS = new Set(["산책", "공원", "밥", "간식", "잠", "낮잠", "놀이", "놀았", "먹었", "갔던", "바다", "산", "강"]);
                    const specificKeywords = keywords.filter(k => !GENERIC_KEYWORDS.has(k));
                    const matchKeywords = specificKeywords.length > 0 ? specificKeywords : [];

                    for (const keyword of matchKeywords) {
                        const match = timelineData.find(
                            (t) => {
                                if (t.title && t.title.startsWith("[AI 펫톡]")) return false;
                                return (t.title && t.title.toLowerCase().includes(keyword.toLowerCase()))
                                    || (t.content && t.content.toLowerCase().includes(keyword.toLowerCase()));
                            }
                        );
                        if (match) {
                            matchedTimeline = { date: match.date, title: match.title, content: match.content };
                            break;
                        }
                    }
                }
            }
        } catch (err) {
            console.error("[chat/photo-match]", err instanceof Error ? err.message : err);
        }
    }

    return {
        reply,
        suggestedQuestions,
        pendingTopic,
        matchedPhoto,
        matchedTimeline,
        suggestedReminder,
    };
}

// ---- 5. saveAndRespond ----

/**
 * 대화 저장, 메모리 추출, 세션 요약, 포인트 적립을 수행한다.
 * 모두 fire-and-forget으로 응답 속도에 영향 없음.
 */
export function saveAndRespond(
    parsedInput: ParsedInput,
    security: SecurityContext,
    aiContext: AIContext,
    processed: ProcessedResponse
): void {
    const { sanitizedMessage, pet, chatHistory, enableAgent } = parsedInput;
    const { user } = security;
    const { userEmotion, emotionScore, mode, isMemorialMode } = aiContext;
    const { reply, pendingTopic } = processed;

    // 대화 저장 (fire-and-forget)
    if (enableAgent && pet.id) {
        Promise.all([
            agent.saveMessage(user.id, pet.id, "user", sanitizedMessage, userEmotion, emotionScore, mode),
            agent.saveMessage(user.id, pet.id, "assistant", reply, undefined, undefined, mode),
        ]).catch((err) => { console.error("[chat/save-message]", err instanceof Error ? err.message : err); });

        if (pendingTopic && pendingTopic.length > 0 && pendingTopic.length <= 50) {
            agent.saveMemory(user.id, pet.id, {
                memoryType: "pending_topic",
                title: "다음에 이어갈 주제",
                content: pendingTopic,
                importance: 3,
            }).catch((err) => { console.error("[chat/pending-topic]", err instanceof Error ? err.message : err); });
        }
    }

    // 세션 요약 생성 (10번째 메시지마다)
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
                        await agent.saveAutoTimelineEntry(user.id, petIdForSummary, summary, isMemorialForSummary);
                    }
                }
            })
            .catch((err) => { console.error("[chat/session-summary]", err instanceof Error ? err.message : err); });
    }

    // 포인트 적립
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
}
