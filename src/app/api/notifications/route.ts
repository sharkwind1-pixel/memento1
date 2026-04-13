/**
 * /api/notifications
 * GET  — 본인 알림 최근 50건 + unreadCount
 * PATCH — 읽음 처리 (markAllRead 또는 개별 ids)
 */

import { NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";

export async function GET() {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const supabase = await createServerSupabase();

    const [{ data: notifications, error }, { count }] = await Promise.all([
        supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50),
        supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .is("read_at", null),
    ]);

    if (error) {
        return NextResponse.json({ error: "알림 조회 실패" }, { status: 500 });
    }

    const items = (notifications ?? []).map((n) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        body: n.body,
        metadata: n.metadata,
        readAt: n.read_at,
        createdAt: n.created_at,
        dedupKey: n.dedup_key,
    }));

    return NextResponse.json({ notifications: items, unreadCount: count ?? 0 });
}

export async function PATCH(request: Request) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const supabase = await createServerSupabase();

    if (body.markAllRead) {
        const { error } = await supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .is("read_at", null);

        if (error) {
            return NextResponse.json({ error: "읽음 처리 실패" }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    }

    if (Array.isArray(body.ids) && body.ids.length > 0) {
        const { error } = await supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .in("id", body.ids);

        if (error) {
            return NextResponse.json({ error: "읽음 처리 실패" }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
}
