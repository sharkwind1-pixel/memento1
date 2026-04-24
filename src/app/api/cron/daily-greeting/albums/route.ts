/**
 * Phase 4: 추모 반려동물 추억 앨범 자동 생성
 *
 * 매일 09시(KST)에 실행.
 * - 매주 월요일: 정기 주간 앨범 (anniversary/mood/random 컨셉)
 * - 기념일: 생일, 입양 100일/연도, 추모 100일/연도 특별 앨범
 * 커서 기반 페이지네이션으로 대량 처리.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import {
    verifyCronSecret,
    getServiceSupabase,
    setupVapid,
    getKstTime,
    sendPushBatch,
    cleanupExpiredSubscriptions,
    fetchSubsForUsers,
    PAGE_SIZE,
    type KstTime,
} from "@/lib/cron-utils";

// ===== 유틸 =====

/**
 * Fisher-Yates 균등 분포 셔플.
 * `arr.sort(() => Math.random() - 0.5)`는 V8 TimSort 특성상 편향된 분포를 만듦
 * (작은 배열에서 특정 인덱스가 유의미하게 자주 선택됨). 이 함수는 각 순열의
 * 확률이 1/n!로 균등함이 수학적으로 보장됨.
 */
function fisherYatesShuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// ===== 기념일 타입 =====

type SpecialDayType = "birthday" | "adoption_100" | "adoption_yearly" | "memorial_100" | "memorial_yearly" | null;

interface SpecialDayResult {
    type: SpecialDayType;
    days: number;
    years: number;
}

interface MemorialPet {
    id: string;
    user_id: string;
    name: string;
    birthday: string | null;
    adopted_date: string | null;
    memorial_date: string | null;
}

function checkSpecialDay(pet: MemorialPet, kst: KstTime): SpecialDayResult {
    const todayMm = String(kst.now.getUTCMonth() + 1).padStart(2, "0");
    const todayDd = String(kst.now.getUTCDate()).padStart(2, "0");
    const todayMmDd = `${todayMm}-${todayDd}`;

    if (pet.birthday) {
        const bday = new Date(pet.birthday);
        const mm = String(bday.getMonth() + 1).padStart(2, "0");
        const dd = String(bday.getDate()).padStart(2, "0");
        if (`${mm}-${dd}` === todayMmDd) {
            return { type: "birthday", days: 0, years: 0 };
        }
    }

    if (pet.adopted_date) {
        const adopted = new Date(pet.adopted_date);
        const diffDays = Math.floor((kst.now.getTime() - adopted.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0 && diffDays % 100 === 0) {
            return { type: "adoption_100", days: diffDays, years: 0 };
        }
        const aMm = String(adopted.getMonth() + 1).padStart(2, "0");
        const aDd = String(adopted.getDate()).padStart(2, "0");
        if (`${aMm}-${aDd}` === todayMmDd && diffDays >= 365) {
            return { type: "adoption_yearly", days: diffDays, years: Math.floor(diffDays / 365) };
        }
    }

    if (pet.memorial_date) {
        const memorial = new Date(pet.memorial_date);
        const diffDays = Math.floor((kst.now.getTime() - memorial.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0 && diffDays % 100 === 0) {
            return { type: "memorial_100", days: diffDays, years: 0 };
        }
        const mMm = String(memorial.getMonth() + 1).padStart(2, "0");
        const mDd = String(memorial.getDate()).padStart(2, "0");
        if (`${mMm}-${mDd}` === todayMmDd && diffDays >= 365) {
            return { type: "memorial_yearly", days: diffDays, years: Math.floor(diffDays / 365) };
        }
    }

    return { type: null, days: 0, years: 0 };
}

function getAlbumTitleAndConcept(
    pet: MemorialPet,
    special: SpecialDayResult,
): { concept: string; title: string } | null {
    switch (special.type) {
        case "birthday":
            return { concept: "birthday", title: `${pet.name}의 생일 추억 앨범` };
        case "adoption_100":
            return { concept: "adoption", title: `${pet.name}과(와) 함께한 ${special.days}일` };
        case "adoption_yearly":
            return { concept: "adoption", title: `${pet.name}과(와) 함께한 ${special.years}년` };
        case "memorial_100":
            return { concept: "memorial", title: `${pet.name}을(를) 추억하며 - ${special.days}일` };
        case "memorial_yearly":
            return { concept: "memorial", title: `${pet.name}을(를) 추억하며 - ${special.years}년` };
        default:
            return null;
    }
}

export async function GET(request: NextRequest) {
    const authErr = verifyCronSecret(request);
    if (authErr) return authErr;

    const kst = getKstTime();

    // 09시(KST)에만 실행
    if (kst.hour !== 9) {
        return NextResponse.json({
            phase: "albums",
            skipped: true,
            reason: `현재 KST ${kst.hour}시 (09시에만 실행)`,
        });
    }

    try {
        setupVapid();
    } catch {
        return NextResponse.json({ error: "VAPID_NOT_CONFIGURED" }, { status: 500 });
    }

    const supabase = getServiceSupabase();
    // 주 1회 정기 앨범: 매주 월요일 (0=일, 1=월)
    const isWeeklyAlbumDay = kst.dayOfWeek === 1;

    let albumCreated = 0;
    let pushSent = 0;
    const allExpiredEndpoints: string[] = [];

    // 커서 기반: pets.id 기준
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
        let query = supabase
            .from("pets")
            .select("id, user_id, name, birthday, adopted_date, memorial_date")
            .eq("status", "memorial")
            .order("id", { ascending: true })
            .limit(PAGE_SIZE);

        if (cursor) {
            query = query.gt("id", cursor);
        }

        const { data: pets, error } = await query;

        if (error) {
            console.error("[Cron/Albums] 추모 펫 조회 실패:", error.message);
            break;
        }

        if (!pets || pets.length === 0) {
            hasMore = false;
            break;
        }

        cursor = pets[pets.length - 1].id;
        if (pets.length < PAGE_SIZE) hasMore = false;

        // 각 펫 처리
        for (const pet of pets as MemorialPet[]) {
            try {
                const special = checkSpecialDay(pet, kst);
                const isSpecialDay = special.type !== null;

                // 주간 앨범일도 아니고 기념일도 아니면 스킵
                if (!isWeeklyAlbumDay && !isSpecialDay) continue;

                // 사진 3장 이상인지 확인
                const { count: mediaCount } = await supabase
                    .from("pet_media")
                    .select("id", { count: "exact", head: true })
                    .eq("pet_id", pet.id);

                if (!mediaCount || mediaCount < 3) continue;

                // 사진 중복 허용 (사진이 적은 유저도 매주 앨범 받을 수 있도록)

                let chosenConcept: string | null = null;
                let chosenTitle = "";
                let chosenMediaIds: string[] = [];

                // --- 기념일 특별 앨범 ---
                if (isSpecialDay) {
                    const tc = getAlbumTitleAndConcept(pet, special);
                    if (tc) {
                        const { data: allMedia } = await supabase
                            .from("pet_media")
                            .select("id")
                            .eq("pet_id", pet.id);

                        if (allMedia && allMedia.length >= 3) {
                            const filtered = allMedia;
                            if (filtered.length >= 3) {
                                const shuffled = fisherYatesShuffle(filtered);
                                const pickCount = Math.min(
                                    Math.max(5, Math.floor(Math.random() * 6) + 5),
                                    shuffled.length,
                                );
                                chosenMediaIds = shuffled.slice(0, pickCount).map((m) => m.id);
                                chosenConcept = tc.concept;
                                chosenTitle = tc.title;
                            }
                        }
                    }
                }

                // --- 주간 정기 앨범 (기념일 앨범이 없을 때) ---
                if (isWeeklyAlbumDay && !chosenConcept) {
                    // Concept 1: anniversary (같은 MM-DD, 과거 연도)
                    const { data: anniversaryMedia } = await supabase
                        .from("pet_media")
                        .select("id, date")
                        .eq("pet_id", pet.id)
                        .like("date", `%-${kst.mmDd}`);

                    if (anniversaryMedia && anniversaryMedia.length > 0) {
                        const filtered = anniversaryMedia.filter((m) => {
                            if (!m.date) return false;
                            const year = parseInt(m.date.slice(0, 4), 10);
                            if (year === kst.year) return false;
                            return true;
                        });

                        if (filtered.length >= 3) {
                            const yearsAgo = kst.year - parseInt(filtered[0].date!.slice(0, 4), 10);
                            chosenConcept = "anniversary";
                            chosenTitle = `${pet.name}와(과) ${yearsAgo}년 전 오늘`;
                            chosenMediaIds = filtered.slice(0, 10).map((m) => m.id);
                        }
                    }

                    // Concept 2: mood (happy 타임라인 연결)
                    if (!chosenConcept) {
                        const { data: happyEntries } = await supabase
                            .from("timeline_entries")
                            .select("date")
                            .eq("pet_id", pet.id)
                            .eq("mood", "happy")
                            .order("date", { ascending: false })
                            .limit(30);

                        if (happyEntries && happyEntries.length > 0) {
                            const happyDates = happyEntries.map((e) => e.date);
                            // 날짜 배열을 MAX_IN_IDS씩 나눠서 조회
                            const allHappyMedia: { id: string }[] = [];
                            for (let i = 0; i < happyDates.length; i += 200) {
                                const chunk = happyDates.slice(i, i + 200);
                                const { data: hm } = await supabase
                                    .from("pet_media")
                                    .select("id")
                                    .eq("pet_id", pet.id)
                                    .in("date", chunk);
                                if (hm) allHappyMedia.push(...hm);
                            }

                            const filtered = allHappyMedia;
                            if (filtered.length >= 3) {
                                chosenConcept = "mood";
                                chosenTitle = `${pet.name}의 행복했던 순간들`;
                                chosenMediaIds = filtered.slice(0, 10).map((m) => m.id);
                            }
                        }
                    }

                    // Concept 3: random
                    if (!chosenConcept) {
                        const { data: allMedia } = await supabase
                            .from("pet_media")
                            .select("id")
                            .eq("pet_id", pet.id);

                        if (allMedia && allMedia.length >= 3) {
                            const filtered = allMedia;
                            if (filtered.length >= 3) {
                                const shuffled = fisherYatesShuffle(filtered);
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
                            created_date: kst.dateStr,
                        })
                        .select("id")
                        .single();

                    if (insertError) {
                        // 23505 = unique_violation (이미 오늘 앨범 존재)
                        if (insertError.code !== "23505") {
                            console.error(`[Cron/Albums] 앨범 생성 실패 (${pet.name}):`, insertError.message);
                        }
                        continue;
                    }

                    if (insertedAlbum) {
                        albumCreated++;

                        // 유저에게 푸시 발송
                        const subsMap = await fetchSubsForUsers(supabase, [pet.user_id]);
                        const subs = subsMap.get(pet.user_id) || [];
                        const pushItems = subs.map((sub) => ({
                            sub,
                            payload: {
                                title: `${pet.name}와(과)의 추억 앨범`,
                                body: `${pet.name}와(과)의 소중한 기억이 도착했어요.`,
                                url: `/?tab=record&album=${insertedAlbum.id}`,
                            },
                        }));

                        const result = await sendPushBatch(pushItems);
                        pushSent += result.sent;
                        allExpiredEndpoints.push(...result.expiredEndpoints);
                    }
                }
            } catch (petErr) {
                console.error(`[Cron/Albums] 펫 처리 오류 (${pet.name}):`, petErr instanceof Error ? petErr.message : "unknown");
            }
        }
    }

    const expiredCleaned = await cleanupExpiredSubscriptions(supabase, allExpiredEndpoints);

    return NextResponse.json({
        phase: "albums",
        albumCreated,
        pushSent,
        expiredCleaned,
    });
}
