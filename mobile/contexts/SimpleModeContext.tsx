/**
 * SimpleModeContext — 간편모드(크게 보기) 토글
 *
 * 웹 src/contexts/AuthContext.tsx 의 isSimpleMode/toggleSimpleMode 매칭.
 * AsyncStorage 에 사용자 선택 저장 → 재부팅 후에도 유지.
 *
 * 적용 패턴:
 *   const { isSimpleMode } = useSimpleMode();
 *   <Text style={{ fontSize: isSimpleMode ? 18 : 14 }}>...</Text>
 *
 * 시작은 AppDrawer + AI펫톡 메시지 + 홈 헤더부터. 점진 확대.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SimpleModeContextValue {
    isSimpleMode: boolean;
    toggleSimpleMode: () => void;
    setSimpleMode: (v: boolean) => void;
    /** 현재 모드에 맞는 폰트 배율 (1.0 또는 1.25). 폰트 크기 곱하면 됨. */
    fontScale: number;
}

const SimpleModeContext = createContext<SimpleModeContextValue | null>(null);
const STORAGE_KEY = "memento-simple-mode";

export function SimpleModeProvider({ children }: { children: React.ReactNode }) {
    const [isSimpleMode, setIsSimpleModeState] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((v) => {
            if (v === "true") setIsSimpleModeState(true);
        });
    }, []);

    function setSimpleMode(v: boolean) {
        setIsSimpleModeState(v);
        AsyncStorage.setItem(STORAGE_KEY, v ? "true" : "false").catch(() => {});
    }

    function toggleSimpleMode() {
        setSimpleMode(!isSimpleMode);
    }

    return (
        <SimpleModeContext.Provider value={{
            isSimpleMode,
            toggleSimpleMode,
            setSimpleMode,
            fontScale: isSimpleMode ? 1.25 : 1,
        }}>
            {children}
        </SimpleModeContext.Provider>
    );
}

export function useSimpleMode() {
    const ctx = useContext(SimpleModeContext);
    if (!ctx) {
        // Provider 미적용 화면(예: 인증 콜백)에서도 안전하게 디폴트
        return { isSimpleMode: false, toggleSimpleMode: () => {}, setSimpleMode: () => {}, fontScale: 1 };
    }
    return ctx;
}
