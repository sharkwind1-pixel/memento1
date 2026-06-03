/**
 * useOptimisticToggle
 *
 * 좋아요/비추천/위로 같은 "낙관적 토글"의 공통 제어 흐름을 한 곳에 표준화한 훅.
 * 그동안 컴포넌트마다 손으로 짠 토글이 흩어져 있어 (1)연타 가드 누락, (2)롤백
 * 비대칭, (3)에러 무시 같은 버그가 반복됐다. 이 훅이 그 제어 흐름만 책임지고,
 * "어떤 상태를 어떻게 바꿀지"(boolean flip / 배열 map 등)는 호출부가 콜백으로 주입한다.
 *
 * 흐름: 가드 확인 → apply(낙관적 반영) → request → reconcile(서버값 보정)
 *       실패 시 rollback → onError, 성공/실패 무관 항상 onSettled + 가드 해제.
 *
 * key별 in-flight Set으로 연타 드리프트를 막는다. 단일 버튼이면 고정 문자열,
 * 목록 항목이면 `like:${id}` 처럼 항목별 키를 넘긴다.
 *
 * 사용 예:
 *   const runToggle = useOptimisticToggle();
 *   runToggle(`like:${id}`, {
 *     apply: () => setItems(prev => prev.map(...flip...)),
 *     request: async () => {
 *       const res = await authFetch(url, { method: "POST" });
 *       if (!res.ok) throw new Error("failed");
 *       return res.json();
 *     },
 *     reconcile: (data) => setItems(prev => prev.map(...서버값...)),
 *     rollback: () => setItems(prev => prev.map(...원복...)),
 *     onError: () => toast.error("처리에 실패했습니다"),
 *   });
 */
import { useCallback, useRef } from "react";

export interface OptimisticToggleOptions<T> {
    /** 낙관적 UI 반영(즉시). 가드 통과 직후 동기 호출된다. */
    apply: () => void;
    /** 실패 시 원상복구. apply 직전 상태로 되돌린다. */
    rollback: () => void;
    /** 서버 요청. 성공 시 데이터 반환, 실패 시 throw 해야 rollback이 돈다. */
    request: () => Promise<T>;
    /** 서버 응답으로 최종 보정(선택). 낙관적 값과 서버 실제값의 오차를 맞춘다. */
    reconcile?: (data: T) => void;
    /** 실패 시 피드백 등(선택). rollback 이후 호출된다. */
    onError?: (err: unknown) => void;
    /** 성공/실패 무관 항상 마지막에 호출(선택). 로딩 state 해제 등 정리용. */
    onSettled?: () => void;
}

export function useOptimisticToggle() {
    const inFlight = useRef<Set<string>>(new Set());

    return useCallback(async function run<T>(
        key: string,
        opts: OptimisticToggleOptions<T>,
    ): Promise<void> {
        if (inFlight.current.has(key)) return; // 연타 드리프트 방지
        inFlight.current.add(key);
        try {
            // apply도 try 안에서 — 향후 apply에 throw 가능 로직이 들어가도 가드가 finally에서 풀린다.
            opts.apply();
            const data = await opts.request();
            opts.reconcile?.(data);
        } catch (err) {
            opts.rollback();
            opts.onError?.(err);
        } finally {
            inFlight.current.delete(key);
            opts.onSettled?.();
        }
    }, []);
}
