# 릴레이 작업 전달 파일

> 이 파일은 VS Code Claude와 VM 터미널 Claude 간 작업 인수인계용입니다.
> 작업을 넘길 때 이 파일을 업데이트하고, 받는 쪽은 이 파일을 먼저 읽으세요.
> 파일명: RELAY.md (변경 금지)
> 상세 컨벤션/구조는 반드시 CLAUDE.md도 함께 읽을 것.

---

## 프로젝트 기반 정보

### 서비스 소개
- **서비스명**: 메멘토애니 (Memento Ani)
- **사이트**: https://www.mementoani.com/
- **한줄 설명**: 반려동물과 함께하는 모든 순간을 기록하고, 이별 후에도 따뜻한 추억을 간직할 수 있는 메모리얼 커뮤니티 플랫폼
- **디자인 감성**: My Little Puppy 게임 감성 (밝고 따뜻한 파스텔톤)
- **듀얼 모드**: 일상(active) 모드 ↔ 추모(memorial) 모드
  - 일상: 하늘색 테마, 케어 알림, AI 케어 매니저
  - 추모: 황금빛(amber) 테마, 치유 게시판, AI 위로 상담
- **톤앤매너**: 직접적 죽음/천국 언급 대신 "무지개다리" 같은 완곡한 표현 사용

### 개발자 정보
- **이름**: 안승빈
- **상황**: 풀스택 부트캠프 수료 예정 (2026년 3월)
- **목표**: MVP 런칭 후 창업지원금 신청
- **관리자 이메일**: sharkwind1@gmail.com, ahaadh@hanmail.net

### 기술 스택
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- UI: Radix UI + shadcn/ui
- Backend: Supabase (PostgreSQL, Auth, Storage, RLS)
- AI: OpenAI GPT-4o-mini (AI 펫톡)
- 배포: Vercel (GitHub main 푸시 시 자동 배포)

### 수익 모델
| 기능 | 무료 | 프리미엄 (월 7,900원) |
|-----|-----|---------------------|
| AI 펫톡 | 하루 10회 | 무제한 |
| 반려동물 등록 | 1마리 | 무제한 |
| 사진 저장 | 100장 | 무제한 |

포인트 상점에서 포인트로 AI 펫톡 추가 횟수, 프리미엄 체험권 구매 가능.

### 주요 페이지 (8개 탭)
홈, 우리의 기록, 커뮤니티, AI 펫톡, 입양정보, 지역정보, 분실동물, 펫매거진

### 레벨 시스템
- Lv.1~7 포인트 기반 등급, petType(dog/cat/other)별 다른 아이콘
- 관리자 계정은 레벨 대신 선글라스 ADMIN 아이콘 표시
- Lv.5+ 반짝이 뱃지, Lv.7 무지개 글로우

### 미니미 시스템
- 싸이월드 감성 미니홈피 + 비트캅 스타일 픽셀 미니미
- 미니미 상점에서 구매, 옷장에서 악세서리 착용

---

## 마지막 업데이트
- 작성자: VM 터미널 Claude (Opus 4.6)
- 시각: 2026-02-22 새벽
- 최신 커밋: `35f7405` (fix: authFetch 마이그레이션 16곳 + API 에러 메시지 노출 차단 + P0 버그 수정) -- 푸시 완료

## 현재 상태
- main 브랜치, origin/main과 동기화됨, Vercel 자동 배포 트리거됨
- 타입체크 통과 확인 (`npx tsc --noEmit` 에러 0건)

## VM 환경 설정
- **GitHub CLI**: `gh` v2.45.0 설치됨 (`apt`)
- **Git 인증**: `~/.git-credentials`에 PAT 저장 (credential.helper store)
  - 토큰 만료: 2026-05-22 (90일)
  - 권한: `repo`
  - remote URL은 토큰 없는 클린 상태 (`https://github.com/sharkwind1-pixel/memento1.git`)
- **gh auth login은 미완**: `read:org` 스코프 부족으로 실패. git push/pull은 credential store로 정상 작동. gh CLI(PR 생성 등)를 쓰려면 토큰에 `read:org` 권한 추가 필요

## 최근 완료된 작업

### 이전 세션 (2026-02-21 심야, VS Code Claude)
1. 포인트 상점 정리
2. petType별 아이콘 개인화 시스템
3. 어드민 전용 아이콘 시스템
4. 관리자 이메일 추가
5. 관리자 대시보드 유저 목록 개선

### 현재 세션 (2026-02-21 오후, VM 터미널 Claude)

#### 1. AIChatPage 대형 컴포넌트 분리 (860줄 -> 276줄, 68% 감소)
- `useAIChat.ts` (566줄): 커스텀 훅 - 상태 11개, 이펙트 6개, 핸들러 3개 (handleNewChat, handleSend, handleRetry)
- `AIChatLoginPrompt.tsx` (84줄): 비로그인 유도 화면
- `AIChatNoPets.tsx` (39줄): 펫 미등록 유도 화면
- `AIChatHeader.tsx` (186줄): 상단 헤더바 (펫 선택, 새 대화, 더보기 메뉴)

#### 2. LostPage 대형 컴포넌트 분리 (665줄 -> 251줄, 62% 감소)
- `useLostPosts.ts` (175줄): 목록 조회, 필터, 검색 debounce, 페이지네이션 훅
- `useLostPostActions.ts` (253줄): 작성/삭제/해결 액션 훅
- `LostPageHeader.tsx` (214줄): 통계 + 필터 UI 컴포넌트

#### 3. 검증 완료
- 5번(QA): tsc --noEmit PASS, import 무결성 확인
- 7번(비판적 사고): 수정필요 판정 -> 미사용 `selectPet` 파라미터 제거 후 통과
- 7번 발견: LostPage `selectedDistrict` 필터 -> 리팩토링 과정에서 이미 수정됨 확인

#### 4. API URL 마이그레이션 확인
- 조사 결과 이미 전부 완료됨 (하드코딩 `/api/` URL 0건)
- 모든 fetch/authFetch가 `API.XXX` 상수 사용 중

#### 5. 3개 긴급 작업 완료 (커밋 `70e034e`, 푸시 완료)
- **출석 포인트 버그 수정**: 클라이언트 직접 RPC -> authFetch(API.POINTS_DAILY_CHECK) 서버 API 호출로 변경, toast 알림 추가
- **모바일 헤더 배경 삭제**: Layout.tsx에서 bg-[#E0F7FF] 제거
- **미니미 캐릭터 정리**: 6개 캐릭터(고양이3+앵무+도마뱀+햄스터) 삭제, 강아지 3종 + 악세서리 3종만 남김

#### 6. 에러 핸들링 개선 (4건)
- `lost-pets/[id]/route.ts`: fire-and-forget promise 체인 -> async IIFE + try/catch로 안전 처리
- `posts/[id]/comments/route.ts`: 포인트 적립 실패 시 console.error 로깅 추가
- `chat/route.ts`: 포인트 적립 실패 시 console.error 로깅 추가
- `MiniHomepyTab.tsx`: console.error -> toast.error로 사용자 피드백 제공

#### 7. 파일 정리
- 대용량 한국어 이름 원본 PNG 3개 삭제 (17.3MB 절약) - 최적화 영문 PNG만 유지
- .DS_Store 파일 정리

#### 8. [치명적] authFetch 마이그레이션 (커밋 `35f7405`, 푸시 완료)
- **문제**: 인증 필요 API 16곳에서 일반 `fetch` 사용 -> Authorization 헤더 누락 -> 401 에러로 기능 전부 실패
- **수정**: 16곳 모두 `authFetch`로 교체
- 대상: WritePostModal, PostDetailView(좋아요/댓글/삭제), useLostPostActions(작성/삭제/해결), LocalPage(작성/삭제/수정), MinimiClosetModal(인벤/장착/판매), MinimiShopModal(구매), PointsShopModal(구매)

#### 9. API 에러 메시지 노출 차단 (커밋 `35f7405`)
- **문제**: 9개 API 라우트에서 DB `error.message`를 클라이언트에 직접 반환 -> DB 스키마 정보 노출
- **수정**: 일반 한국어 메시지만 반환, 상세 에러는 `console.error` 서버 로그에만 기록
- 대상: daily-check, points/history, admin/points, posts, lost-pets, magazine, local-posts 등

#### 10. P0 버그 수정 (커밋 `35f7405`)
- AuthContext.tsx: SIGNED_IN 핸들러 내 미사용 `userId` 변수 제거
- useLostPostActions.ts: 이미지 업로드 실패 시 `setSubmitting(false); return;` 추가 (사진 없이 게시 방지)

#### 11. 자체 코드 리뷰 토론 (3개 에이전트 병렬)
- 1번(프론트엔드), 2번(백엔드/보안), 7번(비판적 사고) 3개 에이전트 동시 투입
- 발견 이슈 총 45건+ (CRITICAL 6, HIGH 17, MEDIUM 22)
- 이번 세션에서 수정한 것: authFetch 16곳, 에러 노출 21곳, P0 2건, 에러 핸들링 4건

## 주요 파일 변경 이력 (현재 세션)

| 파일 | 변경 내용 |
|------|----------|
| `src/components/pages/AIChatPage.tsx` | 860줄 -> 276줄, 훅/서브컴포넌트 사용으로 리팩토링 |
| `src/components/features/chat/useAIChat.ts` | **신규** - AI 펫톡 비즈니스 로직 커스텀 훅 |
| `src/components/features/chat/AIChatLoginPrompt.tsx` | **신규** - 비로그인 유도 화면 |
| `src/components/features/chat/AIChatNoPets.tsx` | **신규** - 펫 미등록 유도 화면 |
| `src/components/features/chat/AIChatHeader.tsx` | **신규** - 헤더바 컴포넌트 |
| `src/components/pages/LostPage.tsx` | 665줄 -> 251줄, 훅/서브컴포넌트 사용으로 리팩토링 |
| `src/components/features/lost/useLostPosts.ts` | **신규** - 목록/필터/페이지네이션 훅 |
| `src/components/features/lost/useLostPostActions.ts` | **신규** - CRUD 액션 훅 + authFetch + 이미지 실패 return |
| `src/components/features/lost/LostPageHeader.tsx` | **신규** - 통계+필터 헤더 컴포넌트 |
| `src/contexts/AuthContext.tsx` | 출석 체크 API 호출, 미사용 userId 제거 |
| `src/components/common/Layout.tsx` | 모바일 헤더 하늘색 배경 제거 |
| `src/data/minimiPixels.ts` | 6개 캐릭터 삭제 (3종 강아지 + 3종 악세서리만 유지) |
| `src/app/api/lost-pets/[id]/route.ts` | 조회수 에러 핸들링 개선 |
| `src/app/api/posts/[id]/comments/route.ts` | 포인트 에러 로깅 + 에러 메시지 차단 |
| `src/app/api/chat/route.ts` | 포인트 에러 로깅 |
| `src/components/features/minihompy/MiniHomepyTab.tsx` | console.error -> toast.error |
| `src/components/features/community/WritePostModal.tsx` | fetch -> authFetch |
| `src/components/features/community/PostDetailView.tsx` | fetch -> authFetch (좋아요/댓글/삭제) |
| `src/components/pages/LocalPage.tsx` | fetch -> authFetch (작성/삭제/수정) |
| `src/components/features/minimi/MinimiClosetModal.tsx` | fetch -> authFetch (인벤/장착/판매) |
| `src/components/features/minimi/MinimiShopModal.tsx` | fetch -> authFetch (구매) |
| `src/components/features/points/PointsShopModal.tsx` | fetch -> authFetch (구매) |
| `src/app/api/points/daily-check/route.ts` | 에러 메시지 노출 차단 |
| `src/app/api/points/history/route.ts` | 에러 메시지 노출 차단 |
| `src/app/api/admin/points/route.ts` | 에러 메시지 노출 차단 |
| `src/app/api/posts/route.ts` | 에러 메시지 노출 차단 |
| `src/app/api/lost-pets/route.ts` | 에러 메시지 노출 차단 |
| `src/app/api/magazine/route.ts` | 에러 메시지 노출 차단 |
| `src/app/api/magazine/[id]/route.ts` | 에러 메시지 노출 차단 |
| `src/app/api/local-posts/route.ts` | 에러 메시지 노출 차단 |
| `src/app/api/local-posts/[id]/route.ts` | 에러 메시지 노출 차단 |

## 코드 리뷰에서 발견했으나 미수정인 이슈 (다음 세션 참고)

### CRITICAL (외부 리소스/아키텍처 결정 필요)
1. **포인트 구매 트랜잭션 원자성**: shop/backgrounds/minimi 구매 시 포인트 차감+아이템 지급이 별개 쿼리. 실패 시 포인트 영구 소실 가능. DB RPC로 원자적 트랜잭션 필요
2. **getPointsSupabase 키 혼용**: chat에서는 anon key, comments에서는 service role key 사용. 일관성 필요
3. **Rate Limiting 누락**: GET API 11곳+, 출석체크, 포인트 등. 현재 메모리 기반은 Vercel 서버리스에서 비효과적 -> Redis(Upstash) 권장

### HIGH
4. **useAIChat selectedPet 의존성**: 객체 참조가 의존성에 포함돼 불필요한 채팅 초기화 위험
5. **local-posts PATCH/DELETE 이중 검증 누락**: `.eq("user_id", user.id)` 없음 (TOCTOU)
6. **local-posts imageUrl 미검증**: javascript: URL 등 XSS 벡터 가능

### 수정필요 (리팩토링)
7. **타입 12개+ 파일에 흩어짐**: 7개 타입이 types/index.ts와 이름/구조 충돌
8. **미사용 export 타입 13개**: types/index.ts에서 export만 되고 사용 안 됨
9. **REGIONS/timeAgo 중복**: lostTypes.ts vs localTypes.ts 데이터 불일치

## 다음 할 일
- 위 미수정 이슈 중 CRITICAL 우선 처리 (특히 트랜잭션 원자성)
- other 타입 전용 동물 아이콘 제작 (이미지 에셋 필요)
- 결제 연동: 포트원(PortOne) 연동 (승빈님 포트원 계정/상점ID 필요)

## 아키텍처 참고

### 관리자 인증 흐름
```
AuthContext.refreshProfile()
  → supabase.from("profiles").select("is_admin, ...")
  → emailAdmin = ADMIN_EMAILS.includes(email)
  → dbAdmin = data.is_admin === true
  → setIsAdminUser(emailAdmin || dbAdmin)
```

### 레벨 아이콘 표시 흐름
```
LevelBadge(points, petType, isAdmin)
  → isAdmin ? ADMIN_ICONS[petType] : level.icons[petType]
  → showName이면 isAdmin ? "ADMIN" : "Lv.X"
```

## 주의사항
- CLAUDE.md, AGENTS.md의 오케스트레이션 규칙 반드시 따를 것
- types/index.ts에서 타입 관리 (컴포넌트 자체 정의 금지, 단 admin/types.ts는 예외)
- 이모지 사용 금지 (서비스 톤앤매너)
- dynamic import 사용 금지
- 직접적 죽음/사망 표현 금지 ("무지개다리", "이곳" 등 완곡 표현 사용)
- worktree에서 수정 후 메인 폴더에도 반드시 동기화할 것
- 배포는 메인 폴더에서 git push origin main → Vercel 자동 배포
- 이미지 캐시 문제 시 URL에 `?v=N` 쿼리 파라미터 추가
- 권한 받으면 물어보지 말고 실행 (승빈님이 자거나 외출 중이면 끝내놓기)
