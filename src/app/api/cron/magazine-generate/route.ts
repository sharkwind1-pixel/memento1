/**
 * 매거진 기사 자동 생성 크론 엔드포인트
 *
 * Supabase pg_cron에서 매일 06:00 KST(UTC 21:00)에 호출.
 * 코드 내부에서 월/수/금만 실행, 나머지 요일은 스킵.
 * GPT-4o-mini로 기사 생성 → draft 상태로 DB INSERT → 관리자가 검토 후 발행.
 *
 * 안전장치:
 * - 실패 시 1회 자동 재시도 (3초 대기 후)
 * - 오늘 이미 생성된 기사가 있으면 중복 생성 방지
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
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

// ===== KST 유틸 =====

function getKSTNow(): Date {
    return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

/** KST 기준 오늘 날짜 문자열 (YYYY-MM-DD) */
function getKSTDateString(date: Date): string {
    return date.toISOString().split("T")[0];
}

// ===== 오늘 이미 생성되었는지 체크 =====

async function hasArticleToday(supabase: SupabaseClient): Promise<boolean> {
    const kstNow = getKSTNow();
    const todayStr = getKSTDateString(kstNow);

    // KST 기준 오늘 00:00 ~ 23:59 범위 (UTC로 변환)
    const startUTC = new Date(`${todayStr}T00:00:00+09:00`).toISOString();
    const endUTC = new Date(`${todayStr}T23:59:59+09:00`).toISOString();

    const { data } = await supabase
        .from("magazine_articles")
        .select("id")
        .eq("author", MAGAZINE_AUTO.AUTHOR_NAME)
        .gte("created_at", startUTC)
        .lte("created_at", endUTC)
        .limit(1);

    return (data?.length ?? 0) > 0;
}

// ===== 기사 생성 핵심 로직 (재시도 가능하도록 분리) =====

async function createMagazineArticle(
    supabase: SupabaseClient,
    openai: OpenAI
): Promise<{ id: string; title: string; category: string; badge: string; status: string; animalType?: string }> {
    // 카테고리/배지/동물 종 로테이션
    const { category, badge, animalType } = await getNextCategoryAndBadge(supabase);

    // 중복 방지용 최근 제목
    const recentTitles = await getRecentTitles(supabase);

    // AI로 기사 생성 (동물 종 정보 전달)
    const article = await generateArticle(openai, category, badge, recentTitles, animalType);

    // Unsplash 이미지 (동물 종에 맞는 이미지)
    const imageUrl = await fetchUnsplashImage(category, animalType);

    // DB INSERT (draft 상태)
    const articleStatus = MAGAZINE_AUTO.AUTO_PUBLISH ? "published" : "draft";
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
            status: articleStatus,
            published_at: articleStatus === "published" ? new Date().toISOString() : null,
        })
        .select("id, title")
        .single();

    if (insertError) {
        throw new Error(`DB INSERT 실패: ${insertError.message}`);
    }

    return {
        id: inserted?.id,
        title: inserted?.title,
        category,
        badge,
        status: articleStatus,
        animalType: animalType.name,
    };
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
    const kstNow = getKSTNow();
    const dayOfWeek = kstNow.getUTCDay(); // 0=일, 1=월, ... 6=토

    // force 파라미터: 요일 체크 무시 (보정 크론에서 사용)
    const url = new URL(request.url);
    const isForced = url.searchParams.get("force") === "true";

    if (!isForced && !(MAGAZINE_AUTO.PUBLISH_DAYS as readonly number[]).includes(dayOfWeek)) {
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

        // 3. 오늘 이미 생성되었으면 중복 방지
        const alreadyExists = await hasArticleToday(supabase);
        if (alreadyExists) {
            return NextResponse.json({
                message: "오늘 매거진이 이미 생성되어 있습니다",
                skipped: true,
                reason: "duplicate_prevention",
            });
        }

        // 4. 기사 생성 (실패 시 1회 재시도)
        let result;
        try {
            result = await createMagazineArticle(supabase, openai);
        } catch (firstError) {
            const firstMsg = firstError instanceof Error ? firstError.message : "알 수 없는 오류";
            console.error("[magazine-generate] 1차 시도 실패:", firstMsg, "→ 3초 후 재시도");

            // 3초 대기 후 재시도
            await new Promise((r) => setTimeout(r, 3000));

            try {
                result = await createMagazineArticle(supabase, openai);
                console.log("[magazine-generate] 재시도 성공:", result.title);
            } catch (retryError) {
                const retryMsg = retryError instanceof Error ? retryError.message : "알 수 없는 오류";
                console.error("[magazine-generate] 재시도도 실패:", retryMsg);
                throw retryError;
            }
        }

        const response: GenerationResult = {
            success: true,
            category: result.category,
            badge: result.badge,
            title: result.title,
        };

        return NextResponse.json({
            ...response,
            id: result.id,
            status: result.status,
            animalType: result.animalType,
            retried: false,
            generatedAt: new Date().toISOString(),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류";
        console.error("[magazine-generate] 최종 실패:", message);

        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
