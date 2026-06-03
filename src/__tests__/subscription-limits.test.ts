/**
 * 구독 등급/한도/가격 순수함수 테스트 (src/config/constants.ts)
 *
 * 등급별 한도·영상 쿼터·연결제 할인·관리자 판정은 결제/제한 UX에 직결.
 */
import { describe, it, expect } from "vitest";
import {
    getLimitsForTier,
    getVideoMonthlyQuota,
    calculateAnnualSavings,
    isAdmin,
    FREE_LIMITS,
    BASIC_LIMITS,
    PREMIUM_LIMITS,
    VIDEO,
    PRICING,
    ADMIN_EMAILS,
} from "@/config/constants";

describe("getLimitsForTier", () => {
    it("tier별 올바른 한도 객체 반환", () => {
        expect(getLimitsForTier("free")).toBe(FREE_LIMITS);
        expect(getLimitsForTier("basic")).toBe(BASIC_LIMITS);
        expect(getLimitsForTier("premium")).toBe(PREMIUM_LIMITS);
    });

    it("premium 한도가 free보다 큼", () => {
        expect(PREMIUM_LIMITS.PETS).toBeGreaterThan(FREE_LIMITS.PETS);
        expect(PREMIUM_LIMITS.PHOTOS_PER_PET).toBeGreaterThan(FREE_LIMITS.PHOTOS_PER_PET);
        expect(PREMIUM_LIMITS.DAILY_CHATS).toBeGreaterThan(FREE_LIMITS.DAILY_CHATS);
    });
});

describe("getVideoMonthlyQuota", () => {
    it("premium/basic은 월 쿼터, free는 0(평생제한 별도 처리)", () => {
        expect(getVideoMonthlyQuota("premium")).toBe(VIDEO.PREMIUM_MONTHLY);
        expect(getVideoMonthlyQuota("basic")).toBe(VIDEO.BASIC_MONTHLY);
        expect(getVideoMonthlyQuota("free")).toBe(0);
    });
});

describe("calculateAnnualSavings", () => {
    it("연결제 할인 = 월×12 − 연결제, 퍼센트 반올림", () => {
        const { saved, percent } = calculateAnnualSavings();
        const monthlyTotal = PRICING.PREMIUM_MONTHLY * 12;
        expect(saved).toBe(monthlyTotal - PRICING.PREMIUM_ANNUAL);
        expect(percent).toBe(Math.round((saved / monthlyTotal) * 100));
    });

    it("연결제가 월결제 12회보다 저렴(할인 양수)", () => {
        const { saved, percent } = calculateAnnualSavings();
        expect(saved).toBeGreaterThan(0);
        expect(percent).toBeGreaterThan(0);
    });
});

describe("isAdmin", () => {
    it("등록된 관리자 이메일만 true", () => {
        expect(isAdmin(ADMIN_EMAILS[0])).toBe(true);
        expect(isAdmin("random@example.com")).toBe(false);
    });

    it("undefined/빈 문자열은 false (크래시 없이)", () => {
        expect(isAdmin(undefined)).toBe(false);
        expect(isAdmin("")).toBe(false);
    });
});
