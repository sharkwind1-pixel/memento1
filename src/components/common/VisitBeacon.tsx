/**
 * VisitBeacon — 방문 비콘 + 가입 전환 퍼널 (게스트 포함, 전역)
 *
 * 루트 레이아웃에 1회 마운트되어 모든 라우트 진입을 집계 + 퍼널 단계를 기록.
 *  - landing: 진입(브라우저 세션당 1회) → 관리자 "방문자(게스트 포함)" 통계.
 *  - scroll : 일정 깊이 스크롤(engagement) 1회.
 *  - cta    : 가입 모달(openAuthModal)을 띄우는 행동 = 가입 의향 1회.
 *  - signup : 실제 로그인/가입 완료 → AuthContext에서 기록(여긴 AuthProvider 밖이라).
 *
 * 개인정보: 서버는 IP 미저장. 식별자는 무작위 visitor_id뿐. 분석 미동의 시 세션 한정 익명 id.
 * (visitor_id/동의 규칙 + 전송은 @/lib/funnel 로 단일화 — AuthContext와 공용.)
 */

"use client";

import { useEffect } from "react";
import { trackFunnel } from "@/lib/funnel";

export default function VisitBeacon() {
    useEffect(() => {
        // 진입(landing) — 세션/동의 상태가 안정화된 뒤 1회 (로그인 토큰도 이때쯤 준비 → 회원/게스트 분류 정확도↑)
        const timer = setTimeout(() => trackFunnel("landing"), 1200);

        // 스크롤(engagement) — 일정 깊이(600px) 도달 시 1회, 이후 리스너 해제
        // landing 선행 보장: scroll이 1.2초 타이머보다 먼저 와도 퍼널 단조성 유지(trackFunnel dedupe라 중복 無)
        const onScroll = () => {
            if (window.scrollY > 600) {
                trackFunnel("landing");
                trackFunnel("scroll");
                window.removeEventListener("scroll", onScroll);
            }
        };
        window.addEventListener("scroll", onScroll, { passive: true });

        // CTA — 가입 모달을 띄우는 모든 행동(히어로/좋아요/댓글/방명록 등)을 가입 의향으로 집계 (세션당 1회)
        const onCta = () => {
            trackFunnel("landing"); // landing 선행 보장
            trackFunnel("cta");
        };
        window.addEventListener("openAuthModal", onCta);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("openAuthModal", onCta);
        };
    }, []);

    return null;
}
