/**
 * 웹 ↔ 모바일 상수 드리프트 방지 테스트.
 *
 * 가격·한도가 두 플랫폼에서 어긋나면(예: 한쪽만 가격 인상) 결제/구독 사고로 직결된다.
 * constants.ts가 단일 진실이지만 모바일은 RN이라 파일을 따로 두므로, 핵심 값이
 * 동일한지 빌드 단계에서 강제한다. (이 테스트가 깨지면 = 한쪽만 바꾼 것)
 */
import { describe, it, expect } from "vitest";
import * as web from "@/config/constants";
import * as mobile from "../../mobile/config/constants";

describe("웹↔모바일 상수 드리프트 방지", () => {
    it("FREE_LIMITS 값 일치", () => {
        expect(mobile.FREE_LIMITS.PETS).toBe(web.FREE_LIMITS.PETS);
        expect(mobile.FREE_LIMITS.PHOTOS_PER_PET).toBe(web.FREE_LIMITS.PHOTOS_PER_PET);
        expect(mobile.FREE_LIMITS.DAILY_CHATS).toBe(web.FREE_LIMITS.DAILY_CHATS);
    });

    it("BASIC_LIMITS 값 일치 (deprecated지만 레거시 유저용 유지)", () => {
        expect(mobile.BASIC_LIMITS.PETS).toBe(web.BASIC_LIMITS.PETS);
        expect(mobile.BASIC_LIMITS.PHOTOS_PER_PET).toBe(web.BASIC_LIMITS.PHOTOS_PER_PET);
        expect(mobile.BASIC_LIMITS.DAILY_CHATS).toBe(web.BASIC_LIMITS.DAILY_CHATS);
    });

    it("PREMIUM_LIMITS 값 일치", () => {
        expect(mobile.PREMIUM_LIMITS.PETS).toBe(web.PREMIUM_LIMITS.PETS);
        expect(mobile.PREMIUM_LIMITS.PHOTOS_PER_PET).toBe(web.PREMIUM_LIMITS.PHOTOS_PER_PET);
        expect(mobile.PREMIUM_LIMITS.DAILY_CHATS).toBe(web.PREMIUM_LIMITS.DAILY_CHATS);
    });

    it("PRICING 값 일치 (결제 직결 — 최우선)", () => {
        expect(mobile.PRICING.PREMIUM_MONTHLY).toBe(web.PRICING.PREMIUM_MONTHLY);
        expect(mobile.PRICING.PREMIUM_ANNUAL).toBe(web.PRICING.PREMIUM_ANNUAL);
        expect(mobile.PRICING.BASIC_MONTHLY).toBe(web.PRICING.BASIC_MONTHLY);
    });

    it("VIDEO 가격·횟수 일치 (결제 직결)", () => {
        expect(mobile.VIDEO.SINGLE_PRICE).toBe(web.VIDEO.SINGLE_PRICE);
        expect(mobile.VIDEO.BUNDLE_5_PRICE).toBe(web.VIDEO.BUNDLE_5_PRICE);
        expect(mobile.VIDEO.BUNDLE_10_PRICE).toBe(web.VIDEO.BUNDLE_10_PRICE);
        expect(mobile.VIDEO.PREMIUM_MONTHLY).toBe(web.VIDEO.PREMIUM_MONTHLY);
    });
});
