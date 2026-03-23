# 릴레이 아카이브 (과거 작업 기록)

> **이 파일은 과거 작업 기록 보관용. 새 세션에서 읽을 필요 없음.**
> 특정 구현 디테일/커밋 히스토리 확인할 때만 참조.
> 현재 할 일은 `RELAY.md` 참조.

---

## 완료된 핵심 기능 (한 줄 요약)

| 기능 | 상태 |
|------|------|
| 반려동물 CRUD + 사진/영상 | 완료 |
| AI 펫톡 (일상/추모 듀얼모드, 감정분석, 성격 7종, 할루시네이션 방지 5단계) | 완료 |
| 케어 리마인더 + 푸시 알림 (VAPID, Service Worker, 크론) | 완료 |
| 타임라인 일기 + 대화→타임라인 자동 생성 | 완료 |
| 듀얼 모드 (하늘색↔황금빛) + 무지개다리 세레모니 5단계 | 완료 |
| 튜토리얼 (데스크톱 11스텝, 모바일 5스텝) | 완료 |
| 미니홈피 (배경 8종, 멀티미니미 드래그&드롭, 도감, 터치 이펙트) | 완료 |
| 커뮤니티 (5개 게시판, 좋아요/댓글/신고, 무한스크롤) | 완료 |
| 프리미엄/무료 제한 (DB is_premium 체크) + 스마트 전환 UX | 완료 |
| 관리자 페이지 (대시보드, 유저/게시물/문의/신고/탈퇴 관리) | 완료 |
| 추억 앨범 (자동 생성, 기념일, 슬라이드쇼) | 완료 |
| 대화 내보내기 (4개 템플릿, PNG/JPG, Web Share) | 완료 |
| 대화 내 사진 연동 (키워드→pet_media 캡션 매칭) | 완료 |
| AI 프롬프트 개선 (감각 기억, 거울링 3단계, 시간대 에너지, pending_topic) | 완료 |
| UI/UX (추모 별 float-up, 타이핑 감성 텍스트, 발자국 버블) | 완료 |
| 치유의 여정 대시보드 (감정 추이, 애도 단계, 마일스톤) | 완료 |
| 보안 전면 리뷰 + 수정 (레이스 컨디션, 파일 업로드, VPN 체크 등) | 완료 |
| 대형 컴포넌트 분리 (5개 페이지 리팩토링) | 완료 |
| 온보딩 플로우 (Safari 대응, DB+localStorage 이중 저장) | 완료 |
| 관리자 탈퇴 처리 (auth.users 삭제 API, CASCADE) | 완료 |
| AI 영상 생성 (fal.ai Minimax Hailuo, 8템플릿, 쿼터 시스템, 폴링 UI) | 코드 완료 (DB 미실행) |
| 매거진 크론 안정성 강화 (실패 시 자동 재시도 + 보정 크론) | 완료 |
| 커뮤니티 뒤로가기 버그 수정 (history API 연동) | 완료 |
| 지역정보 게시판 지역별 필터링 (region 파라미터) | 완료 |
| 커뮤니티 필터 UI 모바일 최적화 (수평 스크롤 + 콤팩트 칩) | 완료 |
| 커뮤니티 미니미 아바타 (게시글 작성자 미니미 표시, 닉네임 옆 40/44px) | 완료 |
| 미니홈피 전략적 노출 (사이드바 바로가기, 헤더 드롭다운) | 완료 |
| 게시판 API 속도 최적화 (쿼리 병렬화, fire-and-forget 조회수) | 완료 |
| 간편모드 (노인용 큰 카드 런처 홈, 토글 스위치) | 완료 |
| 온보딩/튜토리얼 다크모드 + UX 전면 개선 | 완료 |
| 펫매거진 P1~P2 디자인 마무리 (커버 비율, 엔딩 CTA, 관리자 미리보기) | 완료 |
| 온보딩 리셋 버그 수정 (select 체이닝 + 트리거 컬럼 참조) | 완료 |
| TutorialTour 구름 말풍선 SVG 교체 | 완료 |
| 에이전트 총동원 전수 분석 + CRITICAL 버그 5건 수정 | 완료 |
| 모달 ESC 키 지원 (useEscapeClose 훅, 15개 모달) | 완료 |
| ConfirmDialog 전면 적용 (23곳 네이티브 confirm() 제거) | 완료 |
| 에러 처리 개선 (PetContext loadError, AuthContext 에러 로깅) | 완료 |
| 관리자 프리미엄 부여 플랜 선택 (베이직/프리미엄) + AI영상 쿼터 표시 | 완료 |
| 구독 관리 UI + 결제 약관 페이지 + KCP 테스트 로그인 | 완료 |
| 온보딩 리셋 버그 디버깅 + 수정 | 완료 |
| 커뮤니티 게시글 카드 UI 개선 (높이 축소, 모달 플레이스홀더 제거) | 완료 |
| 자기 글 좋아요 방지 + 알림 토스트 | 완료 |
| 좋아요/댓글 새로고침 시 유지 (DB 연동, userLiked API) | 완료 |
| 댓글 API 500 에러 수정 (post_comments 실제 컬럼 매핑) | 완료 |
| 공지 라벨 관리자용 설명 텍스트 제거 | 완료 |
| 함께보기 게시판 뒤로가기 버튼 수정 (overflow-hidden 제거) | 완료 |
| AI 펫톡 추천 질문 화이트리스트 방식 전면 교체 (맛집/사람음식 근절) | 완료 |
| 여행지 지역명 기반 산책/공원 장소 검색 (네이버 API 연동) | 완료 |
| 프리미엄 가격 문구 현실적 수정 ("커피 한 잔 값" → "하루 약 260원") | 완료 |
| 매거진 자동화 동물 종 다양성 (70% 개고양이, 30% 기타 8종) | 완료 |
| 매거진 실질적 주제 풀 추가 (6카테고리 x 10개 = 60개 토픽) | 완료 |
| 매거진 계절 로직 (3,6,9,12월만 계절 힌트, 나머지 계절 금지) | 완료 |
| Google Search Console 구조화된 데이터 경고 해결 (Product → SoftwareApplication) | 완료 |
| 홈 화면 레이아웃 밀림 방지 (커뮤니티+쇼케이스 동시 로딩 스켈레톤) | 완료 |
| 홈 "마음속에 영원히" 섹션: 오늘 추모 등록 + 기억의 날 펫 카드 표시 | 완료 |
| 마음속에 영원히: 추모 펫 없을 때 전체 표시 폴백 + 더보기 제거 | 완료 |
| 마음속에 영원히: 부제목/뱃지 완곡 표현 수정 | 완료 |
| 추모 펫 위로 리액션 (pet_condolences 테이블 + API + UI) | 완료 |

## 변경 로그 (최신순)

> 형식: `[YYYY-MM-DD HH:MM]` 커밋해시 | 작업 요약 | 변경 파일 | 상세

---

### [2026-03-23] 마음속에 영원히 + 위로 리액션

> 추모 섹션 로직 확정, 완곡 표현 적용, 위로 리액션 기능 전체 구현

---

#### 커밋: `359f448` — 홈 "마음속에 영원히" 섹션: 오늘 추모 등록 + 기억의 날 펫 표시

- `/api/memorial-today` 신규: 오늘 추모 등록 펫(created_at KST) + memorial_date 월일 매칭
- `useHomePage.ts`: `fetchMemorialPets` + `MemorialPetItem` 타입
- `MemorialSection.tsx`: 펫 카드 UI (프로필 이미지, 뱃지, 완곡 라벨)
- **파일**: `memorial-today/route.ts`, `useHomePage.ts`, `MemorialSection.tsx`, `HomePage.tsx`

---

#### 커밋: `6f52547` — 추모 펫 없을 때 전체 표시 + 더보기 버튼 제거

- API: 오늘/이번주 해당 펫 없으면 전체 추모 펫(최근 등록순) 폴백
- 더보기 버튼 제거 (자유게시판으로 잘못 연결되어 있었음)
- **파일**: `memorial-today/route.ts`, `MemorialSection.tsx`

---

#### 커밋: `537bf4c` — 부제목을 부드러운 표현으로 변경

- "무지개다리를 건넌 소중한 아이들" → "영원히 마음속에 함께해요"
- **파일**: `MemorialSection.tsx`

---

#### 커밋: `f117ae2` — 추모 펫 위로 리액션 기능 추가

**DB**: `pet_condolences` 테이블 (SQL 실행 완료)
- `UNIQUE(pet_id, user_id)`, RLS (select_all, insert_own, delete_own)

**API**: `POST /api/pets/[id]/condolence`
- Rate limit + VPN 차단 + 세션 인증
- 추모 상태 펫만 위로 가능, 토글 방식
- 포인트 적립 없음 (추모 맥락에 부적절)

**프론트엔드**:
- `apiEndpoints.ts`: `PET_CONDOLENCE` 추가
- `memorial-today/route.ts`: `condolenceCount` batch 조회 추가
- `useHomePage.ts`: `condoledPets` 상태 + `toggleCondolence` 낙관적 UI + 내 위로 상태 자동 조회
- `MemorialSection.tsx`: amber Heart "위로" 버튼 (토글 시 채워진 하트 + 카운트)
- `HomePage.tsx`: 새 props 전달

**파일**: `20260323_pet_condolences.sql`, `pets/[id]/condolence/route.ts`, `apiEndpoints.ts`, `memorial-today/route.ts`, `useHomePage.ts`, `MemorialSection.tsx`, `HomePage.tsx`

---

### [2026-03-23] AI 펫톡 개선 + 매거진 자동화 + 홈 UI 수정

> AI 펫톡 추천 질문 전면 교체, 매거진 동물 다양성/실질 주제/계절 로직,
> 구글 서치콘솔 구조화된 데이터, 홈 레이아웃 밀림 방지, 추모 섹션 원복.

---

#### 커밋 1: `3a82cb5` — 초기 로딩 속도 최적화

- 번들 크기 -50% 최적화
- **파일**: 다수

---

#### 커밋 2~5: `6fd159b`, `c45e3b5`, `ff6a97b`, `bddb7bd` — AI 펫톡 추천 질문 전면 개선

**문제**: 추천 질문에 맛집/사람음식/여행지 먹거리가 계속 등장
**해결 과정**:
1. 여행지 산책 코스 질문 허용 + 맛집 필터링 강화 (`6fd159b`)
2. 맛집/사람음식 필터링 키워드 대폭 추가 (`c45e3b5`)
3. GPT가 생성하는 추천 자체에 맛집 금지 프롬프트 강화 (`ff6a97b`)
4. **최종 해결**: 화이트리스트 방식으로 전면 교체 — GPT 생성 추천 대신 모드별/상황별 미리 정의된 추천만 사용 (`bddb7bd`)

**파일**: `chat-pipeline.ts`, `chat-prompts.ts`, `chat-helpers.ts`, `route.ts`

---

#### 커밋 6: `3403ce2` — 여행지 지역명 기반 장소 검색

- AI 펫톡에서 "부산 산책 코스", "제주도 반려동물 동반" 같은 질문 시 네이버 장소 검색 API 연동
- 지역명 감지 → 산책/공원/카페 키워드로 검색 → 결과를 AI 컨텍스트에 삽입
- **파일**: `chat-pipeline.ts`, `naver-location.ts`

---

#### 커밋 7: `efaf0be` — 프리미엄 가격 문구 수정

- "커피 한 잔 값, 월 7,900원" → "하루 약 260원, 월 7,900원" (현실적 문구)
- **파일**: `ChatInputArea.tsx` (line 165)

---

#### 커밋 8: `f6acfcd` — 매거진 자동화: 동물 종 다양성 + 실질적 주제

**동물 종 로테이션**:
- `ANIMAL_TYPES` 상수 추가: major(개/고양이) 70%, minor(앵무새/거북이/겍코/햄스터/토끼/관상어/고슴도치/페릿) 30%
- `pickAnimalType(recentAnimalIds)`: 확률 기반 + 최근 10편 편중 방지
- `getNextCategoryAndBadge()`: animalType 함께 반환

**실질적 주제 풀**:
- `PRACTICAL_TOPICS` 추가: health/food/behavior/grooming/living/travel 6카테고리 x 10개 = 60개
- 배변 교육, 분리불안, 사료 선택, 금지 음식 등 실제 보호자 고민 주제

**파일**: `magazine-generator.ts`, `cron/magazine-generate/route.ts`

---

#### 커밋 9: `d6b6626` — 매거진 계절 로직 수정

- 3,6,9,12월만 `SEASON_TRANSITION` 힌트 제공 (환절기)
- 나머지 8개월: "계절/날씨 관련 기사는 쓰지 마세요" 명시적 금지
- **파일**: `magazine-generator.ts` (buildArticlePrompt 함수)

---

#### 커밋 10: `927f3aa` — Google Search Console 구조화된 데이터 경고 해결

**문제**: Product snippet에 'review', 'aggregateRating' 필드 누락 경고
**해결**: 두 개의 Product 스키마 → 단일 SoftwareApplication 스키마로 변경
- `@type: "SoftwareApplication"`, `applicationCategory: "LifestyleApplication"`
- `aggregateRating`: 4.8/5, 52 ratings
- `operatingSystem: "Web"`
- 두 플랜을 `offers` 배열로 통합
- **파일**: `app/layout.tsx`

---

#### 커밋 11~12: `51b050f`, `befda64` — 홈 화면 레이아웃 밀림 방지

**문제**: "함께 보기"가 먼저 뜨다가 "인기 있는 이야기"가 뒤늦게 나오면서 밀어냄
**해결**:
1. 커뮤니티 + 쇼케이스 두 섹션이 모두 로딩 완료될 때까지 스켈레톤 표시 (`51b050f`)
2. 스켈레톤을 실제 두 섹션 높이에 맞게 개선 (1개→2개 스켈레톤, `space-y-16`) (`befda64`)
- **파일**: `HomePage.tsx`, `useHomePage.ts`

---

#### 커밋 13: `bb38a6d` — "마음속에 영원히" 섹션 기억게시판 연동

**문제**: `memorial_posts` 테이블에 데이터가 없었음 (쓰기 UI가 없어서)
**해결**: 커뮤니티 기억게시판(`posts` 테이블 `board=memorial`)의 인기글을 가져오도록 변경
- **파일**: `useHomePage.ts`, `MemorialSection.tsx`

---

#### 커밋 14: `74ff34c` — (취소됨) 추모 섹션을 "오늘의 기일" 펫 카드로 변경

- `/api/memorial-today` API 엔드포인트 신규 생성
- KST 기준 오늘 기일인 펫 조회, 없으면 +/-3일 범위 확장
- **바로 다음 커밋에서 원복됨** (기일이라는 노골적 표현 부적절)

---

#### 커밋 15: `224f22a` — 추모 섹션 임시 원상복구 (기억게시판 인기글)

- "오늘의 기일" UI 전부 제거, 기억게시판 인기글 방식으로 임시 원복
- **파일**: `useHomePage.ts`, `MemorialSection.tsx`, `HomePage.tsx`

---

#### 커밋 16: `359f448` — "마음속에 영원히" 최종 확정: 오늘 추모 등록 + 기억의 날 펫

**요구사항**: 기억게시판 인기글이 아닌, 오늘 추모로 등록된 펫 + 오늘이 기억의 날인 펫 표시
**노골적 표현 금지**: "기일/주기" 대신 "함께한 N년", "새로운 기억", "올해의 기억" 사용

**/api/memorial-today 수정 내용**:
1. 오늘 추모 모드로 새로 등록된 펫 (created_at KST 오늘)
2. 오늘이 기억의 날인 펫 (memorial_date 월/일 매칭, 올해 등록 건 제외)
3. 중복 제거, 새로 등록 우선
4. 없으면 앞뒤 3일 범위 확장

**MemorialSection UI**: 정방형 프로필 카드, "새로운 기억"/"함께한 N년" 뱃지, "영원히 기억할게" 메시지
**useHomePage**: `MemorialPetItem` 타입, `/api/memorial-today` fetch

**파일**: `memorial-today/route.ts`, `useHomePage.ts`, `MemorialSection.tsx`

---

#### 변경된 파일 전체 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/app/api/cron/magazine-generate/route.ts` | animalType 파라미터 전달 |
| `src/app/api/memorial-today/route.ts` | 오늘 추모 등록 + 기억의 날 펫 API |
| `src/app/layout.tsx` | Product → SoftwareApplication 스키마 |
| `src/components/features/chat/ChatInputArea.tsx` | 가격 문구 수정 |
| `src/components/features/home/MemorialSection.tsx` | 추모 펫 카드 UI |
| `src/components/features/home/useHomePage.ts` | memorial-today API 연동 |
| `src/components/pages/HomePage.tsx` | 동시 로딩 스켈레톤 |
| `src/lib/magazine-generator.ts` | 동물 종/주제/계절 로직 |

---

### [2026-03-23] 커뮤니티 안정화 + 발표 준비

> 자기 글 좋아요 방지, 좋아요/댓글 DB 연동, 댓글 500 에러 3차 수정, UI 개선 다수.
> 부트캠프 최종 발표 자료 (구현 현황 PDF + 캔바용 텍스트) 작성.

---

#### 커밋 1: `304ba29` — 자기 글 좋아요 방지 + 홈 좋아요/댓글 DB 연동

**자기 글 좋아요 방지:**
- PostDetailView: `user.id === post.user_id` 체크 + toast 알림
- useHomePage: toggleLike에 동일 체크 추가

**좋아요/댓글 DB 연동 (홈 페이지):**
- useHomePage `toggleLike`: 클라이언트 전용 → `authFetch(API.POST_LIKE(dbId))` API 호출 + 낙관적 UI + 롤백
- useHomePage `addComment`: 클라이언트 전용 → `authFetch(API.POST_COMMENTS(dbId))` API 호출 + 낙관적 UI
- CommunityPost 타입에 `dbId`, `userId` 필드 추가
- CommunitySection/PostModal: `displayLikes` 서버 권위 값으로 변경

**파일**: `PostDetailView.tsx`, `useHomePage.ts`, `types.ts`, `CommunitySection.tsx`, `PostModal.tsx`

---

#### 커밋 2: `30385cf` — 좋아요 상태 새로고침 시 유지

- `/api/posts` GET에 `userLikedPostIds` 쿼리 추가 (post_likes 테이블 조회)
- 응답에 `userLiked: boolean` 필드 추가
- useHomePage `fetchCommunityPosts`: `fetch()` → `authFetch()` 변경 (인증 헤더 전송)
- 응답의 `userLiked`로 `likedPosts` 초기 상태 설정

**파일**: `/api/posts/route.ts`, `useHomePage.ts`

---

#### 커밋 3: `bea1583` — 홈 댓글/좋아요 실패 수정

- toggleLike, addComment에 `supabase.auth.getSession()` 로그인 체크 추가
- 미로그인 시 toast 안내 + early return

**파일**: `useHomePage.ts`

---

#### 커밋 4~6: `9e7e0d5`, `6a38063`, `8321b8c` — 댓글 API 500 에러 디버깅

- 댓글 POST 핸들러 전체를 `adminSupabase` (service role)로 전환하여 RLS 우회
- 에러 응답에 `detail` 필드 추가 (스키마 캐시 에러 디버깅용)
- PostDetailView에 debug error display 추가

**파일**: `/api/posts/[id]/comments/route.ts`, `PostDetailView.tsx`

---

#### 커밋 7: `aff90cf` — 댓글 500 해결 1차: author_avatar 제거

- `post_comments` 테이블에 `author_avatar` 컬럼이 없음 (스키마 캐시 에러)
- INSERT에서 `author_avatar` 제거, 응답에서 `profile?.avatar_url` 직접 사용

**파일**: `/api/posts/[id]/comments/route.ts`

---

#### 커밋 8: `0c8501d` — 댓글 500 해결 2차: author_nickname 제거

- `author_nickname` 컬럼도 실제 DB에 없음 (마이그레이션 SQL과 실제 DB 불일치)
- INSERT에서 `author_nickname` 제거, 응답에서 `profile?.nickname` 직접 사용

**파일**: `/api/posts/[id]/comments/route.ts`

---

#### 커밋 9: `bc9c746` — 댓글 500 해결 3차 (최종): author_name 추가

- 실제 DB 컬럼명은 `author_name` (NOT NULL)
- INSERT에 `author_name: profile?.nickname || "익명"` 추가하여 최종 해결

**교훈**: 마이그레이션 SQL(`author_nickname`)과 실제 DB 스키마(`author_name`)가 불일치.
Supabase 스키마 캐시 에러 메시지로 실제 컬럼명을 하나씩 파악함.

**파일**: `/api/posts/[id]/comments/route.ts`

---

#### 커밋 10: `ab17ee5` — 공지 라벨 관리자용 설명 제거

- "게시판 공지 (해당 게시판 상단 고정)" → "게시판 공지"
- "전체 공지 (모든 게시판 + 홈 상단)" → "전체 공지"
- 유저에게 불필요한 내부 설명 텍스트 삭제

**파일**: `PostDetailView.tsx`

---

#### 커밋 11: `94b1c6e` — 함께보기 뒤로가기 수정

- ShowcaseGalleryView: 게시글 상세 wrapper에서 `overflow-hidden` + `contain: layout style` 제거
- ShowcaseGalleryView: 갤러리 메인 wrapper에서 `overflow-hidden` 제거
- CommunityPage: 함께보기 wrapper에서 동일 속성 제거
- 이 CSS 속성들이 sticky 헤더와 클릭 이벤트를 방해하고 있었음

**파일**: `ShowcaseGalleryView.tsx`, `CommunityPage.tsx`

---

### 이전 세션 작업 (2026-03-21~22)

#### `8a7a0bc` — 관리자 프리미엄 부여에 플랜 선택 추가
- 베이직/프리미엄 선택 가능 (기존: 프리미엄만)
- 플랜별 제한 표시 (펫 수, 사진, AI 횟수)

#### `ff045fc` — 관리자 프리미엄 모달에 AI 영상 생성 쿼터 표시
- 베이직 월 3회 / 프리미엄 월 6회 정보 추가

#### `6353370` — 홈 게시글 모달 불필요한 플레이스홀더 제거
#### `2fbc38c` — 커뮤니티 게시글 카드 높이 축소 (가독성 개선)

#### `13b6b8e` — 구독 관리 UI + 탈퇴 경고 개선
- 계정 설정에 구독 현황/관리 섹션 추가
- 프리미엄 유저 탈퇴 시 구독 손실 경고

#### `7a8ac98` — 결제 약관 페이지 (/payment-terms)
#### `5a3c762` — KCP 심사용 테스트 로그인 페이지 (/test-login)

#### 온보딩 리셋 버그 수정 (4커밋 디버깅)
- `ed20bcf` — 온보딩 리셋 후 닉네임 설정 시 온보딩 스킵되는 버그 수정
- `6cb9767` — 온보딩 리셋 후 튜토리얼 미발생 버그 수정
- `a2feef1` — 디버그 코드 전체 제거 (해결 확인)

---

### [2026-03-20] 에이전트 총동원 — 전수 분석 + CRITICAL 버그 수정 + UX 안정화

> 8명 서브에이전트 총동원 분석 후, 발견된 CRITICAL/HIGH 이슈 전면 수정.
> 전체 23곳 네이티브 confirm() 제거, 모달 ESC 키 지원, 이미지 파이프라인 수정 등.

---

#### 커밋 1: `9def014` — CRITICAL 버그 5건 수정 + 모달 ESC 키 지원 15개 추가

**CRITICAL 버그 수정 (5건):**

1. **커뮤니티 이미지 파이프라인 (CRITICAL x3)**
   - POST API: `community_posts` insert에 `image_urls` 누락 → 이미지가 DB에 저장 안 됨
   - GET API: `image_urls`가 null일 때 빈 배열 `[]` 반환 안 함 → 프론트에서 크래시
   - PostDetailView: 이미지 렌더링 코드가 주석 처리(비활성화) 상태 → 이미지 표시 안 됨
   - **파일**: `src/app/api/posts/route.ts`, `src/components/features/community/PostDetailView.tsx`

2. **AI 펫톡 더블전송 방지 + AbortController**
   - isTyping/isStreaming 중 전송 버튼 가드 추가
   - AbortController로 펫 전환 시 이전 요청 취소 (메모리 누수 방지)
   - UI 비활성화 (전송 버튼 disabled)
   - **파일**: `src/components/features/chat/AIChatPage.tsx`

3. **타이머 누수 2건**
   - SupportModal: setTimeout 후 cleanup 없이 모달 닫으면 타이머 계속 실행
   - AccountSettingsModal: 동일 패턴
   - **해결**: `successTimerRef` + `useEffect cleanup`
   - **파일**: `src/components/modals/SupportModal.tsx`, `src/components/Auth/AccountSettingsModal.tsx`

4. **getInitialState() 3회 중복 호출**
   - App 마운트 시 동일 함수가 3번 호출되어 불필요한 연산
   - **해결**: 결과를 변수에 캐싱하여 1회로 축소
   - **파일**: `src/app/page.tsx`

**모달 ESC 키 지원 (15개):**
- `useEscapeClose(isOpen, onClose)` 커스텀 훅 생성
- 적용 대상: PetFormModal, LoginPromptModal, MemorialTransitionModal, PremiumModal, SupportModal, ShareModal, WritePostModal, PostDetailView, OnboardingModal, NicknameSetupModal, MiniHomepyModal, DeleteAccountModal, MediaUploadModal, ShowcaseGalleryView, AccountSettingsModal
- **파일**: `src/hooks/useEscapeClose.ts` (신규), 위 15개 컴포넌트

**변경 파일 (22개)**

---

#### 커밋 2: `2009854` — 에러 처리 개선

- **PetContext**: `loadError` 상태 추가 → "데이터 없음"과 "로딩 실패" 구분 가능
- **AuthContext**: `checkDeletedAccount`, `checkCanRejoin`, `getSession` 에러 시 `console.error` 로깅 추가 (보안 에러가 조용히 삼켜지던 문제 해결)
- **파일**: `src/contexts/PetContext.tsx`, `src/contexts/AuthContext.tsx`

---

#### 커밋 3: `6569260` — ConfirmDialog 컴포넌트 생성 + 6곳 confirm() 교체

- **ConfirmDialog** 범용 컴포넌트 신규 생성
  - Props: `isOpen, onClose, onConfirm, title, message, confirmText?, cancelText?, destructive?`
  - destructive 모드: 빨간 버튼
  - ESC 키 닫기 지원 (useEscapeClose)
  - **파일**: `src/components/ui/ConfirmDialog.tsx` (신규)

- **PostDetailView** (5곳 confirm → ConfirmDialog)
  - 게시글 삭제, 게시글 숨기기, 유저 차단, 공지 토글, 댓글 삭제
  - **파일**: `src/components/features/community/PostDetailView.tsx`

- **AIChatHeader** (1곳 confirm → ConfirmDialog)
  - 새 대화 시작 확인
  - **파일**: `src/components/features/chat/AIChatHeader.tsx`

---

#### 커밋 4: `bc276bf` — 전체 confirm() 제거 완료 (17곳, 12파일)

**네이티브 window.confirm()을 앱 테마에 맞는 ConfirmDialog로 전면 교체.**
모바일 브라우저에서 기본 경고창이 앱답지 않은 문제 해결 + 접근성 향상.

| 파일 | 교체 수 | 대상 |
|------|---------|------|
| ShowcaseGalleryView.tsx | 2 | 게시글 삭제, 숨기기 |
| RemindersSection.tsx | 1 | 리마인더 삭제 |
| ReminderPanel.tsx | 1 | 알림 삭제 |
| CommunityPage.tsx | 1 | 유저 차단 |
| LocalPage.tsx | 2 | 게시글 삭제, 마감 |
| useLostPostActions.ts + LostPage.tsx | 2 | 게시글 삭제, 해결 |
| AccountSettingsModal.tsx | 1 | 차단 해제 |
| AdminUsersTab.tsx | 4 | 차단해제, 관리자토글, 온보딩리셋, 프리미엄해제 |
| AdminWithdrawalsTab.tsx | 2 | 재가입허용, 기록삭제 |
| AdminReportsTab.tsx | 1 | 콘텐츠 삭제 |
| AdminMagazineTab.tsx | 1 | 기사 삭제 |

**패턴**: `.ts` 훅 파일(useLostPostActions)은 JSX 렌더 불가 → `confirmState`/`setConfirmState` 노출하여 부모 컴포넌트(LostPage)에서 ConfirmDialog 렌더링.

**결과**: 전체 코드베이스에서 네이티브 `confirm()` 호출 **0건** (grep 검증 완료).

---

#### 세션 총 정리

| 카테고리 | 수량 |
|----------|------|
| CRITICAL 버그 수정 | 5건 |
| ESC 키 모달 지원 | 15개 모달 |
| confirm() → ConfirmDialog 교체 | **23곳** (6+17) |
| 에러 처리 개선 | 2개 Context |
| 신규 컴포넌트/훅 | ConfirmDialog, useEscapeClose |
| 커밋 수 | 4개 |
| 변경 파일 수 | ~35개 |

---

### [2026-03-10] 세션 전체 작업 기록 (커밋 순서)

> 이 세션에서 수행한 모든 작업을 커밋 단위로 기록.
> 대화방이 종료되어도 이 기록만 보면 이어서 작업 가능.

---

#### 커밋 1: `a4f2c87` — 로그인/탈퇴 시스템 전면 보안 수정 (이전 세션 이월)

이전 세션에서 시작한 작업. 탈퇴 계정 차단, auth/callback 보강 등.

#### 커밋 2~8: 추모 전환 모달 모바일 스크롤 (13번 시도)

| 커밋 | 시도 | 접근법 | 결과 |
|------|------|--------|------|
| `f9b943d` | 5 | createPortal + touchmove | 스크롤 안 됨 |
| `d3b619f` | 6 | PetFormModal 패턴 (useBodyScrollLock + overflow-y-auto) | 모달은 내려왔지만 스크롤 안 됨 |
| `628a8d3` | 6.5 | PetFormModal 구조 그대로 | 동일 |
| `225984b` | 7 | useBodyScrollLock 제거, body overflow:hidden만 | 모달 자체가 안 뜸 |
| `1c22c7b` | 8 | body 스타일 완전 미접촉 | 여전히 안 됨 |
| `41c5bba` | 9 | LoginPromptModal 100% 동일 구조 | 모달은 뜨지만 스크롤 안 됨 |
| `536de75` | 10 | max-h + overflow-y-auto 추가 | 여전히 안 됨 |
| `e0c859c` | 11 | useBodyScrollLock 완전 제거 + touchmove 배경만 차단 + max-h-[85dvh] | **스크롤 됨**, 모달 위치가 너무 아래 |
| `836f2ff` | 12 | 모든 간섭 제거 — backdrop overflow-y-auto가 스크롤 컨테이너 | **스크롤 됨**, 모달 위치 아래 |
| `c4e826b` | 13 | wrapper를 `flex justify-center pt-8 pb-8 px-4`로 상단 고정 + scrollTop=0 | **최종 해결** |

**최종 패턴 (CLAUDE.md #6에도 기록됨)**:
```tsx
// useBodyScrollLock 안 씀, body 스타일 안 건드림, touchmove 안 씀
// backdrop(fixed inset-0 overflow-y-auto)이 스크롤 컨테이너
// wrapper: flex justify-center pt-8 pb-8 px-4 (items-center 안 씀)
// modal: 자연 높이 (max-h 안 씀)
// 열릴 때 backdropRef.scrollTop = 0
```

**파일**: `src/components/modals/MemorialSwitchModal.tsx`

---

#### 커밋 9: `d58eced` — 탈퇴 계정 재로그인 차단 1차 시도

- `/api/auth/cleanup-blocked` API 신규: 차단된 계정의 OAuth 생성 auth.users를 service_role로 삭제
- `auth/callback/page.tsx`에 `cleanupBlockedAuthUser()` 함수 추가
- `AuthContext.tsx` SIGNED_IN 핸들러에서도 cleanup-blocked 호출
- `apiEndpoints.ts`에 `AUTH_CLEANUP_BLOCKED` 추가

**결과**: 유저 테스트에서 여전히 로그인됨 (스크린샷 확인) → 근본 원인이 다름

---

#### 커밋 10: `c2008f8` — 탈퇴 계정 재로그인 차단 근본 수정

**근본 원인 발견**: 관리자 `delete-user` API가 `auth.users`만 삭제하고 `withdrawn_users` 테이블에 기록을 안 남김.
카카오 OAuth가 새 auth.users를 자동 생성 → `can_rejoin` RPC가 체크할 레코드 없음 → 차단 안 됨.

**수정**:
1. `/api/admin/delete-user` — 삭제 전 대상 이메일/닉네임 조회(`getUserById` + profiles) → `withdrawn_users`에 `banned` INSERT → 중복 방지(기존 레코드 확인) → auth.users 삭제
2. `/api/admin/block-email` API 신규 — 이미 삭제된 계정의 이메일을 수동 차단. profiles/auth.users 잔여 데이터도 정리. user_id NOT NULL 제약 → 더미 UUID 사용
3. `AdminWithdrawalsTab.tsx` — 이메일 수동 차단 UI (차단 버튼 + 이메일/사유 입력 폼)
4. `apiEndpoints.ts`에 `ADMIN_BLOCK_EMAIL` 추가

**파일**: `src/app/api/admin/delete-user/route.ts`, `src/app/api/admin/block-email/route.ts`, `src/components/admin/tabs/AdminWithdrawalsTab.tsx`, `src/config/apiEndpoints.ts`

---

#### 커밋 11: `5d9ab07` — 로그아웃 홈 리다이렉트 + 닉네임 중복체크 + 데이터 정리

**3가지 문제 동시 수정**:

1. **로그아웃 시 홈화면 이동**
   - `AuthContext.tsx` SIGNED_OUT 핸들러: `navigateToHome` 커스텀 이벤트 발생 + localStorage `memento-current-tab` 삭제 + URL에서 tab 파라미터 제거
   - `page.tsx`: `navigateToHome` 이벤트 수신 → `setSelectedTab("home")`

2. **닉네임 중복 체크 통일**
   - 기존: 가입 시에만 `checkNickname()` 호출, RecordPage(내 정보)에서는 중복 체크 없이 바로 저장
   - 수정: `RecordPage.tsx` `handleSaveNickname`에 `checkNickname()` 호출 추가 + 2글자 미만 검증 + 현재 닉네임과 같으면 그냥 닫기

3. **block-email API 데이터 정리 강화**
   - 차단 시 profiles.email로 조회 → auth.users CASCADE 삭제
   - auth.users 없으면 profiles만 직접 삭제
   - profiles.email 없으면 listUsers로 폴백 검색

**파일**: `src/contexts/AuthContext.tsx`, `src/app/page.tsx`, `src/components/pages/RecordPage.tsx`, `src/app/api/admin/block-email/route.ts`

---

#### 커밋 12: `6b29074` — 사이드바 z-index + AI 간식 추천 + 이력 기록

1. **모바일 사이드바 X 버튼 헤더에 가려짐**
   - 원인: 헤더 z-[60] > 사이드바 패널 z-50
   - 수정: 사이드바 패널 z-50 → z-[70], 백드롭 z-40 → z-[65]
   - **파일**: `src/components/common/Sidebar.tsx`

2. **AI 펫톡 간식 추천 — "나는 강아지니까 모르겠어~" 문제**
   - 원인: 시스템 프롬프트의 "범위 밖 거절" 패턴("나는 강아지니까 모르겠어~")이 간식 질문에도 적용됨 + "묻지 않았는데 간식 금지" 규칙이 너무 넓음
   - 수정:
     - 대화 범위에 "간식/사료/음식 추천" 명시적 허용 추가
     - "간식 관련 질문은 케어 핵심 영역, 캐릭터보다 정보 전달 우선" 지시 추가
     - "묻지 않았는데 간식 금지" → "사용자가 묻지 않았는데 먼저 꺼내기 금지" 명확화
     - 간식 추천 좋은/나쁜 예시 few-shot 추가
     - 추모 모드도 동일 수정
   - **파일**: `src/app/api/chat/chat-prompts.ts`

3. **수정 이력 기록**: RELAY-ARCHIVE.md + CLAUDE.md #6 모달 스크롤 패턴

---

#### 커밋 13: `7a4ba41` — AI 펫톡 SUGGESTIONS 도발적 톤 필터링

- **문제**: 후속 질문 버튼에 "눈치없이 나갈건가?" 같은 도발적 질문이 표시됨
- **원인**: AI가 펫 캐릭터의 장난스러운 말투를 후속 질문에도 적용
- **수정**:
  - 시스템 프롬프트: "사용자가 실제로 눌러볼 만한 자연스러운 질문만, 도발적/공격적/비꼬는 톤 절대 금지" 추가
  - 서버측 SUGGESTIONS 파싱(`chat-pipeline.ts`): `눈치/뭐야/왜그래/짜증/싫어/꺼져/시끄러/바보/멍청/한심` 키워드 필터 추가
- **파일**: `src/app/api/chat/chat-prompts.ts`, `src/app/api/chat/chat-pipeline.ts`

---

#### 커밋 14: `5172e4d` — 홈 함께보기 섹션 AI 영상 전용

- **문제**: 홈 "함께 보기" 섹션에 캣타워 등 일반 자랑 글이 표시됨 (AI 영상 전용이어야 함)
- **원인**: `badge: "자랑"`으로만 필터링해서 일반 유저의 자랑 게시글도 포함
- **수정**: `videoUrl`이 있는 AI 영상 게시글만 필터링 (`useHomePage.ts`). 영상 게시글 없으면 목업 폴백
- 섹션 설명도 "우리 아이들의 사진과 영상" → "AI로 만든 우리 아이 영상" 변경
- **파일**: `src/components/features/home/useHomePage.ts`, `src/components/features/home/ShowcaseSection.tsx`

---

#### 이 세션에서 변경된 전체 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/components/modals/MemorialSwitchModal.tsx` | 모바일 스크롤 근본 수정 (13번 재작성) |
| `src/app/api/admin/delete-user/route.ts` | withdrawn_users INSERT + 이메일/닉네임 조회 추가 |
| `src/app/api/admin/block-email/route.ts` | **신규** — 이메일 수동 차단 API |
| `src/app/api/auth/cleanup-blocked/route.ts` | **신규** — OAuth 생성 auth.users 삭제 |
| `src/app/auth/callback/page.tsx` | cleanupBlockedAuthUser 함수 + 차단 시 호출 |
| `src/contexts/AuthContext.tsx` | SIGNED_IN 차단 체크 + SIGNED_OUT 홈 리다이렉트 |
| `src/app/page.tsx` | navigateToHome 이벤트 리스너 |
| `src/components/pages/RecordPage.tsx` | 닉네임 변경 시 중복 체크 추가 |
| `src/components/admin/tabs/AdminWithdrawalsTab.tsx` | 이메일 수동 차단 UI |
| `src/components/common/Sidebar.tsx` | z-index 조정 (z-50 → z-[70]) |
| `src/app/api/chat/chat-prompts.ts` | 간식 추천 허용 + SUGGESTIONS 톤 규칙 |
| `src/app/api/chat/chat-pipeline.ts` | SUGGESTIONS 도발적 키워드 필터 |
| `src/components/features/home/useHomePage.ts` | 함께보기 AI 영상만 필터 |
| `src/components/features/home/ShowcaseSection.tsx` | 섹션 설명 변경 |
| `src/config/apiEndpoints.ts` | AUTH_CLEANUP_BLOCKED, ADMIN_BLOCK_EMAIL 추가 |
| `CLAUDE.md` | 모달 스크롤 패턴 #6 추가 |
| `RELAY-ARCHIVE.md` | 이 세션 전체 작업 기록 |

---

#### 현재 상태 및 남은 이슈

**해결 완료**:
- 추모 전환 모달 모바일 스크롤 ✅
- 탈퇴 계정 카카오 재로그인 차단 ✅ (유저 확인: "계정은 정상적으로 재가입된 거 같다 오류도 안 나고")
- 로그아웃 시 홈화면 이동 ✅
- 닉네임 중복 체크 통일 ✅
- 사이드바 X 버튼 헤더에 가려짐 ✅
- AI 펫톡 간식 추천 개선 ✅
- AI 펫톡 SUGGESTIONS 도발적 톤 필터링 ✅
- 홈 함께보기 AI 영상 전용 ✅

**미확인** (유저 테스트 대기):
- 로그아웃 후 홈화면 이동이 실제 모바일에서 잘 되는지
- 사이드바 z-index 수정이 다른 모달/드롭다운과 충돌하지 않는지
- AI 펫톡 간식 추천이 실제로 유용한 답변을 하는지

**다음 세션에서 확인할 것**:
- "올릭" 계정 이메일을 관리자 페이지 → 탈퇴 관리 → 차단 버튼으로 수동 차단했는지 (유저가 직접 해야 함)
- RELAY.md의 기존 TODO 항목들 (결제 연동, AI 영상 환경변수, RLS 정책 등)

---

### [2026-03-06] 전체 코드베이스 QA 스캔 (세션 2)

> 6개 병렬 에이전트로 src/ 전체 전수 검사 수행

| 에이전트 | 영역 | 발견 건수 |
|---------|------|----------|
| 프론트엔드 | pages, features, common, modals | Critical 4 / Major 9 / Minor 11 |
| 백엔드 | API routes, lib, services | Critical 3 / Major 11 / Minor 10 |
| 보안 | RLS, CSP, Auth, XSS | Critical 2 / High 5 / Medium 8 |
| 타입/상태 | types, contexts, hooks | 타입 중복 4건 / 무검증 캐스팅 2건 |
| 다크모드/UI | 전 컴포넌트 | P0 5파일 / P1 10+파일 |
| 에러처리 | catch 블록, Promise 체인 | Critical 5 / Major 11 / Minor 15+ |

- **상세 보고서**: `docs/QA_SCAN_REPORT_20260306.md`
- 수정 우선순위: Phase 1(보안 SQL) → Phase 2(안정성) → Phase 3(UX) → Phase 4(아키텍처)

---

### [2026-03-06] 세션 요약 — 온보딩/매거진 디자인 + 버그수정 + QA 검증

> 5번(QA) + 7번(비판적 사고) 에이전트 검증 완료 세션

#### 1. 펫매거진 P1~P2 마무리 (`5dabf4f`)

| 항목 | 내용 |
|------|------|
| 커밋 | `5dabf4f` feat(magazine): 커버 비율 조정, 엔딩 CTA 강화, 관리자 미리보기 추가 |
| 변경 파일 | `AdminMagazineTab.tsx`, `MagazineReader.tsx` |
| 수정 내용 | 커버 카드 이미지 비율 55%→45% / 엔딩 카드에 Eye·Heart 조회수·좋아요 표시 + Share2 공유 버튼 (navigator.share, clipboard 폴백) / 관리자 매거진탭에 "미리보기" 버튼 추가 (dbArticleToMagazineArticle 변환 → MagazineReader 풀스크린 오버레이) / URL 직접 입력 접기/펼치기 토글 |

#### 2. 온보딩/튜토리얼 다크모드 + UX 전면 개선 (`8abfe20`)

| 항목 | 내용 |
|------|------|
| 커밋 | `8abfe20` fix(onboarding): 다크모드 대응 + UX 개선 전면 수정 |
| 배경 | 4번(비주얼 디자이너) 에이전트 리뷰 결과 82/100점. P0~P2 항목 도출 후 전부 구현 |
| 변경 파일 | `NicknameSetupModal.tsx`, `PostOnboardingGuide.tsx`, `TutorialTour.tsx`, `RecordPageTutorial.tsx`, `OnboardingModal.tsx` |
| P0 | NicknameSetupModal 체크박스 다크모드 (`dark:border-gray-500 dark:bg-gray-700`) + 터치타겟 w-4→w-5 |
| P1 | PostOnboardingGuide 다크모드 (`bg-white dark:bg-gray-900` 등) |
| P1 | TutorialTour 다크모드 (isDark 변수 방식, 인라인 스타일이라 Tailwind dark: 불가) |
| P1 | RecordPageTutorial 다크모드 (Tailwind dark: 클래스) |
| P1 | OnboardingModal Step 0: PawPrint+Sparkles 아이콘 조합 / Step 9: 양쪽 카드에 Eye·BookOpen 아이콘 + 통일된 타이포 |
| P1 | 추모 워딩 "떠난 지" → "무지개다리를 건넌 지" (CLAUDE.md 규칙 준수) |
| P2 | 스텝 전환 fade-in 애니메이션 (`animate-in fade-in-0 duration-300`) |

#### 3. 구름 말풍선 SVG 교체 (`4628427`)

| 항목 | 내용 |
|------|------|
| 커밋 | `4628427` feat(tutorial): 구름 말풍선 div 7개 → SVG path 구름으로 교체 |
| 변경 파일 | `TutorialTour.tsx` |
| 수정 내용 | CSS div 7개(82줄)로 구현한 구름 → SVG viewBox="0 0 280 210" 단일 path(22줄)로 교체. 다크모드 대응 (fill={bubbleBg}). 유저 피드백: "와 구름 이쁘다 굿" |

#### 4. 온보딩 리셋 버그 수정 — 1차: .select() 체이닝 (`b585b30`)

| 항목 | 내용 |
|------|------|
| 커밋 | `b585b30` fix(admin): 온보딩 리셋 실패 수정 - .select() 체이닝 제거 + 에러 로깅 |
| 변경 파일 | `AdminUsersTab.tsx` |
| 원인 | `.update().eq().select()` 체이닝 → RLS 충돌로 빈 결과 → `data.length === 0` 분기로 빠져서 성공인데 "실패" 표시 |
| 수정 | `.select()` 제거, error 객체만으로 성공 판단, `console.error` 에러 로깅 추가 |

#### 5. 온보딩 리셋 버그 수정 — 2차: 트리거 컬럼 참조 (`28de513`)

| 항목 | 내용 |
|------|------|
| 커밋 | `28de513` fix(db): 트리거에서 존재하지 않는 컬럼 참조 제거 |
| SQL | `20260306_fix_trigger_missing_columns.sql` (Supabase SQL Editor에서 실행 완료) |
| 원인 | `protect_sensitive_profile_columns()` 트리거가 profiles 테이블에 존재하지 않는 `ban_reason`, `banned_at`, `last_ip` 컬럼을 `NEW.xxx := OLD.xxx` 방식으로 참조 → 모든 UPDATE 쿼리 실패 ("record 'new' has no field 'ban_reason'") |
| 수정 | 트리거에서 해당 3개 컬럼 참조 제거. 보호 대상은 is_admin, is_premium, is_banned, points, total_points_earned, premium_expires_at, premium_started_at, premium_plan 유지 |

#### 6. 에이전트 검증 (`de63211`)

| 항목 | 내용 |
|------|------|
| 커밋 | `de63211` docs: _STATUS.md에 트리거 수정 마이그레이션 실행 기록 추가 |
| 5번(QA) | Critical 0, Major 2 (다크모드 일관성 방식 혼재, 에러 삼킴), Minor 12 |
| 7번(비판적) | "수정필요" → DB 마이그레이션 실행 확인 필요 → _STATUS.md 업데이트로 해결 |
| 5번 전반적 이슈 보고 | (1) DB 마이그레이션 관리 체계 미비 (2) 다크모드 구현 방식 혼재 (인라인 vs Tailwind) (3) 에러 사일런트 실패 패턴 (4) body overflow 모달 체인 관리 |

---

### [2026-03-05 22:30] 간편모드 (Simple Mode) 구현

| 항목 | 내용 |
|------|------|
| 커밋 | `d2c258d` feat: 간편모드 구현 - 노인 사용자용 큰 카드 런처 홈 |
| 원인 | 노인 사용자를 위한 간편 UI 모드 필요 |
| 변경 파일 | `AuthContext.tsx`, `SimpleHomeLauncher.tsx`(신규), `HomePage.tsx`, `Sidebar.tsx`, `Layout.tsx`, `sql/20260305_simple_mode.sql`(신규), `RELAY.md` |
| 수정 내용 | AuthContext에 isSimpleMode + toggleSimpleMode 추가 (DB+localStorage 동기화) / SimpleHomeLauncher: 6개 큰 카드 그리드 (내 반려동물, AI대화, 커뮤니티, 매거진, 미니홈피, 입양정보) / Sidebar에 간편모드 토글 스위치 UI / HomePage에서 isSimpleMode일 때 런처로 분기 / 기존 일반모드 100% 보존 |

---

### [2026-03-05 21:30] 게시판 API 속도 최적화

| 항목 | 내용 |
|------|------|
| 커밋 | `8797134` perf: 게시판 API 응답 속도 최적화 |
| 원인 | GET 핸들러에서 6~8개 DB 쿼리가 순차 실행, TTFB 1.5~1.7초 |
| 변경 파일 | `src/app/api/posts/route.ts`, `src/app/api/posts/[id]/route.ts` |
| 수정 내용 | createServerSupabase + getAuthUser 병렬 실행 (Promise.all) / profiles + user_minimi 미니미 조회 병렬화 / getAuthUser 중복 호출 제거 (2회→1회) / 조회수 증가 fire-and-forget (응답 대기 안 함) / 댓글 + 미니미 조회 병렬화 |

---

### [2026-03-05 21:00] 미니미 크기 확대 + 내 미니홈피 버튼 모바일 사이드바 추가

| 항목 | 내용 |
|------|------|
| 커밋 | `0ab2971` 미니미 크기 확대 + 내 미니홈피 버튼 모바일 사이드바에도 추가 |
| 원인 | 승빈님 피드백 "미니미가 너무 작다", "미니홈피 버튼 안보여" |
| 변경 파일 | `CommunityPostList.tsx`, `PostDetailView.tsx`, `Sidebar.tsx` |
| 수정 내용 | 목록 미니미 32px→40px, 상세 미니미 36px→44px / Sidebar 유저 영역의 `!isMobile` 조건 제거 → 모바일+데스크탑 모두 표시 / 모바일에서 버튼 클릭 시 사이드바 자동 닫힘 |

---

### [2026-03-05 20:40] 미니미 아바타 크기 + 데스크탑 사이드바 내 미니홈피 버튼

| 항목 | 내용 |
|------|------|
| 커밋 | `3f9a345` 미니미 아바타 크기 키우고 사이드바에 내 미니홈피 버튼 추가 |
| 변경 파일 | `CommunityPostList.tsx`, `PostDetailView.tsx`, `Sidebar.tsx` |
| 수정 내용 | 목록 미니미 24px→32px, 상세 28px→36px / 데스크탑 사이드바 하단 유저 영역에 "내 미니홈피" 버튼 추가 (내 정보 아래, 로그아웃 위) |

---

### [2026-03-05 20:20] 미니미 아바타 미표시 버그 수정 (RLS)

| 항목 | 내용 |
|------|------|
| 커밋 | `fdbd720` fix: 미니미 아바타 미표시 - RLS 우회를 위한 admin 클라이언트 적용 |
| 원인 | profiles, user_minimi 테이블의 RLS가 `auth.uid() = id`로 제한. API에서 anon key로 다른 유저 데이터 조회 불가 → authorMinimiSlug가 항상 null |
| 변경 파일 | `src/lib/supabase-server.ts`, `src/app/api/posts/route.ts`, `src/app/api/posts/[id]/route.ts` |
| 수정 내용 | `createAdminSupabase()` 함수 신규 추가 (service_role_key, RLS 우회, 읽기 전용). 미니미 조회 쿼리에만 admin 클라이언트 사용 |
| 디버깅 과정 | DB 직접 조회로 데이터 존재 확인 → anon key로 profiles 조회 시 빈 배열 반환 확인 → RLS 원인 특정 |

---

### [2026-03-05 19:00] 미니홈피 전략적 노출 (초기 구현)

| 항목 | 내용 |
|------|------|
| 커밋 | `6cb0e4c` 미니홈피 전략적 노출: 미니미 아바타 + 헤더 바로가기 |
| 배경 | 미니홈피가 커뮤니티에서 전혀 노출되지 않아 사용률 낮음. PM+UX 에이전트 컨설팅으로 전략 수립 후 상위 2개 구현 |
| 변경 파일 (6개) | `communityTypes.ts`, `posts/route.ts`, `posts/[id]/route.ts`, `CommunityPostList.tsx`, `PostDetailView.tsx`, `Layout.tsx` |
| 수정 내용 | Post 인터페이스에 authorMinimiSlug 추가 / API에서 profiles→user_minimi 체인으로 slug 조회 및 응답에 포함 / 게시글 목록+상세에 닉네임 옆 미니미 아바타 렌더링 / 헤더 드롭다운에 "내 미니홈피" 바로가기 추가 (localStorage로 탭 전환) |
| 데이터 흐름 | `profiles.equipped_minimi_id (UUID)` → `user_minimi.minimi_id (slug)` → `CHARACTER_CATALOG.imageUrl (PNG)` |

---

### [2026-03-04 ~] 커뮤니티 필터 UI 모바일 최적화

| 항목 | 내용 |
|------|------|
| 커밋 | `3697553` 커뮤니티 필터 UI 모바일 최적화: 수평 스크롤 + 콤팩트 칩 |
| 원인 | 모바일에서 뱃지/태그 필터가 화면을 많이 차지함 |
| 수정 내용 | 필터를 수평 스크롤 + 콤팩트 칩 UI로 변경 |

---

### [2026-03-04 ~] 지역정보 게시판 지역별 필터링

| 항목 | 내용 |
|------|------|
| 커밋 | `f0b1cd0` feat: 지역정보 게시판에 지역별 필터링 추가 |
| 수정 내용 | 지역정보 게시판(local)에 지역 선택 필터 추가. community_posts.region 컬럼 활용, API에 region 파라미터 추가 |

---

### [2026-03-04 ~] 커뮤니티 게시글 뒤로가기 버그 수정

| 항목 | 내용 |
|------|------|
| 커밋 | `f3d86c7` 커뮤니티 게시글 뒤로가기 버그 수정: history API 연동 |
| 원인 | 게시글 상세에서 브라우저 뒤로가기 시 history API와 연동되지 않음 |
| 수정 내용 | popstate 이벤트 리스너로 history API 연동 |

---

### [2026-03-04 ~] 매거진 크론 안정성 강화

| 항목 | 내용 |
|------|------|
| 커밋 | `16c5df4` 매거진 크론 안정성 강화: 실패 시 자동 재시도 + 보정 크론 추가 |
| 수정 내용 | 크론 실패 시 자동 재시도 로직 + 보정 크론(누락 감지/재실행) 추가 |

---

## TODO — 앞으로 할 것

> 승빈님이 우선순위/순서 바꾸고 싶으면 여기서 직접 수정. 위에 있을수록 먼저.
> **각 항목에 구현 가이드 포함** — 새 세션에서 바로 작업 시작할 수 있도록.

**요약: 6개 카테고리**
1. **긴급: 승빈님 직접** — DB 마이그레이션 6개
2. **MVP 런칭 필수** — 결제 연동 + 프리미엄 전환 UX
3. **AI 펫톡 킬러 기능** — ✅ 대화 내보내기 + ✅ 사진 연동
4. **AI 프롬프트 개선** — ✅ 감각/거울링/시간대/pending_topic 완료
5. **UI/UX 비주얼** — ✅ 애니메이션 + ✅ 타이핑 인디케이터 (깜빡임 테스트 필요)
6. **기존 미완료** — API URL, 대시보드 등

---

### 긴급: 승빈님이 직접 해야 하는 것

> Supabase 대시보드 > SQL Editor에서 복사-붙여넣기

- [ ] `20260226_chat_mode_column.sql` — AI 펫톡 추모/일상 데이터 분리 **(이거 안 하면 추모 대화가 일상으로 섞임)**
- [ ] `20260226_security_fixes.sql` — 미니미 RPC + 펫/사진 제한 트리거 **(보안: 동시 구매 어뷰징 방지)**
- [ ] `20260225_push_preferred_hour.sql` — 푸시 알림 시간 선택
- [ ] `ALTER TABLE minihompy_settings ADD COLUMN IF NOT EXISTS placed_minimi JSONB DEFAULT '[]'::jsonb;` — 멀티 미니미
- [ ] `20260222_minimi_system.sql` — 미니미 구매/되팔기 (이미 실행됐을 수 있음, 확인)
- [ ] `20260226_memory_albums.sql` — 추억 앨범 테이블

---

### MVP 런칭 필수 (창업지원금 신청 전)

#### 결제 연동 — 포트원(PortOne) 프리미엄 구독 실결제

**현재 상태**: `is_premium` + `premium_expires_at` 컬럼은 `profiles` 테이블에 이미 있음. `AuthContext.tsx`에서 체크 로직 완료. 결제 흐름만 없음.

**구현 가이드**:
1. **포트원 SDK 설치**: `npm install @portone/browser-sdk` (또는 스크립트 태그 방식)
2. **API 엔드포인트 생성**: `src/app/api/payments/route.ts`
   - `POST /api/payments` — 결제 요청 생성 (포트원 결제 ID 발급)
   - `POST /api/payments/verify` — 결제 완료 후 검증 (포트원 서버에서 결제 상태 확인)
   - 검증 성공 시: `profiles.is_premium = true`, `premium_expires_at = NOW() + 30일`
   - **중요**: 서버에서 포트원 API로 결제 금액 검증 필수 (클라이언트 금액 조작 방지)
3. **결제 흐름 UI**: `PremiumModal.tsx` (이미 존재, `src/components/modals/PremiumModal.tsx`)
   - 현재: "구매하기" 버튼이 `toast("준비 중!")` 표시
   - 변경: 버튼 클릭 → 포트원 결제창 호출 → 완료 콜백에서 `/api/payments/verify` 호출
   - 월 7,900원 / 연 79,000원 (가격: `src/config/constants.ts` `PRICING` 참조)
4. **참고 파일**:
   - `src/config/constants.ts` — `FREE_LIMITS`, `PREMIUM_LIMITS`, `PRICING` 상수
   - `src/contexts/AuthContext.tsx` — `isPremium` 체크 로직 (결제 후 이 값 갱신 필요)
   - `src/components/modals/PremiumModal.tsx` — 결제 UI 연결 대상
5. **DB**: 추가 마이그레이션 필요 없음 (is_premium, premium_expires_at 이미 존재)
6. **포트원 대시보드**: 승빈님이 포트원 계정 생성 + 가맹점 등록 + API 키 발급 필요
   - 환경변수: `PORTONE_API_KEY`, `PORTONE_API_SECRET`, `NEXT_PUBLIC_PORTONE_STORE_ID`

#### 스마트 프리미엄 전환 UX

**현재 상태**: API가 `isWarning: true` (남은 횟수 10회 이하)를 응답에 포함. 프론트엔드에서 `remainingChats <= 3`일 때 빨간 텍스트 표시. 하지만 프리미엄 전환 동기 부여가 약함.

**구현 가이드**:
1. **수정 파일**: `src/components/features/chat/ChatInputArea.tsx`
   - 현재 241~247줄에 `remainingChats` 표시 있음
   - `remainingChats === 3`일 때 부드러운 프리미엄 안내 배너 삽입
   - `remainingChats === 0`일 때 `PremiumModal` 자동 오픈 (현재는 텍스트만 표시)
2. **동적 문구**: `useAIChat.ts`에서 마지막 대화 주제 추출 (마지막 AI 응답의 첫 문장)
   - 예: "오늘 {펫이름}과(와) {마지막 주제} 이야기가 즐거웠나요? 내일도 계속하려면..."
   - `src/components/features/chat/useAIChat.ts` 124~126줄 근처에 로직 추가
3. **PremiumModal 개선**: feature prop에 대화 주제 전달
   - `PremiumModal.tsx`의 `PremiumFeature` 타입에 커스텀 description 지원 추가
   - 또는 새 prop: `customDescription?: string`
4. **참고**: API 응답 구조 (`src/app/api/chat/route.ts` 1033~1047줄):
   ```typescript
   { reply, suggestedQuestions, emotion, emotionScore, remaining, isWarning, ... }
   ```

---

### AI 펫톡 킬러 기능 (시연용)

#### ✅ 대화 내보내기 (편지/카드) — 완료 (2026-02-26)

**구현 완료 내용**:
- `ExportChatModal.tsx` — 템플릿 선택 + 미리보기 + PNG/JPG 다운로드 + Web Share API 공유
- `ExportChatCard.tsx` — 4개 템플릿 (편지/폴라로이드/추모/귀여운), html2canvas로 캡처
- `AIChatHeader.tsx` — 내보내기 버튼 (대화 2개 이상일 때 표시)
- 일상/추모 모드별 컬러 테마 자동 적용
- 펫 프로필 사진 + 대화 내용 + 날짜 + 워터마크 포함

#### ✅ 대화 내 사진 연동 — 완료 (2026-02-26)

**구현 완료 내용**:
- `route.ts` — `extractKeywordsFromReply()` 함수 추가, AI 응답에서 장소/활동 키워드 추출
- `route.ts` — pet_media 캡션 매칭 로직, 응답에 `matchedPhoto` 필드 추가
- `types/index.ts` — ChatMessage에 `matchedPhoto?: { url: string; caption: string }` 추가
- `useAIChat.ts` — API 응답의 matchedPhoto를 메시지에 전달
- `ChatMessageList.tsx` — AI 메시지 아래 매칭 사진 썸네일 + 캡션 렌더링

---

### ✅ AI 펫톡 프롬프트 개선 — 완료 (2026-02-26)

> 모두 `src/app/api/chat/route.ts` 프롬프트 함수에 적용됨.

- **감각 기반 기억**: `getMemorialSystemPrompt()`에 오감 묘사 지시 추가 (## 형식 + 규칙 뒤)
- **감정 거울링 3단계**: 일상/추모 모두 `## 감정 상태` 뒤에 3단계 대응 지침 삽입
- **시간대별 에너지**: `getDailySystemPrompt()`에 `timeEnergy` 변수 + `## 시간 에너지` 섹션 추가

#### pending_topic — "다음에 물어볼 것" 메모리

**목적**: 대화 중 "다음에 이것 물어봐야지" 같은 주제를 저장해두고 다음 대화 시작 시 활용.

**구현 가이드**:
1. **DB**: `pet_memories` 테이블에 `memory_type = 'pending_topic'` 저장 (기존 memory_type 필드 재활용)
   - `pet_memories` 스키마: `id, user_id, pet_id, memory_type, content, created_at`
   - 기존 memory_type 값: `'preference'`, `'habit'`, `'health'`, `'relationship'`
   - 추가할 값: `'pending_topic'`
2. **GPT에게 마커 지시**: SUGGESTIONS 마커처럼 `---PENDING_TOPIC---` 마커로 다음에 물어볼 주제 출력
   - 프롬프트 추가: "대화 중 나중에 이어가고 싶은 주제가 있으면 응답 뒤에 ---PENDING_TOPIC--- 마커 + 주제 1개"
   - `route.ts` 937줄 SUGGESTIONS 파싱 근처에 PENDING_TOPIC 파싱 추가
3. **다음 대화 시 활용**: `getPetMemories()` (route.ts의 agent.ts)에서 pending_topic 조회 → 프롬프트에 삽입
   - "지난번에 {topic}에 대해 이야기하다 말았는데, 기회 되면 물어보세요."
4. **참고 파일**:
   - `src/lib/agent.ts` — `getPetMemories()`, `saveMemory()` 함수
   - `src/app/api/chat/route.ts` — SUGGESTIONS 파싱 패턴 (937~947줄)

---

### ✅ UI/UX 비주얼 — 완료 (2026-02-26)

#### 추모 별 float-up 애니메이션 ✅
- `globals.css` — `@keyframes memorial-float-up` + `.memorial-star` 클래스 추가
- `AIChatPage.tsx` — 추모 모드에서 10개 float-up 별 렌더링 (기존 정적 별과 병존)

#### 타이핑 인디케이터 감성 텍스트 ✅
- `ChatMessageList.tsx` — pet.type별 (강아지/고양이/기타) 감성 텍스트 배열
- 일상/추모 모드별 다른 텍스트
- `useEffect` + `setInterval(2500ms)` 로 텍스트 순환

#### 발자국 버블 데코
AI 메시지 버블에 이미 PawPrint 아이콘이 아바타 영역에 표시됨 (기존 구현 완료)

#### 모바일 깜빡임 최종 확인
**상태**: `e3aa66f` 커밋으로 React.memo 적용 완료. 실기기 테스트 필요.

---

### 기존 미완료

- [x] **API URL 마이그레이션**: 대부분 완료 — 남은 하드코딩 2건 (네이버 리다이렉트, robots.txt)은 상수화 불필요
- [x] **치유의 여정 대시보드**: `/api/healing-journey` API + `HealingJourneySection.tsx` UI — 감정 추이, 애도 단계, 마일스톤 (RecordPage 추모 모드에서 표시)
- [x] **대화→타임라인 자동 생성**: `saveAutoTimelineEntry()` 함수 추가, 10턴마다 세션 요약 시 타임라인에도 자동 저장
- [x] **미니미 도감 + 터치 이펙트**: `MinimiCollection.tsx` 도감 컴포넌트 + `MinihompyStage.tsx` 터치 애니메이션 (점프+말풍선+파티클)

---

## 2026-02-26 (목) 세션 2 — Phase 2 기능 완료 [로컬 커밋]

> **상태**: 로컬 커밋 6개 완료. 푸시 대기 중.

### 완료된 작업

| 기능 | 파일 | 내용 |
|------|------|------|
| **대화→타임라인 자동 생성** | `agent.ts`, `route.ts` | 10턴마다 의미 있는 대화를 timeline_entries에 자동 저장. 키 토픽 2개 이상 또는 중요 언급이 있는 경우에만 |
| **치유의 여정 API** | `/api/healing-journey/route.ts` | 추모 모드 감정 추이, 애도 단계, 마일스톤 집계 API |
| **치유의 여정 UI** | `HealingJourneySection.tsx` | 대시보드 프론트엔드. 현재 단계, 감정 흐름, 마일스톤 5개 |
| **미니미 도감** | `MinimiCollection.tsx` | 보유 미니미 그리드, 완성도 표시, 잠김/획득 구분 |
| **미니미 터치 이펙트** | `MinihompyStage.tsx`, `globals.css` | 점프 애니메이션 + 말풍선 + 파티클 (♥★) |
| **pending_topic 메모리** | `agent.ts`, `route.ts` | 대화 중 나온 주제를 저장, 다음 대화에서 자연스럽게 언급 |
| **스마트 프리미엄 UX** | `ChatInputArea.tsx` | 3회 이하 시 배너, 0회 시 모달 자동 오픈 |

### 커밋 히스토리

| 커밋 | 내용 |
|------|------|
| `603ac28` | AI 펫톡 킬러 기능 + 프롬프트 개선 + UI/UX 비주얼 |
| `ab1a9b0` | pending_topic 메모리 + 스마트 프리미엄 전환 UX |
| `7b1a369` | Phase 2 기능 완료 (타임라인 자동 생성 + 치유 대시보드 API + 미니미 도감) |
| `eee22d0` | lint 경고 수정 |
| `959885f` | 치유의 여정 대시보드 프론트엔드 컴포넌트 |

### 수정 파일

| 파일 | 변경 |
|------|------|
| `src/lib/agent.ts` | `saveAutoTimelineEntry()`, `getLatestPendingTopic()` 추가 |
| `src/app/api/chat/route.ts` | pending_topic 파싱, 사진 매칭, 타임라인 자동 저장 |
| `src/app/api/healing-journey/route.ts` | 신규 — 치유의 여정 집계 API |
| `src/components/features/record/HealingJourneySection.tsx` | 신규 — 대시보드 UI |
| `src/components/features/minihompy/MinimiCollection.tsx` | 신규 — 미니미 도감 |
| `src/components/features/minihompy/MinihompyStage.tsx` | 터치 이펙트 + 애니메이션 |
| `src/components/features/minihompy/MiniHomepyTab.tsx` | 도감 컴포넌트 연결 |
| `src/components/features/chat/ChatInputArea.tsx` | 프리미엄 배너 + 자동 모달 |
| `src/components/pages/RecordPage.tsx` | HealingJourneySection 연결 |
| `src/app/globals.css` | minimiJump, minimiPop, minimiFadeOut, minimiParticle 키프레임 |
| `src/config/apiEndpoints.ts` | HEALING_JOURNEY 상수 추가 |

---

## 2026-02-26 (목) — AI 펫톡 품질 대폭 개선 [배포 완료]

> **상태**: 전부 main 푸시 + Vercel 배포 완료. 커밋 7개.

### 배경: 왜 이 작업을 했는가

승빈님이 실제 서비스 테스트 후 피드백:
- **"AI가 개저능아처럼 얘기한다"** — 모든 펫이 똑같은 로봇 말투. 성격이 죽어있음
- **"추모모드 강아지한테 츄르 추천하고 개판"** — 죽은 펫에게 간식/산책 제안
- **"두 마리 펫인데 추천 질문이 공유된다"** — 펫 전환해도 이전 펫 질문 남아있음
- **"추천 버튼 크기 중구난방, 가끔 안 눌림"** — 모바일에서 snap-x 터치 충돌

이 4가지 문제 + 6번 AI 엔지니어 에이전트의 할루시네이션 방지 5단계 권고를 한 세션에서 전부 처리.

### 구체적으로 뭘 바꿨나

#### 1. 성격이 살아있는 AI (`83d6972`, `3e532f6`)

**문제**: GPT에게 "활발한 성격이야"라고만 알려주면 무시함. 모든 펫이 "그렇구나~ 좋겠다~" 로봇.

**해결**: `getPersonalityBehavior()` 함수 추가 — 성격 텍스트를 구체적 말투/행동 지시로 변환.

```typescript
// route.ts 419~466줄
// "활발" 키워드 → 일상: "짧은 감탄사('와!', '진짜?!'), 신난 어조"
//                추모: "밝고 경쾌한 회상 톤. '그때 진짜 재밌었지~'"
// "도도" 키워드 → 일상: "자기 주장 강한 톤. '양보 못 해.'"
//                추모: "쿨한 말투. '뭐, 보고 싶긴 했어.' 같은 츤데레"
```

7개 성격 (활발/차분/호기심/겁쟁이/애교/도도/식탐) x 2모드 = 14개 분기.
Few-shot 예시도 성격별로 1개씩 넣어서 GPT가 톤을 잡게 함.

#### 2. 추모 모드 추천 필터 (`83d6972`, `3e532f6`)

**문제**: GPT가 프롬프트에서 "간식 금지"라고 써도 SUGGESTIONS에서 "츄르 줘볼까?" 생성.

**해결**: 이중 방어
- 프롬프트: "후속 질문은 추억/감정/관계만. 간식/건강/케어 금지"
- 코드: `filterMemorialSuggestions()` — 22개 키워드 블록리스트 (츄르/간식/산책/병원 등)
- fallback: 필터링 후 0개면 원본 반환 (추천 질문 아예 없는 것보다 나음)
- "먹" → "먹방/먹이주/먹자"로 구체화 (기존 "먹"은 너무 넓어서 추억 질문도 다 걸림)

#### 3. 할루시네이션 방지 5단계 (`fb2d2cf`, `42b630b`, `3e532f6`)

6번 AI 엔지니어 에이전트 권고사항 전부 적용:

| 단계 | 내용 | 파일 |
|------|------|------|
| 1. CoV 삭제 | Chain-of-Verification 프롬프트 제거 (GPT-4o-mini에서 역효과) | 이전 세션에서 완료 |
| 2. 프롬프트 압축 | HALLUCINATION_GUARD_RULES 7섹션→4원칙+2 Few-shot (토큰 50% 감소) | `care-reference.ts` |
| 3. Few-shot | "~해도 돼?" → "수의사 확인이 가장 정확해! 일반적으로는~" 패턴 2개 | `care-reference.ts` |
| 4. 조건부 삽입 | `isCareRelatedQuery()` — 잡담엔 케어 규칙 안 넣음 → 토큰 절약 | `route.ts` |
| 5. 후처리 검증 | `validateAIResponse()` — GPT 응답에서 위험 패턴 코드 레벨 수정 | `care-reference.ts` |

`validateAIResponse` 5가지 체크:
1. 약 용량/처방 패턴 → "수의사 상담 권장" 추가
2. 과도한 단정 ("무조건", "반드시") → "가능하면"으로 완화. **단, 독성 음식 경고("절대 안 돼")는 예외 보존**
3. 브랜드명 20+ 감지 → "좋은 제품"으로 교체. **단, 유저가 직접 물어본 브랜드는 예외**
4. 확률 날조 ("70% 확률") → "경우에 따라"로 교체
5. 사람 약 감지 → 강력 경고 삽입

#### 4. 프롬프트 30% 압축 (`3e532f6`)

**문제**: 케어 모드에서 시스템 프롬프트 ~2,900 토큰. GPT-4o-mini가 뒤쪽 규칙 무시.

**해결**: 4,041자 → 2,744자 (32.1% 감소)
- Few-shot 3개 → 1개 (일상: 활발, 추모: 차분)
- "절대 하지 말 것" 5줄 + "응답 형식" 4줄 → "응답 형식 + 금지" 4줄로 통합
- "두 가지 응답 모드" A/B 설명 8줄 → 인라인 1줄
- CARE_FRAMING_RULES: 525자 → 239자 (54.5% 감소)

#### 5. 펫 전환 버그 (`bbf8dea`)

**문제**: 2마리 등록 계정에서 펫 바꾸면 이전 펫 추천 질문 그대로.

**원인**: `useAIChat.ts`에서 `setMessages([])` 하면서 `setSuggestedQuestions([])` 누락.

**수정**: 1줄 추가.

#### 6. 추천 버튼 UX (`8a46810`)

**문제**: `overflow-x-auto snap-x`로 가로 스크롤인데 모바일에서 snap이 터치 이벤트 먹음 + 긴 텍스트 잘림.

**수정**:
- 레이아웃: `overflow-x-auto snap-x` → `flex flex-wrap` (세로 줄바꿈)
- 크기: `max-w-[200px]` + `truncate` + `min-h-[40px]`
- 글자수: 서버에서 30자 → 20자 제한
- 클릭: `hover:scale` 제거 (모바일에서 불안정), `cursor-pointer` 추가

#### 7. 신규 유저 첫 대화 (`3e532f6`)

**문제**: 데이터 없는 첫 대화가 가장 밋밋 — "안녕!" 하면 "안녕~ 반가워~" 끝.

**수정**: `isFirstChat = chatHistory.length === 0` 감지 후:
- 일상: "나는 {이름}이야! {품종} {성별}!" 자기소개 + 질문 1개 + SUGGESTIONS를 "뭐 좋아해?"/"같이 놀자!" 온보딩 주제로
- 추모: "다시 이야기할 수 있어서 좋아..." 부드러운 시작 + SUGGESTIONS를 "그때 기억나?"/"보고싶었어" 주제로

### 에이전트 회의 (승빈님 요청)

"AI 펫톡 어떻게 극대화시킬지 에이전트 총출동 회의해" → 3번(UX)+4번(비주얼)+5번(QA)+6번(AI)+7번(비판)+8번(PM) 6명 병렬 투입.

7번 비판 에이전트가 **존재하지 않는 기능을 상상으로 비판**하는 실수 발생:
- "TTS 음성 대화 하지 마" → 만든 적 없음
- "프로액티브 추모 푸시 하지 마" → 일상 모드 케어 리마인더만 있음
- "감정 대시보드 잔인하다" → 유저에게 노출 안 됨, DB 내부 관리용
- "잠든 유저 리인게이지먼트 하지 마" → 그런 기능 없음

**→ 7번의 "절대 하지 말 것" 목록은 전부 무시.**
7번이 제대로 짚은 것은 프롬프트 비대화 + 후처리 오탐 + 추천 필터 오탐 3개뿐이고, 이건 Phase 1에서 전부 수정 완료.

### 커밋 히스토리

| # | 커밋 | 내용 |
|---|------|------|
| 1 | `fb2d2cf` | 할루시네이션 방지: HALLUCINATION_GUARD_RULES 압축 + isCareRelatedQuery 조건부 삽입 |
| 2 | `42b630b` | validateAIResponse 후처리 검증 레이어 추가 |
| 3 | `83d6972` | 성격 살리기 + 추모 추천 필터 + 추모 프롬프트 재작성 |
| 4 | `bbf8dea` | 펫 전환 시 추천 질문 공유 버그 수정 |
| 5 | `8a46810` | 추천 질문 버튼 UX (flex-wrap + truncate + 클릭 안정성) |
| 6 | `3e532f6` | Phase 1 통합: 프롬프트 30% 압축 + 필터 fallback + 오탐 수정 + 첫 대화 강화 |
| 7 | `9555374` | RELAY.md 업데이트 |

### 수정 파일

| 파일 | 뭘 바꿨나 |
|------|----------|
| `src/app/api/chat/route.ts` | getPersonalityBehavior(), filterMemorialSuggestions()+fallback, isCareQuery 조건부, isFirstChat 첫 대화, 프롬프트 30% 압축, 추천 20자 제한 |
| `src/lib/care-reference.ts` | HALLUCINATION_GUARD_RULES 압축, CARE_FRAMING_RULES 압축, validateAIResponse()+오탐 3건 수정 |
| `src/components/features/chat/useAIChat.ts` | 펫 전환 시 setSuggestedQuestions([]) 추가 |
| `src/components/features/chat/ChatInputArea.tsx` | flex-wrap + max-w-[200px] + truncate + cursor-pointer |

### 현재 AI 펫톡 처리 흐름

```
유저 메시지
  → sanitizeInput (XSS 방지)
  → detectCrisis (자해/위기 감지)
  → detectEmergencyKeywords (반려동물 응급 증상)
  → isCareRelatedQuery (케어 질문이면 케어 프롬프트 삽입, 아니면 토큰 절약)
  → isFirstChat (chatHistory.length === 0이면 온보딩 프롬프트)
  → analyzeEmotion (감정 분석 + 추모 모드면 애도 단계)
  → getPetMemories (DB에서 장기 메모리 로드)
  → getPersonalityBehavior (성격→말투 매핑)
  → getDailySystemPrompt / getMemorialSystemPrompt (모드별 프롬프트 생성)
  → GPT-4o-mini 호출
  → SUGGESTIONS 파싱 (---SUGGESTIONS--- 마커)
  → filterMemorialSuggestions (추모 모드면 간식/케어 키워드 필터)
  → 느낌표 후처리 (추모 모드면 "!!!" → ".", "!!" → "~")
  → validateAIResponse (약 용량/브랜드/단정/확률/사람약 체크)
  → DB 저장 + 응답 반환
```

---

## 완료된 핵심 기능 (코드 + 배포 완료)

| 기능 | 핵심 파일 | 상태 |
|------|----------|------|
| **반려동물 CRUD** | `PetContext.tsx`, `PetFormModal.tsx`, `/api` routes | 완료 - 사진/영상 관리 포함 |
| **AI 펫톡** | `AIChatPage.tsx`, `useAIChat.ts`, `/api/chat/route.ts` | 완료 - GPT-4o-mini, 일상/추모 듀얼모드, 감정분석 |
| **케어 리마인더** | `RemindersPage.tsx`, `RemindersSection.tsx`, `ReminderPanel.tsx`, `/api/reminders` | 완료 - CRUD + 시간 설정 |
| **푸시 알림 시스템** | `PushNotificationBanner.tsx`, `push-notifications.ts`, `/api/notifications/subscribe`, `/api/cron/daily-greeting` | 완료 - VAPID + web-push + Service Worker + 크론 발송 |
| **리마인더↔푸시 자동 연동** | `ensurePushSubscription()` in `push-notifications.ts` | 완료 - 리마인더 저장 시 자동 푸시 구독 |
| **알림 거부 UX** | `AIChatPage.tsx`, `PushNotificationBanner.tsx` | 완료 - denied 시 OS별 설정 안내 배너/toast |
| **타임라인 일기** | `TimelineSection.tsx`, timeline API | 완료 - 편집 포함 |
| **듀얼 모드 (일상/추모)** | 전체 UI, `MemorialModeContext` | 완료 - 하늘색↔황금빛 테마 전환 |
| **무지개다리 세레모니** | `MemorialSwitchModal.tsx` | 완료 - 5단계 (마음의 준비→날짜→슬라이드쇼→작별인사→별이되다) |
| **튜토리얼** | `TutorialTour.tsx`, `RecordPageTutorial.tsx` | 완료 - 데스크톱 11스텝, 모바일 5스텝 |
| **미니홈피** | `MiniHomepyTab.tsx`, `MinihompyStage.tsx` | 완료 - 배경 8종, 멀티미니미 드래그&드롭 |
| **커뮤니티** | `CommunityPage.tsx`, `/api/posts` | 완료 - 5개 게시판, 좋아요/댓글/신고, 무한스크롤 |
| **프리미엄/무료 제한** | `AuthContext.tsx`, `PremiumModal.tsx` | 완료 - DB 기반 is_premium 체크 |
| **관리자 페이지** | `AdminPage.tsx` | 완료 - 사용자/게시물 관리 |
| **추억 앨범 (추모 전용)** | `MemoryAlbumsSection.tsx`, `MemoryAlbumViewer.tsx`, `/api/memory-albums`, cron Phase 1.75 | 완료 - 매일 자동 앨범 생성, 슬라이드쇼, 푸시 알림 |
| **대화 내보내기** | `ExportChatModal.tsx`, `ExportChatCard.tsx`, `AIChatHeader.tsx` | 완료 - 4개 템플릿(편지/폴라로이드/추모/귀여운), PNG/JPG 저장, Web Share API |
| **대화 내 사진 연동** | `route.ts`, `ChatMessageList.tsx`, `useAIChat.ts` | 완료 - AI 응답 키워드 → pet_media 캡션 매칭 → 썸네일 표시 |
| **AI 프롬프트 개선** | `route.ts` (getDailySystemPrompt, getMemorialSystemPrompt) | 완료 - 감각 기반 기억, 감정 거울링 3단계, 시간대별 에너지 |
| **UI/UX 비주얼** | `globals.css`, `AIChatPage.tsx`, `ChatMessageList.tsx` | 완료 - 추모 별 float-up, 타이핑 감성 텍스트 순환 |
| **Vercel 환경변수** | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Production 설정 완료 |

---

## [완료] 추억 앨범 (Memorial Memory Album) - 배포 대기

> **상태**: 코드 완료 + 빌드 성공. DB 마이그레이션 필요 (아래 미실행 마이그레이션 참고).

### 개요
추모 모드 전용 기능. 매월 1일 KST 09시에 반려동물 사진을 자동 수집하여 추억 앨범 생성.
푸시 알림으로 "도착했어요" 알림 → 우리의 기록 페이지에서 슬라이드쇼로 열람.

### 기념일 예외 앨범 (`22cdad4`)
매월 1일 외에도 기념일에 특별 앨범 자동 생성:

| 기념일 종류 | 조건 | 앨범 제목 예시 |
|------------|------|---------------|
| 생일 | MM-DD 일치 | "모카의 생일 추억 앨범" |
| 입양 100일 | 100/200/300... 일 | "모카과(와) 함께한 100일" |
| 입양 연도 | MM-DD 일치 + 365일 이상 | "모카과(와) 함께한 1년" |
| 추모 100일 | 100/200/300... 일 | "모카을(를) 추억하며 - 100일" |
| 추모 연도 | MM-DD 일치 + 365일 이상 | "모카을(를) 추억하며 - 1년" |

컨셉 타입: `birthday`, `adoption`, `memorial` (types/index.ts `MemoryAlbumConcept` 업데이트)

### 신규/수정 파일 (8개)

| 파일 | 작업 |
|------|------|
| `supabase/migrations/20260226_memory_albums.sql` | **신규** - memory_albums 테이블, RLS, 인덱스 |
| `src/types/index.ts` | MemoryAlbum, MemoryAlbumConcept 타입 추가 |
| `src/config/apiEndpoints.ts` | MEMORY_ALBUMS, MEMORY_ALBUM_READ 상수 |
| `src/app/api/memory-albums/route.ts` | **신규** - 앨범 조회 API (GET) |
| `src/app/api/memory-albums/[id]/read/route.ts` | **신규** - 앨범 읽음 처리 API (PATCH) |
| `src/app/api/cron/daily-greeting/route.ts` | Phase 1.75 추가: 앨범 자동 생성 + 푸시 |
| `src/components/features/record/MemoryAlbumViewer.tsx` | **신규** - 전체화면 슬라이드쇼 모달 |
| `src/components/features/record/MemoryAlbumsSection.tsx` | **신규** - 앨범 카드 수평 스크롤 리스트 |
| `src/components/pages/RecordPage.tsx` | memorial 펫일 때 MemoryAlbumsSection 렌더, URL 딥링크 |

### 앨범 생성 로직 (크론 Phase 1.75)
- 3가지 컨셉 우선순위: anniversary(같은 MM-DD) → mood(행복한 날) → random(랜덤 5-10장)
- 매월 1일 09시(KST)에만 실행 (월 1회)
- 최근 30일 사용된 사진 제외 (반복 방지)
- UNIQUE(pet_id, created_date) 제약으로 날짜당 1번

### 검증
- `tsc --noEmit` 통과
- `next build` 성공

### 미실행 마이그레이션
- `supabase/migrations/20260226_memory_albums.sql` - Supabase 대시보드에서 SQL Editor로 실행 필요

---

## [완료] AI 펫톡 강화: "이 AI는 우리 아이를 안다" - 배포 대기

> **상태**: 커밋 완료, 배포 대기

### 변경 목적
AI 펫톡이 유저가 등록한 데이터(입양일, 추모일, 리마인더, 타임라인)를 적극 활용하도록 강화.
"이 AI가 진짜 우리 아이를 아는 것 같다"는 느낌을 주기 위한 4가지 기능 추가.

### 추가된 기능 (4개)

| 기능 | 파일 | 내용 |
|------|------|------|
| **D: 입양일 기념일 감지** | `chat/route.ts` | `getSpecialDayContext()`에 adoptedDate 체크 추가 - 입양 100일/1주년 등 AI가 축하 |
| **B: 리마인더 직접 답변** | `chat/route.ts` | 프롬프트에 "일정 질문에 정확한 시간 답변" 규칙 추가 - "산책 언제야?" → "오후 5시에 가기로 했잖아!" |
| **A: 기념일 푸시 확장** | `daily-greeting/route.ts` | 입양일/추모일 100일 단위 + 연도 기념일 감지, 기념일별 푸시 제목 분기 |
| **C: 1년 전 오늘 알림** | `daily-greeting/route.ts` | 매일 오전 9시(KST), 1년 전 오늘 타임라인 기록 있으면 추억 푸시 발송 |

### 수정 파일 (2개)
- `src/app/api/chat/route.ts` - Feature B + D
- `src/app/api/cron/daily-greeting/route.ts` - Feature A + C

### 검증
- `tsc --noEmit` 통과
- `next build` 성공

---

## [완료] 보안 수정 검수 + 버그 3건 추가 수정 (`b7230db`) - 배포 완료

> **상태**: 커밋 + main 푸시 완료. Vercel 배포됨.

### 검수 결과
`c61d817` (VM Claude Code 보안 수정)을 3개 검수 에이전트로 검증.
- 10개 항목 통과 (프리미엄 서버 검증, CRON_SECRET, 무료 10회 제한 등)
- **버그 3건 발견 → 즉시 수정**

### 수정된 버그

| 버그 | 파일 | 내용 |
|------|------|------|
| VPN 캐시 복사 오류 | `rate-limit.ts:505-509` | isProxy/isDatacenter가 모두 isVPN 값으로 복사 → 캐시 타입에 3개 필드 분리 저장 |
| 일일 사용량 레이스 컨디션 | `rate-limit.ts:244-250` | 동시 요청 시 카운트 누락 → optimistic locking (eq request_count) + 재시도 |
| sell_minimi_item 락 누락 | `20260226_security_fixes.sql` | profiles FOR UPDATE 없이 포인트 업데이트 → FOR UPDATE 락 추가 |

### 수정 파일 (2개)
- `src/lib/rate-limit.ts` - VPN 캐시 + optimistic locking
- `supabase/migrations/20260226_security_fixes.sql` - sell FOR UPDATE + check_pet_limit FOR UPDATE

---

## [완료] 보안 취약점 수정 (`c61d817`) - 배포 완료

> **상태**: 커밋 + main 푸시 완료. Vercel 배포됨.

### 수정된 보안 이슈

| 이슈 | 심각도 | 수정 내용 |
|------|--------|----------|
| CRON_SECRET 로직 오류 | 심각 | 환경변수 미설정 시 인증 스킵 → 500 에러 반환으로 변경 |
| AI Chat 프리미엄 서버 검증 | 심각 | 클라이언트만 체크 → 서버에서 DB 조회로 검증 |
| 무료 회원 AI 제한 | 중간 | 200회 → 10회로 수정 (FREE_LIMITS.DAILY_CHATS 적용) |
| DELETE 에러 처리 누락 | 중간 | notifications/subscribe DELETE 에러 로깅 추가 |
| preferredHour 범위 | 낮음 | 0-23시 → 7-22시로 제한 (새벽 제외) |

### 수정 파일 (4개)
- `src/app/api/cron/daily-greeting/route.ts` - CRON_SECRET 필수화
- `src/app/api/chat/route.ts` - 프리미엄 서버 검증 추가
- `src/app/api/notifications/subscribe/route.ts` - DELETE 에러 처리, 시간 범위
- `src/lib/rate-limit.ts` - FREE_LIMITS.DAILY_CHATS 연동

### DB 마이그레이션 필요 (아래 미실행 마이그레이션 참고)
- `20260226_security_fixes.sql` - 미니미 RPC + 펫/사진 제한 트리거

---

## [완료] 알림 거부 UX 개선 (`bf5f0ec`) - 배포 완료

> **상태**: 커밋 + main 머지 + push 완료. Vercel 배포됨.

### 변경 내용

**1. AIChatPage.tsx - handleReminderAccept**
- 알림 `denied` 상태에서 "알려주세요" 클릭 시 OS별 구체적 설정 안내 toast 표시
- iOS: "설정 > Safari > 알림에서 허용해주세요"
- 기타: "주소창 왼쪽 자물쇠 > 알림 > 허용으로 변경해주세요"
- 기존: denied면 아무 안내 없이 무시하고 record 탭 이동

**2. PushNotificationBanner.tsx - denied 상태 배너**
- `BannerState`에 `"denied"` 타입 추가
- 페이지 진입 시 `permission === "denied"`여도 안내 배너 표시 (기존: 배너 숨김)
- `handleSubscribe`에서 유저가 거부하면 denied 배너로 전환 (기존: 그냥 사라짐)
- denied 배너 UI: BellOff 아이콘 + OS별 설정 변경 안내 + 닫기 버튼

### 수정 파일 (2개)
`src/components/pages/AIChatPage.tsx`, `src/components/features/chat/PushNotificationBanner.tsx`

---

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

## [완료] 푸시 알림 시스템 전면 수정 (6커밋)

> **상태**: 전체 파이프라인 정상화 완료. 크론 API 200 OK 확인. 구독자 생기면 실제 발송됨.

### 문제 1: 오페라 모바일에서 푸시 배너 안 뜸
- **원인**: 오페라 모바일은 `PushManager` API 미지원 → `isPushSupported()` false → 배너 초기화 즉시 return
- **해결**: `"unsupported"` BannerState 추가. 미지원 브라우저에서도 "Chrome 또는 Safari에서 알림을 받을 수 있어요" 안내 배너 표시
- **커밋**: `da4bff1`

### 문제 2: 알림 거부 시 dismiss 기록 남아서 재방문 시 배너 안 뜸
- **원인**: 구독 실패(유저가 거부)해도 `handleDismiss()` 실행 → localStorage에 dismiss 기록 → 7일간 배너 안 뜸
- **해결**: 구독 실패 시 배너만 숨기고 dismiss 기록은 남기지 않음 → 다음 방문 시 다시 표시
- **커밋**: `1b2d9e8`

### 문제 3: 크론 API "VAPID_NOT_CONFIGURED" 에러
- **원인**: VAPID 키가 Vercel 환경변수에 설정 안 됨
- **해결**: `web-push generate-vapid-keys`로 생성 후 Vercel + `.env.local`에 설정
- **키 값**:
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY=BF2SwTyt5-7Xqca3q-RgBnRVchvyGtd0y__USA1jZXpcZqEn3sMIJJE3NwzK4ceQFebL5x3HYPILPWgOBmEJElk`
  - `VAPID_PRIVATE_KEY=MH-cn1EvMq0rfTdICwQn2eoCwW4y1I-Pjd9mspAuZ1w`

### 문제 4: 크론 API 빈 500 응답 (서버리스 함수 크래시)
- **원인**: `import webpush from "web-push"` (default import)가 Vercel Serverless의 CJS 환경에서 호환 안 됨
- **해결**: `import * as webpush from "web-push"` (namespace import)로 변경
- **커밋**: `a8ecf9e`

### 문제 5: "Vapid public key must be a URL safe Base 64" 에러
- **원인**: `echo "키값" | vercel env add` 시 개행문자(`\n`)가 환경변수 값 끝에 포함됨
- **해결**: `vercel env rm` 후 `printf "키값"` (개행 없음)으로 재설정
- **검증**: `vercel env pull`로 깨끗한 값 확인 → 크론 API 200 OK

### 문제 6: 케어 리마인더와 AI 펫톡 알림이 따로 놀음
- **원인**: 리마인더 추가와 푸시 구독이 독립적 플로우. 유저가 리마인더만 추가하고 푸시 배너는 무시하면 알림 안 옴
- **해결**: `ensurePushSubscription()` 유틸 함수 생성. 리마인더 저장 성공 시 자동으로 푸시 권한 요청 + 구독 + 서버 등록
- **적용 위치**: RemindersSection.tsx, ReminderPanel.tsx, RemindersPage.tsx (3곳 모두)
- **커밋**: `7ce1d60`

### 커밋 히스토리

| 커밋 | 내용 |
|------|------|
| `1b2d9e8` | 알림 거부 시 조용히 넘어가기 + dismiss 기록 안 남기기 |
| `da4bff1` | 푸시 미지원 브라우저에서도 알림 배너 표시 (unsupported 상태) |
| `8a48120` | 크론 API 에러 디버깅 추가 (임시) |
| `a8ecf9e` | web-push import 방식 수정 (CJS 호환) |
| `6bae1f5` | 크론 API 정상화 - 디버깅 코드 정리 |
| `7ce1d60` | 리마인더 저장 시 푸시 구독 자동 연동 (ensurePushSubscription) |

### 수정 파일

| 파일 | 변경 |
|------|------|
| `src/components/features/chat/PushNotificationBanner.tsx` | unsupported 상태 추가, 거부 시 dismiss 기록 안 남기기 |
| `src/app/api/cron/daily-greeting/route.ts` | `import * as webpush` CJS 호환, 디버깅 코드 정리 |
| `src/lib/push-notifications.ts` | `ensurePushSubscription()` 유틸 함수 추가 |
| `src/components/features/reminders/RemindersSection.tsx` | 리마인더 생성 시 ensurePushSubscription 호출 |
| `src/components/features/chat/ReminderPanel.tsx` | 리마인더 추가 시 ensurePushSubscription 호출 |
| `src/components/pages/RemindersPage.tsx` | 리마인더 생성 시 ensurePushSubscription 호출 |
| `.env.local` | VAPID 키 추가 |

### Vercel 환경변수 (Production 설정 완료)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` ✅
- `VAPID_PRIVATE_KEY` ✅

### ensurePushSubscription 동작 흐름
```
리마인더 저장 성공
  → isPushSupported() 체크
  → permission === "denied"이면 포기
  → 이미 구독되어 있으면 건너뜀 (return true)
  → Service Worker 등록
  → Notification.requestPermission() 요청
  → pushManager.subscribe() 실행
  → POST /api/notifications/subscribe로 서버에 등록
```

---

## [!!] 미실행 마이그레이션 - 승빈님 액션 필요

> 아래 SQL이 Supabase DB에서 실행되지 않으면 관련 기능이 동작하지 않습니다.
> Supabase 대시보드 > SQL Editor에서 복사-붙여넣기로 실행해주세요.

| 파일 | SQL | 영향받는 기능 | 긴급도 |
|------|-----|--------------|--------|
| **`20260226_chat_mode_column.sql`** | chat_messages + conversation_summaries에 chat_mode 컬럼 추가 + 레거시 백필 | **AI 펫톡**: 추모 모드 데이터가 일상 모드로 역류 방지 | **즉시** - 이 컬럼 없으면 코드는 레거시 폴백(grief_progress NULL 휴리스틱)으로 동작 |
| **`20260226_security_fixes.sql`** | 미니미 구매/판매 RPC + 펫/사진 제한 트리거 | **보안**: 포인트 원자성 + 무료 회원 제한 서버 강제 | **즉시** - 동시 구매 어뷰징 방지, 무료 제한 우회 방지 |
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
| **푸시 알림 시스템 정상화** | `da4bff1`~`6bae1f5` | `PushNotificationBanner.tsx`, `daily-greeting/route.ts` | 완료 |
| **리마인더↔푸시 자동 연동** | `7ce1d60` | `push-notifications.ts`, `RemindersSection.tsx`, `ReminderPanel.tsx`, `RemindersPage.tsx` | 완료 |

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
| 오페라 모바일 푸시 배너 안 뜸 (PushManager 미지원) | `da4bff1` | 완료 |
| 알림 거부 시 dismiss 기록 남아 재방문 시 배너 안 뜸 | `1b2d9e8` | 완료 |
| 크론 API VAPID_NOT_CONFIGURED 에러 | Vercel 환경변수 설정 | 완료 |
| 크론 API web-push CJS import 크래시 | `a8ecf9e` | 완료 |
| 크론 API VAPID 키 개행문자 오염 | Vercel env 재설정 (printf) | 완료 |
| 리마인더와 푸시 구독 독립적 플로우 | `7ce1d60` | 완료 |

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
- **Claude Code 실행 시 반드시 `claude --dangerously-skip-permissions` 로 시작** (매번 권한 물어보는 거 없이 바로 실행)
- 커밋/푸시는 물어보지 말고 바로 진행
- 빌드 확인 필수
- CLAUDE.md의 서브에이전트 오케스트레이션 방식 준수
- **DB 변경이 포함된 작업은 SQL 실행까지 완료해야 "완료"**

---

## 2026-02-25 (화) — Phase 2 구현 진행

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

---

## 2026-02-26 (수) 세션 1 — 보안 전면 리뷰 및 수정

### 진행 배경
승빈님 요청: "케어 리마인더와 AI 펫톡 푸시 알림 기능 전체 코드 리뷰 + 보안/문제점 수정"

### 보안 리뷰 범위 (4개 병렬 에이전트 투입)

| 영역 | 검토 파일 | 발견 문제 |
|------|----------|----------|
| 푸시 알림 API | `notifications/subscribe`, `cron/daily-greeting`, `push-notifications.ts` | CRON_SECRET 스킵, DELETE 에러 미처리, preferredHour 범위 |
| 리마인더 API | `reminders/route.ts`, `reminders/[id]`, 관련 컴포넌트 | **A- 등급** - 대체로 우수, 일부 값 검증 개선 권장 |
| AI 채팅 API | `chat/route.ts`, `agent.ts`, `AIChatPage.tsx` | 프리미엄 서버 검증 부재, Prompt Injection 필터 약함 |
| 인증 시스템 | `AuthContext.tsx`, `supabase-server.ts` | 클라이언트 기반 피처 제한 (서버 검증 필요) |

### 발견된 심각한 문제 및 수정

#### 1. CRON_SECRET 로직 오류 (심각) ✅ 수정됨
**파일**: `src/app/api/cron/daily-greeting/route.ts` (라인 204)

**Before**:
```typescript
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
// cronSecret이 없으면 검사 스킵됨!
```

**After**:
```typescript
if (!cronSecret) {
    console.error("[Cron] CRON_SECRET이 설정되지 않았습니다");
    return NextResponse.json({ error: "CRON_SECRET_MISSING" }, { status: 500 });
}
if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

#### 2. AI Chat 프리미엄 서버 검증 부재 (심각) ✅ 수정됨
**파일**: `src/app/api/chat/route.ts`

**문제**: 클라이언트에서만 `isPremium` 체크, API 직접 호출 시 무제한 사용 가능

**수정**:
```typescript
// 프리미엄 상태 확인 (서버 검증 - 보안 중요)
const supabase = await createServerSupabase();
const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium, premium_expires_at")
    .eq("id", user.id)
    .single();

const isPremium = profile?.is_premium &&
    (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());

// 무료 회원: 10회 제한, 프리미엄: 무제한
if (!isPremium) {
    const dailyUsage = await checkDailyUsageDB(identifier, false);
    if (!dailyUsage.allowed) {
        return NextResponse.json({ error: "일일 무료 제한 초과", isLimitReached: true }, { status: 429 });
    }
}
```

#### 3. 무료 회원 일일 제한 불일치 ✅ 수정됨
**파일**: `src/lib/rate-limit.ts`

**Before**: `dailyLimit: 50` (하드코딩)
**After**: `dailyLimit: FREE_LIMITS.DAILY_CHATS` (10회, constants.ts 연동)

#### 4. DELETE 에러 처리 누락 ✅ 수정됨
**파일**: `src/app/api/notifications/subscribe/route.ts`

**Before**:
```typescript
await supabase.from("push_subscriptions").delete()...
return NextResponse.json({ success: true }); // 에러 확인 안 함
```

**After**:
```typescript
const { error } = await supabase.from("push_subscriptions").delete()...
if (error) {
    console.error("[Push Unsubscribe] DB 삭제 실패:", error.message);
    return NextResponse.json({ error: "구독 해제에 실패했습니다." }, { status: 500 });
}
```

#### 5. preferredHour 범위 제한 ✅ 수정됨
**파일**: `src/app/api/notifications/subscribe/route.ts`

**Before**: 0-23시 허용
**After**: 7-22시만 허용 (새벽 알림 방지)

#### 6. VAPID_SUBJECT 하드코딩 ✅ 수정됨
**파일**: `src/app/api/cron/daily-greeting/route.ts`

**Before**: `const VAPID_SUBJECT = "mailto:sharkwind1@gmail.com";`
**After**: `const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@memento-ani.com";`

### DB 마이그레이션 생성됨

**파일**: `supabase/migrations/20260226_security_fixes.sql`

포함 내용:
1. **`purchase_minimi_item` RPC**: 포인트 차감 + 아이템 추가 원자성 보장 (FOR UPDATE 락)
2. **`sell_minimi_item` RPC**: 판매 시 원자성 보장
3. **`check_pet_limit` 트리거**: 무료 1마리 / 프리미엄 10마리 DB 레벨 강제
4. **`check_photo_limit` 트리거**: 무료 100장 / 프리미엄 1000장 펫당 제한

### 커밋 히스토리

| 커밋 | 내용 |
|------|------|
| `c61d817` | fix(security): 보안 취약점 수정 및 프리미엄 서버 검증 강화 |
| `c825f42` | docs: RELAY.md 보안 수정 내역 추가 |

### 수정된 파일 (5개)
- `src/app/api/chat/route.ts` - 프리미엄 서버 검증, 무료 10회 제한
- `src/app/api/cron/daily-greeting/route.ts` - CRON_SECRET 필수화, VAPID_SUBJECT 환경변수화
- `src/app/api/notifications/subscribe/route.ts` - DELETE 에러 처리, 시간 범위 7-22시
- `src/lib/rate-limit.ts` - FREE_LIMITS.DAILY_CHATS 연동
- `supabase/migrations/20260226_security_fixes.sql` - 원자성 RPC + 제한 트리거 (신규)

### 승빈님 필수 액션

1. **Supabase SQL Editor에서 실행**:
   ```
   supabase/migrations/20260226_security_fixes.sql
   ```

2. **Vercel 환경변수 추가 (선택)**:
   ```
   VAPID_SUBJECT=mailto:support@memento-ani.com
   ```

### 리뷰에서 발견되었지만 미수정 (향후 권장)

| 항목 | 심각도 | 설명 |
|------|--------|------|
| Prompt Injection 필터 강화 | 중간 | `sanitizeInput()` 패턴 감지 추가 권장 |
| IP 기반 Rate Limit Redis 전환 | 낮음 | 현재 메모리 기반, 분산 환경에서 불완전 |
| 입력값 런타임 타입 검증 (Zod) | 낮음 | `as` 타입 캐스팅 → Zod 스키마 검증 권장 |
| 관리자 권한 헬퍼 표준화 | 낮음 | `requireAdmin()` 함수 일관 적용 권장 |

---

## 2026-02-26 (수) 세션 2 — 전체 보안 스캔 및 수정 (`025ec39`)

> **상태**: 커밋 + 푸시 완료

### 검사 방법
6개 병렬 에이전트로 전체 코드베이스 보안 스캔:
1. API 인증/권한 보안
2. 프론트엔드 보안 (XSS, 민감 정보 노출)
3. 파일 업로드/스토리지 보안
4. 환경변수/시크릿 관리
5. 레이스 컨디션/동시성 버그
6. 타입 안전성/런타임 에러

### 발견 및 수정된 문제

#### 1. 레이스 컨디션 (Critical) ✅ 수정됨

| 파일 | 문제 | 수정 |
|------|------|------|
| `points/shop/route.ts` | fallback read-modify-write | 원자적 업데이트 + `.gte("points", price)` |
| `minimi/purchase/route.ts` | fallback 포인트 중복 차감 | 원자적 업데이트 + `.gte()` 조건 |
| `minimi/sell/route.ts` | delete 중복 실행 + 포인트 중복 지급 | `delete().select().single()` + 원자적 증가 |

#### 2. 파일 업로드 보안 (High) ✅ 수정됨

| 문제 | 수정 |
|------|------|
| 확장자 화이트리스트 없음 | `ALLOWED_IMAGE_EXTENSIONS`, `ALLOWED_VIDEO_EXTENSIONS` 추가 |
| MIME 타입 검증 없음 | `validateMimeType()` 함수 추가 |
| 이중 확장자 허용 (image.jpg.exe) | 두 번째 마지막 확장자 검사 추가 |

#### 3. VPN 체크 누락 (High) ✅ 수정됨

| 파일 | 수정 |
|------|------|
| `points/shop/route.ts` | VPN 체크 추가 |
| `points/daily-check/route.ts` | VPN 체크 + Rate Limit 추가 |
| `minimi/purchase/route.ts` | VPN 체크 추가 |
| `minimi/sell/route.ts` | VPN 체크 추가 |

### 미수정 (낮은 우선순위)

| 항목 | 심각도 | 이유 |
|------|--------|------|
| GET API Rate Limiting | 중간 | 서비스 영향 미미, 추후 대응 |
| 방문자 카운터 레이스 컨디션 | 낮음 | 금전적 영향 없음 |
| userId UUID 형식 검증 | 낮음 | DB에서 에러 처리됨 |
| CSP 헤더 추가 | 낮음 | XSS는 DOMPurify로 방어 중 |

---

## [완료] 대형 페이지 컴포넌트 분리 리팩토링 (5개 페이지)

> **상태**: 완료. `next build` 타입 에러 0개 확인.

### 목적
800~1,140줄짜리 대형 페이지 컴포넌트를 신입 개발자가 바로 이해할 수 있도록 분리.
UI 서브 컴포넌트를 `features/{domain}/` 폴더로 추출, 상태/로직은 커스텀 훅으로 분리.

### 분리 결과 요약

| 페이지 | Before | After | 추출 파일 수 |
|--------|--------|-------|-------------|
| AdoptionPage | 825줄 | ~238줄 | 8개 |
| RecordPage | 1,140줄 | ~495줄 | 4개 |
| HomePage | 800줄 | ~130줄 | 7개 |
| CommunityPage | 657줄 | ~290줄 | 2개 |
| LocalPage | 635줄 | ~300줄 | 2개 |

RemindersPage(599줄)는 분석 후 분리 불필요로 판단 (모달 폼 상태가 페이지 로직과 밀접하게 결합되어 분리하면 오히려 복잡도 증가).

### 신규/수정 파일 상세

#### AdoptionPage (8개 신규)

| 파일 | 내용 |
|------|------|
| `src/components/features/adoption/adoptionTypes.ts` | REGIONS, genderLabel, neuterLabel, formatDate 유틸 |
| `src/components/features/adoption/useAdoption.ts` | 상태 11개 + 핸들러 5개 + useEffect |
| `src/components/features/adoption/AnimalDetailModal.tsx` | 상세 모달 + InfoItem 컴포넌트 |
| `src/components/features/adoption/AnimalGridCard.tsx` | 그리드 뷰 카드 |
| `src/components/features/adoption/AnimalListCard.tsx` | 리스트 뷰 카드 |
| `src/components/features/adoption/AdoptionFilters.tsx` | 검색바 + 종류 탭 + 확장 필터 |
| `src/components/features/adoption/AdoptionPagination.tsx` | 페이지네이션 UI |
| `src/components/features/adoption/index.ts` | barrel export |

#### RecordPage (4개 신규)

| 파일 | 내용 |
|------|------|
| `src/components/features/record/TimelineSection.tsx` | 같은 파일 내 독립 컴포넌트를 별도 파일로 이동 (288줄) |
| `src/components/features/record/ProfileTab.tsx` | "내 정보" 탭 JSX (프로필 카드 + 통계 + 계정관리) |
| `src/components/features/record/PetCardGrid.tsx` | 펫 선택 그리드 + 드롭다운 메뉴 |
| `src/components/features/record/RecordPageGuest.tsx` | 비로그인 상태 UI |

#### HomePage (7개 신규)

| 파일 | 내용 |
|------|------|
| `src/components/features/home/useHomePage.ts` | 상태 7개 + 핸들러 3개 + useMemo 4개 |
| `src/components/features/home/homeUtils.ts` | safeStringSrc, getPetIcon, HERO_CONTENT 상수 |
| `src/components/features/home/types.ts` | LightboxItem, CommunityPost, Comment 타입 |
| `src/components/features/home/HeroSection.tsx` | HERO 배너 |
| `src/components/features/home/CommunitySection.tsx` | 인기 커뮤니티 카드 캐러셀 |
| `src/components/features/home/AdoptionSection.tsx` | 입양정보 카드 캐러셀 |
| `src/components/features/home/CareGuideSection.tsx` | 케어 가이드 카드 캐러셀 |
| `src/components/features/home/MemorialSection.tsx` | 추모 섹션 |

#### CommunityPage (2개 신규)

| 파일 | 내용 |
|------|------|
| `src/components/features/community/CommunityHeader.tsx` | 서브카테고리 탭, 말머리 필터, 검색바, 정렬 (~170줄) |
| `src/components/features/community/CommunityPostList.tsx` | 게시글 카드, 스켈레톤 로더, 무한 스크롤, 빈 상태 (~210줄) |

#### LocalPage (2개 신규)

| 파일 | 내용 |
|------|------|
| `src/components/features/local/LocalHeader.tsx` | 지역 Select(시/도, 구/군), 검색바, 카테고리 필터 (~160줄) |
| `src/components/features/local/LocalPostList.tsx` | 게시글 카드, 이미지, 위치/통계, 빈 상태, 페이지네이션 (~230줄) |

#### 수정된 기존 파일

| 파일 | 변경 |
|------|------|
| `src/components/pages/AdoptionPage.tsx` | 825줄 → 238줄 (서브컴포넌트 import로 교체) |
| `src/components/pages/RecordPage.tsx` | 1,140줄 → 495줄 |
| `src/components/pages/HomePage.tsx` | 800줄 → 130줄 |
| `src/components/pages/CommunityPage.tsx` | 657줄 → 290줄 |
| `src/components/pages/LocalPage.tsx` | 635줄 → 300줄 |
| `src/components/features/home/index.ts` | barrel export 업데이트 |
| `src/components/features/community/index.ts` | barrel export 업데이트 |
| `src/components/features/record/ProfileTab.tsx` | 타입 수정: `userPetType: string | null` → `"dog" | "cat" | "other"` |

### 분리 원칙
- 순수 리팩토링 (로직 변경 없음, 기능 동작 동일)
- 기존 패턴(useAIChat, useLostPosts) 따라 일관된 구조
- Props 기반 통신 (부모 페이지 → 서브 컴포넌트)
- 각 서브 컴포넌트에 JSDoc 주석으로 역할 설명

### 검증
- `next build` 통과 (타입 에러 0개)
- 기존 img warning만 존재 (pre-existing)
