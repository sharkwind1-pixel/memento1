/**
 * 임시 디버그 API - petType 결정 과정을 서버에서 시뮬레이션
 * 문제 해결 후 삭제
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return NextResponse.json({ error: "no service key" });

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    if (!email) return NextResponse.json({ error: "email required" });

    const admin = createClient(url, serviceKey);

    // 1. auth.users에서 user ID 확인
    const { data: { users } } = await admin.auth.admin.listUsers();
    const authUser = users?.find(u =>
        u.email === email ||
        u.identities?.some(i => (i.identity_data as Record<string, unknown>)?.email === email)
    );
    if (!authUser) return NextResponse.json({ error: "user not found in auth" });

    const userId = authUser.id;

    // 2. profiles 조회 (refreshProfile과 동일한 쿼리)
    const profileResult = await admin
        .from("profiles")
        .select("is_admin, is_premium, onboarding_data")
        .eq("id", userId)
        .single();

    // 3. pets 조회 (refreshProfile과 동일한 쿼리)
    const petsResult = await admin
        .from("pets")
        .select("type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    // 4. 모든 pets (디버그)
    const allPetsResult = await admin
        .from("pets")
        .select("id, type, user_id, created_at")
        .eq("user_id", userId);

    // 5. petType 결정 시뮬레이션
    const onboardingData = profileResult.data?.onboarding_data as Record<string, unknown> | null;
    const firstPet = petsResult.data;

    let resolvedPetType = "dog (default)";
    let resolvedBy = "none";

    if (onboardingData?.petType) {
        const pt = onboardingData.petType;
        if (pt === "cat" || pt === "dog" || pt === "other") {
            resolvedPetType = pt as string;
            resolvedBy = "onboarding_data.petType";
        }
    }
    if (resolvedBy === "none" && firstPet?.type) {
        const t = firstPet.type as string;
        if (t === "고양이") { resolvedPetType = "cat"; resolvedBy = "pets.type"; }
        else if (t === "강아지") { resolvedPetType = "dog"; resolvedBy = "pets.type"; }
        else { resolvedPetType = "other"; resolvedBy = "pets.type"; }
    }

    return NextResponse.json({
        authUserId: userId,
        authEmail: authUser.email,
        profile: {
            data: profileResult.data,
            error: profileResult.error?.message,
        },
        firstPet: {
            data: petsResult.data,
            error: petsResult.error?.message,
        },
        allPets: {
            data: allPetsResult.data,
            error: allPetsResult.error?.message,
        },
        simulation: {
            resolvedPetType,
            resolvedBy,
        },
    });
}
