/**
 * 네트워크 상태 감지 훅
 * navigator.onLine + online/offline 이벤트로 실시간 감지
 * Supabase auto-refresh 제어와 오프라인 배너 표시에 사용
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const [wasOffline, setWasOffline] = useState(false);

    const handleOnline = useCallback(() => {
        setIsOnline(true);
        setWasOffline(true);

        // 온라인 복귀 시 Supabase 자동 갱신 재시작
        const supabase = getSupabaseClient();
        supabase.auth.startAutoRefresh();

        // 3초 후 복귀 배너 숨기기
        setTimeout(() => setWasOffline(false), 3000);
    }, []);

    const handleOffline = useCallback(() => {
        setIsOnline(false);

        // 오프라인 시 Supabase 자동 갱신 중단 (불필요한 네트워크 요청 방지)
        const supabase = getSupabaseClient();
        supabase.auth.stopAutoRefresh();
    }, []);

    useEffect(() => {
        // 초기값 설정
        setIsOnline(navigator.onLine);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [handleOnline, handleOffline]);

    return { isOnline, wasOffline };
}
