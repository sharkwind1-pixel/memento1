/**
 * OAuth 콜백 — Supabase 세션 교환 처리
 *
 * 보통은 WebBrowser.openAuthSessionAsync에서 AuthContext가 자체 처리하지만,
 * 시스템 브라우저가 mementoani://auth/callback 딥링크로 앱을 열어버린 경우
 * 이 화면이 code를 꺼내 세션을 교환하고 탭으로 보낸다.
 */

import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { COLORS } from "@/lib/theme";

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

            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
                setMessage("세션 교환 실패: " + error.message);
                setTimeout(() => router.replace("/(auth)/login"), 1500);
                return;
            }

            router.replace("/(tabs)");
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
