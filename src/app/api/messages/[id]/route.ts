/**
 * 쪽지 상세 API
 * GET: 쪽지 상세 조회 + 읽음 처리
 * PATCH: 삭제 처리
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase 환경변수 없음");
    return createClient(url, key);
}

// 쪽지 상세 조회
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const supabase = getSupabase();
        const messageId = params.id;

        // 쪽지 조회
        const { data: message, error } = await supabase
            .from("messages")
            .select(`
                *,
                sender:profiles!messages_sender_id_fkey(id, nickname, email),
                receiver:profiles!messages_receiver_id_fkey(id, nickname, email)
            `)
            .eq("id", messageId)
            .single();

        if (error || !message) {
            return NextResponse.json({ error: "쪽지를 찾을 수 없습니다." }, { status: 404 });
        }

        // 권한 확인 (보낸 사람 또는 받은 사람만 조회 가능)
        const isSender = message.sender_id === user.id;
        const isReceiver = message.receiver_id === user.id;

        if (!isSender && !isReceiver) {
            return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
        }

        // 삭제된 쪽지 확인
        if ((isSender && message.sender_deleted) || (isReceiver && message.receiver_deleted)) {
            return NextResponse.json({ error: "삭제된 쪽지입니다." }, { status: 404 });
        }

        // 받은 쪽지인 경우 읽음 처리
        if (isReceiver && !message.is_read) {
            await supabase
                .from("messages")
                .update({
                    is_read: true,
                    read_at: new Date().toISOString(),
                })
                .eq("id", messageId);

            message.is_read = true;
            message.read_at = new Date().toISOString();
        }

        return NextResponse.json({ message });
    } catch (err) {
        console.error("Message GET error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// 쪽지 삭제 (soft delete)
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const supabase = getSupabase();
        const messageId = params.id;

        // 쪽지 조회
        const { data: message, error: fetchError } = await supabase
            .from("messages")
            .select("sender_id, receiver_id")
            .eq("id", messageId)
            .single();

        if (fetchError || !message) {
            return NextResponse.json({ error: "쪽지를 찾을 수 없습니다." }, { status: 404 });
        }

        // 권한 확인
        const isSender = message.sender_id === user.id;
        const isReceiver = message.receiver_id === user.id;

        if (!isSender && !isReceiver) {
            return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
        }

        // 삭제 처리
        const updateField = isSender ? "sender_deleted" : "receiver_deleted";

        const { error: updateError } = await supabase
            .from("messages")
            .update({ [updateField]: true })
            .eq("id", messageId);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Message PATCH error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
