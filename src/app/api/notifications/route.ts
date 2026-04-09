/**
 * 알림 조회/읽음처리 API
 * GET  /api/notifications — 본인 알림 최근 50건 + unreadCount
 * PATCH /api/notifications — 읽음 처리 (markAllRead 또는 ids[])
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const supabase = await createServerSupabase();

        const [{ data: notifications, error }, { count: unreadCount }] = await Promise.all([
            supabase
                .from("notifications")
                .select("id, type, title, body, metadata, read_at, created_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(50),
            supabase
                .from("notifications")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id)
                .is("read_at", null),
        ]);

        if (error) {
            return NextResponse.json({ error: "알림 조회에 실패했습니다." }, { status: 500 });
        }

        return NextResponse.json({
            notifications: notifications || [],
            unreadCount: unreadCount || 0,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const body = await request.json();
        const supabase = await createServerSupabase();
        const now = new Date().toISOString();

        if (body.markAllRead) {
            const { error } = await supabase
                .from("notifications")
                .update({ read_at: now })
                .eq("user_id", user.id)
                .is("read_at", null);

            if (error) {
                return NextResponse.json({ error: "읽음 처리에 실패했습니다." }, { status: 500 });
            }
        } else if (Array.isArray(body.ids) && body.ids.length > 0) {
            const safeIds = body.ids.filter((id: unknown) => typeof id === "string").slice(0, 50);
            const { error } = await supabase
                .from("notifications")
                .update({ read_at: now })
                .eq("user_id", user.id)
                .in("id", safeIds)
                .is("read_at", null);

            if (error) {
                return NextResponse.json({ error: "읽음 처리에 실패했습니다." }, { status: 500 });
            }
        } else {
            return NextResponse.json({ error: "markAllRead 또는 ids가 필요합니다." }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
