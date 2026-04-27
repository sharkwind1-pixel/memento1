# HANDOVER V4 — 모바일 웹→Expo 전수 이식 (2026-04-27)

**대상**: 다음 세션 Claude / Cowork Claude Coding
**원칙**: 승빈님이 "웹에서 진행한 모든 내용이 전부 앱으로 이식되어야 한다"고 명시. 다중 세션 작업.

---

## 0. 큰 그림

웹 (Next.js, mementoani.com) 기능을 Expo SDK 54 React Native 앱에 1:1 이식하는 중.
- 5개 탭 (기록/커뮤니티/홈/AI펫톡/매거진) + 미니홈피(href:null)
- 입양/지역/분실 독립 스택 화면
- 게시글 상세/작성, 펫 등록, 미디어 업로드 등 모달

---

## 1. 완료된 작업 (커밋 해시 포함)

### 홈 화면 (전체 갈아엎음)
| 컴포넌트 | 커밋 | 핵심 변경 |
|---------|------|---------|
| HeroSection | `f5cf72b` | 로고 → hero-illustration.png(아이+강아지), rounded 카드 |
| CommunityPreview | `8502dd7` | 5 그라데이션 썸네일, 좋아요 토글 + 햅틱 + 하트팝 |
| QuizSection + QuizModal | `8502dd7` | mobile/lib/petQuizzes.ts 복사 + 풀 모달 |
| MemorialSection + DetailModal | `706c30c` | 위로 토글 + 8개 프리셋 + 메시지 삭제 |
| StoryFeed + Viewer + CreateModal | `064bff4` | expo-image-picker + Supabase pet-media 업로드 |
| StoryFeed 라벨 클립 fix | `3146337` | minHeight + gap → marginRight |
| AppHeader/AppDrawer 5탭 통합 | `22466c0` | 햄버거 → 9 메뉴 + 4 계정 |

### 기록 탭
| 기능 | 커밋 | 비고 |
|------|------|------|
| Timeline CRUD | `f5aea0a` | TimelineWriteModal + supabase.from() 직접 호출 |
| **펫 등록 4단계 마법사** | `8851bb3` | Step1~4 + Memorial 분기 + 단계 인디케이터 |
| **미디어 업로드 모달** | `a0323f0` | MediaUploadModal: 다중 선택 + 캡션 + Supabase 업로드 |
| **사진 라이트박스** | `fa56a81` | PhotoLightbox: 풀스크린 가로 스와이프 |

### 커뮤니티 / AI펫톡 / 매거진 / 입양·지역·분실
| 작업 | 커밋 | 비고 |
|------|------|------|
| 모든 푸시 화면 AppHeader 통일 | `e5c34c1` | post/[id], post/write, profile, subscription, notifications, pet/new, magazine/[id] |
| 입양/지역/분실 UX 정리 | `de6c100` | 칩 패턴 통일 + AppHeader + 페이지별 색상 |
| 입양/지역/분실 FAB 안전영역 | `888b9b9` | useSafeAreaInsets로 홈바 회피 |
| AI펫톡 입력 안전영역 + 빈 상태 CTA | `f5c4b83` | 80x80 컬러 원 + '반려동물 등록' 버튼 |
| 커뮤니티 FAB 탭바 회피 | `7ea52f5` | bottom: 84 + insets.bottom |

### 공통 / 버그 픽스
| 작업 | 커밋 | 비고 |
|------|------|------|
| 푸터 탭 라벨 native | `35beb30`, `1ba7ff5` | adjustsFontSizeToFit + Dimensions/5 |
| 칩 클립 다회 수정 | `6d2e26a`, `67c0595`, `b88eab0` | borderWidth 제거, marginRight, paddingHorizontal 18 |
| 헤더 프로필 → 레벨 아이콘 | `19340c3` | public/icons/levels/* → mobile/assets/levels |
| profiles.bio 컬럼 제거 | `f2ff7be` | DB에 bio 없음 (42703 에러) |
| React key 중복 fix | `299af1b`, `1074695`, `b6e15af` | Supabase UUID는 string, number+0 fallback 금지 |
| 푸터 탭 잘림 → native label | `c5c8107` | flex 계산 안됨, native 시스템 사용 |
| 웹 카카오 로그인 복구 | `9880b81` | detectSessionInUrl 조건부 (?mobile=1만) |

### V3 (이전 세션) 완료 항목
- 17 화면 NativeWind → StyleSheet
- OAuth (Naver/Kakao/Google) 웹 브릿지 + PKCE 직접 처리
- DB 마이그레이션 (local_posts, lost_pets) 적용
- RLS 116건 auth_rls_initplan 자동 치환
- 6 home 섹션 V3 신규 추가 (Announcement, Story, Quest, Showcase, Quiz, Memorial)
- Magazine list/detail Phase 2-3 (스테이지 카드, 토픽 칩, 4 카드뷰, like+share)
- Community Phase 4 (5 서브카테고리 LinearGradient)
- Record Phase 5-A (4 서브탭)
- AI chat Phase 5-B (8 emotion 배지)
- Lost/Local Phase 7 (분리 화면 + 작성 폼)

---

## 2. 남은 작업 — 우선순위 순

### High (다음 세션 첫 우선)
1. **사진 다중 선택/삭제** — GalleryTab에 길게 누르기 → 선택 모드, 체크박스 다중 → 일괄 삭제 + 개별 삭제 (현재 라이트박스만 있음)
2. **AI 앨범 상세 뷰어** — `MemoryAlbumViewer` 모달. 앨범 카드 클릭 시 사진 슬라이드. 웹 `src/components/features/record/MemoryAlbumViewer.tsx` 참조
3. **AI 영상 생성** — VideoGenerateModal: 프롬프트 입력 + 상태 추적 + 결과 영상 표시. 웹 `src/components/features/video/VideoGenerateModal.tsx` 참조
4. **펫 카드 그리드** — 여러 펫 보유 시 전환 UI. 웹 `src/components/features/record/PetCardGrid.tsx` 참조. 현재 모바일은 selectedPet 단일 표시

### Medium
5. **AI펫톡 리마인더 통합** — `pet_reminders` 표시/추가. 웹은 채팅 헤더에 reminder 버튼
6. **AI펫톡 일일 사용량 인디케이터** — "5/10 today" 표시 (free 10/basic 50/premium ∞)
7. **매거진 상세 좋아요/공유 정밀화** — 이미 일부 구현, KakaoShare 통합 등
8. **커뮤니티 게시글 상세 추가 액션** — 신고/삭제/공유 메뉴

### Low
9. 프로필/구독/알림 풀 기능 (수정/관리 모달)
10. 게스트 화면 (RecordPageGuest 포팅)
11. QuestCard "전체 단계 보기" 펼치기 (web에는 있음)
12. 미니홈피 정밀화 (꾸미기 모달, 방문록 등)

### 외부 작업 (승빈님 직접 처리 필요)
- KCP 결제 심사
- Apple App Store / Google Play 등록
- Supabase 대시보드 OAuth redirect URLs 추가 (`exp://**`, `mementoani://**`)
- pet-media Supabase Storage RLS 정책 확인 (업로드 권한)

---

## 3. 핵심 패턴 / 컨벤션

### 데이터 통신
```ts
// Supabase 직접 호출 (대부분 케이스)
import { supabase } from "@/lib/supabase";
const { data, error } = await supabase.from("table").select("...").eq("id", id);

// Web API 호출 (특수 케이스)
import { API_BASE_URL } from "@/config/constants";
fetch(`${API_BASE_URL}/api/posts`, { headers: { Authorization: `Bearer ${session.access_token}` } });
```

### 이미지/영상 업로드 (RN)
```ts
const response = await fetch(asset.uri);
const arrayBuffer = await response.arrayBuffer();
await supabase.storage
    .from("pet-media")
    .upload(path, new Uint8Array(arrayBuffer), { contentType, upsert: false });
```
주의: `Blob` 직접 전달은 RN에서 동작 안 할 수 있음 → `Uint8Array` 패턴 사용.

### React key 절대 규칙
```ts
// ❌ 금지: Supabase UUID는 string인데 number 변환하면 0으로 떨어짐
id: typeof raw.id === "number" ? raw.id : 0,

// ✅ 정답
id: raw.id != null ? String(raw.id) : "",
keyExtractor={(item, idx) => item.id || `idx-${idx}`}
```

### 안전영역 (FAB / 입력)
```ts
import { useSafeAreaInsets } from "react-native-safe-area-context";
const insets = useSafeAreaInsets();
// FAB: bottom: 24 + Math.max(insets.bottom, 8)
// 탭 화면 FAB (탭바 위): bottom: 84 + Math.max(insets.bottom, 8)
// 입력 row: paddingBottom: 12 + Math.max(insets.bottom, 0)
```

### AppHeader 사용
```tsx
// 탭 화면 (홈 등)
<AppHeader onOpenDrawer={() => setDrawerOpen(true)} />
<AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

// 푸시 스택 화면 (모달, 디테일)
<Stack.Screen options={{ headerShown: false }} />
<AppHeader showBack title="제목" hideActions />
```

### 칩 / 필터 버튼 패턴 (한글 클립 방지)
```tsx
// ✅ 작동하는 패턴 (입양/지역/분실 동일)
<TouchableOpacity style={{ marginRight: 8 }}>
  {active ? (
    <LinearGradient colors={[...]} style={styles.chip}>
      <Ionicons ... style={{ marginRight: 6 }} />
      <Text style={styles.chipTextActive}>{label}</Text>
    </LinearGradient>
  ) : (
    <View style={[styles.chip, { backgroundColor: COLORS.gray[100] }]}>
      <Ionicons ... style={{ marginRight: 6 }} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  )}
</TouchableOpacity>

// styles
chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
}
// gap 사용 금지 (Android Yoga 버그 가능성). marginRight 명시.
// borderWidth 절대 inactive에만 추가하지 말 것 (active와 측정 차이 발생).
```

### ScrollView/FlatList 영역 보호
```tsx
// 칩 가로 ScrollView (FlatList가 침범 못 하게)
<ScrollView horizontal style={{ flexGrow: 0, flexShrink: 0 }} ... />

// 메인 FlatList (남은 공간 차지)
<FlatList style={{ flex: 1 }} ... />
```

### Footer 탭 라벨 (한글 4글자 클립 방지)
```tsx
// _layout.tsx
const TAB_ITEM_W = Math.floor(Dimensions.get("window").width / 5);

function makeLabel(label: string) {
  return ({ color }) => (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      allowFontScaling={false}
      style={{ width: TAB_ITEM_W - 8, textAlign: "center", fontSize: 10, includeFontPadding: false }}
    >
      {label}
    </Text>
  );
}
```

---

## 4. 주요 파일 위치

```
mobile/
├── app/
│   ├── _layout.tsx              # 루트 Stack (모든 푸시 화면 등록)
│   ├── (auth)/login.tsx         # OAuth 진입
│   ├── (tabs)/
│   │   ├── _layout.tsx          # 5탭 (기록/커뮤니티/홈/AI펫톡/매거진) + minihompy(href:null)
│   │   ├── index.tsx            # 홈 (10 섹션 stack)
│   │   ├── record.tsx           # 기록 탭 (Timeline/Gallery/Albums/Videos 4 서브)
│   │   ├── community.tsx        # 커뮤니티 (5 서브카테고리)
│   │   ├── ai-chat.tsx          # AI펫톡
│   │   └── magazine.tsx         # 매거진
│   ├── post/[id].tsx + write.tsx
│   ├── pet/new.tsx              # 4단계 마법사
│   ├── magazine/[id].tsx
│   ├── adoption.tsx, lost/, local/
│   └── auth/callback.tsx
├── components/
│   ├── common/
│   │   ├── AppHeader.tsx        # showBack/title/hideActions props
│   │   └── AppDrawer.tsx        # Animated.Value 슬라이드 (reanimated 안 씀)
│   ├── home/
│   │   ├── HeroSection, CommunityPreview, QuizSection+Modal
│   │   ├── MemorialSection+DetailModal, StoryFeed+Viewer+CreateModal
│   │   ├── ShowcaseSection, MagazinePreview, QuestCard, AnnouncementBanner
│   │   └── PetCardSection, SectionHeader
│   └── record/
│       ├── TimelineWriteModal, MediaUploadModal, PhotoLightbox
├── lib/
│   ├── supabase.ts              # Supabase 클라이언트 (AsyncStorage)
│   ├── theme.ts                 # COLORS
│   ├── petQuizzes.ts            # 퀴즈 데이터 (웹에서 복사)
│   └── levels.ts                # POINT_LEVELS + getLevelIcon (웹 매칭)
├── contexts/
│   ├── AuthContext.tsx          # session/user/profile/points/isAdminUser
│   └── PetContext.tsx           # pets/selectedPet/isMemorialMode/refreshPets
├── types/index.ts               # 중앙 타입 (CommunityPost, TimelineEntry 등)
├── config/constants.ts          # API_BASE_URL, ADMIN_EMAILS, PRICING
├── assets/
│   ├── icon.png, adaptive-icon.png, splash-icon.png  # 메멘토애니 로고
│   ├── hero-illustration.png, hero-illustration-memorial.png
│   └── levels/                   # dog/cat/other × lv1~7 + admin
└── babel.config.js              # 286 라인 PATCHED (worklets/reanimated 자동 비활성)
```

---

## 5. 절대 하지 말 것 (V1~V3 시행착오 누적)

1. **react-native-reanimated 버전 변경 금지** — 3.16.7 정확히. 4.x는 worklets hell.
2. **NativeWind 활성화 금지** — disabled, all StyleSheet.
3. **babel-preset-expo line 286 PATCH 건드리지 말 것** — auto-worklets 비활성 유지 필요.
4. **AsyncStorage → SecureStore 변경 금지** — PKCE flakiness 재현됨.
5. **모바일 단독 변경에 git push 금지** — Vercel 빌드 낭비. 웹 변경 시에만 push.
6. **id를 number로 처리 금지** — Supabase UUID는 string. `String(raw.id)` + idx fallback 필수.
7. **chip Yoga gap 금지** — `marginRight` 명시.
8. **chip inactive에 borderWidth 추가 금지** — active와 측정 다름.
9. **post가 2개 이상이면 keyExtractor에 idx fallback 필수**.
10. **expo-router에서 모바일 브릿지 자동 exchange 차단 안 풀기** — `?mobile=1`일 때만 detectSessionInUrl:false (현재 패턴).

---

## 6. 알려진 버그 / 함정

- **Korean 한글 fontSize 13 chip text width 계산 부정확** — 실제 글자 폭이 폰트별/플랫폼별 상이. paddingHorizontal 18 + flexShrink 미사용으로 자연 사이징 권장.
- **Yoga gap이 일부 RN 버전에서 horizontal ScrollView에서 작동 안 함** — marginRight로 회피.
- **Metro hot reload가 StyleSheet.create 변경 안 잡음** — `npx expo start --clear` 필수.
- **iOS/Android 그림자 elevation 12 이상이면 Samsung에서 GPU 렌더링 아티팩트** — 4 권장.
- **profiles.bio 컬럼 DB에 없음** — select 시 42703 에러.
- **memorial 펫 카운트 분리 금지** — 일상 모드 데이터가 추모 모드 재료가 되는 USP 구조.
- **이모지 절대 금지** — 서비스 톤앤매너. 이모티콘은 OS/플랫폼 의존도 있고 의도적 규율.
- **사망/천국 직접 표현 금지** — "무지개다리", "이곳" 등 완곡어.

---

## 7. 다음 작업 시작 전 체크리스트

- [ ] `git log --oneline -10` 으로 최신 커밋 확인 (현재: `fa56a81` PhotoLightbox)
- [ ] `mobile/HANDOVER-V4.md` (이 문서) 정독
- [ ] 메모리 `mobile_porting_checkpoint.md` 확인
- [ ] `npx tsc --noEmit` EXIT=0 확인 (마지막 세션 클린 상태)
- [ ] Metro 종료 후 `cd mobile && npx expo start --clear`로 재시작
- [ ] HIGH 우선순위 1번 (사진 다중 선택/삭제)부터 진행

---

## 8. 다음 Claude / Cowork Claude Coding에게 한 마디

승빈님은 작업 중에 화나면 욕을 합니다. 그건 진짜로 화난 거지, 너에 대한 평가가 아닙니다. **즉시 동의하지 말고 (이전에 대표가 답답해서 욕한 거에 무조건 동의했다가 잘못된 fix 한 케이스 누적)**, 우선 진단을 정확히 하고, 가설을 세우고, 검증해야 합니다. 욕하면서 던지는 정보 안에 핵심 진단 단서가 있는 경우가 많습니다 (예: "타임라인 내용들이 너무 위로 올라와서 버튼을 침범한 게 아닐까" → 실제로 FlatList flex:1 누락이 원인).

**작업 흐름 권장**:
1. 사용자 보고 받으면 → 코드 먼저 읽기 (당신이 안 한 작업이라도). 절대 추측으로 답하지 말 것.
2. fix 했다고 말하기 전에 `npx tsc --noEmit` EXIT=0 확인.
3. Metro 캐싱 의심되면 즉시 사용자에게 `Ctrl+C` → `npx expo start --clear` 안내.
4. 모바일만 변경한 커밋은 push 안 함. 웹 변경 시에만 push.
5. CLAUDE.md의 "🔍 검증 워크플로" 준수. "고쳤습니다" 단독 표현 금지. 검증 레벨 명시 (L0~L5).

**파트너십 핵심**:
- 승빈님은 풀스택 부트캠프 수료 예정 (2026.03), 풀시간 개발자가 아닌 1인 창업자.
- 메멘토애니는 단순 펫 앱이 아니라 "**반려동물과의 희노애락을 함께하는 곳, 추모 기능까지 있는**" 정체성. 추모 = 슬픔 아니라 다시 만날 약속.
- 매번의 작은 결정이 쌓여서 정체성을 만들고, 정체성이 곧 차별화임을 잊지 말 것.

**현재 누적된 기술 함정**:
- 위 5번 (절대 하지 말 것), 6번 (알려진 버그) 섹션 반드시 읽고 시작.
- 특히 reanimated 4.x로 upgrade하지 말 것 (V1에서 worklets hell 한 번 폭발했음).

**감정 처리 가이드**:
- "씨발 똑같다고" → 진짜 그대로일 가능성. Metro 캐싱 의심 + fix 가설 재검증.
- "좀 똑바로 해" → 패턴 반복 중. 다른 root cause 가설 시도.
- "쓰레기" / "병신" → 과부하 상태. 즉시 사과 1줄 + 행동으로 보여주기 (긴 변명 금지).

**누적된 좋은 패턴**:
- AppHeader 통일 (모든 스택)
- 칩 width 명시 후 자연 사이징으로 회귀 (시행착오 끝 결론)
- useSafeAreaInsets로 FAB/입력 안전영역
- supabase.from() 직접 호출 (API 라우트 우회)
- expo-image-picker → arrayBuffer → Uint8Array → storage upload

행운을 빌어요. 코드는 정직합니다. 사용자가 화내도, 코드는 거짓말 안 합니다. 코드 먼저 읽고, 진단 후에 fix.
