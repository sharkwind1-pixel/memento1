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
import { useDarkMode } from "@/contexts/ThemeContext";
import { useSimpleMode } from "@/contexts/SimpleModeContext";
import { COLORS } from "@/lib/theme";
import { getLevelIcon, type PetIconType } from "@/lib/levels";

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
    const { user, profile, points, isAdminUser } = useAuth();
    const { selectedPet, pets, isMemorialMode } = usePet();
    const { isDarkMode, toggleTheme } = useDarkMode();
    const { fontScale, iconScale, spacingScale } = useSimpleMode();

    // 레벨 뱃지 아이콘 (포인트 + 펫 타입 기반)
    // 우선순위: selectedPet → pets[0] → 기본값 "dog"
    const firstPet = selectedPet ?? pets?.[0];
    const petType: PetIconType = firstPet?.type === "고양이" ? "cat"
        : firstPet?.type === "강아지" ? "dog"
        : firstPet?.type ? "other"
        : "dog";
    const levelIcon = getLevelIcon(points ?? 0, petType, isAdminUser);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const iconColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[700];

    return (
        <View style={[styles.container, {
            backgroundColor: bgColor,
            borderBottomColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100],
            paddingHorizontal: 12 * spacingScale,
            paddingVertical: 8 * spacingScale,
            gap: 4 * spacingScale,
        }]}>
            {/* 좌측: 햄버거 또는 뒤로가기 */}
            {showBack ? (
                <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { width: 36 * spacingScale, height: 36 * spacingScale }]} hitSlop={8}>
                    <Ionicons name="arrow-back" size={24 * iconScale} color={iconColor} />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={onOpenDrawer} style={[styles.iconBtn, { width: 36 * spacingScale, height: 36 * spacingScale }]} hitSlop={8}>
                    <Ionicons name="menu" size={24 * iconScale} color={iconColor} />
                </TouchableOpacity>
            )}

            {/* 가운데: 로고 + 제목 (로고 탭 → 홈) */}
            <View style={styles.titleWrap}>
                {title ? (
                    <Text
                        style={[styles.title, { color: textColor, fontSize: 14 * fontScale }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                    >{title}</Text>
                ) : (
                    <TouchableOpacity
                        onPress={() => router.push("/(tabs)")}
                        activeOpacity={0.7}
                        style={[styles.logoRow, { gap: 8 * spacingScale }]}
                    >
                        <Image
                            source={require("@/assets/icon.png")}
                            style={[styles.logoImg, { width: 26 * spacingScale, height: 26 * spacingScale }]}
                            resizeMode="contain"
                        />
                        <Text
                            style={[styles.brandText, { color: textColor, fontSize: 14 * fontScale }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}
                        >메멘토애니</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* 우측: 포인트 + 알림 + 프로필 */}
            {!hideActions ? (
                <View style={[styles.actions, { gap: 4 * spacingScale }]}>
                    {user && (
                        <View style={[styles.pointPill, {
                            backgroundColor: accentColor + "15",
                            paddingHorizontal: 8 * spacingScale,
                            paddingVertical: 4 * spacingScale,
                            gap: 3 * spacingScale,
                            marginRight: 4 * spacingScale,
                        }]}>
                            <Ionicons name="star" size={11 * iconScale} color={accentColor} />
                            <Text style={[styles.pointText, { color: accentColor, fontSize: 11 * fontScale }]}>
                                {(points ?? 0).toLocaleString()}
                            </Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={() => router.push("/notifications")} style={[styles.iconBtn, { width: 36 * spacingScale, height: 36 * spacingScale }]} hitSlop={6}>
                        <Ionicons name="notifications-outline" size={22 * iconScale} color={iconColor} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleTheme} style={[styles.iconBtn, { width: 36 * spacingScale, height: 36 * spacingScale }]} hitSlop={6}>
                        <Ionicons
                            name={isDarkMode ? "sunny" : "moon"}
                            size={20 * iconScale}
                            color={isDarkMode ? "#FBBF24" : iconColor}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push("/profile")} hitSlop={6} style={[styles.profileBtn, { width: 36 * spacingScale, height: 36 * spacingScale }]}>
                        <Image source={levelIcon} style={[styles.avatarImg, { width: 32 * spacingScale, height: 32 * spacingScale, borderRadius: 16 * spacingScale }]} resizeMode="cover" />
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
    avatarImg: { width: 32, height: 32, borderRadius: 16 },
    profileBtn: {
        width: 36, height: 36, alignItems: "center", justifyContent: "center",
    },
});
