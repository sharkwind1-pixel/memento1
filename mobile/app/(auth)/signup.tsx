/**
 * 회원가입 화면
 */

import { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView,
    ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupScreen() {
    const router = useRouter();
    const { signUp } = useAuth();
    const [nickname, setNickname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSignup() {
        if (!nickname.trim() || !email.trim() || !password) {
            Alert.alert("알림", "모든 항목을 입력해주세요.");
            return;
        }
        if (password !== passwordConfirm) {
            Alert.alert("알림", "비밀번호가 일치하지 않습니다.");
            return;
        }
        if (password.length < 6) {
            Alert.alert("알림", "비밀번호는 6자 이상이어야 합니다.");
            return;
        }

        setIsLoading(true);
        const { error } = await signUp(email.trim(), password, nickname.trim());
        setIsLoading(false);

        if (error) {
            Alert.alert("가입 실패", error.message || "회원가입 중 오류가 발생했습니다.");
        } else {
            Alert.alert(
                "가입 완료",
                "이메일 인증 링크를 발송했습니다. 이메일을 확인해주세요.",
                [{ text: "확인", onPress: () => router.replace("/(auth)/login") }]
            );
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
                <View className="flex-1 px-6 pt-14 pb-10">
                    {/* 뒤로가기 */}
                    <TouchableOpacity
                        className="flex-row items-center mb-8"
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={24} color="#05B2DC" />
                        <Text className="text-memento-500 font-medium ml-1">로그인으로</Text>
                    </TouchableOpacity>

                    <Text className="text-2xl font-bold text-gray-900 mb-2">계정 만들기</Text>
                    <Text className="text-sm text-gray-500 mb-8">반려동물과의 특별한 순간을 기록해보세요.</Text>

                    <View className="gap-4">
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">닉네임</Text>
                            <TextInput
                                className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50"
                                placeholder="닉네임 (2~10자)"
                                placeholderTextColor="#9CA3AF"
                                value={nickname}
                                onChangeText={setNickname}
                                maxLength={10}
                            />
                        </View>

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
                                placeholder="6자 이상"
                                placeholderTextColor="#9CA3AF"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-1.5">비밀번호 확인</Text>
                            <TextInput
                                className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50"
                                placeholder="비밀번호 재입력"
                                placeholderTextColor="#9CA3AF"
                                value={passwordConfirm}
                                onChangeText={setPasswordConfirm}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity
                            className="w-full bg-memento-500 rounded-xl py-4 items-center mt-2"
                            onPress={handleSignup}
                            disabled={isLoading}
                            activeOpacity={0.85}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-white font-semibold text-base">가입하기</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <Text className="text-center text-xs text-gray-400 mt-8">
                        가입 시 이용약관 및 개인정보처리방침에 동의합니다.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
