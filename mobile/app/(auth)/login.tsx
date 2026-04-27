/**
 * 로그인 화면 (소셜 로그인: 네이버 / 카카오 / 구글)
 * 이메일/비번 직접 입력은 지원하지 않음 — 메멘토애니 정책
 */

import { useEffect, useState } from "react";
import {
    View, Text, TouchableOpacity, Image, Alert,
    ActivityIndicator, ScrollView, StyleSheet, Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "@/contexts/AuthContext";
import { COLORS } from "@/lib/theme";

type Provider = "naver" | "kakao" | "google";

export default function LoginScreen() {
    const router = useRouter();
    const { signInWithGoogle, signInWithKakao, signInWithNaver, session } = useAuth();
    const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);

    // 세션이 늦게라도 set되면 자동으로 탭 화면 이동 (cold-start hard guard 폴백)
    useEffect(() => {
        if (session) router.replace("/");
    }, [session, router]);

    async function handleLogin(provider: Provider) {
        if (loadingProvider) return;
        setLoadingProvider(provider);

        try {
            const fn =
                provider === "google" ? signInWithGoogle
                : provider === "kakao" ? signInWithKakao
                : signInWithNaver;

            const { error } = await fn();
            if (error) {
                Alert.alert("로그인 실패", error.message);
                return;
            }
            router.replace("/");
        } catch (e) {
            Alert.alert("로그인 실패", (e as Error).message || "다시 시도해주세요.");
        } finally {
            setLoadingProvider(null);
        }
    }

    return (
        <ScrollView
            style={styles.flex1White}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
        >
            <View style={styles.container}>
                <View style={styles.logoWrap}>
                    <Image
                        source={require("@/assets/icon.png")}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>메멘토애니</Text>
                    <Text style={styles.tagline}>특별한 매일을 함께</Text>
                </View>

                <Text style={styles.intro}>
                    소셜 계정으로 간편하게 시작하세요
                </Text>

                <View style={styles.buttonGroup}>
                    <SocialButton
                        provider="naver"
                        label="네이버로 계속하기"
                        bg="#03C75A"
                        fg="#FFFFFF"
                        loading={loadingProvider === "naver"}
                        disabled={loadingProvider !== null}
                        onPress={() => handleLogin("naver")}
                        icon={
                            <Svg width={18} height={18} viewBox="0 0 24 24">
                                <Path
                                    d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"
                                    fill="#FFFFFF"
                                />
                            </Svg>
                        }
                    />

                    <SocialButton
                        provider="kakao"
                        label="카카오로 계속하기"
                        bg="#FEE500"
                        fg="#191919"
                        loading={loadingProvider === "kakao"}
                        disabled={loadingProvider !== null}
                        onPress={() => handleLogin("kakao")}
                        icon={
                            <Svg width={18} height={18} viewBox="0 0 24 24">
                                <Path
                                    d="M12 3C6.477 3 2 6.463 2 10.691c0 2.738 1.82 5.135 4.55 6.48-.168.607-.61 2.198-.7 2.543-.112.428.157.422.33.307.135-.09 2.15-1.46 3.02-2.048.57.083 1.16.127 1.8.127 5.523 0 10-3.463 10-7.409C22 6.463 17.523 3 12 3z"
                                    fill="#191919"
                                />
                            </Svg>
                        }
                    />

                    <SocialButton
                        provider="google"
                        label="Google로 계속하기"
                        bg="#FFFFFF"
                        fg={COLORS.gray[800]}
                        bordered
                        loading={loadingProvider === "google"}
                        disabled={loadingProvider !== null}
                        onPress={() => handleLogin("google")}
                        icon={
                            <Svg width={18} height={18} viewBox="0 0 24 24">
                                <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </Svg>
                        }
                    />
                </View>

                <Text style={styles.disclaimer}>
                    계속 진행하면{" "}
                    <Text
                        style={styles.linkText}
                        onPress={() => Linking.openURL("https://mementoani.com/terms")}
                    >
                        이용약관
                    </Text>
                    {" 및 "}
                    <Text
                        style={styles.linkText}
                        onPress={() => Linking.openURL("https://mementoani.com/privacy")}
                    >
                        개인정보처리방침
                    </Text>
                    에 동의하는 것으로 간주됩니다.
                </Text>
            </View>
        </ScrollView>
    );
}

function SocialButton({
    label, bg, fg, bordered, loading, disabled, onPress, icon,
}: {
    provider: Provider;
    label: string;
    bg: string;
    fg: string;
    bordered?: boolean;
    loading: boolean;
    disabled: boolean;
    onPress: () => void;
    icon: React.ReactNode;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.85}
            style={[
                styles.socialButton,
                { backgroundColor: bg },
                bordered ? { borderWidth: 1, borderColor: COLORS.gray[200] } : null,
                disabled && !loading ? { opacity: 0.55 } : null,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={fg} />
            ) : (
                <>
                    <View style={{ marginRight: 10 }}>{icon}</View>
                    <Text style={[styles.socialButtonText, { color: fg }]}>
                        {label}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    flex1White: { flex: 1, backgroundColor: COLORS.white },
    scrollContent: { flexGrow: 1 },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 80,
        paddingBottom: 48,
    },
    logoWrap: { alignItems: "center", marginBottom: 40 },
    logo: { width: 88, height: 88, borderRadius: 20, marginBottom: 16 },
    title: { fontSize: 26, fontWeight: "bold", color: COLORS.gray[900] },
    tagline: { fontSize: 14, color: COLORS.gray[500], marginTop: 4 },
    intro: {
        fontSize: 14,
        color: COLORS.gray[500],
        textAlign: "center",
        marginBottom: 24,
    },
    buttonGroup: { gap: 12 },
    socialButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: 52,
        borderRadius: 14,
        paddingHorizontal: 16,
    },
    socialButtonText: { fontSize: 15, fontWeight: "600" },
    disclaimer: {
        textAlign: "center",
        fontSize: 12,
        color: COLORS.gray[400],
        marginTop: 32,
        lineHeight: 18,
    },
    linkText: { textDecorationLine: "underline", color: COLORS.memento[500] },
});
