/**
 * PawLoading — 발자국 3개가 통통 튀는 로딩 인디케이터
 * 웹 ChatMessageList 1:1:
 *   - bounce: animationDuration 0.6s, stagger i*200ms, easing cubic-bezier 웹 animate-bounce 일치
 *   - 추모 텍스트: memorial-shimmer-text CSS → opacity pulse + amber 색상으로 근사
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
    textColor?: string;
    isMemorial?: boolean;
}

const SIZES: Record<Size, number> = { sm: 14, md: 22, lg: 32 };
const GAPS: Record<Size, number> = { sm: 4, md: 8, lg: 12 };

export default function PawLoading({ size = "md", text, color, textColor, isMemorial }: Props) {
    const iconColor = color ?? COLORS.memento[500];
    const iconSize = SIZES[size];
    const gap = GAPS[size];

    const v0 = useRef(new Animated.Value(0)).current;
    const v1 = useRef(new Animated.Value(0)).current;
    const v2 = useRef(new Animated.Value(0)).current;
    const shimmer = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // 웹 animate-bounce 1:1:
        //   duration 0.6s = up 300ms + down 300ms
        //   stagger: setTimeout으로 각 paw를 i*200ms 늦게 시작
        //   easing: 올라갈 때 cubic-bezier(0,0,0.2,1), 내려올 때 cubic-bezier(0.8,0,1,1)
        const makeAnim = (val: Animated.Value) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(val, {
                        toValue: 1, duration: 300, useNativeDriver: true,
                        easing: Easing.bezier(0, 0, 0.2, 1),
                    }),
                    Animated.timing(val, {
                        toValue: 0, duration: 300, useNativeDriver: true,
                        easing: Easing.bezier(0.8, 0, 1, 1),
                    }),
                ]),
            );

        const a0 = makeAnim(v0);
        const a1 = makeAnim(v1);
        const a2 = makeAnim(v2);
        a0.start();
        const t1 = setTimeout(() => a1.start(), 200);
        const t2 = setTimeout(() => a2.start(), 400);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            a0.stop();
            a1.stop();
            a2.stop();
        };
    }, [v0, v1, v2]);

    useEffect(() => {
        if (!isMemorial || !text) return;
        // 웹 memorial-shimmer-text → opacity 0.45↔1 pulse (3s 주기)로 근사
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 0.45, duration: 1500, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ]),
        );
        anim.start();
        return () => {
            anim.stop();
            shimmer.setValue(1);
        };
    }, [isMemorial, text, shimmer]);

    function bouncedStyle(val: Animated.Value, rotateDeg: string) {
        return {
            transform: [
                {
                    translateY: val.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -iconSize * 0.6],
                    }),
                },
                { rotate: rotateDeg },
            ],
        };
    }

    const textStyle = isMemorial
        ? [styles.text, { color: COLORS.memorial[600] }]
        : [styles.text, textColor ? { color: textColor } : null];

    return (
        <View style={styles.wrap}>
            <View style={[styles.row, { gap, marginBottom: text ? 8 : 0 }]}>
                <Animated.View style={bouncedStyle(v0, "-15deg")}>
                    <Ionicons name="paw" size={iconSize} color={iconColor} />
                </Animated.View>
                <Animated.View style={bouncedStyle(v1, "0deg")}>
                    <Ionicons name="paw" size={iconSize} color={iconColor} />
                </Animated.View>
                <Animated.View style={bouncedStyle(v2, "15deg")}>
                    <Ionicons name="paw" size={iconSize} color={iconColor} />
                </Animated.View>
            </View>
            {text && (
                <Animated.Text style={[...textStyle, isMemorial ? { opacity: shimmer } : null]}>
                    {text}
                </Animated.Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { alignItems: "center", justifyContent: "center" },
    row: { flexDirection: "row", alignItems: "flex-end" },
    text: { fontSize: 12, color: COLORS.gray[400], textAlign: "center", fontWeight: "500" },
});
