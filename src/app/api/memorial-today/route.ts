/**
 * 마음속에 영원히 API
 * 1) 오늘 추모 모드로 새로 등록된 반려동물
 * 2) 오늘이 함께한 기억의 날(memorial_date 월/일 일치)인 반려동물
 * 프라이버시: 이름, 종류, 프로필 이미지만 노출 (사용자 정보 비공개)
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/** REST API로 pets 테이블 직접 조회 (Supabase JS의 RLS 우회 문제 회피) */
async function fetchMemorialPets(): Promise<Array<{
    id: string; name: string; type: string; breed: string;
    profile_image: string | null; memorial_date: string | null;
    created_at: string; status: string;
}>> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return [];

    const res = await fetch(
        `${url}/rest/v1/pets?status=eq.memorial&select=id,name,type,breed,profile_image,memorial_date,created_at,status&order=created_at.desc&limit=200`,
        {
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
            },
            cache: "no-store",
        }
    );
    if (!res.ok) return [];
    return res.json();
}

export async function GET() {
    try {
        // KST 기준 오늘 날짜
        const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
        const year = kstNow.getUTCFullYear();
        const month = kstNow.getUTCMonth() + 1;
        const day = kstNow.getUTCDate();
        const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        // 추모 상태 펫 전체 조회 (REST API 직접 호출)
        const memorialPets = await fetchMemorialPets();

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

        // 위로(condolence) 카운트 batch 조회 (REST API)
        const petIds = slicedPets.map((p) => p.id);
        let condolenceCounts: Record<string, number> = {};
        if (petIds.length > 0) {
            try {
                const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
                if (url && key) {
                    const inFilter = `(${petIds.join(",")})`;
                    const res = await fetch(
                        `${url}/rest/v1/pet_condolences?pet_id=in.${inFilter}&select=pet_id`,
                        { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }
                    );
                    if (res.ok) {
                        const condolenceData: { pet_id: string }[] = await res.json();
                        for (const row of condolenceData) {
                            condolenceCounts[row.pet_id] = (condolenceCounts[row.pet_id] || 0) + 1;
                        }
                    }
                }
            } catch {
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

        // base64 프로필 이미지를 썸네일(200px)로 축소하여 응답 크기 대폭 감소
        const optimizedResult = await Promise.all(
            result.map(async (pet) => {
                if (!pet.profileImage || !pet.profileImage.startsWith("data:")) return pet;
                try {
                    const sharp = (await import("sharp")).default;
                    const base64Data = pet.profileImage.split(",")[1];
                    const buffer = Buffer.from(base64Data, "base64");
                    const thumbnail = await sharp(buffer)
                        .resize(200, 200, { fit: "cover" })
                        .jpeg({ quality: 60 })
                        .toBuffer();
                    return { ...pet, profileImage: `data:image/jpeg;base64,${thumbnail.toString("base64")}` };
                } catch {
                    return { ...pet, profileImage: null };
                }
            })
        );

        return NextResponse.json({
            pets: optimizedResult,
            isExactToday,
            hasNewlyRegistered: newlyRegistered.length > 0,
            hasRemembered: remembered.length > 0,
            date: `${month}/${day}`,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류";
        console.error("[memorial-today]:", message);
        return NextResponse.json({ pets: [], error: message }, { status: 500 });
    }
}
