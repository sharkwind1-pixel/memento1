/**
 * nativeUrl 검증 테스트 (src/lib/native-url.ts)
 *
 * 오픈 리다이렉트 / 매직링크 토큰 탈취 방어. 허용 스킴(mementoani://, exp://)만 통과,
 * 임의 http(s)/javascript 등은 차단되어야 한다.
 */
import { describe, it, expect } from "vitest";
import { isAllowedNativeUrl } from "@/lib/native-url";

describe("isAllowedNativeUrl", () => {
    it("앱 커스텀 스킴은 허용", () => {
        expect(isAllowedNativeUrl("mementoani://auth/callback")).toBe(true);
        expect(isAllowedNativeUrl("exp://192.168.0.5:8081/--/auth/callback")).toBe(true);
    });

    it("대소문자/앞공백 무관하게 스킴 판정", () => {
        expect(isAllowedNativeUrl("MEMENTOANI://x")).toBe(true);
        expect(isAllowedNativeUrl("  mementoani://x")).toBe(true);
    });

    it("외부 http(s) URL은 차단 (토큰 탈취 방지)", () => {
        expect(isAllowedNativeUrl("https://evil.com")).toBe(false);
        expect(isAllowedNativeUrl("http://evil.com/steal")).toBe(false);
        expect(isAllowedNativeUrl("https://mementoani.com")).toBe(false);
    });

    it("위험 스킴/빈값/널 차단", () => {
        expect(isAllowedNativeUrl("javascript:alert(1)")).toBe(false);
        expect(isAllowedNativeUrl("data:text/html,<script>")).toBe(false);
        expect(isAllowedNativeUrl("")).toBe(false);
        expect(isAllowedNativeUrl(null)).toBe(false);
        expect(isAllowedNativeUrl(undefined)).toBe(false);
    });
});
