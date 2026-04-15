# 메멘토애니 인수인계 (2026-04-15 18:00 KST)

다른 컴퓨터 + **새 Claude 세션**에서 이어갈 때 이 문서부터 보면 됨.
이 세션(컨텍스트 0)에서 바로 작업 이어갈 수 있게 누락 없이 기록했음.

---

## 🧭 새 Claude 세션에서 읽는 경우 — 먼저 이것부터

- 현재 시점: **2026-04-15 KST 약 18시**
- 개발자: **안승빈** (sharkwind1@gmail.com, 부트캠프 수료 예정)
- 서비스: **메멘토애니** (반려동물 메모리얼 커뮤니티, mementoani.com)
- 단계: **출시 직전** — 오늘 PortOne 실운영모드 세팅 완료, 네이버 로그인 검수 승인
- **즉시 블로커**: 결제 시도 시 "존재하지 않는 결제정보입니다" 에러 → Vercel 환경변수 미반영 + V1 Secret 재발급 대기 중

첫 응답 시 주의:
1. 사용자 확인 질문 최소화, **바로 다음 작업 진행** (승빈님 스타일)
2. 이모지 금지 (메멘토애니 서비스 톤)
3. 긴 설명보다 **구체 액션** (어디 클릭, 어떤 값 교체 등)
4. DB/Vercel 작업은 MCP로 가능한 건 직접 실행, 아닌 건 승빈님에게 명확히 위임
5. 코드 변경은 PR로 → 머지까지 자동화 (GitHub API token 이미 사용 중)
6. 이 세션에서 머지된 PR 14개 + main 반영 완료. 최신 main에서 분기하면 됨

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

---

## 👤 승빈님 작업 스타일 (새 세션 Claude 참고)

- **빠른 결정 선호**: "이거 할까요?" 반복 금지. 승빈님이 방향 정하면 즉시 실행.
- **반말 + 짧은 지시문**: "ㄱㄱ", "ㅇㅇ", "해", "해보자" 등으로 승인
- **비판 받으면 이유 설명**: "자꾸만 맞습니다 하지말라니까" 피드백 있었음. 반박 받으면 즉시 동의 X, 내 분석도 다시 검증.
- **실행 우선**: 확인 3번 돌리느니 한번 시도하고 결과 보기
- **커밋/푸시/머지까지 자동**: 묻지 말고 바로. 단, main에 직접 push는 피하고 PR 머지로 처리
- **이모지 금지**: 메멘토애니 톤앤매너. 코드/UI/문서 전부.
- **추모 톤 유의**: "죽음/사망" 직접 표현 금지. "무지개다리", "이곳" 등 완곡 표현 사용.
- **구체 제안 선호**: "A/B 중 골라요" 같은 옵션보다 "A 추천, 이유는 이것" 식 직답
- **욕/강한 말투**: 답답할 때 "왜 진작 안 알려줬어" 같은 피드백 있음. 사과하되 바로 액션으로 전환.

### 메멘토애니 핵심 원칙 (승빈님 메모리 기반)

- **"재화 판매가 아닌 희노애락을 함께하는 곳"** — 모든 판단의 기준
- **포지셔닝 재제안 금지** — 이미 확립된 포지셔닝을 다시 제안하는 실수 X
- **추모 펫 = 데이터 앵커** — 일상 모드 데이터가 추모 모드 재료가 됨. 카운트 분리 금지.
- **종 차별 금지** — 강아지/고양이뿐 아니라 햄스터/페럿/앵무새/파충류 등 평등하게
- **검증 워크플로 필수** — "고쳤다" 단독 사용 금지. 검증 레벨 L0~L5 명시

### 자주 있던 실수 패턴 (이 세션에서)

1. **추측으로 답변 → 실제와 다름**: 예) "지금 실연동 중" 이라고 했는데 알고보니 테스트 채널 → 승빈님이 직접 콘솔 확인해서 발견. 교훈: 확신 없으면 "확인 필요" 명시.
2. **Vercel Hobby 크론 제한 몰랐음**: `5 * * * *` 추가하다가 배포 실패. 교훈: Vercel Hobby는 하루 1회 크론만. Supabase pg_cron으로 우회.
3. **수동 테스터 추가 제안 (네이버)**: 운영 중 유저 한 명씩 추가는 말이 안 됨. 승빈님 화남. 교훈: 제안 전 현실성 검증.
4. **embedded git repo 커밋**: `.claude/worktrees/*`가 의도치 않게 커밋됨. 교훈: 작업 브랜치 푸시 전 `git status` 한번 보기.
5. **사용자가 온보딩리셋 요청인데 내가 코드 추가하려 함**: "이거 이미 온보딩 리셋에 있는 거 아니야?" 피드백. 교훈: 기능 추가 전 기존 기능 점검 먼저.
6. **결제 연동 V1/V2 키 혼동**: V2 콘솔에서 V1 섹션 있는 걸 못 봐서 마이그레이션 준비까지 함. 교훈: "식별코드 · API Keys" 페이지 V1 탭/V2 탭 둘 다 확인.

---

## 🗂 이 세션에서 있었던 주요 의사결정

### 1. 추모 모드 전환은 비가역화 (PR #10, 이전에도 있었던 결정)
- 관리자 + 도진 계정(`TRUSTED_EMAILS`)만 되돌리기 가능
- 일반 유저는 UI에서 복구 버튼 완전 숨김
- MemorialSwitchModal에 "이 전환은 되돌릴 수 없습니다" 빨간 경고

### 2. 온보딩 미션은 "미션" 어조 (일상) / "함께 걸어요" 어조 (추모)
- 승빈님 피드백: "일상 유저한테는 미션이라 해도 되지 오히려 좋지"
- 게임화 컨셉 수용. 다만 추모 모드는 절제된 톤 유지.

### 3. 연속 출석 보너스 채택
- 3일(+5P), 7일(+15P), 14일(+30P), 30일(+100P)
- 게시글 일일캡 5 → 20, 댓글 캡 무제한 (승빈님: "활성화 문제가 될 수 있음")

### 4. 유저 닉네임 클릭 → 프로필 카드 → 미니홈피 (2단계)
- 원래는 바로 미니홈피로 갔는데, 닉네임 + 가입일 먼저 보여주는 카드 추가

### 5. 텔레그램 릴스 대본 제거
- "아무런 도움이 안된다" 피드백 → 블로그 초안만 남김

### 6. AI 영상 프롬프트 전면 재작성 + 판타지 카테고리 추가
- 이전: "magical/ethereal/dreamlike" 단어가 카툰 스타일 유도 → 실사 안 나옴
- 변경: "Real documentary footage, shot on Sony A7IV" 등 실사 강제
- 판타지도 "Live-action fantasy film, ARRI Alexa, Lord of the Rings cinematography" 영화 VFX 톤
- 13 → 27개 템플릿 확장

### 7. 다중 계정 탐지 화이트리스트 도입 (TRUSTED_EMAILS)
- `ADMIN_EMAILS` + sharkwind1@naver.com + kinosis.h@gmail.com + dojin3497@gmail.com
- multi-account-alert 완전 스킵 + 같은 디바이스 카운트에서도 제외
- 기존 `MEMORIAL_RECOVER_EMAILS`는 하위호환 alias

### 8. 간편모드에도 QuestCard 표시 (PR #5)
- `is_simple_mode=true` 유저는 SimpleHomeLauncher만 렌더 → QuestCard 안 보이던 문제
- 승빈님 계정이 simple 모드라 발견됨

---

## 🔑 새 세션에서 GitHub/Vercel/Supabase 자동화 지속하려면

이 세션에서 쓴 패턴:
- GitHub API 토큰: `git credential fill` 로 추출해서 `curl` PR 생성/머지
- Vercel MCP: `mcp__5842952a-*` 접두사 도구로 배포 상태/런타임 로그 확인
- Supabase MCP: `mcp__cad65663-*` 접두사 도구로 SQL 실행/마이그레이션
- 브랜치 전략: main에서 새 브랜치 → 커밋 → 푸시 → PR 생성 → squash merge

새 세션에서도 동일하게 동작할 것. GitHub 토큰은 `notifications@github.com`으로 오는 메일에서 확인 가능하지만 보통 로컬 git credential에 저장되어 있음.

---

## 🎯 새 세션 시작 후 첫 번째 액션 (이어갈 때)

1. `git pull origin main` (이 문서 포함 최신 코드)
2. `HANDOFF.md` 읽기 (이 파일)
3. 승빈님에게 **"환경변수 교체 + Secret 재발급 + Redeploy (Build Cache 끄기) 완료됐는지"** 확인
4. 완료됐다면 → 결제 재시도 요청 → DB `payments.metadata.debug_*` 확인
5. 안 됐다면 → 해당 단계 가이드 다시 제공
6. 결제 성공 시 → 구독 해지 플로우 테스트로 진행
