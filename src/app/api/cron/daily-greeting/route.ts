/**
 * 푸시 알림 발송 크론 (매시간 실행)
 *
 * Supabase pg_cron + pg_net으로 매시간 호출
 * (Vercel Hobby 크론은 1일 1회 제한이므로 Supabase에서 매시간 HTTP GET 호출)
 *
 * Phase 1: 케어 리마인더 알림 발송
 *   - 현재 KST 시간에 해당하는 리마인더 조회 (schedule_time 시간 매칭)
 *   - 스케줄 타입별 필터 (daily/weekly/monthly/once)
 *   - 해당 유저의 푸시 구독으로 발송
 *   - once 타입은 발송 후 자동 비활성화
 * Phase 2: AI 펫톡 인사 발송
 *   - preferred_hour 매칭 구독자 조회
 *   - 유저별 AI 인사말 생성 (GPT-4o-mini)
 *   - web-push로 발송
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as webpush from "web-push";
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

interface PushSubscriptionRow {
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
}

interface ReminderRow {
    id: string;
    pet_id: string;
    user_id: string;
    type: string;
    title: string;
    schedule_type: string;
    schedule_time: string; // "HH:MM:SS"
    schedule_day_of_week: number | null;
    schedule_day_of_month: number | null;
    schedule_date: string | null;
    pet_name: string;
}

/**
 * 푸시 발송 유틸 (1개 구독에 발송)
 * @returns "sent" | "expired" | "failed"
 */
async function sendPush(
    sub: { endpoint: string; p256dh: string; auth: string },
    payload: { title: string; body: string; icon?: string; url?: string },
): Promise<"sent" | "expired" | "failed"> {
    try {
        await webpush.sendNotification(
            {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({
                title: payload.title,
                body: payload.body,
                icon: payload.icon || "/logo.png",
                url: payload.url || "/?tab=ai-chat",
            }),
        );
        return "sent";
    } catch (err: unknown) {
        const pushErr = err as { statusCode?: number };
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            return "expired";
        }
        return "failed";
    }
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
        const currentKstHour = (new Date().getUTCHours() + 9) % 24;
        const expiredEndpoints: string[] = [];

        // ============================================================
        // Phase 1: 케어 리마인더 알림 발송
        // ============================================================
        let reminderSent = 0;
        let reminderFailed = 0;

        try {
            // KST 기준 오늘 날짜 정보
            const now = new Date();
            const kstOffset = 9 * 60 * 60 * 1000;
            const kstNow = new Date(now.getTime() + kstOffset);
            const kstDayOfWeek = kstNow.getUTCDay(); // 0=일, 1=월, ..., 6=토
            const kstDay = kstNow.getUTCDate();
            const kstDateStr = kstNow.toISOString().slice(0, 10); // "YYYY-MM-DD"

            // 현재 KST 시간에 해당하는 enabled 리마인더 조회
            // Supabase에서 schedule_time의 시(hour)를 직접 필터링할 수 없으므로
            // 범위 필터 사용: HH:00:00 ~ HH:59:59
            const hourStr = String(currentKstHour).padStart(2, "0");
            const timeFrom = `${hourStr}:00:00`;
            const timeTo = `${hourStr}:59:59`;

            const { data: allReminders, error: remError } = await supabase
                .from("pet_reminders")
                .select(`
                    id, pet_id, type, title,
                    schedule_type, schedule_time,
                    schedule_day_of_week, schedule_day_of_month, schedule_date,
                    pets!inner(user_id, name)
                `)
                .eq("enabled", true)
                .gte("schedule_time", timeFrom)
                .lte("schedule_time", timeTo);

            if (!remError && allReminders && allReminders.length > 0) {
                // 스케줄 타입별 필터링 (앱 레벨)
                const matchedReminders = allReminders.filter((r) => {
                    switch (r.schedule_type) {
                        case "daily":
                            return true;
                        case "weekly":
                            return r.schedule_day_of_week === kstDayOfWeek;
                        case "monthly":
                            return r.schedule_day_of_month === kstDay;
                        case "once":
                            return r.schedule_date === kstDateStr;
                        default:
                            return false;
                    }
                });

                if (matchedReminders.length > 0) {
                    // 매칭된 리마인더의 유저 ID 수집
                    const reminderUserIds = Array.from(
                        new Set(matchedReminders.map((r) => {
                            const pet = r.pets as unknown as { user_id: string; name: string };
                            return pet.user_id;
                        })),
                    );

                    // 해당 유저들의 푸시 구독 조회
                    const { data: reminderSubs } = await supabase
                        .from("push_subscriptions")
                        .select("user_id, endpoint, p256dh, auth")
                        .in("user_id", reminderUserIds);

                    if (reminderSubs && reminderSubs.length > 0) {
                        // 유저별 구독 매핑
                        const userSubsMap = new Map<string, PushSubscriptionRow[]>();
                        for (const sub of reminderSubs) {
                            const arr = userSubsMap.get(sub.user_id) || [];
                            arr.push(sub);
                            userSubsMap.set(sub.user_id, arr);
                        }

                        // 리마인더별 발송
                        const onceReminderIds: string[] = [];

                        for (const reminder of matchedReminders) {
                            const pet = reminder.pets as unknown as { user_id: string; name: string };
                            const userId = pet.user_id;
                            const petName = pet.name;
                            const subs = userSubsMap.get(userId);
                            if (!subs) continue;

                            for (const sub of subs) {
                                const result = await sendPush(sub, {
                                    title: `${petName} 케어 알림`,
                                    body: reminder.title,
                                    url: "/?tab=record",
                                });

                                if (result === "sent") reminderSent++;
                                else if (result === "expired") {
                                    expiredEndpoints.push(sub.endpoint);
                                    reminderFailed++;
                                } else {
                                    reminderFailed++;
                                }
                            }

                            // once 타입은 발송 후 비활성화 대상
                            if (reminder.schedule_type === "once") {
                                onceReminderIds.push(reminder.id);
                            }
                        }

                        // last_triggered 업데이트
                        const triggeredIds = matchedReminders.map((r) => r.id);
                        if (triggeredIds.length > 0) {
                            await supabase
                                .from("pet_reminders")
                                .update({ last_triggered: new Date().toISOString() })
                                .in("id", triggeredIds);
                        }

                        // once 타입 리마인더 자동 비활성화
                        if (onceReminderIds.length > 0) {
                            await supabase
                                .from("pet_reminders")
                                .update({ enabled: false, last_triggered: new Date().toISOString() })
                                .in("id", onceReminderIds);
                        }
                    }
                }
            }

            if (remError) {
                console.error("[Cron] 리마인더 조회 실패:", remError.message);
            }
        } catch (remErr) {
            // 리마인더 발송 실패해도 AI 인사말은 계속 진행
            console.error("[Cron] 리마인더 발송 오류:", remErr instanceof Error ? remErr.message : "unknown");
        }

        // ============================================================
        // Phase 2: AI 펫톡 인사 발송
        // ============================================================
        let greetingSent = 0;
        let greetingFailed = 0;

        const { data: subscriptions, error: subError } = await supabase
            .from("push_subscriptions")
            .select("user_id, endpoint, p256dh, auth, preferred_hour")
            .eq("preferred_hour", currentKstHour);

        if (!subError && subscriptions && subscriptions.length > 0) {
            // 유저별 그룹핑
            const userIds = Array.from(new Set(subscriptions.map((s) => s.user_id)));

            // 유저별 대표 반려동물 조회
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

            // 유저별 인사말 생성 + 발송 (배치 5명씩)
            for (let i = 0; i < userIds.length; i += 5) {
                const batch = userIds.slice(i, i + 5);

                await Promise.all(
                    batch.map(async (userId) => {
                        const pet = userPetMap.get(userId);
                        if (!pet) return;

                        const greeting = await generateGreeting(openai, pet);
                        const userSubs = subscriptions.filter((s) => s.user_id === userId);

                        for (const sub of userSubs) {
                            const result = await sendPush(sub, {
                                title: greeting.title,
                                body: greeting.body,
                                url: "/?tab=ai-chat",
                            });

                            if (result === "sent") greetingSent++;
                            else if (result === "expired") {
                                expiredEndpoints.push(sub.endpoint);
                                greetingFailed++;
                            } else {
                                greetingFailed++;
                            }
                        }
                    }),
                );
            }
        }

        // ============================================================
        // 만료된 구독 정리
        // ============================================================
        const uniqueExpired = Array.from(new Set(expiredEndpoints));
        if (uniqueExpired.length > 0) {
            await supabase
                .from("push_subscriptions")
                .delete()
                .in("endpoint", uniqueExpired);
        }

        return NextResponse.json({
            message: "발송 완료",
            currentKstHour,
            reminder: { sent: reminderSent, failed: reminderFailed },
            greeting: { sent: greetingSent, failed: greetingFailed },
            expiredCleaned: uniqueExpired.length,
        });
    } catch (err) {
        console.error("[Cron] Error:", err instanceof Error ? err.message : "unknown");
        return NextResponse.json(
            { error: "크론 실행 중 오류 발생" },
            { status: 500 },
        );
    }
}
