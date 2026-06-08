/**
 * /api/cron/news-post — 화제 뉴스 자동 게시 (콩콩 계정)
 *
 * 하루 1회(Vercel cron) 실행. 네이버 뉴스 검색 API로 화제 뉴스를 수집해
 * 자유게시판에 "콩콩" 계정으로 1~2건 게시한다. (게시판 활성화 목적)
 *
 * 안전장치:
 *  - 저작권: 전문 복제 X → 사람이 읽은 듯한 AI 감상평 한 줄 + 출처 원문 링크 + og:image 썸네일.
 *  - 톤: 사망·폭력·성범죄 + 정치/선거 denylist 필터 (news-fetch.ts).
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

// GPT 감상평 실패 시 폴백 (제목 해시로 분산 → 매번 같은 문구 도배 방지)
const FALLBACK_COMMENTS = [
    "이거 보고 좀 신기했어요.",
    "오 이런 일이 있었네요.",
    "읽어보니 흥미롭더라고요.",
    "다들 이 소식 봤어요?",
    "오늘 이런 게 화제더라고요.",
];

function hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    return Math.abs(h);
}

function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_CONFIG_MISSING");
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

/** 기사를 읽은 일반인 감상평 한 줄 생성 (봇 티 제거 + 발췌 대신 사람 느낌). 실패 시 폴백. */
async function generateComment(title: string, summary: string): Promise<string> {
    const fallback = FALLBACK_COMMENTS[hashStr(title) % FALLBACK_COMMENTS.length];
    try {
        const openai = new (await import("openai")).default({ apiKey: process.env.OPENAI_API_KEY });
        const res = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 120,
            temperature: 0.9,
            messages: [
                {
                    role: "system",
                    content: `너는 커뮤니티의 평범한 사용자야. 아래 뉴스를 읽고 공유하며 한두 문장으로 가볍게 감상/요약을 남겨.
규칙: 기사 본문을 그대로 베끼지 말고 네 말로. "~인가 봐요", "~라네요", "~인 것 같아요" 같은 자연스러운 구어체.
1~2문장, 80자 이내. 이모지·해시태그·따옴표·기자이름 금지. 정치/자극 주제는 중립적으로.
화재·사고·적발 등 사건사고면 농담조로 가볍게 굴지 말고 담담하거나 주의를 환기하는 톤으로(예: "~라니 다들 조심해야겠어요"). 결과 문장만 출력.`,
                },
                { role: "user", content: `제목: ${title}\n요약: ${summary}` },
            ],
        });
        const c = res.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, "");
        return c && c.length >= 4 && c.length <= 200 ? c : fallback;
    } catch {
        return fallback;
    }
}

/** SSRF 방어: 사설/로컬 호스트 차단 (URL은 네이버 결과지만 방어적으로). 파싱 실패도 차단. */
function isBlockedHost(url: string): boolean {
    try {
        const host = new URL(url).hostname.toLowerCase();
        return host === "localhost" || host.endsWith(".local") || host.startsWith("[") ||
            /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
            /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    } catch {
        return true;
    }
}

/** 기사 URL의 og:image 추출 (링크 썸네일용). 실패/없음/상대경로 → null. */
async function fetchOgImage(url: string): Promise<string | null> {
    if (isBlockedHost(url)) return null;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; MementoAniBot/1.0; +https://www.mementoani.com)" },
        });
        clearTimeout(timer);
        if (!res.ok) return null;
        const html = (await res.text()).slice(0, 200_000);
        const m =
            html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
            html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
        let img = m?.[1];
        if (!img) return null;
        if (img.startsWith("//")) img = "https:" + img;
        return /^https?:\/\//.test(img) ? img : null;
    } catch {
        return null;
    }
}

/** 게시용 부가정보(감상평 + 썸네일) 병렬 생성. */
async function enrich(item: { title: string; summary: string; link: string }) {
    const [comment, ogImage] = await Promise.all([
        generateComment(item.title, item.summary),
        fetchOgImage(item.link),
    ]);
    return { comment, ogImage };
}

/**
 * 외부 og:image를 pet-media 버킷에 복사 → 우리 supabase URL 반환.
 * 외부 뉴스 도메인은 CSP img-src에 없어 차단(엑박)되므로 반드시 우리 도메인으로 re-host해야 함.
 * 실패/이미지아님/과대 → null (썸네일 없이 게시).
 */
async function rehostImage(admin: ReturnType<typeof getAdminSupabase>, externalUrl: string): Promise<string | null> {
    if (isBlockedHost(externalUrl)) return null;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(externalUrl, {
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; MementoAniBot/1.0)" },
        });
        clearTimeout(timer);
        if (!res.ok) return null;
        const ct = res.headers.get("content-type") || "";
        if (!ct.startsWith("image/")) return null;
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes.byteLength === 0 || bytes.byteLength > 8_000_000) return null;
        const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : ct.includes("gif") ? "gif" : "jpg";
        const path = `community/${KONG_USER_ID}/news_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await admin.storage.from("pet-media").upload(path, bytes, { contentType: ct, upsert: false });
        if (error) return null;
        return admin.storage.from("pet-media").getPublicUrl(path).data.publicUrl;
    } catch {
        return null;
    }
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

        // 미리보기: 게시 없이 실제 게시될 모양(감상평+썸네일)을 반환 (배포 후 품질 확인용)
        if (dryRun) {
            const top = candidates.slice(0, POST_COUNT);
            const preview = await Promise.all(top.map(async (c) => {
                const e = await enrich(c);
                return { title: c.title, source: c.source, comment: e.comment, ogImage: e.ogImage, link: c.link };
            }));
            return NextResponse.json({ ok: true, dryRun: true, candidateCount: candidates.length, preview });
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

            // 감상평(사람 느낌) + 썸네일. og:image는 외부 도메인이라 CSP 차단 → 우리 버킷에 re-host.
            const { comment, ogImage } = await enrich(item);
            const hostedImage = ogImage ? await rehostImage(admin, ogImage) : null;
            const content = `${comment}\n\n출처: ${item.source}\n${item.link}`;

            const { error: postErr } = await admin.from("community_posts").insert({
                user_id: KONG_USER_ID,
                board_type: "free",
                badge: "정보",
                title: item.title.slice(0, 100),
                content,
                author_name: "콩콩",
                image_urls: hostedImage ? [hostedImage] : [],
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
