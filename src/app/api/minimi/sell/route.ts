/**
 * 미니미 되팔기 API
 * POST: 보유한 캐릭터를 되팔기
 * RPC 시도 → 없으면 다단계 폴백
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
        // 모바일: { userMinimiId } / 웹 레거시: { type, itemSlug }
        const { userMinimiId, type, itemSlug } = body;

        if (!userMinimiId && (!type || !itemSlug)) {
            return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
        }

        const supabase = createAdminSupabase();

        // 모바일 경로: UUID로 행 확인 후 slug 추출 → 기존 RPC 재사용
        if (userMinimiId) {
            const { data: row } = await supabase
                .from("user_minimi")
                .select("id, minimi_id, purchase_price")
                .eq("id", userMinimiId)
                .eq("user_id", user.id)
                .maybeSingle();

            if (!row) {
                return NextResponse.json({ error: "보유하지 않은 캐릭터입니다" }, { status: 400 });
            }

            const character = CHARACTER_CATALOG.find(c => c.slug === row.minimi_id);
            const itemName = character?.name ?? row.minimi_id;
            const resellPrice = Math.ceil((character?.price ?? row.purchase_price) * MINIMI.RESELL_RATIO);

            // sell_minimi_item RPC: 가장 오래된 복사본 1개 삭제 + 포인트 환급 (원자적)
            const { data: rpcResult } = await supabase.rpc("sell_minimi_item", {
                p_user_id: user.id,
                p_minimi_id: row.minimi_id,
                p_item_name: itemName,
                p_resell_price: resellPrice,
            });

            if (!rpcResult?.success) {
                return NextResponse.json({ error: "판매 처리에 실패했습니다" }, { status: 500 });
            }

            await removeSoldFromPlacedMinimi(supabase, user.id, row.minimi_id);

            return NextResponse.json({
                success: true,
                refundedPoints: resellPrice,
                remainingPoints: rpcResult.remaining_points,
                message: `${itemName}을(를) ${resellPrice}P에 되팔았습니다`,
            });
        }

        if (type !== "character") {
            return NextResponse.json({ error: "잘못된 아이템 유형입니다" }, { status: 400 });
        }

        const character = CHARACTER_CATALOG.find(c => c.slug === itemSlug);
        if (!character) {
            return NextResponse.json({ error: "존재하지 않는 캐릭터입니다" }, { status: 400 });
        }
        const itemName = character.name;
        const resellPrice = Math.ceil(character.price * MINIMI.RESELL_RATIO);

        // RPC 시도 (복사본 1개만 삭제하도록 마이그레이션에서 수정됨)
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

            // 방어선(defense-in-depth): RPC가 삭제된 복사본 = 장착 복사본일 때 이미 해제하지만,
            // 혹시 남은 dangling equip(존재하지 않는 user_minimi 참조)이 있으면 여기서도 정리.
            // (RPC unequip 비교는 20260604_fix_sell_minimi_unequip.sql 에서 v_delete_id::text 로 교정됨)
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

            // 스테이지 배치에서도 제거
            await removeSoldFromPlacedMinimi(supabase, user.id, itemSlug);

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

        if (!profile) {
            return NextResponse.json({ error: "사용자 정보를 찾을 수 없습니다" }, { status: 400 });
        }

        if (profile.equipped_minimi_id && profile.equipped_minimi_id === owned.id) {
            await supabase.from("profiles")
                .update({ equipped_minimi_id: null, minimi_pixel_data: null })
                .eq("id", user.id);
        }

        // 아이템 삭제 (원자적 - 레이스 컨디션 방지)
        const { data: deleted, error: deleteError } = await supabase
            .from("user_minimi")
            .delete()
            .eq("user_id", user.id)
            .eq("minimi_id", itemSlug)
            .select("id")
            .single();  // 삭제된 행이 없으면 에러 발생 → 중복 요청 방지

        if (deleteError || !deleted) {
            // 이미 삭제됨 (동시 요청) 또는 오류
            return NextResponse.json({ error: "아이템 삭제에 실패했습니다" }, { status: 400 });
        }

        // 포인트 환급 (원자적 증가)
        const { data: updatedProfile, error: pointError } = await supabase
            .from("profiles")
            .update({ points: (profile?.points || 0) + resellPrice })
            .eq("id", user.id)
            .select("points")
            .single();

        const newPoints = updatedProfile?.points ?? ((profile?.points || 0) + resellPrice);
        if (pointError) {
            console.error("[minimi/sell] Point update failed:", pointError.message);
        }

        // 거래 내역 (실패해도 무시)
        try {
            await supabase.from("point_transactions").insert({
                user_id: user.id,
                action_type: "minimi_sell",
                points_earned: resellPrice,
                metadata: { itemSlug, itemName },
            });
        } catch { /* 무시 */ }

        // 스테이지 배치에서도 제거
        await removeSoldFromPlacedMinimi(supabase, user.id, itemSlug);

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

async function removeSoldFromPlacedMinimi(supabase: any, userId: string, slug: string) {
    try {
        const { data: settings } = await supabase
            .from("minihompy_settings")
            .select("placed_minimi")
            .eq("user_id", userId)
            .maybeSingle();

        if (!settings?.placed_minimi || !Array.isArray(settings.placed_minimi)) return;

        // 복사본 1개만 제거 (판매된 1개에 대응)
        let removed = false;
        const filtered = settings.placed_minimi.filter((item: { slug: string }) => {
            if (!removed && item.slug === slug) { removed = true; return false; }
            return true;
        });

        if (filtered.length !== settings.placed_minimi.length) {
            await supabase
                .from("minihompy_settings")
                .update({ placed_minimi: filtered })
                .eq("user_id", userId);
        }
    } catch {
        // 배치 정리 실패는 무시 (핵심 로직 아님)
    }
}
