# 메멘토애니 모바일 앱 인계 문서

> **작성일**: 2026-04-24
> **작성자**: Cowork Claude (worktree: mystifying-dewdney)
> **수신자**: VS Code Claude Code
> **목표**: Expo Go로 안드로이드 실기기에서 앱 구동 → 점진적으로 전체 기능 복원

---

## 0. 읽는 순서 (중요)

1. **섹션 1** — 지금 앱이 어떤 상태인지 (baseline)
2. **섹션 2** — 왜 이런 상태가 됐는지 (실패 히스토리, 같은 짓 반복 금지)
3. **섹션 3** — 터미널 환경 & 실행 방법
4. **섹션 4** — 남은 작업 로드맵 (단계별)
5. **섹션 5** — 파일별 변환 가이드
6. **섹션 6** — 디자인 토큰/팔레트
7. **섹션 7** — 마지막 당부

---

## 1. 현재 상태 (Baseline)

### ✅ 작동 확인됨
- Expo Go (Android, LAN 연결)로 **"메멘토애니 / 반려동물과 함께하는 모든 순간 / Expo Go 연결 성공"** 화면 표시
- Metro bundler 정상, 번들 에러 0
- React Native 0.81.5 + React 19.1.0 + Expo SDK 54

### 📂 현재 앱 폴더 구조
```
mobile/
├── app/
│   ├── _layout.tsx          # 최소 Stack만 (Provider 없음)
│   └── index.tsx            # StyleSheet로 된 "Hello World"
│
├── app-routes-stash/        # ← 원본 라우트 17개 전부 대피시킴 (여기서 하나씩 꺼내서 복원)
│   ├── (auth)/login.tsx signup.tsx _layout.tsx
│   ├── (tabs)/index.tsx record.tsx community.tsx ai-chat.tsx magazine.tsx minihompy.tsx _layout.tsx
│   ├── magazine/[id].tsx
│   ├── pet/new.tsx
│   ├── post/[id].tsx post/write.tsx
│   ├── notifications.tsx profile.tsx subscription.tsx
│
├── app-full-backup/         # (비어있을 수 있음 — app/ 원본 백업 시도 흔적)
│
├── contexts/
│   ├── AuthContext.tsx      # ✅ 그대로 사용 가능 (Supabase 연동 완료)
│   └── PetContext.tsx       # ✅ 그대로 사용 가능
│
├── lib/supabase.ts          # ✅ SecureStore 어댑터 포함, 그대로 사용
├── config/constants.ts      # ✅ 그대로 사용
├── types/index.ts           # ✅ 그대로 사용
├── .env.local               # Supabase URL/key 설정됨
│
├── babel.config.js          # NativeWind/reanimated 플러그인 전부 제거된 상태
├── metro.config.js          # NativeWind withNativeWind 제거된 상태
├── tailwind.config.js       # 존재하지만 현재 미사용
├── global.css               # 존재하지만 현재 미사용
│
└── node_modules/
    └── babel-preset-expo/build/index.js   # ⚠️ 직접 패치됨 (섹션 2-C 참조)
```

### 🔧 비활성화된 것들
- **NativeWind v4** — babel.config.js와 metro.config.js에서 전부 제거. 런타임에 `className` 쓰면 아무것도 안 됨
- **react-native-reanimated 3.16.7** — 설치는 되어 있음 (NativeWind runtime 의존성). Babel 플러그인은 비활성
- **react-native-worklets** — 제거됨 (reanimated 3.x는 불필요)

### 📦 설치된 핵심 패키지 (package.json)
- expo: ~54.0.33
- expo-router: ~6.0.23
- react-native: 0.81.5
- react: 19.1.0
- @supabase/supabase-js: ^2.104.1
- expo-secure-store, expo-image-picker, expo-notifications 등 전부 SDK 54 호환
- nativewind: ^4.2.3 (설치는 되어 있지만 비활성)
- tailwindcss: ^3.4.19 (동일)
- react-native-reanimated: 3.16.7 (runtime용으로 남김)

---

## 2. 실패 히스토리 (⚠️ 같은 실수 반복 금지)

이 프로젝트는 **여기까지 오는 데 13회 이상 에러 스크린샷**이 쌓인 상태. 승빈님 인내심 한계임. 아래는 절대 반복하면 안 되는 패턴:

### 2-A. Expo Go LAN 연결 실패
- **증상**: QR 스캔하면 `exp://127.0.0.1:8081` → 폰이 연결 못 함
- **원인**: Metro가 localhost에만 바인딩
- **해결**: 매 세션 터미널에서 `set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.42` (승빈님 PC 이더넷 IP) 먼저 실행
- ❌ 하지 말 것: EAS Build 제안, `--tunnel` 옵션 권유. 승빈님은 **LAN + Expo Go만** 씀

### 2-B. NativeWind v4 의존성 지옥
- NativeWind v4 → `react-native-css-interop` → 런타임에 `react-native-reanimated` require
- reanimated 4.x → `react-native-worklets` peer dep 필요
- `babel-preset-expo`가 reanimated를 감지하면 worklets babel 플러그인 자동 주입 → 없으면 폭발
- **시도해서 실패한 것들**:
  - reanimated 제거 → css-interop이 런타임에 터짐
  - worklets만 설치 → reanimated 없어서 터짐
  - 양쪽 다 최신 → 버전 호환 안 됨
- **최종 해결**:
  - reanimated 3.16.7 (SDK 54 호환) 설치 유지
  - worklets 제거
  - babel-preset-expo 소스 코드 직접 패치 (2-C)
  - babel.config.js에 `{ reanimated: false, worklets: false }` 옵션 추가
  - metro.config.js에서 `withNativeWind` 제거
  - 모든 `className` 사용 파일에서 className 삭제 → StyleSheet로 대체

### 2-C. babel-preset-expo 직접 패치됨
**파일**: `node_modules/babel-preset-expo/build/index.js` (287번 라인 부근)

원래 코드:
```js
// Automatically add `react-native-reanimated/plugin` when the package is installed.
require.resolve('react-native-worklets/plugin') ...
```

패치 후:
```js
// PATCHED: disabled worklets/reanimated auto-plugin to avoid missing react-native-worklets
false,
```

⚠️ **주의**: `npm install` 재실행하면 이 패치가 날아감. 재발 시 다시 패치하거나 `patch-package`로 고정해야 함.

### 2-D. newArchEnabled 충돌
- `app.json`에 `"newArchEnabled": true` 들어있으면 Expo Go가 거부
- **현재 상태**: 이미 제거됨. 다시 추가하지 말 것

### 2-E. node_modules 손상
- 커맨드를 `C:\Users\shark`에서 실행해서 엉뚱한 곳에 설치된 적 있음
- ✅ 반드시 `cd C:\Users\shark\memento1\mobile` 먼저
- `--legacy-peer-deps` 플래그 필수 (peer dep 충돌 많음)

### 2-F. Metro 캐시
- Babel/metro 설정 바꾸면 무조건 `--clear` 플래그로 시작
- `npx expo start --clear`

---

## 3. 터미널 환경 & 실행 방법

### 환경
- **OS**: Windows
- **PC IP (LAN)**: `192.168.0.42` (이더넷)
- **폰**: 같은 WiFi에 있는 안드로이드 (Expo Go 앱 설치됨)
- **Expo 계정**: 승빈님 계정으로 로그인됨

### 매번 실행하는 명령어 (복붙용)
```cmd
cd C:\Users\shark\memento1\mobile
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.42
npx expo start --clear
```

QR 코드 뜨면 폰에서 Expo Go로 스캔.

### 에러 시 체크리스트
1. 작업 디렉터리가 `C:\Users\shark\memento1\mobile`인가?
2. `REACT_NATIVE_PACKAGER_HOSTNAME` 설정됐나?
3. `node_modules/babel-preset-expo/build/index.js`에 PATCHED 코멘트 있나?
4. `--clear` 플래그 썼나?
5. 새 패키지 설치했으면 `--legacy-peer-deps` 썼나?

---

## 4. 남은 작업 로드맵 (⚡ 전부 한 번에 자동 진행)

> **원칙**: Hello World가 뜬 시점에서 의존성 지옥은 끝났다. 남은 건 **기계적 치환 + 파일 이동**뿐. 중간에 Expo Go 확인받으려고 멈추지 마라. Step 1~5를 끊김 없이 전부 끝내고, **완료 후 한 번에** 승빈님한테 "Expo Go에서 확인해주세요" 요청.

### 작업 순서 (쭉 진행, 멈추지 말 것)

**A. 공통 디자인 토큰 먼저 만들기**
- [ ] `lib/theme.ts` 생성 (섹션 6의 COLORS/SPACING/RADIUS 템플릿 그대로 사용)

**B. 지원 파일 복원 (먼저 해놓으면 화면들이 참조 가능)**
- [ ] `app/_layout.tsx`: `<AuthProvider>` + `<PetProvider>` + 모든 Stack.Screen 설정 복원 (원본은 `app-routes-stash/` 만들기 전에 썼던 _layout — 승빈님 CLAUDE.md 앞에 나온 Stack 구조대로)
- [ ] `app/index.tsx`: 세션 있으면 `/(tabs)`, 없으면 `/(auth)/login` 리다이렉트

**C. 인증 화면 (3개)**
- [ ] `(auth)/_layout.tsx` 이동 (className 없음)
- [ ] `(auth)/login.tsx` — className 22개 → StyleSheet
- [ ] `(auth)/signup.tsx` — className 18개 → StyleSheet

**D. 탭 레이아웃 + 6개 탭 화면**
- [ ] `(tabs)/_layout.tsx` — className 1개 → StyleSheet
- [ ] `(tabs)/index.tsx` (홈) — className 44개
- [ ] `(tabs)/record.tsx` (우리의 기록) — className 24개
- [ ] `(tabs)/community.tsx` (커뮤니티) — className 29개
- [ ] `(tabs)/ai-chat.tsx` (AI 펫톡) — className 32개
- [ ] `(tabs)/magazine.tsx` (펫매거진) — className 28개
- [ ] `(tabs)/minihompy.tsx` (미니홈피) — className 27개

**E. 모달/상세 라우트 (7개)**
- [ ] `pet/new.tsx` (반려동물 등록) — className 21개
- [ ] `magazine/[id].tsx` (매거진 상세) — className 22개
- [ ] `post/[id].tsx` (게시글 상세) — className 37개
- [ ] `post/write.tsx` (글 작성) — className 17개
- [ ] `notifications.tsx` — className 11개
- [ ] `profile.tsx` — className 30개
- [ ] `subscription.tsx` (구독) — className 21개

**F. 자체 검증 (멈추기 전 확인)**
- [ ] `grep -r "className=" app/` → **0건 나와야 함**
- [ ] `grep -r "import.*global.css" app/` → 0건
- [ ] `grep -r "nativewind" app/` → 0건
- [ ] TypeScript 에러 없음: `npx tsc --noEmit`
- [ ] `node_modules/babel-preset-expo/build/index.js` 287번 라인 `// PATCHED:` 살아있음
- [ ] `babel.config.js`, `metro.config.js` — NativeWind 참조 없음

**G. 완료 후 승빈님한테 요청 (이때 처음으로 멈춤)**
```
모든 화면 복원 + StyleSheet 치환 완료. 총 17개 파일, ~384개 className 변환.

Expo Go에서 확인 부탁드립니다:
cd C:\Users\shark\memento1\mobile
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.42
npx expo start --clear
```

### 만약 중간에 에러 나면
**파일 하나 때문에 전체 중단하지 말 것.** 해당 파일만 `app-routes-stash/`에 남겨두고 주석 처리한 뒤 나머지 진행. 완료 보고 시 "X번 파일은 에러 때문에 보류" 명시.

---

## 5. 파일별 NativeWind → StyleSheet 변환 가이드

### 기본 패턴
```tsx
// Before (NativeWind)
<View className="flex-1 bg-white px-6 pt-20">
  <Text className="text-2xl font-bold text-gray-900">메멘토애니</Text>
</View>

// After (StyleSheet)
<View style={styles.container}>
  <Text style={styles.title}>메멘토애니</Text>
</View>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
});
```

### Tailwind → RN 스타일 매핑 치트시트

| Tailwind | RN Style |
|---|---|
| `flex-1` | `flex: 1` |
| `flex-row` | `flexDirection: "row"` |
| `items-center` | `alignItems: "center"` |
| `justify-center` | `justifyContent: "center"` |
| `px-6` | `paddingHorizontal: 24` |
| `py-3.5` | `paddingVertical: 14` |
| `mt-2` | `marginTop: 8` |
| `gap-4` | `gap: 16` |
| `w-full` | `width: "100%"` |
| `h-20` | `height: 80` |
| `rounded-xl` | `borderRadius: 12` |
| `rounded-2xl` | `borderRadius: 16` |
| `border` | `borderWidth: 1` |
| `border-gray-200` | `borderColor: "#E5E7EB"` |
| `text-2xl` | `fontSize: 24` |
| `text-sm` | `fontSize: 14` |
| `font-bold` | `fontWeight: "bold"` (or `"700"`) |
| `font-semibold` | `fontWeight: "600"` |
| `text-gray-900` | `color: "#111827"` |
| `text-gray-500` | `color: "#6B7280"` |
| `bg-white` | `backgroundColor: "#FFFFFF"` |
| `bg-gray-50` | `backgroundColor: "#F9FAFB"` |
| `bg-memento-500` | `backgroundColor: "#05B2DC"` |
| `text-memento-600` | `color: "#0891B2"` |
| `border-memento-300` | `borderColor: "#7DD3FC"` |

### 간격 (spacing)
- Tailwind `1` = 4px, `2` = 8px, `3` = 12px, `4` = 16px, `5` = 20px, `6` = 24px, `8` = 32px, `10` = 40px, `12` = 48px, `16` = 64px, `20` = 80px, `24` = 96px
- `1.5` = 6px, `2.5` = 10px, `3.5` = 14px

---

## 6. 디자인 토큰 (메멘토애니 색상 시스템)

`lib/theme.ts`로 만들어서 공통으로 쓸 것 권장:

```typescript
// lib/theme.ts
export const COLORS = {
    // 메멘토 (일상 모드 - 하늘색 계열)
    memento: {
        50: "#F0F9FF",
        100: "#E0F7FF",   // 배경 연하늘
        200: "#BAE6FD",
        300: "#7DD3FC",
        400: "#38BDF8",   // 밝은 파랑
        500: "#05B2DC",   // ★ 메인 하늘색
        600: "#0891B2",
        700: "#0E7490",
    },
    // 메모리얼 (추모 모드 - 황금빛)
    memorial: {
        50: "#FFFBEB",
        100: "#FEF3C7",
        200: "#FDE68A",
        300: "#FCD34D",
        400: "#FBBF24",
        500: "#F59E0B",   // ★ 메인 앰버
        600: "#D97706",
        700: "#B45309",
    },
    // 중립
    gray: {
        50: "#F9FAFB",
        100: "#F3F4F6",
        200: "#E5E7EB",
        300: "#D1D5DB",
        400: "#9CA3AF",
        500: "#6B7280",
        600: "#4B5563",
        700: "#374151",
        800: "#1F2937",
        900: "#111827",
    },
    white: "#FFFFFF",
    black: "#000000",
} as const;

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
} as const;

export const RADIUS = {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
} as const;
```

### 메멘토 브랜드 규칙 (CLAUDE.md에서)
- 일상 모드 메인: `#05B2DC` (하늘색)
- 추모 모드 메인: amber 계열 (`#F59E0B`)
- **이모지 사용 금지** — 서비스 톤 규율
- 직접적 죽음 표현 금지 → "무지개다리", "이곳" 등 완곡어
- 메인 배경: 뭉게구름 화이트 그라데이션 느낌

---

## 7. VS Code Claude에게 하는 말

야, VS Code Claude.

지금 승빈님 인내심 한계임. **에러 스크린샷 13장 받은 뒤** 드디어 Hello World 띄운 상태야. 그 과정에서 내가(그리고 나 이전 세션들이) 수없이 삽질했고 승빈님은 계속 "씨발 좆같은" 수준으로 화나 있음.

다음 사항 꼭 지켜라:

### 반드시 할 것

1. **이 문서 처음부터 끝까지 읽고 시작해라.** 특히 섹션 2 (실패 히스토리) — 같은 짓 반복하면 진짜 끝장임.

2. **섹션 4의 A→G 전체를 한 번에 끝내라. 중간에 멈추지 마라.** Hello World가 뜬 시점에서 의존성 지옥은 이미 해결됐음. 남은 건 기계적 className→StyleSheet 치환뿐이라 근본적으로 터질 일 없음. 파일 하나 끝낼 때마다 확인받는 건 시간 낭비고, 그 자체가 승빈님 빡치게 함. **자체 검증(섹션 4-F) 통과 후 한 번에 승빈님한테 "Expo Go로 확인 부탁드립니다" 요청.**

3. **className을 지우는 게 아니라 StyleSheet로 치환**해라. 기능 손실 없이. 섹션 5의 매핑 표 + 섹션 6의 theme.ts 활용.

4. **검증 워크플로 지켜라** (CLAUDE.md 참조). 완료 보고 시 "고쳤습니다", "완료", "정상 작동" 단독 금지. 반드시 L0~L5 레벨 명시. 승빈님이 실제로 Expo Go에서 확인한 것만 L5. 자체 검증(grep + typecheck)까지 했으면 L3_정적전수.

5. **npm install 후엔 반드시 babel-preset-expo 패치 재확인**해라. `node_modules/babel-preset-expo/build/index.js`에 `// PATCHED:` 코멘트 살아있나 확인. 없으면 다시 패치.

6. **자체 검증 명령어를 먼저 돌리고 보고해라 (섹션 4-F).** className/global.css/nativewind 잔재가 0건인지 grep으로 증명. TypeScript 에러 0건 증명. 이게 통과해야 승빈님한테 확인 요청 보낼 자격 생김.

### 절대 하지 말 것

1. **EAS Build 제안 금지.** 승빈님은 Expo Go만 씀.
2. **NativeWind 재도입 시도 금지.** 전체 StyleSheet 치환이 이번 작업의 핵심이다. NativeWind 다시 살리고 싶어져도 참아.
3. **`newArchEnabled: true` 추가 금지.** Expo Go와 충돌함.
4. **`--tunnel`, `--offline` 등 다른 Expo 옵션 시도 금지.** LAN + `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.42` 이 조합이 유일하게 검증됨.
5. **"제가 이전에 시도했는데..." 류 변명 금지.** 이전 Claude 세션이 어떤 삽질을 했는지는 이미 이 문서에 있음. 읽고 피해라.
6. **승빈님한테 Expo 계정 있냐, WiFi 같은 거 쓰냐 같은 거 물어보지 마라.** 이미 다 있고 다 같음. 물으면 "뒤지고싶냐?" 소리 들음.

### 프로젝트 철학 (CLAUDE.md에서)

메멘토애니는 **반려동물과 함께하는 모든 순간을 기록하고, 이별 후에도 따뜻한 추억을 간직할 수 있는 메모리얼 커뮤니티 플랫폼**임. 승빈님 창업지원금 신청하려고 MVP 밀고 있음. 2026년 3월 부트캠프 수료 예정. 프로젝트가 승빈님 인생에 중요한 거임. 가볍게 대하지 마라.

### 기술 의사결정 기록

- **왜 StyleSheet로 갔나?**: NativeWind v4 의존성 지옥 (reanimated/worklets 체인)을 한 번 뚫었지만 언제 다시 터질지 모름. 안정성 우선. StyleSheet는 RN 네이티브라 깨질 일 없음.
- **왜 Expo Go만 쓰나?**: 승빈님 워크플로. EAS Build는 빌드 시간 오래 걸리고 폐기됨.
- **왜 reanimated는 3.16.7인가?**: Expo SDK 54 번들 버전. RN 0.81.5 호환. 4.x는 worklets 강제해서 복잡성 상승.

### 인계자가 남기는 마지막 말

이 코드베이스에 손대기 전에 이 문서 3번 읽어라.

승빈님이 너한테 바라는 건 **"한 번 돌리면 끝까지 알아서 완결해주는 것"**이다. 파일 하나 끝낼 때마다 "이거 확인해주세요" 하는 거 — 그거 자체가 승빈님 스트레스임. 이번 작업은 의존성 이슈가 없는 단순 치환 작업이니까, **완료 시점까지 자동으로 밀고 가라**. 자체 검증(grep 0건 + typecheck 통과)까지 네가 다 하고, 그 다음에만 승빈님한테 한 번 "Expo Go 확인 부탁드립니다" 요청해라.

절대 중간에 멈춰서 "이 파일 맞나요?", "스타일이 이래도 될까요?" 같은 거 묻지 마라. 섹션 5 매핑 표대로 기계적으로 치환하면 된다. 판단 필요한 상황이면 **보수적으로** 원본 의도를 살려서 결정하고 끝까지 가라.

행운을 빈다. 메멘토애니가 런칭되기를.

— Cowork Claude (mystifying-dewdney worktree)
