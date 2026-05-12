/**
 * OAuth 콜백 — deep link로 앱 깨운 케이스 처리
 *
 * 시스템 브라우저 / Custom Tabs가 mementoani:// 또는 exp:// deep link로 앱을 열면
 * 이 화면이 code 추출 → 메모리 verifier로 token endpoint POST → 탭 화면.
 */

import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { COLORS } from "@/lib/theme";
import { exchangeWithStoredVerifier, hasStoredVerifier } from "@/contexts/AuthContext";

export default function AuthCallbackScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        code?: string;
        token_hash?: string;
        type?: string;
        error?: string;
        error_description?: string;
    }>();
    const [message, setMessage] = useState("로그인 처리 중...");

    useEffect(() => {
        (async () => {
            if (params.error) {
                setMessage(params.error_description ?? params.error);
                setTimeout(() => router.replace("/(auth)/login"), 1500);
                return;
            }

            // 네이버 로그인: token_hash + type=magiclink로 세션 교환
            if (params.token_hash && params.type === "magiclink") {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) { router.replace("/(tabs)"); return; }

                const { error } = await supabase.auth.verifyOtp({
                    token_hash: params.token_hash,
                    type: "magiclink",
                });
                if (error) {
                    setMessage(`로그인 실패: ${error.message}`);
                    setTimeout(() => router.replace("/(auth)/login"), 1500);
                    return;
                }
                router.replace("/(tabs)");
                return;
            }

            const code = params.code;
            if (!code) {
                setMessage("인증 코드를 받지 못했습니다.");
                setTimeout(() => router.replace("/(auth)/login"), 1500);
                return;
            }

            // 자동 경로(AuthContext.signInWithProvider)가 먼저 끝났는지 체크.
            // 이미 세션 있으면 같은 code 재사용 시도하지 않고 바로 탭으로 이동.
            // (이전 race로 "flow_state_not_found" 에러 나던 케이스 차단)
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace("/(tabs)");
                return;
            }

            // 보안 차단: signInWithProvider가 dismiss 처리하면서 verifier 삭제했으면
            // 사용자가 OAuth를 명시적으로 취소한 것 → exchange 시도하지 말 것.
            // (Chrome SSO 자동 OAuth가 의도치 않게 다른 Google 계정으로 가입시키던 버그 차단)
            if (!hasStoredVerifier()) {
                console.log("[Auth callback] verifier 없음 — 사용자가 취소함, exchange skip");
                router.replace("/(auth)/login");
                return;
            }

            // 메모리에 있는 verifier로 직접 token endpoint POST
            const { error } = await exchangeWithStoredVerifier(undefined, code);

            // exchange 후에도 세션 한 번 더 확인 (자동 경로가 동시에 setSession했을 수 있음)
            const { data: { session: afterSession } } = await supabase.auth.getSession();
            if (afterSession) {
                router.replace("/(tabs)");
                return;
            }

            if (error) {
                setMessage(`로그인 실패: ${error.message}`);
                setTimeout(() => router.replace("/(auth)/login"), 1500);
                return;
            }

            router.replace("/(tabs)");
        })();
    }, [params.code, params.error, params.token_hash, params.type, params.error_description, router]);

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
