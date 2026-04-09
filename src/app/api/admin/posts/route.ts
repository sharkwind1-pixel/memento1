/**
 * 관리자 게시물 관리 API
 * PATCH: 게시물 숨김/숨김해제
 * DELETE: 게시물 삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";

export const dynamic = "force-dynamic";

async function verifyAdmin() {
    const user = await getAuthUser();
    if (!user) return null;

    const isEmailAdmin = ADMIN_EMAILS.includes(user.email || "");
    if (isEmailAdmin) return user;

    const adminSupabase = createAdminSupabase();
    const { data: profile } = await adminSupabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (profile?.is_admin) return user;
    return null;
}

export async function PATCH(request: NextRequest) {
    try {
        const adminUser = await verifyAdmin();
        if (!adminUser) {
            return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
        }

        const body = await request.json();
        const { postId, isHidden } = body as { postId: string; isHidden: boolean };

        if (!postId || typeof isHidden !== "boolean") {
            return NextResponse.json({ error: "postId와 isHidden이 필요합니다" }, { status: 400 });
        }

        const adminSupabase = createAdminSupabase();
        const { error } = await adminSupabase
            .from("community_posts")
            .update({ is_hidden: isHidden })
            .eq("id", postId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const adminUser = await verifyAdmin();
        if (!adminUser) {
            return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
        }

        const body = await request.json();
        const { postId } = body as { postId: string };

        if (!postId) {
            return NextResponse.json({ error: "postId가 필요합니다" }, { status: 400 });
        }

        const adminSupabase = createAdminSupabase();
        const { error } = await adminSupabase
            .from("community_posts")
            .delete()
            .eq("id", postId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
