/**
 * 미니홈피 탭 — 미니미 + 꾸미기 공간
 */

import { useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, Dimensions, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const GREETINGS = [
    "반가워! 오늘도 왔구나!",
    "헤헤, 또 만났네!",
    "오늘 뭐 했어?",
    "나 보고 싶었지?",
    "같이 놀자!",
];

const PLAYFUL = [
    "간지러워~",
    "야야야 그만 건드려",
    "흐흐 좋긴 한데...",
    "기분 좋다",
];

export default function MinihompyScreen() {
    const { points } = useAuth();
    const { selectedPet, isMemorialMode } = usePet();
    const [touchCount, setTouchCount] = useState(0);
    const [message, setMessage] = useState<string | null>(null);
    const [messageTimer, setMessageTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

    function handleTouch() {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newCount = touchCount + 1;
        setTouchCount(newCount);

        const pool = newCount >= 5 ? PLAYFUL : GREETINGS;
        const msg = pool[Math.floor(Math.random() * pool.length)];
        setMessage(msg);

        if (messageTimer) clearTimeout(messageTimer);
        const timer = setTimeout(() => setMessage(null), 2500);
        setMessageTimer(timer);
    }

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.white;
    const stageBg = isMemorialMode ? "#0F172A" : COLORS.memento[100];

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <Text style={[styles.title, { color: isMemorialMode ? COLORS.white : COLORS.gray[900] }]}>
                        미니홈피
                    </Text>
                    <View style={styles.pointPill}>
                        <Ionicons name="star" size={13} color={COLORS.memento[500]} />
                        <Text style={styles.pointText}>
                            {(points ?? 0).toLocaleString()}P
                        </Text>
                    </View>
                </View>

                <View style={[styles.stage, { backgroundColor: stageBg }]}>
                    {message && (
                        <View style={[styles.speechBubble, { backgroundColor: isMemorialMode ? COLORS.gray[800] : "#fff" }]}>
                            <Text style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: isMemorialMode ? COLORS.white : COLORS.gray[800],
                            }}>
                                {message}
                            </Text>
                            <View
                                style={[
                                    styles.speechTail,
                                    { borderTopColor: isMemorialMode ? COLORS.gray[800] : "#fff" },
                                ]}
                            />
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.minimiWrap, { left: SCREEN_WIDTH / 2 - 60 - 20 }]}
                        onPress={handleTouch}
                        activeOpacity={0.9}
                    >
                        {selectedPet?.profileImage ? (
                            <Image
                                source={{ uri: selectedPet.profileImage }}
                                style={styles.minimiImg}
                            />
                        ) : (
                            <View style={[
                                styles.minimiImg,
                                styles.minimiImgFallback,
                                { backgroundColor: isMemorialMode ? COLORS.gray[800] : "#B3EDFF" },
                            ]}>
                                <Text style={{ fontSize: 48 }}>
                                    {selectedPet?.type === "강아지" ? "🐶"
                                        : selectedPet?.type === "고양이" ? "🐱" : "🐾"}
                                </Text>
                            </View>
                        )}
                        <Text style={{
                            textAlign: "center",
                            fontSize: 14,
                            fontWeight: "600",
                            marginTop: 8,
                            color: isMemorialMode ? COLORS.white : COLORS.gray[700],
                        }}>
                            {selectedPet?.name ?? "미니미"}
                        </Text>
                    </TouchableOpacity>

                    <Text style={{
                        position: "absolute",
                        bottom: 12,
                        alignSelf: "center",
                        fontSize: 12,
                        color: isMemorialMode ? COLORS.gray[600] : COLORS.gray[400],
                    }}>
                        탭해서 반응보기
                    </Text>
                </View>

                <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                    <Text style={{
                        fontSize: 14,
                        fontWeight: "600",
                        marginBottom: 12,
                        color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[500],
                    }}>
                        꾸미기
                    </Text>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                        <DecoCard
                            icon="color-palette-outline"
                            label="배경 테마"
                            color="#8B5CF6"
                            bgColor="#F5F3FF"
                            isMemorialMode={isMemorialMode}
                            onPress={() => {}}
                        />
                        <DecoCard
                            icon="paw-outline"
                            label="미니미 상점"
                            color={COLORS.memento[500]}
                            bgColor={COLORS.memento[100]}
                            isMemorialMode={isMemorialMode}
                            onPress={() => {}}
                        />
                        <DecoCard
                            icon="musical-notes-outline"
                            label="BGM"
                            color={COLORS.memorial[500]}
                            bgColor={COLORS.memorial[50]}
                            isMemorialMode={isMemorialMode}
                            onPress={() => {}}
                        />
                    </View>
                </View>

                <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
                    <Text style={{
                        fontSize: 14,
                        fontWeight: "600",
                        marginBottom: 12,
                        color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[500],
                    }}>
                        방문록
                    </Text>
                    <View style={[styles.guestbook, { backgroundColor: isMemorialMode ? COLORS.gray[900] : COLORS.gray[50] }]}>
                        <Ionicons name="chatbubbles-outline" size={32} color={COLORS.gray[300]} />
                        <Text style={{
                            fontSize: 14,
                            marginTop: 8,
                            color: isMemorialMode ? COLORS.gray[500] : COLORS.gray[400],
                        }}>
                            아직 방문록이 없어요.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function DecoCard({ icon, label, color, bgColor, isMemorialMode, onPress }: {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    color: string;
    bgColor: string;
    isMemorialMode: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[styles.decoCard, { backgroundColor: isMemorialMode ? COLORS.gray[900] : bgColor }]}
        >
            <View style={[styles.decoIconBg, { backgroundColor: color + "20" }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={{
                fontSize: 12,
                fontWeight: "500",
                textAlign: "center",
                color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[600],
            }}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    title: { fontSize: 20, fontWeight: "bold" },
    pointPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: COLORS.memento[50],
        borderRadius: 9999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    pointText: { color: COLORS.memento[600], fontSize: 12, fontWeight: "600" },
    stage: {
        marginHorizontal: 20,
        borderRadius: 24,
        overflow: "hidden",
        marginBottom: 16,
        height: 280,
    },
    speechBubble: {
        position: "absolute",
        top: 24,
        alignSelf: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    speechTail: {
        position: "absolute",
        bottom: -8,
        alignSelf: "center",
        width: 16,
        height: 8,
        backgroundColor: "transparent",
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 8,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
    },
    minimiWrap: { position: "absolute", bottom: 32 },
    minimiImg: { width: 112, height: 112, borderRadius: 56, borderWidth: 4, borderColor: "#fff" },
    minimiImgFallback: { alignItems: "center", justifyContent: "center" },
    decoCard: {
        flex: 1,
        borderRadius: 16,
        padding: 14,
        alignItems: "center",
        gap: 8,
    },
    decoIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    guestbook: { borderRadius: 16, padding: 16, alignItems: "center" },
});
