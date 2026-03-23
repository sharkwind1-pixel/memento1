# 릴레이

> **이 파일 = "지금 뭘 해야 하는지"만.** 50줄 이내 유지.
> 완료된 기능/과거 기록 → `RELAY-ARCHIVE.md`
> 프로젝트 규칙/구조/컨벤션 → `CLAUDE.md`

---

## 최근 완료 세션 (2026-03-23) — 마음속에 영원히 섹션 완성 + 위로 리액션

### 주요 성과
- "마음속에 영원히" 섹션 로직 확정: 오늘 추모 등록 펫 + 기억의 날 펫 + 폴백(전체 추모 펫)
- 부제목/뱃지 등 노골적 표현 전부 완곡하게 수정 ("영원히 마음속에 함께해요")
- 더보기 버튼 제거 (잘못된 게시판 연결)
- **위로 리액션 기능**: 추모 펫 카드에 amber Heart "위로" 버튼
  - `pet_condolences` 테이블 (SQL 실행 완료)
  - `POST /api/pets/[id]/condolence` 토글 API (rate limit, VPN 차단)
  - 낙관적 UI + 서버 동기화 + 롤백
  - 로그인 시 내 위로 상태 자동 조회

### 참고
- "기일/주기" 같은 노골적 표현 사용 금지 — "함께한 N년", "새로운 기억", "무지개다리" 등 완곡 표현만
- `/api/memorial-today`: 오늘 추모 등록(created_at) + memorial_date 월일 매칭, 없으면 앞뒤 3일 확장 → 전체 추모 펫 폴백
- 위로 리액션: 포인트 적립 없음 (추모 맥락에 부적절)

### 상세 기록
`RELAY-ARCHIVE.md` > `[2026-03-23] 마음속에 영원히 + 위로 리액션` 참조

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

### ~~`supabase/migrations/20260323_pet_condolences.sql`~~ (실행 완료 2026-03-23)
