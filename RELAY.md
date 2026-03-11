# 릴레이

> **이 파일 = "지금 뭘 해야 하는지"만.** 50줄 이내 유지.
> 완료된 기능/과거 기록 → `RELAY-ARCHIVE.md`
> 프로젝트 규칙/구조/컨벤션 → `CLAUDE.md`
> 클로드가 자동 기억하는 것 → `~/.claude/projects/.../memory/MEMORY.md`

---

## 튜토리얼 + 스크롤 수정 세션 (2026-03-12)

### 커밋 목록 (모두 main 배포됨)
1. `c3a2642` — 튜토리얼 중 PetFormModal/사이드바 가림 문제 수정
2. `6ffe3aa` — RELAY.md 업데이트
3. `a545d37` — 튜토리얼 UX 개선 (섹션 하이라이트 + 스텝 순서)
4. `9928de0` — RecordPage 사진 앨범 스크롤: overflow-hidden/contain 제거
5. `64a6686` — RecordPage 잔여 contain:'style' + translateZ(0) 제거
6. `256ff55` — **MediaUploadModal useBodyScrollLock 제거** (iOS 사진 선택기 스크롤 충돌 해결)

### 핵심 변경 (`256ff55`)
- **문제**: iOS에서 "사진 추가" → 네이티브 사진 선택기의 앨범/컬렉션 탭 스크롤 불가
- **원인**: `useBodyScrollLock`의 `position: fixed`가 iOS 네이티브 UI 스크롤까지 차단
- **수정**: useBodyScrollLock 제거, `overflow: hidden`만 사용 (position: fixed 없이)
- **패턴**: PetFormModal 방식 — backdrop(`overflow-y-auto`) 자체가 스크롤 컨테이너

### 미확인 사항 (실기기 테스트 필요)
- iOS Safari에서 사진 선택기 컬렉션 탭 스크롤 정상 동작 여부
- MediaUploadModal 뒤 페이지 스크롤 누수 없는지
- 튜토리얼 전체 플로우 정상 진행 (닉네임 → 온보딩 → 튜토리얼 → RecordPageTutorial → PetFormModal)

---

## TODO

### 1. 모바일 깜빡임 — 특정 계정에서 발생, 수정 필요
### 2. 결제 연동 — 3월 말~4월 초 예정, 포트원/다날 등 비교 중
### 3. RLS 정책 수정 — 보류
### 4. QA 스캔 잔여 이슈 — `docs/QA_SCAN_REPORT_20260306.md`
