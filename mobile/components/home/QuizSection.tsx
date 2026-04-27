/**
 * QuizSection — 자가진단 카드 2x2 그리드
 *
 * 모바일에선 카드만 표시 (실제 퀴즈 진행은 다음 phase).
 * 카드 탭 시 향후 quiz 화면으로 라우팅.
 */

import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";

interface QuizCard {
    id: string;
    title: string;
    subtitle: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    petType: "all" | "dog" | "cat";
}

const QUIZZES: QuizCard[] = [
    { id: "obesity", title: "우리 아이 비만도 체크", subtitle: "5문항으로 간단 확인", icon: "scale-outline", petType: "all" },
    { id: "separation", title: "분리불안 테스트", subtitle: "7문항으로 진단", icon: "heart-dislike-outline", petType: "dog" },
];

export default function QuizSection() {
    const { selectedPet } = usePet();

    const filtered = QUIZZES.filter((q) => {
        if (q.petType === "all") return true;
        if (!selectedPet) return true;
        if (q.petType === "dog" && selectedPet.type === "강아지") return true;
        if (q.petType === "cat" && selectedPet.type === "고양이") return true;
        return false;
    });

    if (filtered.length === 0) return null;

    return (
        <View style={styles.section}>
            <View style={styles.header}>
                <Text style={styles.title}>자가진단</Text>
                <Text style={styles.subtitle}>우리 아이 건강 체크</Text>
            </View>

            <View style={styles.grid}>
                {filtered.map((q) => (
                    <TouchableOpacity
                        key={q.id}
                        style={styles.card}
                        onPress={() => Alert.alert(q.title, "자가진단 퀴즈는 다음 업데이트에 추가됩니다.")}
                        activeOpacity={0.85}
                    >
                        <View style={styles.cardHeader}>
                            <View style={styles.iconBg}>
                                <Ionicons name={q.icon} size={16} color={COLORS.memento[500]} />
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={COLORS.gray[300]} />
                        </View>
                        <Text style={styles.cardTitle}>{q.title}</Text>
                        <Text style={styles.cardSubtitle}>{q.subtitle}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: { paddingHorizontal: 16, marginTop: 16 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    title: { fontSize: 16, fontWeight: "700", color: COLORS.gray[800] },
    subtitle: { fontSize: 11, color: COLORS.gray[400] },
    grid: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
    card: {
        flex: 1,
        minWidth: "45%",
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        borderRadius: 16,
        padding: 16,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    iconBg: {
        width: 32,
        height: 32,
        borderRadius: 12,
        backgroundColor: COLORS.memento[100],
        alignItems: "center",
        justifyContent: "center",
    },
    cardTitle: { fontSize: 14, fontWeight: "600", color: COLORS.gray[800], lineHeight: 18 },
    cardSubtitle: { fontSize: 11, color: COLORS.gray[500], marginTop: 4 },
});
