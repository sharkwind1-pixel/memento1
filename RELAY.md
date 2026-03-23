# 릴레이

> **이 파일 = "지금 뭘 해야 하는지"만.** 50줄 이내 유지.
> 완료된 기능/과거 기록 → `RELAY-ARCHIVE.md`
> 프로젝트 규칙/구조/컨벤션 → `CLAUDE.md`

---

## 최근 완료 세션 (2026-03-23) — 보안 전면 수정

### 주요 성과
- 모바일 깜빡임 수정 (AuthContext race condition)
- QA 보안 이슈 7건 전부 해결
- CSP nonce 전환: middleware.ts로 unsafe-inline 완전 제거 (script-src)
- RLS 정리: minimi/inventory adminSupabase 제거
- 메모리 누수 수정: MinihompyStage, useHomePage 타이머 cleanup

### 상세 기록
`RELAY-ARCHIVE.md` > `[2026-03-23] 보안 + 안정성 수정` 참조

---

## TODO — 없음 (코드 작업 전부 완료)

---

## 승빈님 실행 필요 (Supabase Dashboard)

### 1. `20260323_security_rpc_idor_fix.sql` (긴급)
- purchase/sell_minimi_item에 auth.uid() 검증 추가
- protect_sensitive_profile_columns JWT→DB is_admin 전환
- **Supabase Dashboard > SQL Editor에서 실행**

### 2. `20260317_payment_security_fixes.sql` (긴급)
- grant_premium/revoke_premium RPC 권한 제거
- merchant_uid UNIQUE, payments CHECK 제약
- **Supabase Dashboard > SQL Editor에서 실행**
