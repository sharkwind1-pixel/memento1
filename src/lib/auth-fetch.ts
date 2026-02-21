/**
 * 인증된 API 호출 헬퍼
 * 모든 내부 API 호출에 Supabase 세션 토큰을 자동 첨부
 *
 * 서버 API 라우트가 쿠키 대신 Authorization 헤더로 인증하므로
 * 클라이언트에서 fetch할 때 반드시 이 함수를 사용
 */

import { supabase } from "@/lib/supabase";

/**
 * Authorization 헤더가 포함된 fetch
 * 세션이 없으면 토큰 없이 호출 (서버에서 401 반환)
 * FormData 전송 시 Content-Type을 설정하지 않음 (브라우저가 multipart/form-data + boundary 자동 설정)
 */
export async function authFetch(
    url: string,
    options?: RequestInit
): Promise<Response> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const isFormData = options?.body instanceof FormData;

    return fetch(url, {
        ...options,
        headers: {
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
            ...options?.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
}
