/**
 * SegmentActionCards — 모바일 홈 회원 유형별 "지금 해볼 것" 카드 (웹 패리티).
 * profiles.user_type로 분기:
 *  - planning: 반려 사주(SajuModal) + 입양 정보(/adoption)
 *  - current: 케어 리마인더 + 오늘 기록(/(tabs)/record) + AI 펫톡(/(tabs)/ai-chat)
 *  - memorial: 추억 돌아보기(/(tabs)/record) + 마음 나누기(/(tabs)/ai-chat) (amber)
 * 유형 미상이면 미표시.
 */
import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import SajuModal from "@/components/saju/SajuModal";

type Seg = "planning" | "current" | "memorial";
type IconName = React.ComponentProps<typeof Ionicons>["name"];
interface Card { label: string; sub: string; icon: IconName; onPress: () => void; primary?: boolean; }

export default function SegmentActionCards() {
    const router = useRouter();
    const { user } = useAuth();
    const { isDarkMode } = useDarkMode();
    const [seg, setSeg] = useState<Seg | null>(null);
    const [sajuOpen, setSajuOpen] = useState(false);

    useEffect(() => {
        if (!user?.id) { setSeg(null); return; }
        let cancelled = false;
        (async () => {
            try {
                const { data } = await supabase.from("profiles").select("user_type").eq("id", user.id).single();
                if (cancelled) return;
                const t = data?.user_type as Seg | null;
                setSeg(t === "planning" || t === "current" || t === "memorial" ? t : null);
            } catch {
                if (!cancelled) setSeg(null);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.id]);

    if (!seg) return null;

    const isMemorial = seg === "memorial";
    const accent = isMemorial ? COLORS.memorial[500] : COLORS.memento[500];
    const accentText = isMemorial ? COLORS.memorial[600] : COLORS.memento[600];
    const tintIcon = isMemorial ? COLORS.memorial[100] : COLORS.memento[100];

    let heading = "";
    let cards: Card[] = [];
    if (seg === "planning") {
        heading = "입양을 준비하고 있다면";
        cards = [
            { label: "반려 사주", sub: "맞는 아이 · 이름 기운 · 만남 시기", icon: "sparkles", onPress: () => setSajuOpen(true), primary: true },
            { label: "입양 정보", sub: "분양 소식 · 키운 분들 이야기", icon: "search", onPress: () => router.push("/adoption" as never) },
        ];
    } else if (seg === "current") {
        heading = "오늘 우리 아이와";
        cards = [
            { label: "케어 리마인더", sub: "접종 · 산책 · 약", icon: "notifications-outline", onPress: () => router.push("/(tabs)/record" as never) },
            { label: "오늘 기록", sub: "사진 · 타임라인", icon: "book-outline", onPress: () => router.push("/(tabs)/record" as never) },
            { label: "AI 펫톡", sub: "성격 그대로 대화", icon: "chatbubble-outline", onPress: () => router.push("/(tabs)/ai-chat" as never) },
        ];
    } else {
        heading = "함께한 시간을";
        cards = [
            { label: "추억 돌아보기", sub: "우리 아이의 기록", icon: "heart-outline", onPress: () => router.push("/(tabs)/record" as never) },
            { label: "마음 나누기", sub: "보고 싶을 때, AI 펫톡", icon: "chatbubble-outline", onPress: () => router.push("/(tabs)/ai-chat" as never) },
        ];
    }

    const cardBg = isDarkMode ? COLORS.gray[800] + "80" : COLORS.white + "B3";
    const titleColor = isDarkMode ? COLORS.gray[100] : COLORS.gray[800];
    const subColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];

    return (
        <View style={styles.wrap}>
            <Text style={[styles.heading, { color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700] }]}>{heading}</Text>
            <View style={styles.row}>
                {cards.map((c) => (
                    <TouchableOpacity
                        key={c.label}
                        onPress={c.onPress}
                        activeOpacity={0.85}
                        style={[
                            styles.card,
                            c.primary
                                ? { backgroundColor: accent, borderColor: "transparent" }
                                : { backgroundColor: cardBg, borderColor: isDarkMode ? COLORS.gray[700] : COLORS.gray[100] },
                        ]}
                    >
                        <View style={[styles.iconWrap, { backgroundColor: c.primary ? "rgba(255,255,255,0.2)" : tintIcon }]}>
                            <Ionicons name={c.icon} size={18} color={c.primary ? "#fff" : accentText} />
                        </View>
                        <Text style={[styles.cardTitle, { color: c.primary ? "#fff" : titleColor }]}>{c.label}</Text>
                        <Text style={[styles.cardSub, { color: c.primary ? "rgba(255,255,255,0.85)" : subColor }]} numberOfLines={2}>{c.sub}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <SajuModal visible={sajuOpen} onClose={() => setSajuOpen(false)} />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: 16, marginTop: 4, marginBottom: 4 },
    heading: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
    row: { flexDirection: "row", gap: 10 },
    card: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 13 },
    iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    cardTitle: { fontSize: 14, fontWeight: "700", lineHeight: 18 },
    cardSub: { fontSize: 11, marginTop: 2, lineHeight: 15 },
});
