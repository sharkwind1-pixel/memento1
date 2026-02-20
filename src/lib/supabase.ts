/**
 * Supabase 클라이언트 설정
 * 지연 초기화로 빌드 시점 에러 방지
 *
 * Web Locks API 데드락 방지를 위해 noOpLock 사용
 * @see https://github.com/supabase/supabase-js/issues/1594
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * navigator.locks 데드락 방지용 no-op lock
 * Supabase auth-js의 _acquireLock에서 AbortError가 발생하는
 * 알려진 버그를 우회한다 (특히 OAuth 리다이렉트 플로우에서).
 */
const noOpLock = async <R>(
    _name: string,
    _acquireTimeout: number,
    fn: () => Promise<R>
): Promise<R> => {
    return await fn();
};

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
    if (!supabaseInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
        }

        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                lock: noOpLock,
            },
        });
    }
    return supabaseInstance;
}

// 기존 코드 호환성을 위한 getter (deprecated - getSupabaseClient() 사용 권장)
export const supabase = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        return (getSupabaseClient() as any)[prop];
    }
});
