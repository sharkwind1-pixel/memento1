# Supabase Mumbai → Seoul 이전 가이드

> 현재 프로젝트(`kuqhjgrlrzskvuutqbce`)는 `ap-south-1` (Mumbai) 리전.
> 한국 트래픽 기준 RTT 약 280–340ms 추가 → 앱 체감 지연의 70–80%가 여기서 발생.
> Seoul 이전 시 RTT 60–80ms로 단축 → 거의 모든 요청에서 1초 이상 절약.

---

## 0. 사전 준비

- [ ] Pro 플랜 (이전 도구가 Free에서는 제한됨). 무료라면 Pro 1개월(약 $25)만 결제.
- [ ] 모든 작업은 **새벽 03:00 ~ 06:00 KST** 사이에 진행 (트래픽 최저).
- [ ] Vercel 프로젝트는 그대로 유지. ENV만 갈아끼움.

---

## 1. 옵션 A — Supabase 공식 "Migrate to a new project" 도구 (권장)

> 2025년 10월 도입. 자동으로 schema + data + auth + storage + edge functions까지 복제. 리전 변경 가능.

### 절차
1. **Backup 강제 생성**
   - Supabase 대시보드 → Database → Backups → "Create backup"
   - 백업 완료 확인 후 다음 단계로.

2. **Migration 시작**
   - Project Settings → General → "Migrate to a new project"
   - Target Region: **ap-northeast-2 (Seoul)**
   - 새 프로젝트 이름: `memento1-seoul`
   - 시작 → 완료까지 30~120분 (DB 크기에 따라).

3. **검증**
   - 새 프로젝트 URL/Anon Key 확인.
   - SQL Editor에서 `SELECT count(*) FROM auth.users;` 등으로 row 수 동일성 확인.
   - Storage bucket 파일 수 동일성 확인.

4. **DNS 핫스왑**
   - Vercel ENV 4개 갱신:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `SUPABASE_JWT_SECRET` (있다면)
   - Mobile (Expo): `mobile/lib/supabase.ts`의 ENV 동기화 필요. EAS 환경변수도 동일하게.
   - Vercel Redeploy.

5. **모니터링 (24시간)**
   - 텔레그램 시스템 채널의 healthcheck 알림 확인.
   - 에러율 / latency 모니터링.

6. **구 프로젝트 정리 (1주일 후)**
   - 신규 프로젝트가 안정되면 구 프로젝트 Pause → Delete.

---

## 2. 옵션 B — 수동 (Migration 도구 없을 때)

> Migration 도구 미사용 또는 더 큰 통제가 필요할 때.

### A) Schema 복제
```bash
# 스키마 dump
pg_dump --schema-only --no-owner --no-privileges \
  -h db.kuqhjgrlrzskvuutqbce.supabase.co -U postgres -d postgres > schema.sql

# 새 프로젝트(Seoul)에 적용
psql -h db.NEW.supabase.co -U postgres -d postgres < schema.sql
```

### B) 데이터 복제
```bash
# 데이터 dump (table별로 분할)
pg_dump --data-only --no-owner --no-privileges \
  -t public.profiles -t public.pets -t public.pet_media -t public.community_posts \
  -t public.timeline_entries -t public.pet_reminders -t public.chat_messages \
  -t public.pet_memories -t public.payments -t public.beta_codes \
  -h db.kuqhjgrlrzskvuutqbce.supabase.co -U postgres -d postgres > data.sql

psql -h db.NEW.supabase.co -U postgres -d postgres < data.sql
```

### C) Auth 사용자 복제
- Supabase Dashboard → Authentication → Users → "Export"
- CSV로 다운로드 후 새 프로젝트에서 Import.
- **주의**: 비밀번호 해시는 그대로 유지됨. 소셜 로그인(Google/Naver/Kakao) 사용자는 provider_id가 보존.

### D) Storage 복제
```bash
# 가장 까다로움. supabase CLI:
supabase storage cp --recursive \
  --source-project-ref kuqhjgrlrzskvuutqbce \
  --target-project-ref NEW \
  pet-media
```

### E) Edge Functions / Webhooks
- 각각 새 프로젝트에 다시 배포.
- Webhook secret 재생성 후 Vercel ENV 업데이트.

---

## 3. 마이그레이션 후 체크리스트

- [ ] `auth.users` 카운트 일치
- [ ] `profiles` 카운트 일치
- [ ] `pets` 카운트 일치
- [ ] `pet_media` 카운트 일치
- [ ] `payments` `succeeded` 카운트 일치 (절대 데이터 손실 X)
- [ ] `beta_codes` 카운트 일치
- [ ] Storage `pet-media` 파일 수 일치
- [ ] RLS 정책 모두 활성 (`select * from pg_policies` 비교)
- [ ] Realtime publication에 등록된 테이블 동일 (`select * from pg_publication_tables`)
- [ ] 기존 SECURITY DEFINER 함수 모두 `SET search_path = public` 유지
- [ ] cron job 호출 정상 (텔레그램 healthcheck 채널 확인)
- [ ] 모바일 앱에서 로그인/사진 업로드/AI 펫톡 1회씩 수동 테스트

---

## 4. 롤백 시나리오

- 신규 프로젝트에서 critical error 발견 시:
  1. Vercel ENV를 구 프로젝트로 다시 갱신.
  2. Redeploy.
  3. 텔레그램 시스템 채널에 "rollback" 메시지.
  4. 구 프로젝트가 24시간 동안 데이터를 받는 동안, 신규 프로젝트의 문제 진단.
  5. 두 프로젝트 데이터 동기화는 수동 SQL diff (현재 가용한 도구는 없음 — Supabase pgvector replication 출시 전).

---

## 5. 비용

- Pro 플랜: $25/month (이전 1개월만 결제 후 다시 Free로 전환 가능).
- Migration 도구는 무료.
- 다운타임: 최대 5분 (DNS 캐시 갱신 + Vercel redeploy 시간).

---

## 6. 사용자 영향

- 다운타임 5분 정도 발생 (새벽 03시 권장 → 영향 최소화).
- 모바일 앱은 기존 토큰을 그대로 사용 (auth.users 마이그레이션 시 유지).
- 단, 활성 Realtime 연결은 끊김 → 자동 재연결됨.

---

## 7. 결론

**옵션 A (공식 Migrate 도구) 강력 추천**. 옵션 B는 도구가 안 될 때만.
경험상 Seoul 이전만으로 Vercel-Supabase RTT가 5–10x 단축되어 모든 화면이 체감상 즉각 반응함.
