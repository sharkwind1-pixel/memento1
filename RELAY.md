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

### 5. 5번 QA 보고 이슈 (2026-03-06 세션)
- 에러 사일런트 실패 패턴: catch 블록에서 console.error 없이 삼키는 곳 전체 스캔
- 다크모드 구현 방식 통일: TutorialTour(인라인) vs RecordPageTutorial(Tailwind dark:) 혼재
- body overflow 모달 체인 관리: 모달 중첩 시 스크롤 잠금 해제 타이밍

### [완료] 간편모드 — 코드+DB 모두 완료
### [완료] 관리자 대시보드 모바일 compact UX
### [완료] 온보딩/튜토리얼 디자인 개선 (다크모드+SVG 구름+워딩)
### [완료] 매거진 디자인 마무리 (커버 비율+엔딩 CTA+관리자 미리보기)
### [완료] 온보딩 리셋 버그 (select 체이닝+트리거 컬럼 참조)
