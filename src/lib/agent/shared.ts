/**
 * agent/shared.ts - Supabase/OpenAI 싱글턴 초기화 + DB 호환성 유틸
 *
 * 다른 agent 모듈이 공통으로 사용하는 인프라 레이어.
 * 이 파일만 Supabase/OpenAI 인스턴스를 관리하고, 나머지 모듈은 여기서 import한다.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// ---- Supabase 서버 클라이언트 (지연 초기화 - service role key로 RLS 우회) ----

let supabaseServer: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (!supabaseServer) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        // 서버 사이드에서는 service role key 사용 (RLS 우회)
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // service role key가 있으면 사용, 없으면 anon key fallback
        const key = serviceKey || anonKey;

        if (!url || !key) {
            throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
        }

        supabaseServer = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return supabaseServer;
}

// ---- chat_mode 컬럼 존재 여부 캐시 (DB 마이그레이션 전후 호환) ----

let chatModeColumnExists: boolean | null = null;

/**
 * chat_mode 컬럼 존재 여부 확인 (1회 체크 후 캐시)
 * DB 마이그레이션(20260226_chat_mode_column.sql) 실행 전후 모두 안전하게 동작
 */
export async function hasChatModeColumn(): Promise<boolean> {
    if (chatModeColumnExists !== null) return chatModeColumnExists;

    try {
        const { error } = await getSupabase()
            .from("chat_messages")
            .select("chat_mode")
            .limit(0);

        if (!error) {
            chatModeColumnExists = true;
        } else if (error.code === "42703" || error.message?.includes("column")) {
            // 컬럼이 실제로 없는 경우만 false로 캐싱
            chatModeColumnExists = false;
        }
        // 그 외 에러(네트워크 등)는 캐싱하지 않음 → 다음 호출 시 재시도
    } catch {
        // 네트워크 에러: 캐싱하지 않음
    }

    return chatModeColumnExists ?? false;
}

// ---- OpenAI 클라이언트 (지연 초기화) ----

let openaiClient: OpenAI | null = null;

export function getOpenAI(): OpenAI {
    if (!openaiClient) {
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiClient;
}
