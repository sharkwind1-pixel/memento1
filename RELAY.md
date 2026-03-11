# 릴레이

> **이 파일 = "지금 뭘 해야 하는지"만.** 50줄 이내 유지.
> 완료된 기능/과거 기록 → `RELAY-ARCHIVE.md`
> 프로젝트 규칙/구조/컨벤션 → `CLAUDE.md`
> 클로드가 자동 기억하는 것 → `~/.claude/projects/.../memory/MEMORY.md`

---

## 회원 관리 시스템 수정 (완료 — 2026-03-12)

> 상세 기록: `docs/SESSION_20260312_MEMBER_SYSTEM.md`
> 9개 커밋 완료, main 배포됨. SQL 실행 완료.

### 마지막 수정 (`c3a2642`)
- **튜토리얼 중 PetFormModal/사이드바 가림 문제 수정**
- `suppressPetModal` prop: 신규유저 플로우 중 PetFormModal 자동 열기 억제
- `closeSidebar` 이벤트: TutorialTour/RecordPageTutorial 시작 시 사이드바 강제 닫기
- `isNewUserFlowActive` 변수 추출로 모달 상태 관리 일원화

### 미확인 사항 (실계정 테스트 필요)
- 도진 계정 재로그인 시 닉네임 → 온보딩 → 튜토리얼 → RecordPageTutorial → PetFormModal 순서 정상 진행
- RecordPageTutorial 완료 후 PetFormModal 자동 열기 정상 동작
- Realtime 구독 동작 여부 (다른 기기 즉시 로그아웃)

---

## TODO

### 1. 모바일 깜빡임 — 특정 계정에서 발생, 수정 필요
### 2. 결제 연동 — 3월 말~4월 초 예정, 포트원/다날 등 비교 중
### 3. RLS 정책 수정 — 보류
### 4. QA 스캔 잔여 이슈 — `docs/QA_SCAN_REPORT_20260306.md`
