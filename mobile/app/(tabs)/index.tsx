/**
 * 홈 탭 — 웹 src/components/pages/HomePage.tsx 기반 모바일 재현
 *
 * 섹션 순서:
 * 1. AnnouncementBanner (전체 공지 최대 3개)
 * 2. HeroSection (그라데이션 + 일러스트 + CTA)
 * 3. PetSwitcher (펫 전환 가로 스크롤)
 * 4. QuestCard (온보딩 미션 진행)
 * 5. PetCardSection (선택 펫 카드 또는 빈 상태)
 * 6. CommunityPreview (인기 게시글)
 * 7. ShowcaseSection (자랑 게시글 자동 캐러셀)
 * 8. QuizSection (자가진단 2x2)
 * 9. MagazinePreview (매거진 미리보기)
 * 10. MemorialSection (추모 펫 카드 + 별 파티클)
 *
 * 스토리 기능은 의도적으로 비활성. 추후 부활 시 components/home/Story* 복원.
 */

import { useState, useCallback, useEffect } from "react";
import { ScrollView, RefreshControl, View, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PageBackground, { usePageBgColor } from "@/components/common/PageBackground";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { useSimpleMode } from "@/contexts/SimpleModeContext";
import { COLORS } from "@/lib/theme";
import AppDrawer from "@/components/common/AppDrawer";
import HeroSection from "@/components/home/HeroSection";
import CommunityPreview from "@/components/home/CommunityPreview";
import NeighborNewsSection from "@/components/home/NeighborNewsSection";
import MagazinePreview from "@/components/home/MagazinePreview";
import AnnouncementBanner from "@/components/home/AnnouncementBanner";
import QuestCard from "@/components/home/QuestCard";
import QuizSection from "@/components/home/QuizSection";
import ShowcaseSection from "@/components/home/ShowcaseSection";
import MemorialSection from "@/components/home/MemorialSection";
import SimpleHomeLauncher from "@/components/home/SimpleHomeLauncher";
import AppHeader from "@/components/common/AppHeader";
import PetSwitcher from "@/components/common/PetSwitcher";
import OnboardingModal, {
    hasCompletedOnboardingAsync, checkOnboardingFromDB, type UserType,
} from "@/components/onboarding/OnboardingModal";

export default function HomeScreen() {
    const router = useRouter();
    const { session, user } = useAuth();
    const { isMemorialMode, refreshPets } = usePet();
    const { isDarkMode } = useDarkMode();
    const { isSimpleMode } = useSimpleMode();
    const [refreshing, setRefreshing] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [onboardingOpen, setOnboardingOpen] = useState(false);

    // 신규 로그인 첫 진입 시 온보딩 노출 (LocalStorage + DB 동기화)
    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            const localDone = await hasCompletedOnboardingAsync();
            if (cancelled) return;
            if (localDone) return;
            const dbDone = await checkOnboardingFromDB(user.id);
            if (cancelled) return;
            if (!dbDone) {
                // 자연스러운 진입 (1.5초 지연 후 노출)
                setTimeout(() => {
                    if (!cancelled) setOnboardingOpen(true);
                }, 1500);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.id]);

    function handleOnboardingComplete(userType: UserType) {
        // 유형별 후속 액션:
        //  planning → 입양 정보 화면으로 안내
        //  current → 반려동물 등록 권유
        //  memorial → 추모 펫 등록 권유
        if (userType === "planning") {
            Alert.alert("환영합니다", "입양 정보를 먼저 둘러볼까요?", [
                { text: "다음에", style: "cancel" },
                { text: "입양 정보 보기", onPress: () => router.push("/adoption" as never) },
            ]);
        } else if (userType === "current") {
            Alert.alert("환영합니다", "지금 함께하는 아이를 등록해볼까요?", [
                { text: "나중에", style: "cancel" },
                { text: "등록하기", onPress: () => router.push("/pet/new" as never) },
            ]);
        } else if (userType === "memorial") {
            Alert.alert("환영합니다", "소중한 추억을 함께 간직해요. 아이를 등록할 수 있어요.", [
                { text: "나중에", style: "cancel" },
                { text: "등록하기", onPress: () => router.push("/pet/new" as never) },
            ]);
        }
    }

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refreshPets();
        } finally {
            setRefreshing(false);
        }
    }, [refreshPets]);

    // 페이지 배경 (웹 Layout.tsx 423-424 매칭) — PageBackground 컴포넌트 사용
    const safeAreaBg = usePageBgColor();

    // 간편모드: 웹 SimpleHomeLauncher와 동일하게 큰 카드 그리드 런처로 완전 교체
    if (isSimpleMode) {
        return (
            <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: safeAreaBg }]}>
                <AppHeader onOpenDrawer={() => setDrawerOpen(true)} />
                <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
                <SimpleHomeLauncher />
                <OnboardingModal
                    visible={onboardingOpen}
                    onClose={() => setOnboardingOpen(false)}
                    onComplete={handleOnboardingComplete}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: safeAreaBg }]}>
            <AppHeader onOpenDrawer={() => setDrawerOpen(true)} />
            <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
            <View style={{ flex: 1 }}>
                <PageBackground />
                <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500]}
                    />
                }
            >
                <AnnouncementBanner />
                <HeroSection session={session} isMemorialMode={isMemorialMode} />
                <PetSwitcher
                    accentColor={isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500]}
                    onAddPet={() => router.push("/pet/new")}
                />
                <QuestCard />
                <NeighborNewsSection session={session} isMemorialMode={isMemorialMode} />
                <CommunityPreview session={session} isMemorialMode={isMemorialMode} />
                <ShowcaseSection />
                <QuizSection />
                <MagazinePreview session={session} isMemorialMode={isMemorialMode} />
                <MemorialSection />
                <View style={styles.bottomSpace} />
            </ScrollView>
            </View>

            <OnboardingModal
                visible={onboardingOpen}
                onClose={() => setOnboardingOpen(false)}
                onComplete={handleOnboardingComplete}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 0 },
    bottomSpace: { height: 24 },
});
