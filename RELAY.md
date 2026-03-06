# 릴레이

> **이 파일 = "지금 뭘 해야 하는지"만.** 50줄 이내 유지.
> 완료된 기능/과거 기록 → `RELAY-ARCHIVE.md`
> 프로젝트 규칙/구조/컨벤션 → `CLAUDE.md`
> 클로드가 자동 기억하는 것 → `~/.claude/projects/.../memory/MEMORY.md`

---

## 미실행 마이그레이션 — 없음 (2026-03-06 전부 실행 완료)

> 상세 상태: `supabase/migrations/_STATUS.md` 참조.

---

## TODO

### 1. 결제 연동 (포트원) — 승빈님 계정 필요
- `PremiumModal.tsx`의 "준비 중" → 포트원 결제창 호출
- 환경변수: `PORTONE_API_KEY`, `PORTONE_API_SECRET`, `NEXT_PUBLIC_PORTONE_STORE_ID`
- 상세 구현 가이드 → RELAY-ARCHIVE.md "결제 연동" 섹션

### 2. AI 영상 생성 — 승빈님 설정 필요
- Storage `videos` 버킷 생성 + 환경변수 `FAL_KEY`, `VIDEO_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`
- 코드는 완료, DB 마이그레이션 실행 완료, 환경변수만 남음

### 3. 모바일 깜빡임 — 실기기 확인
- React.memo 적용 완료 (`e3aa66f`), 아이폰/안드로이드 테스트 필요

### 4. RLS 정책 수정 — 카카오 관리자 로그인
- `reports`, `deleted_accounts` 테이블 RLS가 이메일 하드코딩 → `is_admin = true`로 변경 필요
- 상세 SQL → `.claude/plans/iterative-inventing-rabbit.md`

### 5. QA 스캔 잔여 이슈
- **상세 보고서**: `docs/QA_SCAN_REPORT_20260306.md`
- [완료] Phase 1 보안: RPC IDOR, JWT 트리거, fail-open (`9bc18b5`)
- [완료] Phase 2 안정성: hydration, 메모리 누수, 에러 삼킴, bare catch (`9bc18b5`)
- [완료] Phase 3 일부: alert→toast, RemindersSection/VideoGeneration 다크모드 (`9bc18b5`)
- [완료] AdminPage, MemoryAlbumViewer 다크모드 (`0381fb9`)
- [완료] 18개 모달 body scroll lock 일괄 적용 (`0381fb9`)
- [완료] 타입 중복 통합 (MemorialPost, SmoothAutoScrollReturn, OnboardingData) (`0381fb9`)
- [완료] localStorage 무검증 캐스팅 수정 (`0381fb9`)
- [완료] CSP unsafe-eval 프로덕션 제거 (`8291b0e`)
- [보류] 인메모리 rate limit → Vercel KV 전환 (유저 증가 시 진행, 현재 핵심은 DB 기반)

### [완료] 간편모드 — 코드+DB 모두 완료
### [완료] 관리자 대시보드 모바일 compact UX
### [완료] 온보딩/튜토리얼 디자인 개선 (다크모드+SVG 구름+워딩)
### [완료] 매거진 디자인 마무리 (커버 비율+엔딩 CTA+관리자 미리보기)
### [완료] 온보딩 리셋 버그 (select 체이닝+트리거 컬럼 참조)
