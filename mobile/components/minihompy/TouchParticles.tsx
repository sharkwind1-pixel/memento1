/**
 * TouchParticles — 미니홈피 스테이지 터치 시 잠깐 떠올랐다 사라지는 파티클
 *
 * 부모가 `key={particleKey}`로 강제 remount해서 매 터치마다 새 애니메이션이 시작됨.
 * variant:
 *  - "star": 별 4~6개가 위로 흩어짐 (인사 단계)
 *  - "heart": 핑크 하트가 좌우로 살짝 (장난 단계)
 *  - "rest": 잔잔한 점 3개 (피곤 단계)
 *
 * react-native-reanimated 4.x 기준. 단순 withTiming 조합.
 */

import { useEffect, useMemo } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface Props {
    /** 외부 변경 시 재실행 트리거 */
    triggerKey: number;
    variant: "star" | "heart" | "rest";
    /** 스테이지 너비 (대략 SCREEN_WIDTH - 32) */
    stageWidth: number;
    /** 스테이지 높이 */
    stageHeight: number;
}

interface Particle {
    id: number;
    startX: number;
    endX: number;
    delay: number;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
    size: number;
}

function buildParticles(variant: Props["variant"], stageWidth: number): Particle[] {
    const cx = stageWidth / 2;
    if (variant === "star") {
        return [0, 1, 2, 3, 4].map((i) => ({
            id: i,
            startX: cx - 30,
            endX: cx - 60 + Math.random() * 120,
            delay: i * 80,
            icon: "star" as const,
            color: i % 2 === 0 ? "#FBBF24" : "#FCD34D",
            size: 16 + Math.random() * 6,
        }));
    }
    if (variant === "heart") {
        return [0, 1, 2].map((i) => ({
            id: i,
            startX: cx - 20 + i * 20 - 20,
            endX: cx - 30 + i * 30 - 30,
            delay: i * 100,
            icon: "heart" as const,
            color: "#F472B6",
            size: 18,
        }));
    }
    // rest
    return [0, 1, 2].map((i) => ({
        id: i,
        startX: cx - 15 + i * 15 - 15,
        endX: cx - 15 + i * 15 - 15,
        delay: i * 200,
        icon: "ellipse" as const,
        color: "#94A3B8",
        size: 6,
    }));
}

export default function TouchParticles({ triggerKey, variant, stageWidth, stageHeight }: Props) {
    const particles = useMemo(() => buildParticles(variant, stageWidth), [variant, stageWidth, triggerKey]);

    return (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
            {particles.map((p) => (
                <Particle key={p.id} {...p} stageHeight={stageHeight} />
            ))}
        </View>
    );
}

function Particle({ startX, endX, delay, icon, color, size, stageHeight }: Particle & { stageHeight: number }) {
    const opacity = useSharedValue(0);
    const ty = useSharedValue(0);
    const tx = useSharedValue(0);

    useEffect(() => {
        // 시작: 가운데서 fade-in, 위로 30%만큼 부유
        opacity.value = 0;
        ty.value = 0;
        tx.value = 0;

        opacity.value = withDelay(delay, withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }));
        opacity.value = withDelay(delay + 800, withTiming(0, { duration: 600, easing: Easing.in(Easing.quad) }));
        ty.value = withDelay(delay, withTiming(-stageHeight * 0.35, { duration: 1400, easing: Easing.out(Easing.cubic) }));
        tx.value = withDelay(delay, withTiming(endX - startX, { duration: 1400, easing: Easing.out(Easing.cubic) }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: ty.value }, { translateX: tx.value }],
    }));

    // 시작 위치는 stage 하단 중앙쯤 (60% 위치)
    return (
        <Animated.View
            style={[
                {
                    position: "absolute",
                    left: startX,
                    top: stageHeight * 0.55,
                },
                style,
            ]}
        >
            <Ionicons name={icon} size={size} color={color} />
        </Animated.View>
    );
}

// Pressable 미사용이지만 Reanimated 경고 방지를 위해 명시적으로 export 안 함
void Pressable;
