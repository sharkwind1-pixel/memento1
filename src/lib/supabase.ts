/**
 * Supabase 클라이언트 설정
 * 지연 초기화로 빌드 시점 에러 방지
 *
 * navigator.locks (Web Locks API) 데드락을 방지하면서도
 * 세션 직렬화를 유지하기 위해 Promise 기반 뮤텍스를 사용한다.
 * @see https://github.com/supabase/supabase-js/issues/1594
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Promise 기반 뮤텍스 Lock
 *
 * navigator.locks API의 데드락 문제를 우회하면서도
 * 세션 읽기/쓰기의 직렬화를 보장한다.
 * - noOpLock: 동시 접근으로 세션이 소실되는 race condition 발생
 * - navigator.locks: OAuth 리다이렉트 시 AbortError 데드락 발생
 * - promiseLock: 둘 다 해결 (직렬화 + 데드락 방지)
 */
const lockMap = new Map<string, Promise<unknown>>();

const promiseLock = async <R>(
    name: string,
    acquireTimeout: number,
    fn: () => Promise<R>
): Promise<R> => {
    const prevLock = lockMap.get(name) ?? Promise.resolve();

    let resolveCurrent: () => void;
    const currentLock = new Promise<void>((resolve) => {
        resolveCurrent = resolve;
    });
    lockMap.set(name, currentLock);

    // 타임아웃 설정 (acquireTimeout ms 이내에 이전 lock이 풀리지 않으면 강제 진행)
    const timeout = acquireTimeout > 0 ? acquireTimeout : 5000;
    await Promise.race([
        prevLock,
        new Promise<void>((resolve) => setTimeout(resolve, timeout)),
    ]);

    try {
        return await fn();
    } finally {
        resolveCurrent!();
        // 현재 lock이 아직 자기 것이면 정리
        if (lockMap.get(name) === currentLock) {
            lockMap.delete(name);
        }
    }
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
                lock: promiseLock,
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
