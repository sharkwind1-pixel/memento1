/**
 * 매거진 생성 보정 크론
 *
 * 매일 KST 21:00 (UTC 12:00)에 호출.
 * 오늘이 월/수/금인데 매거진 draft가 없으면 magazine-generate를 force 호출하여 보정.
 * 아침 크론이 실패했을 때를 대비한 안전장치.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MAGAZINE_AUTO } from "@/config/constants";

function getKSTNow(): Date {
    return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function getKSTDateString(date: Date): string {
    return date.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
    // 1. 인증
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        return NextResponse.json({ error: "CRON_SECRET_MISSING" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. 요일 체크 (월/수/금만)
    const kstNow = getKSTNow();
    const dayOfWeek = kstNow.getUTCDay();

    if (!(MAGAZINE_AUTO.PUBLISH_DAYS as readonly number[]).includes(dayOfWeek)) {
        return NextResponse.json({
            message: "오늘은 매거진 생성일이 아닙니다",
            dayOfWeek,
            skipped: true,
        });
    }

    // 3. 오늘 자동 생성된 기사가 있는지 확인
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        return NextResponse.json({ error: "SUPABASE_CONFIG_MISSING" }, { status: 500 });
    }

    const supabase = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const todayStr = getKSTDateString(kstNow);
    const startUTC = new Date(`${todayStr}T00:00:00+09:00`).toISOString();
    const endUTC = new Date(`${todayStr}T23:59:59+09:00`).toISOString();

    const { data: todayArticles } = await supabase
        .from("magazine_articles")
        .select("id, title")
        .eq("author", MAGAZINE_AUTO.AUTHOR_NAME)
        .gte("created_at", startUTC)
        .lte("created_at", endUTC)
        .limit(1);

    if (todayArticles && todayArticles.length > 0) {
        return NextResponse.json({
            message: "오늘 매거진이 정상 생성되어 있습니다",
            article: todayArticles[0].title,
            skipped: true,
        });
    }

    // 4. 매거진이 없으면 강제 생성 호출
    // console.log("[magazine-check] 오늘 매거진이 없습니다. 보정 생성을 시도합니다.");

    try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mementoani.com";
        const generateUrl = `${siteUrl}/api/cron/magazine-generate?force=true`;

        const res = await fetch(generateUrl, {
            headers: {
                Authorization: `Bearer ${cronSecret}`,
                "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(50000),
        });

        const result = await res.json();

        if (result.success) {
            // console.log("[magazine-check] 보정 생성 성공:", result.title);
            return NextResponse.json({
                message: "보정 생성 성공",
                compensated: true,
                title: result.title,
                id: result.id,
            });
        } else {
            console.error("[magazine-check] 보정 생성 실패:", result.error);
            return NextResponse.json(
                { message: "보정 생성 실패", error: result.error },
                { status: 500 }
            );
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류";
        console.error("[magazine-check] 보정 호출 실패:", message);
        return NextResponse.json(
            { message: "보정 호출 실패", error: message },
            { status: 500 }
        );
    }
}
