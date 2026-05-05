/**
 * 푸시 알림 토큰 등록
 * POST /api/push/register { expoPushToken: string, platform: "ios" | "android" }
 *
 * 모바일 앱에서 expo-notifications로 발급받은 Expo Push Token을 profiles 테이블에 저장.
 * 토큰이 바뀌면 (재설치/권한 재허용) 새 토큰으로 덮어씀.
 *
 * 보안: getAuthUser()로 인증 검증. 본인 토큰만 저장 가능.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "인증 필요" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const { expoPushToken, platform } = body as {
            expoPushToken?: string;
            platform?: string;
        };

        if (typeof expoPushToken !== "string" || !expoPushToken.startsWith("ExponentPushToken[")) {
            return NextResponse.json({ error: "유효하지 않은 expoPushToken" }, { status: 400 });
        }
        if (platform !== "ios" && platform !== "android") {
            return NextResponse.json({ error: "platform은 ios 또는 android" }, { status: 400 });
        }

        const adminSupabase = createAdminSupabase();
        const { error } = await adminSupabase
            .from("profiles")
            .update({
                expo_push_token: expoPushToken,
                push_platform: platform,
                push_registered_at: new Date().toISOString(),
            })
            .eq("id", user.id);

        if (error) {
            console.error("[push/register] DB 업데이트 실패:", error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("[push/register] 예외:", e);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

/**
 * DELETE /api/push/register
 * 로그아웃 시 토큰 제거.
 */
export async function DELETE() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "인증 필요" }, { status: 401 });
        }

        const adminSupabase = createAdminSupabase();
        const { error } = await adminSupabase
            .from("profiles")
            .update({
                expo_push_token: null,
                push_platform: null,
                push_registered_at: null,
            })
            .eq("id", user.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
