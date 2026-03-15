/**
 * 추억 앨범 읽음 처리 API
 * PATCH /api/memory-albums/{id}/read
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const { id } = await params;

        const supabase = await createServerSupabase();

        const { error } = await supabase
            .from("memory_albums")
            .update({ is_read: true })
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) {
            console.error("[MemoryAlbumRead] 업데이트 오류:", error.message);
            return NextResponse.json({ error: "읽음 처리에 실패했습니다." }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[MemoryAlbumRead] 오류:", err instanceof Error ? err.message : "unknown");
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
