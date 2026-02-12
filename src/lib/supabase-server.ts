/**
 * 서버 사이드 Supabase 유틸리티
 * API 라우트에서 인증에 사용
 *
 * 방법 1: Authorization 헤더의 Bearer 토큰으로 인증 (권장)
 * 방법 2: 쿠키 기반 세션 (미들웨어 필요, 현재 미사용)
 */

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

function getEnv() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
    return { url, key };
}

/**
 * API Route Handler용 Supabase 클라이언트 생성
 * Authorization 헤더에서 JWT 토큰을 읽어 인증
 */
export async function createServerSupabase() {
    const { url, key } = getEnv();
    const headerStore = await headers();
    const authHeader = headerStore.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(url, key, {
        global: {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
    });

    return supabase;
}

/**
 * 현재 인증된 사용자 가져오기
 * Authorization 헤더의 JWT 토큰으로 사용자 조회
 */
export async function getAuthUser() {
    const { url, key } = getEnv();
    const headerStore = await headers();
    const authHeader = headerStore.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
        return null;
    }

    const supabase = createClient(url, key, {
        global: {
            headers: { Authorization: `Bearer ${token}` },
        },
    });

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return null;
    }

    return user;
}
