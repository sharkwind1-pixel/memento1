/**
 * /api/auth/record-ip
 * 로그인 시 IP를 기록하고, 같은 IP에 다른 계정이 이미 연결되어 있는지 확인
 *
 * 정책:
 * - 같은 IP에서는 1개 계정만 허용 (관리자 예외)
 * - 관리자(ADMIN_EMAILS) 계정은 IP 제한 없음
 * - 관리자 IP에서 접속하는 모든 계정도 제한 없음
 * - last_login_at도 함께 갱신
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

export async function POST() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clientIP = await getClientIP();
        if (clientIP === "unknown") {
            // IP를 알 수 없으면 일단 통과 (로컬 개발 환경 등)
            return NextResponse.json({ allowed: true });
        }

        const supabase = getServiceSupabase();
        if (!supabase) {
            return NextResponse.json({ allowed: true }); // DB 접속 불가 시 통과
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
            await supabase
                .from("profiles")
                .update({ last_ip: clientIP })
                .eq("id", user.id);

            return NextResponse.json({ allowed: true });
        }

        // 같은 IP를 쓰고 있는 다른 계정 조회
        const { data: existingProfiles } = await supabase
            .from("profiles")
            .select("id, email, is_admin")
            .eq("last_ip", clientIP)
            .neq("id", user.id);

        if (existingProfiles && existingProfiles.length > 0) {
            // 다른 계정이 이 IP를 쓰고 있음
            // 그 계정이 관리자인지 확인 (관리자 IP면 다른 계정도 허용)
            const otherIsAdmin = existingProfiles.some(p => {
                // DB의 is_admin 체크
                if (p.is_admin === true) return true;
                // 이메일 기반 체크
                if (p.email && ADMIN_EMAILS.includes(p.email)) return true;
                return false;
            });

            if (!otherIsAdmin) {
                // 관리자가 아닌 다른 계정이 이 IP를 사용 중 → 차단
                console.warn(
                    `[Security] IP conflict: ip=${clientIP}, user=${user.id}, existing=${existingProfiles.map(p => p.id).join(",")}`
                );
                return NextResponse.json({
                    allowed: false,
                    reason: "이 네트워크에서 이미 다른 계정이 사용 중입니다. 하나의 네트워크에서는 하나의 계정만 이용할 수 있습니다.",
                });
            }
            // 관리자 IP이므로 다른 계정도 허용
        }

        // IP 기록 갱신
        await supabase
            .from("profiles")
            .update({ last_ip: clientIP })
            .eq("id", user.id);

        return NextResponse.json({ allowed: true });
    } catch (error) {
        console.error("[auth/record-ip] Error:", error instanceof Error ? error.message : error);
        // 에러 시 통과 (보안보다 가용성 우선)
        return NextResponse.json({ allowed: true });
    }
}
