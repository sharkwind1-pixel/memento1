/**
 * record 페이지 서브탭 외부 진입 신호.
 *
 * 사이드바/히어로의 "내 펫홈" 등에서 record 탭의 특정 서브탭으로 바로 보낼 때,
 * CustomEvent(navigateRecordSubTab) 단독으로는 record 탭이 처음 lazy 마운트되는 동안
 * 리스너가 아직 안 붙어 이벤트가 유실되고, RecordPage의 활성화 리셋(→ "pets")이 이겨서
 * 엉뚱하게 반려동물 페이지로 빠지는 레이스가 있었다.
 *
 * 모듈 싱글턴 pending 플래그를 RecordPage가 마운트/활성화 시점에 읽어 소비함으로써
 * 타이밍 의존을 제거한다. (CustomEvent는 이미 활성 상태에서의 서브탭 전환용으로 병행)
 */

export type RecordSubTab = "pets" | "profile" | "minihompy";

let pending: RecordSubTab | null = null;

export function setPendingRecordSub(sub: RecordSubTab) {
    pending = sub;
}

/** 읽으면서 비운다 (한 번만 소비). */
export function consumePendingRecordSub(): RecordSubTab | null {
    const p = pending;
    pending = null;
    return p;
}
