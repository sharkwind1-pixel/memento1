# 릴레이

> **이 파일 = "지금 뭘 해야 하는지"만.** 50줄 이내 유지.
> 완료된 기능/과거 기록 → `RELAY-ARCHIVE.md`
> 프로젝트 규칙/구조/컨벤션 → `CLAUDE.md`

---

## 최근 완료 세션 (2026-03-23) — 보안 + 안정성

### 주요 성과
- 모바일 깜빡임 수정: AuthContext getSession/onAuthStateChange 이중 프로필 리셋 방지
- QA 보안 이슈 7건 전부 해결 (C-1~C-7)
- 기존 미실행 SQL 4건 실행 확인 완료 (chat_mode, preferred_hour, placed_minimi, minimi_system)

### 상세 기록
`RELAY-ARCHIVE.md` > `[2026-03-23] 보안 + 안정성 수정` 참조

---

## TODO

### 1. CSP nonce 전환 — unsafe-inline 제거 (향후)
### 2. RLS 정책 수정 — 보류

---

## 미실행 마이그레이션

### `supabase/migrations/20260323_security_rpc_idor_fix.sql` (긴급도: 높음)
- **내용**: purchase/sell_minimi_item에 auth.uid() 검증, protect_sensitive_profile_columns JWT→DB 전환
- **위험**: 미실행 시 클라이언트에서 다른 유저 ID로 미니미 구매/판매 가능
- **실행 방법**: Supabase Dashboard > SQL Editor에서 위 파일 내용 복사 붙여넣기 실행

### `supabase/migrations/20260317_payment_security_fixes.sql` (긴급도: 높음)
- **내용**: grant_premium/revoke_premium RPC를 authenticated에서 REVOKE, merchant_uid UNIQUE, payments CHECK
- **위험**: authenticated 유저가 직접 `grant_premium` RPC 호출로 무료 프리미엄 획득 가능
- **실행 방법**: Supabase Dashboard > SQL Editor에서 위 파일 내용 복사 붙여넣기 실행
