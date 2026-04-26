/**
 * SectionHeader — 홈 화면 각 섹션 공통 헤더
 * 좌측 아이콘 + 제목, 우측 "더보기" 버튼.
 */

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING } from "@/lib/theme";

interface Props {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    actionLabel?: string;
    onAction?: () => void;
    isMemorialMode?: boolean;
}

export default function SectionHeader({
    icon,
    title,
    actionLabel,
    onAction,
    isMemorialMode,
}: Props) {
    const accentColor = isMemorialMode ? COLORS.memorial[600] : COLORS.memento[600];

    return (
        <View style={styles.container}>
            <View style={styles.left}>
                <Ionicons name={icon} size={18} color={accentColor} />
                <Text style={styles.title}>{title}</Text>
            </View>
            {actionLabel && onAction && (
                <TouchableOpacity onPress={onAction} activeOpacity={0.6}>
                    <Text style={[styles.action, { color: accentColor }]}>
                        {actionLabel} →
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.sm,
    },
    left: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
    },
    title: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.gray[900],
    },
    action: {
        fontSize: 12,
        fontWeight: "600",
    },
});
