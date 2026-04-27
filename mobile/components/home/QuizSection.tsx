/**
 * QuizSection — 자가진단 카드 2x2 그리드 (웹 src/components/features/home/QuizSection.tsx 매칭)
 *
 * 카드 클릭 시 QuizModal 열림 → 문항 진행 → 결과 표시.
 * 펫 종류에 맞는 퀴즈만 필터.
 */

import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";
import { PET_QUIZZES, type PetQuiz } from "@/lib/petQuizzes";
import QuizModal from "./QuizModal";

const QUIZ_ICON_MAP: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
    Scale: "scale-outline",
    HeartCrack: "heart-dislike-outline",
};

export default function QuizSection() {
    const { selectedPet } = usePet();
    const [activeQuiz, setActiveQuiz] = useState<PetQuiz | null>(null);

    const availableQuizzes = PET_QUIZZES.filter((q) => {
        if (q.petType === "all") return true;
        if (!selectedPet) return true;
        if (q.petType === "dog" && selectedPet.type === "강아지") return true;
        if (q.petType === "cat" && selectedPet.type === "고양이") return true;
        return false;
    });

    if (availableQuizzes.length === 0) return null;

    return (
        <View style={styles.section}>
            <View style={styles.header}>
                <Text style={styles.title}>자가진단</Text>
                <Text style={styles.subtitle}>우리 아이 건강 체크</Text>
            </View>

            <View style={styles.grid}>
                {availableQuizzes.map((quiz) => {
                    const iconName = QUIZ_ICON_MAP[quiz.icon] || "scale-outline";
                    return (
                        <TouchableOpacity
                            key={quiz.id}
                            onPress={() => setActiveQuiz(quiz)}
                            style={styles.card}
                            activeOpacity={0.85}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.iconBg}>
                                    <Ionicons name={iconName} size={16} color={COLORS.memento[500]} />
                                </View>
                                <Ionicons name="chevron-forward" size={14} color={COLORS.gray[300]} />
                            </View>
                            <Text style={styles.cardTitle}>{quiz.title}</Text>
                            <Text style={styles.cardSubtitle}>{quiz.subtitle}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {activeQuiz ? (
                <QuizModal
                    quiz={activeQuiz}
                    petName={selectedPet?.name}
                    visible={!!activeQuiz}
                    onClose={() => setActiveQuiz(null)}
                />
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    section: { paddingHorizontal: 16, marginTop: 24 },
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
