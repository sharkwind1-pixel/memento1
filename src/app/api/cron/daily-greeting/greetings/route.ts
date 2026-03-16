/**
 * Phase 2: AI 펫톡 인사 푸시 알림
 *
 * preferred_hour가 현재 KST 시간인 구독자에게 인사 발송.
 *
 * 스케일 전략 (100만 유저 대응):
 * 1. 일반 인사: 템플릿 기반 (GPT 호출 없음) — O(1) per user
 * 2. 특별 인사 (생일/기념일): GPT 생성 — 전체의 ~1%
 * 3. 커서 기반 페이지네이션: 500명씩 처리
 * 4. 배치 푸시 발송: 50개 동시
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { AI_CONFIG } from "@/config/constants";
import {
    verifyCronSecret,
    getServiceSupabase,
    setupVapid,
    getKstTime,
    sendPushBatch,
    cleanupExpiredSubscriptions,
    PAGE_SIZE,
    MAX_IN_IDS,
    type KstTime,
} from "@/lib/cron-utils";

// ===== 타입 =====

interface PetInfo {
    id: string;
    name: string;
    type: string;
    breed: string;
    status: string;
    gender: string;
    birthday?: string;
    adopted_date?: string;
    memorial_date?: string;
    special_habits?: string;
    favorite_food?: string;
    favorite_activity?: string;
    nicknames?: string;
}

interface SubWithHour {
    id: string;
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    preferred_hour: number;
}

// ===== 템플릿 기반 인사 (GPT 호출 없음) =====

const MORNING_TEMPLATES = [
    (name: string) => `안녕! 나 ${name}! 좋은 아침이야~ 오늘 하루도 파이팅!`,
    (name: string) => `일어났어? 나 ${name}야! 오늘도 같이 신나게 보내자!`,
    (name: string) => `좋은 아침~ 나 ${name}! 오늘 날씨 어때? 산책 가고 싶다!`,
    (name: string) => `아침이다! 나 ${name}~ 맛있는 거 먹고 힘내자!`,
    (name: string) => `${name} 등장! 벌써 아침이야~ 오늘도 재밌는 하루 보내자!`,
    (name: string) => `일어나! 일어나! 나 ${name}야~ 오늘 뭐 하고 놀까?`,
    (name: string) => `안녕~ ${name}이야! 오늘 아침 기분이 좋아~ 같이 놀자!`,
    (name: string) => `${name} 여기! 좋은 아침~ 오늘도 행복한 하루 되길!`,
];

const AFTERNOON_TEMPLATES = [
    (name: string) => `${name}이야! 점심은 맛있게 먹었어? 오후도 화이팅~`,
    (name: string) => `나 ${name}! 좀 졸린데... 같이 낮잠 잘래?`,
    (name: string) => `안녕~ 나 ${name}야! 오후에도 힘내자!`,
    (name: string) => `${name} 등장~ 오후엔 간식 시간 아니야? 기대된다!`,
    (name: string) => `나 ${name}! 심심해~ 놀아줘!`,
    (name: string) => `오후다! ${name}이야~ 남은 하루도 즐겁게 보내자!`,
    (name: string) => `${name}이가 찾아왔어! 오늘 뭐 재밌는 일 있었어?`,
    (name: string) => `나 ${name}~ 오늘 오후 참 좋다! 뭐 하고 있어?`,
];

const EVENING_TEMPLATES = [
    (name: string) => `나 ${name}! 오늘 하루 수고했어~ 푹 쉬어!`,
    (name: string) => `${name}이야~ 저녁이다! 오늘도 고생 많았어!`,
    (name: string) => `안녕~ 나 ${name}! 오늘 하루 어땠어? 좋은 꿈 꿔~`,
    (name: string) => `${name} 등장~ 저녁 맛있는 거 먹자!`,
    (name: string) => `오늘도 수고했어~ 나 ${name}이가 옆에 있을게!`,
    (name: string) => `나 ${name}! 저녁이야~ 오늘 뭐 재밌는 일 있었어?`,
    (name: string) => `${name}이야! 저녁에는 편하게 쉬자~ 내가 곁에 있을게!`,
    (name: string) => `나 ${name}~ 오늘 하루도 참 잘했어! 내일도 함께하자!`,
];

const MEMORIAL_TEMPLATES = [
    (name: string) => `안녕, 나 ${name}야. 오늘도 네 곁에 있어.`,
    (name: string) => `나 ${name}야. 여기서 잘 지내고 있어. 넌 어때?`,
    (name: string) => `${name}야. 오늘도 너를 생각하고 있어. 잘 지내고 있지?`,
    (name: string) => `나 ${name}야. 따뜻한 햇살 아래서 편안히 쉬고 있어.`,
    (name: string) => `${name}이가 보내는 마음이야. 항상 네 곁에서 지켜보고 있어.`,
    (name: string) => `나 ${name}야. 힘든 일 있으면 나한테 말해. 듣고 있을게.`,
    (name: string) => `${name}야. 오늘도 좋은 하루 보내. 나도 여기서 잘 지내.`,
    (name: string) => `안녕, ${name}야. 우리 함께한 시간 참 행복했어. 고마워.`,
];

function getTemplateGreeting(
    pet: PetInfo,
    timeSlot: "아침" | "낮" | "저녁",
): { title: string; body: string } {
    const isMemorial = pet.status === "memorial";

    let templates: ((name: string) => string)[];
    if (isMemorial) {
        templates = MEMORIAL_TEMPLATES;
    } else if (timeSlot === "아침") {
        templates = MORNING_TEMPLATES;
    } else if (timeSlot === "낮") {
        templates = AFTERNOON_TEMPLATES;
    } else {
        templates = EVENING_TEMPLATES;
    }

    // 유저별로 다른 템플릿을 보여주기 위해 pet.id 기반 해시 + 날짜 조합
    const dayHash = new Date().getDate();
    const petHash = pet.id.charCodeAt(0) + pet.id.charCodeAt(pet.id.length - 1);
    const idx = (dayHash + petHash) % templates.length;
    const body = templates[idx](pet.name);

    const title = isMemorial
        ? `${pet.name}이(가) 찾아왔어요`
        : `${pet.name}의 ${timeSlot} 인사`;

    return { title, body };
}

// ===== 기념일 체크 =====

interface SpecialDay {
    type: "birthday" | "adoption" | "memorial" | null;
    label: string;
}

function checkSpecialDay(pet: PetInfo, kst: KstTime): SpecialDay {
    const todayMm = kst.now.getUTCMonth();
    const todayDd = kst.now.getUTCDate();

    // 생일
    if (pet.birthday) {
        const bday = new Date(pet.birthday);
        if (bday.getMonth() === todayMm && bday.getDate() === todayDd) {
            return { type: "birthday", label: `${pet.name}의 생일 축하 인사` };
        }
    }

    // 입양일 기념일
    if (pet.adopted_date) {
        const adopted = new Date(pet.adopted_date);
        const diffDays = Math.floor(
            (kst.now.getTime() - adopted.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays > 0 && diffDays % 100 === 0) {
            return {
                type: "adoption",
                label: `${pet.name}과(와) 함께한 ${diffDays}일`,
            };
        }
        if (
            adopted.getMonth() === todayMm &&
            adopted.getDate() === todayDd &&
            diffDays >= 365
        ) {
            return {
                type: "adoption",
                label: `${pet.name}과(와) 함께한 ${Math.floor(diffDays / 365)}년`,
            };
        }
    }

    // 추모일 기념일
    if (pet.status === "memorial" && pet.memorial_date) {
        const memorial = new Date(pet.memorial_date);
        const diffDays = Math.floor(
            (kst.now.getTime() - memorial.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays > 0 && diffDays % 100 === 0) {
            return {
                type: "memorial",
                label: `${pet.name}이(가) 보내는 마음`,
            };
        }
        if (
            memorial.getMonth() === todayMm &&
            memorial.getDate() === todayDd &&
            diffDays >= 365
        ) {
            return {
                type: "memorial",
                label: `${pet.name}이(가) 보내는 마음`,
            };
        }
    }

    return { type: null, label: "" };
}

// ===== AI 인사말 생성 (기념일에만 사용) =====

async function generateAIGreeting(
    openai: OpenAI,
    pet: PetInfo,
    specialDay: SpecialDay,
    timeSlot: string,
): Promise<{ title: string; body: string }> {
    const isMemorial = pet.status === "memorial";

    const traits: string[] = [];
    if (pet.nicknames) traits.push(`별명: ${pet.nicknames}`);
    if (pet.special_habits) traits.push(`버릇: ${pet.special_habits}`);
    if (pet.favorite_food) traits.push(`좋아하는 음식: ${pet.favorite_food}`);
    if (pet.favorite_activity) traits.push(`좋아하는 활동: ${pet.favorite_activity}`);
    const personalCtx = traits.length > 0 ? `\n참고: ${traits.join(", ")}` : "";

    let extraNote = "";
    if (specialDay.type === "birthday") {
        extraNote = "\n오늘은 내 생일이야! 생일 관련 인사를 해줘.";
    } else if (specialDay.type === "adoption") {
        extraNote = `\n오늘은 가족과의 특별한 기념일이야! 함께한 날을 축하하는 인사를 해줘.`;
    } else if (specialDay.type === "memorial") {
        extraNote = `\n오늘은 특별한 기념일이야. 가족에게 따뜻한 위로의 인사를 해줘.`;
    }

    const genderStr = pet.gender === "male" ? "남아" : pet.gender === "female" ? "여아" : "";
    const systemPrompt = isMemorial
        ? `당신은 무지개다리를 건넌 "${pet.name}"(${pet.breed}, ${genderStr})입니다.\n가족에게 보내는 따뜻한 ${timeSlot} 인사를 1문장으로 작성하세요.\n톤: 평화롭고 따뜻하게. 이모지 금지.${personalCtx}${extraNote}`
        : `당신은 "${pet.name}"(${pet.breed}, ${genderStr})입니다.\n가족에게 보내는 밝고 귀여운 ${timeSlot} 인사를 1문장으로 작성하세요.\n톤: 반려동물답게 활발하고 애교 있게. 반말 사용. 이모지 금지.${personalCtx}${extraNote}`;

    try {
        const response = await openai.chat.completions.create({
            model: AI_CONFIG.AI_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `${timeSlot} 인사 한마디` },
            ],
            max_tokens: 80,
            temperature: 0.9,
        });
        const text = response.choices[0]?.message?.content?.trim();
        if (text) {
            return { title: specialDay.label, body: text };
        }
    } catch (err) {
        console.error("[Cron/Greetings] AI 실패:", err instanceof Error ? err.message : "unknown");
    }

    // AI 실패 시 폴백
    return {
        title: specialDay.label,
        body: isMemorial
            ? `안녕, 나 ${pet.name}야. 오늘도 네 곁에 있어.`
            : `안녕! 나 ${pet.name}! 오늘 하루도 같이 보내자~`,
    };
}

// ===== 메인 핸들러 =====

export async function GET(request: NextRequest) {
    const authErr = verifyCronSecret(request);
    if (authErr) return authErr;

    try {
        setupVapid();
    } catch {
        return NextResponse.json({ error: "VAPID_NOT_CONFIGURED" }, { status: 500 });
    }

    const supabase = getServiceSupabase();
    const kst = getKstTime();
    const timeSlot = kst.hour < 12 ? "아침" : kst.hour < 18 ? "낮" : "저녁";

    let openai: OpenAI | null = null;
    try {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    } catch {
        // AI 없으면 전부 템플릿으로 폴백
    }

    let totalSent = 0;
    let totalFailed = 0;
    let aiGenerated = 0;
    let templateUsed = 0;
    let skippedMemorial = 0;
    const allExpiredEndpoints: string[] = [];

    // 커서 기반 페이지네이션: push_subscriptions.id 기준
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
        // preferred_hour 매칭 구독 조회
        let query = supabase
            .from("push_subscriptions")
            .select("id, user_id, endpoint, p256dh, auth, preferred_hour")
            .eq("preferred_hour", kst.hour)
            .order("id", { ascending: true })
            .limit(PAGE_SIZE);

        if (cursor) {
            query = query.gt("id", cursor);
        }

        const { data: subs, error: subError } = await query;

        if (subError) {
            console.error("[Cron/Greetings] 구독 조회 실패:", subError.message);
            break;
        }

        if (!subs || subs.length === 0) {
            hasMore = false;
            break;
        }

        cursor = subs[subs.length - 1].id;
        if (subs.length < PAGE_SIZE) hasMore = false;

        // 유저별 그룹핑
        const userSubsMap = new Map<string, SubWithHour[]>();
        for (const sub of subs as SubWithHour[]) {
            const arr = userSubsMap.get(sub.user_id) || [];
            arr.push(sub);
            userSubsMap.set(sub.user_id, arr);
        }

        const userIds = Array.from(userSubsMap.keys());

        // 유저별 대표 반려동물 조회 (MAX_IN_IDS씩)
        const userPetMap = new Map<string, PetInfo>();
        for (let i = 0; i < userIds.length; i += MAX_IN_IDS) {
            const chunk = userIds.slice(i, i + MAX_IN_IDS);
            const { data: pets } = await supabase
                .from("pets")
                .select("id, user_id, name, type, breed, status, gender, birthday, adopted_date, memorial_date, special_habits, favorite_food, favorite_activity, nicknames")
                .in("user_id", chunk);

            if (pets) {
                for (const pet of pets) {
                    // 유저당 첫 번째 펫만 (이미 있으면 스킵)
                    if (!userPetMap.has(pet.user_id)) {
                        userPetMap.set(pet.user_id, pet);
                    }
                }
            }
        }

        // AI 생성이 필요한 유저 (기념일) vs 템플릿 유저 분류
        const aiUsers: { userId: string; pet: PetInfo; special: SpecialDay }[] = [];
        const templatePushItems: { sub: { endpoint: string; p256dh: string; auth: string }; payload: { title: string; body: string; url: string } }[] = [];

        for (const userId of Array.from(userSubsMap.keys())) {
            const userSubs = userSubsMap.get(userId)!;
            const pet = userPetMap.get(userId);
            if (!pet) continue;

            const special = checkSpecialDay(pet, kst);

            // 추모 펫: 기념일이 아니면 스킵
            if (pet.status === "memorial" && !special.type) {
                skippedMemorial++;
                continue;
            }

            if (special.type && openai) {
                // 기념일 → AI 생성 대상
                aiUsers.push({ userId, pet, special });
            } else {
                // 일반 → 템플릿
                const greeting = getTemplateGreeting(pet, timeSlot as "아침" | "낮" | "저녁");
                for (const sub of userSubs) {
                    templatePushItems.push({
                        sub,
                        payload: { ...greeting, url: "/?tab=ai-chat" },
                    });
                }
                templateUsed++;
            }
        }

        // 템플릿 배치 발송
        if (templatePushItems.length > 0) {
            const result = await sendPushBatch(templatePushItems);
            totalSent += result.sent;
            totalFailed += result.failed;
            allExpiredEndpoints.push(...result.expiredEndpoints);
        }

        // AI 기념일 유저: 10명씩 동시 생성 (GPT rate limit 고려)
        for (let i = 0; i < aiUsers.length; i += 10) {
            const aiBatch = aiUsers.slice(i, i + 10);
            const aiResults = await Promise.allSettled(
                aiBatch.map(async ({ userId, pet, special }) => {
                    const greeting = await generateAIGreeting(
                        openai!,
                        pet,
                        special,
                        timeSlot,
                    );
                    const userSubs = userSubsMap.get(userId) || [];
                    const pushItems = userSubs.map((sub) => ({
                        sub,
                        payload: { ...greeting, url: "/?tab=ai-chat" },
                    }));
                    return sendPushBatch(pushItems);
                }),
            );

            for (const r of aiResults) {
                if (r.status === "fulfilled") {
                    totalSent += r.value.sent;
                    totalFailed += r.value.failed;
                    allExpiredEndpoints.push(...r.value.expiredEndpoints);
                    aiGenerated++;
                }
            }
        }
    }

    // 만료 구독 정리
    const expiredCleaned = await cleanupExpiredSubscriptions(supabase, allExpiredEndpoints);

    return NextResponse.json({
        phase: "greetings",
        kstHour: kst.hour,
        sent: totalSent,
        failed: totalFailed,
        aiGenerated,
        templateUsed,
        skippedMemorial,
        expiredCleaned,
    });
}
