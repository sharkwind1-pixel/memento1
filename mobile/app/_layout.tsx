/**
 * 루트 레이아웃 — Auth/Pet Provider + Stack 구성
 */

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/contexts/AuthContext";
import { PetProvider } from "@/contexts/PetContext";

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <PetProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" />
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
                        <Stack.Screen name="pet/new" options={{ presentation: "modal", headerShown: true, title: "반려동물 등록" }} />
                        <Stack.Screen name="post/[id]" options={{ headerShown: true, title: "게시글" }} />
                        <Stack.Screen name="post/write" options={{ presentation: "modal", headerShown: true, title: "글 작성" }} />
                        <Stack.Screen name="magazine/[id]" options={{ headerShown: true, title: "매거진" }} />
                        <Stack.Screen name="notifications" options={{ headerShown: true, title: "알림" }} />
                        <Stack.Screen name="profile" options={{ presentation: "modal", headerShown: true, title: "프로필" }} />
                        <Stack.Screen name="subscription" options={{ headerShown: true, title: "구독" }} />
                        <Stack.Screen name="adoption" options={{ headerShown: false }} />
                        <Stack.Screen name="lost/index" options={{ headerShown: false }} />
                        <Stack.Screen name="local/index" options={{ headerShown: false }} />
                        <Stack.Screen name="lost/new" options={{ headerShown: false, presentation: "modal" }} />
                        <Stack.Screen name="local/new" options={{ headerShown: false, presentation: "modal" }} />
                    </Stack>
                    <StatusBar style="auto" />
                </PetProvider>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
