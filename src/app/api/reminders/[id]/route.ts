/**
 * 개별 리마인더 API
 * PUT: 리마인더 수정/토글
 * DELETE: 리마인더 삭제
 *
 * 세션 기반 인증 + 소유권 검증 적용
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";

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
        // 세션에서 사용자 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;

        // 소유권 검증
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

        // 전체 수정
        const updateData: Record<string, unknown> = {};

        if (body.title) updateData.title = body.title;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.type) updateData.type = body.type;
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
            console.error("Failed to update reminder:", error);
            return NextResponse.json(
                { error: "Failed to update reminder" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, reminder: data });
    } catch (error) {
        console.error("Reminder PUT error:", error);
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
        // 세션에서 사용자 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;

        // 소유권 검증
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
            console.error("Failed to delete reminder:", error);
            return NextResponse.json(
                { error: "Failed to delete reminder" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Reminder DELETE error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
