/**
 * MemorialAmbientStars — 추모 모드 AI 펫톡 배경 별 파티클
 *
 * 웹 DomeGallery (3D 사진 갤러리)는 모바일에서 비활성. 대신 잔잔하게
 * 떠오르는 별 파티클로 추모 분위기를 강조.
 *
 *  - 12개 별이 천천히 위로 부드럽게 흘러감 + 페이드
 *  - 추모 모드에서만 마운트
 *  - react-native Animated API (Reanimated 의존성 X)
 */

import { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_W } = Dimensions.get("window");

interface StarSpec {
    id: number;
    x: number;
    delay: number;
    duration: number;
    size: number;
    opacity: number;
    color: string;
}

function buildStars(): StarSpec[] {
    const colors = ["#FCD34D", "#FBBF24", "#FDE68A", "#F59E0B"];
    return Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * (SCREEN_W - 32),
        delay: Math.random() * 4000,
        duration: 6000 + Math.random() * 4000,
        size: 8 + Math.random() * 8,
        opacity: 0.45 + Math.random() * 0.4,
        color: colors[i % colors.length],
    }));
}

interface Props {
    /** 추모 헤더 영역 높이 (별이 떠오르는 박스 크기) */
    height?: number;
}

export default function MemorialAmbientStars({ height = 80 }: Props) {
    const stars = useMemo(() => buildStars(), []);

    return (
        <View
            pointerEvents="none"
            style={[styles.root, { height }]}
        >
            {stars.map((star) => (
                <FloatingStar key={star.id} star={star} stageHeight={height} />
            ))}
        </View>
    );
}

function FloatingStar({ star, stageHeight }: { star: StarSpec; stageHeight: number }) {
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
        top: 0, left: 0, right: 0,
        overflow: "hidden",
    },
    star: { position: "absolute", top: 0 },
});
