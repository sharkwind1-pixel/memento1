/**
 * RemindersSummary — 일상 모드 기록 탭 상단 위젯
 *
 * 활성 리마인더 개수 + 다음 알림 시각 + 타입별 아이콘 미리보기.
 * 탭하면 RemindersModal을 열어 추가/편집 가능 (AI 펫톡 모달 재사용).
 *
 * 웹 src/components/features/reminders/RemindersSection.tsx의 모바일 요약 버전.
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import RemindersModal from "@/components/chat/RemindersModal";

interface Reminder {
    id: string;
    type: string;
    title: string;
    schedule: { type: string; time: string };
    enabled: boolean;
}

// DB pet_reminders.type CHECK 제약과 정확히 일치 (walk/meal/medicine/vaccine/grooming/vet/custom)
const TYPE_ICON: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
    walk: "walk-outline",
    meal: "restaurant-outline",
    medicine: "medkit-outline",
    vaccine: "shield-checkmark-outline",
    grooming: "water-outline",
    vet: "heart-outline",
    custom: "ellipsis-horizontal-outline",
};

interface Props {
    petId: string;
    petName: string;
    accentColor: string;
}

export default function RemindersSummary({ petId, petName, accentColor }: Props) {
    const { session } = useAuth();
    const { isDarkMode } = useDarkMode();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);

    const load = useCallback(async () => {
        if (!session || !petId) { setLoading(false); return; }
        try {
            const res = await fetch(`${API_BASE_URL}/api/reminders?petId=${encodeURIComponent(petId)}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            const list: Reminder[] = Array.isArray(data?.reminders) ? data.reminders : [];
            setReminders(list);
        } catch {
            // 조용히
        } finally {
            setLoading(false);
        }
    }, [session, petId]);

    useEffect(() => { load(); }, [load]);

    // 실시간 동기화 — pet_reminders 변경 즉시 반영
    useEffect(() => {
        if (!petId) return;
        const channel = supabase
            .channel(`reminders_summary:${petId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "pet_reminders", filter: `pet_id=eq.${petId}` },
                () => { load(); },
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [petId, load]);

    const enabledList = reminders.filter((r) => r.enabled);
    const nextReminder = computeNextReminder(enabledList);

    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const titleColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const subColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];

    return (
        <>
            <TouchableOpacity
                onPress={() => setModalOpen(true)}
                activeOpacity={0.85}
                style={[styles.card, { backgroundColor: cardBg }]}
            >
                <View style={styles.row}>
                    <View style={[styles.iconWrap, { backgroundColor: accentColor + "1a" }]}>
                        <Ionicons name="alarm-outline" size={18} color={accentColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: titleColor }]}>케어 리마인더</Text>
                        {loading ? (
                            <Text style={[styles.sub, { color: subColor }]}>불러오는 중...</Text>
                        ) : enabledList.length === 0 ? (
                            <Text style={[styles.sub, { color: subColor }]}>
                                알림을 추가하고 {petName}의 케어를 잊지 마세요
                            </Text>
                        ) : nextReminder ? (
                            <Text style={[styles.sub, { color: subColor }]}>
                                다음 알림: {nextReminder.title} · {nextReminder.schedule.time}
                            </Text>
                        ) : (
                            <Text style={[styles.sub, { color: subColor }]}>
                                {enabledList.length}개의 알림이 켜져 있어요
                            </Text>
                        )}
                    </View>
                    {loading ? (
                        <ActivityIndicator size="small" color={accentColor} />
                    ) : (
                        <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} />
                    )}
                </View>

                {!loading && enabledList.length > 0 && (
                    <View style={styles.iconRow}>
                        {enabledList.slice(0, 6).map((r) => (
                            <View
                                key={r.id}
                                style={[styles.miniIcon, { backgroundColor: accentColor + "12" }]}
                            >
                                <Ionicons
                                    name={TYPE_ICON[r.type] ?? "alarm-outline"}
                                    size={14}
                                    color={accentColor}
                                />
                            </View>
                        ))}
                        {enabledList.length > 6 && (
                            <View style={[styles.miniIcon, { backgroundColor: accentColor + "12" }]}>
                                <Text style={[styles.miniMore, { color: accentColor }]}>
                                    +{enabledList.length - 6}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </TouchableOpacity>

            <RemindersModal
                visible={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    // 모달 닫으면 다시 로드 (편집/추가 반영)
                    load();
                }}
                petId={petId}
                petName={petName}
                accentColor={accentColor}
                isMemorialMode={false}
            />
        </>
    );
}

/**
 * 가장 가까운 다음 알림을 계산.
 * daily 스케줄만 지원. HH:MM 비교로 오늘 안 / 내일을 결정.
 */
function computeNextReminder(reminders: Reminder[]): Reminder | null {
    if (reminders.length === 0) return null;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let best: { reminder: Reminder; diff: number } | null = null;
    for (const r of reminders) {
        if (r.schedule?.type !== "daily" || !r.schedule.time) continue;
        const [h, m] = r.schedule.time.split(":").map((x) => parseInt(x, 10));
        if (Number.isNaN(h) || Number.isNaN(m)) continue;
        const target = h * 60 + m;
        const diff = target >= nowMinutes ? target - nowMinutes : target + 24 * 60 - nowMinutes;
        if (!best || diff < best.diff) best = { reminder: r, diff };
    }
    return best?.reminder ?? null;
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 12,
        padding: 14,
        borderRadius: 14,
        gap: 12,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    iconWrap: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
    },
    title: { fontSize: 14, fontWeight: "700" },
    sub: { fontSize: 12, marginTop: 2 },
    iconRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    miniIcon: {
        width: 28, height: 28, borderRadius: 8,
        alignItems: "center", justifyContent: "center",
    },
    miniMore: { fontSize: 10, fontWeight: "700" },
});
