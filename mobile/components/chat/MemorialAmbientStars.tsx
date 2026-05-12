/**
 * MemorialAmbientStars — 추모 모드 AI 펫톡 배경 별 효과
 *
 * 웹 src/components/pages/AIChatPage.tsx 230-263 매칭:
 *  - 정적 펄스 별 12개 (animate-pulse, opacity 0.3↔0.7 반복)
 *  - 떠오르는 별 10개 (memorial-star CSS, 아래→위 슬로우 라이즈)
 *
 * 사용 모드:
 *  - `<MemorialAmbientStars />` → fullscreen absolute fill (chat 영역 backdrop)
 *  - `<MemorialAmbientStars height={64} />` → 명시 높이 (헤더 등 좁은 영역)
 *
 * Animated API 사용 (Reanimated 의존성 X) — Expo Go 호환.
 */

import { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const STAR_COLORS = ["#FCD34D", "#FBBF24", "#FDE68A", "#F59E0B"];

interface FloatStarSpec {
    id: number;
    x: number;
    delay: number;
    duration: number;
    size: number;
    opacity: number;
    color: string;
}

interface StaticStarSpec {
    id: number;
    x: number;        // absolute X
    y: number;        // absolute Y
    delay: number;
    duration: number; // pulse 한 cycle
    size: number;
    color: string;
}

function buildFloatStars(): FloatStarSpec[] {
    return Array.from({ length: 10 }, (_, i) => ({
        id: i,
        x: Math.random() * (SCREEN_W - 32),
        delay: Math.random() * 4000,
        duration: 8000 + Math.random() * 6000,
        size: 8 + Math.random() * 8,
        opacity: 0.45 + Math.random() * 0.4,
        color: STAR_COLORS[i % STAR_COLORS.length],
    }));
}

function buildStaticStars(areaHeight: number): StaticStarSpec[] {
    // 웹 패턴 매칭: left ${10 + (i*7)%80}% / top ${5 + (i*13)%70}% (등간격에 가까움)
    return Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: (SCREEN_W * (10 + ((i * 7) % 80))) / 100,
        y: (areaHeight * (5 + ((i * 13) % 70))) / 100,
        delay: i * 300, // 0~3.3초 stagger
        duration: 2000 + (i % 3) * 700, // 2~3.4초 cycle
        size: 10,
        color: STAR_COLORS[i % STAR_COLORS.length],
    }));
}

interface Props {
    /** 명시적 높이. 미지정 시 fullscreen (absolute fill) */
    height?: number;
}

export default function MemorialAmbientStars({ height }: Props) {
    const fullscreen = height === undefined;
    const effectiveHeight = fullscreen ? SCREEN_H : height;

    const floatStars = useMemo(() => buildFloatStars(), []);
    const staticStars = useMemo(() => buildStaticStars(effectiveHeight), [effectiveHeight]);

    const rootStyle = fullscreen
        ? [styles.root, StyleSheet.absoluteFill]
        : [styles.root, { height: effectiveHeight }];

    return (
        <View pointerEvents="none" style={rootStyle}>
            {staticStars.map((star) => (
                <PulsingStar key={`p-${star.id}`} star={star} />
            ))}
            {floatStars.map((star) => (
                <FloatingStar key={`f-${star.id}`} star={star} stageHeight={effectiveHeight} />
            ))}
        </View>
    );
}

function PulsingStar({ star }: { star: StaticStarSpec }) {
    const opacity = useRef(new Animated.Value(0.25)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.65,
                    duration: star.duration / 2,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.25,
                    duration: star.duration / 2,
                    useNativeDriver: true,
                }),
            ]),
        );
        const timer = setTimeout(() => loop.start(), star.delay);
        return () => {
            clearTimeout(timer);
            loop.stop();
        };
    }, [opacity, star.delay, star.duration]);

    return (
        <Animated.View style={[styles.star, { left: star.x, top: star.y, opacity }]}>
            <Ionicons name="star" size={star.size} color={star.color} />
        </Animated.View>
    );
}

function FloatingStar({ star, stageHeight }: { star: FloatStarSpec; stageHeight: number }) {
    const translateY = useRef(new Animated.Value(stageHeight)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loopRise = () =>
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(opacity, {
                        toValue: star.opacity,
                        duration: star.duration * 0.3,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: star.duration * 0.7,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.timing(translateY, {
                    toValue: -16,
                    duration: star.duration,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]);

        let mounted = true;

        function loopOnce() {
            translateY.setValue(stageHeight);
            opacity.setValue(0);
            const anim = loopRise();
            anim.start(({ finished }) => {
                if (finished && mounted) {
                    setTimeout(loopOnce, Math.random() * 1500);
                }
            });
        }

        const timer = setTimeout(loopOnce, star.delay);
        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, [star, stageHeight, opacity, translateY]);

    return (
        <Animated.View
            style={[
                styles.star,
                {
                    left: star.x,
                    transform: [{ translateY }],
                    opacity,
                },
            ]}
        >
            <Ionicons name="star" size={star.size} color={star.color} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    root: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        overflow: "hidden",
    },
    star: { position: "absolute", top: 0 },
});
