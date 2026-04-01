/**
 * 마음속에 영원히 API
 * 1) 오늘 추모 모드로 새로 등록된 반려동물
 * 2) 오늘이 함께한 기억의 날(memorial_date 월/일 일치)인 반려동물
 * 프라이버시: 이름, 종류, 프로필 이미지만 노출 (사용자 정보 비공개)
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-server";

export async function GET() {
    try {
        const supabase = createAdminSupabase();

        // KST 기준 오늘 날짜
        const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
        const year = kstNow.getUTCFullYear();
        const month = kstNow.getUTCMonth() + 1;
        const day = kstNow.getUTCDate();
        const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        // 추모 상태 펫 전체 조회
        const { data: memorialPets, error } = await supabase
            .from("pets")
            .select("id, name, type, breed, profile_image, memorial_date, created_at, status")
            .eq("status", "memorial")
            .order("created_at", { ascending: false })
            .limit(200);

        if (error) {
            console.error("[memorial-today] DB:", error.message);
            return NextResponse.json({ pets: [], newlyRegistered: [], remembered: [] });
        }

        const allPets = memorialPets || [];

        // 1) 오늘 추모 모드로 새로 등록된 펫 (created_at이 오늘 KST)
        const newlyRegistered = allPets.filter((pet) => {
            if (!pet.created_at) return false;
            const created = new Date(pet.created_at);
            const createdKST = new Date(created.getTime() + 9 * 60 * 60 * 1000);
            const createdDateStr = `${createdKST.getUTCFullYear()}-${String(createdKST.getUTCMonth() + 1).padStart(2, "0")}-${String(createdKST.getUTCDate()).padStart(2, "0")}`;
            return createdDateStr === todayStr;
        });

        // 2) 오늘이 기억하는 날인 펫 (memorial_date의 월/일이 오늘)
        const remembered = allPets.filter((pet) => {
            if (!pet.memorial_date) return false;
            const d = new Date(pet.memorial_date + "T00:00:00");
            const memMonth = d.getMonth() + 1;
            const memDay = d.getDate();
            // 올해 등록한 건 제외 (이미 newlyRegistered에 포함될 수 있으므로)
            const memYear = d.getFullYear();
            if (memMonth === month && memDay === day && memYear === year) return false;
            return memMonth === month && memDay === day;
        });

        // 중복 제거 (newlyRegistered와 remembered에 같은 펫이 있을 수 있음)
        const seenIds = new Set<string>();
        const combined: typeof allPets = [];

        // 새로 등록된 펫 우선
        for (const pet of newlyRegistered) {
            if (!seenIds.has(pet.id)) {
                seenIds.add(pet.id);
                combined.push(pet);
            }
        }
        // 기억의 날 펫
        for (const pet of remembered) {
            if (!seenIds.has(pet.id)) {
                seenIds.add(pet.id);
                combined.push(pet);
            }
        }

        // 우선순위: 오늘 해당 펫 → 이번 주 → 전체 추모 펫 (최근 등록순)
        let isExactToday = combined.length > 0;
        let finalPets = combined;

        if (combined.length === 0) {
            // 이번 주(앞뒤 3일) 기억의 날 펫
            const weekPets = allPets.filter((pet) => {
                if (!pet.memorial_date) return false;
                const d = new Date(pet.memorial_date + "T00:00:00");
                const petMonth = d.getMonth() + 1;
                const petDay = d.getDate();
                const todayOfYear = month * 31 + day;
                const petOfYear = petMonth * 31 + petDay;
                return Math.abs(todayOfYear - petOfYear) <= 3;
            });

            if (weekPets.length > 0) {
                finalPets = weekPets;
            } else {
                // 이번 주에도 없으면 → 전체 추모 펫 최근 등록순
                finalPets = allPets;
            }
            isExactToday = false;
        }

        // 최종 펫 리스트 (최대 20마리)
        const slicedPets = finalPets.slice(0, 20);

        // 위로(condolence) 카운트 batch 조회
        const petIds = slicedPets.map((p) => p.id);
        let condolenceCounts: Record<string, number> = {};
        if (petIds.length > 0) {
            try {
                const { data: condolenceData } = await supabase
                    .from("pet_condolences")
                    .select("pet_id")
                    .in("pet_id", petIds);

                if (condolenceData) {
                    for (const row of condolenceData) {
                        condolenceCounts[row.pet_id] = (condolenceCounts[row.pet_id] || 0) + 1;
                    }
                }
            } catch {
                // pet_condolences 테이블이 아직 없을 수 있음 — 무시
                condolenceCounts = {};
            }
        }

        // 프라이버시: user_id 제외, 필요 정보만 반환
        const result = slicedPets.map((pet) => {
            const isNew = newlyRegistered.some((np) => np.id === pet.id);
            const memorialYear = pet.memorial_date
                ? new Date(pet.memorial_date + "T00:00:00").getFullYear()
                : null;
            const yearsAgo = memorialYear ? year - memorialYear : null;

            return {
                id: pet.id,
                name: pet.name,
                type: pet.type || "",
                breed: pet.breed || "",
                profileImage: pet.profile_image || null,
                isNewlyRegistered: isNew,
                // 완곡한 표현: "함께한 N년" (기일/주기 대신)
                yearsAgo,
                yearsLabel: isNew
                    ? "새로운 기억"
                    : yearsAgo === null
                        ? ""
                        : yearsAgo <= 0
                            ? "올해의 기억"
                            : yearsAgo === 1
                                ? "함께한 1년"
                                : `함께한 ${yearsAgo}년`,
                condolenceCount: condolenceCounts[pet.id] || 0,
            };
        });

        return NextResponse.json({
            pets: result,
            isExactToday,
            hasNewlyRegistered: newlyRegistered.length > 0,
            hasRemembered: remembered.length > 0,
            date: `${month}/${day}`,
            _debug: {
                totalMemorialPets: allPets.length,
                newlyRegisteredCount: newlyRegistered.length,
                rememberedCount: remembered.length,
                combinedCount: combined.length,
                finalCount: finalPets.length,
                hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류";
        console.error("[memorial-today]:", message);
        return NextResponse.json({ pets: [], error: message }, { status: 500 });
    }
}
