/**
 * 리마인더 API
 * GET: 리마인더 목록 조회
 * POST: 리마인더 생성
 *
 * 세션 기반 인증 적용 - userId는 쿠키 세션에서 자동 추출
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";

// DB 조회 결과 타입
interface ReminderRow {
    id: string;
    pet_id: string;
    user_id: string;
    type: string;
    title: string;
    description?: string;
    schedule_type: string;
    schedule_time: string;
    schedule_day_of_week?: number;
    schedule_day_of_month?: number;
    schedule_date?: string;
    enabled: boolean;
    last_triggered?: string;
    created_at: string;
    pets?: {
        id: string;
        name: string;
        type: string;
        profile_image?: string;
    };
}

// 리마인더 목록 조회
export async function GET(request: NextRequest) {
    try {
        // 세션에서 사용자 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const petId = searchParams.get("petId");

        const supabase = await createServerSupabase();

        let query = supabase
            .from("pet_reminders")
            .select(`
                *,
                pets:pet_id (
                    id,
                    name,
                    type,
                    profile_image
                )
            `)
            .eq("user_id", user.id)
            .order("schedule_time", { ascending: true });

        if (petId) {
            query = query.eq("pet_id", petId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Failed to get reminders:", error);
            return NextResponse.json(
                { error: "Failed to get reminders" },
                { status: 500 }
            );
        }

        // 형식 변환
        const reminders = ((data || []) as ReminderRow[]).map((row) => ({
            id: row.id,
            petId: row.pet_id,
            userId: row.user_id,
            type: row.type,
            title: row.title,
            description: row.description,
            schedule: {
                type: row.schedule_type,
                time: row.schedule_time,
                dayOfWeek: row.schedule_day_of_week,
                dayOfMonth: row.schedule_day_of_month,
                date: row.schedule_date,
            },
            enabled: row.enabled,
            lastTriggered: row.last_triggered,
            createdAt: row.created_at,
            pet: row.pets ? {
                id: row.pets.id,
                name: row.pets.name,
                type: row.pets.type,
                profileImage: row.pets.profile_image,
            } : null,
        }));

        return NextResponse.json({ reminders });
    } catch (error) {
        console.error("Reminders GET error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// 리마인더 생성
export async function POST(request: NextRequest) {
    try {
        // 세션에서 사용자 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { petId, type, title, description, schedule } = body;

        if (!petId || !type || !title || !schedule) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const supabase = await createServerSupabase();

        // 펫이 해당 사용자 소유인지 확인
        const { data: pet, error: petError } = await supabase
            .from("pets")
            .select("id")
            .eq("id", petId)
            .eq("user_id", user.id)
            .single();

        if (petError || !pet) {
            return NextResponse.json(
                { error: "Pet not found or access denied" },
                { status: 403 }
            );
        }

        const { data, error } = await supabase
            .from("pet_reminders")
            .insert({
                user_id: user.id,
                pet_id: petId,
                type,
                title,
                description,
                schedule_type: schedule.type,
                schedule_time: schedule.time,
                schedule_day_of_week: schedule.dayOfWeek,
                schedule_day_of_month: schedule.dayOfMonth,
                schedule_date: schedule.date,
                enabled: true,
            })
            .select()
            .single();

        if (error) {
            console.error("Failed to create reminder:", error);
            return NextResponse.json(
                { error: "Failed to create reminder" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            reminder: {
                id: data.id,
                petId: data.pet_id,
                type: data.type,
                title: data.title,
                schedule: {
                    type: data.schedule_type,
                    time: data.schedule_time,
                },
            },
        });
    } catch (error) {
        console.error("Reminders POST error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
