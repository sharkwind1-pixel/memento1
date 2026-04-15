# 메멘토애니 인수인계 (2026-04-15 18:00 KST)

다른 컴퓨터로 이동해서 작업 계속할 때 이 문서부터 보면 됨.

---

## 🚨 최우선 블로커: 결제 연동 (미해결)

### 현재 증상
- `/api/payments/subscribe/complete` 500 에러
- DB `payments.metadata.portone_api_error` = **"존재하지 않는 결제정보입니다."**
- 3번 연속 재현 (도진 계정 `e9453161-44db-4853-9a5c-683cc7931c0b`)
- 실제 카드는 안 긁힘 (실연동 채널까지 도달 못 함)

### 무엇을 봐야 하나 (다른 컴퓨터에서 제일 먼저)

DB에서 최신 결제 시도의 `metadata` 확인:
```sql
SELECT id, created_at, metadata
FROM payments
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 3;
```

**PR #14**에서 진단 필드 추가했음:
- `metadata.debug_imp_uid` — 프론트가 보낸 impUid
- `metadata.debug_payment_id` — merchant_uid
- `metadata.debug_api_key_prefix` — 서버가 쓴 `PORTONE_REST_API_KEY` 앞 6자리

이 값들 보면 원인 확정됨:
- `debug_api_key_prefix`가 `683741`이 아니면 → Vercel 환경변수 반영 안 됨
- `debug_imp_uid`가 이상한 값이면 → 프론트 채널 키 문제

### 유력 원인 TOP 3

| 순위 | 원인 | 확인 방법 |
|------|------|----------|
| 1 | **Vercel 환경변수가 Production 스코프에 반영 안 됨** | Vercel Settings → Environment Variables → 각 항목 우측 "Production" 뱃지 확인 |
| 2 | **Redeploy 시 Build Cache 사용함** (NEXT_PUBLIC_*이 구버전 번들로 빌드됨) | Deployments → ⋯ → Redeploy → **"Use existing Build Cache" 체크 해제** 필수 |
| 3 | **PortOne V1 Secret이 V2 값으로 잘못 박힘** | PR #14 진단으로 확인 가능 |

### 필요한 Vercel 환경변수 (확인 필수)

| 환경변수 | 값 |
|---------|---|
| `NEXT_PUBLIC_PORTONE_MERCHANT_CODE` | `imp47365370` |
| `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` | `channel-key-6695f681-bae7-4ff4-bb78-73a690ebca7d` (**실연동 채널**) |
| `NEXT_PUBLIC_PORTONE_BATCH_CHANNEL_KEY` | `channel-key-6695f681-bae7-4ff4-bb78-73a690ebca7d` (같은 값) |
| `PORTONE_REST_API_KEY` | `6837414562704126` |
| `PORTONE_API_SECRET` | ⚠️ **V1 REST API Secret 재발급 후 값** (아래 참고) |

모두 **Production** 스코프에 체크되어야 함.

### ⚠️ V1 Secret 재발급 필수

채팅창에 V1 Secret 평문 노출된 적 있음:
```
6yo2kiH8XrXiZiavuSWOWzn2f95OCfadWv2wFeUKhzmvyWFcLUGSUdXcLEZyvncsvUtB5PuOH8VQW7jW
```

PortOne 콘솔 → 식별코드 · API Keys → V1 API → **"REST API Secret 재발급"** 버튼 → 새 값을 Vercel의 `PORTONE_API_SECRET`에 붙여넣기 → **Redeploy (Build Cache 끄기)**.

### PortOne 관련 정보

- 스토어 ID: `store-db90fdc1-08f5-4c24-855f-228e1abe1b32`
- 고객사 식별코드 (Merchant ID): `imp47365370`
- V1 REST API Key: `6837414562704126`
- **실연동 채널**: `mementoani-real` / 채널 키 `channel-key-6695f681-bae7-4ff4-bb78-73a690ebca7d`
- **테스트 채널**: `mementoani` / 채널 키 `channel-key-ea53bfbb-1dc9-4a59-a0de-19bd591372d7` (지금 쓰면 안 됨)
- KCP 사이트 정보 (실연동): PG상점ID `A52LD`, 사이트키 `4wtvaFYQknd3bJLVxa03mHO__`, 정기그룹ID `A52LD1000913`

### 카드사 심사 상태 (참고)
- 9개 완료: 삼성/신한/BC/하나/하나(외환)/현대/롯데아멕스/NH/우리
- 1개 심사중: **KB국민카드 (인증+정기과금)**
- KB국민카드 결제 실패 시 안내 메시지는 `src/lib/portone.ts`에 이미 추가됨 (PR #12)

### PortOne 정식 오픈 메일 도착
`cs@portone.io`에서 "PG 계약 완료 실운영모드 세팅 완료" 메일 받음. PortOne 측은 준비됐고, 우리 쪽 환경변수 반영만 남음.

---

## ✅ 오늘 완료된 작업 (2026-04-15)

| PR # | 내용 | 상태 |
|------|------|------|
| #2 | 다중 계정 탐지 화이트리스트 (관리자/테스트 계정) | 머지 |
| #3 | 온보딩 미션 시스템 (게임화 가이드) 전체 | 머지 |
| #4 | 어드민 온보딩 리셋에 미션 포함 | 머지 |
| #5 | 간편모드(SimpleHomeLauncher)에도 미션 카드 표시 | 머지 |
| #6 | 신뢰 계정 한정 미션 강제 완료 버튼 (테스트 모드) | 머지 |
| #7 | 온보딩 리셋 후 닉네임 입력 → 온보딩 모달 미표시 fix | 머지 |
| #8 | 리마인더 알람 안 오던 버그 + 수정 UI 추가 (⚠️ Vercel Hobby 크론 제한으로 배포 실패했다가) | 머지 |
| #9 | Vercel 크론 제거 (pg_cron 활용) — 배포 복구 | 머지 |
| #10 | 추모 전환 시 케어 리마인더 자동 비활성화 | 머지 |
| #11 | 텔레그램 인스타 릴스/쇼츠 대본 자동 전송 제거 | 머지 |
| #12 | KB국민카드 결제 실패 시 안내 개선 | 머지 |
| #13 | PortOne 에러 로그 API 키 평문 노출 마스킹 (보안) | 머지 |
| #14 | 결제 검증 실패 진단 로그 (impUid/paymentId/API_KEY 기록) | 머지 |

### 주요 DB 마이그레이션 (오늘 적용됨, 별도 SQL 파일 없음)

1. **profiles.login_streak, last_login_date** 추가 + `daily_login_check` RPC 재정의 (연속 출석 보너스)
2. **profiles.onboarding_quests JSONB** 추가 (미션 진행 상태)
3. **추모 펫의 enabled=true 리마인더 일괄 비활성화** (데이터 마이그레이션)
4. **daily_login_check RPC `points` 컬럼 ambiguous 버그 수정** (오늘 실제 에러 나서 fix)

---

## 📋 현재 페이징 되어 있는 컨텍스트

### 리마인더 알람 이슈 (해결됨)
- 원인: `daily-greeting` 크론이 하루 1회만(UTC 22:00 = KST 07:00) 실행되는데, `reminders` 서브라우트가 "현재 KST 시간 = 리마인더 시간"만 조회 → 07시 외 모든 리마인더 영원히 스킵
- 승빈님 꼼지 20시 산책 리마인더도 스킵 당함
- 추가 원인: 꼼지가 **memorial 상태**라 쿼리 조건 `pets.status = 'active'`에서도 제외
- 해결: Supabase pg_cron의 `hourly-push-notifications`가 이미 매시간 호출 중이라 Vercel 크론 불필요 (PR #9). 추모 전환 시 리마인더 자동 비활성화 로직 추가 (PR #10).

### 온보딩 미션 시스템 (완료)
- 일상 모드 5단계: 펫 등록 → 사진 → AI 펫톡 → 타임라인 → 커뮤니티
- 추모 모드 4단계: 펫 등록 → AI 펫톡 → 추모 메시지 → 앨범
- 홈 상단 `QuestCard` (일반 + 간편 홈 양쪽)
- 신뢰 계정(TRUSTED_EMAILS)은 "테스트: 이 단계 완료 처리" 버튼으로 강제 완료 가능
- 보너스 포인트: 사진 +20P, AI펫톡 +20P, 타임라인 +20P, 커뮤니티 +50P

### 네이버 로그인 (검수 승인)
- 오늘 승인 완료됨 → 모든 네이버 ID 가입 가능
- 코드 변경 0

### 텔레그램 일일 브리핑
- 인스타 릴스/쇼츠 대본은 제거 (유저 피드백)
- 블로그 초안만 발송 유지

---

## 🔄 다른 컴퓨터에서 이어갈 때 순서

### 1. 최신 코드 가져오기
```bash
cd <memento1 경로>
git checkout main
git pull origin main
```
모든 오늘 작업은 main에 머지되어 있음.

### 2. Vercel 환경변수 재확인 + 재배포
- 위 "필요한 Vercel 환경변수" 표대로
- Production 스코프 체크
- Build Cache 해제하고 Redeploy

### 3. V1 Secret 재발급 (필수, 채팅 노출 건 때문)
- PortOne 콘솔 → V1 API → REST API Secret 재발급
- 새 값 Vercel에 즉시 반영

### 4. 결제 테스트
- 시크릿 모드 브라우저로 mementoani.com 접속
- 본인 계정 또는 테스트 계정으로 9,900원 베이직 구독 결제
- 성공 시: KCP 상점관리자에서 즉시 승인취소
- 실패 시: DB `payments.metadata` 의 `debug_*` 필드 확인

### 5. 결제 성공 확인 후 다음 할 일
- 구독 해지 플로우 테스트
- PortOne 결제 내역에서 취소까지 한 사이클 돌려보기
- 웹훅 설정 확인 (PortOne → 결제알림(Webhook) 관리)

---

## 🛠 유용한 명령어 모음

### 최근 결제 시도 확인
```sql
SELECT id, user_id, status, amount, created_at, metadata
FROM payments
ORDER BY created_at DESC
LIMIT 10;
```

### 승빈님 리마인더 상태 확인
```sql
SELECT p.name, p.status, pr.title, pr.schedule_time, pr.enabled, pr.last_triggered
FROM pet_reminders pr
JOIN pets p ON p.id = pr.pet_id
JOIN profiles pf ON pf.id = pr.user_id
WHERE pf.email IN ('sharkwind1@gmail.com', 'sharkwind1@naver.com');
```

### pg_cron 상태 확인
```sql
SELECT jobname, schedule FROM cron.job ORDER BY jobid;
```

### Vercel 배포 상태 (CLI)
```bash
# 최신 배포
vercel ls

# 환경변수 목록 (값은 안 보임, 이름만)
vercel env ls production
```

---

## 📎 참고 링크

- Vercel 프로젝트: https://vercel.com/seungbin-ahns-projects/memento1
- 환경변수: https://vercel.com/seungbin-ahns-projects/memento1/settings/environment-variables
- PortOne 콘솔: https://admin.portone.io
- Supabase 프로젝트: https://supabase.com/dashboard/project/kuqhjgrlrzskvuutqbce
- GitHub 리포: https://github.com/sharkwind1-pixel/memento1
- KCP 상점관리자: https://admin8.kcp.co.kr

---

## ⚠️ 보안 노트

- 채팅창에 PortOne V1 Secret 노출된 적 있음 → **반드시 재발급**
- 로그에 키 평문 노출 방지 마스킹은 PR #13으로 적용됨
- 다른 컴퓨터에서 작업 시작 전 `.env.local` 파일은 절대 git에 커밋하지 말 것

---

## 📝 작은 마무리 작업 (여유 있을 때)

- `.gitignore`에 `.claude/worktrees/` 추가 (의도치 않게 커밋되는 중)
- GitHub 알림 설정에서 vercel[bot] 메일 필터링 (https://github.com/settings/notifications)
