/**
 * OAuth 콜백 — Supabase 세션 교환 처리
 *
 * 시스템 브라우저 / Custom Tabs가 mementoani:// 또는 exp:// deep link로 앱을 열었을 때
 * 이 화면이 code를 꺼내 세션을 교환하고 탭으로 보낸다.
 *
 * 두 단계 시도:
 * 1) supabase.auth.exchangeCodeForSession(code) — 정상 케이스
 * 2) 1번 실패 시: AuthContext가 백업해둔 PKCE verifier로 직접 /auth/v1/token POST
 *    (cold start로 supabase-js가 verifier를 잃어버린 케이스 방어)
 */

import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { COLORS } from "@/lib/theme";
import { VERIFIER_BACKUP_KEY } from "@/contexts/AuthContext";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export default function AuthCallbackScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
    const [message, setMessage] = useState("로그인 처리 중...");

    useEffect(() => {
        (async () => {
            if (params.error) {
                setMessage(params.error_description ?? params.error);
                setTimeout(() => router.replace("/(auth)/login"), 1500);
                return;
            }

            const code = params.code;
            if (!code) {
                setMessage("인증 코드를 받지 못했습니다.");
                setTimeout(() => router.replace("/(auth)/login"), 1500);
                return;
            }

            // 1단계: 표준 supabase exchange
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (!exchangeError) {
                router.replace("/(tabs)");
                return;
            }

            console.log(`[callback] exchangeCodeForSession 실패: ${exchangeError.message} → 백업 verifier로 폴백`);

            // 2단계: 백업 verifier로 직접 token endpoint POST
            const verifier = await AsyncStorage.getItem(VERIFIER_BACKUP_KEY);
            if (!verifier) {
                setMessage("인증 정보를 찾지 못했어요. 다시 로그인해주세요.");
                setTimeout(() => router.replace("/(auth)/login"), 1500);
                return;
            }

            try {
                const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": SUPABASE_ANON_KEY,
                    },
                    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
                });

                if (!tokenRes.ok) {
                    const errText = await tokenRes.text();
                    console.log(`[callback] token endpoint ${tokenRes.status}: ${errText.slice(0, 200)}`);
                    setMessage(`로그인 실패 (${tokenRes.status})`);
                    setTimeout(() => router.replace("/(auth)/login"), 1500);
                    return;
                }

                const tokens = await tokenRes.json() as {
                    access_token: string;
                    refresh_token: string;
                };

                // 백업 verifier는 1회용이므로 정리
                await AsyncStorage.removeItem(VERIFIER_BACKUP_KEY);

                const { error: setErr } = await supabase.auth.setSession({
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                });

                if (setErr) {
                    setMessage(`세션 설정 실패: ${setErr.message}`);
                    setTimeout(() => router.replace("/(auth)/login"), 1500);
                    return;
                }

                console.log(`[callback] 폴백 경로로 세션 교환 성공`);
                router.replace("/(tabs)");
            } catch (e) {
                console.log(`[callback] 폴백 예외: ${(e as Error).message}`);
                setMessage("로그인 중 오류가 발생했어요.");
                setTimeout(() => router.replace("/(auth)/login"), 1500);
            }
        })();
    }, [params.code, params.error]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={COLORS.memento[500]} />
            <Text style={styles.message}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.white,
        paddingHorizontal: 24,
    },
    message: { marginTop: 16, fontSize: 14, color: COLORS.gray[500], textAlign: "center" },
});
