/**
 * /api/cron/news-post — 화제 뉴스 자동 게시 (콩콩 계정)
 *
 * 하루 1회(Vercel cron) 실행. 네이버 뉴스 검색 API로 화제 뉴스를 수집해
 * 자유게시판에 "콩콩" 계정으로 1~2건 게시한다. (게시판 활성화 목적)
 *
 * 안전장치:
 *  - 저작권: 전문 복제 X → 제목 + 짧은 요약 스니펫 + 출처 원문 링크만 (news-fetch.ts).
 *  - 톤: 사망·폭력·성범죄 등 자극 뉴스 denylist 필터 (news-fetch.ts).
 *  - 중복: auto_news_log(link PK)로 같은 기사 재게시 차단.
 *  - 미리보기: ?dryRun=1 → 게시 없이 후보만 반환 (배포 후 품질 확인용).
 *
 * 인증: CRON_SECRET (verifyCronSecret).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronSecret } from "@/lib/cron-utils";
import { fetchPopularNews } from "@/lib/news-fetch";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// 게시 주체: "콩콩" 계정 (사용자 지정·통제 계정)
const KONG_USER_ID = "625a825e-27f4-4bde-96b6-c78cf565d279";
const POST_COUNT = 2; // 하루 최대 게시 건수 (1~2건)

const INTROS = [
    "오늘 이런 뉴스가 눈에 띄어서 가져와봤어요.",
    "요즘 화제인 소식이라 같이 보면 좋을 것 같아요.",
    "이 뉴스 보셨어요? 흥미로워서 공유해요.",
    "오늘의 화제 뉴스 가져왔어요.",
];

function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_CONFIG_MISSING");
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export async function GET(request: NextRequest) {
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
    const dayN = Math.floor(Date.now() / 86_400_000);

    try {
        const candidates = await fetchPopularNews(dayN, 15);

        if (candidates.length === 0) {
            return NextResponse.json({ ok: true, posted: 0, reason: "후보 없음(네이버 키 누락 또는 전부 필터됨)" });
        }

        // 미리보기: 게시 없이 후보만 반환 (배포 후 품질 확인용)
        if (dryRun) {
            return NextResponse.json({
                ok: true,
                dryRun: true,
                candidateCount: candidates.length,
                preview: candidates.slice(0, POST_COUNT).map((c) => ({ title: c.title, source: c.source, summary: c.summary, link: c.link })),
            });
        }

        const admin = getAdminSupabase();
        const posted: { title: string; link: string }[] = [];

        for (const item of candidates) {
            if (posted.length >= POST_COUNT) break;

            // 중복 방지: link 선점(이미 게시된 기사면 skip). ignoreDuplicates → 충돌 시 빈 배열.
            const { data: logRows } = await admin
                .from("auto_news_log")
                .upsert({ link: item.link, title: item.title }, { onConflict: "link", ignoreDuplicates: true })
                .select("link");
            if (!logRows || logRows.length === 0) continue; // 이미 게시한 기사

            const intro = INTROS[(dayN + posted.length) % INTROS.length];
            const content = `${intro}\n\n${item.summary}\n\n출처: ${item.source}\n${item.link}`;

            const { error: postErr } = await admin.from("community_posts").insert({
                user_id: KONG_USER_ID,
                board_type: "free",
                badge: "정보",
                title: item.title.slice(0, 100),
                content,
                author_name: "콩콩",
                moderation_status: "approved", // 자체 자극필터 통과한 큐레이션 → 승인
            });

            if (!postErr) {
                posted.push({ title: item.title, link: item.link });
            }
        }

        console.log(`[news-post] 게시 ${posted.length}건`, posted.map((p) => p.title));
        return NextResponse.json({ ok: true, posted: posted.length, titles: posted.map((p) => p.title) });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "server_error";
        console.error("[news-post] 오류:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
