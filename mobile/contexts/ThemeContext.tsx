/**
 * ThemeContext — 라이트/다크 모드 (사용자 선택, AsyncStorage 저장)
 *
 * 추모 모드(isMemorialMode)와 완전 분리. 모든 유저는 자유롭게 라이트/다크 토글.
 * 추모 모드는 펫 컨텍스트(위로 메시지/액센트 색상)에만 사용.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
    isDarkMode: boolean;
    toggleTheme: () => void;
    setTheme: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "memento-theme-mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<ThemeMode>("light");

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((v) => {
            if (v === "dark" || v === "light") setThemeState(v);
        });
    }, []);

    function setTheme(m: ThemeMode) {
        setThemeState(m);
        AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
    }

    function toggleTheme() {
        setTheme(theme === "dark" ? "light" : "dark");
    }

    return (
        <ThemeContext.Provider value={{ isDarkMode: theme === "dark", toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useDarkMode() {
    const ctx = useContext(ThemeContext);
    if (!ctx) return { isDarkMode: false, toggleTheme: () => {}, setTheme: () => {} };
    return ctx;
}
