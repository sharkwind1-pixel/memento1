/**
 * 미니미 되팔기 API
 * POST: 보유한 캐릭터를 되팔기
 * RPC 시도 → 없으면 다단계 폴백
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

        if (type !== "character") {
            return NextResponse.json({ error: "잘못된 아이템 유형입니다" }, { status: 400 });
        }

        const supabase = await createServerSupabase();

        // 캐릭터 검증
        const character = CHARACTER_CATALOG.find(c => c.slug === itemSlug);
        if (!character) {
            return NextResponse.json({ error: "존재하지 않는 캐릭터입니다" }, { status: 400 });
        }
        const itemName = character.name;
        const resellPrice = Math.ceil(character.price * MINIMI.RESELL_RATIO);

        // RPC 시도
        const { data: rpcData, error: rpcError } = await supabase.rpc("sell_minimi_item", {
            p_user_id: user.id,
            p_minimi_id: itemSlug,
            p_item_name: itemName,
            p_resell_price: resellPrice,
        });

        if (!rpcError && rpcData) {
            if (!rpcData.success) {
                const errMap: Record<string, { msg: string; status: number }> = {
                    not_owned: { msg: "보유하지 않은 캐릭터입니다", status: 400 },
                };
                const err = errMap[rpcData.error] || { msg: "되팔기에 실패했습니다", status: 500 };
                return NextResponse.json({ error: err.msg }, { status: err.status });
            }

            // RPC의 UUID/slug 비교 불일치로 장착 해제가 안 될 수 있음 → 후처리
            const { data: postProfile } = await supabase
                .from("profiles")
                .select("equipped_minimi_id")
                .eq("id", user.id)
                .single();

            if (postProfile?.equipped_minimi_id) {
                const { data: stillExists } = await supabase
                    .from("user_minimi")
                    .select("id")
                    .eq("id", postProfile.equipped_minimi_id)
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (!stillExists) {
                    await supabase
                        .from("profiles")
                        .update({ equipped_minimi_id: null, minimi_pixel_data: null })
                        .eq("id", user.id);
                }
            }

            return NextResponse.json({
                success: true,
                refundedPoints: resellPrice,
                remainingPoints: rpcData.remaining_points,
                message: `${itemName}을(를) ${resellPrice}P에 되팔았습니다`,
            });
        }

        // RPC 없음 → 다단계 폴백
        console.warn("[minimi/sell] RPC unavailable, using fallback:", rpcError?.message);

        // 보유 확인
        const { data: owned } = await supabase
            .from("user_minimi")
            .select("id")
            .eq("user_id", user.id)
            .eq("minimi_id", itemSlug)
            .maybeSingle();

        if (!owned) {
            return NextResponse.json({ error: "보유하지 않은 캐릭터입니다" }, { status: 400 });
        }

        // 장착 중이면 해제 (equipped_minimi_id는 UUID, owned.id와 비교)
        const { data: profile } = await supabase
            .from("profiles")
            .select("equipped_minimi_id, points")
            .eq("id", user.id)
            .single();

        if (profile?.equipped_minimi_id && profile.equipped_minimi_id === owned.id) {
            await supabase.from("profiles")
                .update({ equipped_minimi_id: null, minimi_pixel_data: null })
                .eq("id", user.id);
        }

        // 아이템 삭제
        const { error: deleteError } = await supabase
            .from("user_minimi")
            .delete()
            .eq("user_id", user.id)
            .eq("minimi_id", itemSlug);

        if (deleteError) {
            return NextResponse.json({ error: "아이템 삭제에 실패했습니다" }, { status: 500 });
        }

        // 포인트 환급
        const newPoints = (profile?.points || 0) + resellPrice;
        await supabase.from("profiles").update({ points: newPoints }).eq("id", user.id);

        // 거래 내역 (실패해도 무시)
        try {
            await supabase.from("point_transactions").insert({
                user_id: user.id,
                action_type: "minimi_sell",
                points_earned: resellPrice,
                metadata: { itemSlug, itemName },
            });
        } catch { /* 무시 */ }

        return NextResponse.json({
            success: true,
            refundedPoints: resellPrice,
            remainingPoints: newPoints,
            message: `${itemName}을(를) ${resellPrice}P에 되팔았습니다`,
        });
    } catch (error) {
        console.error("[minimi/sell] Unexpected error:", error);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
