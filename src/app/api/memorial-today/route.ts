/**
 * 오늘의 기일 API
 * 오늘 날짜(월/일)가 memorial_date와 같은 반려동물 목록 반환
 * 프라이버시: 이름, 종류, 프로필 이미지, 기일 연도만 노출 (사용자 정보 비공개)
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_CONFIG_MISSING");
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export async function GET() {
    try {
        const supabase = getServiceSupabase();

        // KST 기준 오늘 날짜
        const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
        const month = kstNow.getUTCMonth() + 1; // 1~12
        const day = kstNow.getUTCDate();

        // memorial_date의 월/일이 오늘과 같은 memorial 상태 펫 조회
        // PostgreSQL: EXTRACT(MONTH FROM memorial_date) = month AND EXTRACT(DAY FROM memorial_date) = day
        const { data: todayPets, error } = await supabase
            .from("pets")
            .select("id, name, type, breed, profile_image, memorial_date, created_at")
            .eq("status", "memorial")
            .not("memorial_date", "is", null)
            .order("memorial_date", { ascending: true })
            .limit(100);

        if (error) {
            console.error("[memorial-today] DB 오류:", error.message);
            return NextResponse.json({ pets: [] });
        }

        // 클라이언트에서 월/일 필터 (Supabase에서 EXTRACT 직접 사용 불가)
        const filtered = (todayPets || []).filter((pet) => {
            if (!pet.memorial_date) return false;
            const d = new Date(pet.memorial_date + "T00:00:00");
            return d.getMonth() + 1 === month && d.getDate() === day;
        });

        // 프라이버시: user_id 제외, 필요 정보만 반환
        const result = filtered.map((pet) => {
            const memorialYear = pet.memorial_date
                ? new Date(pet.memorial_date + "T00:00:00").getFullYear()
                : null;
            const yearsAgo = memorialYear
                ? kstNow.getUTCFullYear() - memorialYear
                : null;

            return {
                id: pet.id,
                name: pet.name,
                type: pet.type || "",
                breed: pet.breed || "",
                profileImage: pet.profile_image || null,
                memorialDate: pet.memorial_date,
                yearsAgo,
                yearsLabel: yearsAgo === 0
                    ? "올해"
                    : yearsAgo === 1
                        ? "1주기"
                        : yearsAgo
                            ? `${yearsAgo}주기`
                            : "",
            };
        });

        // 오늘 기일인 펫이 없으면 → 이번 주 기일인 펫 조회 (범위 확장)
        if (result.length === 0) {
            const weekPets = (todayPets || []).filter((pet) => {
                if (!pet.memorial_date) return false;
                const d = new Date(pet.memorial_date + "T00:00:00");
                const petMonth = d.getMonth() + 1;
                const petDay = d.getDate();
                // 오늘 기준 앞뒤 3일 이내
                const todayOfYear = month * 31 + day;
                const petOfYear = petMonth * 31 + petDay;
                return Math.abs(todayOfYear - petOfYear) <= 3;
            });

            const weekResult = weekPets.map((pet) => {
                const memorialYear = pet.memorial_date
                    ? new Date(pet.memorial_date + "T00:00:00").getFullYear()
                    : null;
                const yearsAgo = memorialYear
                    ? kstNow.getUTCFullYear() - memorialYear
                    : null;

                return {
                    id: pet.id,
                    name: pet.name,
                    type: pet.type || "",
                    breed: pet.breed || "",
                    profileImage: pet.profile_image || null,
                    memorialDate: pet.memorial_date,
                    yearsAgo,
                    yearsLabel: yearsAgo === 0
                        ? "올해"
                        : yearsAgo === 1
                            ? "1주기"
                            : yearsAgo
                                ? `${yearsAgo}주기`
                                : "",
                };
            });

            return NextResponse.json({
                pets: weekResult.slice(0, 20),
                isExactToday: false,
                date: `${month}/${day}`,
            });
        }

        return NextResponse.json({
            pets: result.slice(0, 20),
            isExactToday: true,
            date: `${month}/${day}`,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류";
        console.error("[memorial-today] 오류:", message);
        return NextResponse.json({ pets: [], error: message }, { status: 500 });
    }
}
