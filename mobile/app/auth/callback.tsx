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
import { exchangeWithStoredVerifier } from "@/contexts/AuthContext";

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

            // 자동 경로(AuthContext.signInWithProvider)가 먼저 끝났는지 체크.
            // 이미 세션 있으면 같은 code 재사용 시도하지 않고 바로 탭으로 이동.
            // (이전 race로 "flow_state_not_found" 에러 나던 케이스 차단)
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace("/");
                return;
            }

            // 메모리에 있는 verifier로 직접 token endpoint POST
            const { error } = await exchangeWithStoredVerifier(undefined, code);

            // exchange 후에도 세션 한 번 더 확인 (자동 경로가 동시에 setSession했을 수 있음)
            const { data: { session: afterSession } } = await supabase.auth.getSession();
            if (afterSession) {
                router.replace("/");
                return;
            }

            if (error) {
                setMessage(`로그인 실패: ${error.message}`);
                setTimeout(() => router.replace("/(auth)/login"), 1500);
                return;
            }

            router.replace("/");
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
