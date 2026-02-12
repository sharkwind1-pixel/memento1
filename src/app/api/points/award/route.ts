/**
 * 포인트 적립 API
 * POST: 클라이언트에서 특정 활동에 대한 포인트 적립 요청
 *
 * 보안: 세션 기반 인증 + 허용된 액션 타입만 처리
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase-server";
import { awardPoints } from "@/lib/points";
import type { PointAction } from "@/types";

export const dynamic = "force-dynamic";

// 클라이언트에서 호출 가능한 액션 타입 (서버사이드에서 이미 처리하는 것은 제외)
const ALLOWED_CLIENT_ACTIONS: PointAction[] = [
    "pet_registration",
    "timeline_entry",
    "photo_upload",
    "write_comment",
];

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase 환경변수 없음");
    return createClient(url, key);
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { actionType, metadata } = body as {
            actionType: PointAction;
            metadata?: Record<string, string>;
        };

        // 허용된 액션 타입인지 검증
        if (!actionType || !ALLOWED_CLIENT_ACTIONS.includes(actionType)) {
            return NextResponse.json(
                { error: "허용되지 않은 액션 타입입니다" },
                { status: 400 }
            );
        }

        const supabase = getSupabase();
        const result = await awardPoints(supabase, user.id, actionType, metadata);

        return NextResponse.json(result);
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
