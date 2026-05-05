/**
 * QuizSection — 자가진단 카드 2x2 그리드 (웹 src/components/features/home/QuizSection.tsx 매칭)
 *
 * 카드 클릭 시 QuizModal 열림 → 문항 진행 → 결과 표시.
 * 펫 종류에 맞는 퀴즈만 필터.
 */

import { useDarkMode } from "@/contexts/ThemeContext";
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
    const { isDarkMode } = useDarkMode();
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

    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const cardBorder = isDarkMode ? COLORS.gray[800] : COLORS.gray[200];
    const titleColor = isDarkMode ? COLORS.white : COLORS.gray[800];
    const subtitleColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const iconBgColor = isDarkMode ? COLORS.gray[800] : COLORS.memento[100];

    return (
        <View style={styles.section}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: titleColor }]}>자가진단</Text>
                <Text style={[styles.subtitle, { color: subtitleColor }]}>우리 아이 건강 체크</Text>
            </View>

            <View style={styles.grid}>
                {availableQuizzes.map((quiz) => {
                    const iconName = QUIZ_ICON_MAP[quiz.icon] || "scale-outline";
                    return (
                        <TouchableOpacity
                            key={quiz.id}
                            onPress={() => setActiveQuiz(quiz)}
                            style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
                            activeOpacity={0.85}
                        >
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconBg, { backgroundColor: iconBgColor }]}>
                                    <Ionicons name={iconName} size={16} color={COLORS.memento[500]} />
                                </View>
                                <Ionicons name="chevron-forward" size={14} color={COLORS.gray[300]} />
                            </View>
                            <Text style={[styles.cardTitle, { color: titleColor }]}>{quiz.title}</Text>
                            <Text style={[styles.cardSubtitle, { color: subtitleColor }]}>{quiz.subtitle}</Text>
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
    title: { fontSize: 16, fontWeight: "700" },
    subtitle: { fontSize: 11 },
    grid: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
    card: {
        flex: 1,
        minWidth: "45%",
        borderWidth: 1,
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
        alignItems: "center",
        justifyContent: "center",
    },
    cardTitle: { fontSize: 14, fontWeight: "600", lineHeight: 18 },
    cardSubtitle: { fontSize: 11, marginTop: 4 },
});
