/**
 * 오프라인 감지 배너
 * 인터넷 연결이 끊기면 상단에 배너 표시, 복귀 시 자동 사라짐
 */

"use client";

import { WifiOff, Wifi } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineBanner() {
    const { isOnline, wasOffline } = useOnlineStatus();

    // 오프라인 배너
    if (!isOnline) {
        return (
            <div className="fixed top-0 left-0 right-0 z-[10000] bg-red-600 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
                <WifiOff className="w-4 h-4 flex-shrink-0" />
                <span>인터넷 연결이 끊겼습니다</span>
            </div>
        );
    }

    // 온라인 복귀 배너 (3초간 표시)
    if (wasOffline) {
        return (
            <div className="fixed top-0 left-0 right-0 z-[10000] bg-green-600 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
                <Wifi className="w-4 h-4 flex-shrink-0" />
                <span>인터넷에 다시 연결되었습니다</span>
            </div>
        );
    }

    return null;
}
