# 릴레이

> **이 파일 = "지금 뭘 해야 하는지"만.** 50줄 이내 유지.
> 완료된 기능/과거 기록 → `RELAY-ARCHIVE.md`
> 프로젝트 규칙/구조/컨벤션 → `CLAUDE.md`

---

## 최근 완료 세션 (2026-03-23) — AI 펫톡 + 매거진 + 홈 UI

### 주요 성과
- AI 펫톡 추천 질문 화이트리스트 방식으로 전면 교체 (맛집/먹거리 근절)
- 여행지 지역명 기반 산책/공원 장소 검색 (네이버 API)
- 매거진 자동화: 동물 종 다양성(70/30) + 실질적 주제 60개 + 계절 로직(환절기만)
- Google Search Console 구조화된 데이터 수정 (Product → SoftwareApplication)
- 홈 화면 레이아웃 밀림 방지 (스켈레톤 동시 로딩)
- 프리미엄 가격 문구 수정 ("하루 약 260원")
- "마음속에 영원히" 섹션: 오늘 추모 등록 펫 + 기억의 날 펫 카드 표시로 확정

### 참고
- "기일/주기" 같은 노골적 표현 사용 금지 — "함께한 N년", "새로운 기억", "무지개다리" 등 완곡 표현만
- `/api/memorial-today`: 오늘 추모 등록(created_at) + memorial_date 월일 매칭, 없으면 앞뒤 3일 확장

### 상세 기록
`RELAY-ARCHIVE.md` > `[2026-03-23] AI 펫톡 개선 + 매거진 자동화 + 홈 UI 수정` 참조

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

### `supabase/migrations/20260323_pet_condolences.sql`
- **내용**: 추모 펫 위로 리액션 테이블 (`pet_condolences`), UNIQUE(pet_id, user_id), RLS 정책
- **의존**: 위로 버튼 기능이 이 테이블 없이도 프론트는 동작하나, 실제 저장/조회 안 됨
- **실행 방법**: Supabase Dashboard > SQL Editor에서 위 파일 내용 복사 붙여넣기 실행
