/**
 * Supabase 모바일 클라이언트
 * AsyncStorage + PKCE flow (refresh_token 정상 발급용)
 *
 * V2 인계: LoggedStorage wrapper 제거 — AsyncStorage 직접 사용.
 * 디버그가 필요하면 onAuthStateChange 콜백에서 로그.
 */

import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
    },
});
