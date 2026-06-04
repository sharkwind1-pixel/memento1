/**
 * 한국어 조사 헬퍼 테스트 (src/lib/korean-particle.ts)
 *
 * AI 펫톡 인사말·응답 전반에서 사용. 받침 오판 시 "츄츄이야" 같은 어색한 표현 +
 * GPT의 "{이름}이가" 양조사 출력 정정 실패로 직결 → 회귀 방지.
 */
import { describe, it, expect } from "vitest";
import { hasJongseong, nameParticle, josa, fixKoreanParticles } from "@/lib/korean-particle";

describe("hasJongseong — 받침 유무", () => {
    it("받침 있는 이름 → true", () => {
        expect(hasJongseong("콩")).toBe(true);   // ㅇ 받침
        expect(hasJongseong("별")).toBe(true);   // ㄹ 받침
        expect(hasJongseong("곰돌")).toBe(true);
    });
    it("받침 없는 이름 → false", () => {
        expect(hasJongseong("츄츄")).toBe(false);
        expect(hasJongseong("보리")).toBe(false);
        expect(hasJongseong("메리")).toBe(false);
    });
    it("비한글/빈값 → false (크래시 없이)", () => {
        expect(hasJongseong("Max")).toBe(false);
        expect(hasJongseong("")).toBe(false);
    });
});

describe("nameParticle — 받침별 조사 묶음", () => {
    it("받침 있으면 이야/이/을/은/아", () => {
        expect(nameParticle("콩")).toEqual({ iya: "이야", iga: "이", eul: "을", eun: "은", a: "아" });
    });
    it("받침 없으면 야/가/를/는/야", () => {
        expect(nameParticle("츄츄")).toEqual({ iya: "야", iga: "가", eul: "를", eun: "는", a: "야" });
    });
});

describe("josa — 이/가 페어 선택", () => {
    it("받침 유무로 앞/뒤 선택", () => {
        expect(josa("콩", "이/가")).toBe("이");
        expect(josa("츄츄", "이/가")).toBe("가");
        expect(josa("콩", "은/는")).toBe("은");
        expect(josa("츄츄", "은/는")).toBe("는");
    });
    it("슬래시 없는 잘못된 pair는 그대로 반환", () => {
        expect(josa("콩", "이")).toBe("이");
    });
});

describe("fixKoreanParticles — GPT 양조사 출력 정정", () => {
    it("받침 있는 이름: {name}이가 → {name}이", () => {
        expect(fixKoreanParticles("콩이가 왔다", "콩")).toBe("콩이 왔다");
        expect(fixKoreanParticles("콩이를 불렀어", "콩")).toBe("콩을 불렀어");
        expect(fixKoreanParticles("콩이는 행복해", "콩")).toBe("콩은 행복해");
    });
    it("받침 없는 이름: {name}이가 → {name}가", () => {
        expect(fixKoreanParticles("츄츄이가 왔다", "츄츄")).toBe("츄츄가 왔다");
        expect(fixKoreanParticles("츄츄이를 불렀어", "츄츄")).toBe("츄츄를 불렀어");
    });
    it("이에게 → 에게 (받침 무관)", () => {
        expect(fixKoreanParticles("콩이에게 줬어", "콩")).toBe("콩에게 줬어");
    });
    it("비한글 이름/빈 입력은 원문 유지", () => {
        expect(fixKoreanParticles("Max이가 왔다", "Max")).toBe("Max이가 왔다");
        expect(fixKoreanParticles("", "콩")).toBe("");
    });
    it("정정 대상 없으면 원문 유지", () => {
        expect(fixKoreanParticles("콩이 잘 잤어", "콩")).toBe("콩이 잘 잤어");
    });
});
