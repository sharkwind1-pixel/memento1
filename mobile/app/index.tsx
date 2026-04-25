/**
 * 진입점 — 세션 있으면 (tabs), 없으면 (auth)/login으로 리다이렉트
 */

import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { COLORS } from "@/lib/theme";

export default function Index() {
    const { session, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={COLORS.memento[500]} />
            </View>
        );
    }

    if (session) return <Redirect href="/(tabs)" />;
    return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.white,
    },
});
