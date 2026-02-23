/**
 * 미니홈피 미니미 배치 API
 * PUT: 스테이지에 배치된 미니미 배열 저장
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { MINIHOMPY } from "@/config/constants";

export const dynamic = "force-dynamic";

interface PlacedMinimiItem {
    slug: string;
    x: number;
    y: number;
    zIndex: number;
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

        // 최대 배치 수 제한
        if (placedMinimi.length > MINIHOMPY.MAX_PLACED_MINIMI) {
            return NextResponse.json(
                { error: `최대 ${MINIHOMPY.MAX_PLACED_MINIMI}마리까지 배치할 수 있습니다` },
                { status: 400 }
            );
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

        // 보유 캐릭터 목록 확인
        const { data: owned } = await supabase
            .from("user_minimi")
            .select("minimi_id")
            .eq("user_id", user.id);

        const ownedSlugs = new Set((owned || []).map(o => o.minimi_id));

        // 배치하려는 캐릭터가 모두 보유 중인지 확인 (중복 slug 방지)
        const sanitized: PlacedMinimiItem[] = [];
        const seenSlugs = new Set<string>();
        for (const item of placedMinimi) {
            if (!ownedSlugs.has(item.slug) || seenSlugs.has(item.slug)) {
                continue;
            }
            seenSlugs.add(item.slug);
            sanitized.push({
                slug: item.slug,
                x: Math.max(5, Math.min(95, item.x)),
                y: Math.max(10, Math.min(85, item.y)),
                zIndex: item.zIndex,
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
