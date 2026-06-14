/**
 * SajuModal — 반려 사주 (모바일, 웹 src/components/features/saju/SajuModal.tsx 패리티).
 * 생년월일[+성별/시각] → 서버 /api/saju (만세력 엔진 + GPT) → 4기둥·오행·띠 +
 * 맞는 반려동물 / 이름 기운 가이드 / 만남 시기.
 * 톤: 재미로 보는 가벼운 안내, 이모지 없음. 날짜는 마스킹 TextInput(date-picker 의존성 없음).
 */
import { useState, useCallback } from "react";
import {
    Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { API_BASE_URL } from "@/config/constants";

const GREEN = "#16A34A";
const ELEMENT_COLORS: Record<string, string> = {
    목: GREEN, 화: COLORS.red[500], 토: COLORS.memorial[600], 금: COLORS.gray[500], 수: COLORS.memento[500],
};

interface PillarText { ko: string; hanja: string; }
interface ChartView {
    year: PillarText; month: PillarText; day: PillarText; hour: PillarText | null;
    elements: Record<string, number>;
    dayMasterElement: string;
    zodiac: string;
    knownTime: boolean;
}
interface Reading {
    summary?: string;
    matchPets?: { type: string; reason: string }[];
    naming?: { guide?: string; themes?: string[] };
    timing?: string;
}

interface Props {
    visible: boolean;
    onClose: () => void;
}

function maskDate(v: string): string {
    const d = v.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 4) return d;
    if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}
function maskTime(v: string): string {
    const d = v.replace(/\D/g, "").slice(0, 4);
    if (d.length <= 2) return d;
    return `${d.slice(0, 2)}:${d.slice(2)}`;
}

export default function SajuModal({ visible, onClose }: Props) {
    const insets = useSafeAreaInsets();
    const { session } = useAuth();
    const { isDarkMode } = useDarkMode();

    const [phase, setPhase] = useState<"form" | "loading" | "result">("form");
    const [error, setError] = useState<string | null>(null);
    const [birth, setBirth] = useState("");
    const [gender, setGender] = useState<"남" | "여" | null>(null);
    const [knownTime, setKnownTime] = useState(false);
    const [time, setTime] = useState("");
    const [chart, setChart] = useState<ChartView | null>(null);
    const [reading, setReading] = useState<Reading | null>(null);

    const reset = useCallback(() => {
        setPhase("form"); setChart(null); setReading(null); setError(null);
    }, []);

    const close = useCallback(() => {
        onClose();
        // 닫을 때 폼으로 초기화(다음에 다시 열면 깨끗하게)
        setTimeout(reset, 200);
    }, [onClose, reset]);

    const submit = useCallback(async () => {
        setError(null);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) {
            setError("생년월일을 YYYY-MM-DD로 입력해주세요.");
            return;
        }
        const [y, m, d] = birth.split("-").map(Number);
        let hour: number | undefined, minute: number | undefined;
        if (knownTime) {
            if (!/^\d{2}:\d{2}$/.test(time)) { setError("태어난 시각을 HH:MM으로 입력하거나 '시간 모름'으로 두세요."); return; }
            [hour, minute] = time.split(":").map(Number);
        }
        const token = session?.access_token;
        if (!token) { setError("로그인이 필요해요."); return; }

        setPhase("loading");
        try {
            const res = await fetch(`${API_BASE_URL}/api/saju`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ year: y, month: m, day: d, hour, minute, knownTime, gender }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data?.error || "사주를 보지 못했어요."); setPhase("form"); return; }
            setChart(data.chart); setReading(data.reading); setPhase("result");
        } catch {
            setError("네트워크 문제로 사주를 보지 못했어요."); setPhase("form");
        }
    }, [birth, knownTime, time, gender, session]);

    const bg = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const text = isDarkMode ? COLORS.white : COLORS.gray[900];
    const sub = COLORS.gray[500];
    const border = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];
    const inputBg = isDarkMode ? COLORS.gray[900] : COLORS.white;

    const pillars = chart ? [
        { label: "시", p: chart.hour },
        { label: "일", p: chart.day },
        { label: "월", p: chart.month },
        { label: "년", p: chart.year },
    ] : [];

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={close}>
            <View style={styles.overlay}>
                <SafeAreaView edges={["top"]} style={[styles.sheet, { backgroundColor: bg }]}>
                    <View style={[styles.header, { backgroundColor: COLORS.memento[500] }]}>
                        <View style={styles.headerLeft}>
                            <Ionicons name="sparkles" size={20} color="#fff" />
                            <Text style={styles.headerTitle}>반려 사주</Text>
                        </View>
                        <TouchableOpacity onPress={close} hitSlop={12}><Ionicons name="close" size={22} color="#fff" /></TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 28 }} keyboardShouldPersistTaps="handled">
                        {phase === "form" && (
                            <View style={{ gap: 16 }}>
                                <Text style={[styles.intro, { color: sub }]}>
                                    재미로 보는 반려 사주예요. 생년월일을 넣으면 오행을 풀어 잘 맞는 반려동물과 이름 기운, 만남에 좋은 시기를 살짝 짚어드려요.
                                </Text>

                                <View>
                                    <Text style={[styles.label, { color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700] }]}>생년월일</Text>
                                    <TextInput
                                        style={[styles.input, { color: text, backgroundColor: inputBg, borderColor: border }]}
                                        placeholder="1990-05-15" placeholderTextColor={COLORS.gray[400]}
                                        value={birth} onChangeText={(v) => setBirth(maskDate(v))}
                                        keyboardType="number-pad" maxLength={10}
                                    />
                                </View>

                                <View>
                                    <Text style={[styles.label, { color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700] }]}>성별 (선택)</Text>
                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                        {(["남", "여"] as const).map((g) => (
                                            <TouchableOpacity key={g} onPress={() => setGender(gender === g ? null : g)}
                                                style={[styles.genderBtn, { borderColor: gender === g ? COLORS.memento[500] : border, backgroundColor: gender === g ? COLORS.memento[500] : inputBg }]}>
                                                <Text style={{ color: gender === g ? "#fff" : sub, fontWeight: "600" }}>{g}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View>
                                    <TouchableOpacity style={styles.checkRow} onPress={() => setKnownTime((v) => !v)} activeOpacity={0.7}>
                                        <Ionicons name={knownTime ? "checkbox" : "square-outline"} size={22} color={knownTime ? COLORS.memento[500] : COLORS.gray[400]} />
                                        <Text style={[styles.checkText, { color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700] }]}>태어난 시각을 알아요 (시주까지 봄)</Text>
                                    </TouchableOpacity>
                                    {knownTime && (
                                        <TextInput
                                            style={[styles.input, { color: text, backgroundColor: inputBg, borderColor: border, marginTop: 8 }]}
                                            placeholder="06:30" placeholderTextColor={COLORS.gray[400]}
                                            value={time} onChangeText={(v) => setTime(maskTime(v))}
                                            keyboardType="number-pad" maxLength={5}
                                        />
                                    )}
                                </View>

                                {error && <Text style={{ color: COLORS.red[600], fontSize: 13 }}>{error}</Text>}

                                <TouchableOpacity onPress={submit} style={[styles.submit, { backgroundColor: COLORS.memento[500] }]}>
                                    <Text style={styles.submitText}>사주 보기</Text>
                                </TouchableOpacity>
                                <Text style={[styles.note, { color: COLORS.gray[400] }]}>한국 표준시 기준이에요. 가벼운 재미로 봐주세요.</Text>
                            </View>
                        )}

                        {phase === "loading" && (
                            <View style={{ paddingVertical: 60, alignItems: "center" }}>
                                <ActivityIndicator size="large" color={COLORS.memento[400]} />
                                <Text style={{ color: sub, marginTop: 12, fontSize: 13 }}>오행을 풀어보는 중이에요...</Text>
                            </View>
                        )}

                        {phase === "result" && chart && (
                            <View style={{ gap: 18 }}>
                                <View>
                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                        {pillars.map(({ label, p }) => (
                                            <View key={label} style={{ flex: 1, alignItems: "center" }}>
                                                <Text style={{ fontSize: 11, color: COLORS.gray[400], marginBottom: 4 }}>{label}주</Text>
                                                <View style={[styles.pillar, { backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[50], borderColor: border }]}>
                                                    <Text style={{ fontSize: 18, fontWeight: "800", color: text }}>{p ? p.hanja : "—"}</Text>
                                                    <Text style={{ fontSize: 11, color: sub }}>{p ? p.ko : "시간모름"}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 10, alignItems: "center" }}>
                                        <Text style={{ fontSize: 12, color: sub }}>{chart.zodiac}띠 · 일간 {chart.dayMasterElement}</Text>
                                        {Object.entries(chart.elements).map(([e, n]) => (
                                            <View key={e} style={{ backgroundColor: (ELEMENT_COLORS[e] || COLORS.gray[400]) + "22", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                                                <Text style={{ fontSize: 11, fontWeight: "600", color: ELEMENT_COLORS[e] || COLORS.gray[600] }}>{e} {n}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                {reading?.summary && (
                                    <Text style={[styles.summary, { color: isDarkMode ? COLORS.gray[200] : COLORS.gray[700], backgroundColor: isDarkMode ? COLORS.memento[900] + "33" : "#EAF8FC" }]}>{reading.summary}</Text>
                                )}

                                {reading?.matchPets && reading.matchPets.length > 0 && (
                                    <View style={{ gap: 8 }}>
                                        <Text style={[styles.h3, { color: text }]}>나와 잘 맞는 반려동물</Text>
                                        {reading.matchPets.map((m, i) => (
                                            <View key={i} style={[styles.matchCard, { borderColor: border }]}>
                                                <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.memento[600] }}>{m.type}</Text>
                                                <Text style={{ fontSize: 12, color: sub, marginTop: 2 }}>{m.reason}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {reading?.naming && (reading.naming.guide || (reading.naming.themes && reading.naming.themes.length > 0)) && (
                                    <View style={{ gap: 6 }}>
                                        <Text style={[styles.h3, { color: text }]}>이름에 담으면 좋은 기운</Text>
                                        {reading.naming.guide && <Text style={{ fontSize: 14, color: isDarkMode ? COLORS.gray[200] : COLORS.gray[700], lineHeight: 21 }}>{reading.naming.guide}</Text>}
                                        {reading.naming.themes && reading.naming.themes.length > 0 && (
                                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                                                {reading.naming.themes.map((t, i) => (
                                                    <View key={i} style={{ backgroundColor: isDarkMode ? COLORS.memento[900] + "33" : "#EAF8FC", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
                                                        <Text style={{ fontSize: 12, color: COLORS.memento[700] }}>{t}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                        <Text style={{ fontSize: 11, color: COLORS.gray[400], marginTop: 2 }}>완성된 이름 대신, 이런 기운을 담아 직접 지어보세요.</Text>
                                    </View>
                                )}

                                {reading?.timing && (
                                    <View style={{ gap: 4 }}>
                                        <Text style={[styles.h3, { color: text }]}>만남에 좋은 시기</Text>
                                        <Text style={{ fontSize: 14, color: isDarkMode ? COLORS.gray[200] : COLORS.gray[700], lineHeight: 21 }}>{reading.timing}</Text>
                                    </View>
                                )}

                                {!reading && <Text style={{ fontSize: 14, color: sub }}>사주는 계산됐는데 풀이를 받지 못했어요. 다시 시도해주세요.</Text>}

                                <TouchableOpacity onPress={reset} style={[styles.again, { borderColor: border }]}>
                                    <Ionicons name="refresh" size={16} color={sub} />
                                    <Text style={{ color: sub, fontWeight: "600", marginLeft: 6 }}>다시 보기</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: { maxHeight: "94%", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
    header: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
    intro: { fontSize: 13, lineHeight: 20 },
    label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
    input: { height: 48, paddingHorizontal: 14, borderWidth: 1, borderRadius: 14, fontSize: 15 },
    genderBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    checkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    checkText: { fontSize: 13, fontWeight: "500", flex: 1 },
    submit: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    note: { fontSize: 11, textAlign: "center" },
    pillar: { width: "100%", alignItems: "center", paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
    summary: { fontSize: 14, lineHeight: 21, padding: 12, borderRadius: 14 },
    h3: { fontSize: 14, fontWeight: "700" },
    matchCard: { borderWidth: 1, borderRadius: 14, padding: 12 },
    again: { height: 46, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
