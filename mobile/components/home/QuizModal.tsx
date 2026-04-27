/**
 * QuizModal — 자가진단 퀴즈 모달 (웹 src/components/features/quiz/QuizModal.tsx 매칭)
 *
 * 기능:
 * - 문항별 선택지 → 점수 합산 → 결과 표시
 * - 진행률 프로그레스 바
 * - 다시 하기 + 결과 공유 (Share API)
 */

import { useState, useCallback } from "react";
import {
    View, Text, TouchableOpacity, ScrollView, Modal,
    StyleSheet, Share, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import type { PetQuiz } from "@/lib/petQuizzes";
import { getQuizResult } from "@/lib/petQuizzes";
import { COLORS } from "@/lib/theme";

interface Props {
    quiz: PetQuiz;
    petName?: string;
    visible: boolean;
    onClose: () => void;
}

export default function QuizModal({ quiz, petName, visible, onClose }: Props) {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<number[]>(new Array(quiz.questions.length).fill(-1));
    const [showResult, setShowResult] = useState(false);

    const totalQuestions = quiz.questions.length;
    const progress = ((currentQuestion + 1) / totalQuestions) * 100;
    const allAnswered = answers.every((a) => a >= 0);
    const totalScore = answers.reduce((sum, s) => sum + Math.max(0, s), 0);
    const result = showResult ? getQuizResult(quiz, totalScore) : null;

    const reset = useCallback(() => {
        setAnswers(new Array(quiz.questions.length).fill(-1));
        setCurrentQuestion(0);
        setShowResult(false);
    }, [quiz.questions.length]);

    function handleClose() {
        reset();
        onClose();
    }

    function handleSelect(questionIdx: number, score: number) {
        Haptics.selectionAsync().catch(() => {});
        setAnswers((prev) => {
            const next = [...prev];
            next[questionIdx] = score;
            return next;
        });
        if (questionIdx < totalQuestions - 1) {
            setTimeout(() => setCurrentQuestion(questionIdx + 1), 300);
        }
    }

    function handleSubmit() {
        if (!allAnswered) {
            Alert.alert("알림", "모든 문항에 답해주세요");
            return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setShowResult(true);
    }

    async function handleShare() {
        if (!result) return;
        const text = quiz.shareText(result, petName);
        try {
            await Share.share({ message: text });
        } catch {
            // 공유 취소
        }
    }

    function getResultColor(colorClass: string): string {
        if (colorClass.includes("green")) return "#10B981";
        if (colorClass.includes("red-700")) return "#B91C1C";
        if (colorClass.includes("red")) return "#EF4444";
        if (colorClass.includes("memorial")) return COLORS.memorial[600];
        return COLORS.memento[600];
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={styles.backdrop}>
                <View style={styles.modal}>
                    {/* 헤더 */}
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title} numberOfLines={1}>{quiz.title}</Text>
                            <Text style={styles.subtitle} numberOfLines={1}>{quiz.subtitle}</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} hitSlop={8} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color={COLORS.gray[500]} />
                        </TouchableOpacity>
                    </View>

                    {!showResult ? (
                        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 16 }}>
                            {/* 프로그레스 */}
                            <View style={styles.progressWrap}>
                                <View style={styles.progressMeta}>
                                    <Text style={styles.progressText}>{currentQuestion + 1} / {totalQuestions}</Text>
                                    <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                                </View>
                                <View style={styles.progressTrack}>
                                    <LinearGradient
                                        colors={[COLORS.memento[500], COLORS.memento[400]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={[styles.progressFill, { width: `${progress}%` }]}
                                    />
                                </View>
                            </View>

                            {/* 문항 */}
                            <View style={styles.questionWrap}>
                                <Text style={styles.questionText}>
                                    {quiz.questions[currentQuestion].text}
                                </Text>
                                <View style={{ gap: 10 }}>
                                    {quiz.questions[currentQuestion].options.map((opt, i) => {
                                        const isSelected = answers[currentQuestion] === opt.score;
                                        return (
                                            <TouchableOpacity
                                                key={i}
                                                onPress={() => handleSelect(currentQuestion, opt.score)}
                                                style={[
                                                    styles.option,
                                                    isSelected && styles.optionSelected,
                                                ]}
                                                activeOpacity={0.85}
                                            >
                                                {isSelected ? (
                                                    <Ionicons name="checkmark-circle" size={18} color={COLORS.memento[500]} style={{ marginRight: 8 }} />
                                                ) : null}
                                                <Text style={[
                                                    styles.optionText,
                                                    isSelected && { color: COLORS.memento[700], fontWeight: "600" },
                                                ]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* 네비게이션 */}
                            <View style={styles.navRow}>
                                <TouchableOpacity
                                    onPress={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
                                    disabled={currentQuestion === 0}
                                    style={[styles.navBtn, styles.navBtnGhost, currentQuestion === 0 && { opacity: 0.4 }]}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name="chevron-back" size={16} color={COLORS.gray[700]} />
                                    <Text style={styles.navBtnGhostText}>이전</Text>
                                </TouchableOpacity>

                                {currentQuestion < totalQuestions - 1 ? (
                                    <TouchableOpacity
                                        onPress={() => setCurrentQuestion((p) => Math.min(totalQuestions - 1, p + 1))}
                                        disabled={answers[currentQuestion] < 0}
                                        style={[
                                            styles.navBtn,
                                            styles.navBtnPrimary,
                                            answers[currentQuestion] < 0 && { opacity: 0.4 },
                                        ]}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.navBtnPrimaryText}>다음</Text>
                                        <Ionicons name="chevron-forward" size={16} color="#fff" />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        onPress={handleSubmit}
                                        disabled={!allAnswered}
                                        style={[
                                            styles.navBtn,
                                            styles.navBtnPrimary,
                                            !allAnswered && { opacity: 0.4 },
                                        ]}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.navBtnPrimaryText}>결과 보기</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </ScrollView>
                    ) : result ? (
                        <ScrollView style={styles.body} contentContainerStyle={{ padding: 20 }}>
                            <Text style={[styles.resultTitle, { color: getResultColor(result.color) }]}>
                                {result.title}
                            </Text>
                            <Text style={styles.resultScore}>
                                총점: {totalScore} / {totalQuestions * 3}
                            </Text>

                            <View style={styles.resultBox}>
                                <Text style={styles.resultDesc}>{result.description}</Text>
                                <View style={styles.resultDivider} />
                                <Text style={styles.resultAdviceLabel}>권장 사항</Text>
                                <Text style={styles.resultAdvice}>{result.advice}</Text>
                            </View>

                            <Text style={styles.disclaimer}>
                                이 결과는 참고용이며 수의사 진료를 대체하지 않습니다.
                            </Text>

                            <View style={styles.resultActions}>
                                <TouchableOpacity onPress={reset} style={[styles.navBtn, styles.navBtnGhost, { flex: 1 }]} activeOpacity={0.75}>
                                    <Ionicons name="refresh" size={16} color={COLORS.gray[700]} />
                                    <Text style={styles.navBtnGhostText}>다시 하기</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleShare} style={[styles.navBtn, styles.navBtnPrimary, { flex: 1 }]} activeOpacity={0.85}>
                                    <Ionicons name="share-social-outline" size={16} color="#fff" />
                                    <Text style={styles.navBtnPrimaryText}>결과 공유</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.footer}>
                                메멘토애니에서 더 많은 진단을 해보세요
                            </Text>
                        </ScrollView>
                    ) : null}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    modal: {
        width: "100%",
        maxWidth: 480,
        maxHeight: "90%",
        backgroundColor: "#fff",
        borderRadius: 24,
        overflow: "hidden",
        elevation: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray[100],
        gap: 12,
    },
    title: { fontSize: 17, fontWeight: "700", color: COLORS.gray[900] },
    subtitle: { fontSize: 12, color: COLORS.gray[500], marginTop: 2 },
    closeBtn: { padding: 6 },
    body: { },
    progressWrap: { paddingHorizontal: 20, paddingTop: 16 },
    progressMeta: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    progressText: { fontSize: 11, color: COLORS.gray[500] },
    progressTrack: {
        height: 8,
        backgroundColor: COLORS.gray[100],
        borderRadius: 4,
        overflow: "hidden",
    },
    progressFill: { height: "100%" },
    questionWrap: { paddingHorizontal: 20, paddingVertical: 24 },
    questionText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.gray[900],
        lineHeight: 24,
        marginBottom: 16,
    },
    option: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: COLORS.gray[200],
        backgroundColor: "#fff",
    },
    optionSelected: {
        borderColor: COLORS.memento[500],
        backgroundColor: COLORS.memento[50],
    },
    optionText: { fontSize: 14, color: COLORS.gray[700], flex: 1 },
    navRow: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    navBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
        minWidth: 100,
    },
    navBtnGhost: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.gray[300],
    },
    navBtnGhostText: { fontSize: 14, fontWeight: "600", color: COLORS.gray[700] },
    navBtnPrimary: { backgroundColor: COLORS.memento[500] },
    navBtnPrimaryText: { fontSize: 14, fontWeight: "700", color: "#fff" },
    resultTitle: {
        fontSize: 26,
        fontWeight: "800",
        textAlign: "center",
        marginBottom: 8,
    },
    resultScore: {
        fontSize: 13,
        color: COLORS.gray[500],
        textAlign: "center",
        marginBottom: 16,
    },
    resultBox: {
        backgroundColor: COLORS.gray[50],
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
    },
    resultDesc: { fontSize: 14, lineHeight: 22, color: COLORS.gray[800], marginBottom: 12 },
    resultDivider: {
        height: 1,
        backgroundColor: COLORS.gray[200],
        marginBottom: 12,
    },
    resultAdviceLabel: { fontSize: 12, fontWeight: "700", color: COLORS.gray[700], marginBottom: 6 },
    resultAdvice: { fontSize: 12, lineHeight: 20, color: COLORS.gray[600] },
    disclaimer: {
        fontSize: 10,
        color: COLORS.gray[400],
        textAlign: "center",
        marginBottom: 14,
    },
    resultActions: { flexDirection: "row", gap: 10, marginBottom: 14 },
    footer: {
        fontSize: 11,
        color: COLORS.gray[400],
        textAlign: "center",
    },
});
