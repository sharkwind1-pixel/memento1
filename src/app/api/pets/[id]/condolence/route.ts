/**
 * 추모 펫 위로 리액션 API
 * POST: 위로 토글 (추가/취소)
 *
 * 보안: 세션 기반 인증, Rate Limiting, VPN 차단
 * 포인트 적립 없음 (추모 맥락에 부적절)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import {
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
    checkVPN,
    getVPNBlockResponse,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Rate Limit 체크
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        // 2. VPN 체크
        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            console.warn(`[Security] VPN blocked on condolence: ${clientIP} - ${vpnCheck.reason}`);
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 3. 세션 기반 인증
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const supabase = await createServerSupabase();
        const { id: petId } = await params;
        const userId = user.id;

        // 4. 해당 펫이 추모 상태인지 확인
        const { data: pet } = await supabase
            .from("pets")
            .select("id, status")
            .eq("id", petId)
            .single();

        if (!pet) {
            return NextResponse.json({ error: "존재하지 않는 반려동물입니다" }, { status: 404 });
        }

        if (pet.status !== "memorial") {
            return NextResponse.json({ error: "추모 상태의 반려동물만 위로할 수 있습니다" }, { status: 400 });
        }

        // 5. 이미 위로했는지 확인
        const { data: existing } = await supabase
            .from("pet_condolences")
            .select("id")
            .eq("pet_id", petId)
            .eq("user_id", userId)
            .single();

        let condoled: boolean;

        if (existing) {
            // 위로 취소: 레코드 삭제
            await supabase
                .from("pet_condolences")
                .delete()
                .eq("pet_id", petId)
                .eq("user_id", userId);

            condoled = false;
        } else {
            // 위로 추가: 레코드 삽입
            await supabase
                .from("pet_condolences")
                .insert([{ pet_id: petId, user_id: userId }]);

            condoled = true;
        }

        // 6. 실제 카운트 집계
        const { count } = await supabase
            .from("pet_condolences")
            .select("id", { count: "exact", head: true })
            .eq("pet_id", petId);

        return NextResponse.json({
            condoled,
            count: count || 0,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
