/**
 * PetSwitcher — 펫 카드 가로 스크롤 전환기
 *
 * 웹 src/components/features/record/PetCardGrid.tsx 모바일 매칭.
 * - 펫 1마리면 숨김
 * - 2마리 이상 가로 스크롤 칩 (프로필 사진 + 이름)
 * - 선택된 펫은 accent ring + 살짝 확대
 * - 끝에 "+" 버튼으로 새 펫 등록 진입
 */

import { ScrollView, View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";

interface Props {
    accentColor: string;
    onAddPet: () => void;
    /** 펫 1마리만 있어도 보여줄지 (기본 false: 1마리면 숨김) */
    alwaysVisible?: boolean;
}

export default function PetSwitcher({ accentColor, onAddPet, alwaysVisible = false }: Props) {
    const { pets, selectedPet, selectPet } = usePet();
    const { isDarkMode } = useDarkMode();
    const addRingBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[50];
    const addRingBorder = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[600];
    const placeholderBg = isDarkMode ? COLORS.gray[800] : COLORS.memento[100];

    if (!alwaysVisible && pets.length < 2) return null;
    if (pets.length === 0) return null;

    function handleSelect(petId: string) {
        if (petId === selectedPet?.id) return;
        Haptics.selectionAsync().catch(() => {});
        selectPet(petId);
    }

    return (
        <View style={styles.wrap}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {pets.map((pet) => {
                    const isActive = pet.id === selectedPet?.id;
                    const isMemorial = pet.status === "memorial";
                    const ringColor = isActive
                        ? (isMemorial ? COLORS.memorial[500] : accentColor)
                        : "transparent";
                    return (
                        <TouchableOpacity
                            key={pet.id}
                            onPress={() => handleSelect(pet.id)}
                            activeOpacity={0.85}
                            style={styles.itemTouch}
                        >
                            <View style={[
                                styles.avatarRing,
                                { borderColor: ringColor },
                                isActive && { transform: [{ scale: 1.04 }] },
                            ]}>
                                {pet.profileImage ? (
                                    <Image source={{ uri: pet.profileImage }} style={styles.avatar} />
                                ) : (
                                    <View style={[styles.avatarPlaceholder, { backgroundColor: placeholderBg }]}>
                                        <Ionicons name="paw" size={20} color={COLORS.memento[500]} />
                                    </View>
                                )}
                                {isMemorial && (
                                    <View style={styles.memorialBadge}>
                                        <Ionicons name="star" size={9} color="#fff" />
                                    </View>
                                )}
                            </View>
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.label,
                                    { color: labelColor },
                                    isActive && { color: ringColor, fontWeight: "700" },
                                ]}
                            >
                                {pet.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
                <TouchableOpacity onPress={onAddPet} activeOpacity={0.85} style={styles.itemTouch}>
                    <View style={[
                        styles.avatarRing,
                        styles.addRing,
                        { backgroundColor: addRingBg, borderColor: addRingBorder },
                    ]}>
                        <Ionicons name="add" size={22} color={isDarkMode ? COLORS.gray[400] : COLORS.gray[500]} />
                    </View>
                    <Text style={[styles.label, { color: labelColor }]}>추가</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        paddingVertical: 6,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    itemTouch: {
        alignItems: "center",
        width: 60,
    },
    avatarRing: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2.5,
        padding: 2,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: "100%",
        height: "100%",
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    addRing: {
        borderStyle: "dashed",
    },
    memorialBadge: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: COLORS.memorial[500],
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: "#fff",
    },
    label: {
        marginTop: 4,
        fontSize: 11,
        textAlign: "center",
        maxWidth: 60,
    },
});
