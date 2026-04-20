/**
 * 미니미 구매 API
 * POST: 캐릭터 구매
 * RPC가 아직 DB에 없으므로 다단계 방식으로 처리 (RPC 활성화 후 전환)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders, checkVPN, getVPNBlockResponse } from "@/lib/rate-limit";
import { CHARACTER_CATALOG } from "@/data/minimiPixels";
import { MINIMI } from "@/config/constants";

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

        // 2. VPN 체크 (결제 어뷰징 방지)
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
        const { type, itemSlug } = body;

        if (!type || !itemSlug) {
            return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
        }

        // 3. 아이템 검증
        if (type !== "character") {
            return NextResponse.json({ error: "잘못된 아이템 유형입니다" }, { status: 400 });
        }

        const character = CHARACTER_CATALOG.find(c => c.slug === itemSlug);
        if (!character) {
            return NextResponse.json({ error: "존재하지 않는 캐릭터입니다" }, { status: 400 });
        }
        const itemName = character.name;
        const itemPrice = character.price;

        const supabase = createAdminSupabase();

        // 4. 직접 처리 (RPC 불안정으로 폴백 방식 사용)

        // 4a. 중복 구매 체크
        const { data: existing } = await supabase
            .from("user_minimi")
            .select("id")
            .eq("user_id", user.id)
            .eq("minimi_id", itemSlug)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: "이미 보유한 캐릭터입니다" }, { status: 400 });
        }

        // 4b. 포인트 확인
        const { data: profile } = await supabase
            .from("profiles")
            .select("points")
            .eq("id", user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: "사용자 정보를 찾을 수 없습니다" }, { status: 400 });
        }

        if (profile.points < itemPrice) {
            return NextResponse.json({ error: "포인트가 부족합니다" }, { status: 400 });
        }

        // 4c. 포인트 차감 (DB RPC로 원자적 처리 — FOR UPDATE 락)
        const { data: rpcResult, error: rpcError } = await supabase
            .rpc("purchase_minimi_item", {
                p_user_id: user.id,
                p_minimi_id: itemSlug,
                p_item_name: itemName,
                p_item_price: itemPrice,
            });

        if (rpcError) {
            console.error("[minimi/purchase] RPC failed:", rpcError.message);
            return NextResponse.json({ error: "구매 처리에 실패했습니다" }, { status: 500 });
        }

        // RPC 반환: { success, error?, newPoints? }
        const rpcData = rpcResult as { success: boolean; error?: string; newPoints?: number } | null;
        if (!rpcData?.success) {
            const errorMap: Record<string, string> = {
                already_owned: "이미 보유한 아이템입니다",
                user_not_found: "사용자 정보를 찾을 수 없습니다",
                insufficient_points: "포인트가 부족합니다",
            };
            const rawError = rpcData?.error || "";
            // 매핑 안 되는 에러는 서버 로그에 원본 error 기록 (디버깅용)
            if (rawError && !errorMap[rawError]) {
                console.error("[minimi/purchase] RPC unmapped error:", rawError);
            }
            return NextResponse.json(
                { error: errorMap[rawError] || "구매 처리에 실패했습니다", detail: rawError },
                { status: 400 }
            );
        }

        const newPoints = rpcData.newPoints ?? (profile.points - itemPrice);

        // RPC에서 insert + point_transactions까지 모두 원자적으로 처리 완료

        return NextResponse.json({
            success: true,
            remainingPoints: newPoints,
            resellPrice: Math.ceil(itemPrice * MINIMI.RESELL_RATIO),
            message: `${itemName}을(를) 구매했습니다!`,
        });
    } catch (error) {
        console.error("[minimi/purchase] Unexpected error:", error);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
