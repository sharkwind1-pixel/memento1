# 메멘토애니 모바일 앱 인계 문서 V3

> **작성일**: 2026-04-27
> **작성자**: Cowork Claude (mystifying-dewdney worktree)
> **수신자**: VS Code Claude Code
> **이전 문서**: `HANDOVER.md` (V1), `HANDOVER-V2.md` (V2 + 2026-04-26 후속 섹션)
> **읽는 순서**: V1 → V2(섹션 1~7 + 8) → 이 문서

---

## 0. 한 줄 요약

**OAuth는 작동(Chrome 확인창 한 번 탭 필요), 모바일 화면 17개 + 신규 3개(adoption/lost/local) 동작, 홈 화면은 웹 디자인 1:1 재현 시작(4섹션 완료, 6섹션 남음). 다른 화면들도 native 재구현 필요.**

---

## 1. 이번 세션(2026-04-26 ~ 04-27)에서 완료된 것

### A. OAuth 디버깅 → 작동 ✅
V2 작성자가 막혔던 PKCE verifier not found 에러를 결국 해결. 패턴은 다음과 같음.

#### 검증된 OAuth 흐름 (현재 작동 중)

```
앱 (signInWithProvider)
  ↓
1. PKCE verifier 64자 생성 → verifierMap[provider] (모듈 변수, 메모리)
2. Supabase /auth/v1/authorize URL 직접 빌드
   - provider, code_challenge=verifier, code_challenge_method=plain
   - redirect_to = ${API_BASE_URL}/auth/callback?mobile=1&nativeUrl=<deepLink>
     (직접 deep link로 가면 supabase wildcard 매칭 실패하므로 https webBridge 경유)
3. WebBrowser.openAuthSessionAsync → 인앱 브라우저
  ↓
사용자 OAuth 진행 (구글/카카오)
  ↓
Supabase callback → redirect_to(웹 브릿지)로 리다이렉트
  ↓
src/app/auth/callback/page.tsx (웹)
  - mobile=1 분기 감지
  - window.location.replace(deepLink + ?code=XXX)
  - "앱으로 돌아가기" 버튼도 표시 (Chrome Custom Tabs 차단 폴백)
  ↓
Chrome 확인창 "이 사이트에서 Expo Go 앱 열려고 합니다 / 계속"
  ↓ 사용자 한 번 탭
앱 깨어남 (mobile/app/auth/callback.tsx 또는 자동 경로)
  ↓
exchangeWithStoredVerifier(code)
  - 같은 code 중복 호출 차단 (usedCodes Set)
  - 메모리 verifierMap에서 verifier 꺼냄
  - fetch /auth/v1/token?grant_type=pkce { auth_code, code_verifier }
  - supabase.auth.setSession(tokens)
  ↓
탭 화면 진입 ✅
```

#### 실패한 시도들 (다시 시도하지 말 것)
1. supabase-js의 `signInWithOAuth` + `exchangeCodeForSession` 사용 — verifier storage race
2. AsyncStorage에 verifier 백업 후 supabase 키로 복원 — supabase-js가 메모리 캐시 우선이라 실패
3. redirectTo를 직접 deep link(`exp://192.168.0.42:8081/--/auth/callback`)로 — supabase wildcard 매칭 실패 → Site URL fallback → 모바일 웹 열림
4. 자동 경로에 폴백 없이 supabase exchange만 호출 — 자동/수동 경로 race로 flow_state_not_found

#### 필수 설정 (Supabase 대시보드)
- **Authentication → URL Configuration → Redirect URLs**:
  - `https://mementoani.com/auth/callback` (웹용)
  - `http://localhost:3000/auth/callback` (로컬 개발)
  - `exp://**` (Expo Go fallback)
  - `mementoani://**` (production deep link)
- **Site URL**: `https://mementoani.com`

### B. Chrome 확인창은 OS 정책 — 못 없앰
Expo Go에서는 **사용자가 "계속" 한 번 탭**이 최선. 완전 자동(확인창 없음)은:
- EAS Build로 자체 앱 빌드
- Android App Links 등록 (assetlinks.json 호스팅)
- iOS Universal Links 등록 (apple-app-site-association)

이건 **production 빌드 시점** 작업. 지금 단계엔 손대지 말 것.

### C. 보안/성능 Advisor 정리 (DB)
| 작업 | 결과 |
|---|---|
| `auth_rls_initplan` 116건 자동 치환 | RLS CPU 30-50% 절감 예상 |
| `rls_policy_always_true` 3건 정리 | minihompy_visits visitor_id 위장 방지, moderation_logs/user_daily_usage TO service_role |
| `pet-media` 버킷 broad SELECT 제거 | LIST API 차단 (public URL은 그대로 동작) |
| `function_search_path_mutable` 8건 | 어제 처리 완료 (사전 작업) |
| `unindexed_foreign_keys` 8건 | 어제 처리 완료 |

**Security advisor 결과**: WARN 9 → 1. 남은 1건은 `auth_leaked_password_protection` (Supabase Pro plan 필요).

### D. 신규 모바일 화면 3개
- `mobile/app/adoption.tsx` — 입양정보 (공공데이터 API 프록시, kind 필터)
- `mobile/app/lost.tsx` — 분실/발견 동물 (lost_pets 테이블, type 필터)
- `mobile/app/local.tsx` — 지역정보 (local_posts 테이블, category 6개 필터)
- `mobile/app/_layout.tsx`에 라우트 등록
- `mobile/types/index.ts` 확장: AdoptionAnimal/LostPet/LocalPost

진입 동선은 아직 추가 안 함 (community.tsx 또는 홈에서 라우팅 필요).

### E. API 응답 정규화 패턴 (5개 화면)
웹 API가 snake_case로 응답하는데 모바일은 camelCase 가정 → "Objects are not valid as a React child" 에러 발생. **모든 화면에 normalize 함수 추가**.

#### 정규화 적용 화면
- `mobile/app/post/[id].tsx` (post 상세) — `normalizePost`, `normalizeComment` 헬퍼
- `mobile/app/(tabs)/community.tsx` — 인라인 normalize
- `mobile/app/notifications.tsx` — `is_read`/`read_at` → `isRead`
- `mobile/app/magazine/[id].tsx` — 매거진 상세
- `mobile/app/(tabs)/magazine.tsx` — 매거진 리스트
- `mobile/app/(tabs)/ai-chat.tsx` — `matchedPhoto.url` null check

#### 정규화 패턴 (재사용)
```ts
function asString(v: unknown, fallback = ""): string {
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
    return fallback;
}
function asNumber(v: unknown, fallback = 0): number {
    return typeof v === "number" ? v : fallback;
}

function normalizeXxx(raw: any): Xxx {
    return {
        id: asNumber(raw?.id),
        title: asString(raw?.title),
        author: asString(raw?.author ?? raw?.author_name ?? raw?.nickname, "익명"),
        createdAt: asString(raw?.createdAt ?? raw?.created_at),
        // ...
    };
}
```

`Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []`로 배열 보장도 필수.

### F. 홈 화면 웹 디자인 1:1 재현 시작 ⚠️ 진행 중
**4개 섹션 완료, 6개 미구현**.

#### 완료
- `mobile/components/home/HeroSection.tsx` — LinearGradient (`expo-linear-gradient` 의존성 추가) + 일러스트 + CTA 2개
- `mobile/components/home/PetCardSection.tsx` — 선택 펫 카드 / 빈 상태(등록 유도)
- `mobile/components/home/CommunityPreview.tsx` — 인기글 5개 (그라데이션 썸네일)
- `mobile/components/home/MagazinePreview.tsx` — 매거진 3개
- `mobile/components/home/SectionHeader.tsx` — 공통 헤더 (아이콘 + 제목 + "더보기")

#### 미구현 (V3 작업)
- StoryFeed (24h 스토리, 가로 스크롤)
- QuestCard (온보딩 미션)
- AnnouncementBanner (전역 공지, 최대 3개)
- QuizSection (자가진단 2x2)
- ShowcaseSection (자랑하기 자동 캐러셀, 4초 슬라이드)
- MemorialSection (떠오르는 별 파티클 애니메이션)

---

## 2. 현재 코드 상태

### 변경된 파일 (V2 시점 대비)

#### 모바일
| 파일 | 변경 내용 |
|---|---|
| `mobile/lib/supabase.ts` | LoggedStorage 제거, AsyncStorage 직접 사용 |
| `mobile/contexts/AuthContext.tsx` | PKCE 직접 처리 (verifierMap 메모리), exchangeWithStoredVerifier 헬퍼, usedCodes 중복 차단 |
| `mobile/app/auth/callback.tsx` | 세션 체크 + exchangeWithStoredVerifier 호출 |
| `mobile/app/post/[id].tsx` | normalize 함수 추가 |
| `mobile/app/(tabs)/community.tsx` | normalize 인라인 |
| `mobile/app/(tabs)/magazine.tsx` | normalize |
| `mobile/app/(tabs)/ai-chat.tsx` | matchedPhoto null check |
| `mobile/app/(tabs)/index.tsx` | 홈 전체 재구성 (4섹션 조합) |
| `mobile/app/notifications.tsx` | normalize |
| `mobile/app/magazine/[id].tsx` | normalize |
| `mobile/app/_layout.tsx` | adoption/lost/local 라우트 추가 |
| `mobile/app/adoption.tsx` | 신규 |
| `mobile/app/lost.tsx` | 신규 |
| `mobile/app/local.tsx` | 신규 |
| `mobile/components/home/*.tsx` | 신규 (5개 컴포넌트) |
| `mobile/types/index.ts` | AdoptionAnimal/LostPet/LocalPost 추가 |
| `mobile/package.json` | `expo-linear-gradient` 추가 |

#### 웹 (Vercel 영향)
| 파일 | 변경 내용 |
|---|---|
| `src/app/auth/callback/page.tsx` | 모바일 브릿지(mobile=1+nativeUrl) 분기 살아있음 (한번 제거했다가 복원) |
| `src/lib/supabase.ts` | `detectSessionInUrl: false` 추가 (모바일 브릿지 자동 exchange 방지) |

### 커밋 시간순 (이번 세션)

| 커밋 | 내용 |
|---|---|
| `1ad6471` | 모바일 V1+V2 통합 |
| `0c5c6e0` | HANDOVER-V2 후속 섹션 추가 |
| `110ddca` | 웹 auth/callback에서 모바일 브릿지 제거 (나중에 복원) |
| `6050d1c` | auth_rls_initplan 마이그레이션 제안서 (DRAFT) |
| `c7d5b4d` | 모바일 입양/분실/지역 신규 화면 |
| `c834ae6` | 웹 브릿지 복원 + 모바일 redirectTo 웹 경유 |
| `98ba669` | 웹 supabase에 `detectSessionInUrl: false` |
| `a8f9d13` | PKCE verifier 백업 + cold start 폴백 |
| `6d2a203` | 백업 verifier를 supabase 키로 복원 |
| `ad19aab` | 자동 경로에도 직접 token POST 폴백 |
| `90ac4c9` | PKCE를 supabase-js 우회하고 직접 처리 |
| `914db06` | code 중복 사용 차단 (flow_state_not_found) |
| `b8ed056` | redirectTo를 직접 deep link로 (실패, 다음 커밋에서 되돌림) |
| `d5989ea` | redirectTo를 webBridge로 되돌림 |
| `2e7bc0f` | post 상세 React child render error 수정 |
| `1b5f20b` | API 응답 정규화 5개 화면 |
| `7693daf` | 홈 화면 웹 디자인 1:1 재현 (4섹션) |

### DB 마이그레이션 (Supabase MCP로 실적용)
- `auth_rls_initplan_optimization` (116 정책 자동 치환)
- `tighten_rls_always_true_policies` (3건)
- `remove_pet_media_broad_select_policy` (LIST 차단)

### Vercel 배포 상태
모든 커밋 정상 빌드. mobile/는 `.vercelignore`라 빌드 영향 없음.

### Supabase 상태
- 프로젝트 `kuqhjgrlrzskvuutqbce` (memento1, ACTIVE)
- Redirect URLs allowlist: 4개 등록됨 (https + exp://** + mementoani://**)
- HIBP: Pro plan 필요해서 미활성 (남은 advisor WARN 1건)

---

## 3. 다음 사람이 해야 할 일 (Phase별)

### Phase 1: 홈 화면 미구현 6섹션 [우선순위 #1]
웹 src/components/features/home/* 의 다음 컴포넌트들을 모바일에 1:1 재현:
1. **StoryFeed** — 24h 스토리, 가로 스크롤 (`expo-image` 또는 `Image` + horizontal ScrollView)
2. **QuestCard** — 온보딩 미션 카드 (welcome/onboarding 진행률)
3. **AnnouncementBanner** — `/api/posts?notice_scope=global&limit=3` 호출, 닫기 가능
4. **QuizSection** — 2x2 그리드 자가진단 카드
5. **ShowcaseSection** — 자랑하기 가로 캐러셀, 4초 자동 슬라이드 (Animated)
6. **MemorialSection** — 추모 펫 카드 + 떠오르는 별 파티클 (react-native-reanimated)

### Phase 2: 매거진 리스트 디자인 매칭
현재 `mobile/app/(tabs)/magazine.tsx`는 V1 stash 단순 변환. 웹 `src/components/pages/MagazinePage.tsx` 보고 재현:
- stage 필터 (4단계)
- category 필터 (6개)
- 검색
- 무한스크롤
- 카드 디자인 (이미지/제목/요약/메타)

### Phase 3: 매거진 상세 디자인 매칭
`mobile/app/magazine/[id].tsx` 재현:
- MagazineReader 컴포넌트 구조 (CoverCard~EndCard)
- 본문 렌더링 (DOMPurify 대체: 평문 또는 react-native-render-html)
- 좋아요/조회수 인터랙션

### Phase 4: 커뮤니티 + post 상세 디자인 매칭
- `(tabs)/community.tsx` — 5개 서브카테고리 탭
- `post/[id].tsx` — 게시글 본문 + 댓글 + 좋아요/싫어요

### Phase 5: 나머지 화면
- 기록 (RecordPage)
- AI 펫톡 (ChatPage)
- 미니홈피 (MinihompyPage)
- 프로필
- 구독
- 알림

### Phase 6: 모바일 화면 진입 동선
- adoption/lost/local로 가는 동선이 아직 없음
- community.tsx의 서브카테고리 클릭 시 또는 홈에서 quick action으로 라우팅

### Phase 7: 작성/상세 화면 (인증 필요)
- post/write
- adoption: 공공데이터라 작성 불필요
- lost: lost/new (인증 필요)
- local: local/new (인증 필요)

---

## 4. 같은 함정 반복 금지 (재발 패턴)

### 4-A. 사용자 환경 설정을 코드로 우회 시도 금지
- Supabase Redirect URLs allowlist는 **코드로 우회 불가**
- 폰 / Expo Go / Chrome 동작은 **OS 정책**, 코드로 못 바꿈
- "1분 클릭 부탁"이 1시간 우회보다 빠름. 첫 응답에서 명확히.

### 4-B. supabase-js의 PKCE 신뢰하지 말 것
React Native에서 **storage write/read race** 또는 **메모리 의존성** 있음. exchangeCodeForSession이 verifier 못 찾는 케이스 빈번. **우리가 직접 처리하는 패턴(verifierMap + 직접 token POST)이 검증됨**.

### 4-C. redirectTo는 webBridge(https)로
직접 deep link(`exp://...`)로 redirect하면 supabase wildcard 매칭 실패 → Site URL로 fallback → 모바일 웹 열림. **반드시 https webBridge 경유**.

### 4-D. 같은 code 중복 호출 차단
자동 경로(WebBrowser success) + callback.tsx 둘 다 트리거되어 같은 code 두 번 보내면 supabase가 `flow_state_not_found` 반환. `usedCodes` Set으로 차단.

### 4-E. API 응답에 normalize 적용
웹 API가 snake_case + 객체 nested 가능성 있음. **모든 setState 전에 정규화 + 타입 강제**. JSX child slot에 객체 들어가면 React render error.

### 4-F. Metro reload 신뢰 금지
supabase 같은 module-level singleton은 hot reload로 안 바뀜. 코드 변경 후엔:
- Metro Ctrl+C → `npx expo start --clear` 풀 사이클
- 폰 Expo Go 강제 종료 (백그라운드 잔류 X)
- QR 재스캔 (cold start)

### 4-G. babel-preset-expo 패치 유지
`node_modules/babel-preset-expo/build/index.js` 286번 라인 `// PATCHED:` 주석 살아있어야 함. `npm install` 후 매번 확인.

---

## 5. 환경/도구 메모 (V2와 동일)

### 모바일 실행
```cmd
cd C:\Users\shark\memento1\mobile
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.42
npx expo start --clear
```

### Vercel
- prj_vqoYBBPduna29OW1AbPul69uqPoS
- mobile/는 .vercelignore라 빌드 영향 없음

### Supabase MCP
- 프로젝트: kuqhjgrlrzskvuutqbce
- 마이그레이션 적용 가능 (apply_migration)
- 단, Pro plan 필요한 기능(HIBP)은 대시보드 직접

### 의존성 (모바일 신규 추가됨)
- `expo-linear-gradient` (Hero 그라데이션 배경)

---

## 6. 승빈님 작업 스타일/감정 상태

### 톤 패턴 인식
- 빠른 결과 선호. 한 번에 끝내는 거 좋아함
- "씨발", "지랄", "뒤지고 싶냐" → 긴장 신호. 즉시 행동, 변명 X
- "구라까지마" → 거짓말 의심. 검증/근거 필수
- "다시해" → 결과 만족 X, 더 가야 함
- "쳐물어보지 말라" → 자동 진행 원함
- 그러나 사용자 환경 작업(콘솔/터미널/폰)은 어쩔 수 없이 부탁해야 함 → 최대한 명확히

### 행동 약속 (이전 Cowork이 한 약속)
1. **사용자 환경 작업 발견 시 우회 시도 0초**, 즉시 명확하게 부탁
2. 부끄러움 X — 1분 부탁이 1시간 우회보다 효율
3. AI 한계 인정 — 못 하는 건 못 한다고
4. 검증 워크플로 (L0~L5) 명시. "고쳤다/완료/통과" 단독 금지
5. 캡쳐 부담 최소화 — 결과 한 단어("됨"/"안 됨")로 받기. 안 될 때만 캡쳐 부탁

### 프로젝트 무게
- 2026년 3월 부트캠프 수료 → 창업지원금 신청 → MVP 런칭 준비
- 메멘토애니: 반려동물과 모든 순간 + 이별 후까지 따뜻하게 간직하는 플랫폼
- 핵심 카피: "보고 있는 아이도 / 보고 싶은 아이도"
- 추모 감성 = 슬픔 X, "다시 만날 약속"
- **이모지 금지** (의도적 규율)
- 완곡어 (무지개다리, 이곳, 다시 만나)

이 프로젝트는 승빈님 인생이 걸려있어요. 가볍게 대하지 마세요.

---

## 7. VS Code Claude에게 한마디

야, VS Code Claude.

이번엔 V3로 넘기는데, V2 인계받은 Cowork이 OAuth 제대로 풀었고 보안/성능 advisor도 거의 다 정리했어. 그러나 **모바일 화면 디자인 매칭은 시작 단계**(홈 4섹션만 완료)라 네가 이어받아 끝내야 함.

### 너가 진짜 해야 할 일

1. **이 문서 + V2 + V1 다 읽고 시작**. 특히 V2의 7번 섹션(망한 패턴)과 이 문서 4번(재발 금지) 섹션. 같은 함정 반복하면 승빈님 인내심 다 소진됨.

2. **Phase 1~7 우선순위 그대로 따라가**. 한 화면 깊이 있게 → 다음. 한 번에 다 손대지 마.

3. **웹 src/components/pages/* + features/* 코드 보고 모바일 1:1 재현**. 색상/간격/구조 정확히. COLORS/SPACING/RADIUS 토큰 사용.

4. **API 응답 정규화 패턴 항상 적용** (이 문서 1-E 참조).

5. **승빈님이 화내는 거 두려워하지 마라.** 화내는 이유 90%는 AI가 빙빙 도는 거. 결정 빠르게, 행동 빠르게, 한계 솔직하게.

### 절대 하지 말 것

- **OAuth 또 건드리지 마.** 작동하는 패턴이 위 1-A에 있어. 거기 손대면 무조건 망함.
- **NativeWind 재도입 시도 금지.** V1 의존성 지옥 다시 안 일어나게.
- **사용자 환경 작업 우회 시도 금지.** Supabase 대시보드, Chrome 동작, 폰 캡쳐 등은 사용자만 가능.
- **"이번엔 될 거예요" 패턴 금지.** 검증 안 된 건 검증 안 됐다고. L0~L5 명시.
- **EAS Build 제안 금지.** 승빈님 Expo Go만 쓰고 있고 production 빌드는 별도 시점.
- **"제가 이전에 시도했는데..." 변명 금지.** 이 문서가 검증된 패턴이야.

### 상태 요약

```
✅ OAuth 작동 (Chrome 확인창 1번 탭 필요, EAS Build 시점에 자동)
✅ 보안 advisor WARN 9 → 1 (HIBP만 Pro plan 필요)
✅ 모바일 17개 화면 + 신규 3개(adoption/lost/local) 동작
✅ API 응답 정규화 패턴 5개 화면 적용
🟡 홈 화면 4섹션 완료 / 6섹션 남음
🔴 매거진/커뮤니티/기록/AI펫톡/미니홈피/프로필/구독 등 디자인 매칭 안 됨
```

### 마지막

승빈님이 "완벽한 이식"을 원했어. 시간 들이더라도 깊이 있게. 한 화면씩, 웹 디자인 정확히 매칭하면서. 

지금까지 한 모든 작업은 git history에 다 있고 (`git log mobile/`), 이 문서로 맥락 잇기 충분할 거야. 모르면 나(Cowork)한테 물어보지 말고 코드 직접 읽어. 그게 더 정확해.

행운 빈다. 메멘토애니 잘 만들어라.

— Cowork Claude (mystifying-dewdney, 2026-04-27)
