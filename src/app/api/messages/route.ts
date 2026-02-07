/**
 * 쪽지 API
 * GET: 받은/보낸 쪽지 목록 조회
 * POST: 쪽지 보내기
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase-server";
import {
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
    sanitizeInput,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase 환경변수 없음");
    return createClient(url, key);
}

// 쪽지 목록 조회
export async function GET(request: NextRequest) {
    try {
        // 인증 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const supabase = getSupabase();
        const { searchParams } = new URL(request.url);

        const type = searchParams.get("type") || "received"; // received | sent
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = parseInt(searchParams.get("offset") || "0");

        let query;

        if (type === "sent") {
            // 보낸 쪽지
            query = supabase
                .from("messages")
                .select(`
                    *,
                    receiver:profiles!messages_receiver_id_fkey(id, nickname, email)
                `)
                .eq("sender_id", user.id)
                .eq("sender_deleted", false)
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);
        } else {
            // 받은 쪽지
            query = supabase
                .from("messages")
                .select(`
                    *,
                    sender:profiles!messages_sender_id_fkey(id, nickname, email)
                `)
                .eq("receiver_id", user.id)
                .eq("receiver_deleted", false)
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("Messages fetch error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 읽지 않은 쪽지 수 (받은 쪽지만)
        const { count: unreadCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("receiver_id", user.id)
            .eq("is_read", false)
            .eq("receiver_deleted", false);

        return NextResponse.json({
            messages: data || [],
            total: count || 0,
            unread: unreadCount || 0,
        });
    } catch (err) {
        console.error("Messages GET error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// 쪽지 보내기
export async function POST(request: NextRequest) {
    try {
        // Rate Limiting
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "message");

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "쪽지 전송이 너무 빠릅니다. 잠시 후 다시 시도해주세요." },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn),
                }
            );
        }

        // 인증 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const supabase = getSupabase();
        const body = await request.json();

        const { receiverId, title, content } = body;

        // 필수 필드 검증
        if (!receiverId || !title || !content) {
            return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
        }

        // 자기 자신에게 보내기 방지
        if (receiverId === user.id) {
            return NextResponse.json({ error: "자신에게는 쪽지를 보낼 수 없습니다." }, { status: 400 });
        }

        // 받는 사람 존재 확인
        const { data: receiver, error: receiverError } = await supabase
            .from("profiles")
            .select("id, is_banned")
            .eq("id", receiverId)
            .single();

        if (receiverError || !receiver) {
            return NextResponse.json({ error: "받는 사람을 찾을 수 없습니다." }, { status: 404 });
        }

        if (receiver.is_banned) {
            return NextResponse.json({ error: "정지된 사용자에게는 쪽지를 보낼 수 없습니다." }, { status: 403 });
        }

        // 입력값 Sanitize
        const sanitizedTitle = sanitizeInput(title).slice(0, 100);
        const sanitizedContent = sanitizeInput(content).slice(0, 2000);

        if (!sanitizedTitle || !sanitizedContent) {
            return NextResponse.json({ error: "유효하지 않은 입력입니다." }, { status: 400 });
        }

        // 쪽지 저장
        const { data, error } = await supabase
            .from("messages")
            .insert([{
                sender_id: user.id,
                receiver_id: receiverId,
                title: sanitizedTitle,
                content: sanitizedContent,
            }])
            .select()
            .single();

        if (error) {
            console.error("Message insert error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: data });
    } catch (err) {
        console.error("Messages POST error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
