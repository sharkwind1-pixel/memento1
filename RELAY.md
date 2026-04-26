# 릴레이 — TODO

> **새 세션 필독**: 이 파일만 읽으면 현재 할 일을 바로 알 수 있음.
> 완료 세션 로그 → `RELAY-LOG.md` | 완료 기능 목록 → `RELAY-ARCHIVE.md`

---

## 🔴 미실행 마이그레이션 (Supabase Dashboard에서 실행 필요)

### ⚠️ 2026-04-27 발견 — production DB에 적용 안 됨 (전수 감사로 확정)

PostgREST 직접 쿼리 시 `Could not find the table 'public.local_posts'` / `'public.lost_pets'` 에러 — feedback_lying_patterns 사례 6과 동일 (마이그레이션 파일은 git에 있는데 DB 실행은 누락된 케이스).

| 마이그레이션 | 영향 |
|---|---|
| `004_lost_pets.sql` | `/api/lost-pets` GET production 500 에러. 모바일 V3 lost.tsx 화면 동작 불가. |
| `005_local_posts.sql` | `/api/local-posts` GET production 500 에러. 모바일 V3 local.tsx 화면 동작 불가. |
| `20260427_rls_initplan_auto_optimize.sql` | RLS auth.uid() initplan 자동 치환 (116건) — 적용 시 RLS CPU 30~50% 절감. |

**적용 방법** — Supabase Studio:
1. https://supabase.com/dashboard/project/kuqhjgrlrzskvuutqbce/sql/new
2. 위 3개 SQL 파일 내용을 차례로 복붙 + Run
3. 적용 후 `select count(*) from local_posts` / `lost_pets`로 검증
4. RLS initplan은 적용 후 advisor 재실행 → `auth_rls_initplan` 0건 확인

---

_(다른 미실행 없음)_

### ✅ 2026-04-22 실행 완료 (Supabase MCP apply)
- `stories_24h_ttl` — stories 테이블 + 인덱스 3개 + RLS 3정책.
  (지난 세션에서 "실행 완료"로 기록됐지만 실제로는 partial index의 `NOW()` 제약으로
   실패해 테이블 자체가 없던 것을 이번 세션에서 발견 · 수정본으로 재적용)
- `protect_lifecycle_columns` — profiles 라이프사이클 7컬럼 보호 추가.
- `protect_lifecycle_search_path_fix` — SECURITY DEFINER + search_path 고정 (advisor WARN 해결).

### ✅ 2026-04-20~21 실행 완료 (Supabase MCP apply)
- `20260420_subscription_cancel_audit` — 감사 로그 테이블 신설 (RLS admin SELECT / service_role INSERT)
- `20260420_grant_premium_tier_fix` — grant_premium RPC tier 버그 수정 + subscriptions UPSERT
- `20260421_audit_retain_on_withdraw` — audit.user_id FK CASCADE → SET NULL (탈퇴 시 분쟁 기록 보존)
- `20260421_purchase_minimi_item_fix` — 미니미 구매 RPC auth.uid() 체크 제거 (service_role 호출 시 NULL 문제)

### ✅ 2026-04-16 실행 완료 — `20260412_admin_messages`
관리자 메시지/공지 발송 기능. Supabase MCP로 실적용, sender_id/CHECK/인덱스 3개 모두 검증됨.

---

## ✅ 2026-04-20~21 완료 — 구독 해지 전면 재설계 + 미니미 버그 수정

상세: `memory/session_20260420_21.md`

**구독 해지 새 정책**:
- 24h 이내 해지 → 전액 환불 (전자상거래법 숙려기간)
- 24h 이후 → ms 비율 pro-rata
- AI 영상 사용 -3,500원/건 차감 (월쿼터 내에서만, 이중 차감 금지)
- 해지 즉시 유료 기능 차단 + 4중 방어막 (락/선조회/롤백/텔레그램)
- **전액 환불은 `amount` 파라미터 생략** → PortOne clean 승인취소 (KCP 매입요청 hold 방지)

**신설 리소스**:
- `/api/subscription/cancel` (전면 재작성)
- `/api/subscription/refund-preview` (모달 표시용)
- `/api/admin/payment-refund` (관리자 강제 환불 + 상태 비교)
- `/api/cron/stuck-refund-check` (daily KST 11:30)
- `src/components/admin/tabs/PaymentRefundCard.tsx` (관리자 대시보드 카드)
- `src/data/minimiReactions.ts` (터치 반응 풀 9종 × 2모드 × 3레벨)

**해결된 사고 (imp_244463017101)**: 츄츄/dojin3497 9,900원 → 전액 환불 확정 (cancel_history 2건, PortOne cancel_amount 9900).

**미니미 구매 성공 복구**: RPC의 `auth.uid()` 체크가 service_role 호출 시 NULL이라 한 달간 성공 0건이었음. auth 체크 제거 후 복구.

**Vercel Hobby 크론 제약 학습**: 하루 1회 초과 시 배포 reject — 모든 크론 `0 X * * *` 또는 `Y X * * *` 패턴으로 고정 필요.

---

## 🚨 진행 중 블로커 (외부 대기)

### 결제 — KCP MID 교체 필요 (원인 확정 04-16 오후)

**근본 원인 확정**: 포트원 Benny 매니저 답변 →
> "A52LD 해당 정보는 테스트로 제공되는 공용 정보입니다.
>  실연동으로 설정된 정보 삭제 후 시도 부탁드립니다."

즉 포트원 콘솔의 실연동 채널(`mementoani-real`)에 박혀있던
A52LD / 4wtvaFYQknd3bJLVxa03mHO__ / A52LD1000913 은 모두
**포트원이 개발자 테스트용으로 공유하는 공용 더미값**.
KCP는 운영 채널에 테스트 MID가 들어와서 "미등록 사이트 [3014]" 거절.

**진짜 정보 (확인됨 / 미확인 표시)**:
| 항목 | 값 | 상태 |
|------|------|------|
| 사이트코드 (MID) | **`IP6S2`** | ✅ KCP 상점관리자에서 확인됨 |
| 사이트키 (암호화키) | ??? | ❌ KCP 영업담당자가 따로 전달 예정 |
| 정기결제 그룹ID | ??? | ❌ KCP 영업담당자가 따로 전달 예정 |
| 사이트명 | 메멘토애니_자동결제 | (정기결제 가능 사이트로 계약 OK) |
| 계약일시 | 2026.04.02 | |
| KCP 로그인 ID | mementoani2 | |

**다음 액션 순서**:
1. **지메일에서 KCP 담당자 찾기** — 검색 쿼리:
   ```
   from:kcp.co.kr OR from:help@kcp.co.kr (사이트키 OR 암호화키 OR 정기 OR IP6S2 OR 메멘토애니)
   ```
   계약 진행 중 메일 주고받았던 영업/계약 담당자 이메일 발견 시 바로 답장.
2. **담당자에게 보낼 메시지** (메일 또는 전화):
   ```
   안녕하세요. 메멘토애니 안승빈입니다.
   포트원 연동을 위해 실연동용 사이트키와 정기결제 그룹ID가 필요합니다.
   KCP 상점관리자에서는 조회되지 않아서 별도 전달 부탁드립니다.

   - 사이트코드: IP6S2
   - 사이트명: 메멘토애니_자동결제
   - 계약일시: 2026.04.02

   감사합니다.
   ```
3. **담당자 못 찾으면** KCP 일반상담 1544-8667에 전화해서
   "상점 IP6S2 메멘토애니 계약 담당자 연결" 요청.
4. **값 받으면 포트원 콘솔 작업**:
   - https://admin.portone.io → 메멘토애니(`store-db90fdc1-...`) 진입
   - 연동 정보 → 채널 관리 → 실연동 → `mementoani-real` 클릭 → "수정"
   - PG상점아이디(사이트코드): `A52LD` → **`IP6S2`**
   - 사이트키: `4wtvaFYQknd3bJLVxa03mHO__` → **(받은 값)**
   - 정기자동결제 그룹아이디: `A52LD1000913` → **(받은 값)**
   - 저장
5. **코드 측은 추가 작업 거의 없음**:
   - `src/lib/portone.ts` 의 기본 MID 폴백 `A52LD`을 `IP6S2`로 바꿀지 결정
     (또는 `NEXT_PUBLIC_PORTONE_KCP_MID` 환경변수 추가해 Vercel에서 IP6S2 주입)
   - 권장: env로 주입 → 채널 + MID 모두 환경변수로 관리
6. **결제 재테스트**:
   - 시크릿 모드 → mementoani.com → 베이직 9,900원 결제
   - 성공 시 KCP 상점관리자에서 즉시 승인취소
7. **실패 시 디버그**: `payments.metadata.debug_*` 필드가 기록되어 있음 (PR #14, #15).
   Supabase MCP로 `SELECT id, metadata FROM payments ORDER BY created_at DESC LIMIT 3;`

**주의**: 현재 `src/lib/portone.ts` 41행 `getKcpMid` 기본값이 `A52LD`로 박혀있음 (PR #16에서 추가됨). MID 교체 시 이 코드도 같이 바꾸거나 환경변수로 빼야 안전.

---

## 🎉 오픈 이벤트 "Open 100" (기획 확정, 구현 대기)

### 개요
출시 기념 선착순 100명 오픈 이벤트. 미션 완주를 통한 초기 유저 활성화 유도.

### 명세 (2026-04-16 확정)
| 항목 | 값 |
|------|-----|
| 대상 | **이벤트 오픈 이후 신규 가입자만** (기존 15명 제외) |
| 카운트 기준 | **온보딩 미션 전체 완료** 선착순 100명 |
| 미션 정의 | 기존 `profiles.onboarding_quests` 전체 완료 (일상 5단계 / 추모 4단계) |
| 보상 | **1,000P 일괄 지급** (완료 즉시) |
| 기간 | 100명 채워질 때까지 무제한 |

### 구현 체크리스트
- [ ] **DB 마이그레이션**: `profiles.open100_eligible BOOLEAN DEFAULT false` + `profiles.open100_awarded_at TIMESTAMPTZ`
  - `open100_eligible`: 이벤트 오픈 이후 가입자만 true로 플래그 (기존 15명은 false)
  - `open100_awarded_at`: 지급 완료 시각 (멱등성 체크)
- [ ] **`events` 또는 `app_config` 테이블**에 `open100_remaining INTEGER` (100에서 감소) — 또는 profiles에서 COUNT로 실시간 체크
  - 동시성 이슈: 99명 → 동시 2명 달성 시 101명 지급 방지 위해 DB 트랜잭션 또는 advisory lock 필요
- [ ] **`handle_new_user` 트리거 또는 회원가입 후 훅**: 가입 시점에 `open100_eligible = true` (이벤트 진행 중일 때만)
- [ ] **`/api/quests` 완료 처리 엔드포인트**에 Open 100 체크 추가:
  - 마지막 미션 완료 시 `open100_eligible=true && open100_awarded_at IS NULL && 현재 지급자 수 < 100` 체크 → 1000P 지급 + `open100_awarded_at = NOW()` + 지급자 수 +1
- [ ] **UI**: `QuestCard` 하단 또는 홈 배너에 "남은 자리 N/100" 실시간 표시
- [ ] **달성 시 토스트/축하 모달**: "메멘토애니 오픈 100 달성! 1,000P가 지급됐어요"
- [ ] **관리자 대시보드**: 이벤트 진행률 + 지급 완료 유저 목록 조회 섹션
- [ ] **텔레그램 알림**: 달성자 발생할 때마다 시스템 그룹으로 알림 (+ 100명 채워지면 완료 알림)

### 엣지 케이스
- 신뢰계정(ADMIN_EMAILS, TRUSTED_EMAILS)은 카운트 제외 (관리자/테스트가 자리 차지 방지)
- 추모 모드 4단계 완료도 동일하게 인정
- 탈퇴 후 재가입: `open100_eligible`은 신규 가입 시점 기준 1회만 부여 → 재가입자는 이벤트 만료된 상태
- 차단/탈퇴 대기 유저는 `open100_eligible=false`로 즉시 처리

### 홍보
- 대문 배너 + SNS 공지 문구 필요
- 인스타 릴스용 짧은 영상 (승빈님 직접 제작)

---

## 즉시 — 대기 중

### ✅ 2026-04-11 오후 세션 — 라이프사이클 전면 재설계 완료

#### 배경
이전 readonly/hidden/countdown/free 5단계 설계가 "아무것도 할 수 없는 무료 회원" 처벌 상태 문제.
→ 3단계 (active/cancelled/archived) 재설계 + 40일 후 hard delete.

#### 완료된 작업
- [x] **DB 마이그레이션 재실행**: subscription_phase CHECK 'active'|'cancelled'|'archived', data_readonly_until/data_hidden_until 컬럼 DROP
- [x] **cancel API 재작성**: premium_expires_at까지 혜택 유지, `data_reset_at = expiry + 40일`
- [x] **subscription-lifecycle 크론 재작성**: 3 phase (cancelled→archived→hard delete)
- [x] **types/AuthContext/hook/guard/banner/SubscriptionSection** 전면 재작성
- [x] **E2E 전체 검증 통과** (Test 1-5)
  - Test 2: cancelled → archived + archive 2마리, 사진 9장
  - Test 3: archived countdown D-5 알림 생성
  - Test 4: archived → active + hard delete 2마리, 사진 9장
  - Test 5: 재구독 복구 archived 펫 2 + 사진 4
- [x] **🔴 치명적 버그 수정: Next.js 14 fetch 자동 캐싱** (`998cecf`)
  - Supabase JS가 PostgREST 응답을 stale data로 반환하던 문제
  - cron-utils.ts + supabase-server.ts 모두 `cache: "no-store"` fetch 주입
- [x] 크론 에러 전파 + FK 가드 + notifications CHECK 4 종 추가
- [x] **ArchivedPetsSection.tsx** — RecordPage에 "보관 중인 아이들" 잠금 카드 섹션
- [x] **Resend 이메일 채널** (`src/lib/email.ts`)
  - sendSubscriptionCancelledEmail (해지 즉시)
  - sendArchiveCountdownEmail (D-10/D-5/D-1)
  - RESEND_API_KEY 환경변수 필요 (미설정 시 skip)
- [x] cancel API, subscription-lifecycle 크론에 이메일 통합
- [x] **블로그 크론 토픽 편중 수정** (`cec42a2`) — 요일 기반 결정론적 선택
  - 일요일만 펫로스 (주 1회, 14%)
  - 월~토 정보글 (주 6회, 86%)
  - 배열 modulo 순환의 연속 편중 문제 해결
- [x] **FK 타임머신 에러 진단** — 17:54 수신된 텔레그램 에러는 배포 타이밍 사이(fetch no-store 미반영)의 "유령" 에러. `998cecf` 이후 재발 안 함 확인.

#### 남은 작업 (VS Code 세션에서 진행 예정)
1. **시각적 회귀 테스트 (브라우저)**
   - 승빈님이 직접 본인 계정으로 archived 상태 수동 세팅 후 UI 확인
   - 상단 배너 (`SubscriptionStatusBanner`) 톤/카운트다운
   - RecordPage의 ArchivedPetsSection 잠금 카드 렌더
   - 추모 모드 전환 가능 여부
   - 테스트용 SQL (해지 → 복원):
   ```sql
   -- archived 상태 시뮬레이션 (D-5)
   UPDATE profiles SET subscription_phase = 'archived',
     is_premium = false, subscription_tier = 'free',
     data_reset_at = NOW() + INTERVAL '5 days'
   WHERE email = 'sharkwind1@gmail.com';

   -- 복원
   UPDATE profiles SET subscription_phase = 'active',
     is_premium = true, subscription_tier = 'premium',
     premium_expires_at = '2027-03-28 00:00:00+00',
     subscription_cancelled_at = NULL, data_reset_at = NULL,
     protected_pet_id = NULL
   WHERE email = 'sharkwind1@gmail.com';
   ```

2. **Vercel 환경변수 추가** (이메일 기능 사용 시)
   - `RESEND_API_KEY` — Resend 대시보드에서 발급
   - `RESEND_FROM_EMAIL` (선택) — 기본 "메멘토애니 <noreply@mementoani.com>"
   - 미설정이면 이메일 발송 skip, 앱 동작 영향 없음

3. **내일 아침 텔레그램 확인** — 월요일이므로 반려동물 정보 토픽 블로그 초안이 와야 정상. 펫로스가 오면 요일 로직 버그 재조사.

### ✅ 완료 (2026-04-11 세션)

#### 논리 충돌 수정 3건
- [x] 차단 유저 AI 펫톡 우회 차단 (`chat-pipeline.ts` is_banned 검증 추가)
- [x] 신고 3건 자동 숨김 실제 동작 (`reports/route.ts` is_hidden update + moderation_logs 기록)
- [x] Service Role 권한 검증 재확인 — memorial-messages/reports에 차단 유저 검증 추가

#### 구독 해지 라이프사이클 8 Phase 전체 구현
설계: `docs/subscription-lifecycle.md`

- [x] **Phase 1**: DB 마이그레이션 SQL + `/api/cron/subscription-lifecycle` 크론잡 (KST 00:30)
- [x] **Phase 2**: `/api/subscription/cancel` API + SubscriptionSection 해지 UI 수정 (즉시 해제 X)
- [x] **Phase 3**: `useSubscriptionPhase` hook + `SubscriptionStatusBanner` + RecordPage 가드 (편집/추가 차단, 추모 전환 예외)
- [x] **Phase 4**: 숨김 단계 AI 펫톡 일 3회 강제 제한 (chat-pipeline에 phase 검사 추가)
- [x] **Phase 5**: 카운트다운 알림 (크론에서 매일 INSERT, D-3부터 Sticky 배너 + D-3 텔레그램 모니터링)
- [x] **Phase 6**: 회귀 로직 (protected_pet_id 외 archive, 사진 50장 초과분 archive — 즐겨찾기 우선 + 최근순)
- [x] **Phase 7**: `/api/subscription/protected-pet` API + SubscriptionSection 대표 펫 선택 UI
- [x] **Phase 8**: `subscription-restore.ts` + payments/complete + payments/subscribe/complete 통합 (재구독 시 archived 자동 복구)

#### 라이프사이클 정책 (확정)
- 회귀 시: **Soft delete** (archived_at 컬럼)
- 대표 펫 기본값: **가장 오래된 활성 펫**, 없으면 추모 펫. 유저 변경 가능.
- 숨김 단계 AI 펫톡: **일 3회** 제한 (감정 의존 보호 + 비용 통제)
- 사진 50장 선별: **즐겨찾기 우선 + 최근순**
- 이메일 채널: 후속 작업 (현재는 인앱 알림 + 텔레그램만)
- 추모 펫 데이터 앵커 원칙 준수: 추모 펫도 대표 지정 가능, 카운트 분리 X

#### 잔여 작업 (다음 세션)
- [ ] 마이그레이션 SQL 실행 (위 🔴 섹션 참고)
- [ ] 마이그레이션 실행 후 수동 테스트 (해지 → readonly 진입 확인)
- [ ] 이메일 채널 연동 (Resend 또는 SendGrid) — Supabase Auth는 인증 메일 전용이라 부적합 (재검토 필요)

### 🟢 기타 대기
- [x] 카카오페이 심사 보완사항 회신 (결제경로 pptx + 서비스제공기간 + 사업자등록증 제출용) — 2026-04-10 메일 발송 완료
- [x] 정기결제 자동 갱신 크론잡 (subscription-renewal) — 매일 KST 07:30 실행, 포트원 V1 빌링키 재결제, 3회 실패 시 만료
- [x] DB 마이그레이션: `ALTER TABLE profiles ADD COLUMN device_fingerprint TEXT;` — 2026-04-10 실행 완료
- [x] 관리자 유저 상세 조회 — 유저 클릭 시 확장 패널 (가입일, 펫 수, 대화 수, 구독 상태, auth 이메일)
- [x] 관리자 게시물 탭 상호작용 — 검색/상세보기/숨기기/삭제 (AdminPostsTab)
- [x] 관리자 대시보드 크레딧 표시 — AI 펫톡(OpenAI) + AI 영상(fal.ai) 사용량/비용
- [x] AI 영상 단건 결제 (3,500원/건) — VideoPurchaseModal + 전용 결제 API
- [x] AI 영상 모델 Veo 3.1 Fast로 교체 (Minimax → Kling → Veo 3.1)
- [x] AI 영상 프롬프트 템플릿 전면 고도화 (Fun 6개 + Memorial 6개 + Transform 1개)
- [x] FAL_KEY Vercel 설정 완료

## 완료 — UX/버그 (이전)

- [x] route.ts 디버그 로그 제거 (chat/particles)
- [x] 오프라인 감지 + Supabase auto-refresh 재시도 제한 (useOnlineStatus + OfflineBanner)
- [x] 포인트 상점 서버 데드코드 제거 (premium_trial 핸들링)

---

## MVP 런칭 — 결제 + 프리미엄

- [x] PortOne 환경변수 설정 (STORE_ID, CHANNEL_KEY, API_SECRET → .env.local + Vercel)
- [x] KCP 외부 전산 세팅 완료 (2026-04-06 문자 수신)
- [x] KCP 카드사 심사 요청 (부가합의서 자필서명 + 사업자등록증 제출용 + 신분증 재촬영)
- [x] KCP 계약서류 온라인 제출
- [x] 보증보험 200만원 가입
- [x] 배치결제(정기결제) 연동 — subscribe/prepare + complete API + PremiumModal 구독 UI
- [ ] 카드사 심사 완료 대기 (인증+배치 동시 재신청 2026-04-08)
- [ ] KCP 실연동 채널 생성 + 결제 테스트 후 실결제 전환
- [x] 정기결제 자동 갱신 크론잡 (subscription-renewal) — 2026-04-10 구현 완료
- [x] 포트원(PortOne) 결제 연동 코드 — CSP 도메인 허용, 환경변수 사전 체크 추가
- [x] 스마트 프리미엄 전환 UX — 직전 대화 주제 반영 동적 문구 + 잔여 횟수별 안내

---

## AI 펫톡 킬러 기능

- [x] 대화 내보내기 (편지/카드) — ExportChatCard + ExportChatModal (4개 템플릿, PNG/JPG, Web Share)
- [x] 대화 내 사진 연동 — extractKeywordsFromReply + pet_media 캡션 매칭

---

## AI 프롬프트 개선 — Phase 3

- [x] pending_topic — getLatestPendingTopic + ---PENDING_TOPIC--- 파싱 + DB 저장
- [x] 시간대별 에너지 — 일상+추모 모드 모두 적용 (4시간대: 아침/낮/저녁/밤)

---

## UI/UX 비주얼

- [x] 추모 별 float-up 애니메이션 — MemorialSection에 CSS-only 파티클 6개
- [x] 타이핑 인디케이터 감성 텍스트 — 이미 구현 확인 (강아지/고양이/추모 4세트)
- [x] 발자국 버블 데코 — paw-drift 애니메이션 + MemorialSection 데코 4개

---

## 리팩토링 + 기타

- [x] 대형 컴포넌트 분리: AIChatPage (1408줄 → 372줄, 이미 분리 완료)
- [x] API URL 마이그레이션: 클라이언트 전체 apiEndpoints.ts 상수로 전환
- [x] 치유의 여정 대시보드 — API + HealingJourneySection 구현 완료 (감정추이/애도단계/마일스톤)
- [x] 대화→타임라인 자동 생성 — saveAutoTimelineEntry 10턴마다 자동 실행
- [x] 미니미 도감 + 터치 이펙트 — MinimiCollection 도감 + MinihompyStage 터치 이펙트

---

## 완료 항목 (2026-04-10 세션)

### 정기결제 자동 갱신
- [x] /api/cron/subscription-renewal — 포트원 V1 빌링키 재결제 크론 (KST 07:30)
- [x] 3회 실패 시 구독 만료 + 프리미엄 해제 + 텔레그램/인앱 알림

### 알림 벨 시스템
- [x] notifications 테이블 + RLS + dedup 인덱스 (Supabase 마이그레이션)
- [x] GET/PATCH /api/notifications — 알림 조회 + 읽음 처리
- [x] NotificationBell + NotificationItem 컴포넌트 (헤더 통합)
- [x] 알림 5종: 갱신완료/결제실패/구독만료/만료예정/환영
- [x] 구독 만료 시 반려동물/사진 수 구체적 데이터 영향 안내
- [x] /api/cron/notification-check — 만료 D-3 경고 크론 (KST 08:00)
- [x] 30일 지난 알림 자동 정리

### DB 마이그레이션
- [x] profiles.device_fingerprint TEXT 컬럼 추가
- [x] notifications 테이블 신규 (RLS + dedup 인덱스)

### 디자인 토큰 전면 정리 (design-farmer)
- [x] design-farmer v0.0.6 스킬 설치
- [x] tailwind.config.ts: memento 800/900/950 + memorial 팔레트 신규
- [x] 97개 파일 sky-*/blue-* → memento-* (376회 치환)
- [x] 75개 파일 amber-* → memorial-* (460회 치환)
- [x] DESIGN.md 신규: OKLCH 기반 디자인 시스템 문서

### 블로그 크론 Claude API 어드바이저 패턴
- [x] @anthropic-ai/sdk v0.87.0 설치
- [x] Sonnet 4.6 executor + Opus 4.6 advisor 베타 적용
- [x] 3단계 폴백 (Claude+advisor → Claude 단독 → GPT-4o-mini)
- [x] ANTHROPIC_API_KEY 미설정 시 자동 GPT 폴백

### 이미지 업로드 개선
- [x] src/lib/image-compress.ts: Canvas API 기반 자동 압축 유틸
- [x] uploadMedia/uploadImage 전 경로에 압축 적용
- [x] 파일 크기 한도 10MB → 20MB 상승
- [x] 서비스 워커 POST 캐싱 버그 수정 (GET만 캐싱)
- [x] CACHE_NAME v1 → v3 업데이트

### 인프라
- [x] Claude Code CLI + VS Code 확장 설치
- [x] auto mode 설정 (~/.claude/settings.json)
- [x] PowerShell 실행 정책 RemoteSigned 변경
- [x] bypassPermissions 모드 전환

### 마케팅
- [x] 릴스 1 제작 + 업로드 (영상/캡션/썸네일/쇼츠 설명)

---

## 완료 항목 (2026-04-07 세션)

### PortOne V1 결제 연동 (PC + 모바일)
- [x] V2 SDK → V1 SDK 전환 (iamport.js CDN + IMP.request_pay)
- [x] IMP.init()에 가맹점 식별코드(imp47365370) 사용 (V2 Store ID 아님)
- [x] complete API: V2 REST API → V1 REST API (imp_uid 기반 조회)
- [x] mobile-redirect: V1 쿼리 파라미터 대응 (imp_uid, merchant_uid, imp_success)
- [x] CSP: strict-dynamic 제거 (호스트 allowlist 무시 문제), *.iamport.kr + *.kcp.co.kr 추가
- [x] CSP: form-action에 결제 도메인 추가 (모바일 폼 서밋 허용)
- [x] KCP 결제 취소 메시지 정제 ("결제포기" → "결제가 취소되었습니다")
- [x] Vercel 환경변수: PORTONE_MERCHANT_CODE, PORTONE_REST_API_KEY 추가

### 보안
- [x] 탈퇴 계정 관리자 접근 차단 — refreshProfile()에 can_rejoin 체크 추가

### AI/UI/리팩토링
- [x] 추모 모드 시간대별 에너지 추가 (아침/낮/저녁/밤 4단계)
- [x] MemorialSection 별 float-up 파티클 6개
- [x] 발자국 버블 데코 (paw-drift 애니메이션)
- [x] API URL 하드코딩 → apiEndpoints.ts 전면 마이그레이션 (12개 파일)
- [x] 기존 완료 항목 RELAY 체크 (내보내기/사진연동/pending_topic/AIChatPage 분리)

### 인프라
- [x] KCP 외부 전산 세팅 완료 확인 (2026-04-06 문자 수신)
- [x] 새 컴퓨터 git config 설정

---

## 완료 항목 (2026-04-03 세션) — 총 30+건

### 결제 연동
- [x] 포트원 Store ID, Channel Key, API Secret 발급 + .env.local 설정
- [x] CSP에 포트원 도메인 허용 (*.iamport.co, *.portone.io)
- [x] 환경변수 getter 변경 (빌드 시점 캐싱 방지)
- [x] PremiumModal 환경변수 미설정 시 사전 체크 추가
- [x] Vercel 환경변수 추가 (PORTONE, VAPID, TELEGRAM 전부)

### 성능 최적화 (Spotify 전략 참고)
- [x] img -> OptimizedImage 교체 (11개 파일 21곳, WebP/AVIF 자동 변환)
- [x] Storage cacheControl 1시간 -> 1년
- [x] 정적 에셋 캐시 헤더 강화 (폰트 1년 immutable, 로고 1일)
- [x] PetContext select("*") -> 명시적 컬럼 선택 (3곳, 페이로드 15-25% 감소)
- [x] 미디어 업로드 병렬화 (순차 -> Promise.allSettled 배치 3개씩)
- [x] 서비스 워커 캐싱 전략 추가 (정적 에셋 Cache First, 이미지 SWR)
- [x] loading.tsx 추가 (초기 빈 화면 방지)
- [x] OptimizedImage src prop 변경 시 state 동기화 수정

### 버그 수정
- [x] PetFormModal 모바일 깜빡임 해결 (useBodyScrollLock 제거 -> overflow:hidden)
- [x] PetFormStep1 OptimizedImage 롤백 (모달 내 shimmer 깜빡임)
- [x] PetFormModal step 변수 선언 순서 빌드 에러 수정

### UX 개선
- [x] 스마트 프리미엄 전환 UX: 직전 대화 주제 반영 동적 문구
- [x] 프리미엄 배너: 잔여 1회 "마지막 1회" 강조
- [x] 오프라인 감지 배너 (useOnlineStatus + OfflineBanner)
- [x] Supabase auto-refresh: 오프라인 시 stopAutoRefresh, 복귀 시 restart

### 정리/데드코드
- [x] chat/route.ts particles 디버그 로그 제거
- [x] 포인트 상점 premium_trial 데드코드 60줄 삭제
- [x] Supabase pg_cron 중복 POST job 삭제 (hourly-reminder-cron)

### 텔레그램 관리 시스템
- [x] 텔레그램 봇 생성 (@mementoani_admin_bot)
- [x] 알림 유틸리티 (src/lib/telegram.ts): 신고/결제/크론/에러/일일요약
- [x] 채널별 그룹 분리 (신고/결제/시스템 3개 그룹)
- [x] 신고 접수 시 텔레그램 알림
- [x] 결제 완료 시 텔레그램 알림
- [x] 크론 에러/실패 시 텔레그램 알림
- [x] AI 모더레이션 자동 숨김 시 텔레그램 알림
- [x] 반복 위반 유저 (30일 3회+) 경고 알림
- [x] 텔레그램 Webhook: 양방향 관리 명령어 (/stats, /ban, /hide, /premium 등)
- [x] HTML 이스케이프 (사용자 입력 안전 처리)

### 24시간 자동 모니터링
- [x] 매시간 헬스체크 (DB 6개 테이블 + OpenAI API)
- [x] 이상 발견 시 텔레그램 시스템 알림 자동 발송
- [x] 매일 09시 일일 요약 (전체회원/신규가입/대화/게시글/신고)

### 게시판 자동 관리 강화
- [x] 신고 3건 누적 자동 숨김 시 텔레그램 알림
- [x] 반복 위반 유저 차단 검토 경고 알림

### 보안 검수
- [x] payments API rate limit 추가 (prepare, complete)
- [x] reports API 입력값 검증 강화 (targetType/reason 화이트리스트, 500자 제한)
- [x] 텔레그램 알림 HTML 이스케이프 적용

### 크론/알림 인프라
- [x] Vercel Deployment Protection 비활성화 (크론 401 해결)
- [x] healthcheck 테이블명 수정 (posts -> community_posts)

---

## 완료 항목 (이전 스프린트)

- [x] 신고 API 서버 전환 (/api/reports 생성, RLS 우회) + 신고 버튼 액션바 배치
- [x] 사업자 정보 전화번호 추가 (010-5458-2506, KCP 카드사 심사 필수)
- [x] KCP 결제 pg_cron SQL 작성 + 매시간 리마인더 크론 실행 설정 완료
- [x] 간편모드 히어로 폰트 개선 (Jalnan2→Pretendard, 줄바꿈)
- [x] 한국어 조사 후처리: 클라이언트 인사말 generatePersonalizedGreeting 래핑
- [x] 한국어 조사 후처리: 서버 스트리밍 실시간 교정 (route.ts fixKoreanParticles)
- [x] 한국어 조사 후처리: DB 로드 시 교정 (useAIChat)
- [x] 프롬프트 내 잘못된 조사 전면 수정 ("꼼지이다"→"꼼지다") + GPT에 조사 규칙 명시
- [x] 좋아요 낙관적 UI + useRef 이중 클릭 방지 + adminSupabase 전환
- [x] 댓글 작성자 닉네임 익명 표시 수정 (author_name 폴백)
- [x] 홈↔커뮤니티 데이터 연동 (refetchAll)
- [x] 탭 전환 깜빡임 방지 (CSS fade-in)
- [x] 추모 모드 계정 전환 시 잔류 문제 해결 (localStorage 정리)
- [x] 리마인더 알림: Supabase pg_cron 매시간 크론 설정
- [x] 간편모드 히어로 배너 + 모바일 사이드바 토글
- [x] 가격 변경 9,900/18,900원
- [x] 미니홈피 fallback 미니미 제거
- [x] 사이드바 미니홈피 서브탭 직접 이동
- [x] 내 기록 페이지 복귀 시 서브탭 리셋
- [x] 대화 내보내기 폰트 깨짐 수정
- [x] 추모 섹션 프로필 사진 sharp 썸네일 + EXIF 회전
- [x] 추모 섹션 REST API 직접 호출로 RLS 문제 해결
- [x] 성능: API 응답 98% 감소 + RAF 가시성 최적화
- [x] AI 조사 후처리: 클라이언트 인사말 + 서버 스트리밍 + DB 로드 교정
- [x] AI 견종 맞춤 케어 응답 강제
- [x] 추모 섹션 빈 상태 UI 개선 + 포인트 상점 프리미엄 체험 제거
- [x] GPS 장례식장 안내 + 한국어 조사 후처리 (4-1-G 완료)
- [x] 전체 코드리딩 + 8인 팀 토론 (75건 이슈 발견)
- [x] 보안 P0 수정 3건 (SQL 인젝션 2건, 레거시 secret 제거)
- [x] AI 안전 P0 수정 2건 (위기감지 순서, 응급 키워드 조사)
- [x] 데드코드 2125줄 제거 (6개 파일 삭제)
- [x] 미사용 타입 14개 제거 + 섹션 번호 정리
- [x] 프론트엔드 개선 (CommunityPage memo, Sidebar/Layout 정리)
- [x] 홈 인기 이야기 → 펫매거진 스타일 세로 리스트로 변경
- [x] AI 응급/긴급 증상 감지 대폭 강화 (키워드 매칭 + 4단계 프롬프트)
- [x] .env.example에 TAVILY_API_KEY 추가
- [x] 댓글 에러 응답에서 내부 정보 노출 제거
- [x] 추모/일상 AI 파라미터 차별화 (presence/frequency penalty)
- [x] 게시판 자동 모더레이션 (욕설/스팸/도배/신고/AI)
- [x] 비추천 시스템 (+5P/-5P, 20개 자동 숨김)
- [x] 댓글 좋아요/비추천
- [x] 홈 PostModal 제거 → 커뮤니티 상세 이동
- [x] 추모 AI 프롬프트 전면 재작성 (시점/자해/감정회피/성격충돌)
- [x] Tavily Search API 연동 (케어 검색 RAG)
- [x] 추모 모드 실용 질문 검색 허용
- [x] Hydration mismatch 해결 (5개 파일)
- [x] ESLint 빌드 에러 수정
- [x] 홈 매거진 카드 배치 수정
- [x] DB 마이그레이션 전부 실행 확인
- [x] 커뮤니티 5개 게시판 공지글
