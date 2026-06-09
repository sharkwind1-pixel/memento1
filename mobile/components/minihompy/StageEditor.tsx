/**
 * StageEditor — 펫홈 스테이지 자유 배치 편집기
 *
 * 웹 src/components/features/minihompy/MinihompyStage.tsx + MinimiPlacementPicker 이식.
 * - 편집 모드: 보유 꼬미를 stage 위에 PanResponder로 드래그
 * - x/y는 5~95% 범위로 clamp (서버 검증식과 동일)
 * - "+" 버튼: 보유 인벤토리에서 꼬미 추가 (Alert 액션 시트)
 * - 길게 누르면 삭제 옵션
 * - 저장 → PUT /api/minihompy/settings/placed-minimi
 *
 * gesture-handler/reanimated 대신 RN PanResponder 사용 (의존성 단순, 더 안정).
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    View, Text, Image, ImageBackground, TouchableOpacity,
    PanResponder, StyleSheet, Alert, ActivityIndicator,
    LayoutChangeEvent, Modal, FlatList, Animated, Easing,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/lib/theme";
import { useDarkMode } from "@/contexts/ThemeContext";
import { findMinimi, findMinimiOrFallback, findBackgroundOrDefault } from "@/data/minihompyData";
import { findFurnitureOrFallback } from "@/data/furnitureCatalog";
import { putPlacedMinimi } from "@/lib/minihompy-api";
import { pickReaction, type MinimiAction } from "@/data/minimiReactions";
import type { PlacedMinimi, BackgroundTheme, UserMinimiRow } from "@/types";

// 웹 baseSize 매칭: 모바일 40px (compact 32px). 64는 너무 컸음.
const MINIMI_SIZE = 40;
// 편집 모드 hit area 확장 (작은 꼬미 손가락으로 잡기 쉽게)
const HIT_PADDING = 20;
// 배치 제한 없음 (보유한 만큼 자유 배치)

interface Props {
    stageHeight: number;
    background: BackgroundTheme;
    placedMinimi: PlacedMinimi[];
    ownedSlugs: string[];          // 보유한 꼬미 slug 목록
    ownedFurniture?: string[];     // 보유한 가구 slug 목록 (중복 포함)
    inventory: UserMinimiRow[];    // 보유 row (slug 매핑용 — 사용처 미사용이지만 인터페이스 호환)
    accessToken: string;
    accentColor: string;
    /** 비편집 모드에서 꼬미 터치 시 메시지/액션 모드 (daily/memorial) */
    isMemorialMode?: boolean;
    onChanged: (next: PlacedMinimi[]) => void;
    /** 편집 모드 진입/종료 시 부모에 알림 → 부모 ScrollView scroll 잠금 */
    onEditingChange?: (editing: boolean) => void;
    /** 비편집 모드에서 꼬미 터치 시 부모에 알림 → 부모가 추가 효과(파티클 등) 발사 */
    onTouch?: () => void;
}

function clampPosition(x: number, y: number) {
    return {
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(10, Math.min(85, y)),
    };
}

export default function StageEditor({
    stageHeight, background, placedMinimi, ownedSlugs, ownedFurniture = [], accessToken, accentColor,
    isMemorialMode = false, onChanged, onEditingChange, onTouch,
}: Props) {
    const [editMode, setEditMode] = useState(false);
    const [working, setWorking] = useState<PlacedMinimi[]>(placedMinimi);
    const [stageWidth, setStageWidth] = useState(0);
    const [saving, setSaving] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    // 터치 이펙트 (비편집 모드, 웹 MinihompyStage 패턴)
    const [touchEffect, setTouchEffect] = useState<{ index: number; message: string; action: MinimiAction; key: number } | null>(null);
    const consecutiveRef = useRef<{ index: number; count: number; lastAt: number }>({ index: -1, count: 0, lastAt: 0 });
    const touchKeyRef = useRef(0);
    const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
        };
    }, []);

    const handleMinimiTouch = useCallback((idx: number, slug: string) => {
        if (editMode) return;

        if (touchTimerRef.current) clearTimeout(touchTimerRef.current);

        // 부모에 알림 (파티클 등 추가 효과 트리거)
        onTouch?.();

        // 연속 터치 카운트 (같은 꼬미 + 2.5초 이내)
        const now = Date.now();
        const prev = consecutiveRef.current;
        const isSameAndRecent = prev.index === idx && now - prev.lastAt < 2500;
        const nextCount = isSameAndRecent ? prev.count + 1 : 1;
        consecutiveRef.current = { index: idx, count: nextCount, lastAt: now };

        const reaction = pickReaction(slug, isMemorialMode ? "memorial" : "daily", nextCount);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

        touchKeyRef.current += 1;
        setTouchEffect({ index: idx, message: reaction.message, action: reaction.action, key: touchKeyRef.current });

        // 1.8초 후 이펙트 제거
        touchTimerRef.current = setTimeout(() => setTouchEffect(null), 1800);
    }, [editMode, isMemorialMode, onTouch]);

    useEffect(() => {
        if (!editMode) setWorking(placedMinimi);
    }, [placedMinimi, editMode]);

    // 편집 모드 변경 시 부모 ScrollView 잠금/해제 통지
    useEffect(() => {
        onEditingChange?.(editMode);
    }, [editMode, onEditingChange]);

    function onLayout(e: LayoutChangeEvent) {
        setStageWidth(e.nativeEvent.layout.width);
    }

    const startEdit = useCallback(() => {
        setWorking(placedMinimi);
        setEditMode(true);
    }, [placedMinimi]);

    const cancelEdit = useCallback(() => {
        setWorking(placedMinimi);
        setEditMode(false);
    }, [placedMinimi]);

    async function saveEdit() {
        if (saving) return;
        setSaving(true);
        try {
            await putPlacedMinimi(accessToken, working);
            onChanged(working);
            setEditMode(false);
        } catch (e) {
            Alert.alert("저장 실패", e instanceof Error ? e.message : "");
        } finally {
            setSaving(false);
        }
    }

    function addMinimi() {
        if (ownedSlugs.length === 0 && ownedFurniture.length === 0) {
            Alert.alert(
                "보유 아이템 없음",
                "먼저 꼬미 상점이나 가구 상점에서 아이템을 구매해주세요.",
            );
            return;
        }
        // 보관함(인벤토리 그리드) 모달 오픈 — 사용자가 시각적으로 선택
        setPickerOpen(true);
    }

    function pickFromInventory(slug: string, type: "minimi" | "furniture" = "minimi") {
        const newItem: PlacedMinimi = {
            slug,
            x: 50,
            y: 50,
            zIndex: working.length,
            ...(type === "furniture" ? { type: "furniture" as const } : {}),
        };
        setWorking((prev) => [...prev, newItem]);
        setPickerOpen(false);
    }

    function removeMinimi(index: number) {
        const it = working[index];
        const itemName = it?.type === "furniture"
            ? findFurnitureOrFallback(it.slug).name
            : (findMinimi(it?.slug)?.name ?? "꼬미");
        Alert.alert(
            "삭제",
            `${itemName}을(를) 스테이지에서 제거할까요?`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "제거",
                    style: "destructive",
                    onPress: () => setWorking((prev) => prev.filter((_, i) => i !== index)),
                },
            ],
        );
    }

    // 드래그 중 (clamp 안 함 — stage 밖으로도 끌 수 있음, 웹 패턴 동일)
    function updatePositionLive(index: number, x: number, y: number) {
        setWorking((prev) => prev.map((p, i) => i === index ? { ...p, x, y } : p));
    }

    // 드래그 끝 (clamp 적용)
    function updatePositionEnd(index: number, x: number, y: number) {
        setWorking((prev) => prev.map((p, i) => i === index ? { ...p, ...clampPosition(x, y) } : p));
    }

    const stageContent = (
        <>
            {/* 꼬미들 */}
            {(editMode ? working : placedMinimi).map((p, idx) => (
                <DraggableMinimi
                    key={`${p.slug}-${idx}`}
                    placed={p}
                    index={idx}
                    editMode={editMode}
                    stageWidth={stageWidth}
                    stageHeight={stageHeight}
                    onMove={updatePositionLive}
                    onMoveEnd={updatePositionEnd}
                    onLongPress={() => editMode && removeMinimi(idx)}
                    onTap={() => handleMinimiTouch(idx, p.slug)}
                    touchAction={touchEffect?.index === idx ? touchEffect.action : null}
                    touchMessage={touchEffect?.index === idx ? touchEffect.message : null}
                    triggerKey={touchEffect?.index === idx ? touchEffect.key : 0}
                />
            ))}

            {/* 빈 stage 안내 */}
            {!editMode && placedMinimi.length === 0 && (
                <View style={styles.emptyHint}>
                    <Text style={styles.emptyHintText}>편집 버튼을 눌러 꼬미를 배치해보세요</Text>
                </View>
            )}

            {/* 편집 모드 안내 */}
            {editMode && (
                <View style={styles.editHint}>
                    <Text style={styles.editHintText}>탭&드래그로 이동 · 길게 누르면 제거</Text>
                </View>
            )}
        </>
    );

    return (
        <View>
            <View
                onLayout={onLayout}
                style={[styles.stageContainer, { height: stageHeight }]}
            >
                {background.imageUrl ? (
                    <ImageBackground
                        source={{ uri: background.imageUrl }}
                        style={[styles.stage, { height: stageHeight }]}
                        imageStyle={{ borderRadius: 24 }}
                        resizeMode="cover"
                    >
                        {stageContent}
                    </ImageBackground>
                ) : (
                    <View style={[styles.stage, { height: stageHeight, backgroundColor: background.cssBackground }]}>
                        {stageContent}
                    </View>
                )}
            </View>

            {/* 편집 컨트롤 */}
            <View style={styles.controlRow}>
                {editMode ? (
                    <>
                        <TouchableOpacity onPress={cancelEdit} disabled={saving} style={[styles.btn, styles.btnSecondary]}>
                            <Ionicons name="close" size={16} color={COLORS.gray[700]} />
                            <Text style={styles.btnSecondaryText}>취소</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={addMinimi}
                            disabled={saving}
                            style={[styles.btn, { backgroundColor: COLORS.gray[100] }]}
                        >
                            <Ionicons name="add" size={16} color={accentColor} />
                            <Text style={[styles.btnSecondaryText, { color: accentColor }]}>
                                추가 ({working.length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={saveEdit}
                            disabled={saving}
                            style={[styles.btn, { backgroundColor: accentColor, flex: 1.5 }]}
                            activeOpacity={0.85}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                    <Text style={styles.btnPrimaryText}>저장</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity
                        onPress={startEdit}
                        style={[styles.btn, { backgroundColor: COLORS.gray[100], flex: 1 }]}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="move" size={16} color={accentColor} />
                        <Text style={[styles.btnSecondaryText, { color: accentColor }]}>
                            꼬미 자유 배치 ({placedMinimi.length})
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* 보관함 (인벤토리 그리드 — 꼬미/가구 탭) */}
            <InventoryPickerModal
                visible={pickerOpen}
                onClose={() => setPickerOpen(false)}
                ownedSlugs={ownedSlugs}
                ownedFurniture={ownedFurniture}
                placedMinimiCounts={working.filter((p) => !p.type || p.type === "minimi").reduce<Record<string, number>>((acc, p) => {
                    acc[p.slug] = (acc[p.slug] ?? 0) + 1; return acc;
                }, {})}
                placedFurnitureCounts={working.filter((p) => p.type === "furniture").reduce<Record<string, number>>((acc, p) => {
                    acc[p.slug] = (acc[p.slug] ?? 0) + 1; return acc;
                }, {})}
                onPick={pickFromInventory}
                accentColor={accentColor}
            />
        </View>
    );
}

// ============================================================================
// 보관함 (인벤토리 그리드) — 보유 꼬미를 그리드로 표시, 탭하면 stage에 추가
// ============================================================================

function InventoryPickerModal({
    visible, onClose, ownedSlugs, ownedFurniture, placedMinimiCounts, placedFurnitureCounts, onPick, accentColor,
}: {
    visible: boolean;
    onClose: () => void;
    ownedSlugs: string[];               // 꼬미 — 중복 포함 raw 목록
    ownedFurniture: string[];           // 가구 — 중복 포함 raw 목록
    placedMinimiCounts: Record<string, number>;
    placedFurnitureCounts: Record<string, number>;
    onPick: (slug: string, type: "minimi" | "furniture") => void;
    accentColor: string;
}) {
    const { isDarkMode } = useDarkMode();
    const { width: screenWidth } = useWindowDimensions();
    const cardWidth = (screenWidth - 16 * 2 - 12 * 2) / 3;
    const [tab, setTab] = useState<"minimi" | "furniture">("minimi");
    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const headerBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const headerBorder = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const titleColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const subColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const cardBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const cardNameColor = isDarkMode ? COLORS.white : COLORS.gray[800];
    const emptyTextColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[700];
    const chipBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const chipColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[600];

    // 모달 열릴 때 꼬미 탭으로 초기화
    useEffect(() => {
        if (visible) setTab("minimi");
    }, [visible]);

    // 중복 제거 + 수량 집계 (꼬미/가구 각각)
    const minimiCounts = useMemo(() => {
        const c: Record<string, number> = {};
        for (const s of ownedSlugs) c[s] = (c[s] ?? 0) + 1;
        return c;
    }, [ownedSlugs]);
    const furnitureCounts = useMemo(() => {
        const c: Record<string, number> = {};
        for (const s of ownedFurniture) c[s] = (c[s] ?? 0) + 1;
        return c;
    }, [ownedFurniture]);

    const isMin = tab === "minimi";
    const slugs = useMemo(
        () => Object.keys(isMin ? minimiCounts : furnitureCounts),
        [isMin, minimiCounts, furnitureCounts],
    );
    const ownedCountsMap = isMin ? minimiCounts : furnitureCounts;
    const placedCountsMap = isMin ? placedMinimiCounts : placedFurnitureCounts;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={[pickerStyles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <View style={[pickerStyles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={pickerStyles.headerBtn}>
                        <Ionicons name="close" size={24} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[800]} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[pickerStyles.headerTitle, { color: titleColor }]}>보관함</Text>
                        <Text style={[pickerStyles.headerSub, { color: subColor }]}>탭해서 스테이지에 배치</Text>
                    </View>
                </View>

                {/* 꼬미 / 가구 탭 */}
                <View style={[pickerStyles.tabRow, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
                    {(["minimi", "furniture"] as const).map((t) => (
                        <TouchableOpacity
                            key={t}
                            onPress={() => setTab(t)}
                            style={[
                                pickerStyles.tabChip,
                                { backgroundColor: chipBg },
                                tab === t && { backgroundColor: accentColor },
                            ]}
                        >
                            <Text style={{ fontSize: 13, fontWeight: "700", color: tab === t ? "#fff" : chipColor }}>
                                {t === "minimi" ? "꼬미" : "가구"}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <FlatList
                    data={slugs}
                    keyExtractor={(slug) => slug}
                    numColumns={3}
                    contentContainerStyle={{ padding: 16, gap: 12 }}
                    columnWrapperStyle={{ gap: 12 }}
                    ListEmptyComponent={
                        <View style={pickerStyles.empty}>
                            <Ionicons name={isMin ? "paw-outline" : "cube-outline"} size={36} color={COLORS.gray[300]} />
                            <Text style={[pickerStyles.emptyText, { color: emptyTextColor }]}>
                                {isMin ? "보유한 꼬미가 없어요" : "보유한 가구가 없어요"}
                            </Text>
                            <Text style={[pickerStyles.emptyHint, { color: subColor }]}>
                                {isMin ? "꼬미 상점에서 캐릭터를 구매해보세요" : "가구 상점에서 아이템을 구매해보세요"}
                            </Text>
                        </View>
                    }
                    renderItem={({ item: slug }) => {
                        const meta = isMin ? findMinimiOrFallback(slug) : findFurnitureOrFallback(slug);
                        const owned = ownedCountsMap[slug] ?? 0;
                        const placed = placedCountsMap[slug] ?? 0;
                        const maxedOut = placed >= owned;
                        return (
                            <TouchableOpacity
                                onPress={() => onPick(slug, tab)}
                                disabled={maxedOut}
                                style={[
                                    pickerStyles.card,
                                    { width: cardWidth, backgroundColor: cardBg },
                                    maxedOut && { opacity: 0.4 },
                                ]}
                                activeOpacity={0.85}
                            >
                                <Image source={{ uri: meta.imageUrl }} style={pickerStyles.cardImg} resizeMode="contain" />
                                <Text style={[pickerStyles.cardName, { color: cardNameColor }]} numberOfLines={1}>{meta.name}</Text>
                                {placed > 0 && (
                                    <View style={[pickerStyles.placedBadge, { backgroundColor: accentColor }]}>
                                        <Text style={pickerStyles.placedBadgeText}>
                                            {placed}/{owned}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                />
            </SafeAreaView>
        </Modal>
    );
}

const pickerStyles = StyleSheet.create({
    flex1: { flex: 1 },
    header: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 12, paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 17, fontWeight: "700" },
    headerSub: { fontSize: 11, marginTop: 2 },
    card: {
        aspectRatio: 1,
        borderRadius: 10,
        padding: 8,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        position: "relative",
    },
    cardImg: { width: 64, height: 64 },
    cardName: { fontSize: 11, fontWeight: "700" },
    placedBadge: {
        position: "absolute",
        top: 6, right: 6,
        paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: 9999,
    },
    placedBadgeText: { fontSize: 9, fontWeight: "700", color: "#fff" },
    empty: { padding: 60, alignItems: "center", gap: 8 },
    emptyText: { fontSize: 14, fontWeight: "600", marginTop: 8 },
    emptyHint: { fontSize: 12 },
    tabRow: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    tabChip: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 9999,
    },
});

// ============================================================================
// 드래그 가능한 단일 꼬미
// ============================================================================

/**
 * 웹 MinihompyStage handlePointerDown 패턴 1:1 이식:
 *  - down: dragStartRef = {origX, origY}, gesture state {dx,dy} = 0
 *  - move: dxPct = (dx/stageWidth)*100, dyPct = (dy/stageHeight)*100
 *          새 x = origX + dxPct, 새 y = origY + dyPct → 부모 state 즉시 업데이트
 *          (Animated translate 안 씀 — 매 frame setState로 직접 위치 변경)
 *  - up: clamp(5~95, 10~85) 적용 + 최종 state
 */
function DraggableMinimi({
    placed, index, editMode, stageWidth, stageHeight, onMove, onMoveEnd, onLongPress, onTap,
    touchAction, touchMessage, triggerKey,
}: {
    placed: PlacedMinimi;
    index: number;
    editMode: boolean;
    stageWidth: number;
    stageHeight: number;
    onMove: (index: number, x: number, y: number) => void;        // 드래그 중 (clamp X)
    onMoveEnd: (index: number, x: number, y: number) => void;     // 드래그 끝 (clamp O)
    onLongPress: () => void;
    onTap: () => void;
    touchAction: MinimiAction | null;
    touchMessage: string | null;
    triggerKey: number;
}) {
    const isFurniture = placed.type === "furniture";
    const furniture = isFurniture ? findFurnitureOrFallback(placed.slug) : null;
    const minimi = !isFurniture ? findMinimiOrFallback(placed.slug) : null;
    const itemW = isFurniture ? (furniture?.stageWidth ?? 60) : MINIMI_SIZE;
    const itemH = isFurniture ? (furniture?.stageHeight ?? 60) : MINIMI_SIZE;
    const itemImageUrl = isFurniture ? (furniture?.imageUrl ?? "") : (minimi?.imageUrl ?? "");
    const dragStart = useRef<{ origX: number; origY: number } | null>(null);

    // **중요**: PanResponder는 mount 시 한 번만 생성. placed.x/y가 deps에 들어가면
    // 매 move마다 부모 state 변경 → useMemo 재계산 → panResponder 새 인스턴스 →
    // 진행 중 gesture context 잃고 꼬미가 제자리로 튐 (떨림 증상의 원인).
    // 최신 값은 ref로 access.
    const placedRef = useRef(placed);
    placedRef.current = placed;
    const callbacksRef = useRef({ onMove, onMoveEnd });
    callbacksRef.current = { onMove, onMoveEnd };
    const stageDimsRef = useRef({ stageWidth, stageHeight, editMode });
    stageDimsRef.current = { stageWidth, stageHeight, editMode };

    const onTapRef = useRef(onTap);
    // 가구는 비편집 터치 반응 없음 (말풍선/애니메이션 미적용)
    onTapRef.current = isFurniture ? () => {} : onTap;
    const onLongPressRef = useRef(onLongPress);
    onLongPressRef.current = onLongPress;

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => stageDimsRef.current.editMode,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
            stageDimsRef.current.editMode && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
        onMoveShouldSetPanResponderCapture: (_, g) =>
            stageDimsRef.current.editMode && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
            dragStart.current = { origX: placedRef.current.x, origY: placedRef.current.y };
        },
        onPanResponderMove: (_, g) => {
            const { stageWidth: sw, stageHeight: sh } = stageDimsRef.current;
            if (!dragStart.current || sw === 0 || sh === 0) return;
            const dxPct = (g.dx / sw) * 100;
            const dyPct = (g.dy / sh) * 100;
            callbacksRef.current.onMove(index, dragStart.current.origX + dxPct, dragStart.current.origY + dyPct);
        },
        onPanResponderRelease: (_, g) => {
            if (!dragStart.current) {
                dragStart.current = null;
                return;
            }
            const isTap = Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5;
            if (isTap) {
                dragStart.current = null;
                if (stageDimsRef.current.editMode) {
                    onLongPressRef.current();
                } else {
                    onTapRef.current();
                }
                return;
            }
            const { stageWidth: sw, stageHeight: sh } = stageDimsRef.current;
            if (sw === 0 || sh === 0) {
                dragStart.current = null;
                return;
            }
            const dxPct = (g.dx / sw) * 100;
            const dyPct = (g.dy / sh) * 100;
            callbacksRef.current.onMoveEnd(index, dragStart.current.origX + dxPct, dragStart.current.origY + dyPct);
            dragStart.current = null;
        },
        onPanResponderTerminate: () => {
            dragStart.current = null;
        },
    }), [index]);

    // hit area: 아이템 크기 + 패딩 (작은 아이템을 손가락으로 잡기 쉽게 확장)
    const hitPad = isFurniture ? 12 : HIT_PADDING;
    const HIT_W = itemW + hitPad * 2;
    const HIT_H = itemH + hitPad * 2;
    const leftPx = (placed.x / 100) * stageWidth - HIT_W / 2;
    const topPx = (placed.y / 100) * stageHeight - HIT_H / 2;

    // z-index 레이어링: 가구는 항상 꼬미보다 뒤(배경 가까이)에 깔린다.
    //  - 가구: 0~99 밴드 (배치순)
    //  - 꼬미: 100+ 밴드 (가구를 가리지 않고 항상 위에 보임)
    //  - 터치 이펙트 중인 꼬미: 최상단(999)
    const baseZ = placed.zIndex ?? index;
    const zIdx = touchAction !== null
        ? 999
        : isFurniture
            ? Math.min(baseZ, 99)
            : 100 + baseZ;

    return (
        <View
            style={[
                styles.minimiWrap,
                { left: leftPx, top: topPx, width: HIT_W, height: HIT_H, zIndex: zIdx },
                editMode && { backgroundColor: "rgba(255,255,255,0.05)" },
            ]}
            {...panResponder.panHandlers}
        >
            {/* 말풍선 — 꼬미만 (가구는 터치 반응 없음) */}
            {!isFurniture && touchMessage && (
                <SpeechBubble key={triggerKey} message={touchMessage} />
            )}

            <TouchableOpacity
                onPress={!editMode && !isFurniture ? onTap : undefined}
                onLongPress={onLongPress}
                delayLongPress={400}
                disabled={false}
                activeOpacity={editMode ? 0.7 : 0.9}
                style={{ width: itemW, height: itemH, alignItems: "center", justifyContent: "center" }}
            >
                {isFurniture ? (
                    <Image source={{ uri: itemImageUrl }} style={{ width: itemW, height: itemH }} resizeMode="contain" />
                ) : (
                    <AnimatedMinimi imageUrl={itemImageUrl} action={touchAction} triggerKey={triggerKey} />
                )}
                {editMode && (
                    <View style={styles.removeBadge}>
                        <Ionicons name="close" size={10} color="#fff" />
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
}

// ============================================================================
// 꼬미 이미지 + 액션 애니메이션 (웹 minimiJump/Spin/Wiggle/... 매핑)
// ============================================================================

function AnimatedMinimi({ imageUrl, action, triggerKey }: { imageUrl: string; action: MinimiAction | null; triggerKey: number }) {
    const translateY = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const rotate = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        translateX.setValue(0);
        translateY.setValue(0);
        rotate.setValue(0);
        scale.setValue(1);

        if (!action) return;

        const a = (() => {
            switch (action) {
                case "jump":
                    return Animated.sequence([
                        Animated.timing(translateY, { toValue: -16, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
                        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true, easing: Easing.bounce }),
                    ]);
                case "bounce":
                    return Animated.sequence([
                        Animated.timing(scale, { toValue: 1.2, duration: 200, useNativeDriver: true }),
                        Animated.timing(scale, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.bounce }),
                    ]);
                case "wiggle":
                    return Animated.sequence([
                        Animated.timing(rotate, { toValue: -1, duration: 100, useNativeDriver: true }),
                        Animated.timing(rotate, { toValue: 1, duration: 200, useNativeDriver: true }),
                        Animated.timing(rotate, { toValue: -0.5, duration: 100, useNativeDriver: true }),
                        Animated.timing(rotate, { toValue: 0, duration: 100, useNativeDriver: true }),
                    ]);
                case "spin":
                    return Animated.timing(rotate, { toValue: 4, duration: 600, useNativeDriver: true });
                case "runLeft":
                    return Animated.sequence([
                        Animated.timing(translateX, { toValue: -30, duration: 350, useNativeDriver: true }),
                        Animated.timing(translateX, { toValue: 0, duration: 450, useNativeDriver: true }),
                    ]);
                case "runRight":
                    return Animated.sequence([
                        Animated.timing(translateX, { toValue: 30, duration: 350, useNativeDriver: true }),
                        Animated.timing(translateX, { toValue: 0, duration: 450, useNativeDriver: true }),
                    ]);
                case "dash":
                    return Animated.sequence([
                        Animated.timing(translateX, { toValue: -20, duration: 250, useNativeDriver: true }),
                        Animated.timing(translateX, { toValue: 20, duration: 250, useNativeDriver: true }),
                        Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }),
                    ]);
                case "shrink":
                    return Animated.sequence([
                        Animated.timing(scale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
                        Animated.timing(scale, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.bounce }),
                    ]);
                case "flip":
                    return Animated.sequence([
                        Animated.timing(rotate, { toValue: 2, duration: 300, useNativeDriver: true }),
                        Animated.timing(rotate, { toValue: 0, duration: 300, useNativeDriver: true }),
                    ]);
                case "nod":
                    return Animated.sequence([
                        Animated.timing(rotate, { toValue: 0.5, duration: 150, useNativeDriver: true }),
                        Animated.timing(rotate, { toValue: -0.5, duration: 200, useNativeDriver: true }),
                        Animated.timing(rotate, { toValue: 0, duration: 150, useNativeDriver: true }),
                    ]);
                case "heart":
                    return Animated.sequence([
                        Animated.timing(translateY, { toValue: -10, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
                        Animated.timing(scale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
                        Animated.parallel([
                            Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true, easing: Easing.bounce }),
                            Animated.timing(scale, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.bounce }),
                        ]),
                    ]);
                case "star":
                    return Animated.sequence([
                        Animated.timing(scale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
                        Animated.timing(scale, { toValue: 0.85, duration: 100, useNativeDriver: true }),
                        Animated.timing(scale, { toValue: 1.2, duration: 120, useNativeDriver: true }),
                        Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true, easing: Easing.bounce }),
                    ]);
                case "sparkle":
                    return Animated.sequence([
                        Animated.parallel([
                            Animated.timing(rotate, { toValue: 0.3, duration: 150, useNativeDriver: true }),
                            Animated.timing(scale, { toValue: 1.15, duration: 150, useNativeDriver: true }),
                        ]),
                        Animated.parallel([
                            Animated.timing(rotate, { toValue: -0.3, duration: 200, useNativeDriver: true }),
                            Animated.timing(scale, { toValue: 1.05, duration: 200, useNativeDriver: true }),
                        ]),
                        Animated.parallel([
                            Animated.timing(rotate, { toValue: 0, duration: 150, useNativeDriver: true }),
                            Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
                        ]),
                    ]);
                default:
                    return Animated.sequence([
                        Animated.timing(scale, { toValue: 1.15, duration: 150, useNativeDriver: true }),
                        Animated.timing(scale, { toValue: 1, duration: 250, useNativeDriver: true, easing: Easing.bounce }),
                    ]);
            }
        })();

        a.start();
    // triggerKey changes on every touch — guarantees replay even for same action type
    }, [triggerKey, action, translateX, translateY, rotate, scale]);

    const rotateInterp = rotate.interpolate({
        inputRange: [-1, 0, 1, 4],
        outputRange: ["-15deg", "0deg", "15deg", "1440deg"],
    });

    return (
        <Animated.Image
            source={{ uri: imageUrl }}
            style={[
                styles.minimiImg,
                {
                    transform: [
                        { translateX },
                        { translateY },
                        { rotate: rotateInterp },
                        { scale },
                    ],
                },
            ]}
            resizeMode="contain"
        />
    );
}

function SpeechBubble({ message }: { message: string }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
        ]).start();
        // 1.4초 후 fade out
        const t = setTimeout(() => {
            Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
        }, 1400);
        return () => clearTimeout(t);
    }, [opacity, scale]);

    return (
        <Animated.View
            pointerEvents="none"
            style={[styles.bubble, { opacity, transform: [{ scale }] }]}
        >
            <Text style={styles.bubbleText}>{message}</Text>
            <View style={styles.bubbleTail} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    stageContainer: { borderRadius: 24, overflow: "hidden" },
    stage: { borderRadius: 24, overflow: "hidden", position: "relative" },
    minimiWrap: {
        position: "absolute",
        // width/height는 inline (HIT_SIZE) 로 설정
        alignItems: "center",
        justifyContent: "center",
    },
    minimiEdit: {
        // 편집 모드 시 약한 점선 효과
    },
    minimiTouch: {
        width: MINIMI_SIZE,
        height: MINIMI_SIZE,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    minimiImg: { width: MINIMI_SIZE, height: MINIMI_SIZE },
    bubble: {
        position: "absolute",
        // 꼬미 위로 완전히 띄움(웹 HeroSection/MinihompyStage의 bottom-full과 동일) —
        // 터치 확대 애니메이션 중에도 얼굴을 가리지 않도록.
        bottom: "100%",
        marginBottom: 6,
        alignSelf: "center",
        minWidth: 120,
        maxWidth: 240,
        backgroundColor: "rgba(255,255,255,0.96)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 4,
        zIndex: 60,
    },
    bubbleText: {
        fontSize: 11,
        fontWeight: "700",
        color: COLORS.gray[800],
        textAlign: "center",
        lineHeight: 16,
        flexWrap: "wrap",
    },
    bubbleTail: {
        position: "absolute",
        bottom: -4,
        alignSelf: "center",
        width: 8, height: 8,
        backgroundColor: "rgba(255,255,255,0.96)",
        transform: [{ rotate: "45deg" }],
        zIndex: -1,
    },
    removeBadge: {
        position: "absolute",
        top: -4, right: -4,
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: "#EF4444",
        alignItems: "center", justifyContent: "center",
        borderWidth: 2, borderColor: "#fff",
    },
    emptyHint: {
        position: "absolute",
        alignSelf: "center", bottom: 24,
        backgroundColor: "rgba(255,255,255,0.85)",
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999,
    },
    emptyHintText: { fontSize: 12, color: COLORS.gray[700], fontWeight: "600" },
    editHint: {
        position: "absolute",
        alignSelf: "center", top: 12,
        backgroundColor: "rgba(0,0,0,0.65)",
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9999,
    },
    editHintText: { fontSize: 11, color: "#fff", fontWeight: "600" },
    controlRow: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 20,
        marginTop: 8,
        marginBottom: 16,
    },
    btn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 9999,
    },
    btnSecondary: { backgroundColor: COLORS.gray[100] },
    btnSecondaryText: { fontSize: 12, fontWeight: "700", color: COLORS.gray[700] },
    btnPrimaryText: { fontSize: 12, fontWeight: "700", color: "#fff" },
});

// 꼬미 + stage 배경 한 번에 export
export { findMinimi, findBackgroundOrDefault };
