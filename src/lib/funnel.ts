/**
 * funnel.ts — 게스트 가입 전환 퍼널 측정 (랜딩→스크롤→CTA→가입 drop-off)
 *
 * visit_logs(event 컬럼)에 단계 이벤트를 기록한다. 비콘(VisitBeacon)·AuthContext에서 공용 호출.
 * - 개인정보: 서버는 IP 미저장. 식별자는 무작위 visitor_id뿐 (VisitBeacon과 동일 규칙).
 *   분석 동의 시 localStorage 영속 id, 미동의 시 sessionStorage 세션 한정 id.
 * - 각 단계는 브라우저 세션당 1회만 기록(중복 방지) → 단계별 고유 방문자 = drop-off.
 */

import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";

export type FunnelEvent = "landing" | "scroll" | "cta" | "signup";

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

/**
 * 세션 일관 visitor_id 반환 (없으면 생성).
 * 동의 시 localStorage 영속, 미동의 시 sessionStorage 세션 한정.
 * OAuth 리다이렉트 후에도 같은 탭/세션이면 동일 id 유지 → 퍼널 단계가 한 방문자로 연결됨.
 */
export function getOrCreateVisitorId(): string {
    try {
        if (analyticsConsented()) {
            const id = localStorage.getItem("visitor-id") || genId();
            localStorage.setItem("visitor-id", id);
            return id;
        }
        const sid = sessionStorage.getItem("visitor-id-session") || genId();
        sessionStorage.setItem("visitor-id-session", sid);
        return sid;
    } catch {
        return genId();
    }
}

/**
 * 퍼널 단계 1회 기록. 같은 세션에서 같은 event는 중복 전송하지 않는다.
 * 분석 실패는 사용자 경험에 영향 없음(fail-silent).
 */
export function trackFunnel(event: FunnelEvent): void {
    if (typeof window === "undefined") return;
    try {
        const flagKey = `funnel-${event}`;
        if (sessionStorage.getItem(flagKey) === "1") return;
        sessionStorage.setItem(flagKey, "1");

        const visitorId = getOrCreateVisitorId();
        authFetch(API.VISIT, {
            method: "POST",
            body: JSON.stringify({ visitorId, path: window.location.pathname, event }),
        }).catch(() => {});
    } catch {
        // noop
    }
}
