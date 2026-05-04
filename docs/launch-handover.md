# 메멘토애니 정식 출시 — 사용자(승빈) 처리 안내서

> 코드 작업은 모두 완료됐습니다. 아래 항목은 외부 서비스 가입/콘솔 설정 등
> 사용자 본인이 직접 처리해야 하는 일들만 모았습니다. 위→아래 순서대로 진행하면 됩니다.

---

## 1. 베타 테스터 모집 (지금 바로)

### A) 베타 코드 발급
- 웹: 관리자 대시보드 → "베타 코드" 탭 → 대량 발급 (예: 10개)
- 발급 즉시 코드 자동 생성 (BETA-XXXXXX 형식, 클립보드 자동 복사)

### B) 사용자에게 전달
- 공유 메시지 예시:
  ```
  메멘토애니 베타 테스터로 초대드립니다 :)
  앱 설치 → 프로필 → 베타 테스터 → 아래 코드 입력
  코드: BETA-AB3K9L
  3,000P + 3개월 구독 50% 할인이 즉시 적용됩니다.
  ```

### C) 사용자가 코드 입력
- 모바일: 프로필 화면 → "베타 테스터" 섹션 → 코드 입력 → "적용"
- 입력 즉시 3,000P 지급 + `is_beta_tester=true` + `beta_discount_until = 오늘 + 3개월`

---

## 2. Apple Developer (iOS 출시 필수)

### A) 가입
1. https://developer.apple.com 접속
2. Apple ID로 로그인 → "Account" → Enroll
3. 개인($99/yr) 또는 법인($99/yr) 선택
4. 결제 완료 후 1~2일 검토 → 승인되면 멤버십 활성화

### B) Bundle ID 등록
1. Certificates, Identifiers & Profiles → Identifiers → "+"
2. App IDs → App
3. Description: 메멘토애니 / Bundle ID: `com.mementoani.app` (이미 app.json에 등록)
4. Capabilities: "Sign In with Apple", "Push Notifications", "Associated Domains" 체크

### C) App Store Connect
1. https://appstoreconnect.apple.com → My Apps → "+"
2. Bundle ID 선택, SKU 입력 (예: `MEMENTO-001`), 기본 언어 한국어
3. 앱 정보 입력 (제목/부제/카테고리 → `docs/app-store-listing.md` 참고)

---

## 3. Google Play Console (Android 출시 필수)

### A) 가입
1. https://play.google.com/console 접속
2. 개발자 등록 ($25 일회성)
3. 본인 인증 (여권 또는 신분증 사진 업로드)
4. 1~3일 검토 → 승인

### B) 앱 등록
1. "Create app"
2. 앱 이름: 메멘토애니 / 기본 언어: 한국어 / 앱 또는 게임: 앱 / 무료 또는 유료: 무료
3. Patch Bundle 업로드는 EAS Build 후 진행 (아래 5번)

---

## 4. EAS (Expo Application Services) 가입 + 빌드

### A) Expo 계정
1. https://expo.dev 회원가입 (이미 있으면 로그인)
2. 터미널에서 `npx eas login` (사용자: sharkwind1)

### B) EAS 프로젝트 연결
```powershell
cd mobile
npx eas init
# Project ID가 생성됨 → app.json의 "REPLACE_WITH_EAS_PROJECT_ID" 두 곳을 자동/수동 갱신
```

### C) 환경변수 등록 (EAS Dashboard)
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN_MOBILE` (Sentry 가입 후 — 6번 참고)
- `SENTRY_AUTH_TOKEN` (소스맵 업로드용 — 6번 참고)

### D) 첫 빌드
```powershell
# Android (Google Play용 AAB)
npx eas build --platform android --profile production

# iOS (App Store용)
npx eas build --platform ios --profile production
```

빌드 완료까지 15~30분. 완료되면 EAS Dashboard에서 다운로드 링크 제공.

### E) 스토어 자동 제출 (선택)
```powershell
npx eas submit --platform android --latest
npx eas submit --platform ios --latest
```

iOS 제출 전 `eas.json`의 `submit.production.ios`에서 다음을 갱신:
- `appleId`: Apple ID (이메일)
- `ascAppId`: App Store Connect의 앱 ID (10자리 숫자)
- `appleTeamId`: Developer Team ID (10자리 영숫자)

Android 제출 전:
- Google Play Console → Setup → API access → Service account 생성
- JSON 키 다운로드 → `mobile/google-play-key.json`로 저장 (gitignore 필수)

---

## 5. Sentry 가입 (크래시 리포팅)

### A) 가입
1. https://sentry.io 무료 계정 (월 5,000 events 무료)
2. New Project → React Native 선택 → 프로젝트 이름 `mementoani-mobile`
3. DSN 복사 (예: `https://abc123@o123.ingest.sentry.io/456`)

### B) 패키지 설치 + 환경변수
```powershell
cd mobile
npx expo install @sentry/react-native
```

### C) 환경변수 등록
- EAS Dashboard / 또는 로컬 `.env`:
  - `EXPO_PUBLIC_SENTRY_DSN_MOBILE`: 위에서 복사한 DSN
  - `SENTRY_AUTH_TOKEN`: Sentry → Settings → Auth Tokens → 새 토큰 (소스맵 업로드용)

### D) app.json plugins 갱신 (수동)
```json
"plugins": [
  ...,
  ["@sentry/react-native/expo", { "organization": "YOUR_ORG", "project": "mementoani-mobile" }]
]
```

이후 EAS Build 시 자동으로 소스맵 업로드되어 Sentry에서 크래시가 보입니다.

---

## 6. Supabase Seoul 이전 (선택, 강력 추천)

상세 가이드: `docs/supabase-seoul-migration.md`

핵심:
- Supabase Pro($25/월, 1개월만 결제) 가입
- Project Settings → "Migrate to a new project" → ap-northeast-2 (Seoul)
- Vercel ENV 4개 갱신 후 redeploy
- 1주일 안정 후 구 프로젝트 Pause/Delete

이전 후 체감 응답 속도 5~10배 향상.

---

## 7. 결제 PG 추가 신청 (다날 휴대폰결제)

다날 이지호 매니저에게 메일 회신:
- 카드결제: KCP (이미 사용 중)
- 휴대폰결제: 다날 신청 (M025 회피)
- 본인확인 + 결제 동시 신청

승인되면 환경변수만 추가:
- `NEXT_PUBLIC_PORTONE_DANAL_CHANNEL_KEY` 등록
- 자동으로 모바일 앱에서 휴대폰 결제 옵션 활성화 (코드는 이미 준비됨)

---

## 8. 도메인 / 마케팅

### A) 도메인 (이미 보유 중이면 skip)
- mementoani.com 등록 확인
- Vercel에 도메인 연결: Vercel → Project → Settings → Domains → Add

### B) 카카오 채널 / 인스타그램
- 베타 테스터 안내 채널 생성
- 출시 D-7 카운트다운 / D-day / D+1 후기 등

---

## 9. 출시 D-1 체크리스트

- [ ] EAS production 빌드 완료 (iOS .ipa + Android .aab)
- [ ] Apple App Store에 ipa 업로드 + Review 제출
- [ ] Google Play에 aab 업로드 + Review 제출
- [ ] Vercel 배포 안정 (텔레그램 시스템 채널 healthy)
- [ ] 베타 코드 50개 발급 (BETA-XXXXXX) → 사용자별 전달 준비
- [ ] 데모 계정 생성: tester@mementoani.com / 강력한 임시 비밀번호 — Apple Review용
- [ ] Sentry DSN 활성 + 첫 크래시 더미 이벤트 보내서 대시보드 확인
- [ ] 환불 정책/약관 페이지 라이브 (footer 링크 클릭 → 200 OK 확인)
- [ ] 070-8095-9918 / sharkwind1@gmail.com 응답 가능

---

## 10. 출시 D+0 ~ D+7 모니터링

- **매일 09시**: 텔레그램 시스템 채널의 일일 요약 확인
- **매시간**: healthcheck 알림 → degraded 또는 warning 발생 시 즉시 대응
- **Sentry**: 새 크래시 type별 1일 1회 트리아지
- **유저 응대**: 카카오톡/메일/070 → 30분 내 1차 응답 목표

---

문제가 생기거나 막히는 단계가 있으면 그 단계 캡쳐+에러 메시지 그대로 던져주시면 다음 세션에서 이어서 처리합니다.
