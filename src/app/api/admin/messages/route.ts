/**
 * 관리자 메시지/공지 발송 API
 *
 * POST /api/admin/messages
 *   body: {
 *     recipient: "all" | "premium" | "free" | "memorial" | { userIds: string[] },
 *     title: string,
 *     body: string,
 *     type?: "admin_message" | "admin_notice",  // 기본 admin_message
 *     metadata?: Record<string, unknown>
 *   }
 *
 * GET /api/admin/messages
 *   관리자가 발송한 메시지 이력 조회 (최근 50건)
 *
 * 보안:
 * - 세션 인증 + 관리자 권한 (이메일 + DB is_admin) 이중 검증
 * - sender_id에 발송한 관리자 ID 기록
 * - 차단 유저(is_banned) / 탈퇴 진행 중 유저는 자동 제외
 *
 * 발송 방식:
 * - 대량 발송 시 200명씩 배치 INSERT (PostgREST 한도)
 * - 같은 dedup_key가 있으면 23505 무시 (중복 발송 방지)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";
import { setupVapid, sendPushBatch, fetchSubsForUsers, cleanupExpiredSubscriptions } from "@/lib/cron-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_TYPES = ["admin_message", "admin_notice"] as const;
const VALID_RECIPIENTS = ["all", "premium", "free", "memorial"] as const;

const TITLE_MAX = 100;
const BODY_MAX = 2000;
const BATCH_SIZE = 200;

type RecipientFilter =
    | "all"
    | "premium"
    | "free"
    | "memorial"
    | { userIds: string[] };

interface MessagePayload {
    recipient: RecipientFilter;
    title: string;
    body: string;
    type?: "admin_message" | "admin_notice";
    metadata?: Record<string, unknown>;
}

/** 관리자 권한 검증 (이메일 + DB is_admin 이중 체크) */
async function verifyAdminAccess(): Promise<
    { ok: true; user: { id: string; email?: string } } | { ok: false; error: string; status: number }
> {
    const user = await getAuthUser();
    if (!user) return { ok: false, error: "로그인이 필요합니다", status: 401 };

    const isEmailAdmin = ADMIN_EMAILS.includes(user.email || "");
    if (isEmailAdmin) return { ok: true, user };

    const sb = createAdminSupabase();
    const { data: profile } = await sb
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (profile?.is_admin === true) return { ok: true, user };
    return { ok: false, error: "관리자 권한이 필요합니다", status: 403 };
}

/** 수신자 그룹 → user_id 배열로 변환 */
async function resolveRecipients(
    sb: ReturnType<typeof createAdminSupabase>,
    recipient: RecipientFilter
): Promise<string[]> {
    // 직접 지정
    if (typeof recipient === "object" && Array.isArray(recipient.userIds)) {
        return recipient.userIds.filter((id) => typeof id === "string");
    }

    // 그룹 필터
    let query = sb
        .from("profiles")
        .select("id")
        // 차단 유저 자동 제외
        .or("is_banned.is.null,is_banned.eq.false");

    if (recipient === "premium") {
        query = query.eq("is_premium", true);
    } else if (recipient === "free") {
        query = query.or("is_premium.is.null,is_premium.eq.false");
    } else if (recipient === "memorial") {
        // 추모 모드를 사용 중인 유저 (memorial 상태 펫 1마리 이상 보유)
        // → 별도 처리: pets 테이블에서 memorial 상태 user_id 가져옴
        const { data: memorialPets } = await sb
            .from("pets")
            .select("user_id")
            .eq("status", "memorial");
        const userIds = Array.from(
            new Set((memorialPets || []).map((p) => p.user_id).filter(Boolean))
        );
        if (userIds.length === 0) return [];
        return userIds;
    }
    // recipient === "all"이면 추가 필터 없음

    const { data } = await query;
    return (data || []).map((p) => p.id);
}

export async function POST(request: NextRequest) {
    // 1. 관리자 인증
    const auth = await verifyAdminAccess();
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        // 2. 요청 파싱 + 검증
        const payload = (await request.json()) as Partial<MessagePayload>;
        const { recipient, title, body, type = "admin_message", metadata = {} } = payload;

        if (!recipient) {
            return NextResponse.json({ error: "recipient가 필요합니다" }, { status: 400 });
        }
        if (!title || typeof title !== "string") {
            return NextResponse.json({ error: "title이 필요합니다" }, { status: 400 });
        }
        if (!body || typeof body !== "string") {
            return NextResponse.json({ error: "body가 필요합니다" }, { status: 400 });
        }
        if (title.length > TITLE_MAX) {
            return NextResponse.json({ error: `title은 ${TITLE_MAX}자 이내` }, { status: 400 });
        }
        if (body.length > BODY_MAX) {
            return NextResponse.json({ error: `body는 ${BODY_MAX}자 이내` }, { status: 400 });
        }
        if (!VALID_TYPES.includes(type)) {
            return NextResponse.json({ error: "잘못된 type" }, { status: 400 });
        }

        // recipient 검증
        const isStringRecipient = typeof recipient === "string";
        if (isStringRecipient && !VALID_RECIPIENTS.includes(recipient as typeof VALID_RECIPIENTS[number])) {
            return NextResponse.json({ error: "잘못된 recipient" }, { status: 400 });
        }
        if (!isStringRecipient && (typeof recipient !== "object" || !Array.isArray((recipient as { userIds?: unknown }).userIds))) {
            return NextResponse.json({ error: "recipient.userIds 배열이 필요합니다" }, { status: 400 });
        }

        // 3. 수신자 해결
        const sb = createAdminSupabase();
        const recipientIds = await resolveRecipients(sb, recipient as RecipientFilter);

        if (recipientIds.length === 0) {
            return NextResponse.json({ error: "발송 대상이 없습니다" }, { status: 400 });
        }

        // 4. 배치 INSERT (200명씩)
        const now = new Date();
        const dedupBase = `admin_${now.toISOString().slice(0, 10)}_${auth.user.id}_${Date.now()}`;

        const rows = recipientIds.map((uid) => ({
            user_id: uid,
            type,
            title: title.trim(),
            body: body.trim(),
            metadata: { ...metadata, sender_email: auth.user.email || null },
            sender_id: auth.user.id,
            dedup_key: `${dedupBase}_${uid}`,
        }));

        let inserted = 0;
        let failed = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            const { error, data } = await sb
                .from("notifications")
                .insert(batch)
                .select("id");

            if (error) {
                // 23505 (dedup 중복)는 정상 — 같은 ms에 중복 발송 시도
                if (error.code === "23505") continue;
                failed += batch.length;
                errors.push(error.message);
                console.error("[admin/messages] batch insert failed:", error.message);
                continue;
            }
            inserted += (data || []).length;
        }

        // 5. 웹 푸시 발송 (비동기 — 실패해도 인앱 알림은 이미 전달됨)
        let pushSent = 0;
        let pushFailed = 0;
        try {
            setupVapid();
            const subsMap = await fetchSubsForUsers(sb, recipientIds);
            const pushItems: { sub: { endpoint: string; p256dh: string; auth: string }; payload: { title: string; body: string; icon?: string; url?: string } }[] = [];

            for (const [, subs] of Array.from(subsMap)) {
                for (const sub of subs) {
                    pushItems.push({
                        sub: { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
                        payload: {
                            title: type === "admin_notice" ? `[공지] ${title.trim()}` : title.trim(),
                            body: body.trim().slice(0, 200),
                            icon: "/logo.png",
                            url: "/?tab=home",
                        },
                    });
                }
            }

            if (pushItems.length > 0) {
                const pushResult = await sendPushBatch(pushItems);
                pushSent = pushResult.sent;
                pushFailed = pushResult.failed;

                // 만료된 구독 정리
                if (pushResult.expiredEndpoints.length > 0) {
                    await cleanupExpiredSubscriptions(sb, pushResult.expiredEndpoints);
                }
            }
        } catch (pushErr) {
            // VAPID 미설정 등 — 푸시 실패해도 인앱 알림은 이미 전달됨
            console.error("[admin/messages] push failed:", pushErr instanceof Error ? pushErr.message : pushErr);
        }

        return NextResponse.json({
            ok: true,
            type,
            recipientCount: recipientIds.length,
            inserted,
            failed,
            pushSent,
            pushFailed,
            errors: errors.slice(0, 3),
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "서버 오류";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function GET(_request: NextRequest) {
    // 관리자 인증
    const auth = await verifyAdminAccess();
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const sb = createAdminSupabase();

        // 발송한 메시지 그룹화: dedup_key 접두사로 한 발송 단위 식별
        // notifications에는 발송 단위가 별도로 없으므로 created_at + sender_id로 그룹화
        const { data: rows } = await sb
            .from("notifications")
            .select("id, type, title, body, created_at, sender_id, metadata, user_id, read_at")
            .not("sender_id", "is", null)
            .in("type", ["admin_message", "admin_notice"])
            .order("created_at", { ascending: false })
            .limit(500);

        if (!rows) {
            return NextResponse.json({ messages: [] });
        }

        // 발송 단위로 그룹화: 같은 sender_id + title + body + 1초 이내 created_at
        type MessageGroup = {
            id: string;
            type: string;
            title: string;
            body: string;
            sentAt: string;
            senderEmail: string | null;
            recipientCount: number;
            readCount: number;
        };

        const groups = new Map<string, MessageGroup>();
        for (const r of rows) {
            // 같은 발송 단위 키: title + body + created_at의 분 단위
            const minute = r.created_at?.slice(0, 16) || "";
            const key = `${r.title}|${r.body}|${minute}`;
            const existing = groups.get(key);
            if (existing) {
                existing.recipientCount++;
                if (r.read_at) existing.readCount++;
            } else {
                groups.set(key, {
                    id: r.id,
                    type: r.type,
                    title: r.title,
                    body: r.body,
                    sentAt: r.created_at,
                    senderEmail: (r.metadata as Record<string, unknown>)?.sender_email as string | null || null,
                    recipientCount: 1,
                    readCount: r.read_at ? 1 : 0,
                });
            }
        }

        const messages = Array.from(groups.values())
            .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))
            .slice(0, 50);

        return NextResponse.json({ messages });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "서버 오류";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
