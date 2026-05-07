/**
 * ShowcaseBanner — 모바일
 *
 * 웹 src/components/features/community/ShowcaseBanner.tsx 1:1 이식.
 *  - "함께 보기" CTA 카드 (그라데이션)
 *  - 미리보기 이미지 스택 (최대 4장 + +N)
 *  - 탭 → showcase 모드 전환 (router.push("/(tabs)/community?view=showcase"))
 */

import {
    View, Text, TouchableOpacity, Image, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "@/lib/theme";

interface Props {
    previewImages: string[];
    postCount: number;
    onOpen: () => void;
}

export default function ShowcaseBanner({ previewImages, postCount, onOpen }: Props) {
    const display = previewImages.slice(0, 4);
    const extra = postCount > 4 ? postCount - 4 : 0;

    return (
        <View style={styles.wrap}>
            <TouchableOpacity onPress={onOpen} activeOpacity={0.92}>
                <LinearGradient
                    colors={[COLORS.memorial[400], "#FB923C", "#F87171"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.card}
                >
                    {/* 배경 장식 (원형 light overlay) */}
                    <View style={styles.bgCircle1} />
                    <View style={styles.bgCircle2} />

                    <View style={styles.row}>
                        {/* 미리보기 이미지 스택 */}
                        {display.length > 0 ? (
                            <View style={styles.stack}>
                                {display.map((src, idx) => (
                                    <Image
                                        key={idx}
                                        source={{ uri: src }}
                                        style={[
                                            styles.thumb,
                                            { zIndex: 4 - idx, marginLeft: idx === 0 ? 0 : -10 },
                                        ]}
                                        resizeMode="cover"
                                    />
                                ))}
                                {extra > 0 && (
                                    <View style={[styles.thumb, styles.extraThumb, { marginLeft: -10, zIndex: 0 }]}>
                                        <Text style={styles.extraText}>+{extra}</Text>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={[styles.thumb, styles.placeholder]}>
                                <Ionicons name="camera" size={22} color="#fff" />
                            </View>
                        )}

                        {/* 텍스트 */}
                        <View style={{ flex: 1 }}>
                            <View style={styles.titleRow}>
                                <Ionicons name="star" size={14} color="#fff" />
                                <Text style={styles.title}>함께 보기</Text>
                            </View>
                            <Text style={styles.subtitle} numberOfLines={1}>
                                우리 아이들의 사진과 영상을 함께 감상해요
                            </Text>
                        </View>

                        {/* 화살표 */}
                        <View style={styles.arrowBg}>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: 16, marginBottom: 12 },
    card: {
        borderRadius: 18,
        padding: 16,
        position: "relative",
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    bgCircle1: {
        position: "absolute",
        top: -40, right: -40,
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: "rgba(255,255,255,0.10)",
    },
    bgCircle2: {
        position: "absolute",
        bottom: -30, left: -30,
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: "rgba(255,255,255,0.10)",
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    stack: { flexDirection: "row" },
    thumb: {
        width: 44, height: 44, borderRadius: 22,
        borderWidth: 2,
        borderColor: "#fff",
    },
    placeholder: { backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
    extraThumb: {
        backgroundColor: "rgba(0,0,0,0.45)",
        alignItems: "center",
        justifyContent: "center",
    },
    extraText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
    title: { color: "#fff", fontSize: 15, fontWeight: "800" },
    subtitle: { color: "rgba(255,255,255,0.9)", fontSize: 11 },
    arrowBg: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.22)",
        alignItems: "center", justifyContent: "center",
    },
});
