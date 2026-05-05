/**
 * 프로필 / 설정 화면 (모달)
 */

import { useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, Switch,
    Image, Alert, ActivityIndicator, Linking, StyleSheet, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";
import AppHeader from "@/components/common/AppHeader";
import ProfileEditModal from "@/components/profile/ProfileEditModal";
import { getLevelIcon, getPointLevel, type PetIconType } from "@/lib/levels";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
    const router = useRouter();
    const { user, session, profile, isPremium, points, isAdminUser, signOut, refreshProfile } = useAuth();
    const { pets, selectedPet, isMemorialMode } = usePet();
    const { isDarkMode, toggleTheme } = useDarkMode();
    const [signingOut, setSigningOut] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [betaCode, setBetaCode] = useState("");
    const [betaSubmitting, setBetaSubmitting] = useState(false);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const nickname = profile?.nickname
        ?? (user?.user_metadata?.nickname as string | undefined)
        ?? user?.email?.split("@")[0]
        ?? "사용자";
    const email = user?.email ?? "";

    // 포인트 + 펫 타입 기반 레벨 아이콘 (AppHeader와 동일 패턴)
    const firstPet = selectedPet ?? pets?.[0];
    const petType: PetIconType = firstPet?.type === "고양이" ? "cat"
        : firstPet?.type === "강아지" ? "dog"
        : firstPet?.type ? "other"
        : "dog";
    const levelIcon = getLevelIcon(points ?? 0, petType, isAdminUser);
    const currentLevel = getPointLevel(points ?? 0);

    async function handleRedeemBeta() {
        const code = betaCode.trim().toUpperCase();
        if (!code) {
            Alert.alert("코드 입력", "베타 코드를 입력해주세요.");
            return;
        }
        setBetaSubmitting(true);
        try {
            const { data, error } = await supabase.rpc("redeem_beta_code", { _code: code });
            if (error) {
                Alert.alert("코드 사용 실패", error.message ?? "잠시 후 다시 시도해주세요.");
                return;
            }
            // RPC는 throw 대신 { success, error } 반환
            const result = (data as {
                success: boolean;
                error?: string;
                points_added?: number;
                discount_until?: string;
                discount_percent?: number;
            } | null) ?? null;

            if (!result || result.success === false) {
                Alert.alert("코드 사용 실패", result?.error ?? "유효하지 않은 코드입니다.");
                return;
            }

            const pts = result.points_added ?? 3000;
            const until = result.discount_until
                ? new Date(result.discount_until).toLocaleDateString("ko-KR")
                : "3개월간";
            const percent = result.discount_percent ?? 50;
            setBetaCode("");
            await refreshProfile?.();
            Alert.alert(
                "베타 코드 사용 완료",
                `${pts.toLocaleString()}P 지급\n구독 ${until}까지 ${percent}% 할인 적용`,
            );
        } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "잠시 후 다시 시도해주세요.");
        } finally {
            setBetaSubmitting(false);
        }
    }

    async function handleSignOut() {
        Alert.alert("로그아웃", "정말 로그아웃하시겠어요?", [
            { text: "취소", style: "cancel" },
            {
                text: "로그아웃",
                style: "destructive",
                onPress: async () => {
                    setSigningOut(true);
                    await signOut();
                    router.replace("/(auth)/login");
                },
            },
        ]);
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            <AppHeader showBack title="프로필" hideActions />
            <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
                onPress={() => setEditOpen(true)}
                activeOpacity={0.85}
                style={[styles.headerCard, { backgroundColor: isDarkMode ? COLORS.gray[900] : COLORS.white }]}
            >
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: currentLevel.color + "20" }]}>
                    <Image source={levelIcon} style={styles.levelIconImg} resizeMode="contain" />
                </View>
                <View style={styles.nicknameRow}>
                    <Text style={{ fontSize: 18, fontWeight: "bold", color: isDarkMode ? COLORS.white : COLORS.gray[900] }}>
                        {nickname}
                    </Text>
                    <Ionicons name="pencil" size={13} color={COLORS.gray[400]} />
                </View>
                <Text style={{ fontSize: 14, color: COLORS.gray[400], marginTop: 2 }}>{email}</Text>

                <View style={styles.badgeRow}>
                    {isPremium ? (
                        <View style={[styles.premiumBadge, { backgroundColor: COLORS.memento[500] }]}>
                            <Ionicons name="star" size={12} color="#fff" />
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>프리미엄</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={() => router.push("/subscription")}
                            style={styles.upgradeBadge}
                        >
                            <Ionicons name="arrow-up-circle-outline" size={12} color={accentColor} />
                            <Text style={{ fontSize: 12, fontWeight: "500", color: accentColor }}>업그레이드</Text>
                        </TouchableOpacity>
                    )}
                    <View style={styles.pointBadge}>
                        <Ionicons name="star" size={12} color={COLORS.memorial[500]} />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: COLORS.gray[700] }}>
                            {(points ?? 0).toLocaleString()}P
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            <SectionCard title="내 반려동물" isMemorialMode={isMemorialMode}>
                {pets.map((pet) => (
                    <SettingsRow
                        key={pet.id}
                        icon={
                            <View style={styles.petIconWrap}>
                                {pet.profileImage ? (
                                    <Image source={{ uri: pet.profileImage }} style={{ width: 32, height: 32 }} />
                                ) : (
                                    <Text style={{ fontSize: 16 }}>{pet.type === "강아지" ? "🐶" : "🐱"}</Text>
                                )}
                            </View>
                        }
                        label={pet.name}
                        sublabel={`${pet.breed || pet.type} · ${pet.gender}`}
                        onPress={() => router.push(`/pet/${pet.id}` as never)}
                        isMemorialMode={isMemorialMode}
                    />
                ))}
                <SettingsRow
                    icon={<Ionicons name="add-circle-outline" size={22} color={accentColor} />}
                    label="반려동물 추가"
                    onPress={() => router.push("/pet/new")}
                    isMemorialMode={isMemorialMode}
                    labelColor={accentColor}
                />
            </SectionCard>

            <SectionCard title="계정" isMemorialMode={isMemorialMode}>
                <SettingsRow
                    icon={<Ionicons name="card-outline" size={22} color={COLORS.gray[500]} />}
                    label="구독 관리"
                    sublabel={isPremium ? "프리미엄 이용 중" : "무료 플랜"}
                    onPress={() => router.push("/subscription")}
                    isMemorialMode={isMemorialMode}
                />
                <SettingsRow
                    icon={<Ionicons name="notifications-outline" size={22} color={COLORS.gray[500]} />}
                    label="알림"
                    onPress={() => router.push("/notifications")}
                    isMemorialMode={isMemorialMode}
                />
                <SettingsRow
                    icon={<Ionicons name="settings-outline" size={22} color={COLORS.gray[500]} />}
                    label="알림/차단/위치 설정"
                    sublabel="알림 토글, 차단 해제, 위치 동의"
                    onPress={() => router.push("/settings")}
                    isMemorialMode={isMemorialMode}
                />
            </SectionCard>

            <SectionCard title="베타 테스터" isMemorialMode={isMemorialMode}>
                {profile?.isBetaTester ? (
                    <View style={styles.betaActiveBox}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Ionicons name="ribbon" size={18} color={COLORS.memento[500]} />
                            <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.memento[700] }}>
                                베타 테스터 활성화됨
                            </Text>
                        </View>
                        {profile.betaDiscountUntil && (
                            <Text style={{ fontSize: 12, color: COLORS.gray[500], marginTop: 6 }}>
                                {new Date(profile.betaDiscountUntil).toLocaleDateString("ko-KR")}까지 구독 50% 할인
                            </Text>
                        )}
                    </View>
                ) : (
                    <View style={styles.betaInputBox}>
                        <Text style={{ fontSize: 12, color: COLORS.gray[500], marginBottom: 8 }}>
                            베타 코드를 입력하면 3,000P + 3개월 구독 50% 할인을 받을 수 있어요
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            <TextInput
                                value={betaCode}
                                onChangeText={(t) => setBetaCode(t.toUpperCase())}
                                placeholder="BETA-XXXXXX"
                                placeholderTextColor={COLORS.gray[400]}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                style={[
                                    styles.betaInput,
                                    {
                                        backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[50],
                                        color: isDarkMode ? COLORS.white : COLORS.gray[900],
                                    },
                                ]}
                            />
                            <TouchableOpacity
                                onPress={handleRedeemBeta}
                                disabled={betaSubmitting}
                                style={[styles.betaBtn, { backgroundColor: accentColor, opacity: betaSubmitting ? 0.5 : 1 }]}
                            >
                                {betaSubmitting ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>적용</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </SectionCard>

            <SectionCard title="화면" isMemorialMode={isMemorialMode}>
                <View style={[
                    styles.settingsRow,
                    { borderBottomColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[50], borderBottomWidth: 0 },
                ]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <Ionicons name={isDarkMode ? "moon" : "sunny"} size={22} color={COLORS.gray[500]} />
                        <View>
                            <Text style={{ fontSize: 14, color: isDarkMode ? COLORS.gray[50] : COLORS.gray[900] }}>
                                다크 모드
                            </Text>
                            <Text style={{ fontSize: 12, color: COLORS.gray[400], marginTop: 2 }}>
                                {isDarkMode ? "어두운 테마 사용 중" : "밝은 테마 사용 중"}
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={isDarkMode}
                        onValueChange={toggleTheme}
                        trackColor={{ false: COLORS.gray[300], true: accentColor }}
                        thumbColor="#fff"
                    />
                </View>
            </SectionCard>

            <SectionCard title="앱 정보" isMemorialMode={isMemorialMode}>
                <SettingsRow
                    icon={<Ionicons name="document-text-outline" size={22} color={COLORS.gray[500]} />}
                    label="이용약관"
                    onPress={() => Linking.openURL("https://mementoani.com/terms")}
                    isMemorialMode={isMemorialMode}
                />
                <SettingsRow
                    icon={<Ionicons name="shield-outline" size={22} color={COLORS.gray[500]} />}
                    label="개인정보처리방침"
                    onPress={() => Linking.openURL("https://mementoani.com/privacy")}
                    isMemorialMode={isMemorialMode}
                />
                <SettingsRow
                    icon={<Ionicons name="help-circle-outline" size={22} color={COLORS.gray[500]} />}
                    label="고객 문의"
                    onPress={() => Linking.openURL("https://mementoani.com/support")}
                    isMemorialMode={isMemorialMode}
                />
                <View style={styles.versionRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <Ionicons name="information-circle-outline" size={22} color={COLORS.gray[500]} />
                        <Text style={{ fontSize: 14, color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700] }}>버전</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: COLORS.gray[400] }}>1.0.0</Text>
                </View>
            </SectionCard>

            <View style={{ marginHorizontal: 16, marginBottom: 12, gap: 10 }}>
                <TouchableOpacity
                    onPress={handleSignOut}
                    disabled={signingOut || deleting}
                    style={[
                        styles.signoutBtn,
                        { backgroundColor: isDarkMode ? "#1F0000" : COLORS.red[50] },
                    ]}
                >
                    {signingOut ? (
                        <ActivityIndicator color={COLORS.red[500]} />
                    ) : (
                        <Text style={{ color: COLORS.red[500], fontWeight: "600", fontSize: 14 }}>로그아웃</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* 계정 삭제 (위험 액션, 따로 분리) */}
            <View style={{ marginHorizontal: 16, marginBottom: 32 }}>
                <TouchableOpacity
                    onPress={handleDeleteAccount}
                    disabled={deleting || signingOut}
                    activeOpacity={0.7}
                    style={styles.deleteAccountBtn}
                >
                    {deleting ? (
                        <ActivityIndicator size="small" color={COLORS.gray[400]} />
                    ) : (
                        <Text style={{ color: COLORS.gray[400], fontSize: 12 }}>계정 삭제</Text>
                    )}
                </TouchableOpacity>
            </View>
            </ScrollView>

            {user && (
                <ProfileEditModal
                    visible={editOpen}
                    onClose={() => setEditOpen(false)}
                    userId={user.id}
                    initialNickname={profile?.nickname ?? ""}
                    initialAvatar={profile?.avatar ?? null}
                    accentColor={accentColor}
                    onSaved={() => { refreshProfile().catch(() => {}); }}
                />
            )}
        </SafeAreaView>
    );

    function handleDeleteAccount() {
        if (!session) return;
        Alert.alert(
            "계정 삭제",
            "정말 계정을 삭제할까요? 모든 펫 / 사진 / 게시글 / 대화 기록이 함께 삭제되고 복구할 수 없어요.",
            [
                { text: "취소", style: "cancel" },
                {
                    text: "계정 삭제",
                    style: "destructive",
                    onPress: () => {
                        Alert.alert(
                            "다시 한번 확인",
                            "삭제 후에는 30일간 같은 이메일/소셜계정으로 재가입할 수 없어요. 계속할까요?",
                            [
                                { text: "취소", style: "cancel" },
                                {
                                    text: "삭제 진행",
                                    style: "destructive",
                                    onPress: async () => {
                                        setDeleting(true);
                                        try {
                                            const res = await fetch(`${API_BASE_URL}/api/auth/delete-account`, {
                                                method: "POST",
                                                headers: { Authorization: `Bearer ${session.access_token}` },
                                            });
                                            if (!res.ok) {
                                                let msg = `HTTP ${res.status}`;
                                                try {
                                                    const err = await res.json();
                                                    msg = err.error || msg;
                                                } catch {}
                                                Alert.alert("삭제 실패", msg);
                                                return;
                                            }
                                            await signOut();
                                            router.replace("/(auth)/login");
                                        } catch (e) {
                                            Alert.alert("오류", e instanceof Error ? e.message : "");
                                        } finally {
                                            setDeleting(false);
                                        }
                                    },
                                },
                            ],
                        );
                    },
                },
            ],
        );
    }
}

function SectionCard({ title, children, isMemorialMode }: {
    title: string;
    children: React.ReactNode;
    isMemorialMode: boolean;
}) {
    const { isDarkMode } = useDarkMode();
    return (
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
            <Text style={{
                fontSize: 12,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
                paddingHorizontal: 4,
                color: isMemorialMode ? COLORS.gray[500] : COLORS.gray[400],
            }}>
                {title}
            </Text>
            <View style={[
                styles.sectionCardInner,
                { backgroundColor: isDarkMode ? COLORS.gray[900] : COLORS.white },
            ]}>
                {children}
            </View>
        </View>
    );
}

function SettingsRow({ icon, label, sublabel, onPress, isMemorialMode, labelColor }: {
    icon: React.ReactNode;
    label: string;
    sublabel?: string;
    onPress: () => void;
    isMemorialMode: boolean;
    labelColor?: string;
}) {
    const { isDarkMode } = useDarkMode();
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[
                styles.settingsRow,
                { borderBottomColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[50] },
            ]}
        >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                {icon}
                <View>
                    <Text style={{
                        fontSize: 14,
                        color: labelColor ?? (isDarkMode ? COLORS.gray[50] : COLORS.gray[900]),
                    }}>
                        {label}
                    </Text>
                    {sublabel && (
                        <Text style={{ fontSize: 12, color: COLORS.gray[400], marginTop: 2 }}>{sublabel}</Text>
                    )}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    headerCard: {
        alignItems: "center",
        paddingTop: 32,
        paddingBottom: 24,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 24,
    },
    avatar: { width: 80, height: 80, borderRadius: 40 },
    avatarFallback: { alignItems: "center", justifyContent: "center" },
    levelIconImg: { width: 56, height: 56 },
    nicknameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
    badgeRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    premiumBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 9999,
    },
    upgradeBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: COLORS.memento[300],
    },
    pointBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 9999,
        backgroundColor: COLORS.gray[100],
    },
    sectionCardInner: { borderRadius: 16, overflow: "hidden" },
    settingsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    petIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: COLORS.gray[100],
        alignItems: "center",
        justifyContent: "center",
    },
    versionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    signoutBtn: {
        width: "100%",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.red[200],
    },
    betaActiveBox: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    betaInputBox: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    betaInput: {
        flex: 1,
        height: 40,
        borderRadius: 12,
        paddingHorizontal: 12,
        fontSize: 14,
        fontFamily: "monospace",
    },
    betaBtn: {
        height: 40,
        paddingHorizontal: 18,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    deleteAccountBtn: {
        alignSelf: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
});
