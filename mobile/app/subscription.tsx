/**
 * 구독 플랜 화면
 * 모바일 앱 내 결제는 아직 준비 중 — 웹 결제 안내
 */

import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { PRICING } from "@/config/constants";
import { COLORS } from "@/lib/theme";

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
        ],
    },
    {
        id: "basic",
        name: "베이직",
        price: `월 ${PRICING.BASIC_MONTHLY.toLocaleString()}원`,
        color: COLORS.memento[500],
        popular: true,
        features: [
            "AI 펫톡 하루 50회",
            "반려동물 3마리",
            "사진 펫당 200장",
            "AI 영상 월 3회",
        ],
    },
    {
        id: "premium",
        name: "프리미엄",
        price: `월 ${PRICING.PREMIUM_MONTHLY.toLocaleString()}원`,
        color: "#8B5CF6",
        features: [
            "AI 펫톡 무제한",
            "반려동물 10마리",
            "사진 펫당 1,000장",
            "AI 영상 월 6회",
            "우선 고객 지원",
        ],
    },
];

export default function SubscriptionScreen() {
    const { isPremium, profile } = useAuth();
    const { isMemorialMode } = usePet();

    function openWebPayment() {
        Linking.openURL("https://mementoani.com?tab=home#subscription");
    }

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.gray[50];

    return (
        <ScrollView
            style={[styles.flex1, { backgroundColor: bgColor }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
            <Text style={{
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 4,
                color: isMemorialMode ? COLORS.white : COLORS.gray[900],
            }}>
                구독 플랜
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.gray[400], marginBottom: 24 }}>
                반려동물과의 특별한 순간을 더 많이 담아보세요.
            </Text>

            {PLANS.map((plan) => {
                const isCurrentPlan =
                    (plan.id === "free" && !isPremium) ||
                    (plan.id === "basic" && isPremium && profile?.isPremium) ||
                    (plan.id === "premium" && isPremium);

                return (
                    <View
                        key={plan.id}
                        style={[
                            styles.planCard,
                            {
                                backgroundColor: isMemorialMode ? COLORS.gray[900] : COLORS.white,
                                borderWidth: plan.popular ? 2 : 1,
                                borderColor: plan.popular
                                    ? plan.color
                                    : isMemorialMode ? COLORS.gray[800] : COLORS.gray[100],
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
                                        color: isCurrentPlan ? plan.color : (isMemorialMode ? COLORS.white : COLORS.gray[900]),
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
                                    <Text style={{ fontSize: 14, color: isMemorialMode ? COLORS.gray[300] : COLORS.gray[600] }}>
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

            <View style={[styles.notice, { backgroundColor: isMemorialMode ? COLORS.gray[900] : COLORS.memento[50] }]}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                    <Ionicons name="information-circle-outline" size={18} color={COLORS.memento[500]} style={{ marginTop: 1 }} />
                    <Text style={{
                        fontSize: 12,
                        lineHeight: 20,
                        flex: 1,
                        color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[500],
                    }}>
                        현재 앱 내 결제는 준비 중입니다. 구독을 원하시면 웹(mementoani.com)에서 결제해주세요. 결제 후 동일한 계정으로 로그인하면 앱에서도 프리미엄 혜택이 적용됩니다.
                    </Text>
                </View>
                <TouchableOpacity onPress={openWebPayment} style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6 }} activeOpacity={0.7}>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: COLORS.memento[500] }}>웹에서 구독하기</Text>
                    <Ionicons name="open-outline" size={14} color={COLORS.memento[500]} />
                </TouchableOpacity>
            </View>
        </ScrollView>
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
});
