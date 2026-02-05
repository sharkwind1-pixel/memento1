/**
 * 개별 리마인더 API
 * PUT: 리마인더 수정/토글
 * DELETE: 리마인더 삭제
 *
 * 보안: 세션 기반 인증, 소유권 검증, Rate Limiting, VPN 차단, 입력값 검증
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import {
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
    sanitizeInput,
    checkVPN,
    getVPNBlockResponse
} from "@/lib/rate-limit";

/**
 * 리마인더 소유권 검증
 */
async function verifyReminderOwnership(reminderId: string, userId: string) {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
        .from("pet_reminders")
        .select("id, user_id")
        .eq("id", reminderId)
        .single();

    if (error || !data) {
        return { valid: false, error: "Reminder not found" };
    }

    if (data.user_id !== userId) {
        return { valid: false, error: "Access denied" };
    }

    return { valid: true, error: null };
}

// 리마인더 수정
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Rate Limit 체크
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        // 2. VPN 체크
        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            console.warn(`[Security] VPN blocked on reminder update: ${clientIP} - ${vpnCheck.reason}`);
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 3. 세션에서 사용자 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;

        // 4. 소유권 검증
        const ownership = await verifyReminderOwnership(id, user.id);
        if (!ownership.valid) {
            return NextResponse.json(
                { error: ownership.error },
                { status: ownership.error === "Reminder not found" ? 404 : 403 }
            );
        }

        const body = await request.json();
        const supabase = await createServerSupabase();

        // 토글만 하는 경우
        if (body.toggleEnabled !== undefined) {
            const { data, error } = await supabase
                .from("pet_reminders")
                .update({ enabled: body.toggleEnabled })
                .eq("id", id)
                .eq("user_id", user.id)
                .select()
                .single();

            if (error) {
                return NextResponse.json(
                    { error: "Failed to toggle reminder" },
                    { status: 500 }
                );
            }

            return NextResponse.json({ success: true, enabled: data.enabled });
        }

        // 전체 수정 (입력값 검증)
        const updateData: Record<string, unknown> = {};

        if (body.title) updateData.title = sanitizeInput(body.title).slice(0, 200);
        if (body.description !== undefined) updateData.description = body.description ? sanitizeInput(body.description).slice(0, 1000) : null;
        if (body.type) updateData.type = sanitizeInput(body.type).slice(0, 50);
        if (body.enabled !== undefined) updateData.enabled = body.enabled;

        if (body.schedule) {
            if (body.schedule.type) updateData.schedule_type = body.schedule.type;
            if (body.schedule.time) updateData.schedule_time = body.schedule.time;
            if (body.schedule.dayOfWeek !== undefined) updateData.schedule_day_of_week = body.schedule.dayOfWeek;
            if (body.schedule.dayOfMonth !== undefined) updateData.schedule_day_of_month = body.schedule.dayOfMonth;
            if (body.schedule.date !== undefined) updateData.schedule_date = body.schedule.date;
        }

        // 트리거 기록 업데이트
        if (body.markTriggered) {
            updateData.last_triggered = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from("pet_reminders")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { error: "Failed to update reminder" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, reminder: data });
    } catch {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// 리마인더 삭제
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Rate Limit 체크
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        // 2. VPN 체크
        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            console.warn(`[Security] VPN blocked on reminder delete: ${clientIP} - ${vpnCheck.reason}`);
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 3. 세션에서 사용자 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;

        // 4. 소유권 검증
        const ownership = await verifyReminderOwnership(id, user.id);
        if (!ownership.valid) {
            return NextResponse.json(
                { error: ownership.error },
                { status: ownership.error === "Reminder not found" ? 404 : 403 }
            );
        }

        const supabase = await createServerSupabase();

        const { error } = await supabase
            .from("pet_reminders")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) {
            return NextResponse.json(
                { error: "Failed to delete reminder" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
