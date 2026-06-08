/**
 * VisitBeacon — 방문 비콘 (게스트 포함, 전역)
 *
 * 루트 레이아웃에 1회 마운트되어 모든 라우트(/, /magazine/[id], /pricing 등) 진입을 집계.
 * 브라우저 세션당 1회 /api/visit 호출 → 관리자 대시보드의 "방문자(게스트 포함)" 통계.
 *
 * 개인정보:
 *  - 서버는 IP를 저장하지 않음(익명). 식별자는 무작위 visitor_id뿐.
 *  - 쿠키 동의에서 분석(analytics)을 끈 사용자는 "영속 식별자"를 만들지 않고
 *    세션 한정(sessionStorage) 익명 id로만 집계 → 세션 종료 시 사라짐(교차 세션 추적 X).
 *    동의한 사용자만 localStorage 영속 visitor_id로 고유 방문자 집계.
 */

"use client";

import { useEffect } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { safeGetItem } from "@/lib/safe-storage";

function genId(): string {
    try {
        if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    } catch { /* noop */ }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function analyticsConsented(): boolean {
    try {
        const raw = safeGetItem("memento-cookie-consent");
        if (!raw) return false;
        return JSON.parse(raw)?.analytics === true;
    } catch {
        return false;
    }
}

export default function VisitBeacon() {
    useEffect(() => {
        // 세션/동의 상태가 안정화된 뒤 1회 (로그인 토큰도 이때쯤 준비됨 → 회원/게스트 분류 정확도↑)
        const timer = setTimeout(() => {
            try {
                if (sessionStorage.getItem("visit-pinged") === "1") return;

                let visitorId: string;
                if (analyticsConsented()) {
                    // 영속 고유 방문자 (분석 동의 시에만)
                    visitorId = localStorage.getItem("visitor-id") || genId();
                    localStorage.setItem("visitor-id", visitorId);
                } else {
                    // 미동의: 세션 한정 익명 id (교차 세션 추적 없음). 방문 수는 집계됨.
                    visitorId = sessionStorage.getItem("visitor-id-session") || genId();
                    sessionStorage.setItem("visitor-id-session", visitorId);
                }

                sessionStorage.setItem("visit-pinged", "1");
                authFetch(API.VISIT, {
                    method: "POST",
                    body: JSON.stringify({ visitorId, path: window.location.pathname }),
                }).catch(() => {});
            } catch {
                // 분석 실패는 사용자 경험에 영향 없음
            }
        }, 1200);
        return () => clearTimeout(timer);
    }, []);

    return null;
}
