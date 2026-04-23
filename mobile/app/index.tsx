/**
 * 앱 진입점 — 세션 여부에 따라 탭 or 로그인으로 리다이렉트
 */

import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
    const { session, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#05B2DC" />
            </View>
        );
    }

    if (!session) {
        return <Redirect href="/(auth)/login" />;
    }

    return <Redirect href="/(tabs)" />;
}
