/**
 * 펫 인사말 생성 테스트 (src/components/features/chat/chatUtils.ts)
 *
 * AI 펫톡 첫 화면 UX. 받침 조사 오류·일상/추모 톤 혼선·생일 인식 누락이 과거
 * 반복 신고 지점. 시간 의존(new Date)이라 fake timer로 결정화 후 검증.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generatePersonalizedGreeting, type TimelineEntry } from "@/components/features/chat/chatUtils";
import type { Pet } from "@/types";

function makePet(overrides: Partial<Pet>): Pet {
    return {
        id: "pet-1",
        name: "콩",
        type: "강아지",
        ...overrides,
    } as unknown as Pet;
}

describe("generatePersonalizedGreeting", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // 평일 오전 10시(KST 무관 getHours 기준) — 특별일/장기부재 아님
        vi.setSystemTime(new Date("2026-06-04T10:00:00"));
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it("일상 모드: 펫 이름이 포함된 비어있지 않은 인사말", () => {
        const g = generatePersonalizedGreeting(makePet({ name: "콩" }), false, []);
        expect(g).toContain("콩");
        expect(g.length).toBeGreaterThan(0);
    });

    it("받침 없는 이름은 '이야'가 아니라 '야'로 (조사 정정)", () => {
        const g = generatePersonalizedGreeting(makePet({ id: "p-chu", name: "츄츄" }), false, []);
        expect(g).toContain("츄츄");
        expect(g).not.toContain("츄츄이야");
        expect(g).not.toContain("츄츄이가");
    });

    it("같은 펫은 결정론적으로 같은 인사말(해시 기반)", () => {
        const pet = makePet({ id: "stable-id", name: "보리" });
        const a = generatePersonalizedGreeting(pet, false, []);
        const b = generatePersonalizedGreeting(pet, false, []);
        expect(a).toBe(b);
    });

    it("생일 당일이면 생일 인사 포함(일상)", () => {
        // 시스템 시간 6/4과 같은 월-일의 생일
        const g = generatePersonalizedGreeting(
            makePet({ name: "콩", birthday: "2020-06-04" }),
            false,
            [],
        );
        expect(g).toMatch(/생일|축하/);
    });

    it("추모 모드: 펫 이름 포함 + 일상 의성어(멍멍!) 없음", () => {
        const g = generatePersonalizedGreeting(makePet({ name: "콩" }), true, []);
        expect(g).toContain("콩");
        expect(g).not.toContain("멍멍!");
    });

    it("최근(7일내) 타임라인 있으면 그 제목을 언급", () => {
        const timeline: TimelineEntry[] = [
            { id: "t1", date: "2026-06-03", title: "공원 산책", content: "즐거웠다", mood: "happy" },
        ];
        const g = generatePersonalizedGreeting(makePet({ name: "콩" }), false, timeline);
        expect(g).toContain("공원 산책");
    });
});
