/**
 * TouchParticles — 미니홈피 스테이지 터치 시 잠깐 떠올랐다 사라지는 파티클
 *
 * 부모가 `key={particleKey}`로 강제 remount해서 매 터치마다 새 애니메이션이 시작됨.
 * variant:
 *  - "star": 별 4~6개가 위로 흩어짐 (인사 단계)
 *  - "heart": 핑크 하트가 좌우로 살짝 (장난 단계)
 *  - "rest": 잔잔한 점 3개 (피곤 단계)
 *
 * 빌트인 react-native Animated API 사용 — react-native-worklets 의존성 회피.
 * Reanimated 4.x를 쓰지 않아 Expo Go 부팅 안정성 확보.
 */

import { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
    /** 외부 변경 시 재실행 트리거 (key prop으로 컴포넌트 자체를 remount하는 용도) */
    triggerKey: number;
    variant: "star" | "heart" | "rest";
    /** 스테이지 너비 */
    stageWidth: number;
    /** 스테이지 높이 */
    stageHeight: number;
}

interface ParticleSpec {
    id: number;
    startX: number;
    endX: number;
    delay: number;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
    size: number;
}

const STAR_COLORS = ["#FBBF24", "#FCD34D", "#F59E0B", "#FFD700", "#FDE68A"];
const HEART_COLORS = ["#F472B6", "#FB7185", "#FDA4AF", "#F9A8D4", "#FF6B9D"];
const SPARKLE_ICONS: React.ComponentProps<typeof Ionicons>["name"][] = ["star", "heart", "sparkles"];
const PASTEL_MIX = ["#C4B5FD", "#A5B4FC", "#93C5FD", "#FBCFE8", "#FDE68A", "#BBF7D0"];

function buildParticles(variant: Props["variant"], stageWidth: number): ParticleSpec[] {
    const cx = stageWidth / 2;
    if (variant === "star") {
        return [0, 1, 2, 3, 4, 5, 6].map((i) => ({
            id: i,
            startX: cx - 40 + Math.random() * 20,
            endX: cx - 80 + Math.random() * 160,
            delay: i * 60,
            icon: i % 3 === 0 ? "sparkles" as const : "star" as const,
            color: STAR_COLORS[i % STAR_COLORS.length],
            size: 12 + Math.random() * 10,
        }));
    }
    if (variant === "heart") {
        return [0, 1, 2, 3, 4].map((i) => ({
            id: i,
            startX: cx - 30 + Math.random() * 10,
            endX: cx - 50 + Math.random() * 100,
            delay: i * 80,
            icon: i % 2 === 0 ? "heart" as const : "star" as const,
            color: HEART_COLORS[i % HEART_COLORS.length],
            size: 14 + Math.random() * 8,
        }));
    }
    // rest — 회색 점 대신 파스텔 별/하트 믹스 (잔잔하게)
    return [0, 1, 2, 3].map((i) => ({
        id: i,
        startX: cx - 25 + Math.random() * 10,
        endX: cx - 40 + Math.random() * 80,
        delay: i * 150,
        icon: SPARKLE_ICONS[i % SPARKLE_ICONS.length],
        color: PASTEL_MIX[i % PASTEL_MIX.length],
        size: 10 + Math.random() * 6,
    }));
}

export default function TouchParticles({ triggerKey, variant, stageWidth, stageHeight }: Props) {
    const particles = useMemo(
        () => buildParticles(variant, stageWidth),
        // triggerKey도 의존성에 넣어 새 좌표 생성
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [variant, stageWidth, triggerKey],
    );

    return (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
            {particles.map((p) => (
                <Particle key={p.id} spec={p} stageHeight={stageHeight} />
            ))}
        </View>
    );
}

function Particle({ spec, stageHeight }: { spec: ParticleSpec; stageHeight: number }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const ty = useRef(new Animated.Value(0)).current;
    const tx = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // delay만큼 기다린 뒤 fade-in + 위로 부유 + fade-out
        const sequence = Animated.sequence([
            Animated.delay(spec.delay),
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(ty, {
                    toValue: -stageHeight * 0.35,
                    duration: 1400,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(tx, {
                    toValue: spec.endX - spec.startX,
                    duration: 1400,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 600,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }),
        ]);
        sequence.start();
        return () => sequence.stop();
        // 마운트 시 1회만 실행 (key prop으로 새로 마운트되므로 의존성 불필요)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Animated.View
            style={[
                {
                    position: "absolute",
                    left: spec.startX,
                    top: stageHeight * 0.55,
                    opacity,
                    transform: [{ translateY: ty }, { translateX: tx }],
                },
            ]}
        >
            <Ionicons name={spec.icon} size={spec.size} color={spec.color} />
        </Animated.View>
    );
}
