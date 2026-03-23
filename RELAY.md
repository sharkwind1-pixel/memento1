# 릴레이

> **이 파일 = "지금 뭘 해야 하는지"만.** 50줄 이내 유지.
> 완료된 기능/과거 기록 → `RELAY-ARCHIVE.md`
> 프로젝트 규칙/구조/컨벤션 → `CLAUDE.md`

---

## 최근 완료 세션 (2026-03-23) — 커뮤니티 안정화 + 발표 준비

### 주요 성과
- 자기 글 좋아요 방지 (PostDetailView + 홈 페이지)
- 좋아요/댓글 새로고침 시 유지 (DB 연동, userLiked API)
- 댓글 500 에러 3차에 걸쳐 수정 (post_comments 실제 컬럼: author_name)
- 공지 라벨 관리자용 설명 제거
- 함께보기 뒤로가기 버튼 수정 (overflow-hidden 제거)
- 부트캠프 최종 발표 자료 작성

### 상세 기록
`RELAY-ARCHIVE.md` > `[2026-03-23]` 참조

---

## TODO

### 1. 모바일 깜빡임 — 특정 계정에서 발생
### 2. QA CRITICAL 보안 이슈 — `docs/QA_SCAN_REPORT_20260306.md` (IDOR, CSP, JWT 스푸핑 등 7건)
### 3. 미실행 SQL 6개 — `RELAY-ARCHIVE.md` 하단 참조
### 4. 결제 연동 — 포트원 V2 + KG이니시스 연동 완료 (승인 대기 중)
### 5. RLS 정책 수정 — 보류

---

## 미실행 마이그레이션 (긴급도: 높음)

### `supabase/migrations/20260317_payment_security_fixes.sql`
- **내용**: grant_premium/revoke_premium/expire_premium_subscriptions RPC를 authenticated/anon에서 REVOKE, merchant_uid UNIQUE 제약, payments.status CHECK, payments.amount 양수 CHECK
- **위험**: authenticated 유저가 클라이언트에서 직접 `grant_premium` RPC를 호출해서 무료로 프리미엄 획득 가능 (현재 막혀있지 않음)
- **실행 방법**: Supabase Dashboard > SQL Editor에서 위 파일 내용 복사 붙여넣기 실행
