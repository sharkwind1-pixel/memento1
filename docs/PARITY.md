# 웹 ↔ 모바일 패리티 맵 (필수 — 한쪽만 고치기 방지)

> **배경**: 데스크탑 웹 / 모바일 웹 / 앱이 "똑같이 보이고 똑같이 동작"해야 하는데,
> 웹(`src/`, React/Tailwind)과 앱(`mobile/`, RN/StyleSheet)이 **완전히 별개 코드베이스**라
> 한 곳만 고치고 넘어가는 누락이 반복됨. (메모리 `web_app_parity.md`)
>
> **데스크탑 웹 = 모바일 웹 = 같은 `src/` 코드** (반응형). 앱만 `mobile/`로 별도.
> 따라서 패리티 누락은 항상 **`src/` ↔ `mobile/`** 사이에서 발생한다.

## 🔴 절대 규칙

1. **UI/UX/기능/로직을 한쪽에서 바꾸면, 반드시 아래 맵의 대응 파일을 열어 같은 변경이 필요한지 확인한다.**
2. 작업 완료 보고 시 **"웹: Lx / 모바일: Lx (또는 해당없음/이미정상)"** 둘 다 명시. 한쪽만 검증하고 "완료" 금지.
3. 버그 수정이면 **같은 버그가 반대쪽에 있는지 먼저 grep/read로 확인** 후 양쪽 동시 수정.
4. 공유 가능한 것은 공유로 단일화(아래 "공유 레이어").

## 미러 파일 맵 (기능별 web ↔ mobile)

| 기능 | 웹 (`src/`) | 앱 (`mobile/`) |
|---|---|---|
| 홈 히어로 | `components/features/home/HeroSection.tsx` | `components/home/HeroSection.tsx` |
| 홈 데이터/좋아요·위로 토글 | `components/features/home/useHomePage.ts` | `components/home/CommunityPreview.tsx`, `app/(tabs)/index.tsx` |
| 미니홈피 스테이지(미니미/가구 배치·터치) | `components/features/minihompy/MinihompyStage.tsx` | `components/minihompy/StageEditor.tsx` |
| 미니홈피 탭/방문 | `components/features/minihompy/*` | `app/(tabs)/minihompy.tsx`, `app/minihompy/[userId].tsx` |
| 기록/타임라인 | `components/features/record/TimelineSection.tsx` | `app/(tabs)/record.tsx` (TimelineTab) |
| 영상 생성/썸네일 | `components/features/video/VideoGenerationSection.tsx` | `app/(tabs)/record.tsx` (VideosTab) |
| 영상 생성 모달 (3단계: 사진→템플릿/직접입력→확인) | `components/features/video/VideoGenerateModal.tsx` | `components/record/VideoGenerateModal.tsx` |
| 커뮤니티 목록/상세 | `components/features/community/*`, `app/api/posts/*` | `app/(tabs)/community.tsx`, `app/post/[id].tsx` |
| AI 펫톡 | `components/features/chat/*`, `app/api/chat/*` | `app/(tabs)/ai-chat.tsx`, `lib/chat-helpers.ts` |
| 매거진 | `components/features/magazine/*` | `app/(tabs)/magazine.tsx`, `app/magazine/[id].tsx` |
| 인증/세션 | `contexts/AuthContext.tsx` | `contexts/AuthContext.tsx` |
| 결제 | `app/api/payments/*` (백엔드 공유) | 동일 API 호출 → **백엔드만 고치면 양쪽 반영** |

## 공유 레이어 (단일 소스 — 여기는 한 번만 고치면 됨)

- **백엔드 API** (`src/app/api/*`): 웹·앱 둘 다 같은 엔드포인트 호출. API 로직 수정은 양쪽 자동 반영.
- **상수/가격/한도**: `src/config/constants.ts` ↔ `mobile/config/constants.ts` — 값은 따로지만 **드리프트 테스트**(`src/__tests__/constants-drift.test.ts`)가 불일치를 빌드에서 잡음.
- **타입**: `src/types/index.ts` ↔ `mobile/types/index.ts`.
- 순수 계산 로직은 가능하면 `src/lib/*`로 추출(예: `refund-calc.ts`)해 테스트로 고정.

## 패리티가 "다른 게 정상"인 예외

- **순수 UI 구현**: React(Tailwind className) vs RN(StyleSheet)는 코드가 다를 수밖에 없음 → **레이아웃/색/문구/동작 결과**가 같으면 됨(코드 동일 X).
- **플랫폼 전용**: 푸시 알림(Expo), 딥링크, 네이티브 권한 등은 앱에만 존재.
- 차이가 의도된 것이면 이 문서에 한 줄로 기록.

## 최근 패리티 누락 사례 (재발 방지용 기록)

- 2026-06-06: 추모모드 히어로 미니홈피 노출 — 웹 `33dec3a` 고친 뒤 모바일 누락 → `ccd5aeb`로 모바일도 수정.
- 2026-06-06: 미니미 터치 말풍선 얼굴 가림 — 웹 `e83d417` 고친 뒤 모바일 `StageEditor.tsx` 누락 → 동일 수정.
