/**
 * 루트 레이아웃 — Auth/Pet Provider + Stack 구성
 */

import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AuthProvider } from "@/contexts/AuthContext";
import { PetProvider } from "@/contexts/PetContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SimpleModeProvider } from "@/contexts/SimpleModeContext";
import { setupNotificationListeners } from "@/lib/push-notifications";

function NotificationBridge() {
    const router = useRouter();

    useEffect(() => {
        // 푸시 알림 수신/탭 처리
        const cleanup = setupNotificationListeners({
            // 포그라운드에서 알림 수신 시 진동 (시각적 알림은 expo-notifications가 자동 표시)
            onReceived: (n) => {
                const type = n.request.content.data?.type;
                if (type === "video_complete") {
                    // 영상 완료 — 강한 success haptic
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                } else {
                    // 기타 — 가벼운 진동
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }
            },
            // 알림 탭 시 라우팅
            onResponse: (r) => {
                const data = r.notification.request.content.data;
                if (data?.type === "video_complete") {
                    // 영상 완료 알림 탭 → 내 기록 (영상 섹션) 이동
                    router.push("/(tabs)/record" as never);
                } else if (data?.link && typeof data.link === "string") {
                    router.push(data.link as never);
                }
            },
        });
        return cleanup;
    }, [router]);

    return null;
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
            <SimpleModeProvider>
            <AuthProvider>
                <PetProvider>
                    <NotificationBridge />
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" />
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
                        <Stack.Screen name="pet/new" options={{ presentation: "modal", headerShown: false }} />
                        <Stack.Screen name="pet/[id]" options={{ headerShown: false }} />
                        <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
                        <Stack.Screen name="post/write" options={{ presentation: "modal", headerShown: false }} />
                        <Stack.Screen name="magazine/[id]" options={{ headerShown: false }} />
                        <Stack.Screen name="notifications" options={{ headerShown: false }} />
                        <Stack.Screen name="profile" options={{ presentation: "modal", headerShown: false }} />
                        <Stack.Screen name="subscription" options={{ headerShown: false }} />
                        <Stack.Screen name="adoption" options={{ headerShown: false }} />
                        <Stack.Screen name="minihompy/[userId]" options={{ headerShown: false }} />
                        <Stack.Screen name="admin/index" options={{ headerShown: false }} />
                    </Stack>
                    <StatusBar style="auto" />
                </PetProvider>
            </AuthProvider>
            </SimpleModeProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
