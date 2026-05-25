/**
 * ExportChatCard.tsx — 웹 src/components/features/chat/ExportChatCard.tsx 1:1 RN 이식
 * react-native-view-shot captureRef로 캡처되어 이미지로 저장됨.
 */

import { forwardRef } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import type { ChatMessage, Pet } from "@/types";

export type CardTemplate = "letter" | "polaroid" | "memorial" | "cute";

interface ExportChatCardProps {
    messages: ChatMessage[];
    pet: Pet;
    isMemorialMode: boolean;
    template: CardTemplate;
}

const CARD_W = 300;

// 웹 templateStyles 1:1 색상 매핑 (LinearGradient는 별도 처리)
const TEMPLATE_COLORS = {
    letter: {
        memorial: {
            bgStart: COLORS.memorial[50],    bgEnd: "#FEF9C3",
            headerBorder: "rgba(0,0,0,0.08)",
            userBgStart: COLORS.memorial[500], userBgEnd: "#F97316",
            userText: "#fff",
            petBg: "rgba(255,255,255,0.8)", petText: COLORS.memorial[900] ?? "#78350F", petBorder: COLORS.memorial[200],
            titleText: COLORS.memorial[800],
        },
        active: {
            bgStart: COLORS.memento[200],    bgEnd: "#CFFAFE",
            headerBorder: "rgba(0,0,0,0.08)",
            userBgStart: COLORS.memento[500], userBgEnd: COLORS.memento[500],
            userText: "#fff",
            petBg: "rgba(255,255,255,0.8)", petText: COLORS.memento[900] ?? "#0C4A6E", petBorder: COLORS.memento[200],
            titleText: COLORS.memento[800],
        },
    },
    polaroid: {
        bgStart: "#fff", bgEnd: "#fff",
        headerBorder: "rgba(0,0,0,0.08)",
        userBgStart: COLORS.gray[100], userBgEnd: COLORS.gray[100],
        userText: COLORS.gray[800],
        petBg: COLORS.gray[50], petText: COLORS.gray[700], petBorder: COLORS.gray[200],
        titleText: COLORS.gray[800],
    },
    memorial: {
        bgStart: "#1e1b4b", bgMid: "#4c1d95", bgEnd: "#0f172a",
        headerBorder: "rgba(255,255,255,0.1)",
        userBgStart: "rgba(245,158,11,0.2)", userBgEnd: "rgba(245,158,11,0.2)",
        userText: "#FDE68A",
        petBg: "rgba(255,255,255,0.08)", petText: "rgba(255,255,255,0.9)", petBorder: "rgba(255,255,255,0.15)",
        titleText: COLORS.memorial[200] ?? "#FDE68A",
    },
    cute: {
        memorial: {
            bgStart: "#FCE7F3", bgEnd: "#FEF9C3",
            headerBorder: "rgba(0,0,0,0.06)",
            userBgStart: "#FB923C", userBgEnd: "#F472B6",
            userText: "#fff",
            petBg: "rgba(255,255,255,0.9)", petText: "#C2410C", petBorder: "#FED7AA",
            titleText: "#C2410C",
        },
        active: {
            bgStart: "#FCE7F3", bgEnd: COLORS.memento[200],
            headerBorder: "rgba(0,0,0,0.06)",
            userBgStart: "#F472B6", userBgEnd: "#C084FC",
            userText: "#fff",
            petBg: "rgba(255,255,255,0.9)", petText: "#7E22CE", petBorder: "#E9D5FF",
            titleText: "#BE185D",
        },
    },
} as const;

function getTemplateColors(template: CardTemplate, isMemorial: boolean) {
    if (template === "letter") return isMemorial ? TEMPLATE_COLORS.letter.memorial : TEMPLATE_COLORS.letter.active;
    if (template === "cute") return isMemorial ? TEMPLATE_COLORS.cute.memorial : TEMPLATE_COLORS.cute.active;
    return TEMPLATE_COLORS[template as "polaroid" | "memorial"];
}

const ExportChatCard = forwardRef<View, ExportChatCardProps>(
    ({ messages, pet, isMemorialMode, template }, ref) => {
        const c = getTemplateColors(template, isMemorialMode);
        const chatMessages = messages
            .filter((m) => m.role === "user" || m.role === "pet")
            .slice(-8);

        const today = new Intl.DateTimeFormat("ko-KR", {
            year: "numeric", month: "long", day: "numeric",
        }).format(new Date());

        const bgColors = template === "memorial"
            ? [c.bgStart, (c as typeof TEMPLATE_COLORS.memorial).bgMid, c.bgEnd] as [string, string, string]
            : [c.bgStart, c.bgEnd] as [string, string];

        return (
            <View ref={ref} style={styles.wrapper} collapsable={false}>
                <LinearGradient
                    colors={bgColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.card, { borderColor: c.headerBorder }]}
                >
                    {/* 헤더 */}
                    <View style={[styles.header, { borderBottomColor: c.headerBorder }]}>
                        <View style={styles.avatar}>
                            {pet.profileImage ? (
                                <Image source={{ uri: pet.profileImage }} style={styles.avatarImg} />
                            ) : (
                                <View style={[styles.avatarPlaceholder, { backgroundColor: isMemorialMode ? COLORS.memorial[200] : COLORS.memento[200] }]}>
                                    <Ionicons name="paw" size={20} color={isMemorialMode ? COLORS.memorial[600] : COLORS.memento[600]} />
                                </View>
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Text style={[styles.petName, { color: c.titleText }]}>{pet.name}</Text>
                                {isMemorialMode && (
                                    <Ionicons name="star" size={12} color={COLORS.memorial[400]} />
                                )}
                            </View>
                            <Text style={[styles.petSub, { color: c.titleText, opacity: 0.65 }]}>
                                {isMemorialMode ? "소중한 추억의 대화" : "우리의 대화"}
                            </Text>
                        </View>
                        {template === "memorial" && (
                            <View style={{ flexDirection: "row", gap: 3 }}>
                                {[0, 1, 2].map((i) => (
                                    <Ionicons key={i} name="star" size={12} color={COLORS.memorial[400]} />
                                ))}
                            </View>
                        )}
                    </View>

                    {/* 대화 내용 */}
                    <View style={styles.messages}>
                        {chatMessages.map((msg) => (
                            <View
                                key={msg.id}
                                style={[styles.row, { justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }]}
                            >
                                {msg.role === "user" ? (
                                    <LinearGradient
                                        colors={[c.userBgStart, c.userBgEnd] as [string, string]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={[styles.bubble, styles.userBubble]}
                                    >
                                        <Text style={[styles.bubbleText, { color: c.userText }]}>{msg.content}</Text>
                                    </LinearGradient>
                                ) : (
                                    <View style={[styles.bubble, styles.petBubble, { backgroundColor: c.petBg, borderColor: c.petBorder }]}>
                                        <Text style={[styles.bubbleText, { color: c.petText }]}>{msg.content}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>

                    {/* 푸터 */}
                    <View style={[styles.footer, { borderTopColor: c.headerBorder }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="heart" size={11} color={c.titleText} style={{ opacity: 0.6 }} />
                            <Text style={[styles.footerText, { color: c.titleText }]}>{today}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                            <Ionicons name="paw" size={10} color={c.titleText} style={{ opacity: 0.45 }} />
                            <Text style={[styles.footerText, { color: c.titleText, opacity: 0.45 }]}>mementoani.com</Text>
                        </View>
                    </View>

                    {/* cute 장식 */}
                    {template === "cute" && (
                        <>
                            <View style={{ position: "absolute", top: 12, right: 12, width: 24, height: 24, borderRadius: 12, backgroundColor: "#FBCFE8", opacity: 0.5 }} />
                            <View style={{ position: "absolute", bottom: 12, left: 12, width: 18, height: 18, borderRadius: 9, backgroundColor: "#DDD6FE", opacity: 0.45 }} />
                        </>
                    )}
                    {/* memorial 별 장식 */}
                    {template === "memorial" && [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <Ionicons
                            key={i}
                            name="star"
                            size={10}
                            color="rgba(245,158,11,0.25)"
                            style={{
                                position: "absolute",
                                top: `${((i * 37 + 11) % 100)}%` as unknown as number,
                                left: `${((i * 53 + 7) % 100)}%` as unknown as number,
                            }}
                        />
                    ))}
                </LinearGradient>
            </View>
        );
    }
);

ExportChatCard.displayName = "ExportChatCard";
export default ExportChatCard;

const styles = StyleSheet.create({
    wrapper: { width: CARD_W },
    card: {
        width: CARD_W, borderRadius: 24, padding: 20,
        shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2, shadowRadius: 20, elevation: 8,
        borderWidth: 1.5, overflow: "hidden",
    },
    header: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingBottom: 14, marginBottom: 14, borderBottomWidth: 1,
    },
    avatar: { width: 48, height: 48, borderRadius: 24, overflow: "hidden" },
    avatarImg: { width: "100%", height: "100%" },
    avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    petName: { fontSize: 16, fontWeight: "700" },
    petSub: { fontSize: 11, marginTop: 1 },
    messages: { gap: 8, marginBottom: 14 },
    row: { flexDirection: "row" },
    bubble: { maxWidth: "80%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
    userBubble: { borderBottomRightRadius: 4 },
    petBubble: { borderBottomLeftRadius: 4, borderWidth: 1 },
    bubbleText: { fontSize: 12, lineHeight: 18 },
    footer: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingTop: 12, borderTopWidth: 1,
    },
    footerText: { fontSize: 10, opacity: 0.6 },
});
