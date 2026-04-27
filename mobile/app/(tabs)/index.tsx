/**
 * 홈 탭 — 웹 src/components/pages/HomePage.tsx 기반 모바일 재현
 *
 * 섹션 순서 (V3 + 신규 6섹션):
 * 1. AnnouncementBanner (전체 공지 최대 3개)
 * 2. HeroSection (그라데이션 + 일러스트 + CTA)
 * 3. StoryFeed (24h 스토리, 가로 스크롤)
 * 4. QuestCard (온보딩 미션 진행)
 * 5. PetCardSection (선택 펫 카드 또는 빈 상태)
 * 6. CommunityPreview (인기 게시글)
 * 7. ShowcaseSection (자랑 게시글 자동 캐러셀)
 * 8. QuizSection (자가진단 2x2)
 * 9. MagazinePreview (매거진 미리보기)
 * 10. MemorialSection (추모 펫 카드 + 별 파티클)
 */

import { useState, useCallback } from "react";
import { ScrollView, RefreshControl, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";
import AppDrawer from "@/components/common/AppDrawer";
import HeroSection from "@/components/home/HeroSection";
import PetCardSection from "@/components/home/PetCardSection";
import CommunityPreview from "@/components/home/CommunityPreview";
import MagazinePreview from "@/components/home/MagazinePreview";
import AnnouncementBanner from "@/components/home/AnnouncementBanner";
import StoryFeed from "@/components/home/StoryFeed";
import QuestCard from "@/components/home/QuestCard";
import QuizSection from "@/components/home/QuizSection";
import ShowcaseSection from "@/components/home/ShowcaseSection";
import MemorialSection from "@/components/home/MemorialSection";
import AppHeader from "@/components/common/AppHeader";

export default function HomeScreen() {
    const { session } = useAuth();
    const { selectedPet, isMemorialMode, refreshPets } = usePet();
    const [refreshing, setRefreshing] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refreshPets();
        } finally {
            setRefreshing(false);
        }
    }, [refreshPets]);

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.gray[50];

    return (
        <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: bgColor }]}>
            <AppHeader onOpenDrawer={() => setDrawerOpen(true)} />
            <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
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
                <StoryFeed />
                <QuestCard />
                <PetCardSection pet={selectedPet} isMemorialMode={isMemorialMode} />
                <CommunityPreview session={session} isMemorialMode={isMemorialMode} />
                <ShowcaseSection />
                <QuizSection />
                <MagazinePreview session={session} isMemorialMode={isMemorialMode} />
                <MemorialSection />
                <View style={styles.bottomSpace} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 0 },
    bottomSpace: { height: 24 },
});
