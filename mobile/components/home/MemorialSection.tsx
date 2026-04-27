/**
 * MemorialSection — "마음속에 영원히" 추모 펫 가로 캐러셀
 * GET /api/memorial-today (또는 /api/posts?subcategory=memorial)
 *
 * 별 파티클: react-native-reanimated 없이 정적 위치 + Animated.Value 활용해 단순 fade up.
 * 발자국 데코는 단순 Image/이모지로 대체.
 */

import { useEffect, useRef, useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, Image,
    Animated, Easing, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";

interface MemorialPet {
    id: string;
    name: string;
    type: string;
    breed: string;
    profileImage: string | null;
    isNewlyRegistered: boolean;
    yearsLabel: string;
    condolenceCount: number;
}

const STARS = [
    { left: "8%", size: 3, duration: 12000, delay: 0 },
    { left: "22%", size: 2, duration: 18000, delay: 3000 },
    { left: "40%", size: 4, duration: 14000, delay: 7000 },
    { left: "58%", size: 2, duration: 20000, delay: 1000 },
    { left: "75%", size: 3, duration: 16000, delay: 5000 },
    { left: "90%", size: 2, duration: 22000, delay: 10000 },
];

function StarParticle({ left, size, duration, delay }: typeof STARS[0]) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(anim, {
                toValue: 1,
                duration,
                delay,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
        );
        loop.start();
        return () => loop.stop();
    }, [anim, duration, delay]);

    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -180] });
    const opacity = anim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] });

    return (
        <Animated.View
            style={{
                position: "absolute",
                left: left as `${number}%`,
                bottom: 0,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: COLORS.memorial[300],
                transform: [{ translateY }],
                opacity,
            }}
        />
    );
}

export default function MemorialSection() {
    const router = useRouter();
    const [pets, setPets] = useState<MemorialPet[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/memorial-today`);
                if (!res.ok) {
                    setLoading(false);
                    return;
                }
                const data = await res.json();
                const list = Array.isArray(data?.pets) ? data.pets : Array.isArray(data) ? data : [];
                setPets(list.map((p: Record<string, unknown>): MemorialPet => ({
                    id: typeof p.id === "string" ? p.id : String(p.id ?? ""),
                    name: typeof p.name === "string" ? p.name : "",
                    type: typeof p.type === "string" ? p.type : "",
                    breed: typeof p.breed === "string" ? p.breed : "",
                    profileImage: typeof p.profileImage === "string"
                        ? p.profileImage
                        : (typeof p.profile_image === "string" ? p.profile_image : null),
                    isNewlyRegistered: p.isNewlyRegistered === true || p.is_newly_registered === true,
                    yearsLabel: typeof p.yearsLabel === "string"
                        ? p.yearsLabel
                        : (typeof p.years_label === "string" ? p.years_label : ""),
                    condolenceCount: typeof p.condolenceCount === "number"
                        ? p.condolenceCount
                        : (typeof p.condolence_count === "number" ? p.condolence_count : 0),
                })));
            } catch {
                // 조용히
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <View style={styles.section}>
            {STARS.map((s, i) => <StarParticle key={i} {...s} />)}

            <View style={styles.headerRow}>
                <LinearGradient
                    colors={[COLORS.memorial[500], "#F97316"]}
                    style={styles.iconWrap}
                >
                    <Ionicons name="cloudy-outline" size={18} color="#fff" />
                </LinearGradient>
                <View>
                    <Text style={styles.title}>마음속에 영원히</Text>
                    <Text style={styles.subtitle}>영원히 마음속에 함께해요</Text>
                </View>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <View key={i} style={[styles.card, styles.skeleton]} />
                    ))
                ) : pets.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <View style={styles.emptyIconBg}>
                            <Ionicons name="cloudy-outline" size={28} color={COLORS.memorial[400]} />
                        </View>
                        <Text style={styles.emptyTitle}>무지개다리 건너편에서</Text>
                        <Text style={styles.emptyTitle}>모두 편히 쉬고 있을 거예요</Text>
                        <Text style={styles.emptyHint}>추모 모드로 등록하면 이곳에서 함께 기억해요</Text>
                    </View>
                ) : (
                    pets.map((pet) => (
                        <TouchableOpacity
                            key={pet.id}
                            style={styles.card}
                            activeOpacity={0.85}
                            onPress={() => router.push(`/pet/${pet.id}` as never)}
                        >
                            <View style={styles.cardImageWrap}>
                                {pet.profileImage ? (
                                    <Image source={{ uri: pet.profileImage }} style={styles.cardImage} />
                                ) : (
                                    <LinearGradient
                                        colors={[COLORS.memorial[200], "#FCD34D"]}
                                        style={styles.cardImage}
                                    >
                                        <Ionicons name="paw" size={48} color="rgba(245, 158, 11, 0.6)" />
                                    </LinearGradient>
                                )}
                                {pet.isNewlyRegistered && (
                                    <View style={styles.newBadge}>
                                        <Ionicons name="sparkles" size={10} color="#fff" />
                                        <Text style={styles.newBadgeText}>새로운 기억</Text>
                                    </View>
                                )}
                                {!pet.isNewlyRegistered && pet.yearsLabel ? (
                                    <View style={styles.yearBadge}>
                                        <Text style={styles.yearBadgeText}>{pet.yearsLabel}</Text>
                                    </View>
                                ) : null}
                            </View>
                            <View style={styles.cardBody}>
                                <Text style={styles.cardName}>{pet.name}</Text>
                                <Text style={styles.cardBreed} numberOfLines={1}>
                                    {pet.type}{pet.breed ? ` / ${pet.breed}` : ""}
                                </Text>
                                <View style={styles.divider} />
                                <View style={styles.condolenceRow}>
                                    <Ionicons name="heart" size={12} color={COLORS.memorial[400]} />
                                    <Text style={styles.condolenceText}>
                                        {pet.condolenceCount > 0 ? `위로 ${pet.condolenceCount}` : "영원히 기억할게"}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        position: "relative",
        marginTop: 24,
        paddingVertical: 24,
        backgroundColor: "rgba(255, 251, 235, 0.4)",
        borderRadius: 24,
        marginHorizontal: 16,
        overflow: "hidden",
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    title: { fontSize: 18, fontWeight: "700", color: COLORS.memorial[600] },
    subtitle: { fontSize: 13, color: COLORS.gray[500], marginTop: 2 },
    scrollContent: { paddingHorizontal: 16, gap: 16, paddingBottom: 16 },
    card: {
        width: 220,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: "rgba(252, 211, 77, 0.3)",
        borderRadius: 16,
        overflow: "hidden",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    skeleton: { height: 320, backgroundColor: COLORS.memorial[100] },
    cardImageWrap: { position: "relative" },
    cardImage: {
        width: "100%",
        aspectRatio: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    newBadge: {
        position: "absolute",
        top: 12,
        right: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(245, 158, 11, 0.9)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 9999,
    },
    newBadgeText: { fontSize: 10, fontWeight: "500", color: "#fff" },
    yearBadge: {
        position: "absolute",
        bottom: 12,
        left: 12,
        backgroundColor: "rgba(245, 158, 11, 0.9)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 9999,
    },
    yearBadgeText: { fontSize: 11, fontWeight: "500", color: "#fff" },
    cardBody: { padding: 16, alignItems: "center", gap: 6 },
    cardName: { fontSize: 16, fontWeight: "700", color: COLORS.gray[800] },
    cardBreed: { fontSize: 12, color: COLORS.gray[500] },
    divider: { width: 32, height: 1, backgroundColor: "rgba(252, 211, 77, 0.6)", marginVertical: 4 },
    condolenceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    condolenceText: { fontSize: 12, color: COLORS.memorial[500], fontWeight: "500" },
    emptyWrap: { alignItems: "center", paddingHorizontal: 40, paddingVertical: 24, width: 320 },
    emptyIconBg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.memorial[100],
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    emptyTitle: { fontSize: 14, fontWeight: "500", color: COLORS.memorial[600], textAlign: "center" },
    emptyHint: { fontSize: 11, color: COLORS.memorial[400], marginTop: 12, textAlign: "center" },
});
