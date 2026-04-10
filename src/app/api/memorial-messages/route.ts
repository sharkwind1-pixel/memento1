/**
 * 추모 펫 위로 메시지 API
 * GET: 메시지 목록 조회
 * POST: 메시지 작성 (유저당 1개, 200자)
 * DELETE: 메시지 삭제 (작성자/펫소유자/관리자)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";

/** GET: 위로 메시지 목록 */
export async function GET(request: NextRequest) {
    const petId = request.nextUrl.searchParams.get("petId");
    if (!petId) {
        return NextResponse.json({ error: "petId가 필요합니다" }, { status: 400 });
    }

    try {
        const supabase = createAdminSupabase();
        const { data, error } = await supabase
            .from("pet_condolence_messages")
            .select("id, pet_id, user_id, message, nickname, created_at")
            .eq("pet_id", petId)
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const messages = (data || []).map((m) => ({
            id: m.id,
            petId: m.pet_id,
            userId: m.user_id,
            message: m.message,
            nickname: m.nickname,
            createdAt: m.created_at,
        }));

        return NextResponse.json({ messages });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

/** POST: 위로 메시지 작성 */
export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    try {
        // 차단 유저 작성 차단 (어뷰징 방지)
        const banCheckSupabase = createAdminSupabase();
        const { data: profileBan } = await banCheckSupabase
            .from("profiles")
            .select("is_banned")
            .eq("id", user.id)
            .single();
        if (profileBan?.is_banned) {
            return NextResponse.json({ error: "이용이 제한된 계정입니다" }, { status: 403 });
        }

        const { petId, message } = await request.json();
        if (!petId || !message) {
            return NextResponse.json({ error: "petId와 message가 필요합니다" }, { status: 400 });
        }
        if (message.length > 200) {
            return NextResponse.json({ error: "200자 이내로 작성해주세요" }, { status: 400 });
        }

        const supabase = createAdminSupabase();

        // 닉네임 조회
        const { data: profile } = await supabase
            .from("profiles")
            .select("nickname")
            .eq("id", user.id)
            .single();

        const nickname = profile?.nickname || user.user_metadata?.nickname || "익명";

        const { data, error } = await supabase
            .from("pet_condolence_messages")
            .upsert(
                {
                    pet_id: petId,
                    user_id: user.id,
                    message: message.trim(),
                    nickname,
                },
                { onConflict: "pet_id,user_id" }
            )
            .select("id, pet_id, user_id, message, nickname, created_at")
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json({ error: "이미 위로의 말을 남기셨습니다" }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            message: {
                id: data.id,
                petId: data.pet_id,
                userId: data.user_id,
                message: data.message,
                nickname: data.nickname,
                createdAt: data.created_at,
            },
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

/** DELETE: 위로 메시지 삭제 */
export async function DELETE(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const messageId = request.nextUrl.searchParams.get("id");
    if (!messageId) {
        return NextResponse.json({ error: "id가 필요합니다" }, { status: 400 });
    }

    try {
        const supabase = createAdminSupabase();

        // 메시지 조회
        const { data: msg } = await supabase
            .from("pet_condolence_messages")
            .select("id, user_id, pet_id")
            .eq("id", messageId)
            .single();

        if (!msg) {
            return NextResponse.json({ error: "메시지를 찾을 수 없습니다" }, { status: 404 });
        }

        // 권한 확인: 작성자 본인 / 펫 소유자 / 관리자
        const isAuthor = msg.user_id === user.id;
        const isAdmin = ADMIN_EMAILS.includes(user.email || "");

        let isPetOwner = false;
        if (!isAuthor && !isAdmin) {
            const { data: pet } = await supabase
                .from("pets")
                .select("user_id")
                .eq("id", msg.pet_id)
                .single();
            isPetOwner = pet?.user_id === user.id;
        }

        if (!isAuthor && !isPetOwner && !isAdmin) {
            // DB is_admin도 체크
            const { data: profile } = await supabase
                .from("profiles")
                .select("is_admin")
                .eq("id", user.id)
                .single();
            if (!profile?.is_admin) {
                return NextResponse.json({ error: "삭제 권한이 없습니다" }, { status: 403 });
            }
        }

        const { error } = await supabase
            .from("pet_condolence_messages")
            .delete()
            .eq("id", messageId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
