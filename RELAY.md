# 릴레이

## [!!!] 모바일 깜빡임 문제 - 미해결 (다음 세션 최우선)

> **상태**: 6번의 커밋으로 수정 시도했으나 여전히 깜빡임 발생. 코드 변경이 많아져서 오히려 불안정해졌을 수 있음.
> **증상**: 홈에서 처음엔 괜찮음 → 내기록 탭 갔다가 다른 탭으로 이동하면 이미지/버튼/아이콘이 깜빡거림
> **원인 추정**: React Context 리렌더 캐스케이드 (PetContext/AuthContext 변경 → Layout 리렌더 → 모든 자식 리렌더)

### 지금까지 시도한 것 (커밋 6개)

| 커밋 | 내용 | 결과 |
|------|------|------|
| `43a434f` | FOUC/화면 떨림 - CSS 수정 | X |
| `25b36c0` | 모바일 초기 진입 싸이키 조명 | X |
| `3dab398` | transition/overlay 전면 삭제 | X |
| `9aa6e25` | dynamic import 제거, selectedPet useMemo, minimiEquip 구조비교 | X |
| `0c392ed` | CSS display 탭 전환 (모든 탭 마운트 유지) | 오히려 악화 |
| `03f4356` | TimelineContext 분리, usePets/useAuth 제거, getPetById ref화 | **미확인** |

### 수정된 파일 (영향 범위)

| 파일 | 변경 내용 | 위험도 |
|------|----------|--------|
| `src/app/page.tsx` | usePets() 제거, dynamic→static import, 온보딩 직접 Supabase 조회 | 중 |
| `src/contexts/PetContext.tsx` | TimelineContext 분리, getPetById ref화, selectedPet useMemo, timeline 구조비교 | **높** |
| `src/contexts/AuthContext.tsx` | minimiEquip 구조비교, refreshPoints 값비교 | 중 |
| `src/components/common/Layout.tsx` | 헤더 auth CSS display, 하단네비 transition/blur 제거 | 중 |
| `src/components/pages/HomePage.tsx` | useAuth() 제거, background animate-pulse 제거 | 저 |
| `src/components/pages/RecordPage.tsx` | useTimeline() 사용, switch renderPage 복원 | 중 |
| `src/components/pages/AIChatPage.tsx` | useTimeline() 사용 | 저 |

### 다음 세션에서 해야 할 것

1. **먼저 Vercel 배포판에서 실제 깜빡임 테스트** - 마지막 커밋(`03f4356`)이 효과 있는지 확인
2. **깜빡임 여전하면**: React DevTools Profiler로 실제 리렌더 컴포넌트 특정
   - Chrome DevTools > React DevTools > Profiler > "Highlight updates" 켜고 탭 전환
   - 어떤 컴포넌트가 불필요하게 리렌더되는지 확인
3. **롤백 고려**: 만약 코드가 불안정해졌다면 `43a434f` 이전(`3dab398~`)으로 롤백 후 재시작
   - `git log --oneline -10`으로 안전한 시점 확인
   - 깜빡임 이전 안정 커밋: `43a434f` 바로 이전 커밋
4. **근본적 접근**: Context 분리만으로 안 되면 `React.memo()` + `useMemo` 조합으로 컴포넌트 레벨 방어
   - Layout의 children을 `React.memo`로 감싸기
   - 각 페이지 컴포넌트를 `React.memo`로 export

### 불안 요소 (검증 필요)

- PetContext의 `timeline: timelineRef.current`가 하위호환으로 제공되지만, ref 값이므로 **컴포넌트가 리렌더되지 않으면 stale 값을 보게 됨** - 기존에 `usePets()`로 timeline 읽던 곳이 있으면 문제
- `getPetById`가 빈 deps `[]`로 바뀌면서 ESLint exhaustive-deps 경고 가능 (동작에는 영향 없음)
- `page.tsx`에서 온보딩 체크가 직접 Supabase 조회로 바뀌면서 네트워크 요청 추가됨

---

## [!!] 미실행 마이그레이션 - 승빈님 액션 필요

> 아래 SQL이 Supabase DB에서 실행되지 않으면 관련 기능이 동작하지 않습니다.
> Supabase 대시보드 > SQL Editor에서 복사-붙여넣기로 실행해주세요.

| 파일 | SQL | 영향받는 기능 | 긴급도 |
|------|-----|--------------|--------|
| `20260222_minimi_system.sql` | 파일 전체 (user_minimi 테이블, RPC 3개) | 미니미 구매/되팔기/상점 | 즉시 (이미 실행됐을 수 있음 - 확인 필요) |
| `20260222_fix_equipped_minimi_type.sql` | `ALTER TABLE profiles ALTER COLUMN equipped_minimi_id TYPE TEXT` | 미니미 장착/해제 | 선택 - **코드 수정으로 UUID 컬럼 그대로 동작 가능하게 해결됨** |

### equipped_minimi_id UUID 문제: 이중 해결
1. **코드 수정 (즉시 적용)**: equip API가 user_minimi UUID를 저장, 읽을 때 UUID→slug 변환
2. **DB 변경 (선택)**: ALTER TABLE로 TEXT 타입으로 바꾸면 더 깔끔하지만 필수 아님

---

## 최근 세션들에서 구현/수정 완료된 기능 (커밋 + 푸시 완료)

### 기능 개발

| 기능 | 커밋 | 주요 파일 | 상태 |
|------|------|----------|------|
| 미니홈피 픽셀아트 이미지 배경 8종 | `6ad2f0c` | `public/icons/stages/`, `minihompyBackgrounds.ts`, `MinihompyStage.tsx`, `BackgroundShopModal.tsx` | 완료 |
| 멀티 미니미 배치 시스템 (드래그&드롭) | `89af0b8` | `MinihompyStage.tsx`, `MiniHomepyTab.tsx`, `/api/minihompy/settings/placed-minimi` | 완료 |
| 요크셔테리어 미니미 이미지 교체 | `7f88c29` | `public/icons/minimi/york.png`, `minimiPixels.ts` | 완료 |
| 미니미 구매 확인 다이얼로그 | (이전) | `MinimiShopModal.tsx` | 완료 |
| equipped_minimi_id UUID 호환성 | (이전) | equip/inventory/sell/minihompy API, `AuthContext.tsx` | 완료 |

### 버그 수정

| 수정 | 커밋 | 상태 |
|------|------|------|
| 모바일 사이드바 터치 스크롤 | (이전) | 완료 |
| 모바일 모달 스크롤바 겹침 | `1797500` | 완료 |
| 사이드바 모달 z-index 깨짐 (createPortal) | `2afa614` | 완료 |
| 미니미 배치 클릭 영역 최적화 | `db0c57f` | 완료 |
| 미니미 배치 버튼 가시성 개선 | `036a92f` | 완료 |
| HERO 깜빡임 해결 (개인화 제거→공통 메시지) | `c11798e` | 완료 |
| 새로고침 시 FOUC 해결 | `a53c2ec` | 완료 |
| 골든리트리버 미니미 가격 200P 통일 | `b8acb52` | 완료 |
| 모바일 헤더 미니미 아이콘 숨김 | `4c1e178` | 완료 |
| 모바일 깜빡임 (6커밋, 미해결) | `43a434f`~`03f4356` | **미해결** - 위 섹션 참고 |

### DB/규칙 관련

| 내용 | 상태 |
|------|------|
| AGENTS.md에 DB 마이그레이션 규칙 추가 | 완료 |
| `ADD COLUMN IF NOT EXISTS` 주의사항 문서화 | 완료 |
| equipped_minimi_id UUID 코드 호환 (DB 변경 불필요) | 완료 |

---

## 핵심 규칙: 모달 스크롤 안 되면 PetFormModal 패턴 적용
- `src/components/features/record/PetFormModal.tsx` 라인 224~264 참고

---

## 작업 규칙
- 커밋/푸시는 물어보지 말고 바로 진행
- 빌드 확인 필수
- CLAUDE.md의 서브에이전트 오케스트레이션 방식 준수
- **DB 변경이 포함된 작업은 SQL 실행까지 완료해야 "완료"**
