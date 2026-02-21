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
- 시각: 2026-02-21 오후 (승빈님 기상 후)
- 최신 커밋: `93f7c62` (아직 미커밋 변경사항 있음 - 컴포넌트 분리 작업)

## 현재 상태
- main 브랜치, Vercel 자동 배포 연결됨
- 타입체크 통과 확인 (`npx tsc --noEmit` 에러 0건)
- 대형 컴포넌트 분리 완료 (미커밋)
- API URL 마이그레이션은 이미 완료된 상태였음 (하드코딩 0건)

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
- 7번 발견 기존 버그: LostPage `selectedDistrict` 필터가 API에 전달 안 됨 (리팩토링 이전부터 존재, 미수정)

#### 4. API URL 마이그레이션 확인
- 조사 결과 이미 전부 완료됨 (하드코딩 `/api/` URL 0건)
- 모든 fetch/authFetch가 `API.XXX` 상수 사용 중

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
| `src/components/features/lost/useLostPostActions.ts` | **신규** - CRUD 액션 훅 |
| `src/components/features/lost/LostPageHeader.tsx` | **신규** - 통계+필터 헤더 컴포넌트 |

## 다음 할 일
- **커밋 필요**: 위 리팩토링 변경사항 아직 미커밋
- `ahaadh@hanmail.net` 계정으로 직접 로그인하여 관리자 아이콘 표시 확인 (승빈님 직접)
- LostPage `selectedDistrict` 필터 API 전달 버그 수정 (프론트+백엔드)
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
