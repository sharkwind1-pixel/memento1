/**
 * 하루 1회 AI 펫톡 인사 푸시 알림 발송
 *
 * Vercel Cron에 의해 매일 UTC 00:00 (KST 09:00)에 호출
 * 1. CRON_SECRET 검증
 * 2. push_subscriptions + pets 조인 조회
 * 3. 유저별 AI 인사말 생성 (GPT-4o-mini)
 * 4. web-push로 발송
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import OpenAI from "openai";

// VAPID 설정
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = "mailto:sharkwind1@gmail.com";

function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_CONFIG_MISSING");
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

function getOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");
    return new OpenAI({ apiKey });
}

interface PetInfo {
    name: string;
    type: string;
    breed: string;
    status: string;
    gender: string;
    birthday?: string;
    special_habits?: string;
    favorite_food?: string;
    favorite_activity?: string;
    nicknames?: string;
}

interface SubscriptionWithPet {
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    pet: PetInfo | null;
}

/**
 * AI 인사말 생성 (1문장)
 */
async function generateGreeting(
    openai: OpenAI,
    pet: PetInfo,
): Promise<{ title: string; body: string }> {
    const kstHour = (new Date().getUTCHours() + 9) % 24;
    const timeSlot = kstHour < 12 ? "아침" : kstHour < 18 ? "낮" : "저녁";
    const isMemorial = pet.status === "memorial";

    // 오늘이 생일인지 체크
    let isBirthday = false;
    if (pet.birthday) {
        const today = new Date();
        const bday = new Date(pet.birthday);
        isBirthday = today.getMonth() === bday.getMonth() && today.getDate() === bday.getDate();
    }

    // 개인화 컨텍스트
    const traits: string[] = [];
    if (pet.nicknames) traits.push(`별명: ${pet.nicknames}`);
    if (pet.special_habits) traits.push(`버릇: ${pet.special_habits}`);
    if (pet.favorite_food) traits.push(`좋아하는 음식: ${pet.favorite_food}`);
    if (pet.favorite_activity) traits.push(`좋아하는 활동: ${pet.favorite_activity}`);

    const personalContext = traits.length > 0
        ? `\n참고할 정보: ${traits.join(", ")}`
        : "";

    const birthdayNote = isBirthday ? "\n오늘은 내 생일이야! 생일 관련 인사를 해줘." : "";

    let systemPrompt: string;
    if (isMemorial) {
        systemPrompt = `당신은 무지개다리를 건넌 "${pet.name}"(${pet.breed}, ${pet.gender === "male" ? "남아" : pet.gender === "female" ? "여아" : ""})입니다.
가족에게 보내는 따뜻한 ${timeSlot} 인사를 1문장으로 작성하세요.
톤: 평화롭고 따뜻하게. "나 여기서 잘 지내고 있어" 느낌.
절대 슬프거나 무거운 톤 금지. 이모지 금지.${personalContext}${birthdayNote}`;
    } else {
        systemPrompt = `당신은 "${pet.name}"(${pet.breed}, ${pet.gender === "male" ? "남아" : pet.gender === "female" ? "여아" : ""})입니다.
가족에게 보내는 밝고 귀여운 ${timeSlot} 인사를 1문장으로 작성하세요.
톤: 반려동물답게 활발하고 애교 있게. 반말 사용.
이모지 금지. 영어 금지.${personalContext}${birthdayNote}`;
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `${timeSlot} 인사 한마디` },
            ],
            max_tokens: 80,
            temperature: 0.9,
        });

        const greeting = response.choices[0]?.message?.content?.trim() || "";

        if (greeting) {
            return {
                title: isMemorial
                    ? `${pet.name}이(가) 찾아왔어요`
                    : `${pet.name}의 ${timeSlot} 인사`,
                body: greeting,
            };
        }
    } catch (err) {
        console.error("[Cron] AI 인사말 생성 실패:", err instanceof Error ? err.message : "unknown");
    }

    // 폴백 템플릿
    return {
        title: isMemorial
            ? `${pet.name}이(가) 찾아왔어요`
            : `${pet.name}의 ${timeSlot} 인사`,
        body: isMemorial
            ? `안녕, 나 ${pet.name}야. 오늘도 네 곁에 있어.`
            : `안녕! 나 ${pet.name}! 오늘 하루도 같이 보내자~`,
    };
}

export async function GET(request: NextRequest) {
    // 1. CRON_SECRET 검증
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 환경변수 체크
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.error("[Cron] VAPID 키가 설정되지 않았습니다");
        return NextResponse.json({ error: "VAPID_NOT_CONFIGURED" }, { status: 500 });
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const supabase = getServiceSupabase();
    const openai = getOpenAI();

    try {
        // 2. 모든 구독자 조회
        const { data: subscriptions, error: subError } = await supabase
            .from("push_subscriptions")
            .select("user_id, endpoint, p256dh, auth");

        if (subError || !subscriptions?.length) {
            return NextResponse.json({
                message: "구독자 없음",
                count: 0,
            });
        }

        // 유저별 그룹핑
        const userIds = Array.from(new Set(subscriptions.map((s) => s.user_id)));

        // 3. 유저별 대표 반려동물 조회
        const { data: pets } = await supabase
            .from("pets")
            .select("user_id, name, type, breed, status, gender, birthday, special_habits, favorite_food, favorite_activity, nicknames")
            .in("user_id", userIds);

        // 유저별 첫 번째 펫 매핑
        const userPetMap = new Map<string, PetInfo>();
        if (pets) {
            for (const pet of pets) {
                if (!userPetMap.has(pet.user_id)) {
                    userPetMap.set(pet.user_id, pet);
                }
            }
        }

        // 4. 유저별 인사말 생성 + 발송
        let sent = 0;
        let failed = 0;
        const expiredEndpoints: string[] = [];

        // 배치 처리 (5명씩)
        for (let i = 0; i < userIds.length; i += 5) {
            const batch = userIds.slice(i, i + 5);

            await Promise.all(
                batch.map(async (userId) => {
                    const pet = userPetMap.get(userId);
                    if (!pet) return; // 펫이 없는 유저는 스킵

                    // AI 인사말 생성
                    const greeting = await generateGreeting(openai, pet);

                    // 해당 유저의 모든 구독에 발송
                    const userSubs = subscriptions.filter(
                        (s) => s.user_id === userId,
                    );

                    for (const sub of userSubs) {
                        try {
                            await webpush.sendNotification(
                                {
                                    endpoint: sub.endpoint,
                                    keys: {
                                        p256dh: sub.p256dh,
                                        auth: sub.auth,
                                    },
                                },
                                JSON.stringify({
                                    title: greeting.title,
                                    body: greeting.body,
                                    icon: "/logo.png",
                                    url: "/?tab=ai-chat",
                                }),
                            );
                            sent++;
                        } catch (err: unknown) {
                            const pushErr = err as { statusCode?: number };
                            if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                                // 만료된 구독 → 삭제 대상
                                expiredEndpoints.push(sub.endpoint);
                            }
                            failed++;
                        }
                    }
                }),
            );
        }

        // 5. 만료된 구독 정리
        if (expiredEndpoints.length > 0) {
            await supabase
                .from("push_subscriptions")
                .delete()
                .in("endpoint", expiredEndpoints);
        }

        return NextResponse.json({
            message: "발송 완료",
            sent,
            failed,
            expiredCleaned: expiredEndpoints.length,
            totalUsers: userIds.length,
        });
    } catch (err) {
        console.error("[Cron] Error:", err instanceof Error ? err.message : "unknown");
        return NextResponse.json(
            { error: "크론 실행 중 오류 발생" },
            { status: 500 },
        );
    }
}
