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

### 주요 페이지 (5개 메인 탭 + 커뮤니티 서브 5개)
- 메인 탭: 홈, 우리의 기록, 커뮤니티, AI 펫톡, 펫매거진
- 커뮤니티 서브: 자유게시판, 추모게시판, 입양정보, 지역정보, 분실동물

### 레벨 시스템
- Lv.1~7 포인트 기반 등급, petType(dog/cat/other)별 다른 아이콘
- 관리자 계정은 레벨 대신 선글라스 ADMIN 아이콘 표시
- Lv.5+ 반짝이 뱃지, Lv.7 무지개 글로우

### 미니미 시스템
- 싸이월드 감성 미니홈피 + 비트캅 스타일 픽셀 미니미
- 미니미 상점에서 포인트로 구매, 옷장에서 장착
- **악세서리 시스템 삭제 완료** (캐릭터만 남음)
- 렌더링: PNG 이미지 아닌 CSS box-shadow 픽셀데이터(MinimiRenderer)로 통일

---

## 마지막 업데이트
- 작성자: VM 터미널 Claude (Opus 4.6)
- 시각: 2026-02-22
- 브랜치: `main`
- 최신 커밋: `08e00a1` (fix: 미니미 렌더링 PNG→픽셀데이터 통일)
- **suspicious-rhodes 브랜치 → main 머지 완료** (`69c0c8a`)

## 현재 상태
- `main` 브랜치, origin과 동기화 완료
- 타입체크 통과 확인 (`npx tsc --noEmit` 에러 0건)
- 개발 서버 미실행 상태

---

## 이번 세션 작업 내역 (2026-02-22, VM 터미널 Claude)

### 완료 커밋 목록

| 커밋 | 내용 |
|------|------|
| `69c0c8a` | suspicious-rhodes → main 머지 (모바일 UX, 사이드바 스크롤, 말티푸 크기) |
| `2eb4e6a` | 미니미 악세서리 시스템 전체 삭제 + 캐릭터 3종 사이즈 통일 |
| `aea93bf` | 성능 최적화 + 포인트 RPC 원자성 + CSP 헤더 + 추모 전환 애니메이션 |
| `cf7b2aa` | 데스크탑 사이드바 w-80→w-96(384px) 확대 + 미니미 사이즈 밸런스 조정 |
| `adac4e0` | 요크셔/골든리트리버 미니미 대폭 확대 |
| `08e00a1` | 미니미 렌더링 PNG→픽셀데이터(MinimiRenderer)로 통일 |

### 상세 작업 내역

#### 1. suspicious-rhodes 브랜치 머지 (`69c0c8a`)
- 3개 커밋 머지 (모바일 UX 개선, 사이드바 스크롤 잠금, 말티푸 미니미 크기 축소)
- 3개 파일 충돌 해결:
  - AdminUsersTab.tsx: main 유지 (isAdmin prop)
  - AIChatPage.tsx: main 유지 (리팩토링된 AIChatHeader)
  - minimiPixels.ts: suspicious-rhodes 디자인 개선 채택 + 삭제된 6캐릭터는 main 유지

#### 2. 미니미 악세서리 시스템 전체 삭제 (`2eb4e6a`, -529줄)
- minimiPixels.ts: 빨간모자/선글라스/꽃왕관 데이터 + ACCESSORY_CATALOG 삭제
- MinimiClosetModal.tsx: accessory 탭/로직/UI 전부 제거 (캐릭터만)
- MinimiShopModal.tsx: accessory 관련 코드 제거
- 6개 API 라우트(catalog/purchase/sell/equip/inventory): accessory 관련 전부 제거

#### 3. 성능 최적화 (`aea93bf`) -- 기능 변경 없이 체감 속도 개선
- **페이지 코드스플리팅**: 5개 페이지 `next/dynamic` 적용 (HomePage만 정적 유지). 초기 번들 크기 대폭 감소
- **외부 API 캐싱**: usePetImages 모듈 레벨 캐시 (dog.ceo API 7건 → 세션당 1회)
- **이벤트 리스너 누수 수정**: useSmoothAutoScroll에서 factory 함수 대신 stable 참조 사용
- **GPU 부하 감소**: HomePage blur-3xl → blur-2xl + will-change 힌트
- **불필요한 동적 import 제거**: PetContext requestPointAward에서 이미 정적 import된 모듈 재import 제거
- **로딩 화면 최적화**: AuthContext에서 getSession 완료 즉시 loading=false, refreshProfile은 백그라운드 실행

#### 4. 포인트 트랜잭션 원자성 RPC (`aea93bf`)
- **SQL 마이그레이션 생성**: `supabase/migrations/20260222_point_transactions_rpc.sql`
  - `point_transactions` CHECK 제약 수정: `points_earned > 0` → `points_earned != 0` (차감 내역 허용)
  - `purchase_minimi_item` RPC: 중복체크+차감+지급+내역 단일 트랜잭션, FOR UPDATE 행잠금, unique_violation 예외처리
  - `sell_minimi_item` RPC: 보유확인+장착해제+삭제+환급+내역 단일 트랜잭션
  - `purchase_shop_item` RPC: 차감+내역+프리미엄효과 단일 트랜잭션
- **API 라우트 수정**: purchase/sell/shop 3개 API를 RPC 단일 호출로 대체 (기존 4~7단계 → 1단계)
- **파라미터명 수정**: points.ts `p_is_one_time` → `p_one_time` (SQL 함수와 일치)
- **중요**: SQL 마이그레이션은 Supabase 대시보드에서 직접 실행해야 활성화됨

#### 5. CSP 보안 헤더 추가 (`aea93bf`)
- next.config.js에 Content-Security-Policy 헤더 설정
- 허용 출처: self, Supabase(*.supabase.co/in), OpenAI(api.openai.com), 공공데이터(apis.data.go.kr)
- script-src: unsafe-eval/inline (Next.js 개발모드), style-src: unsafe-inline (Tailwind)
- object-src: none, base-uri/form-action: self

#### 6. 추모모드 전환 애니메이션 (`aea93bf`)
- 일상(하늘색) ↔ 추모(황금빛) 전환 시 `transition-all duration-700 ease-in-out` 적용
- Layout.tsx: 배경 그라데이션 + 헤더 + 하단 네비 전체 700ms 부드러운 전환
- 전환 순간 페이드 오버레이 (amber 또는 sky 30% 투명도, 700ms)
- Sidebar, AIChatPage, ChatHeader, ChatInputArea, ChatMessageList, PetProfileCard 등 10개 파일에 일관 적용
- globals.css에 `@keyframes modeTransitionFade` + `.mode-transition-overlay` 추가

#### 7. 데스크탑 사이드바 폭 확대 (`cf7b2aa`)
- Sidebar.tsx: `w-80`(320px) → `w-96`(384px)
- Layout.tsx: `xl:ml-80` → `xl:ml-96`
- 모바일 사이드바(w-64)는 변경 없음

#### 8. 미니미 캐릭터 사이즈 밸런스 (`adac4e0`, `08e00a1`)
- 골든리트리버: 16x16 그리드 풀 채움 (16col). 머리~몸통 양쪽 끝까지 확장
- 요크셔테리어: 15col. 리본 4px 확대, 양옆 긴 털 col 0까지 확장
- 말티푸: 11col 유지 (소형견)
- 크기 순서: 골든(16) > 요크셔(15) > 말티푸(11) -- 실제 견종 크기 반영

#### 9. 미니미 렌더링 PNG→픽셀데이터 통일 (`08e00a1`)
- **문제**: 상점/옷장에서 `imageUrl`(PNG 파일)을 우선 표시 → 픽셀 데이터 수정이 반영 안 됨
- CHARACTER_CATALOG에서 imageUrl 필드 삭제
- MinimiShopModal/MinimiClosetModal에서 `<img src={imageUrl}>` 분기 제거
- catalog API에서 imageUrl 전달 제거
- 모든 곳에서 `MinimiRenderer`(CSS box-shadow 픽셀)로 통일
- 렌더 사이즈 lg(6x) → xl(8x)로 확대

---

## 파일 변경 이력 (이번 세션, main 브랜치)

| 파일 | 변경 내용 |
|------|----------|
| `next.config.js` | CSP 보안 헤더 추가 |
| `src/app/globals.css` | 모드 전환 애니메이션 keyframes + 클래스 |
| `src/app/page.tsx` | 5개 페이지 next/dynamic 코드스플리팅 |
| `src/app/api/minimi/catalog/route.ts` | accessory 제거 + imageUrl 제거 |
| `src/app/api/minimi/purchase/route.ts` | RPC 단일 호출로 대체 |
| `src/app/api/minimi/sell/route.ts` | RPC 단일 호출로 대체 |
| `src/app/api/minimi/equip/route.ts` | accessory 관련 제거 |
| `src/app/api/minimi/inventory/route.ts` | accessory 관련 제거 |
| `src/app/api/points/shop/route.ts` | RPC 단일 호출로 대체 |
| `src/components/common/Layout.tsx` | 추모 전환 애니메이션 + xl:ml-96 |
| `src/components/common/Sidebar.tsx` | w-96 확대 + 추모 전환 애니메이션 |
| `src/components/features/minimi/MinimiShopModal.tsx` | accessory/imageUrl 제거, MinimiRenderer xl |
| `src/components/features/minimi/MinimiClosetModal.tsx` | accessory/imageUrl 제거, MinimiRenderer xl |
| `src/components/pages/AIChatPage.tsx` | 추모 전환 duration-700 |
| `src/components/pages/HomePage.tsx` | blur-2xl + will-change 최적화 |
| `src/components/features/chat/*.tsx` | 추모 전환 애니메이션 (5개 파일) |
| `src/components/features/record/PetProfileCard.tsx` | 추모 전환 duration-500 |
| `src/contexts/AuthContext.tsx` | 로딩 최적화 (getSession 후 즉시 UI) |
| `src/contexts/PetContext.tsx` | 불필요한 동적 import 제거 |
| `src/hooks/usePetImages.ts` | 모듈 레벨 캐시 추가 |
| `src/hooks/useSmoothAutoScroll.ts` | 이벤트 리스너 누수 수정 |
| `src/data/minimiPixels.ts` | 악세서리 삭제 + 캐릭터 사이즈 조정 + imageUrl 삭제 |
| `src/lib/points.ts` | p_is_one_time → p_one_time 수정 |
| `supabase/migrations/20260222_point_transactions_rpc.sql` | **신규** - 3개 RPC 함수 + CHECK 제약 수정 |

---

## 코드 리뷰에서 발견했으나 미수정인 이슈

### CRITICAL
1. ~~**포인트 구매 트랜잭션 원자성**~~ → **이번 세션에서 해결 완료** (RPC 3개)
2. **getPointsSupabase 키 혼용**: chat에서는 anon key, comments에서는 service role key 사용
3. **Rate Limiting 누락**: GET API 11곳+, 현재 메모리 기반은 Vercel 서버리스에서 비효과적 → Redis(Upstash) 권장

### HIGH
4. **useAIChat selectedPet 의존성**: 객체 참조가 의존성에 포함돼 불필요한 채팅 초기화 위험
5. **local-posts PATCH/DELETE 이중 검증 누락**: `.eq("user_id", user.id)` 없음 (TOCTOU)
6. **local-posts imageUrl 미검증**: javascript: URL 등 XSS 벡터 가능

### 수정필요 (리팩토링)
7. **타입 12개+ 파일에 흩어짐**: types/index.ts 외 산재
8. **미사용 export 타입 13개**: types/index.ts에서 export만 되고 사용 안 됨
9. **REGIONS/timeAgo 중복**: lostTypes.ts vs localTypes.ts 데이터 불일치

### 성능 관련 (조사 완료, 미수정)
10. **AuthContext/PetContext 단일 거대 Context**: 23개 값이 하나의 Context → 어디든 변경 시 전체 리렌더링. Context 분리 필요하지만 기능 영향 있어 보류
11. **탭 전환 시 완전 언마운트/재마운트**: 상태 유실 + API 재호출. display:none 또는 캐싱 고려
12. **OAuth 후 refreshProfile 이중 호출**: callback + onAuthStateChange 양쪽에서 호출

---

## 다음 할 일

### [긴급] 미니미 픽셀 아트 품질 수정 필요
- **문제**: VM 터미널 Claude가 미니미 픽셀 그리드를 시각적 확인 없이 숫자만 보고 수정함. 결과물 품질이 심각하게 떨어짐
- **대상 파일**: `src/data/minimiPixels.ts` - maltipooGrid, yorkshireGrid, goldenGrid 전부
- **요구사항**: 4번(비주얼 디자이너) 에이전트 투입해서 기존 디자인 원칙(실루엣 우선, SD비율, 좌상단 광원, 캐릭터당 3~5색) 지키면서 품질 높은 픽셀 아트로 재작업
- **사이즈 가이드**: 골든리트리버(대형) > 요크셔테리어(소형이지만 털 볼륨) > 말티푸(소형) 크기 차이 유지
- **렌더링**: PNG 아닌 MinimiRenderer(CSS box-shadow)로 렌더링되므로 gridToPixels 함수에 맞는 16x16 그리드 형식 유지

### 기타
- **SQL 마이그레이션 실행**: `20260222_point_transactions_rpc.sql`을 Supabase 대시보드 SQL Editor에서 실행 (RPC 활성화)
- **사이드바 순서 변경 (선택)**: 포인트/미니미 위젯을 네비게이션 아래로 이동 (승빈님 판단 대기)
- **local-posts 보안**: PATCH/DELETE에 `.eq("user_id")` 이중 검증 추가 + imageUrl 검증
- **Rate Limiting 업그레이드**: Upstash Redis 도입 (승빈님 계정 세팅 필요)
- **결제 연동**: 포트원(PortOne) 연동 (승빈님 포트원 계정/상점ID 필요)
- other 타입 전용 동물 아이콘 제작 (이미지 에셋 필요)

---

## VM 환경 설정
- **GitHub CLI**: `gh` v2.45.0 설치됨 (`apt`)
- **Git 인증**: `~/.git-credentials`에 PAT 저장 (credential.helper store)
  - 토큰 만료: 2026-05-22 (90일)
  - 권한: `repo`
  - push 시 토큰 직접 추출 방식 사용: `TOKEN=$(cat ~/.git-credentials | grep github.com | sed ...) && git push "https://${TOKEN}@github.com/..." main`

---

## 아키텍처 참고

### 관리자 인증 흐름
```
AuthContext.refreshProfile()
  -> supabase.from("profiles").select("is_admin, ...")
  -> emailAdmin = ADMIN_EMAILS.includes(email)
  -> dbAdmin = data.is_admin === true
  -> setIsAdminUser(emailAdmin || dbAdmin)
```

### 레벨 아이콘 표시 흐름
```
LevelBadge(points, petType, isAdmin)
  -> isAdmin ? ADMIN_ICONS[petType] : level.icons[petType]
  -> showName이면 isAdmin ? "ADMIN" : "Lv.X"
```

### 미니미 렌더링 흐름 (변경됨)
```
CHARACTER_CATALOG[].pixelData (16x16 그리드 -> box-shadow 문자열)
  -> MinimiRenderer(pixelData, size="xl")
  -> CSS box-shadow로 픽셀 렌더링 (1px * scale)
  -> 사이즈: xs(2x) sm(3x) md(4x) lg(6x) xl(8x)
PNG imageUrl은 더 이상 사용하지 않음
```

---

## 주의사항
- CLAUDE.md, AGENTS.md의 오케스트레이션 규칙 반드시 따를 것
- types/index.ts에서 타입 관리 (컴포넌트 자체 정의 금지, 단 admin/types.ts는 예외)
- 직접적 죽음/사망 표현 금지 ("무지개다리", "이곳" 등 완곡 표현 사용)
- ~~dynamic import 사용 금지~~ → 페이지 단위 `next/dynamic`은 허용 (성능 최적화), 모달/컴포넌트 단위는 금지
- worktree에서 수정 후 메인 폴더에도 반드시 동기화할 것
- 배포는 메인 폴더에서 git push origin main -> Vercel 자동 배포
- 이미지 캐시 문제 시 URL에 `?v=N` 쿼리 파라미터 추가
- 권한 받으면 물어보지 말고 실행 (승빈님이 자거나 외출 중이면 끝내놓기)
