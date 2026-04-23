/**
 * 루트 레이아웃 — 전체 앱 프로바이더 + 전체 스크린 정의
 */

import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { PetProvider } from "@/contexts/PetContext";

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <PetProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" />
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(tabs)" />
                        {/* 반려동물 */}
                        <Stack.Screen
                            name="pet/new"
                            options={{
                                headerShown: true,
                                headerTitle: "반려동물 등록",
                                headerTintColor: "#05B2DC",
                                headerBackTitle: "뒤로",
                                presentation: "modal",
                            }}
                        />
                        <Stack.Screen
                            name="pet/[id]"
                            options={{
                                headerShown: true,
                                headerTitle: "반려동물 정보",
                                headerTintColor: "#05B2DC",
                                headerBackTitle: "뒤로",
                            }}
                        />
                        {/* 커뮤니티 */}
                        <Stack.Screen
                            name="post/[id]"
                            options={{
                                headerShown: true,
                                headerTitle: "",
                                headerTintColor: "#05B2DC",
                                headerBackTitle: "뒤로",
                            }}
                        />
                        <Stack.Screen
                            name="post/write"
                            options={{
                                headerShown: true,
                                headerTitle: "글 작성",
                                headerTintColor: "#05B2DC",
                                headerBackTitle: "취소",
                                presentation: "modal",
                            }}
                        />
                        {/* 매거진 */}
                        <Stack.Screen
                            name="magazine/[id]"
                            options={{
                                headerShown: true,
                                headerTitle: "",
                                headerTintColor: "#05B2DC",
                                headerBackTitle: "뒤로",
                            }}
                        />
                        {/* 프로필 / 설정 */}
                        <Stack.Screen
                            name="profile"
                            options={{
                                headerShown: true,
                                headerTitle: "프로필",
                                headerTintColor: "#05B2DC",
                                headerBackTitle: "뒤로",
                                presentation: "modal",
                            }}
                        />
                        {/* 구독 */}
                        <Stack.Screen
                            name="subscription"
                            options={{
                                headerShown: true,
                                headerTitle: "구독 플랜",
                                headerTintColor: "#05B2DC",
                                headerBackTitle: "뒤로",
                                presentation: "modal",
                            }}
                        />
                        {/* 알림 */}
                        <Stack.Screen
                            name="notifications"
                            options={{
                                headerShown: true,
                                headerTitle: "알림",
                                headerTintColor: "#05B2DC",
                                headerBackTitle: "뒤로",
                            }}
                        />
                    </Stack>
                    <StatusBar style="auto" />
                </PetProvider>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}
