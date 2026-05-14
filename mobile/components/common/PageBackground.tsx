/**
 * PageBackground — 모든 탭/라우트 공통 페이지 배경 그라데이션
 *
 * 웹 src/components/common/Layout.tsx 423-424 1:1 매칭:
 * - 일상 라이트: from-memento-50 via-memento-75 to-white/80 (따뜻한 크림)
 * - 추모 라이트: from-memorial-50/80 via-orange-50/30 to-memento-75
 * - 다크 (모드 무관): gray-900/800/900
 *
 * SafeAreaView 안에 첫 번째 자식으로 깔고, 헤더/스크롤은 형제로 둠.
 * absoluteFill로 깔리고 pointerEvents="none" 라 터치 안 막음.
 *
 * 사용:
 *   <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: ... }}>
 *     <AppHeader ... />
 *     <View style={{ flex: 1 }}>
 *       <PageBackground />
 *       <ScrollView ...>...</ScrollView>
 *     </View>
 *   </SafeAreaView>
 */

import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useDarkMode } from "@/contexts/ThemeContext";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";

export default function PageBackground() {
    const { isDarkMode } = useDarkMode();
    const { isMemorialMode } = usePet();

    const colors: [string, string, string] = isDarkMode
        ? [COLORS.gray[900], COLORS.gray[800], COLORS.gray[900]]
        : isMemorialMode
            ? ["rgba(255,251,235,0.8)", "rgba(255,247,237,0.3)", COLORS.memento[75]]
            : [COLORS.memento[50], COLORS.memento[75], "rgba(255,255,255,0.8)"];

    return (
        <LinearGradient
            colors={colors}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
        />
    );
}

/** SafeAreaView backgroundColor에 사용할 라이트/다크/추모 분기 색 */
export function usePageBgColor(): string {
    const { isDarkMode } = useDarkMode();
    const { isMemorialMode } = usePet();
    if (isDarkMode) return COLORS.gray[950];
    if (isMemorialMode) return "rgba(255,251,235,0.8)";
    return COLORS.memento[50];
}
