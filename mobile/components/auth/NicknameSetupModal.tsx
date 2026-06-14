/**
 * NicknameSetupModal — 모바일 (웹 src/components/Auth/NicknameSetupModal.tsx 이식)
 *
 * OAuth/신규 회원가입 후 닉네임 설정. 튜토리얼/온보딩 전에 먼저 표시.
 * 닉네임 = 펫홈 주소(/u/{nickname}) → URL-안전 문자만(한글·영문·숫자·_, 2~20자).
 *
 * 완료 시 profiles.nickname + nickname_set_at(직접 확정 표시) + 동의 기록 저장.
 * nickname_set_at이 채워지면 다음 진입부터 재노출 안 함(웹과 동일 게이트).
 */

import { useState, useEffect } from "react";
import {
    Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, Pressable, Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";

// 웹 HANDLE_REGEX와 동일.
const HANDLE_REGEX = /^[가-힣a-zA-Z0-9_]{2,20}$/;
const GREEN = "#16A34A";

/**
 * 유저가 닉네임을 직접 확정했는지(nickname_set_at) DB로 확인.
 * 조회 실패 시 true 반환 → 모달을 억지로 띄우지 않음(웹 checkNewUserFlow와 동일 안전).
 */
export async function isNicknameSet(userId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("nickname_set_at")
            .eq("id", userId)
            .single();
        if (error || !data) return true;
        return !!data.nickname_set_at;
    } catch {
        return true;
    }
}

type NickStatus = "idle" | "checking" | "available" | "taken" | "invalid";

interface Props {
    visible: boolean;
    onComplete: () => void;
}

export default function NicknameSetupModal({ visible, onComplete }: Props) {
    const insets = useSafeAreaInsets();
    const { user, refreshProfile } = useAuth();
    const { isDarkMode } = useDarkMode();

    const [nickname, setNickname] = useState("");
    const [status, setStatus] = useState<NickStatus>("idle");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ageConfirmed, setAgeConfirmed] = useState(false);
    const [termsAgreed, setTermsAgreed] = useState(false);
    const [locationConsent, setLocationConsent] = useState(false);

    // 닉네임(=펫홈 주소) 검증: URL-안전 문자 + 중복(대소문자무관) 체크 (디바운스 500ms)
    useEffect(() => {
        const trimmed = nickname.trim();
        if (!trimmed || trimmed.length < 2) {
            setStatus("idle");
            return;
        }
        if (!HANDLE_REGEX.test(trimmed)) {
            setStatus("invalid");
            return;
        }
        setStatus("checking");
        let cancelled = false;
        const timer = setTimeout(async () => {
            // is_nickname_taken RPC (anon 허용, 대소문자 무관 + 본인 제외)
            const { data, error: rpcErr } = await supabase.rpc("is_nickname_taken", {
                p_nick: trimmed,
                p_exclude: user?.id ?? null,
            });
            if (cancelled) return;
            if (rpcErr) {
                setStatus("taken"); // 안전측: 확인 불가 시 진행 막음
                return;
            }
            setStatus(data === true ? "taken" : "available");
        }, 500);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [nickname, user?.id]);

    async function handleSubmit() {
        if (!ageConfirmed) {
            setError("만 14세 이상 확인이 필요합니다.");
            return;
        }
        if (!termsAgreed) {
            setError("이용약관 및 개인정보처리방침에 동의해주세요.");
            return;
        }
        const trimmed = nickname.trim();
        if (trimmed.length < 2) {
            setError("닉네임은 2자 이상이어야 합니다.");
            return;
        }
        if (status === "taken") {
            setError("이미 사용 중인 닉네임입니다.");
            return;
        }
        if (status === "invalid") {
            setError("펫홈 주소엔 한글·영문·숫자·_만 쓸 수 있어요 (공백·특수문자 불가).");
            return;
        }
        if (status === "checking") {
            setError("닉네임 확인 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // 1) auth user_metadata 갱신 (웹과 동일 — 화면마다 닉네임 일치)
            await supabase.auth.updateUser({ data: { nickname: trimmed } });

            // 2) profiles 갱신 (닉네임 + 직접 확정 표시 + 동의 기록)
            const { error: profErr } = await supabase
                .from("profiles")
                .update({
                    nickname: trimmed,
                    nickname_set_at: new Date().toISOString(), // 유저 직접 확정 → 재노출 안 함
                    terms_agreed_at: new Date().toISOString(),
                    location_consent: locationConsent,
                    location_consent_at: locationConsent ? new Date().toISOString() : null,
                })
                .eq("id", user?.id ?? "");

            if (profErr) {
                // 동시 가입 레이스로 unique(lower(nickname)) 위반 시 친절히 안내
                if ((profErr as { code?: string }).code === "23505") {
                    setStatus("taken");
                    setError("이미 사용 중인 이름이에요. 다른 이름을 골라주세요.");
                    setLoading(false);
                    return;
                }
                throw profErr;
            }

            await refreshProfile();
            onComplete();
        } catch {
            setError("닉네임 설정에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const borderColor = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];
    const subColor = COLORS.gray[500];
    const inputBg = isDarkMode ? COLORS.gray[900] : COLORS.white;

    const trimmed = nickname.trim();
    const submitDisabled =
        loading || status === "taken" || status === "invalid" || status === "checking" ||
        trimmed.length < 2 || !ageConfirmed || !termsAgreed;

    const inputBorder =
        status === "taken" ? COLORS.red[500] : status === "available" ? GREEN : borderColor;

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View style={styles.overlay}>
                <SafeAreaView edges={["top"]} style={[styles.sheet, { backgroundColor: bgColor }]}>
                    {/* 헤더 (memento 그라데이션 대용 단색) */}
                    <View style={[styles.heroHeader, { backgroundColor: COLORS.memento[500] }]}>
                        <View style={styles.heroCircle}>
                            <Ionicons name="sparkles" size={30} color="#fff" />
                        </View>
                        <Text style={styles.heroTitle}>환영합니다!</Text>
                        <Text style={styles.heroSub}>우리 아이 펫홈 주소가 될 이름을 정해주세요</Text>
                    </View>

                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* 에러 */}
                        {error && (
                            <View style={[styles.errorBox, { backgroundColor: isDarkMode ? "rgba(239,68,68,0.15)" : COLORS.red[50] }]}>
                                <Ionicons name="alert-circle" size={16} color={COLORS.red[600]} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        {/* 닉네임 입력 */}
                        <Text style={[styles.label, { color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700] }]}>
                            펫홈 주소 (닉네임) <Text style={{ color: COLORS.red[500] }}>*</Text>
                        </Text>
                        <View style={[styles.inputRow, { borderColor: inputBorder, backgroundColor: inputBg }]}>
                            <Ionicons name="person-outline" size={20} color={COLORS.gray[400]} />
                            <TextInput
                                style={[styles.input, { color: textColor }]}
                                placeholder="예: 콩이네 (한글·영문·숫자, 2~20자)"
                                placeholderTextColor={COLORS.gray[400]}
                                value={nickname}
                                onChangeText={setNickname}
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={20}
                            />
                            {status === "checking" && <ActivityIndicator size="small" color={COLORS.gray[400]} />}
                            {status === "available" && <Ionicons name="checkmark-circle" size={20} color={GREEN} />}
                            {status === "taken" && <Ionicons name="alert-circle" size={20} color={COLORS.red[500]} />}
                        </View>

                        {/* 펫홈 주소 미리보기 */}
                        {(status === "checking" || status === "available") && (
                            <Text style={[styles.preview, { color: subColor }]}>
                                내 펫홈 주소: <Text style={{ color: COLORS.memento[600], fontWeight: "600" }}>mementoani.com/u/{trimmed}</Text>
                            </Text>
                        )}
                        {status === "available" && <Text style={[styles.statusMsg, { color: GREEN }]}>사용 가능한 이름이에요</Text>}
                        {status === "taken" && <Text style={[styles.statusMsg, { color: COLORS.red[600] }]}>이미 사용 중인 이름이에요</Text>}
                        {status === "invalid" && <Text style={[styles.statusMsg, { color: COLORS.red[600] }]}>한글·영문·숫자·_만 쓸 수 있어요 (공백·특수문자 불가)</Text>}
                        {status === "idle" && nickname.length > 0 && nickname.length < 2 && (
                            <Text style={[styles.statusMsg, { color: subColor }]}>2자 이상 입력해주세요</Text>
                        )}

                        <Text style={[styles.helper, { color: subColor }]}>
                            이 이름은 공개 펫홈 주소(공유 링크)와 커뮤니티에 표시돼요.
                        </Text>

                        {/* 동의 항목 */}
                        <View style={[styles.consentBox, { borderTopColor: borderColor }]}>
                            <CheckRow
                                checked={ageConfirmed}
                                onToggle={() => setAgeConfirmed((v) => !v)}
                                textColor={subColor}
                            >
                                <Text style={{ color: COLORS.red[500], fontWeight: "600" }}>[필수] </Text>
                                만 14세 이상입니다
                            </CheckRow>

                            <CheckRow
                                checked={termsAgreed}
                                onToggle={() => setTermsAgreed((v) => !v)}
                                textColor={subColor}
                            >
                                <Text style={{ color: COLORS.red[500], fontWeight: "600" }}>[필수] </Text>
                                <Text style={styles.link} onPress={() => Linking.openURL("https://mementoani.com/terms")}>이용약관</Text>,{" "}
                                <Text style={styles.link} onPress={() => Linking.openURL("https://mementoani.com/privacy")}>개인정보처리방침</Text>,{" "}
                                <Text style={styles.link} onPress={() => Linking.openURL("https://mementoani.com/community-guidelines")}>커뮤니티 가이드라인</Text>에 동의합니다
                            </CheckRow>

                            <CheckRow
                                checked={locationConsent}
                                onToggle={() => setLocationConsent((v) => !v)}
                                textColor={subColor}
                            >
                                <Text style={{ color: COLORS.memento[500], fontWeight: "600" }}>[선택] </Text>
                                위치기반 서비스 이용에 동의합니다{" "}
                                <Text style={{ fontSize: 11, color: COLORS.gray[400] }}>(주변 동물병원·지역 정보 등 맞춤 서비스)</Text>
                            </CheckRow>
                        </View>

                        {/* 시작하기 */}
                        <TouchableOpacity
                            disabled={submitDisabled}
                            onPress={handleSubmit}
                            style={[styles.submitBtn, { backgroundColor: COLORS.memento[500], opacity: submitDisabled ? 0.5 : 1 }]}
                        >
                            {loading
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Text style={styles.submitText}>시작하기</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

function CheckRow({
    checked, onToggle, textColor, children,
}: {
    checked: boolean; onToggle: () => void; textColor: string; children: React.ReactNode;
}) {
    return (
        <TouchableOpacity style={styles.checkRow} onPress={onToggle} activeOpacity={0.7}>
            <Ionicons
                name={checked ? "checkbox" : "square-outline"}
                size={22}
                color={checked ? COLORS.memento[500] : COLORS.gray[400]}
            />
            <Text style={[styles.checkText, { color: textColor }]}>{children}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: { maxHeight: "94%", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
    heroHeader: { paddingVertical: 24, paddingHorizontal: 24, alignItems: "center" },
    heroCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 10 },
    heroTitle: { fontSize: 24, fontWeight: "800", color: "#fff" },
    heroSub: { fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 4, textAlign: "center" },
    errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, marginBottom: 14 },
    errorText: { flex: 1, fontSize: 13, color: "#DC2626" },
    label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
    inputRow: { flexDirection: "row", alignItems: "center", gap: 8, height: 50, paddingHorizontal: 14, borderWidth: 1.5, borderRadius: 14 },
    input: { flex: 1, fontSize: 15, paddingVertical: 0 },
    preview: { fontSize: 12, marginTop: 8 },
    statusMsg: { fontSize: 12, marginTop: 6 },
    helper: { fontSize: 12, textAlign: "center", marginTop: 16, lineHeight: 18 },
    consentBox: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, gap: 14 },
    checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    checkText: { flex: 1, fontSize: 13, lineHeight: 19 },
    link: { textDecorationLine: "underline", color: "#0891B2" },
    submitBtn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 22 },
    submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
