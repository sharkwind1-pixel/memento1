/**
 * AppHeader — 모든 화면 공통 헤더 (웹 Layout.tsx 매칭)
 *
 * 구조:
 * - 햄버거 메뉴 (좌측, Drawer 열기)
 * - 로고 + 메멘토애니 (가운데 또는 좌측)
 * - 알림 벨 (우측)
 * - 프로필 아바타 (우측)
 *
 * 추모 모드 시 색상 분기.
 */

import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";

interface AppHeaderProps {
    onOpenDrawer?: () => void;
    /** 헤더 좌측에 메뉴 대신 뒤로가기 버튼 표시 */
    showBack?: boolean;
    title?: string;
    /** 우측 액션 숨기기 (모달 화면 등) */
    hideActions?: boolean;
}

export default function AppHeader({ onOpenDrawer, showBack, title, hideActions }: AppHeaderProps) {
    const router = useRouter();
    const { user, points } = useAuth();
    const { isMemorialMode } = usePet();

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.white;
    const textColor = isMemorialMode ? COLORS.white : COLORS.gray[900];
    const iconColor = isMemorialMode ? COLORS.gray[300] : COLORS.gray[700];

    return (
        <View style={[styles.container, { backgroundColor: bgColor, borderBottomColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100] }]}>
            {/* 좌측: 햄버거 또는 뒤로가기 */}
            {showBack ? (
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
                    <Ionicons name="arrow-back" size={24} color={iconColor} />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={onOpenDrawer} style={styles.iconBtn} hitSlop={8}>
                    <Ionicons name="menu" size={24} color={iconColor} />
                </TouchableOpacity>
            )}

            {/* 가운데: 로고 + 제목 */}
            <View style={styles.titleWrap}>
                {title ? (
                    <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>{title}</Text>
                ) : (
                    <View style={styles.logoRow}>
                        <Image
                            source={require("@/assets/icon.png")}
                            style={styles.logoImg}
                            resizeMode="contain"
                        />
                        <Text style={[styles.brandText, { color: textColor }]}>메멘토애니</Text>
                    </View>
                )}
            </View>

            {/* 우측: 포인트 + 알림 + 프로필 */}
            {!hideActions ? (
                <View style={styles.actions}>
                    {user && (
                        <View style={[styles.pointPill, { backgroundColor: accentColor + "15" }]}>
                            <Ionicons name="star" size={11} color={accentColor} />
                            <Text style={[styles.pointText, { color: accentColor }]}>
                                {(points ?? 0).toLocaleString()}
                            </Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={() => router.push("/notifications")} style={styles.iconBtn} hitSlop={6}>
                        <Ionicons name="notifications-outline" size={22} color={iconColor} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push("/profile")} style={styles.iconBtn} hitSlop={6}>
                        <Ionicons name="person-circle-outline" size={26} color={iconColor} />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.actions} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        gap: 4,
    },
    iconBtn: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
    },
    titleWrap: { flex: 1, alignItems: "flex-start", paddingHorizontal: 4 },
    logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    logoImg: { width: 26, height: 26, borderRadius: 6 },
    brandText: { fontSize: 16, fontWeight: "700" },
    title: { fontSize: 16, fontWeight: "600" },
    actions: { flexDirection: "row", alignItems: "center", gap: 4 },
    pointPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 9999,
        marginRight: 4,
    },
    pointText: { fontSize: 11, fontWeight: "600" },
});
