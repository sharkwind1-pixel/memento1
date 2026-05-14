/**
 * 구독 플랜 화면
 * 모바일 앱 내 결제는 아직 준비 중 — 웹 결제 안내
 */

import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { PRICING, calculateAnnualSavings } from "@/config/constants";
import { COLORS } from "@/lib/theme";
import AppHeader from "@/components/common/AppHeader";
import CancelConfirmModal from "@/components/subscription/CancelConfirmModal";
import ArchivedPetsSection from "@/components/subscription/ArchivedPetsSection";

interface Plan {
    id: "free" | "basic" | "premium";
    name: string;
    price: string;
    color: string;
    popular?: boolean;
    features: string[];
}

const PLANS: Plan[] = [
    {
        id: "free",
        name: "무료",
        price: "0원",
        color: COLORS.gray[400],
        features: [
            "AI 펫톡 하루 10회",
            "반려동물 1마리",
            "사진 펫당 50장",
            "AI 영상 평생 1회",
        ],
    },
    {
        id: "premium",
        name: "프리미엄",
        price: `월 ${PRICING.PREMIUM_MONTHLY.toLocaleString()}원`,
        color: COLORS.memento[500],
        popular: true,
        features: [
            "AI 펫톡 무제한",
            "반려동물 무제한",
            "사진 무제한",
            "AI 영상 월 3회",
            "광고 없음",
            "우선 고객 지원",
        ],
    },
];

export default function SubscriptionScreen() {
    const { session, isPremium, profile, refreshProfile } = useAuth();
    const { isMemorialMode } = usePet();
    const { isDarkMode } = useDarkMode();
    const [cancelOpen, setCancelOpen] = useState(false);

    function openWebPayment() {
        Linking.openURL("https://mementoani.com?tab=home#subscription");
    }

    function handleCancel() {
        if (!session) {
            Alert.alert("로그인 필요", "로그인이 필요합니다.");
            return;
        }
        setCancelOpen(true);
    }

    const expiresAt = profile?.premiumExpiresAt;
    const expiresText = expiresAt
        ? new Date(expiresAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
        : null;
    const phase = profile?.subscriptionPhase ?? null;
    const isCancelled = phase === "cancelled";

    // 현재 플랜 식별: subscription_tier 우선 → 없으면 isPremium만으로 premium 폴백
    const currentTier: "free" | "basic" | "premium" = isPremium
        ? (profile?.subscriptionTier === "basic" ? "basic" : "premium")
        : "free";

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            <AppHeader showBack title="구독" hideActions />
            <ScrollView
                style={styles.flex1}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            >
            <Text style={{
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 4,
                color: isDarkMode ? COLORS.white : COLORS.gray[900],
            }}>
                구독 플랜
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.gray[400], marginBottom: 16 }}>
                반려동물과의 특별한 순간을 더 많이 담아보세요.
            </Text>

            {isPremium && (
                <View style={[
                    styles.expiresCard,
                    {
                        backgroundColor: isDarkMode ? COLORS.gray[900] : (isCancelled ? "#FEF3C7" : COLORS.memento[50]),
                        borderColor: isCancelled ? "#FDE68A" : "transparent",
                        borderWidth: isCancelled ? 1 : 0,
                    },
                ]}>
                    <Ionicons
                        name={isCancelled ? "warning-outline" : "calendar-outline"}
                        size={18}
                        color={isCancelled ? "#B45309" : COLORS.memento[500]}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, color: isCancelled ? "#92400E" : COLORS.gray[500] }}>
                            {isCancelled ? "해지 예정" : "다음 결제일"}
                        </Text>
                        <Text style={{
                            fontSize: 14, fontWeight: "700",
                            color: isCancelled ? "#78350F" : (isDarkMode ? COLORS.white : COLORS.gray[900]),
                            marginTop: 2,
                        }}>
                            {expiresText ?? "만료일 정보 없음"}
                            {isCancelled ? " 까지 이용 가능" : ""}
                        </Text>
                    </View>
                    {!isCancelled && (
                        <TouchableOpacity onPress={handleCancel} activeOpacity={0.7} style={styles.cancelLink}>
                            <Text style={{ fontSize: 12, color: COLORS.gray[600], fontWeight: "600" }}>해지</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {PLANS.map((plan) => {
                const isCurrentPlan = plan.id === currentTier;

                return (
                    <View
                        key={plan.id}
                        style={[
                            styles.planCard,
                            {
                                backgroundColor: isDarkMode ? COLORS.gray[900] : COLORS.white,
                                borderWidth: plan.popular ? 2 : 1,
                                borderColor: plan.popular
                                    ? plan.color
                                    : isDarkMode ? COLORS.gray[800] : COLORS.gray[100],
                            },
                        ]}
                    >
                        {plan.popular && (
                            <View style={[styles.popularBanner, { backgroundColor: plan.color }]}>
                                <Text style={{ fontSize: 12, fontWeight: "bold", color: "#fff" }}>가장 인기</Text>
                            </View>
                        )}
                        <View style={{ padding: 20 }}>
                            <View style={styles.planHeader}>
                                <View>
                                    <Text style={{
                                        fontSize: 18,
                                        fontWeight: "bold",
                                        color: isCurrentPlan ? plan.color : (isDarkMode ? COLORS.white : COLORS.gray[900]),
                                    }}>
                                        {plan.name}
                                    </Text>
                                    <Text style={{ fontSize: 16, fontWeight: "600", marginTop: 2, color: plan.color }}>
                                        {plan.price}
                                    </Text>
                                </View>
                                {isCurrentPlan && (
                                    <View style={[styles.currentBadge, { backgroundColor: plan.color + "20" }]}>
                                        <Text style={{ fontSize: 12, fontWeight: "600", color: plan.color }}>
                                            현재 플랜
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {plan.features.map((f, i) => (
                                <View key={i} style={styles.featureRow}>
                                    <Ionicons name="checkmark-circle" size={16} color={plan.color} />
                                    <Text style={{ fontSize: 14, color: isDarkMode ? COLORS.gray[300] : COLORS.gray[600] }}>
                                        {f}
                                    </Text>
                                </View>
                            ))}

                            {!isCurrentPlan && plan.id !== "free" && (
                                <TouchableOpacity
                                    onPress={openWebPayment}
                                    style={[styles.planButton, { backgroundColor: plan.color }]}
                                    activeOpacity={0.85}
                                >
                                    <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                                        {plan.name} 시작하기
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                );
            })}

            <View style={[styles.notice, { backgroundColor: isDarkMode ? COLORS.gray[900] : COLORS.memento[50] }]}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                    <Ionicons name="information-circle-outline" size={18} color={COLORS.memento[500]} style={{ marginTop: 1 }} />
                    <Text style={{
                        fontSize: 12,
                        lineHeight: 20,
                        flex: 1,
                        color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500],
                    }}>
                        현재 앱 내 결제는 준비 중입니다. 구독을 원하시면 웹(mementoani.com)에서 결제해주세요. 결제 후 동일한 계정으로 로그인하면 앱에서도 프리미엄 혜택이 적용됩니다.
                    </Text>
                </View>
                <TouchableOpacity onPress={openWebPayment} style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6 }} activeOpacity={0.7}>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: COLORS.memento[500] }}>웹에서 구독하기</Text>
                    <Ionicons name="open-outline" size={14} color={COLORS.memento[500]} />
                </TouchableOpacity>
            </View>

            {/* 연 구독 추천 카드 — 25% 할인 임팩트 강조 (웹 PremiumModal과 패리티) */}
            {!isPremium && (
                <View style={[styles.annualCard, { borderColor: COLORS.memento[300] }]}>
                    <View style={[styles.annualBadge, { backgroundColor: "#EF4444" }]}>
                        <Text style={styles.annualBadgeText}>{calculateAnnualSavings().percent}% 할인</Text>
                    </View>
                    <View style={styles.annualRow}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Text style={[styles.annualTitle, { color: isDarkMode ? COLORS.white : COLORS.gray[900] }]}>
                                    프리미엄 연 구독
                                </Text>
                                <View style={{ backgroundColor: "rgba(239,68,68,0.12)", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#DC2626" }}>BEST</Text>
                                </View>
                            </View>
                            <Text style={[styles.annualSub, { color: "#DC2626", fontWeight: "700", marginTop: 2 }]}>
                                매년 {calculateAnnualSavings().saved.toLocaleString()}원 절약!
                            </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                            <Text style={{ fontSize: 12, color: COLORS.gray[400], textDecorationLine: "line-through" }}>
                                월 {PRICING.PREMIUM_MONTHLY.toLocaleString()}원
                            </Text>
                            <Text style={[styles.annualPrice, { color: "#DC2626" }]}>
                                월 {Math.round(PRICING.PREMIUM_ANNUAL / 12).toLocaleString()}원
                            </Text>
                            <Text style={[styles.annualTotal, { color: COLORS.gray[500] }]}>
                                연 {PRICING.PREMIUM_ANNUAL.toLocaleString()}원
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={openWebPayment}
                        style={[styles.annualBtn, { backgroundColor: COLORS.memento[500] }]}
                        activeOpacity={0.85}
                    >
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                            연 구독 시작하기 · {calculateAnnualSavings().saved.toLocaleString()}원 절약
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* 해지 후 보관함 — archived 펫이 있을 때만 자동 노출 */}
            <ArchivedPetsSection />
            </ScrollView>

            {session && (
                <CancelConfirmModal
                    visible={cancelOpen}
                    onClose={() => setCancelOpen(false)}
                    accessToken={session.access_token}
                    accentColor={COLORS.memento[500]}
                    onCancelled={() => {
                        refreshProfile().catch(() => {});
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    planCard: { borderRadius: 16, marginBottom: 16, overflow: "hidden" },
    popularBanner: { paddingVertical: 6, alignItems: "center" },
    planHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    currentBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    planButton: { marginTop: 16, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
    notice: { borderRadius: 16, padding: 16, marginTop: 8 },
    annualCard: {
        borderRadius: 18,
        borderWidth: 2,
        padding: 16,
        marginTop: 16,
        position: "relative",
    },
    annualBadge: {
        position: "absolute",
        top: -10,
        right: 16,
        backgroundColor: "#EF4444",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 9999,
    },
    annualBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    annualRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    annualTitle: { fontSize: 16, fontWeight: "800" },
    annualSub: { fontSize: 12, marginTop: 4, lineHeight: 18 },
    annualPrice: { fontSize: 18, fontWeight: "800" },
    annualTotal: { fontSize: 11, marginTop: 2 },
    annualBtn: {
        marginTop: 14,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
    },
    expiresCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 14,
        marginBottom: 16,
    },
    cancelLink: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: COLORS.gray[300],
    },
});
