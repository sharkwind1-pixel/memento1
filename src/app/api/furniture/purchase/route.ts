/**
 * 가구/소품 구매 API
 * POST: 가구 구매 (포인트 차감)
 * minimi/purchase와 동일 패턴
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders, checkVPN, getVPNBlockResponse } from "@/lib/rate-limit";
import { FURNITURE_CATALOG } from "@/data/furnitureCatalog";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        // 1. Rate Limit
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        // 2. VPN 체크
        const vpnResult = await checkVPN(clientIP);
        if (vpnResult.isVPN) {
            const vpnErr = getVPNBlockResponse();
            return NextResponse.json({ error: vpnErr.error }, { status: 403 });
        }

        // 3. 인증
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const body = await request.json();
        const { furnitureSlug } = body;

        if (!furnitureSlug) {
            return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
        }

        // 4. 카탈로그 검증
        const item = FURNITURE_CATALOG.find(f => f.slug === furnitureSlug);
        if (!item) {
            return NextResponse.json({ error: "존재하지 않는 아이템입니다" }, { status: 400 });
        }

        const supabase = createAdminSupabase();

        // 5. 포인트 확인
        const { data: profile } = await supabase
            .from("profiles")
            .select("points")
            .eq("id", user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: "사용자 정보를 찾을 수 없습니다" }, { status: 400 });
        }

        if (profile.points < item.price) {
            return NextResponse.json({ error: "포인트가 부족합니다" }, { status: 400 });
        }

        // 6. RPC로 원자적 구매 처리
        const { data: rpcResult, error: rpcError } = await supabase
            .rpc("purchase_furniture_item", {
                p_user_id: user.id,
                p_furniture_id: furnitureSlug,
                p_item_name: item.name,
                p_item_price: item.price,
            });

        if (rpcError) {
            console.error("[furniture/purchase] RPC failed:", rpcError.message);
            return NextResponse.json({ error: "구매 처리에 실패했습니다" }, { status: 500 });
        }

        const rpcData = rpcResult as { success: boolean; error?: string; newPoints?: number } | null;
        if (!rpcData?.success) {
            const errorMap: Record<string, string> = {
                user_not_found: "사용자 정보를 찾을 수 없습니다",
                insufficient_points: "포인트가 부족합니다",
            };
            const rawError = rpcData?.error || "";
            return NextResponse.json(
                { error: errorMap[rawError] || "구매 처리에 실패했습니다" },
                { status: 400 }
            );
        }

        const newPoints = rpcData.newPoints ?? (profile.points - item.price);

        return NextResponse.json({
            success: true,
            remainingPoints: newPoints,
            resellPrice: Math.ceil(item.price / 3),
            message: `${item.name}을(를) 구매했습니다!`,
        });
    } catch (error) {
        console.error("[furniture/purchase] Unexpected error:", error);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
