/**
 * 로그인 화면
 */

import { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView,
    Image, ActivityIndicator, Alert,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginScreen() {
    const router = useRouter();
    const { signIn } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleLogin() {
        if (!email.trim() || !password.trim()) {
            Alert.alert("알림", "이메일과 비밀번호를 입력해주세요.");
            return;
        }

        setIsLoading(true);
        const { error } = await signIn(email.trim(), password);
        setIsLoading(false);

        if (error) {
            Alert.alert("로그인 실패", "이메일 또는 비밀번호를 확인해주세요.");
        } else {
            router.replace("/(tabs)");
        }
    }

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-white"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                <View className="flex-1 px-6 pt-20 pb-10">
                    {/* 로고 */}
                    <View className="items-center mb-12">
                        <Image
                            source={require("@/assets/icon.png")}
                            className="w-20 h-20 rounded-2xl mb-4"
                            resizeMode="contain"
                        />
                        <Text className="text-2xl font-bold text-gray-900">메멘토애니</Text>
                        <Text className="text-sm text-gray-500 mt-1">특별한 매일을 함께</Text>
                    </View>

                    {/* 입력 폼 */}
                    <View className="gap-4">
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">이메일</Text>
                            <TextInput
                                className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50"
                                placeholder="이메일 주소"
                                placeholderTextColor="#9CA3AF"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">비밀번호</Text>
                            <TextInput
                                className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50"
                                placeholder="비밀번호"
                                placeholderTextColor="#9CA3AF"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity
                            className="w-full bg-memento-500 rounded-xl py-4 items-center mt-2"
                            onPress={handleLogin}
                            disabled={isLoading}
                            activeOpacity={0.85}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-white font-semibold text-base">로그인</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* 구분선 */}
                    <View className="flex-row items-center my-6">
                        <View className="flex-1 h-px bg-gray-200" />
                        <Text className="mx-4 text-xs text-gray-400">또는</Text>
                        <View className="flex-1 h-px bg-gray-200" />
                    </View>

                    {/* 회원가입 링크 */}
                    <View className="items-center gap-3">
                        <Link href="/(auth)/signup" asChild>
                            <TouchableOpacity
                                className="w-full border border-memento-300 rounded-xl py-4 items-center"
                                activeOpacity={0.85}
                            >
                                <Text className="text-memento-600 font-semibold text-base">새 계정 만들기</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>

                    {/* 하단 여백 */}
                    <View className="flex-1" />
                    <Text className="text-center text-xs text-gray-400 mt-8">
                        로그인 시 이용약관 및 개인정보처리방침에 동의합니다.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
