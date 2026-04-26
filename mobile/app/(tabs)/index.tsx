/**
 * 홈 탭 — 웹 src/components/pages/HomePage.tsx 기반 모바일 재현
 *
 * 섹션 순서:
 * 1. HeroSection (그라데이션 + 일러스트 + CTA)
 * 2. PetCardSection (선택 펫 카드 또는 빈 상태)
 * 3. CommunityPreview (인기 게시글)
 * 4. MagazinePreview (매거진 미리보기)
 */

import { useState, useCallback } from "react";
import { ScrollView, RefreshControl, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";
import HeroSection from "@/components/home/HeroSection";
import PetCardSection from "@/components/home/PetCardSection";
import CommunityPreview from "@/components/home/CommunityPreview";
import MagazinePreview from "@/components/home/MagazinePreview";

export default function HomeScreen() {
    const { session } = useAuth();
    const { selectedPet, isMemorialMode, refreshPets } = usePet();
    const [refreshing, setRefreshing] = useState(false);

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
                <HeroSection session={session} isMemorialMode={isMemorialMode} />
                <PetCardSection pet={selectedPet} isMemorialMode={isMemorialMode} />
                <CommunityPreview session={session} isMemorialMode={isMemorialMode} />
                <MagazinePreview session={session} isMemorialMode={isMemorialMode} />
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
