/**
 * StageEditor — 미니홈피 스테이지 자유 배치 편집기
 *
 * 웹 src/components/features/minihompy/MinihompyStage.tsx + MinimiPlacementPicker 이식.
 * - 편집 모드: 보유 미니미를 stage 위에 PanResponder로 드래그
 * - x/y는 5~95% 범위로 clamp (서버 검증식과 동일)
 * - "+" 버튼: 보유 인벤토리에서 미니미 추가 (Alert 액션 시트)
 * - 길게 누르면 삭제 옵션
 * - 저장 → PUT /api/minihompy/settings/placed-minimi
 *
 * gesture-handler/reanimated 대신 RN PanResponder 사용 (의존성 단순, 더 안정).
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    View, Text, Image, ImageBackground, TouchableOpacity,
    PanResponder, Animated, StyleSheet, Alert, ActivityIndicator,
    LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { findMinimi, findBackgroundOrDefault } from "@/data/minihompyData";
import { putPlacedMinimi } from "@/lib/minihompy-api";
import type { PlacedMinimi, BackgroundTheme, UserMinimiRow } from "@/types";

const MINIMI_SIZE = 64;
const MAX_PLACED = 6;

interface Props {
    stageHeight: number;
    background: BackgroundTheme;
    placedMinimi: PlacedMinimi[];
    ownedSlugs: string[];          // 보유한 미니미 slug 목록
    inventory: UserMinimiRow[];    // 보유 row (slug 매핑용 — 사용처 미사용이지만 인터페이스 호환)
    accessToken: string;
    accentColor: string;
    onChanged: (next: PlacedMinimi[]) => void;
}

function clampPosition(x: number, y: number) {
    return {
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(10, Math.min(85, y)),
    };
}

export default function StageEditor({
    stageHeight, background, placedMinimi, ownedSlugs, accessToken, accentColor, onChanged,
}: Props) {
    const [editMode, setEditMode] = useState(false);
    const [working, setWorking] = useState<PlacedMinimi[]>(placedMinimi);
    const [stageWidth, setStageWidth] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!editMode) setWorking(placedMinimi);
    }, [placedMinimi, editMode]);

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
        if (working.length >= MAX_PLACED) {
            Alert.alert("배치 한도", `최대 ${MAX_PLACED}마리까지 배치할 수 있어요.`);
            return;
        }
        const placedSlugs = new Set(working.map((p) => p.slug));
        const available = ownedSlugs.filter((s) => !placedSlugs.has(s));
        if (available.length === 0) {
            Alert.alert(
                "추가 가능한 미니미 없음",
                placedSlugs.size > 0
                    ? "보유한 모든 미니미가 이미 배치돼있어요."
                    : "먼저 미니미 상점에서 캐릭터를 구매해주세요.",
            );
            return;
        }
        // 옵션: 사용 가능 슬러그 중 첫 번째 자동 추가 (단순화).
        // 더 나은 UX: 사용자에게 선택 시트 제공 — Alert.alert로 최대 3개만 옵션으로
        const buttons = available.slice(0, 3).map((slug) => {
            const m = findMinimi(slug);
            return {
                text: m?.name ?? slug,
                onPress: () => {
                    const newItem: PlacedMinimi = {
                        slug,
                        x: 50,
                        y: 50,
                        zIndex: working.length,
                    };
                    setWorking((prev) => [...prev, newItem]);
                },
            };
        });
        Alert.alert(
            "추가할 미니미",
            available.length > 3 ? `보유 ${available.length}마리 중 3마리만 표시` : "탭해서 추가",
            [...buttons, { text: "취소", style: "cancel" as const }],
        );
    }

    function removeMinimi(index: number) {
        Alert.alert(
            "삭제",
            `${findMinimi(working[index]?.slug)?.name ?? "미니미"}를 스테이지에서 제거할까요?`,
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

    function updatePosition(index: number, x: number, y: number) {
        setWorking((prev) => prev.map((p, i) => i === index ? { ...p, ...clampPosition(x, y) } : p));
    }

    const stageContent = (
        <>
            {/* 미니미들 */}
            {(editMode ? working : placedMinimi).map((p, idx) => (
                <DraggableMinimi
                    key={`${p.slug}-${idx}`}
                    placed={p}
                    index={idx}
                    editMode={editMode}
                    stageWidth={stageWidth}
                    stageHeight={stageHeight}
                    onMove={updatePosition}
                    onLongPress={() => editMode && removeMinimi(idx)}
                />
            ))}

            {/* 빈 stage 안내 */}
            {!editMode && placedMinimi.length === 0 && (
                <View style={styles.emptyHint}>
                    <Text style={styles.emptyHintText}>편집 버튼을 눌러 미니미를 배치해보세요</Text>
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
                                추가 ({working.length}/{MAX_PLACED})
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
                            미니미 자유 배치 ({placedMinimi.length}/{MAX_PLACED})
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

// ============================================================================
// 드래그 가능한 단일 미니미
// ============================================================================

function DraggableMinimi({
    placed, index, editMode, stageWidth, stageHeight, onMove, onLongPress,
}: {
    placed: PlacedMinimi;
    index: number;
    editMode: boolean;
    stageWidth: number;
    stageHeight: number;
    onMove: (index: number, x: number, y: number) => void;
    onLongPress: () => void;
}) {
    const minimi = findMinimi(placed.slug);
    const startPos = useRef({ x: placed.x, y: placed.y });
    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    // placed가 외부에서 변경되면 startPos 갱신 (편집 모드 진입 시 등)
    useEffect(() => {
        startPos.current = { x: placed.x, y: placed.y };
        pan.setValue({ x: 0, y: 0 });
    }, [placed.x, placed.y, pan]);

    const panResponder = useMemo(() => PanResponder.create({
        // Capture를 true로 → 부모 ScrollView가 vertical scroll 가로채기 전에 미니미가 먼저 잡음
        onStartShouldSetPanResponder: () => editMode,
        onStartShouldSetPanResponderCapture: () => editMode,
        onMoveShouldSetPanResponder: () => editMode,
        onMoveShouldSetPanResponderCapture: () => editMode,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
            pan.setOffset({ x: 0, y: 0 });
            pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
            if (stageWidth === 0 || stageHeight === 0) return;
            const dxPct = (g.dx / stageWidth) * 100;
            const dyPct = (g.dy / stageHeight) * 100;
            const nextX = startPos.current.x + dxPct;
            const nextY = startPos.current.y + dyPct;
            onMove(index, nextX, nextY);
            pan.setValue({ x: 0, y: 0 });
        },
    }), [editMode, stageWidth, stageHeight, index, onMove, pan]);

    if (!minimi) return null;

    // 좌상단 기준 % → 좌상단 px 계산 후 minimi 중앙 정렬
    const leftPx = (placed.x / 100) * stageWidth - MINIMI_SIZE / 2;
    const topPx = (placed.y / 100) * stageHeight - MINIMI_SIZE / 2;

    return (
        <Animated.View
            style={[
                styles.minimiWrap,
                {
                    left: leftPx,
                    top: topPx,
                    zIndex: placed.zIndex ?? index,
                    transform: [{ translateX: pan.x }, { translateY: pan.y }],
                },
                editMode && styles.minimiEdit,
            ]}
            {...panResponder.panHandlers}
        >
            <TouchableOpacity
                onLongPress={onLongPress}
                disabled={!editMode}
                activeOpacity={editMode ? 0.7 : 1}
                style={styles.minimiTouch}
            >
                <Image source={{ uri: minimi.imageUrl }} style={styles.minimiImg} resizeMode="contain" />
                {editMode && (
                    <View style={styles.removeBadge}>
                        <Ionicons name="close" size={12} color="#fff" />
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    stageContainer: { borderRadius: 24, overflow: "hidden" },
    stage: { borderRadius: 24, overflow: "hidden", position: "relative" },
    minimiWrap: {
        position: "absolute",
        width: MINIMI_SIZE,
        height: MINIMI_SIZE,
    },
    minimiEdit: {
        // 편집 모드 시 약한 점선 효과
    },
    minimiTouch: { flex: 1, position: "relative" },
    minimiImg: { width: "100%", height: "100%" },
    removeBadge: {
        position: "absolute",
        top: 0, right: 0,
        width: 22, height: 22, borderRadius: 11,
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

// 미니미 + stage 배경 한 번에 export
export { findMinimi, findBackgroundOrDefault };
