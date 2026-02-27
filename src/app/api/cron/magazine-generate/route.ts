/**
 * 매거진 기사 자동 생성 크론 엔드포인트
 *
 * Supabase pg_cron에서 매일 06:00 KST(UTC 21:00)에 호출.
 * 코드 내부에서 월/수/금만 실행, 나머지 요일은 스킵.
 * GPT-4o-mini로 기사 생성 → draft 상태로 DB INSERT → 관리자가 검토 후 발행.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { MAGAZINE_AUTO } from "@/config/constants";
import {
    getNextCategoryAndBadge,
    getRecentTitles,
    generateArticle,
    fetchUnsplashImage,
} from "@/lib/magazine-generator";
import type { GenerationResult } from "@/lib/magazine-generator";

// ===== 서비스 클라이언트 =====

function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_CONFIG_MISSING");
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

function getOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");
    return new OpenAI({ apiKey });
}

// ===== 메인 핸들러 =====

export async function GET(request: NextRequest) {
    // 1. CRON_SECRET 인증
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        return NextResponse.json({ error: "CRON_SECRET_MISSING" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. 요일 체크 (KST 기준 월/수/금만 실행)
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const dayOfWeek = kstNow.getUTCDay(); // 0=일, 1=월, ... 6=토

    if (!(MAGAZINE_AUTO.PUBLISH_DAYS as readonly number[]).includes(dayOfWeek)) {
        return NextResponse.json({
            message: "오늘은 매거진 생성일이 아닙니다",
            dayOfWeek,
            publishDays: MAGAZINE_AUTO.PUBLISH_DAYS,
            skipped: true,
        });
    }

    try {
        const supabase = getServiceSupabase();
        const openai = getOpenAI();

        // 3. 카테고리/배지 로테이션
        const { category, badge } = await getNextCategoryAndBadge(supabase);

        // 4. 중복 방지용 최근 제목
        const recentTitles = await getRecentTitles(supabase);

        // 5. AI로 기사 생성
        const article = await generateArticle(openai, category, badge, recentTitles);

        // 6. Unsplash 이미지
        const imageUrl = await fetchUnsplashImage(category);

        // 7. DB INSERT (draft 상태)
        const status = MAGAZINE_AUTO.AUTO_PUBLISH ? "published" : "draft";
        const { data: inserted, error: insertError } = await supabase
            .from("magazine_articles")
            .insert({
                category,
                title: article.title,
                summary: article.summary,
                content: article.content,
                author: MAGAZINE_AUTO.AUTHOR_NAME,
                author_role: MAGAZINE_AUTO.AUTHOR_ROLE,
                image_url: imageUrl,
                read_time: article.readTime,
                badge,
                tags: article.tags,
                status,
                published_at: status === "published" ? new Date().toISOString() : null,
            })
            .select("id, title")
            .single();

        if (insertError) {
            throw new Error(`DB INSERT 실패: ${insertError.message}`);
        }

        const result: GenerationResult = {
            success: true,
            category,
            badge,
            title: inserted?.title,
        };

        return NextResponse.json({
            ...result,
            id: inserted?.id,
            status,
            generatedAt: new Date().toISOString(),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류";
        console.error("[magazine-generate] 실패:", message);

        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
