/**
 * 현재 로그인한 유저의 petType을 서버에서 결정하여 반환
 * 클라이언트 RLS 문제를 우회하기 위한 서버 API
 */
import { NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";

export async function GET() {
    try {
        const supabase = await createServerSupabase();
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ petType: "dog" }, { status: 401 });
        }

        // 1. profiles에서 onboarding_data 확인
        const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_data")
            .eq("id", user.id)
            .single();

        const obData = profile?.onboarding_data as Record<string, unknown> | null;
        const obPetType = obData?.petType as string | null;
        if (obPetType === "cat" || obPetType === "dog" || obPetType === "other") {
            return NextResponse.json({ petType: obPetType, source: "onboarding" });
        }

        // 2. pets 테이블에서 첫 번째 펫의 type 확인
        const { data: firstPet } = await supabase
            .from("pets")
            .select("type")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (firstPet?.type) {
            const t = firstPet.type as string;
            if (t === "고양이") return NextResponse.json({ petType: "cat", source: "pets" });
            if (t === "강아지") return NextResponse.json({ petType: "dog", source: "pets" });
            return NextResponse.json({ petType: "other", source: "pets" });
        }

        return NextResponse.json({ petType: "dog", source: "default" });
    } catch {
        return NextResponse.json({ petType: "dog", source: "error" }, { status: 500 });
    }
}
