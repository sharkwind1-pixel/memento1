/**
 * 진입점 — 세션 있으면 (tabs), 없으면 (auth)/login으로 리다이렉트
 *
 * 이전엔 <Redirect> 컴포넌트로 처리했지만 mount 타이밍과 navigator 준비 race로
 * "REPLACE/index was not handled by any navigator" 경고 반복 발생.
 * useEffect + router.replace로 deferred navigation해서 navigator가 준비된 후 dispatch.
 */

import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { COLORS } from "@/lib/theme";

export default function Index() {
    const router = useRouter();
    const { session, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;
        if (session) {
            router.replace("/(tabs)");
        } else {
            router.replace("/(auth)/login");
        }
    }, [isLoading, session, router]);

    return (
        <View style={styles.loading}>
            <ActivityIndicator size="large" color={COLORS.memento[500]} />
        </View>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.white,
    },
});
