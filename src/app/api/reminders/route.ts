/**
 * 리마인더 API
 * GET: 리마인더 목록 조회
 * POST: 리마인더 생성
 *
 * 보안: 세션 기반 인증, Rate Limiting, VPN 차단, 입력값 검증
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
        // 1. Rate Limit 체크
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "general");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        // 2. 세션에서 사용자 확인
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
    } catch {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// 리마인더 생성
export async function POST(request: NextRequest) {
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
            console.warn(`[Security] VPN blocked on reminder create: ${clientIP} - ${vpnCheck.reason}`);
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

        const body = await request.json();
        const { petId, type, title, description, schedule } = body;

        if (!petId || !type || !title || !schedule || !schedule.type || !schedule.time) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // 4. 입력값 검증
        const sanitizedTitle = sanitizeInput(title).slice(0, 200);
        const sanitizedDescription = description ? sanitizeInput(description).slice(0, 1000) : undefined;
        const sanitizedType = sanitizeInput(type).slice(0, 50);

        // type 화이트리스트 (DB CHECK 제약과 동일, 미리 400으로 막아 깔끔한 에러)
        const ALLOWED_TYPES = ["walk", "meal", "medicine", "vaccine", "grooming", "vet", "custom"];
        if (!ALLOWED_TYPES.includes(sanitizedType)) {
            return NextResponse.json(
                { error: `Invalid reminder type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
                { status: 400 }
            );
        }

        // schedule_type 화이트리스트
        const ALLOWED_SCHEDULE_TYPES = ["daily", "weekly", "monthly", "once"];
        if (!ALLOWED_SCHEDULE_TYPES.includes(schedule.type)) {
            return NextResponse.json(
                { error: `Invalid schedule type. Allowed: ${ALLOWED_SCHEDULE_TYPES.join(", ")}` },
                { status: 400 }
            );
        }

        // once 과거 날짜 차단 (서버 검증 — 클라 우회 방어)
        if (schedule.type === "once") {
            if (!schedule.date || !/^\d{4}-\d{2}-\d{2}$/.test(schedule.date)) {
                return NextResponse.json(
                    { error: "한 번만 알림은 YYYY-MM-DD 형식의 date 필드가 필수예요." },
                    { status: 400 }
                );
            }
            const todayStr = new Date().toISOString().split("T")[0];
            if (schedule.date < todayStr) {
                return NextResponse.json(
                    { error: "이미 지난 날짜는 등록할 수 없어요." },
                    { status: 400 }
                );
            }
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
                type: sanitizedType,
                title: sanitizedTitle,
                description: sanitizedDescription,
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
    } catch {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
