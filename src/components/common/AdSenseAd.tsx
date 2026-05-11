/**
 * AdSenseAd — Google AdSense 광고 단위 렌더링
 *
 * 운영 시작 전 사용자가 직접 해야 할 작업:
 *  1. https://adsense.google.com/start/ 가입 + 사이트 추가
 *  2. 광고 단위 생성 (Display ad / In-article ad)
 *  3. Publisher ID(ca-pub-...) + 각 광고 단위 ID를 환경변수에 등록:
 *     - NEXT_PUBLIC_ADSENSE_PUBLISHER_ID=ca-pub-XXXXXXXXXX
 *     - NEXT_PUBLIC_ADSENSE_ARTICLE_SLOT_ID=YYYYYYYYYY
 *     - NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT_ID=ZZZZZZZZZZ
 *  4. layout.tsx에 AdSense script 태그 한 번 추가 (별도 작업)
 *
 * 노출 차단 조건 (메멘토애니 톤 보호):
 *  - 프리미엄 유저: 광고 차단
 *  - 추모 모드 페이지: 광고 차단
 *  - 결제 페이지: 광고 차단
 *
 * 환경변수 없으면 자동으로 빈 div 반환 (개발 환경 보호).
 */

"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface AdSenseAdProps {
    /** 광고 슬롯 종류 */
    slot: "article" | "display";
    /** 추가 클래스 (외부 컨테이너 스타일) */
    className?: string;
    /** true면 광고 절대 안 보임 (추모 모드 등) — 호출 측에서 결정 */
    disabled?: boolean;
}

declare global {
    interface Window {
        adsbygoogle?: unknown[];
    }
}

export default function AdSenseAd({ slot, className, disabled = false }: AdSenseAdProps) {
    const adRef = useRef<HTMLModElement | null>(null);
    const isPushedRef = useRef(false);
    const { isPremiumUser } = useAuth();

    const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;
    const slotId = slot === "article"
        ? process.env.NEXT_PUBLIC_ADSENSE_ARTICLE_SLOT_ID
        : process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT_ID;

    useEffect(() => {
        // 프리미엄 / 비활성화 / 환경변수 미설정 시 광고 안 띄움
        if (disabled || isPremiumUser || !publisherId || !slotId) return;
        if (isPushedRef.current) return;

        try {
            // adsbygoogle 큐에 push (AdSense 스크립트가 자동으로 처리)
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            isPushedRef.current = true;
        } catch (e) {
            // 광고 로드 실패해도 페이지 동작에 영향 X
            console.warn("[AdSense] 광고 로드 실패:", e);
        }
    }, [disabled, isPremiumUser, publisherId, slotId]);

    // 노출 차단 케이스
    if (disabled || isPremiumUser) return null;
    // 환경변수 미설정 시 빈 컴포넌트 (개발 환경에서 빈칸으로 표시 안 함)
    if (!publisherId || !slotId) return null;

    const format = slot === "article" ? "fluid" : "auto";
    const layout = slot === "article" ? "in-article" : undefined;

    return (
        <div className={className} aria-label="광고" data-ad-container="true">
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={{ display: "block", textAlign: "center" }}
                data-ad-client={publisherId}
                data-ad-slot={slotId}
                {...(layout ? { "data-ad-layout": layout } : {})}
                data-ad-format={format}
                data-full-width-responsive="true"
            />
        </div>
    );
}
