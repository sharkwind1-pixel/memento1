/**
 * 미니미 구매 API
 * POST: 캐릭터 구매
 * RPC가 아직 DB에 없으므로 다단계 방식으로 처리 (RPC 활성화 후 전환)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
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

        // 2. 인증
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

        const supabase = await createServerSupabase();

        // 4. RPC 시도 → 실패 시 다단계 폴백
        const { data: rpcData, error: rpcError } = await supabase.rpc("purchase_minimi_item", {
            p_user_id: user.id,
            p_minimi_id: itemSlug,
            p_item_name: itemName,
            p_item_price: itemPrice,
        });

        if (!rpcError && rpcData) {
            // RPC 성공
            if (!rpcData.success) {
                const errMap: Record<string, { msg: string; status: number }> = {
                    already_owned: { msg: "이미 보유한 캐릭터입니다", status: 400 },
                    user_not_found: { msg: "사용자 정보를 찾을 수 없습니다", status: 400 },
                    insufficient_points: { msg: "포인트가 부족합니다", status: 400 },
                };
                const err = errMap[rpcData.error] || { msg: "구매에 실패했습니다", status: 500 };
                return NextResponse.json({ error: err.msg }, { status: err.status });
            }
            return NextResponse.json({
                success: true,
                remainingPoints: rpcData.remaining_points,
                resellPrice: Math.ceil(itemPrice * MINIMI.RESELL_RATIO),
                message: `${itemName}을(를) 구매했습니다!`,
            });
        }

        // RPC 없음 → 다단계 폴백
        console.warn("[minimi/purchase] RPC unavailable, using fallback:", rpcError?.message);

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

        // 4c. 포인트 차감
        const newPoints = profile.points - itemPrice;
        const { error: updateError } = await supabase
            .from("profiles")
            .update({ points: newPoints })
            .eq("id", user.id);

        if (updateError) {
            return NextResponse.json({ error: "포인트 차감에 실패했습니다" }, { status: 500 });
        }

        // 4d. 아이템 추가
        const { error: insertError } = await supabase
            .from("user_minimi")
            .insert({ user_id: user.id, minimi_id: itemSlug, purchase_price: itemPrice });

        if (insertError) {
            // 롤백: 포인트 복구
            await supabase.from("profiles").update({ points: profile.points }).eq("id", user.id);
            return NextResponse.json({ error: "아이템 추가에 실패했습니다" }, { status: 500 });
        }

        // 4e. 거래 내역 기록 (실패해도 구매 자체는 성공)
        try {
            await supabase.from("point_transactions").insert({
                user_id: user.id,
                action_type: "minimi_purchase",
                points_earned: -itemPrice,
                metadata: { itemSlug, itemName },
            });
        } catch { /* 무시 */ }

        return NextResponse.json({
            success: true,
            remainingPoints: newPoints,
            resellPrice: Math.ceil(itemPrice * MINIMI.RESELL_RATIO),
            message: `${itemName}을(를) 구매했습니다!`,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
