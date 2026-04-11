# 릴레이 로그 — 세션별 작업 기록

> 최신 세션이 위에 있음. TODO는 `RELAY.md` 참고.

---

## [2026-04-12] AI 종별 컨텍스트 전 시스템 일관 적용 + 미니홈피 드롭존 축소

### 배경
이전 세션에서 블로그 토픽 시스템에만 종별 컨텍스트 주입했음. 승빈님 지적:
> "AI 관련된 모든 것에 적용되어야 한다. AI펫톡에도, 매거진에도, 릴스 대본에도 일관적으로."

핵심 문제: AI 펫톡이 강아지/고양이만 분기, 그 외는 "반려동물"로 일반화 → USP 위반.

추가 요청:
> "미니홈피 스테이지 하단 반납칸이 너무 커서 100% 활용 못 함. 드래그로 하단했을 때 자동 반납으로 처리하면 더 좋겠다."

### 변경 내역

#### 1. lib/species-context.ts 공통 모듈 추출 (218 lines, 신규)
- PetSpecies 18종 타입
- SPECIES_CONTEXT (종별 핵심 사육 지식)
- SPECIES_ENGLISH_KEYWORDS (Tavily 영문 검색어)
- **inferSpeciesFromPet(petType, breed)** — Pet.type "기타" + breed로 종 추론
  - 한글/영문 키워드 매칭 (햄스터/hamster/시리안/드워프 등)
- getSpeciesContextBlock, enhanceSearchQueryWithSpecies, isExoticSpecies 헬퍼

#### 2. blog-generate 공통 모듈 import 전환
- 중복 정의 제거
- 토픽 풀(101개) 그대로 유지

#### 3. 릴스 대본 4→7일 컨셉 로테이션 + 종별 힌트
신규 7가지 컨셉:
- 감성/공감, 정보/꿀팁, 공감 챌린지, 스토리텔링, 트렌딩/밈, 서비스 소개, **특수반려동물 스포트라이트(NEW)**
- 각 컨셉마다 hookExample + outroStyle 명시
- 엑조틱 종일 때 SPECIES_CONTEXT 자동 주입

#### 4. AI 펫톡 chat-prompts.ts 종별 컨텍스트 주입 (Daily + Memorial)
**핵심 변화**: `pet.type === "강아지" ? "강아지" : pet.type === "고양이" ? "고양이" : "반려동물"` (X)
→ `inferSpeciesFromPet(pet.type, pet.breed)` 18종 정확한 추론 (O)

- typeText: 18종 정확한 라벨
- petSound: 종별 의성어
  - 햄스터 "찌익~", 토끼 "쀼우~", 페럿 "독독독~", 앵무새 "안녕~"
  - 거북이 "..." (조용), 게코 "쩝~", 물고기 "뽀그르~", 새우 "또각~"
- system prompt에 "## 종별 사실" 블록 동적 주입
- 엑조틱 종이면 강력 지침: "강아지/고양이 행동(산책, 멍멍 등)으로 답하지 말 것"
- **산책 화제 종별 분기 (대형 변경)**:
  - 햄스터/기니피그/친칠라/고슴도치/물고기/새우 → 산책 권유 절대 금지
  - 토끼/페럿 → 하네스 사용 신중히
  - 거북이/도마뱀/게코/이구아나 → 보온/일광욕 목적의 짧은 시간만
  - 앵무새/문조/카나리아 → 케이지 밖 방사가 산책 대신
- 케어 답변 시 종별 안전 정보만 추천 (햄스터 글에 "산책시키세요" 같은 일반론 차단)

#### 5. magazine-generator.ts 종별 컨텍스트 주입
- ANIMAL_ID_TO_SPECIES 매핑 (dog→강아지, parrot→앵무새 등)
- buildArticlePrompt에 SPECIES_CONTEXT 자동 주입
- 엑조틱이면 한국 오해 교정 + 엑조틱 전문 동물병원 명시 + USP 보호 지침 추가

#### 6. MinihompyStage 드롭존 전면 축소
**기존**: `bottom-0 left-0 right-0 h-14` (전체 너비, 56px)
- 280px 스테이지의 약 20% 가림
- 미니미를 옮기려고 잡는 순간 화면 아래쪽이 확 가려져서 그 영역에 둘 수 없음

**신규**: 우측 하단 9×9 (drag over 시 12×12) 동그라미 휴지통
- `bottom-2 right-2`, `rounded-full`, `bg-memorial-500/85`
- dragOverTrash state로 hit-test 시각 피드백 (drag over → red-500 + scale-110)
- 휴지통 위에 놓거나 스테이지 밖으로 드래그하면 보관함 이동 (양쪽 다 작동)
- **결과**: 스테이지 100% 활용 가능

### 검증
- next build 통과 (에러 0건)
- 커밋: 4bfb4f9
- 5 files changed, +466/-103

### 영향 범위
- AI 펫톡: 햄스터/페럿/앵무새 등 18종 보호자가 종별 정확한 답변 받음
- 매거진: 70/30 종 로테이션 + 종별 컨텍스트로 엑조틱 기사 품질 향상
- 블로그: 이미 적용됨 (공통 모듈로 리팩토링만)
- 릴스: 7일 컨셉 로테이션 + 종별 힌트
- 미니홈피: 드래그 가능 영역 280px (드롭존 축소로 100% 활용)

### 미해결 / 후속
- 종별 의성어가 자연스러운지 실제 사용자 피드백 필요
- 릴스 7가지 컨셉이 실제 콘텐츠로 풀리는지 1-2주 모니터링
- "특수반려동물 스포트라이트" 컨셉이 강아지/고양이 보호자에게도 어필되는지 검증

---

## [2026-04-12] 블로그 토픽 시스템 종별 다양화 (50→101개 / 4종→18종)

### 배경
승빈님 지적: 메멘토애니는 "여러 반려동물을 함께 키우는 사람들"을 위한 플랫폼인데
기존 블로그 토픽이 강아지/고양이만 반복 → 햄스터/페럿/앵무새/파충류 보호자 무시 구조.
USP(여러 종 통합 관리)와 정면 충돌.

### 변경 내역
**1. BlogTopic 구조 확장**
- `species: PetSpecies` 필드 추가 (18개 종 분류)
- `SPECIES_CONTEXT` — 종별 핵심 사육 지식을 system prompt에 동적 주입
  - 한국에서 잘못 알려진 정보 (햄스터 합사 금지, 토끼 건초 80%, UVB 필수성 등)
  - 분류학적 특성 (야행성/단독성, 변온/항온, 의무적 육식/초식)
  - 흔한 사망 원인과 응급 상황 (고슴도치 저온 → hibernation, 페럿 인슐린종 등)
- `SPECIES_ENGLISH_KEYWORDS` + `enhanceSearchQuery` — 종별 영문 학술 검색어 자동 추가
  - 한국어 자료 부족한 엑조틱 종은 영문 키워드로 학술 자료 보강

**2. 토픽 풀 50 → 101개 (102% 증가)**
| 종 | 개수 |
|---|---|
| 강아지 | 17 |
| 고양이 | 14 |
| 공통 (펫로스+계절) | 15 |
| 햄스터 | 7 |
| 앵무새 | 7 |
| 페럿 | 5 |
| 토끼 | 5 |
| 기니피그 | 4 |
| 고슴도치 | 4 |
| 거북이 | 4 |
| 물고기 | 4 |
| 친칠라 | 3 |
| 게코 | 3 |
| 도마뱀 | 2 |
| 새우 | 2 |
| 이구아나 | 2 |
| 문조 | 2 |
| 카나리아 | 1 |

**3. Tavily 검색 도메인 확장**
- 추가: rspca.org.uk, rwaf.org.uk (영국 동물복지/토끼 전문)
- 추가: lafeber.com (조류 전문), reptifiles.com (파충류 전문)
- 추가: merckvetmanual.com, vcahospitals.com, avma.org (수의학 학술)
- 추가: exoticdirect.co.uk, exoticpetvet.net (엑조틱 전문)

**4. 요일 로테이션 재설계**
- 일요일: 펫로스 (주 1회, 14%)
- 월: 강아지 / 화: 고양이 / 수: 햄스터 / 목: 토끼 / 금: 앵무새 / 토: 게코
- 격주(홀수 주차): 보너스 종 치환
  - 햄스터→기니피그, 토끼→친칠라, 앵무새→문조, 게코→도마뱀
- 4주마다(주차 % 4 === 2): 희귀 종 등장
  - 고슴도치/페럿/거북이/이구아나/물고기/새우/카나리아 순환
- 결과: 같은 종이 절대 연속 등장 안 하고, 18종 모두 정기적으로 다뤄짐

**5. 시스템 프롬프트 강화**
- 엑조틱 종일 때 별도 작성 지침 자동 추가
  - 한국 오해 교정 ("예전에는 ~라고 알려졌지만, 최신 연구는 ~")
  - 엑조틱 전문 동물병원 명시
  - 분류학적 특징 자연스럽게 녹이기
- 메멘토애니 멘트도 종에 따라 분기
  - 엑조틱: "다양한 종을 함께 관리할 수 있어요"
  - 일반: "건강 기록과 케어 리마인더를 한곳에서"
  - 펫로스: "디지털 메모리얼"
- 금지 사항 추가: "강아지/고양이만 반려동물"이라는 뉘앙스 명시 금지

### 검증
- next build 통과
- 토픽 카운트 확인 (101개 / 18종)
- 커밋: 3150c13

### 미해결 / 후속
- (없음 — 종 다양화 작업은 완료)
- 모니터링: 다음 한 달간 텔레그램으로 오는 블로그 초안 종 분포 확인
- 추가 개선 가능성: 메인 토픽 풀에 토픽 더 추가 시 같은 패턴으로 species 필드 명시

---

## [2026-04-11] 오후 — 라이프사이클 5→3단계 전면 재설계 + Next.js fetch 캐싱 버그 수정

### 배경
오전에 구현한 5단계 (active/readonly/hidden/countdown/free) 설계가
"아무것도 할 수 없는 무료 회원" 처벌 상태 문제 → 3단계로 단순화 재설계.

### 새 설계 (3단계)
- **active**: 평상시 (유료 또는 무료)
- **cancelled**: 해지됨, premium_expires_at 전 — **유료 혜택 그대로 유지**, 배너만 표시
- **archived**: premium_expires_at 경과, 무료 회원 + 초과 데이터 잠금
  - data_reset_at = premium_expires_at + 40일
  - 도달 시 archived 데이터 hard delete → active 복귀

핵심 차이: cancelled는 처벌 X (혜택 유지), archived는 일반 무료 회원 경험 + 초과분만 잠금.

### 🔴 핵심 버그 — Next.js 14 fetch 자동 캐싱 (998cecf)
- **증상**: Supabase JS가 PostgREST 응답을 stale data로 반환
- **원인**: Next.js 14가 모든 fetch에 자동 캐시 적용 → Supabase JS 내부 fetch도 캐싱됨
- **해결**: `cron-utils.ts`(`getServiceSupabase`) + `supabase-server.ts` 양쪽에 `cache: "no-store"` 커스텀 fetch 주입
- **영향**: 17:54 텔레그램 FK 에러는 배포 타이밍 사이의 "유령" 에러 → 998cecf 이후 재발 X

### DB 마이그레이션 재실행
- subscription_phase CHECK ('active'|'cancelled'|'archived')로 수정
- data_readonly_until / data_hidden_until 컬럼 DROP
- notifications type CHECK 4종 추가

### 코드 재작성
- `types/index.ts`: SubscriptionPhase 3개로 단순화
- `AuthContext.tsx`: subscriptionCancelledAt 추가, dataReadonlyUntil/dataHiddenUntil 제거
- `useSubscriptionPhase.ts`: isCancelled / isArchived / isCritical 단순화
- `subscription-guard.ts`: phase 기반 차단 거의 제거 (tier 기반으로 위임)
- `subscription-restore.ts`: 컬럼 DROP 반영, count 집계 정확화
- `cancel/route.ts`: premium_expires_at 유지 + data_reset_at = expiry + 40일
- `subscription-lifecycle/route.ts`: 3 phase 크론 (cancelled→archived→hard delete)
- `SubscriptionStatusBanner.tsx`: cancelled/archived 단계별 톤
- `SubscriptionSection.tsx`: 해지 안내 문구 수정 (premium_expires_at 강조)

### E2E 검증 (Test 1-5 통과)
- Test 2: cancelled → archived + archive 2마리, 사진 9장
- Test 3: archived countdown D-5 알림 생성
- Test 4: archived → active + hard delete 2마리, 사진 9장
- Test 5: 재구독 복구 archived 펫 2 + 사진 4

### UX 추가
- **ArchivedPetsSection.tsx**: RecordPage에 "보관 중인 아이들" 잠금 카드 섹션
- **Resend 이메일 채널** (`src/lib/email.ts`)
  - sendSubscriptionCancelledEmail (해지 즉시)
  - sendArchiveCountdownEmail (D-10/D-5/D-1)
  - RESEND_API_KEY 환경변수 필요 (미설정 시 silent skip)

### 블로그 크론 토픽 편중 수정 (cec42a2)
- 배열 modulo 순환 → 펫로스 연속 편중 문제
- 요일 기반 결정론적 선택으로 교체
- 일요일만 펫로스 (주 1회, 14%), 월~토 정보글 (주 6회, 86%)

### 커밋 (총 14개)
```
c3b592c  docs: 블로그 토픽 편중 수정 + FK 유령 에러 진단 기록
cec42a2  fix: 블로그 크론 토픽 선택 로직 — 펫로스 편중 해소
9dd9f00  docs: 2026-04-11 오후 세션 기록
868ff42  feat: 잠금 펫 UI + Resend 이메일 채널
6d0411a  cleanup: 디버그 코드 제거 + supabase-server에도 no-store 적용
998cecf  🔴 fix: getServiceSupabase fetch no-store (핵심 버그)
aa8553c  debug: 전체 pets 리스트 디버그
210cbb6  debug: cancelled 유저 fetched profile 값 응답 포함
0fb1726  debug: 디버그 정보 + FK 검증 가드
60c0efb  fix: 라이프사이클 크론 에러 전파 + protectedPetId null 가드
391b910  refactor: 구독 해지 라이프사이클 전면 재설계 (5→3단계)
c6fa390  fix: 라이프사이클/복구 로직 count 집계 + archive 펫 사진 함께 archive
c0bf580  fix: 라이프사이클 알림 silent fail 수정 (CHECK 제약 확장)
3ff726b  feat: 구독 해지 라이프사이클 8 Phase 전체 구현 (오전 세션)
```

### 남은 작업 (다음 세션)
1. 시각적 회귀 테스트 — RELAY.md에 SQL 시뮬레이션 코드 포함
2. Vercel `RESEND_API_KEY` 추가 (이메일 활성화 시)
3. 2026-04-12 아침 블로그 토픽 확인 (월요일 = 정보글 와야 정상)

---

## [2026-04-11] 오전 — 구독 해지 라이프사이클 전체 구현 + 논리 충돌 3건 수정

### 논리 충돌 3건 수정
- [x] **차단 유저 AI 펫톡 차단** — `chat-pipeline.ts` profile select에 `is_banned, ban_reason` 추가, true면 403 + 텔레그램 로그
- [x] **신고 3건 자동 숨김 실제 동작** — `reports/route.ts` 임계값 도달 시 `community_posts.is_hidden=true, moderation_status='rejected', moderation_reason=...` 업데이트 + `moderation_logs` 기록 (filter_type=report)
- [x] **Service Role 권한 검증 강화** — `reports/route.ts` POST와 `memorial-messages/route.ts` POST에 차단 유저 검증 추가 (어뷰징 방지)

### 구독 해지 라이프사이클 (Phase 1~8 전부)
설계: `docs/subscription-lifecycle.md`
4단계: active → readonly(30d) → hidden(50d) → countdown(10d) → free(D+90)

#### Phase 1: DB + 크론잡
- [x] `supabase/migrations/20260411_subscription_lifecycle.sql`
  - profiles: subscription_phase, subscription_cancelled_at, data_readonly_until, data_hidden_until, data_reset_at, protected_pet_id
  - pets.archived_at, pet_media.archived_at + is_favorite
  - 인덱스 4개
  - **미실행** — RELAY.md 최상단 기재
- [x] `/api/cron/subscription-lifecycle` 신규 (매일 KST 00:30)
  - readonly→hidden, hidden→countdown, countdown→free 단계 전환
  - countdown 단계 매일 알림 (D-10 ~ D-1, 톤 차등)
  - D+90 회귀 로직 (Phase 6 포함)
- [x] vercel.json 크론 등록 (`30 15 * * *` UTC)

#### Phase 2: 해지 로직 재설계
- [x] `/api/subscription/cancel` 신규 — 즉시 해제 X, phase=readonly로 전환
- [x] SubscriptionSection.tsx 수정 — 클라이언트 직접 update → API 호출
- [x] 해지 확인 모달 안내 문구 라이프사이클 설명으로 교체 (30+50+10일 단계 명시)
- [x] AuthContext에 subscriptionPhase, dataReadonlyUntil, dataHiddenUntil, dataResetAt 추가
- [x] types/index.ts에 SubscriptionPhase 타입 추가

#### Phase 3: 읽기 전용 UI
- [x] `useSubscriptionPhase` hook 신규 (phase 정보 + 차단 여부 + 남은 일수 + blockMessage)
- [x] `SubscriptionStatusBanner` 컴포넌트 신규 (단계별 톤, D-3부터 Sticky)
- [x] Layout.tsx 헤더 아래 배너 통합
- [x] RecordPage `handleAddNewPet` / `handleSavePet` / `handleMediaUpload`에 phase 가드 추가
- [x] **추모 전환 예외 처리**: readonly에서 active→memorial 변경만 허용 (죽음은 기다려주지 않음)
- [x] `lib/subscription-guard.ts` 서버 측 가드 헬퍼 (향후 다른 API에서 재사용)

#### Phase 4: 숨김 + AI 펫톡 일 3회
- [x] chat-pipeline에서 hidden/countdown 단계 진입 시 DAILY_CHATS=3으로 강제 오버라이드
- [x] 한도 도달 메시지에 라이프사이클 안내 추가
- [x] **결정**: hidden 단계에서도 보기는 허용 (USP 보호) — 별도 풀스크린 차단 안 함

#### Phase 5: 카운트다운
- [x] 크론에서 매일 카운트다운 알림 INSERT (톤 차등)
- [x] D-3부터 텔레그램 시스템 알림 (관리자 모니터링)
- [x] SubscriptionStatusBanner D-3~D-1 Sticky 모드
- [ ] 이메일 채널: Supabase Auth는 인증 전용이라 부적합 → Resend/SendGrid 후속 작업

#### Phase 6: 회귀 로직 (크론 통합)
- [x] protected_pet_id 결정 (가장 오래된 active 펫 → 없으면 가장 오래된 memorial 펫)
- [x] 보호 펫 외 archive (`archived_at = now()`)
- [x] 보호 펫의 사진 FREE_LIMITS.PHOTOS_PER_PET장 초과분 archive
  - 즐겨찾기(`is_favorite=true`) 우선 + 최근순으로 keepIds 선정
  - PostgREST .in() 한도(200) 고려한 배치 처리
- [x] profile: subscription_phase=free, is_premium=false, subscription_tier=free
- [x] 회귀 완료 알림 (반려동물 1마리 + 사진 N장 보존 안내)

#### Phase 7: 대표 펫 지정 UI
- [x] `/api/subscription/protected-pet` 신규 (본인 소유 + active 펫만)
- [x] SubscriptionSection에 라이프사이클 진입 시 대표 펫 select UI
- [x] 추모 펫도 대표 지정 가능 (USP — 데이터 앵커 원칙)

#### Phase 8: 재구독 복구
- [x] `lib/subscription-restore.ts` 신규
  - phase active로 초기화 + data_* 컬럼 NULL
  - 90일 이내 archived 펫 복구
  - 같은 조건으로 pet_media 복구 (배치 200)
  - 복구 완료 알림
- [x] `payments/complete/route.ts` grant_premium 직후 restoreFromLifecycle 호출
- [x] `payments/subscribe/complete/route.ts` 동일 통합
- [x] 복구 실패해도 결제는 성공 유지 (정합성)

### 검증
- next build 통과 (에러 0건)
- 모든 phase 빌드 검증 후 진행
- 최종 빌드 후 커밋 + 푸시

### 미해결 / 후속 작업
- ~~DB 마이그레이션 실행 필요~~ → **2026-04-11 실행 완료** (Supabase Dashboard)
  - 검증 통과: pets.archived_at, pet_media.archived_at, pet_media.is_favorite (3행)
  - profiles 6컬럼은 다음 세션 시작 시 한 번 더 검증 권장
- 마이그레이션 후 수동 E2E 테스트 (다음 세션 — 코워크)
- 이메일 알림 채널 (Resend 또는 SendGrid)
- 펫 카드 readonly 뱃지 (선택)

### 세션 종료 상태
- 커밋: 3ff726b (라이프사이클 + 논리 충돌)
- 푸시: main 완료, Vercel 자동 배포 트리거됨
- 마이그레이션: Supabase 실행 완료
- 다음 세션은 코워크에서 수동 테스트부터 시작

---

## [2026-04-10] 일일 요약 크론 분리 + 논리 충돌 전수조사

### 일일 요약 문제 해결
- [x] 아침 브리핑(텔레그램 일일 요약)이 안 오던 문제 진단
- [x] 원인: `daily-greeting/healthcheck` 내부 try/catch가 조용히 실패
- [x] `/api/cron/daily-summary` 독립 엔드포인트 신규 생성
  - Promise.allSettled로 쿼리 각각 독립 실행
  - notifyDailySummary 반환값 체크 → false면 즉시 notifyError
  - 쿼리 에러는 queryErrors로 응답 + 텔레그램 알림
  - 수동 호출 가능 (디버그용)
- [x] healthcheck에서 일일 요약 로직 제거 (단일 책임)
- [x] vercel.json에 `5 0 * * *` (KST 09:05) 스케줄 추가

### 분기점 전수조사
- [x] 사이트 전체 분기점 92개 식별 (7개 카테고리)
  - 모드 4, 권한 5, 펫 타입 2, AI 펫톡 18, 라우팅 18, 기능 제한 44, 기타 5
- [x] 가장 중요한 분기 5가지: 일상/추모, 구독 티어, 감정 9종, 애도 5단계, 위기 감지

### 논리 충돌 전수조사
병렬 에이전트 3명 투입해 논리 단계 충돌 검증. 초기 6개 발견했으나 재검증 후 **2개 제거** (4번 추모 펫 카운트, 5번 탈퇴 유저 필터링):

**실제 유효한 충돌 3개:**
- [ ] **2번: 차단 유저 AI 펫톡 우회** (심각)
  - `getAuthUser()`는 JWT 검증만 하고 `profiles.is_banned` 체크 없음
  - 차단된 악성 유저가 AI 펫톡 계속 사용 가능 → OpenAI 비용 누출
  - 수정: chat-pipeline.ts 초입에 is_banned 조회 추가 (15분)
- [ ] **3번: 신고 자동 숨김 미동작** (중간)
  - `AUTO_HIDE_REPORT_THRESHOLD=3` 상수는 있으나 실제 DB 업데이트 로직 없음
  - 텔레그램 알림만 발송, 게시글은 그대로 노출
  - 수정: reports/route.ts에 is_hidden 업데이트 추가 (10분)
- [ ] **6번: Service Role 권한 검증 누락** (중간)
  - createAdminSupabase() 사용 엔드포인트 중 관리자 검증 미확인 2개
  - memorial-messages, reports 재검토 필요 (30분)

**재평가로 제거된 것:**
- ~~4번: 추모 펫 카운트~~ → **오판**. 추모 펫은 데이터 앵커 역할. 일상 모드에서 쌓은 타임라인/사진/대화가 추모 모드의 재료가 됨. 카운트 분리는 데이터 연결 끊김 = 서비스 USP 붕괴.
- ~~5번: 탈퇴 유저 필터링~~ → **정책 확정**. 탈퇴 유저의 글/댓글은 남김 (다른 커뮤니티 관례 + 법적 증거 보존).

**재설계 필요한 것:**
- [ ] **1번: 구독 해지 라이프사이클** (대규모 재설계)
  - 현재: `is_premium=false` 즉시, UI 메시지와 불일치
  - 목표: 하이브리드 라이프사이클 (읽기전용 30일 → 숨김 50일 → 카운트다운 10일 → 무료 회귀)
  - 상세 설계: `docs/subscription-lifecycle.md` 참고
  - VS Code 세션에서 구현 예정

### 배운 교훈
- 추모 펫은 단순 "저장된 데이터"가 아니라 **데이터 연속성의 앵커**
- 초기 분석이 틀릴 수 있음 → 승빈님 반박도 비판적으로 검토
- "맞습니다" 자동 반응 금지 (승빈님이 명시적으로 지적)
- 국소 분석(쿼리 하나)보다 전체 맥락(데이터 플로우) 우선

---

## [2026-04-11] 구독 라이프사이클 재설계 + E2E 전체 검증

### 배경
이전 5단계 설계(readonly/hidden/countdown/free)의 readonly가 "아무것도 할 수 없는 무료 회원"
= 처벌 상태로 드러남. 승빈님이 지적: "readonly면 무료보다 못한 경험" → 재설계.

### 새 설계 (3단계)
- `active`: 평상시 (유료 or 무료 모두, 제약 없음)
- `cancelled`: 해지됨, premium_expires_at 전 (유료 혜택 그대로)
- `archived`: premium_expires_at 경과, 무료 회원 + 초과 데이터 잠금 (40일 후 hard delete)

추가 정책: 40일 후 archived 데이터 영구 삭제 (긴박감 + 스토리지 비용).

### 구현 (`391b910` 재설계 커밋)
- DB: subscription_phase CHECK 3개 값, data_readonly_until/data_hidden_until 컬럼 DROP
- types, AuthContext, hook, guard, banner, SubscriptionSection 전면 재작성
- cron subscription-lifecycle 3 phase로 단순화
- PetContext pets/pet_media 쿼리에 archived_at IS NULL 필터 추가

### E2E 테스트 중 발견한 버그 4가지
1. **Next.js 14 fetch 자동 캐싱** (가장 치명적)
   - Supabase JS 내부 fetch가 PostgREST 응답을 stale data로 반환
   - DB 변경 후에도 크론이 이전 상태 그대로 조회
   - 수정: `createClient`에 `cache: "no-store"` 커스텀 fetch 전달
   - cron-utils.ts (getServiceSupabase) + supabase-server.ts 모두 적용
2. profile update silent fail — 모든 update에 error 체크 + throw 추가
3. protected_pet_id FK 가드 누락 — 실존 검증 추가
4. notifications CHECK 제약 신규 type 4종 누락 — CHECK 확장

### E2E 전체 통과 (재설계 후)
- Test 1 cancelled 상태 설정 ✅
- Test 2 cancelled → archived 전환 + archive 2마리, 사진 9장 ✅
- Test 3 archived 카운트다운 알림 (D-5 "5일 남았어요") ✅
- Test 4 archived → active hard delete (펫 2 + 사진 9 영구 삭제) ✅
- Test 5 재구독 복구 (archived 펫 2 + 사진 4 복원) ✅

### 추가 기능 (`868ff42`)
- **잠금 펫 UI** (ArchivedPetsSection.tsx)
  - RecordPage에 "보관 중인 아이들" 섹션
  - grayscale + 자물쇠 뱃지 + 남은 일 수 + 재구독 CTA
- **Resend 이메일 채널** (src/lib/email.ts)
  - sendSubscriptionCancelledEmail — 해지 시 즉시 발송
  - sendArchiveCountdownEmail — D-10/D-5/D-1 경고
  - RESEND_API_KEY 환경변수 필요 (미설정 시 skip)
- cancel API, subscription-lifecycle 크론에 통합

### 커밋 목록
- `391b910` refactor: 구독 해지 라이프사이클 전면 재설계 (5→3단계)
- `60c0efb` fix: 라이프사이클 크론 에러 전파 + protectedPetId null 가드
- `0fb1726` debug: 디버그 정보 + FK 검증 가드
- `210cbb6` debug: cancelled 유저 fetched profile 값 응답 포함
- `aa8553c` debug: 전체 pets 리스트 디버그
- `998cecf` **fix: getServiceSupabase fetch no-store (핵심 버그)**
- `6d0411a` cleanup: 디버그 코드 제거 + supabase-server에도 no-store 적용
- `868ff42` feat: 잠금 펫 UI + Resend 이메일 채널
- `9dd9f00` docs: 2026-04-11 오후 세션 기록

### 후속 이슈 대응

**텔레그램 FK 에러 알림 ("타임머신 에러")**
- 17:54:45 수신: `archive fc09d16c...: protected_pet_id c66273f1... does not exist`
- 원인 추적: 17:41~17:56 사이 배포 타이밍. FK 가드(`0fb1726`)는 있지만 fetch no-store(`998cecf`)는 아직 없던 시점의 Vercel 크론 자동 실행
- 당시 PostgREST 캐시 때문에 stale UUID 반환 → 가드가 정상적으로 throw → 텔레그램 알림
- DB 실제 상태는 정상 (승빈님 active+premium, protected_pet_id null, 라이프사이클 유저 0명)
- **지금은 `998cecf` 이후 배포로 해결 완료**. 수동 크론 재호출 시 `errors: []` 확인.

### 블로그 크론 토픽 편중 수정 (`cec42a2`)
- 사용자 피드백: "자꾸 펫로스/추모 주제만 온다"
- 원인: 42개 토픽 중 펫로스 8개가 배열 맨 뒤에 몰려 있어 `days % length` 선택 시 **연속 8일 펫로스** 가능
- 수정: 요일 기반 결정론적 선택
  - **일요일**: 펫로스 토픽 (주 1회, 매주 다른 토픽 순환)
  - **월~토**: 반려동물 정보 토픽 (매일 다른 것)
- 결과: 펫로스 14.3% (주 1회), 정보글 85.7% — 균형 보장

---

## [2026-04-10] 이미지 업로드 자동 압축 + 서비스워커 버그 수정

### 문제
- 요즘 스마트폰 원본 사진(5-15MB)이 10MB 한도에 걸려 매거진 썸네일 업로드 실패
- 서비스 워커가 Supabase Storage POST 요청까지 캐싱 시도 → `cache.put() POST unsupported` 에러

### 해결 (3단계 커밋)

**커밋 ffa263b — 클라이언트 자동 압축 + 한도 상승**
- [x] src/lib/image-compress.ts 신규: Canvas API 기반 압축 유틸
  - 500KB 이하 스킵, GIF/HEIC 원본 유지
  - 1920px 이하 리사이즈 + JPEG 85% 5단계 품질 조정
  - 압축 실패 시 원본 반환 (안전)
- [x] src/lib/storage.ts: uploadMedia/uploadImage에 압축 적용
  - 펫 사진, 매거진, 커뮤니티, 지역, 분실 이미지 전부 자동 압축
  - 압축 후 contentType jpg 자동 전환
- [x] validateFileSize 한도 10MB → 20MB
- [x] VideoGenerateModal, useLostPostActions 에러 메시지 20MB 통일
- [x] src/config/constants.ts MAX_IMAGE_SIZE 10MB → 20MB

**커밋 f3b6900 — 서비스 워커 캐시 버전 업**
- [x] CACHE_NAME v1 → v2 (구버전 JS 번들 강제 무효화)

**커밋 3b9d59b — 진짜 원인 수정 (SW POST 캐싱 버그)**
- [x] 서비스 워커 fetch 핸들러 최상단에 `method === "GET"` 체크 추가
- [x] POST/PUT/DELETE는 브라우저 기본 동작에 맡김 (SW 관여 안 함)
- [x] CACHE_NAME v2 → v3
- [x] Cache API는 GET만 지원하는 한계를 준수

### 결과
- 아이폰 원본 12MB 사진 → 자동 압축 후 1MB 이하로 업로드 성공
- 서비스 워커 콘솔 에러 소멸
- 업로드 속도 빨라짐, Supabase Storage 사용량 절감

---

## [2026-04-10] 블로그 크론 Claude API 전환 (어드바이저 패턴)

### 어드바이저 전략 도입
- [x] @anthropic-ai/sdk v0.87.0 설치
- [x] /api/cron/blog-generate: Claude Sonnet 4.6 executor + Opus 4.6 advisor 전환
- [x] 베타 헤더 `advisor-tool-2026-03-01` 적용
- [x] 어드바이저 max_uses=2 (블로그당 최대 2회 Opus 가이던스 요청)
- [x] ANTHROPIC_API_KEY 미설정 시 GPT-4o-mini 폴백 자동
- [x] Claude 어드바이저 실패 시 일반 Sonnet 재시도, 그 다음 GPT 폴백 (3단계 폴백)
- [x] 텔레그램 헤더에 modelUsed 표시
- [x] 릴스/쇼츠 대본은 GPT-4o-mini 유지 (짧은 작업, 어드바이저 불필요)

### 다음 단계
- [ ] Vercel에 ANTHROPIC_API_KEY 환경변수 추가 필요
- [ ] 첫 실행 후 품질 비교 (GPT-4o-mini vs Claude Sonnet+Opus advisor)

---

## [2026-04-10] 디자인 토큰 전면 정리 (design-farmer)

### 컬러 하드코딩 → 토큰 시스템 전환
- [x] design-farmer v0.0.6 스킬 설치 (`~/.claude/skills/design-farmer/`)
- [x] tailwind.config.ts: memento 800/900/950 + memorial 팔레트 신규 정의
- [x] src/config/colors.ts: MEMENTO_COLORS 800-950 추가, MEMORIAL_COLORS 신규
- [x] 97개 파일 sky-*/blue-* → memento-* 전면 치환 (376회)
- [x] 75개 파일 amber-* → memorial-* 전면 치환 (460회)
- [x] DESIGN.md 신규 생성: OKLCH 기반 디자인 시스템 문서 (토큰 계층, 듀얼 테마, 다크모드 전략)

### 매핑 규칙
- sky-50/blue-50 → memento-200 (라이트 블루 서피스)
- sky-100/blue-100 → memento-200
- sky-{200-700}/blue-{200-700} → memento-{같은 번호} (색상 동일)
- sky-{800-950}/blue-{800-950} → memento-{같은 번호} (신규)
- amber-{50-950} → memorial-{같은 번호} (1:1 치환)

### 검증
- next build 통과 (에러 0건)
- 커밋 c1dfa71 — 127 files changed, +1150/-812
- main 푸시 완료 → Vercel 자동 배포 트리거

---

## [2026-04-10] 정기결제 크론 + 알림 벨 시스템

### DB 마이그레이션 2건
- [x] `profiles.device_fingerprint TEXT` 컬럼 추가 (Supabase 실행 완료)
- [x] `notifications` 테이블 생성 (RLS, dedup 인덱스, 5개 타입)

### 정기결제 자동 갱신 크론잡
- [x] `/api/cron/subscription-renewal` 엔드포인트 생성
- [x] 매일 KST 07:30 (UTC 22:30) 실행
- [x] 포트원 V1 `/subscribe/payments/again` 빌링키 재결제
- [x] 성공 시: 프리미엄 30일 연장 + 다음 결제일 갱신 + 텔레그램/인앱 알림
- [x] 실패 시: 3일간 매일 재시도, 3회 실패 시 구독 만료 + 프리미엄 해제
- [x] profiles 직접 업데이트 (grant_premium RPC 중복 INSERT 방지)

### 알림 벨 시스템 (신규 기능)
- [x] `GET/PATCH /api/notifications` — 알림 조회 (최근 50건) + 읽음 처리 API
- [x] `NotificationBell` 컴포넌트 — 헤더 벨 아이콘 + 빨간 뱃지 (9+) + 드롭다운 패널
- [x] `NotificationItem` 컴포넌트 — 타입별 아이콘, 상대시간, 읽음 표시
- [x] Layout.tsx 헤더 통합 (다크모드 토글 ↔ 유저 아바타 사이)
- [x] 알림 타입 5종: payment_success, payment_failed, subscription_expired, subscription_expiring, welcome
- [x] subscription-renewal 크론에 인앱 알림 INSERT 3건 추가 (성공/실패/만료)
- [x] 구독 만료 알림에 **반려동물 N마리, 사진 N장** 구체적 데이터 영향 안내

### 만료 예정 알림 크론
- [x] `/api/cron/notification-check` 엔드포인트 생성
- [x] 매일 KST 08:00 (UTC 23:00) 실행 — subscription-renewal 이후
- [x] 만료 D-3 경고: 무료 한도 초과 시 구체적 경고, 아닌 경우 결제수단 확인 요청
- [x] `dedup_key`로 하루 1회만 알림 (중복 방지)
- [x] 30일 지난 알림 자동 정리

### 타입/설정
- [x] `AppNotification`, `NotificationType` 타입 추가 (types/index.ts)
- [x] `apiEndpoints.ts`에 NOTIFICATIONS 엔드포인트 추가
- [x] `vercel.json` 크론 2개 추가 (subscription-renewal, notification-check)

### 인프라
- [x] Claude Code CLI 설치 (v2.1.97)
- [x] Claude Code VS Code 확장 설치
- [x] `~/.claude/settings.json` auto mode 설정
- [x] PowerShell 실행 정책 변경 (RemoteSigned)

---

## [2026-04-09] 대규모 세션 — 관리자 기능 + 영상 결제 + 성능 최적화 + 전수조사 + 콘텐츠 자동화

### 관리자 기능 3건
- [x] 유저 상세 조회: 카드 클릭 → 확장 패널 (펫 목록, 채팅수, 마지막 접속, 구독, auth 이메일/Google/Kakao 뱃지)
- [x] 게시물 탭: PostsSimpleView → AdminPostsTab (검색/상세보기/숨기기/삭제)
- [x] 대시보드 크레딧: AI 펫톡(OpenAI) + AI 영상(fal.ai) 사용량/예상비용 카드
- [x] 신규 API 3개: /api/admin/user-detail, /api/admin/posts, /api/admin/api-usage
- [x] Vercel 환경변수: OPENAI_MONTHLY_BUDGET=10, FAL_MONTHLY_BUDGET=10

### AI 영상 단건 결제
- [x] VideoPurchaseModal: "영상 1건 구매 3,500원" + 구독 안내 링크
- [x] /api/payments/video/prepare + complete API
- [x] quota API에 단건 구매 보너스 크레딧 반영
- [x] 함께보기 갤러리: 글쓰기 → 영상 만들기 버튼 (VideoGenerateModal 직접 오픈)
- [x] 모바일 결제 모달 안 보이는 문제: page.tsx 전역으로 이동 (display:none 이슈)

### 성능 최적화 (First Load JS 427KB → 234KB, 45% 감소)
- [x] React.lazy 탭별 코드 분할 (HomePage만 정적, 나머지 4탭 lazy)
- [x] lucide-react 트리쉐이킹 (next.config.js optimizePackageImports)
- [x] 히어로 이미지 PNG→WebP (608KB → 24KB, 96% 감소)
- [x] 홈 데이터 4개 fetch 순차→병렬 (Promise.all)
- [x] 함께보기 캐러셀 자동 슬라이드 (4초 간격)

### 전수조사 보안/안정성 수정 (CRITICAL 3건 + HIGH 5건 + MEDIUM 2건)
- [x] rate-limit.ts: 메모리 누수 방지 (5분 간격 만료 엔트리 정리)
- [x] minimi/purchase: 레이스컨디션 → DB RPC(FOR UPDATE 락) 전환
- [x] agent/shared.ts: 네트워크 에러 시 영구 false 캐싱 → 재시도 가능
- [x] telegram-webhook: secret_token 검증 추가
- [x] CSP unsafe-inline 필요 사유 문서화
- [x] colors.ts ↔ tailwind.config.ts 컬러 동기화
- [x] console.log 3건 제거 + 미사용 docx 패키지 제거
- [x] HomePage as unknown as 타입캐스팅 제거
- [x] PostDetailView fetchPost 에러 상태 + 재시도 버튼

### 대형 컴포넌트 분리 (기능 변경 없음)
- [x] AccountSettingsModal: 1,074줄 → 427줄 (+4파일: Blocked/Notification/Subscription/Delete)
- [x] PostDetailView: 1,211줄 → 639줄 (+4파일: Types/Header/Body/Comments)
- [x] MagazineReader: 1,155줄 → 429줄 (+3파일: CardUtils/CardRenderer/CardIndicator)
- [x] aria-label 누락 1건 수정 (AdminMagazineTab)
- [x] GET 엔드포인트 rate limit 추가 (memorial-today, adoption)

### 헤더/UI
- [x] 헤더 LevelBadge 아이콘 복원 (미니미만 제거, 등급 아이콘 유지)
- [x] 홈 함께보기 카드 클릭 → 해당 게시글 바로 열기 (갤러리 이동 아님)

### 네이버/구글 검색 등록
- [x] 네이버 서치어드바이저 소유 확인 완료 (HTML 파일 + 메타태그)
- [x] 네이버 사이트맵 제출 + 웹 페이지 수집 요청
- [x] naver-site-verification 메타태그 갱신
- [x] 네이버 확인 파일 Next.js 라우트로 생성 (public 404 우회)
- [ ] 구글 Search Console 색인 생성 요청 (승빈님 직접)

### 콘텐츠 자동화 (블로그 + 릴스)
- [x] 블로그 초안 자동 생성 크론 (/api/cron/blog-generate, 매일 KST 09시)
- [x] 42개 디테일 토픽 풀 (견종별/묘종별/건강/사료/펫로스/계절)
- [x] Tavily Search로 수의학/전문 자료 + YouTube 강형욱/수의사 채널 검색
- [x] 검색 결과를 GPT 컨텍스트에 주입 → 검증된 정보 기반 글 생성
- [x] 매일 릴스/쇼츠 대본도 텔레그램으로 같이 전송
- [x] 30일치 릴스 대본 docs/reels-shorts-30days.md 작성

### 보안 정책 전환
- [x] IP 기반 다중 계정 차단 제거 (가족/회사 유저 피해 방지)
- [x] 디바이스 핑거프린팅 도입 (브라우저 특성 해시)
- [x] 같은 디바이스 3개+ 계정 감지 시 텔레그램 경고 (모니터링 방식)
- [ ] DB: profiles.device_fingerprint TEXT 컬럼 추가 필요

### 카카오 OAuth
- [x] 카카오 개발자 콘솔에서 account_email "필수 동의"로 변경 (승빈님 직접)

### 메모리 기록
- [x] 메멘토애니 핵심 철학 기록 (유저와 희노애락을 함께하는 곳)
- [x] 카카오 이메일 필수 동의 변경 기록
- [x] 승빈님 프로필 업데이트 (이미 런칭된 서비스, MVP 아님)

---

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

## ~~[!!] 미실행 마이그레이션~~ ✅ 전부 실행 완료 (2026-03-24 DB 쿼리로 확인)

> 6개 마이그레이션 모두 실행됨. chat_mode, preferred_hour, placed_minimi, memory_albums, user_minimi, purchase/sell RPC, check_pet_limit 트리거 전부 DB에 존재 확인.

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
