/**
 * 루트 레이아웃 — 전체 앱 프로바이더 + Expo Router 설정
 */

import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { PetProvider } from "@/contexts/PetContext";

export default function RootLayout() {
    return (
        <GestureHandlerRootView className="flex-1">
            <AuthProvider>
                <PetProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen
                            name="pet/[id]"
                            options={{
                                headerShown: true,
                                headerTitle: "",
                                headerBackTitle: "뒤로",
                                headerTintColor: "#05B2DC",
                            }}
                        />
                        <Stack.Screen
                            name="post/[id]"
                            options={{
                                headerShown: true,
                                headerTitle: "",
                                headerBackTitle: "뒤로",
                                headerTintColor: "#05B2DC",
                            }}
                        />
                    </Stack>
                    <StatusBar style="auto" />
                </PetProvider>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}
