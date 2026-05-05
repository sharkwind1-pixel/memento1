/**
 * PawLoading — 발자국 3개가 좌→우로 통통 튀는 로딩 인디케이터
 * 웹 src/components/ui/PawLoading.tsx 패턴 이식.
 */

import { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";

type Size = "sm" | "md" | "lg";

interface Props {
    size?: Size;
    text?: string;
    color?: string;
}

const SIZES: Record<Size, number> = { sm: 14, md: 22, lg: 32 };
const GAPS: Record<Size, number> = { sm: 4, md: 8, lg: 12 };

export default function PawLoading({ size = "md", text, color }: Props) {
    const iconColor = color ?? COLORS.memento[500];
    const iconSize = SIZES[size];
    const gap = GAPS[size];

    const v0 = useRef(new Animated.Value(0)).current;
    const v1 = useRef(new Animated.Value(0)).current;
    const v2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const make = (val: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(val, { toValue: 1, duration: 250, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
                    Animated.timing(val, { toValue: 0, duration: 250, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
                    Animated.delay(450 - delay),
                ]),
            );
        const a0 = make(v0, 0);
        const a1 = make(v1, 150);
        const a2 = make(v2, 300);
        a0.start();
        a1.start();
        a2.start();
        return () => {
            a0.stop();
            a1.stop();
            a2.stop();
        };
    }, [v0, v1, v2]);

    function bouncedStyle(val: Animated.Value) {
        return {
            transform: [
                {
                    translateY: val.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -iconSize * 0.5],
                    }),
                },
            ],
        };
    }

    return (
        <View style={styles.wrap}>
            <View style={[styles.row, { gap, marginBottom: text ? 10 : 0 }]}>
                <Animated.View style={bouncedStyle(v0)}>
                    <Ionicons name="paw" size={iconSize} color={iconColor} />
                </Animated.View>
                <Animated.View style={bouncedStyle(v1)}>
                    <Ionicons name="paw" size={iconSize} color={iconColor} />
                </Animated.View>
                <Animated.View style={bouncedStyle(v2)}>
                    <Ionicons name="paw" size={iconSize} color={iconColor} />
                </Animated.View>
            </View>
            {text && <Text style={styles.text}>{text}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { alignItems: "center", justifyContent: "center" },
    row: { flexDirection: "row", alignItems: "flex-end" },
    text: { fontSize: 13, color: COLORS.gray[400], textAlign: "center" },
});
