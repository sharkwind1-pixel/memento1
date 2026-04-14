/**
 * 관리자 프로필 업데이트 API
 * PATCH: 관리자가 다른 유저의 프로필 민감 필드를 수정
 *
 * 문제 배경: profiles 테이블에 protect_sensitive_profile_columns 트리거가 있어서
 * 클라이언트(authenticated role)에서 직접 UPDATE하면 민감 컬럼이 silent revert됨.
 * service_role key로만 민감 컬럼 수정 가능.
 *
 * 보안: 세션 기반 인증 + 관리자 권한 검증 + service_role로 실제 업데이트
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";

export const dynamic = "force-dynamic";

/** 허용되는 업데이트 필드 (profiles 테이블에 실제 존재하는 컬럼만) */
type AllowedField =
    | "is_admin"
    | "is_premium"
    | "is_banned"
    | "points"
    | "total_points_earned"
    | "premium_started_at"
    | "premium_expires_at"
    | "premium_plan"
    | "tutorial_completed_at"
    | "onboarding_completed_at"
    | "user_type"
    | "onboarding_data"
    | "onboarding_quests";

const ALLOWED_FIELDS: AllowedField[] = [
    "is_admin",
    "is_premium",
    "is_banned",
    "points",
    "total_points_earned",
    "premium_started_at",
    "premium_expires_at",
    "premium_plan",
    "tutorial_completed_at",
    "onboarding_completed_at",
    "user_type",
    "onboarding_data",
    "onboarding_quests",
];

export async function PATCH(request: NextRequest) {
    try {
        // 1. 인증 확인
        const adminUser = await getAuthUser();
        if (!adminUser) {
            return NextResponse.json(
                { error: "로그인이 필요합니다" },
                { status: 401 }
            );
        }

        // 2. 관리자 권한 확인 (이메일 + DB is_admin)
        const isEmailAdmin = ADMIN_EMAILS.includes(adminUser.email || "");

        let isDbAdmin = false;
        if (!isEmailAdmin) {
            const adminSupabase = createAdminSupabase();
            const { data: profile } = await adminSupabase
                .from("profiles")
                .select("is_admin")
                .eq("id", adminUser.id)
                .single();
            isDbAdmin = profile?.is_admin === true;
        }

        if (!isEmailAdmin && !isDbAdmin) {
            return NextResponse.json(
                { error: "관리자 권한이 필요합니다" },
                { status: 403 }
            );
        }

        // 3. 요청 파싱
        const body = await request.json();
        const { targetUserId, updates } = body as {
            targetUserId: string;
            updates: Record<string, unknown>;
        };

        if (!targetUserId) {
            return NextResponse.json(
                { error: "targetUserId가 필요합니다" },
                { status: 400 }
            );
        }

        if (!updates || typeof updates !== "object" || Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: "업데이트할 필드가 필요합니다" },
                { status: 400 }
            );
        }

        // 4. 허용된 필드만 필터링
        const sanitizedUpdates: Record<string, unknown> = {};
        for (const key of Object.keys(updates)) {
            if (ALLOWED_FIELDS.includes(key as AllowedField)) {
                sanitizedUpdates[key] = updates[key];
            }
        }

        if (Object.keys(sanitizedUpdates).length === 0) {
            return NextResponse.json(
                { error: "유효한 업데이트 필드가 없습니다" },
                { status: 400 }
            );
        }

        // 5. service_role로 업데이트 (트리거 우회)
        const adminSupabase = createAdminSupabase();
        const { data, error } = await adminSupabase
            .from("profiles")
            .update(sanitizedUpdates)
            .eq("id", targetUserId)
            .select("id, is_admin, is_premium, is_banned, points, total_points_earned, premium_plan, premium_expires_at")
            .single();

        if (error) {
            console.error("[Admin UpdateProfile] DB 에러:", error);
            return NextResponse.json(
                { error: `프로필 업데이트 실패: ${error.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            profile: data,
        });
    } catch (err) {
        console.error("[Admin UpdateProfile] 서버 오류:", err);
        return NextResponse.json(
            { error: "프로필 업데이트에 실패했습니다" },
            { status: 500 }
        );
    }
}
