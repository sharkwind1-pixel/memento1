/**
 * 구독 플랜 화면
 * 모바일에서는 Google Play Billing / Apple IAP 연동 필요 (추후)
 * 현재는 플랜 소개 + 웹 결제 안내
 */

import { View, Text, ScrollView, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { PRICING } from "@/config/constants";

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
        color: "#9CA3AF",
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
        color: "#05B2DC",
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

    return (
        <ScrollView
            className={`flex-1 ${isMemorialMode ? "bg-gray-950" : "bg-gray-50"}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
            <Text className={`text-xl font-bold mb-1 ${isMemorialMode ? "text-white" : "text-gray-900"}`}>
                구독 플랜
            </Text>
            <Text className="text-sm text-gray-400 mb-6">
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
                        className="rounded-2xl mb-4 overflow-hidden"
                        style={{
                            backgroundColor: isMemorialMode ? "#111827" : "#fff",
                            borderWidth: plan.popular ? 2 : 1,
                            borderColor: plan.popular ? plan.color : (isMemorialMode ? "#1F2937" : "#F3F4F6"),
                        }}
                    >
                        {plan.popular && (
                            <View style={{ backgroundColor: plan.color }} className="py-1.5 items-center">
                                <Text className="text-xs font-bold text-white">가장 인기</Text>
                            </View>
                        )}
                        <View className="p-5">
                            <View className="flex-row items-center justify-between mb-3">
                                <View>
                                    <Text
                                        className="text-lg font-bold"
                                        style={{ color: isCurrentPlan ? plan.color : (isMemorialMode ? "#fff" : "#111827") }}
                                    >
                                        {plan.name}
                                    </Text>
                                    <Text
                                        className="text-base font-semibold mt-0.5"
                                        style={{ color: plan.color }}
                                    >
                                        {plan.price}
                                    </Text>
                                </View>
                                {isCurrentPlan && (
                                    <View
                                        className="px-3 py-1 rounded-full"
                                        style={{ backgroundColor: plan.color + "20" }}
                                    >
                                        <Text className="text-xs font-semibold" style={{ color: plan.color }}>
                                            현재 플랜
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {plan.features.map((f, i) => (
                                <View key={i} className="flex-row items-center gap-2 mb-2">
                                    <Ionicons name="checkmark-circle" size={16} color={plan.color} />
                                    <Text className={`text-sm ${isMemorialMode ? "text-gray-300" : "text-gray-600"}`}>{f}</Text>
                                </View>
                            ))}

                            {!isCurrentPlan && plan.id !== "free" && (
                                <TouchableOpacity
                                    onPress={openWebPayment}
                                    className="mt-4 py-3 rounded-xl items-center"
                                    style={{ backgroundColor: plan.color }}
                                    activeOpacity={0.85}
                                >
                                    <Text className="text-white font-semibold text-sm">
                                        {plan.name} 시작하기
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                );
            })}

            {/* 앱 내 결제 안내 */}
            <View
                className="rounded-2xl p-4 mt-2"
                style={{ backgroundColor: isMemorialMode ? "#111827" : "#F0F9FF" }}
            >
                <View className="flex-row gap-2 items-start">
                    <Ionicons name="information-circle-outline" size={18} color="#05B2DC" style={{ marginTop: 1 }} />
                    <Text className={`text-xs leading-5 flex-1 ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}>
                        현재 앱 내 결제는 준비 중입니다. 구독을 원하시면 웹(mementoani.com)에서 결제해주세요. 결제 후 동일한 계정으로 로그인하면 앱에서도 프리미엄 혜택이 적용됩니다.
                    </Text>
                </View>
                <TouchableOpacity onPress={openWebPayment} className="mt-3 flex-row items-center gap-1.5" activeOpacity={0.7}>
                    <Text className="text-sm font-medium text-memento-500">웹에서 구독하기</Text>
                    <Ionicons name="open-outline" size={14} color="#05B2DC" />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
