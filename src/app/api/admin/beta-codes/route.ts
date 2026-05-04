/**
 * 관리자 베타 코드 생성/조회 API
 *
 * GET  /api/admin/beta-codes
 *   - 모든 베타 코드 목록 (최신순)
 *
 * POST /api/admin/beta-codes  { code?, max_uses?, points_reward?, discount_months?, expires_at?, note? }
 *   - 베타 코드 발급. code 미지정 시 자동 생성 (BETA-XXXXXX)
 *
 * 인증: 이메일 화이트리스트 OR profiles.is_admin
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";

export const dynamic = "force-dynamic";

async function ensureAdmin() {
    const user = await getAuthUser();
    if (!user) return { ok: false as const, status: 401, error: "로그인이 필요합니다" };
    const adminSupabase = createAdminSupabase();
    const isEmailAdmin = ADMIN_EMAILS.includes(user.email || "");
    let isDbAdmin = false;
    if (!isEmailAdmin) {
        const { data: profile } = await adminSupabase
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single();
        isDbAdmin = profile?.is_admin === true;
    }
    if (!isEmailAdmin && !isDbAdmin) {
        return { ok: false as const, status: 403, error: "관리자 권한이 필요합니다" };
    }
    return { ok: true as const, user, adminSupabase };
}

function randomCode(prefix = "BETA"): string {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0/O/1/I 제외
    let s = "";
    for (let i = 0; i < 6; i++) s += charset[Math.floor(Math.random() * charset.length)];
    return `${prefix}-${s}`;
}

export async function GET() {
    const ctx = await ensureAdmin();
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    const { data, error } = await ctx.adminSupabase
        .from("beta_codes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ codes: data ?? [] });
}

export async function POST(request: NextRequest) {
    const ctx = await ensureAdmin();
    if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    const body = await request.json().catch(() => ({}));
    const customCode = body?.code ? String(body.code).trim().toUpperCase() : null;
    const maxUses = Number.isFinite(body?.max_uses) ? Number(body.max_uses) : 1;
    const pointsReward = Number.isFinite(body?.points_reward) ? Number(body.points_reward) : 3000;
    const discountMonths = Number.isFinite(body?.discount_months) ? Number(body.discount_months) : 3;
    const expiresAt = body?.expires_at ?? null;
    const note = body?.note ? String(body.note).slice(0, 200) : null;
    const bulk = Number.isFinite(body?.bulk) ? Math.min(Math.max(Number(body.bulk), 1), 100) : 1;

    if (maxUses < 1 || maxUses > 10000) {
        return NextResponse.json({ error: "max_uses는 1~10000 범위여야 합니다." }, { status: 400 });
    }
    if (pointsReward < 0 || pointsReward > 100000) {
        return NextResponse.json({ error: "points_reward는 0~100000 범위여야 합니다." }, { status: 400 });
    }

    const inserts: Array<{
        code: string;
        max_uses: number;
        used_count: number;
        points_reward: number;
        discount_months: number;
        discount_percent: number;
        expires_at: string | null;
        note: string | null;
        created_by: string;
    }> = [];
    const usedCodes = new Set<string>();
    for (let i = 0; i < bulk; i++) {
        let codeValue: string;
        if (bulk === 1 && customCode) {
            codeValue = customCode;
        } else {
            do {
                codeValue = randomCode();
            } while (usedCodes.has(codeValue));
        }
        usedCodes.add(codeValue);
        inserts.push({
            code: codeValue,
            max_uses: maxUses,
            used_count: 0,
            points_reward: pointsReward,
            discount_months: discountMonths,
            discount_percent: 50,
            expires_at: expiresAt,
            note,
            created_by: ctx.user.id,
        });
    }

    // service_role 키이므로 RLS 우회. 충돌(duplicate code) 시 onConflict로 처리하지 않고 에러 노출.
    const { data, error } = await ctx.adminSupabase
        .from("beta_codes")
        .insert(inserts)
        .select("*");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ created: data ?? [] });
}
