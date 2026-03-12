# 릴레이

> **이 파일 = "지금 뭘 해야 하는지"만.** 50줄 이내 유지.
> 완료된 기능/과거 기록 → `RELAY-ARCHIVE.md`
> 프로젝트 규칙/구조/컨벤션 → `CLAUDE.md`

---

## 튜토리얼 + 스크롤 + 방어 로직 세션 (2026-03-12, 완료)

### 커밋 목록 (모두 main 배포됨)
1. `c3a2642` — 튜토리얼 중 PetFormModal/사이드바 가림 수정
2. `a545d37` — 튜토리얼 UX 개선 (섹션 하이라이트 + 스텝 순서)
3. `9928de0` — RecordPage overflow-hidden/contain 제거
4. `64a6686` — RecordPage 잔여 contain/translateZ 제거
5. `256ff55` — MediaUploadModal useBodyScrollLock 제거 (iOS 사진 선택기 충돌)
6. `6684f20` — **미확인 3건 코드 방어 로직**: touchmove 차단, localStorage 저장, ref 초기화

### 미확인 (실기기 테스트 필요)
- iOS Safari 사진 선택기 컬렉션 탭 스크롤
- MediaUploadModal backdrop rubber band 스크롤 누수
- 신규유저 전체 플로우 (닉네임→온보딩→튜토리얼→RecordTutorial→PetFormModal)

---

## TODO

### 1. 모바일 깜빡임 — 특정 계정에서 발생
### 2. QA CRITICAL 보안 이슈 — `docs/QA_SCAN_REPORT_20260306.md` (IDOR, CSP, JWT 스푸핑 등 7건)
### 3. 미실행 SQL 6개 — `RELAY-ARCHIVE.md` 하단 참조
### 4. 결제 연동 — 3월 말~4월 초 예정
### 5. RLS 정책 수정 — 보류
