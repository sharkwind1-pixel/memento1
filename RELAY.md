# 릴레이

> **이 파일 = "지금 뭘 해야 하는지"만.** 50줄 이내 유지.
> 완료된 기능/과거 기록 → `RELAY-ARCHIVE.md`
> 프로젝트 규칙/구조/컨벤션 → `CLAUDE.md`

---

## 최근 완료 세션 (2026-03-24) — 보안 전면 수정 + SQL 실행 완료

### 주요 성과
- 모바일 깜빡임 수정 (AuthContext race condition)
- QA 보안 이슈 7건 전부 해결
- CSP nonce 전환: middleware.ts로 script-src unsafe-inline 완전 제거
- RLS 정리: minimi/inventory 불필요 adminSupabase 제거
- 메모리 누수 수정: MinihompyStage, useHomePage 타이머 cleanup
- 미실행 SQL 2건 실행 완료 (RPC IDOR + 결제 보안)

### 상세 기록
`RELAY-ARCHIVE.md` > `[2026-03-24] 보안 + 안정성 수정` 참조

---

## TODO — 없음

## 미실행 마이그레이션 — 없음
