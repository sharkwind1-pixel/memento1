/**
 * PointsShopModal — 모바일
 *
 * 웹 src/components/features/points/PointsShopModal.tsx 1:1 이식.
 *  - 부스트 아이템 (AI 펫톡 +5/+10) 구매
 *  - POST /api/points/shop (Bearer)
 *  - 구매 후 refreshProfile (포인트/사용량 갱신)
 */

import { useState } from "react";
import {
    Modal, View, Text, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, StyleSheet, Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { API_BASE_URL } from "@/config/constants";

interface ShopItem {
    id: string;
    name: string;
    description: string;
    price: number;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
}

const SHOP_ITEMS: ShopItem[] = [
    {
        id: "extra_chat_5",
        name: "AI 펫톡 +5회",
        description: "오늘 사용할 수 있는 AI 펫톡 횟수가 5회 추가됩니다",
        price: 150,
        icon: "chatbubble-ellipses",
        color: COLORS.memento[500],
    },
    {
        id: "extra_chat_10",
        name: "AI 펫톡 +10회",
        description: "오늘 사용할 수 있는 AI 펫톡 횟수가 10회 추가됩니다",
        price: 250,
        icon: "chatbubbles",
        color: COLORS.memento[600],
    },
];

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function PointsShopModal({ visible, onClose }: Props) {
    const insets = useSafeAreaInsets();
    const { session, points, refreshProfile } = useAuth();
    const { isDarkMode } = useDarkMode();
    const accessToken = session?.access_token;
    const [purchasingId, setPurchasingId] = useState<string | null>(null);

    async function handlePurchase(item: ShopItem) {
        if (!accessToken) {
            Alert.alert("로그인이 필요합니다");
            return;
        }
        if ((points ?? 0) < item.price) {
            Alert.alert("포인트가 부족합니다", `${item.price.toLocaleString()}P 필요해요`);
            return;
        }
        Alert.alert(
            "구매 확인",
            `${item.name}을(를) ${item.price.toLocaleString()}P로 구매하시겠어요?`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "구매",
                    style: "default",
                    onPress: async () => {
                        setPurchasingId(item.id);
                        try {
                            const res = await fetch(`${API_BASE_URL}/api/points/shop`, {
                                method: "POST",
                                headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ itemId: item.id }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || "구매 실패");
                            await refreshProfile();
                            Alert.alert("구매 완료", `${item.name}을(를) 구매했습니다!`);
                        } catch (e) {
                            Alert.alert("실패", e instanceof Error ? e.message : "구매에 실패했습니다");
                        } finally {
                            setPurchasingId(null);
                        }
                    },
                },
            ],
        );
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const borderColor = isDarkMode ? COLORS.gray[800] : COLORS.gray[200];
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const subColor = COLORS.gray[500];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <SafeAreaView edges={["top"]} style={[styles.sheet, { backgroundColor: bgColor }]}>
                    {/* 헤더 (그라데이션 느낌의 단색 + 아이콘) */}
                    <View style={[styles.header, { backgroundColor: COLORS.memorial[500] }]}>
                        <View style={styles.headerLeft}>
                            <Ionicons name="bag-handle" size={20} color="#fff" />
                            <View>
                                <Text style={styles.headerTitle}>포인트 상점</Text>
                                <Text style={styles.headerSub}>
                                    보유: {(points ?? 0).toLocaleString()}P
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                            <Ionicons name="close" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }}
                    >
                        {SHOP_ITEMS.map((item) => {
                            const canAfford = (points ?? 0) >= item.price;
                            const isPurchasing = purchasingId === item.id;
                            return (
                                <View
                                    key={item.id}
                                    style={[styles.itemCard, { backgroundColor: cardBg, borderColor }]}
                                >
                                    <View style={[styles.itemIcon, { backgroundColor: item.color + "20" }]}>
                                        <Ionicons name={item.icon} size={22} color={item.color} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.itemName, { color: textColor }]}>{item.name}</Text>
                                        <Text style={[styles.itemDesc, { color: subColor }]}>{item.description}</Text>
                                        <View style={styles.itemFooter}>
                                            <Text
                                                style={[
                                                    styles.itemPrice,
                                                    { color: canAfford ? COLORS.memorial[600] : COLORS.gray[400] },
                                                ]}
                                            >
                                                {item.price.toLocaleString()}P
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() => handlePurchase(item)}
                                                disabled={!canAfford || isPurchasing}
                                                style={[
                                                    styles.buyBtn,
                                                    {
                                                        backgroundColor: canAfford
                                                            ? COLORS.memorial[500]
                                                            : COLORS.gray[200],
                                                    },
                                                ]}
                                                activeOpacity={0.85}
                                            >
                                                {isPurchasing ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <>
                                                        <Ionicons
                                                            name={canAfford ? "checkmark-circle" : "alert-circle"}
                                                            size={12}
                                                            color={canAfford ? "#fff" : COLORS.gray[500]}
                                                        />
                                                        <Text
                                                            style={[
                                                                styles.buyBtnText,
                                                                { color: canAfford ? "#fff" : COLORS.gray[500] },
                                                            ]}
                                                        >
                                                            {canAfford ? "구매" : "부족"}
                                                        </Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}

                        <Text style={[styles.notice, { color: COLORS.gray[400] }]}>
                            구매한 아이템은 환불이 불가합니다. 포인트는 활동을 통해 적립할 수 있습니다.
                        </Text>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: {
        height: "85%",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    headerTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
    headerSub: { fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 },
    closeBtn: {
        padding: 6,
        borderRadius: 9999,
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    itemCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    itemIcon: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
    },
    itemName: { fontSize: 14, fontWeight: "700" },
    itemDesc: { fontSize: 11, lineHeight: 16, marginTop: 4 },
    itemFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 10,
    },
    itemPrice: { fontSize: 14, fontWeight: "800" },
    buyBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 9999,
        minWidth: 64,
        justifyContent: "center",
    },
    buyBtnText: { fontSize: 11, fontWeight: "700" },
    notice: {
        textAlign: "center",
        fontSize: 10,
        marginTop: 8,
        lineHeight: 14,
    },
});
