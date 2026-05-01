/**
 * 관리자 모드 — 8 탭 (웹 src/components/pages/AdminPage.tsx 매칭)
 *
 * 우선 신고 관리부터 native 이식. 나머지 탭은 placeholder + 웹 admin 안내.
 * 추후 단계적으로 dashboard / users / posts / messages / inquiries /
 * withdrawals / magazine 풀 이식 예정.
 */

import { useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
import { API_BASE_URL } from "@/config/constants";
import AppHeader from "@/components/common/AppHeader";
import AdminReportsTab from "@/components/admin/AdminReportsTab";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminMessagesTab from "@/components/admin/AdminMessagesTab";
import AdminDashboardTab from "@/components/admin/AdminDashboardTab";
import AdminPostsTab from "@/components/admin/AdminPostsTab";
import type { AdminTab } from "@/types";

const TABS: Array<{ id: AdminTab; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = [
    { id: "dashboard", label: "대시보드", icon: "stats-chart-outline" },
    { id: "reports", label: "신고", icon: "flag-outline" },
    { id: "users", label: "회원", icon: "people-outline" },
    { id: "posts", label: "게시글", icon: "document-text-outline" },
    { id: "messages", label: "메시지", icon: "mail-outline" },
    { id: "inquiries", label: "문의", icon: "help-circle-outline" },
    { id: "withdrawals", label: "탈퇴", icon: "person-remove-outline" },
    { id: "magazine", label: "매거진", icon: "book-outline" },
];

export default function AdminScreen() {
    const router = useRouter();
    const { session, isAdminUser } = useAuth();
    const { isDarkMode } = useDarkMode();
    const [tab, setTab] = useState<AdminTab>("reports");

    const accessToken = session?.access_token ?? null;
    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];

    if (!isAdminUser) {
        return (
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <Stack.Screen options={{ headerShown: false }} />
                <AppHeader showBack title="관리자" hideActions />
                <View style={styles.center}>
                    <Ionicons name="lock-closed-outline" size={48} color={COLORS.gray[300]} />
                    <Text style={styles.errText}>관리자 권한이 없어요</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={{ color: COLORS.memento[500], fontWeight: "700" }}>뒤로</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            <AppHeader showBack title="관리자 모드" hideActions />

            {/* 탭 네비 (가로 스크롤) */}
            <View style={[styles.tabBar, { backgroundColor: isDarkMode ? COLORS.gray[900] : "#fff" }]}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabRow}
                >
                    {TABS.map((t) => {
                        const active = tab === t.id;
                        return (
                            <TouchableOpacity
                                key={t.id}
                                onPress={() => setTab(t.id)}
                                style={[
                                    styles.tab,
                                    active && { backgroundColor: "#8B5CF6" },
                                ]}
                                activeOpacity={0.85}
                            >
                                <Ionicons
                                    name={t.icon}
                                    size={14}
                                    color={active ? "#fff" : (isDarkMode ? COLORS.gray[300] : COLORS.gray[600])}
                                />
                                <Text style={{
                                    fontSize: 12, fontWeight: "700",
                                    color: active ? "#fff" : (isDarkMode ? COLORS.gray[300] : COLORS.gray[700]),
                                }}>
                                    {t.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* 탭 내용 */}
            <View style={styles.flex1}>
                {accessToken && tab === "dashboard" ? (
                    <AdminDashboardTab />
                ) : accessToken && tab === "reports" ? (
                    <AdminReportsTab accessToken={accessToken} />
                ) : accessToken && tab === "users" ? (
                    <AdminUsersTab accessToken={accessToken} />
                ) : accessToken && tab === "posts" ? (
                    <AdminPostsTab accessToken={accessToken} />
                ) : accessToken && tab === "messages" ? (
                    <AdminMessagesTab accessToken={accessToken} />
                ) : (
                    <PlaceholderTab tabId={tab} isDarkMode={isDarkMode} />
                )}
            </View>
        </SafeAreaView>
    );
}

function PlaceholderTab({ tabId, isDarkMode }: { tabId: AdminTab; isDarkMode: boolean }) {
    const tabInfo = TABS.find((t) => t.id === tabId);
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[800];

    return (
        <View style={styles.center}>
            <Ionicons name={tabInfo?.icon ?? "construct-outline"} size={48} color={COLORS.gray[300]} />
            <Text style={[styles.placeholderTitle, { color: textColor }]}>
                {tabInfo?.label} 관리
            </Text>
            <Text style={[styles.placeholderText, { color: labelColor }]}>
                모바일 native 이식 진행 중이에요.{"\n"}당장은 웹 관리자 페이지에서 사용해주세요.
            </Text>
            <TouchableOpacity
                onPress={() => Linking.openURL(`${API_BASE_URL}/?tab=admin`)}
                style={styles.openWebBtn}
                activeOpacity={0.85}
            >
                <Ionicons name="open-outline" size={14} color="#fff" />
                <Text style={styles.openWebBtnText}>웹 관리자 열기</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 8 },
    errText: { fontSize: 14, color: COLORS.gray[600], marginTop: 8 },
    backBtn: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 8 },
    tabBar: { borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)" },
    tabRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
    tab: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 9999,
        backgroundColor: "rgba(0,0,0,0.04)",
    },
    placeholderTitle: { fontSize: 17, fontWeight: "700", marginTop: 12 },
    placeholderText: { fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 4 },
    openWebBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        marginTop: 20, paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: "#8B5CF6", borderRadius: 12,
    },
    openWebBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
