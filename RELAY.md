# 릴레이

> **이 파일 = "지금 뭘 해야 하는지"만.** 50줄 이내 유지.
> 완료된 기능/과거 기록 → `RELAY-ARCHIVE.md`
> 프로젝트 규칙/구조/컨벤션 → `CLAUDE.md`

---

## 최근 완료 세션 (2026-03-23) — 보안 + 안정성

### 주요 성과
- 모바일 깜빡임 수정: AuthContext getSession/onAuthStateChange 이중 프로필 리셋 방지
- QA 보안 이슈 7건 중 코드 수정 가능 건 전부 해결:
  - C-1 (RPC IDOR): purchase/sell_minimi_item에 auth.uid() 검증 추가 (SQL)
  - C-3 (JWT Spoofing): protect_sensitive_profile_columns 트리거에서 JWT claim 대신 DB is_admin 조회 (SQL)
  - C-2 (CSP): upgrade-insecure-requests 추가, unsafe-inline은 Next.js 특성상 nonce 전환 필요 (향후)
  - C-4 (Hydration): 이전 세션에서 이미 수정 확인
  - C-5 (메모리 누수): MinihompyStage touchTimer + useHomePage heartTimers cleanup 추가
  - C-6, C-7 (에러 로깅): 이전 세션에서 이미 수정 확인

### 상세 기록
`RELAY-ARCHIVE.md` > `[2026-03-23] 보안 + 안정성 수정` 참조

---

## TODO

### 1. 결제 연동 — 포트원 V2 + KG이니시스 연동 완료 (승인 대기 중)
### 2. RLS 정책 수정 — 보류
### 3. CSP nonce 전환 — Next.js middleware + nonce 패턴으로 unsafe-inline 제거 (향후)

---

## 미실행 마이그레이션 (긴급도: 높음)

### `supabase/migrations/20260323_security_rpc_idor_fix.sql` (**신규**)
- **내용**: purchase/sell_minimi_item에 auth.uid() 검증, protect_sensitive_profile_columns JWT→DB 전환
- **위험**: 미실행 시 클라이언트에서 다른 유저 ID로 미니미 구매/판매 가능
- **실행 방법**: Supabase Dashboard > SQL Editor에서 위 파일 내용 복사 붙여넣기 실행

### `supabase/migrations/20260317_payment_security_fixes.sql`
- **내용**: grant_premium/revoke_premium RPC를 authenticated에서 REVOKE, merchant_uid UNIQUE, payments CHECK
- **위험**: authenticated 유저가 직접 `grant_premium` RPC를 호출해서 무료 프리미엄 획득 가능
- **실행 방법**: Supabase Dashboard > SQL Editor에서 위 파일 내용 복사 붙여넣기 실행

### 기존 미실행 SQL 4건
- `20260226_chat_mode_column.sql` — AI 펫톡 모드 분리
- `20260226_security_fixes.sql` — 미니미 구매/판매 원자성 + 제한 트리거
- `20260225_push_preferred_hour.sql` — 푸시 알림 시간대별 발송
- `placed_minimi` JSONB 컬럼 추가 (직접 SQL)
