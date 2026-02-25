# 릴레이

## 튜토리얼 - 완료 (데스크톱/모바일 모두 정상 동작 확인)

> **상태**: 완료. 데스크톱/모바일 양쪽 정상 작동.

### 커밋 히스토리
| 커밋 | 내용 |
|------|------|
| `a6b4e53` | TutorialTour v3 재작성 (box-shadow 스포트라이트, StrictMode 안전) |
| `1781f57` | v3: ready 게이트 제거, setInterval 폴링, ref 기반 |
| `3e21287` | 모바일 튜토리얼 → RecordPageTutorial 연결 누락 수정 (user_type DB 조회) |
| `ef060dd` | 종료 확인 다이얼로그 추가 |
| `6f5d685` | 건너뛰기만 확인, 마지막 스텝은 바로 완료 |
| `31169d3` | 확인 다이얼로그 제거 (바로 종료) + 말풍선 중앙 깜빡임 수정 |

### 최종 동작
- 데스크톱(xl+): 사이드바 항목 11스텝 순차 안내
- 모바일(<xl): 하단 네비 5스텝 순차 안내
- 완료 시 RecordPageTutorial로 이어짐 (current/memorial 유저)
- 건너뛰기: 바로 종료 (확인 없음)
- 말풍선: 타겟 측정 전엔 숨김 (중앙 깜빡임 방지)

---

## [!!] 모바일 깜빡임 문제 - 7번째 커밋으로 수정 적용 (`e3aa66f`)

> **상태**: React.memo + Layout 헤더/네비 분리로 근본적 해결 시도. **모바일 테스트 필요.**
> **증상**: 홈에서 처음엔 괜찮음 → 내기록 탭 갔다가 다른 탭으로 이동하면 이미지/버튼/아이콘이 깜빡거림
> **근본 원인 (확정)**: Context 변경 → Layout 리렌더 → children 새 JSX reference → 모든 페이지 리렌더

### 커밋 히스토리

| 커밋 | 내용 | 결과 |
|------|------|------|
| `43a434f` | FOUC/화면 떨림 - CSS 수정 | X |
| `25b36c0` | 모바일 초기 진입 싸이키 조명 | X |
| `3dab398` | transition/overlay 전면 삭제 | X |
| `9aa6e25` | dynamic import 제거, selectedPet useMemo, minimiEquip 구조비교 | X |
| `0c392ed` | CSS display 탭 전환 (모든 탭 마운트 유지) | 오히려 악화 |
| `03f4356` | TimelineContext 분리, usePets/useAuth 제거, getPetById ref화 | 부분 개선 |
| **`e3aa66f`** | **React.memo 10개 페이지 + Layout 헤더/네비 분리** | **모바일 테스트 필요** |

### 최신 수정 (`e3aa66f`) 상세

**1단계: 10개 페이지 컴포넌트에 React.memo 적용**
- HomePage, RecordPage, CommunityPage, AIChatPage, MagazinePage, AdminPage, LostPage, LocalPage, AdoptionPage, RemindersPage
- Layout이 리렌더되어도 props(useCallback된 handleTabChange 등)가 같으면 리렌더 차단

**2단계: Layout 내부 분리**
- `HeaderAuthArea` 컴포넌트: points/minimiEquip/isAdminUser 등 자주 변하는 Auth 값을 직접 구독
- `BottomNav` 컴포넌트: isMemorialMode(selectedPet) 직접 구독
- Layout 본체: `useAuth()`에서 `user, loading, signOut`만 구독 (이전: 9개 값 전부 구독)
- Layout 자체에도 React.memo 적용

### 불안 요소 (검증 필요)

- PetContext의 `timeline: timelineRef.current`가 하위호환으로 제공되지만, ref 값이므로 stale 가능
- HeaderAuthArea에서 로그인/회원가입 모달 열기를 window CustomEvent로 변환 (openAuthModal/openAuthModalSignup)
- Layout이 여전히 `usePets()`를 구독 (배경색/헤더 isMemorialMode) - selectedPet 변경 시 Layout 리렌더는 발생하지만 React.memo된 자식은 보호됨

### 롤백 플랜

깜빡임이 계속되면:
1. `43a434f` 바로 이전 커밋으로 롤백
2. React.memo만 단독 적용 (Context 분리 없이)
3. Context 변경은 나중에 별도로 진행

---

## [!!] 미실행 마이그레이션 - 승빈님 액션 필요

> 아래 SQL이 Supabase DB에서 실행되지 않으면 관련 기능이 동작하지 않습니다.
> Supabase 대시보드 > SQL Editor에서 복사-붙여넣기로 실행해주세요.

| 파일 | SQL | 영향받는 기능 | 긴급도 |
|------|-----|--------------|--------|
| `20260225_push_preferred_hour.sql` | `ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS preferred_hour SMALLINT DEFAULT 9; CREATE INDEX ...` | **푸시 알림 시간 선택** (유저가 원하는 시간에 알림 발송) | **즉시** - 이 컬럼 없으면 시간별 발송 필터링 실패 |
| (파일 없음 - 아래 SQL 직접 실행) | `ALTER TABLE minihompy_settings ADD COLUMN IF NOT EXISTS placed_minimi JSONB DEFAULT '[]'::jsonb;` | **멀티 미니미 배치** (최대 5마리 드래그앤드롭) | **즉시** - 이 컬럼 없으면 배치 저장/로드 실패 |
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
| 사이드바 전체 스크롤 개선 | (이전) | `Sidebar.tsx` | 완료 |
| 미니미 구매 확인 다이얼로그 | (이전) | `MinimiShopModal.tsx` | 완료 |
| equipped_minimi_id UUID 호환성 | (이전) | equip/inventory/sell/minihompy API, `AuthContext.tsx` | 완료 |
| **튜토리얼 전면 수정** | `a6b4e53`~`31169d3` | `TutorialTour.tsx`, `RecordPageTutorial.tsx`, `PointsBadge.tsx`, `Sidebar.tsx`, 각 페이지, `page.tsx` | 완료 |

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
| 모바일 깜빡임 (8커밋) | `43a434f`~`9a33015` | **React.memo + MemorialModeContext 적용** - 모바일 테스트 필요 |
| **데스크톱 튜토리얼 까만 오버레이만 표시** | `a6b4e53`~`31169d3` | 완료 |
| 모바일 튜토리얼 → RecordPageTutorial 미연결 | `3e21287` | 완료 |
| 튜토리얼 말풍선 중앙 깜빡임 | `31169d3` | 완료 |
| 우리의 기록 튜토리얼 2번째 모달 화면 밖 이탈 | `e78022b` | 완료 |

### 모바일 UX/UI 개선 (`3e9aa89`, `d0b69f9`)

| 개선 항목 | 내용 | 커밋 |
|-----------|------|------|
| AI 펫톡 키보드 대응 | visualViewport API로 동적 높이 조정 + 입력창 포커스 시 scrollIntoView | `3e9aa89` |
| 터치 타겟 44x44px | Layout/CommunityPage/HomePage/AIChatHeader 전체 인터렉티브 요소 | `3e9aa89` |
| 버튼 피드백 | active:scale-95 전역 추가 (BottomNav/헤더/커뮤니티/채팅) | `3e9aa89` |
| safe-area 대응 | #main-content에 calc(68px + env(safe-area-inset-bottom) + 16px) | `3e9aa89` |
| 캐러셀 비율 | h-48 고정 → aspect-[4/3] 반응형 | `3e9aa89` |
| 좋아요 애니메이션 | heartPop keyframe (0.4s scale pulse) | `3e9aa89` |
| 모달 반응형 | AuthModal/WritePostModal max-h-[90dvh] + sm 브레이크포인트 확대 | `3e9aa89` |
| 소형 디바이스 헤더 | h-8/sm:h-10/md:h-12 3단계 반응형 | `3e9aa89` |
| 포커스 링 접근성 | focus-visible 전역 적용 (#05B2DC) | `3e9aa89` |
| 스켈레톤 로더 | 추모/커뮤니티/기록 페이지 - 실제 레이아웃 1:1 매칭 | `d0b69f9` |

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

---

## 2026-02-25 세션 2: Phase 2 구현 진행

### 완료 항목

| 항목 | 커밋 | 내용 |
|------|------|------|
| **P2-3** 커뮤니티 무한 스크롤 | `f565f8b` | IntersectionObserver + offset/limit 페이지네이션, 15개씩 로드, 로딩 스켈레톤, 종료 상태 표시 |
| **P2-6** 스켈레톤 통일 | `006f16d` | MagazinePage/AdoptionPage/RemindersPage의 PawLoading → skeleton.tsx 컴포넌트로 교체 |
| **P2-1** 무지개다리 세레모니 5단계 | `d105547` | MemorialSwitchModal 2단계→5단계 확장 (마음의 준비→날짜→슬라이드쇼→작별인사→별이되다), 작별 메시지 timeline 저장 |

### 미완료 Phase 2 항목 (다음 세션)

| 항목 | 내용 | 우선순위 |
|------|------|---------|
| P2-2 | 대화 속 사진 연결 `[PHOTO:id]` | 중 |
| P2-4 | 치유의 여정 대시보드 | 중 |
| P2-5 | 대화→타임라인 자동 생성 | 낮 |
| P2-7 | 미니미 도감 + 터치 이펙트 | 낮 |
