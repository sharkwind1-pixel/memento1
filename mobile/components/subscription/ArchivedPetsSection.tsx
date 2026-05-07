/**
 * ArchivedPetsSection — 모바일
 *
 * 웹 src/components/features/subscription/ArchivedPetsSection.tsx 1:1 이식.
 *  - 구독 해지(archived) 상태에서 보관 중인 펫 카드
 *  - 잠금 오버레이 + grayscale 이미지
 *  - 영구 삭제 카운트다운 안내
 */

import { useEffect, useState } from "react";
import {
    View, Text, Image, ScrollView, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

interface ArchivedPet {
    id: string;
    name: string;
    breed: string | null;
    profile_image: string | null;
    status: string | null;
    archived_at: string;
}

interface Props {
    /** 영구 삭제까지 남은 일수 (subscription phase에서 계산해서 전달) */
    daysUntilPurge?: number | null;
}

export default function ArchivedPetsSection({ daysUntilPurge }: Props) {
    const { user } = useAuth();
    const { isDarkMode } = useDarkMode();
    const [pets, setPets] = useState<ArchivedPet[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from("pets")
                .select("id, name, breed, profile_image, status, archived_at")
                .eq("user_id", user.id)
                .not("archived_at", "is", null)
                .order("archived_at", { ascending: false });
            if (!cancelled) {
                setPets(data ?? []);
                setLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    if (!loaded || pets.length === 0) return null;

    const bgColor = isDarkMode ? "rgba(5,178,220,0.10)" : COLORS.memento[50];
    const borderColor = isDarkMode ? "rgba(5,178,220,0.35)" : COLORS.memento[200];

    return (
        <View style={[styles.section, { backgroundColor: bgColor, borderColor }]}>
            <View style={styles.headerRow}>
                <View style={[styles.headerIcon, { backgroundColor: isDarkMode ? "rgba(5,178,220,0.18)" : COLORS.memento[100] }]}>
                    <Ionicons name="lock-closed" size={16} color={COLORS.memento[600]} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: COLORS.memento[700] }]}>
                        보관 중인 아이들 ({pets.length}마리)
                    </Text>
                    <Text style={styles.headerSub}>
                        {daysUntilPurge && daysUntilPurge > 0
                            ? `${daysUntilPurge}일 후 영구 삭제됩니다. 재구독하면 모두 복구돼요.`
                            : "재구독하면 언제든 다시 만날 수 있어요."}
                    </Text>
                </View>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {pets.map((pet) => (
                    <LockedCard key={pet.id} pet={pet} isDarkMode={isDarkMode} />
                ))}
            </ScrollView>
        </View>
    );
}

function LockedCard({ pet, isDarkMode }: { pet: ArchivedPet; isDarkMode: boolean }) {
    const isMemorial = pet.status === "memorial";
    const cardBg = isDarkMode ? COLORS.gray[800] : COLORS.white;
    const borderColor = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];
    return (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.cardImgWrap}>
                {pet.profile_image ? (
                    <Image
                        source={{ uri: pet.profile_image }}
                        style={[styles.cardImg, { opacity: 0.55 }]}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.cardImg, styles.placeholder]}>
                        <Ionicons name="heart-outline" size={28} color={COLORS.gray[400]} />
                    </View>
                )}
                {/* 잠금 배지 */}
                <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={10} color={COLORS.memento[700]} />
                    <Text style={styles.lockBadgeText}>보관 중</Text>
                </View>
            </View>
            <View style={styles.cardText}>
                <Text style={[styles.cardName, { color: isDarkMode ? COLORS.gray[200] : COLORS.gray[700] }]} numberOfLines={1}>
                    {pet.name}
                </Text>
                {pet.breed && (
                    <Text style={styles.cardBreed} numberOfLines={1}>{pet.breed}</Text>
                )}
                {isMemorial && (
                    <Text style={styles.memorialTag}>무지개다리</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        margin: 16,
        padding: 14,
        borderRadius: 18,
        borderWidth: 1,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 12,
    },
    headerIcon: {
        width: 32, height: 32, borderRadius: 10,
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontSize: 13, fontWeight: "700" },
    headerSub: {
        fontSize: 11,
        color: COLORS.memento[600],
        marginTop: 2,
        lineHeight: 16,
    },
    scrollContent: { gap: 10, paddingRight: 4 },
    card: {
        width: 110,
        borderRadius: 12,
        borderWidth: 1,
        overflow: "hidden",
        marginRight: 8,
    },
    cardImgWrap: {
        width: "100%",
        aspectRatio: 1,
        position: "relative",
    },
    cardImg: { width: "100%", height: "100%" },
    placeholder: { backgroundColor: COLORS.gray[100], alignItems: "center", justifyContent: "center" },
    lockBadge: {
        position: "absolute",
        bottom: 6,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: "rgba(255,255,255,0.92)",
        borderRadius: 9999,
    },
    lockBadgeText: { fontSize: 9, fontWeight: "700", color: COLORS.memento[700] },
    cardText: { padding: 8 },
    cardName: { fontSize: 11, fontWeight: "700" },
    cardBreed: { fontSize: 9, color: COLORS.gray[400], marginTop: 2 },
    memorialTag: { fontSize: 9, color: COLORS.memorial[500], marginTop: 2 },
});
