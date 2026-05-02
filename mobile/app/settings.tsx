/**
 * 설정 화면 — 알림 토글 + 화면 설정 + 위치동의 + 차단 유저
 *
 * 웹 src/components/Auth/NotificationSettingsSection.tsx 1:1 매칭.
 *  - 알림 (댓글/좋아요/리마인더) 토글 → AsyncStorage
 *  - 화면 (간편 모드) → AsyncStorage
 *  - 위치 동의 → profiles.location_consent
 *  - 차단한 유저 → /api/blocks GET/DELETE
 */

import { useEffect, useState } from "react";
import {
    View, Text, Switch, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";
import { API_BASE_URL } from "@/config/constants";
import { supabase } from "@/lib/supabase";
import AppHeader from "@/components/common/AppHeader";

const STORAGE_NOTIF = "memento-notif-settings";
const STORAGE_SIMPLE = "memento-simple-mode";

interface BlockedUser {
    id: string;
    blockedUserId: string;
    blockedNickname: string;
    reason: string | null;
    createdAt: string;
}

export default function SettingsScreen() {
    const router = useRouter();
    const { session, user } = useAuth();
    const { isDarkMode } = useDarkMode();
    const { isMemorialMode } = usePet();

    const [notifComment, setNotifComment] = useState(true);
    const [notifLike, setNotifLike] = useState(true);
    const [notifReminder, setNotifReminder] = useState(true);
    const [simpleMode, setSimpleMode] = useState(false);
    const [locationConsent, setLocationConsent] = useState(false);
    const [savingLocation, setSavingLocation] = useState(false);

    const [blocks, setBlocks] = useState<BlockedUser[]>([]);
    const [blocksLoading, setBlocksLoading] = useState(true);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];

    // ============== 알림 + 간편모드: AsyncStorage 로드 ==============
    useEffect(() => {
        (async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_NOTIF);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (typeof parsed.comment === "boolean") setNotifComment(parsed.comment);
                    if (typeof parsed.like === "boolean") setNotifLike(parsed.like);
                    if (typeof parsed.reminder === "boolean") setNotifReminder(parsed.reminder);
                }
                const simple = await AsyncStorage.getItem(STORAGE_SIMPLE);
                if (simple === "true") setSimpleMode(true);
            } catch {
                // 기본값 유지
            }
        })();
    }, []);

    // ============== 위치 동의 로드 ==============
    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            try {
                const { data } = await supabase
                    .from("profiles")
                    .select("location_consent")
                    .eq("id", user.id)
                    .single();
                if (data && typeof data.location_consent === "boolean") {
                    setLocationConsent(data.location_consent);
                }
            } catch {
                // 기본값 유지
            }
        })();
    }, [user?.id]);

    // ============== 차단 목록 로드 ==============
    useEffect(() => {
        if (!session?.access_token) {
            setBlocksLoading(false);
            return;
        }
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/blocks`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                setBlocks(Array.isArray(data?.blocks) ? data.blocks : []);
            } catch {
                // 조용히
            } finally {
                setBlocksLoading(false);
            }
        })();
    }, [session?.access_token]);

    async function persistNotif(next: { comment: boolean; like: boolean; reminder: boolean }) {
        try {
            await AsyncStorage.setItem(STORAGE_NOTIF, JSON.stringify(next));
        } catch {
            // 조용히
        }
    }

    function handleNotifToggle(key: "comment" | "like" | "reminder", value: boolean) {
        const next = {
            comment: key === "comment" ? value : notifComment,
            like: key === "like" ? value : notifLike,
            reminder: key === "reminder" ? value : notifReminder,
        };
        if (key === "comment") setNotifComment(value);
        if (key === "like") setNotifLike(value);
        if (key === "reminder") setNotifReminder(value);
        persistNotif(next);
    }

    async function handleSimpleToggle(value: boolean) {
        setSimpleMode(value);
        try {
            await AsyncStorage.setItem(STORAGE_SIMPLE, value ? "true" : "false");
        } catch {
            // 조용히
        }
    }

    async function handleLocationToggle(value: boolean) {
        if (!user?.id || savingLocation) return;
        setSavingLocation(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    location_consent: value,
                    location_consent_at: value ? new Date().toISOString() : null,
                })
                .eq("id", user.id);
            if (error) throw new Error(error.message);
            setLocationConsent(value);
        } catch (e) {
            Alert.alert("설정 실패", e instanceof Error ? e.message : "다시 시도해주세요.");
        } finally {
            setSavingLocation(false);
        }
    }

    async function handleUnblock(blockedUserId: string, nickname: string) {
        Alert.alert(
            "차단 해제",
            `${nickname}님의 차단을 해제할까요?`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "해제",
                    onPress: async () => {
                        if (!session?.access_token) return;
                        try {
                            const res = await fetch(`${API_BASE_URL}/api/blocks?blockedUserId=${encodeURIComponent(blockedUserId)}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${session.access_token}` },
                            });
                            if (!res.ok) {
                                const err = await res.json().catch(() => ({}));
                                throw new Error(err.error || "차단 해제 실패");
                            }
                            setBlocks((prev) => prev.filter((b) => b.blockedUserId !== blockedUserId));
                        } catch (e) {
                            Alert.alert("실패", e instanceof Error ? e.message : "다시 시도해주세요.");
                        }
                    },
                },
            ],
        );
    }

    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const labelColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const subColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            <AppHeader showBack title="설정" hideActions />
            <ScrollView contentContainerStyle={styles.content}>
                {/* 알림 설정 */}
                <SectionCard title="알림" icon="notifications-outline" cardBg={cardBg} labelColor={labelColor}>
                    <ToggleRow
                        label="댓글 알림"
                        value={notifComment}
                        onChange={(v) => handleNotifToggle("comment", v)}
                        accentColor={accentColor}
                        labelColor={labelColor}
                    />
                    <ToggleRow
                        label="좋아요 알림"
                        value={notifLike}
                        onChange={(v) => handleNotifToggle("like", v)}
                        accentColor={accentColor}
                        labelColor={labelColor}
                    />
                    <ToggleRow
                        label="케어 리마인더 알림"
                        value={notifReminder}
                        onChange={(v) => handleNotifToggle("reminder", v)}
                        accentColor={accentColor}
                        labelColor={labelColor}
                        last
                    />
                    <Text style={[styles.hint, { color: subColor }]}>
                        앱 푸시는 시스템 권한 설정에서 별도로 관리됩니다
                    </Text>
                </SectionCard>

                {/* 화면 설정 */}
                <SectionCard title="화면 설정" icon="eye-outline" cardBg={cardBg} labelColor={labelColor}>
                    <ToggleRow
                        label="크게 보기"
                        sub="홈 화면을 큰 버튼으로 간편하게 표시"
                        value={simpleMode}
                        onChange={handleSimpleToggle}
                        accentColor={accentColor}
                        labelColor={labelColor}
                        subColor={subColor}
                        last
                    />
                </SectionCard>

                {/* 위치정보 동의 */}
                <SectionCard title="위치정보 서비스" icon="location-outline" cardBg={cardBg} labelColor={labelColor}>
                    <ToggleRow
                        label="위치기반 서비스 이용 동의"
                        sub="주변 동물병원, 지역 정보 등 맞춤 서비스 제공"
                        value={locationConsent}
                        onChange={handleLocationToggle}
                        accentColor={accentColor}
                        labelColor={labelColor}
                        subColor={subColor}
                        disabled={savingLocation}
                        last
                    />
                </SectionCard>

                {/* 차단한 유저 */}
                <SectionCard title="차단한 사용자" icon="ban-outline" cardBg={cardBg} labelColor={labelColor}>
                    {blocksLoading ? (
                        <ActivityIndicator color={accentColor} style={{ paddingVertical: 12 }} />
                    ) : blocks.length === 0 ? (
                        <Text style={[styles.empty, { color: subColor }]}>
                            차단한 사용자가 없어요
                        </Text>
                    ) : (
                        blocks.map((b, i) => (
                            <View
                                key={b.id}
                                style={[
                                    styles.blockRow,
                                    i < blocks.length - 1 && {
                                        borderBottomWidth: 1,
                                        borderBottomColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100],
                                    },
                                ]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.blockName, { color: labelColor }]}>{b.blockedNickname}</Text>
                                    {b.reason ? (
                                        <Text style={[styles.blockReason, { color: subColor }]} numberOfLines={1}>
                                            사유: {b.reason}
                                        </Text>
                                    ) : null}
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleUnblock(b.blockedUserId, b.blockedNickname)}
                                    style={[styles.unblockBtn, { borderColor: accentColor }]}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[styles.unblockText, { color: accentColor }]}>해제</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </SectionCard>

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

function SectionCard({ title, icon, cardBg, labelColor, children }: {
    title: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    cardBg: string;
    labelColor: string;
    children: React.ReactNode;
}) {
    return (
        <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
                <Ionicons name={icon} size={16} color={labelColor} />
                <Text style={[styles.sectionTitle, { color: labelColor }]}>{title}</Text>
            </View>
            <View style={[styles.card, { backgroundColor: cardBg }]}>{children}</View>
        </View>
    );
}

function ToggleRow({ label, sub, value, onChange, accentColor, labelColor, subColor, disabled, last }: {
    label: string;
    sub?: string;
    value: boolean;
    onChange: (v: boolean) => void;
    accentColor: string;
    labelColor: string;
    subColor?: string;
    disabled?: boolean;
    last?: boolean;
}) {
    return (
        <View style={[
            styles.toggleRow,
            !last && { borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
        ]}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: labelColor }]}>{label}</Text>
                {sub ? <Text style={[styles.toggleSub, { color: subColor ?? COLORS.gray[500] }]}>{sub}</Text> : null}
            </View>
            <Switch
                value={value}
                onValueChange={onChange}
                disabled={disabled}
                trackColor={{ false: COLORS.gray[300], true: accentColor }}
                thumbColor="#fff"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    content: { padding: 16, gap: 16 },
    sectionCard: {},
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
        marginLeft: 4,
    },
    sectionTitle: { fontSize: 13, fontWeight: "700" },
    card: { borderRadius: 14, padding: 8 },
    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    toggleLabel: { fontSize: 14, fontWeight: "500" },
    toggleSub: { fontSize: 11, marginTop: 2 },
    hint: { fontSize: 11, marginTop: 8, paddingHorizontal: 8 },
    empty: { fontSize: 13, textAlign: "center", paddingVertical: 16 },
    blockRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    blockName: { fontSize: 14, fontWeight: "500" },
    blockReason: { fontSize: 11, marginTop: 2 },
    unblockBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 9999,
        borderWidth: 1,
    },
    unblockText: { fontSize: 12, fontWeight: "600" },
});
