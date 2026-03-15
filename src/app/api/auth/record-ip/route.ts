/**
 * /api/auth/record-ip
 * 로그인 시 IP를 기록하고, 같은 IP에 다른 계정이 이미 연결되어 있는지 확인
 *
 * 정책:
 * - 같은 IP에서는 1개 계정만 허용 (관리자 예외)
 * - 관리자(ADMIN_EMAILS) 계정은 IP 제한 없음
 * - 관리자 IP에서 접속하는 모든 계정도 제한 없음
 *
 * 주의: profiles.last_ip 컬럼이 DB에 존재하지 않을 수 있음
 *       → 컬럼 없으면 IP 기록/조회 건너뜀 (기능 graceful 비활성)
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase-server";
import { getClientIP } from "@/lib/rate-limit";
import { ADMIN_EMAILS } from "@/config/constants";

function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}


async function tryUpdateLastIp(supabase: any, userId: string, ip: string): Promise<boolean> {
    try {
        // last_ip 컬럼이 DB에 존재하지 않을 수 있음 — 에러 시 무시
        const { error } = await supabase
            .from("profiles")
            .update({ last_ip: ip })
            .eq("id", userId);
        return !error;
    } catch {
        return false;
    }
}


async function tryQueryByLastIp(supabase: any, ip: string, excludeUserId: string): Promise<Array<{ id: string; email: string; is_admin: boolean }> | null> {
    try {
        // last_ip 컬럼이 DB에 존재하지 않을 수 있음 — 에러 시 null 반환
        const { data, error } = await supabase
            .from("profiles")
            .select("id, email, is_admin")
            .eq("last_ip", ip)
            .neq("id", excludeUserId);
        if (error) return null;
        return data;
    } catch {
        return null;
    }
}

export async function POST() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clientIP = await getClientIP();
        if (clientIP === "unknown") {
            return NextResponse.json({ allowed: true, warning: "ip_unknown" });
        }

        const supabase = getServiceSupabase();
        if (!supabase) {
            console.error("[auth/record-ip] Service Supabase unavailable");
            return NextResponse.json({ allowed: true, warning: "db_unavailable" });
        }

        // 현재 유저의 이메일 추출 (소셜 로그인도 포함)
        const userEmail = user.email || user.user_metadata?.email || "";
        const identityEmails = (user.identities || [])
            .map(id => id.identity_data?.email as string | undefined)
            .filter(Boolean) as string[];
        const allEmails = [userEmail, ...identityEmails].filter(Boolean);

        // 관리자 여부 확인
        const isCurrentUserAdmin = allEmails.some(e => ADMIN_EMAILS.includes(e));

        // 관리자 계정은 무조건 통과 + IP 기록만
        if (isCurrentUserAdmin) {
            await tryUpdateLastIp(supabase, user.id, clientIP);
            return NextResponse.json({ allowed: true });
        }

        // 같은 IP를 쓰고 있는 다른 계정 조회
        const existingProfiles = await tryQueryByLastIp(supabase, clientIP, user.id);

        if (existingProfiles && existingProfiles.length > 0) {
            const otherIsAdmin = existingProfiles.some(p => {
                if (p.is_admin === true) return true;
                if (p.email && ADMIN_EMAILS.includes(p.email)) return true;
                return false;
            });

            if (!otherIsAdmin) {
                console.warn(
                    `[Security] IP conflict: ip=${clientIP}, user=${user.id}, existing=${existingProfiles.map(p => p.id).join(",")}`
                );
                return NextResponse.json({
                    allowed: false,
                    reason: "이 네트워크에서 이미 다른 계정이 사용 중입니다. 하나의 네트워크에서는 하나의 계정만 이용할 수 있습니다.",
                });
            }
        }

        // IP 기록 갱신
        await tryUpdateLastIp(supabase, user.id, clientIP);

        return NextResponse.json({ allowed: true });
    } catch (error) {
        console.error("[auth/record-ip] Error:", error instanceof Error ? error.message : error);
        // fail-closed: 에러 시 차단 (보안 우선)
        return NextResponse.json({ allowed: false, reason: "시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요." });
    }
}
