"use client";

/**
 * 서비스 워커 자동 업데이트 + 즉시 활성화
 *
 * 문제: 기본 SW 업데이트 주기가 24시간이라, PWA standalone 모드에서
 * 사용자가 새 SW를 못 받고 옛날 캐시된 페이지를 계속 봄.
 *
 * 해결:
 * 1) 페이지 로드 직후 + 5분마다 reg.update() 호출 (서버에서 새 SW 즉시 가져옴)
 * 2) 새 SW 발견 시 SKIP_WAITING 메시지 → 옛날 SW 강제 종료 후 새 SW 활성화
 * 3) controllerchange 이벤트 → 페이지 자동 새로고침 (사용자 액션 0)
 *
 * 결과: PWA를 다음에 한 번 열기만 하면 자동으로 최신 페이지 받아옴.
 */

import { useEffect } from "react";

export default function ServiceWorkerUpdater() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        let refreshing = false;
        const onControllerChange = () => {
            if (refreshing) return;
            refreshing = true;
            // 새 SW가 활성화되면 페이지 새로고침 — 새 HTML(translate=no 메타 등) 받아옴
            window.location.reload();
        };
        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

        let intervalId: ReturnType<typeof setInterval> | null = null;

        navigator.serviceWorker.register("/sw.js").then((reg) => {
            // 1) 즉시 update 체크
            reg.update().catch(() => {});

            // 2) 새 SW가 waiting 상태면 즉시 활성화
            if (reg.waiting) {
                reg.waiting.postMessage({ type: "SKIP_WAITING" });
            }

            // 3) updatefound: 새 SW가 install 끝나면 SKIP_WAITING 보내서 활성화
            reg.addEventListener("updatefound", () => {
                const newWorker = reg.installing;
                if (!newWorker) return;
                newWorker.addEventListener("statechange", () => {
                    if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                        newWorker.postMessage({ type: "SKIP_WAITING" });
                    }
                });
            });

            // 4) 5분마다 update 체크 (PWA 장기 사용 시 새 코드 누락 방지)
            intervalId = setInterval(() => {
                reg.update().catch(() => {});
            }, 5 * 60 * 1000);
        }).catch(() => {});

        return () => {
            navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
            if (intervalId) clearInterval(intervalId);
        };
    }, []);

    return null;
}
