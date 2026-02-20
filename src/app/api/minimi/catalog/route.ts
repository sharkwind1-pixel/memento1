/**
 * 미니미 카탈로그 API
 * GET: 판매중인 캐릭터/악세서리 목록 조회
 */

import { NextRequest, NextResponse } from "next/server";
import { CHARACTER_CATALOG, ACCESSORY_CATALOG } from "@/data/minimiPixels";
import { MINIMI } from "@/config/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");

        // 캐릭터 필터링
        let characters = CHARACTER_CATALOG.map((c, i) => ({
            id: c.slug,
            slug: c.slug,
            name: c.name,
            category: c.category,
            pixelData: c.pixelData,
            price: c.price,
            resellPrice: Math.ceil(c.price * MINIMI.RESELL_RATIO),
            isAvailable: true,
            releasedAt: new Date().toISOString(),
            description: c.description,
            sortOrder: i,
        }));

        if (category && category !== "all" && category !== "accessory") {
            characters = characters.filter(c => c.category === category);
        }

        // 악세서리
        const accessories = ACCESSORY_CATALOG.map((a, i) => ({
            id: a.slug,
            slug: a.slug,
            name: a.name,
            category: a.category,
            layer: a.layer,
            pixelData: a.pixelData,
            price: a.price,
            resellPrice: Math.ceil(a.price * MINIMI.RESELL_RATIO),
            isAvailable: true,
            releasedAt: new Date().toISOString(),
            description: a.description,
            sortOrder: i,
        }));

        return NextResponse.json({
            characters: category === "accessory" ? [] : characters,
            accessories: category && category !== "all" && category !== "accessory" ? [] : accessories,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
