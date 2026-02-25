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
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@memento-ani.com";

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

    // 입양일(처음 만난 날) 기념일 체크
    let isAdoptionAnniversary = false;
    let adoptionDays = 0;
    if (pet.adopted_date) {
        const adopted = new Date(pet.adopted_date);
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - adopted.getTime()) / (1000 * 60 * 60 * 24));
        adoptionDays = diffDays;
        if (diffDays > 0 && (diffDays % 100 === 0 || (today.getMonth() === adopted.getMonth() && today.getDate() === adopted.getDate() && diffDays >= 365))) {
            isAdoptionAnniversary = true;
        }
    }

    // 추모일 기념일 체크 (memorial 상태일 때만)
    let isMemorialAnniversary = false;
    let memorialDays = 0;
    if (pet.status === "memorial" && pet.memorial_date) {
        const memorial = new Date(pet.memorial_date);
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - memorial.getTime()) / (1000 * 60 * 60 * 24));
        memorialDays = diffDays;
        if (diffDays > 0 && (diffDays % 100 === 0 || (today.getMonth() === memorial.getMonth() && today.getDate() === memorial.getDate() && diffDays >= 365))) {
            isMemorialAnniversary = true;
        }
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

    const adoptionNote = isAdoptionAnniversary
        ? `\n오늘은 가족과 처음 만난 지 ${adoptionDays >= 365 ? `${Math.floor(adoptionDays / 365)}년` : `${adoptionDays}일`}이 되는 날이야! 처음 만난 날 관련 인사를 해줘.`
        : "";

    const memorialNote = isMemorialAnniversary
        ? `\n오늘은 무지개다리를 건넌 지 ${memorialDays >= 365 ? `${Math.floor(memorialDays / 365)}년` : `${memorialDays}일`}이 되는 날이야. 가족에게 따뜻한 위로의 인사를 해줘.`
        : "";

    let systemPrompt: string;
    if (isMemorial) {
        systemPrompt = `당신은 무지개다리를 건넌 "${pet.name}"(${pet.breed}, ${pet.gender === "male" ? "남아" : pet.gender === "female" ? "여아" : ""})입니다.
가족에게 보내는 따뜻한 ${timeSlot} 인사를 1문장으로 작성하세요.
톤: 평화롭고 따뜻하게. "나 여기서 잘 지내고 있어" 느낌.
절대 슬프거나 무거운 톤 금지. 이모지 금지.${personalContext}${birthdayNote}${adoptionNote}${memorialNote}`;
    } else {
        systemPrompt = `당신은 "${pet.name}"(${pet.breed}, ${pet.gender === "male" ? "남아" : pet.gender === "female" ? "여아" : ""})입니다.
가족에게 보내는 밝고 귀여운 ${timeSlot} 인사를 1문장으로 작성하세요.
톤: 반려동물답게 활발하고 애교 있게. 반말 사용.
이모지 금지. 영어 금지.${personalContext}${birthdayNote}${adoptionNote}`;
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
            // 기념일별 제목 분기
            let title: string;
            if (isBirthday) {
                title = `${pet.name}의 생일 축하 인사`;
            } else if (isAdoptionAnniversary) {
                title = `${pet.name}과(와) 함께한 ${adoptionDays >= 365 ? `${Math.floor(adoptionDays / 365)}년` : `${adoptionDays}일`}`;
            } else if (isMemorialAnniversary) {
                title = `${pet.name}이(가) 보내는 마음`;
            } else if (isMemorial) {
                title = `${pet.name}이(가) 찾아왔어요`;
            } else {
                title = `${pet.name}의 ${timeSlot} 인사`;
            }

            return { title, body: greeting };
        }
    } catch (err) {
        console.error("[Cron] AI 인사말 생성 실패:", err instanceof Error ? err.message : "unknown");
    }

    // 폴백 템플릿 (기념일 제목 분기 포함)
    let fallbackTitle: string;
    if (isBirthday) {
        fallbackTitle = `${pet.name}의 생일 축하 인사`;
    } else if (isAdoptionAnniversary) {
        fallbackTitle = `${pet.name}과(와) 함께한 ${adoptionDays >= 365 ? `${Math.floor(adoptionDays / 365)}년` : `${adoptionDays}일`}`;
    } else if (isMemorialAnniversary) {
        fallbackTitle = `${pet.name}이(가) 보내는 마음`;
    } else if (isMemorial) {
        fallbackTitle = `${pet.name}이(가) 찾아왔어요`;
    } else {
        fallbackTitle = `${pet.name}의 ${timeSlot} 인사`;
    }

    return {
        title: fallbackTitle,
        body: isMemorial
            ? `안녕, 나 ${pet.name}야. 오늘도 네 곁에 있어.`
            : `안녕! 나 ${pet.name}! 오늘 하루도 같이 보내자~`,
    };
}

export async function GET(request: NextRequest) {
    // 1. CRON_SECRET 검증 (필수)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // CRON_SECRET이 설정되지 않으면 실행 거부 (보안)
    if (!cronSecret) {
        console.error("[Cron] CRON_SECRET이 설정되지 않았습니다");
        return NextResponse.json({ error: "CRON_SECRET_MISSING" }, { status: 500 });
    }

    // 인증 검증은 필수
    if (authHeader !== `Bearer ${cronSecret}`) {
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
        // Phase 1.5: "1년 전 오늘" 타임라인 알림
        // ============================================================
        let timelinePushSent = 0;

        try {
            const tlNow = new Date();
            const tlKstOffset = 9 * 60 * 60 * 1000;
            const tlKstNow = new Date(tlNow.getTime() + tlKstOffset);
            const oneYearAgo = new Date(tlKstNow);
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const targetDate = oneYearAgo.toISOString().slice(0, 10);

            // 오전 9시(KST)에만 실행 (하루 1번만 발송)
            if (currentKstHour === 9) {
                const { data: oldEntries } = await supabase
                    .from("timeline_entries")
                    .select("user_id, pet_id, title, pets!inner(name)")
                    .eq("date", targetDate);

                if (oldEntries && oldEntries.length > 0) {
                    const userEntryMap = new Map<string, { petName: string; title: string }>();
                    for (const entry of oldEntries) {
                        const entryPet = entry.pets as unknown as { name: string };
                        if (!userEntryMap.has(entry.user_id)) {
                            userEntryMap.set(entry.user_id, { petName: entryPet.name, title: entry.title });
                        }
                    }

                    const entryUserIds = Array.from(userEntryMap.keys());
                    const { data: entrySubs } = await supabase
                        .from("push_subscriptions")
                        .select("user_id, endpoint, p256dh, auth")
                        .in("user_id", entryUserIds);

                    if (entrySubs) {
                        for (const sub of entrySubs) {
                            const entry = userEntryMap.get(sub.user_id);
                            if (!entry) continue;
                            const result = await sendPush(sub, {
                                title: `1년 전 오늘, ${entry.petName}과(와)의 기록`,
                                body: `"${entry.title}" - 이 날의 추억을 다시 만나보세요`,
                                url: "/?tab=record",
                            });
                            if (result === "sent") timelinePushSent++;
                            else if (result === "expired") expiredEndpoints.push(sub.endpoint);
                        }
                    }
                }
            }
        } catch (tlErr) {
            console.error("[Cron] 1년 전 오늘 알림 오류:", tlErr instanceof Error ? tlErr.message : "unknown");
        }

        // ============================================================
        // Phase 1.75: 추모 반려동물 추억 앨범 자동 생성
        // - 기본: 매월 1일 09시에 월간 앨범 생성
        // - 예외: 기념일(생일, 입양 100일/1년, 추모 100일/1년 등)에 특별 앨범 생성
        // ============================================================
        let albumCreatedCount = 0;

        try {
            // KST 날짜 계산
            const albumNow = new Date();
            const albumKstOffset = 9 * 60 * 60 * 1000;
            const albumKstNow = new Date(albumNow.getTime() + albumKstOffset);
            const albumKstDay = albumKstNow.getUTCDate();
            const isFirstDayOfMonth = albumKstDay === 1;

            // 09시(KST)에만 실행
            if (currentKstHour === 9) {
                const albumKstDateStr = albumKstNow.toISOString().slice(0, 10); // "YYYY-MM-DD"
                const albumKstMmDd = albumKstDateStr.slice(5); // "MM-DD"

                // 추모 모드 + 사진 3장 이상인 반려동물 조회 (기념일 체크를 위해 날짜 필드 포함)
                const { data: memorialPets, error: mpError } = await supabase
                    .from("pets")
                    .select("id, user_id, name, birthday, adopted_date, memorial_date")
                    .eq("status", "memorial");

                if (mpError) {
                    console.error("[Cron] 추모 반려동물 조회 실패:", mpError.message);
                }

                if (!mpError && memorialPets && memorialPets.length > 0) {
                    // 각 반려동물의 미디어 수 확인
                    for (const pet of memorialPets) {
                        try {
                            // 기념일 체크 함수
                            type SpecialDayType = "birthday" | "adoption_100" | "adoption_yearly" | "memorial_100" | "memorial_yearly" | null;

                            const checkSpecialDay = (): { type: SpecialDayType; days: number; years: number } => {
                                const today = albumKstNow;
                                const todayMm = String(today.getUTCMonth() + 1).padStart(2, "0");
                                const todayDd = String(today.getUTCDate()).padStart(2, "0");
                                const todayMmDd = `${todayMm}-${todayDd}`;

                                // 생일 체크
                                if (pet.birthday) {
                                    const bday = new Date(pet.birthday);
                                    const bdayMm = String(bday.getMonth() + 1).padStart(2, "0");
                                    const bdayDd = String(bday.getDate()).padStart(2, "0");
                                    if (`${bdayMm}-${bdayDd}` === todayMmDd) {
                                        return { type: "birthday", days: 0, years: 0 };
                                    }
                                }

                                // 입양일 기념일 체크
                                if (pet.adopted_date) {
                                    const adopted = new Date(pet.adopted_date);
                                    const diffDays = Math.floor((today.getTime() - adopted.getTime()) / (1000 * 60 * 60 * 24));
                                    // 100일 단위 (100, 200, 300, ...)
                                    if (diffDays > 0 && diffDays % 100 === 0) {
                                        return { type: "adoption_100", days: diffDays, years: 0 };
                                    }
                                    // 연도 기념일 (같은 MM-DD + 365일 이상)
                                    const adoptedMm = String(adopted.getMonth() + 1).padStart(2, "0");
                                    const adoptedDd = String(adopted.getDate()).padStart(2, "0");
                                    if (`${adoptedMm}-${adoptedDd}` === todayMmDd && diffDays >= 365) {
                                        const years = Math.floor(diffDays / 365);
                                        return { type: "adoption_yearly", days: diffDays, years };
                                    }
                                }

                                // 추모일 기념일 체크
                                if (pet.memorial_date) {
                                    const memorial = new Date(pet.memorial_date);
                                    const diffDays = Math.floor((today.getTime() - memorial.getTime()) / (1000 * 60 * 60 * 24));
                                    // 100일 단위
                                    if (diffDays > 0 && diffDays % 100 === 0) {
                                        return { type: "memorial_100", days: diffDays, years: 0 };
                                    }
                                    // 연도 기념일
                                    const memorialMm = String(memorial.getMonth() + 1).padStart(2, "0");
                                    const memorialDd = String(memorial.getDate()).padStart(2, "0");
                                    if (`${memorialMm}-${memorialDd}` === todayMmDd && diffDays >= 365) {
                                        const years = Math.floor(diffDays / 365);
                                        return { type: "memorial_yearly", days: diffDays, years };
                                    }
                                }

                                return { type: null, days: 0, years: 0 };
                            };

                            const specialDay = checkSpecialDay();
                            const isSpecialDay = specialDay.type !== null;

                            // 매월 1일도 아니고 기념일도 아니면 스킵
                            if (!isFirstDayOfMonth && !isSpecialDay) continue;

                            const { count: mediaCount } = await supabase
                                .from("pet_media")
                                .select("id", { count: "exact", head: true })
                                .eq("pet_id", pet.id);

                            if (!mediaCount || mediaCount < 3) continue;

                            // 최근 30일간 사용된 media_ids 수집 (중복 방지)
                            const thirtyDaysAgo = new Date(albumKstNow);
                            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                            const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

                            const { data: recentAlbums } = await supabase
                                .from("memory_albums")
                                .select("media_ids")
                                .eq("pet_id", pet.id)
                                .gte("created_date", thirtyDaysAgoStr);

                            const recentlyUsedIds = new Set<string>();
                            if (recentAlbums) {
                                for (const album of recentAlbums) {
                                    if (album.media_ids && Array.isArray(album.media_ids)) {
                                        for (const mid of album.media_ids) {
                                            recentlyUsedIds.add(mid);
                                        }
                                    }
                                }
                            }

                            let chosenConcept: "anniversary" | "mood" | "random" | "birthday" | "adoption" | "memorial" | null = null;
                            let chosenTitle = "";
                            let chosenMediaIds: string[] = [];

                            // --- 기념일 특별 앨범 (최우선) ---
                            if (isSpecialDay && specialDay.type) {
                                // 기념일 관련 사진 수집 (랜덤 5-10장)
                                const { data: allMedia } = await supabase
                                    .from("pet_media")
                                    .select("id")
                                    .eq("pet_id", pet.id);

                                if (allMedia && allMedia.length >= 3) {
                                    const filtered = allMedia.filter((m) => !recentlyUsedIds.has(m.id));
                                    if (filtered.length >= 3) {
                                        const shuffled = filtered.sort(() => Math.random() - 0.5);
                                        const pickCount = Math.min(
                                            Math.max(5, Math.floor(Math.random() * 6) + 5),
                                            shuffled.length,
                                        );
                                        chosenMediaIds = shuffled.slice(0, pickCount).map((m) => m.id);

                                        // 기념일 타입별 컨셉과 제목
                                        switch (specialDay.type) {
                                            case "birthday":
                                                chosenConcept = "birthday";
                                                chosenTitle = `${pet.name}의 생일 추억 앨범`;
                                                break;
                                            case "adoption_100":
                                                chosenConcept = "adoption";
                                                chosenTitle = `${pet.name}과(와) 함께한 ${specialDay.days}일`;
                                                break;
                                            case "adoption_yearly":
                                                chosenConcept = "adoption";
                                                chosenTitle = `${pet.name}과(와) 함께한 ${specialDay.years}년`;
                                                break;
                                            case "memorial_100":
                                                chosenConcept = "memorial";
                                                chosenTitle = `${pet.name}을(를) 추억하며 - ${specialDay.days}일`;
                                                break;
                                            case "memorial_yearly":
                                                chosenConcept = "memorial";
                                                chosenTitle = `${pet.name}을(를) 추억하며 - ${specialDay.years}년`;
                                                break;
                                        }
                                    }
                                }
                            }

                            // --- 매월 1일 정기 앨범 (기념일 앨범이 없을 때만) ---
                            const currentYear = albumKstNow.getUTCFullYear();

                            if (isFirstDayOfMonth && !chosenConcept) {
                                // --- Concept 1: anniversary ---
                                // 과거 연도의 같은 MM-DD에 촬영된 사진
                                const { data: anniversaryMedia } = await supabase
                                    .from("pet_media")
                                    .select("id, date")
                                    .eq("pet_id", pet.id)
                                    .like("date", `%-${albumKstMmDd}`);

                                if (anniversaryMedia && anniversaryMedia.length > 0) {
                                    // 현재 연도 제외, 최근 30일 사용분 제외
                                    const filtered = anniversaryMedia.filter((m) => {
                                        if (!m.date) return false;
                                        const year = parseInt(m.date.slice(0, 4), 10);
                                        if (year === currentYear) return false;
                                        if (recentlyUsedIds.has(m.id)) return false;
                                        return true;
                                    });

                                    if (filtered.length >= 3) {
                                        const yearsAgo = currentYear - parseInt(filtered[0].date!.slice(0, 4), 10);
                                        chosenConcept = "anniversary";
                                        chosenTitle = `${pet.name}와(과) ${yearsAgo}년 전 오늘`;
                                        chosenMediaIds = filtered.slice(0, 10).map((m) => m.id);
                                    }
                                }

                                // --- Concept 2: mood (happy) ---
                                if (!chosenConcept) {
                                    // 행복한 기분의 타임라인에 연결된 날짜의 사진
                                    const { data: happyEntries } = await supabase
                                        .from("timeline_entries")
                                        .select("date")
                                        .eq("pet_id", pet.id)
                                        .eq("mood", "happy")
                                        .order("date", { ascending: false })
                                        .limit(30);

                                    if (happyEntries && happyEntries.length > 0) {
                                        const happyDates = happyEntries.map((e) => e.date);
                                        const { data: happyMedia } = await supabase
                                            .from("pet_media")
                                            .select("id")
                                            .eq("pet_id", pet.id)
                                            .in("date", happyDates);

                                        if (happyMedia && happyMedia.length > 0) {
                                            const filtered = happyMedia.filter((m) => !recentlyUsedIds.has(m.id));
                                            if (filtered.length >= 3) {
                                                chosenConcept = "mood";
                                                chosenTitle = `${pet.name}의 행복했던 순간들`;
                                                chosenMediaIds = filtered.slice(0, 10).map((m) => m.id);
                                            }
                                        }
                                    }
                                }

                                // --- Concept 3: random ---
                                if (!chosenConcept) {
                                    const { data: allMedia } = await supabase
                                        .from("pet_media")
                                        .select("id")
                                        .eq("pet_id", pet.id);

                                    if (allMedia && allMedia.length >= 3) {
                                        const filtered = allMedia.filter((m) => !recentlyUsedIds.has(m.id));
                                        if (filtered.length >= 3) {
                                            // 셔플 후 5~10장 선택
                                            const shuffled = filtered.sort(() => Math.random() - 0.5);
                                            const pickCount = Math.min(
                                                Math.max(5, Math.floor(Math.random() * 6) + 5),
                                                shuffled.length,
                                            );
                                            chosenConcept = "random";
                                            chosenTitle = `${pet.name}와(과)의 추억 한 조각`;
                                            chosenMediaIds = shuffled.slice(0, pickCount).map((m) => m.id);
                                        }
                                    }
                                }
                            }

                            // 앨범 생성
                            if (chosenConcept && chosenMediaIds.length >= 3) {
                                const { data: insertedAlbum, error: insertError } = await supabase
                                    .from("memory_albums")
                                    .insert({
                                        pet_id: pet.id,
                                        user_id: pet.user_id,
                                        concept: chosenConcept,
                                        title: chosenTitle,
                                        media_ids: chosenMediaIds,
                                        created_date: albumKstDateStr,
                                    })
                                    .select("id")
                                    .single();

                                // ON CONFLICT 대응: upsert 대신 insert 후 에러 무시 (중복이면 23505)
                                if (insertError) {
                                    // unique_violation (이미 오늘 앨범 존재) -> 무시
                                    if (insertError.code === "23505") {
                                        // 이미 오늘 앨범이 있으므로 스킵
                                    } else {
                                        console.error(`[Cron] 추억 앨범 생성 실패 (${pet.name}):`, insertError.message);
                                    }
                                    continue;
                                }

                                if (insertedAlbum) {
                                    albumCreatedCount++;

                                    // 해당 유저에게 푸시 발송
                                    const { data: albumSubs } = await supabase
                                        .from("push_subscriptions")
                                        .select("user_id, endpoint, p256dh, auth")
                                        .eq("user_id", pet.user_id);

                                    if (albumSubs) {
                                        for (const sub of albumSubs) {
                                            const result = await sendPush(sub, {
                                                title: `${pet.name}와(과)의 추억 앨범`,
                                                body: `${pet.name}와(과)의 소중한 기억이 도착했어요.`,
                                                url: `/?tab=record&album=${insertedAlbum.id}`,
                                            });
                                            if (result === "expired") {
                                                expiredEndpoints.push(sub.endpoint);
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (petErr) {
                            console.error(`[Cron] 추억 앨범 처리 오류 (${pet.name}):`, petErr instanceof Error ? petErr.message : "unknown");
                        }
                    }
                }
            }
        } catch (albumErr) {
            // 추억 앨범 실패해도 AI 인사말은 계속 진행
            console.error("[Cron] 추억 앨범 오류:", albumErr instanceof Error ? albumErr.message : "unknown");
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
                .select("id, user_id, name, type, breed, status, gender, birthday, adopted_date, memorial_date, special_habits, favorite_food, favorite_activity, nicknames")
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
            timelinePush: { sent: timelinePushSent },
            memoryAlbum: { created: albumCreatedCount },
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
