/**
 * SimpleModeContext — 간편모드(크게 보기) 토글
 *
 * 웹 패리티 (src/contexts/AuthContext.tsx isSimpleMode/toggleSimpleMode):
 * - 웹: html.simple-mode { zoom: 1.15 (모바일) / 1.25 (데스크탑) }
 *   → CSS zoom으로 글자/버튼/카드/spacing/이미지 전체 비례 확대
 * - RN: zoom 속성 없음 → fontScale + spacingScale + iconScale + paddingScale 노출
 *   → 컴포넌트가 명시적으로 곱해서 사용
 *
 * 영속:
 * - AsyncStorage (재부팅 후에도 유지, 로그인 전에도 동작)
 * - profiles.is_simple_mode (로그인 시 DB와 동기화 — 디바이스 간 일치)
 *
 * 적용 패턴:
 *   const { isSimpleMode, fontScale, spacingScale } = useSimpleMode();
 *   <Text style={{ fontSize: 14 * fontScale }}>...</Text>
 *   <View style={{ padding: 12 * spacingScale, gap: 8 * spacingScale }}>...</View>
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

interface SimpleModeContextValue {
    isSimpleMode: boolean;
    toggleSimpleMode: () => void;
    setSimpleMode: (v: boolean) => void;
    /** 폰트 배율 (1.0 / 1.25). fontSize 곱하기. */
    fontScale: number;
    /** 여백 배율 (1.0 / 1.2). padding/margin/gap 곱하기. */
    spacingScale: number;
    /** 아이콘 배율 (1.0 / 1.2). Ionicons size 곱하기. */
    iconScale: number;
    /** 통합 배율 (1.0 / 1.2). 카드 width/height 곱하기. */
    scale: number;
}

const SimpleModeContext = createContext<SimpleModeContextValue | null>(null);
const STORAGE_KEY = "memento-simple-mode";

// 모바일은 화면이 좁으니 1.25는 약간 찌부될 수 있어 폰트만 1.25, spacing/icon은 1.2
const SIMPLE_FONT_SCALE = 1.25;
const SIMPLE_SPACING_SCALE = 1.2;
const SIMPLE_ICON_SCALE = 1.2;

export function SimpleModeProvider({ children }: { children: React.ReactNode }) {
    const [isSimpleMode, setIsSimpleModeState] = useState(false);

    // 1) AsyncStorage 우선 로드 (즉시 반영, 로그인 전에도 동작)
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((v) => {
            if (v === "true") setIsSimpleModeState(true);
            else if (v === "false") setIsSimpleModeState(false);
            // null이면 DB sync 결과를 기다림
        }).catch(() => {});
    }, []);

    // 2) 로그인 후 profiles.is_simple_mode 와 동기화 (디바이스 간 일치)
    useEffect(() => {
        let cancelled = false;
        async function syncFromProfile() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data } = await supabase
                    .from("profiles")
                    .select("is_simple_mode")
                    .eq("id", user.id)
                    .maybeSingle();
                if (cancelled) return;
                const dbValue = (data as { is_simple_mode?: boolean } | null)?.is_simple_mode;
                if (typeof dbValue === "boolean") {
                    setIsSimpleModeState(dbValue);
                    AsyncStorage.setItem(STORAGE_KEY, dbValue ? "true" : "false").catch(() => {});
                }
            } catch {
                // 인증 안 됐거나 컬럼 없으면 silent skip
            }
        }
        syncFromProfile();
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
                syncFromProfile();
            }
        });
        return () => {
            cancelled = true;
            sub.subscription.unsubscribe();
        };
    }, []);

    const setSimpleMode = useCallback((v: boolean) => {
        setIsSimpleModeState(v);
        AsyncStorage.setItem(STORAGE_KEY, v ? "true" : "false").catch(() => {});
        // DB 동기화 (백그라운드, fire-and-forget)
        (async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from("profiles").update({ is_simple_mode: v }).eq("id", user.id);
                }
            } catch {}
        })();
    }, []);

    const toggleSimpleMode = useCallback(() => {
        setSimpleMode(!isSimpleMode);
    }, [isSimpleMode, setSimpleMode]);

    const fontScale = isSimpleMode ? SIMPLE_FONT_SCALE : 1;
    const spacingScale = isSimpleMode ? SIMPLE_SPACING_SCALE : 1;
    const iconScale = isSimpleMode ? SIMPLE_ICON_SCALE : 1;
    const scale = isSimpleMode ? SIMPLE_SPACING_SCALE : 1;

    return (
        <SimpleModeContext.Provider value={{
            isSimpleMode,
            toggleSimpleMode,
            setSimpleMode,
            fontScale,
            spacingScale,
            iconScale,
            scale,
        }}>
            {children}
        </SimpleModeContext.Provider>
    );
}

export function useSimpleMode() {
    const ctx = useContext(SimpleModeContext);
    if (!ctx) {
        // Provider 미적용 화면(예: 인증 콜백)에서도 안전한 디폴트
        return {
            isSimpleMode: false,
            toggleSimpleMode: () => {},
            setSimpleMode: () => {},
            fontScale: 1,
            spacingScale: 1,
            iconScale: 1,
            scale: 1,
        };
    }
    return ctx;
}
