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

import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clientIP = await getClientIP();
        const supabase = getServiceSupabase();
        if (!supabase) {
            return NextResponse.json({ allowed: true, warning: "db_unavailable" });
        }

        // 디바이스 핑거프린트 (클라이언트에서 전송)
        let deviceFingerprint: string | null = null;
        try {
            const body = await request.json();
            deviceFingerprint = body.fingerprint || null;
        } catch {
            // body 없으면 무시
        }

        // 현재 유저의 이메일 추출 (소셜 로그인도 포함)
        const userEmail = user.email || user.user_metadata?.email || "";
        const identityEmails = (user.identities || [])
            .map(id => id.identity_data?.email as string | undefined)
            .filter(Boolean) as string[];
        const allEmails = [userEmail, ...identityEmails].filter(Boolean);

        // 관리자 여부 확인
        const isCurrentUserAdmin = allEmails.some(e => ADMIN_EMAILS.includes(e));

        // IP 기록 + 핑거프린트 저장
        if (clientIP !== "unknown") {
            await tryUpdateLastIp(supabase, user.id, clientIP);
        }
        if (deviceFingerprint) {
            try {
                await supabase
                    .from("profiles")
                    .update({ device_fingerprint: deviceFingerprint })
                    .eq("id", user.id);
            } catch {
                // 컬럼 없으면 무시 (마이그레이션 전)
            }
        }

        // 관리자는 항상 통과
        if (isCurrentUserAdmin) {
            return NextResponse.json({ allowed: true });
        }

        // 디바이스 핑거프린트 기반 다중 계정 탐지 (IP 차단 대체)
        // 같은 디바이스에서 3개 이상 계정이면 경고 (차단은 아직 안 함, 텔레그램 알림만)
        if (deviceFingerprint) {
            try {
                const { data: sameDevice } = await supabase
                    .from("profiles")
                    .select("id, email")
                    .eq("device_fingerprint", deviceFingerprint)
                    .neq("id", user.id);

                if (sameDevice && sameDevice.length >= 2) {
                    // 같은 디바이스에서 3개 이상 계정 → 텔레그램 경고
                    import("@/lib/telegram").then(({ notifyError }) =>
                        notifyError({
                            endpoint: "multi-account-alert",
                            error: `같은 디바이스에서 ${sameDevice.length + 1}개 계정 감지. user=${user.id}, email=${userEmail}, 기존계정=${sameDevice.map(p => p.email).join(",")}`,
                        })
                    ).catch(() => {});
                }
            } catch {
                // 컬럼 없으면 무시
            }
        }

        // IP 기반 차단은 더 이상 하지 않음 (가족/회사 유저 피해 방지)
        // 대신 위의 디바이스 핑거프린트로 모니터링

        return NextResponse.json({ allowed: true });
    } catch (error) {
        console.error("[auth/record-ip] Error:", error instanceof Error ? error.message : error);
        // fail-open: 유저 확보 단계에서는 에러 시 통과 (차단보다 유입이 중요)
        return NextResponse.json({ allowed: true, warning: "system_error" });
    }
}
