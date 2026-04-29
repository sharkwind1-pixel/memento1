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
                        <Stack.Screen name="pet/new" options={{ presentation: "modal", headerShown: false }} />
                        <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
                        <Stack.Screen name="post/write" options={{ presentation: "modal", headerShown: false }} />
                        <Stack.Screen name="magazine/[id]" options={{ headerShown: false }} />
                        <Stack.Screen name="notifications" options={{ headerShown: false }} />
                        <Stack.Screen name="profile" options={{ presentation: "modal", headerShown: false }} />
                        <Stack.Screen name="subscription" options={{ headerShown: false }} />
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
