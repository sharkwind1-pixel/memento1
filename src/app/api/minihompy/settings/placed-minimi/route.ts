/**
 * 미니홈피 아이템 배치 API
 * PUT: 스테이지에 배치된 미니미 + 가구 배열 저장
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface PlacedMinimiItem {
    slug: string;
    x: number;
    y: number;
    zIndex: number;
    type?: "minimi" | "furniture";
}

export async function PUT(request: NextRequest) {
    try {
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const body = await request.json();
        const { placedMinimi } = body;

        if (!Array.isArray(placedMinimi)) {
            return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
        }

        // 각 아이템 검증
        for (const item of placedMinimi) {
            if (
                typeof item.slug !== "string" || !item.slug ||
                typeof item.x !== "number" || typeof item.y !== "number" ||
                typeof item.zIndex !== "number"
            ) {
                return NextResponse.json({ error: "잘못된 배치 데이터입니다" }, { status: 400 });
            }
        }

        const supabase = await createServerSupabase();

        // 아이템을 타입별로 분류
        const minimiItems = placedMinimi.filter((i: PlacedMinimiItem) => !i.type || i.type === "minimi");
        const furnitureItems = placedMinimi.filter((i: PlacedMinimiItem) => i.type === "furniture");

        // 보유 미니미 수량 집계
        const { data: ownedMinimi } = await supabase
            .from("user_minimi")
            .select("minimi_id")
            .eq("user_id", user.id);

        const minimiCounts: Record<string, number> = {};
        for (const o of (ownedMinimi || [])) {
            minimiCounts[o.minimi_id] = (minimiCounts[o.minimi_id] ?? 0) + 1;
        }

        // 보유 가구 수량 집계
        const { data: ownedFurniture } = await supabase
            .from("user_furniture")
            .select("furniture_id")
            .eq("user_id", user.id);

        const furnitureCounts: Record<string, number> = {};
        for (const o of (ownedFurniture || [])) {
            furnitureCounts[o.furniture_id] = (furnitureCounts[o.furniture_id] ?? 0) + 1;
        }

        const sanitized: PlacedMinimiItem[] = [];

        // 미니미 배치 검증
        const minimiPlacedCounts: Record<string, number> = {};
        for (const item of minimiItems) {
            minimiPlacedCounts[item.slug] = (minimiPlacedCounts[item.slug] ?? 0) + 1;
            if ((minimiCounts[item.slug] ?? 0) < minimiPlacedCounts[item.slug]) continue;
            sanitized.push({
                slug: item.slug,
                x: Math.max(5, Math.min(95, item.x)),
                y: Math.max(10, Math.min(85, item.y)),
                zIndex: item.zIndex,
                ...(item.type ? { type: item.type } : {}),
            });
        }

        // 가구 배치 검증
        const furniturePlacedCounts: Record<string, number> = {};
        for (const item of furnitureItems) {
            furniturePlacedCounts[item.slug] = (furniturePlacedCounts[item.slug] ?? 0) + 1;
            if ((furnitureCounts[item.slug] ?? 0) < furniturePlacedCounts[item.slug]) continue;
            sanitized.push({
                slug: item.slug,
                x: Math.max(5, Math.min(95, item.x)),
                y: Math.max(10, Math.min(85, item.y)),
                zIndex: item.zIndex,
                type: "furniture",
            });
        }

        const { error } = await supabase
            .from("minihompy_settings")
            .update({
                placed_minimi: sanitized,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);

        if (error) {
            return NextResponse.json({ error: "저장에 실패했습니다" }, { status: 500 });
        }

        return NextResponse.json({ placedMinimi: sanitized });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
