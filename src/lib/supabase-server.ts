/**
 * 서버 사이드 Supabase 클라이언트
 * API 라우트에서 세션 기반 인증에 사용
 */

import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * API Route Handler용 Supabase 클라이언트 생성
 * 쿠키에서 세션을 자동으로 가져옴
 */
export async function createServerSupabase() {
    const cookieStore = await cookies();

    return createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                } catch {
                    // Route Handler에서는 set이 실패할 수 있음 (읽기 전용 컨텍스트)
                    // 이 경우 middleware에서 처리되므로 무시
                }
            },
        },
    });
}

/**
 * 현재 인증된 사용자 가져오기
 * @returns 사용자 정보 또는 null
 */
export async function getAuthUser() {
    const supabase = await createServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return null;
    }

    return user;
}
