# 릴레이

> **이 파일 = "지금 뭘 해야 하는지"만.** 50줄 이내 유지.
> 완료된 기능/과거 기록 → `RELAY-ARCHIVE.md`
> 프로젝트 규칙/구조/컨벤션 → `CLAUDE.md`

---

## 튜토리얼 + 스크롤 + 방어 로직 + 재가입 버그 세션 (2026-03-12, 완료)

### 커밋 목록 (모두 배포됨)
1. `c3a2642` — 튜토리얼 중 PetFormModal/사이드바 가림 수정
2. `a545d37` — 튜토리얼 UX 개선 (섹션 하이라이트 + 스텝 순서)
3. `9928de0` — RecordPage overflow-hidden/contain 제거
4. `64a6686` — RecordPage 잔여 contain/translateZ 제거
5. `256ff55` — MediaUploadModal useBodyScrollLock 제거 (iOS 사진 선택기 충돌)
6. `6684f20` — 미확인 3건 코드 방어 로직 (touchmove 차단, localStorage 저장, ref 초기화)
7. `6fbe55c` — 재가입 유저 새로고침 시 데이터 리셋 버그 수정 (onboarding_completed_at 체크)
8. `802ebd9` — sessionStorage 세션당 1회 방어 추가 (재가입 리셋 이중 방어)
9. `7397567` — **RecordPageTutorial 제거** (펫 0마리 신규유저 논리적 모순 해소)

### 미확인 (실기기 테스트 필요)
- iOS Safari 사진 선택기 컬렉션 탭 스크롤
- MediaUploadModal backdrop rubber band 스크롤 누수
- 신규유저 전체 플로우 (닉네임→온보딩→튜토리얼→Record 페이지→PetFormModal)
- 재가입 유저 새로고침 시 데이터 유지 확인

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
