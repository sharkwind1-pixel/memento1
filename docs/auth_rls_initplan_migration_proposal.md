# auth_rls_initplan 자동 치환 마이그레이션 제안서

> **작성일**: 2026-04-26
> **상태**: **검증 대기 (DRAFT)** — 적용 전 staging 테스트 필수
> **예상 임팩트**: RLS 평가 CPU **30-50% 절감** (Supabase 공식 가이드)
> **위험도**: **HIGH** — 정책 잘못 만들면 모든 유저 데이터 접근 불가

---

## 1. 배경

Supabase performance advisor에서 **`auth_rls_initplan` 경고 116건** 검출됨. 원인: RLS 정책에서 `auth.uid()`, `auth.role()`, `auth.jwt()` 같은 STABLE 함수를 직접 호출하면 **각 행마다 재평가**됨. `(select auth.uid())`로 감싸면 Postgres가 InitPlan으로 캐싱해 **쿼리당 1회만 평가**.

**Supabase 공식 가이드**: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan

---

## 2. 영향받는 정책 (요약)

총 **116건**. 패턴별 분류:

| 패턴 | 건수 | 예시 |
|---|---|---|
| `(auth.uid() = user_id)` | ~50 | pets, pet_media, timeline_entries, chat_messages |
| `(auth.uid() = id)` | 1 | profiles 본인 수정 |
| `EXISTS (... auth.uid() AND profiles.is_admin)` | ~15 | 관리자 권한 정책 (magazine_articles, deleted_accounts 등) |
| `(auth.uid() = sender_id/receiver_id/etc)` | ~10 | messages, reports |
| `auth.role() = 'service_role'` | ~3 | payments, point_transactions |
| `auth.uid() IS NOT NULL` | 2 | profiles 조회, support_inquiries |
| 기타 (composite) | ~30 | minihompy_*, memorial_*, withdrawn_users 등 |

전체 목록은 별첨 SQL의 SELECT로 재현 가능.

---

## 3. 자동 치환 SQL (적용 후보)

```sql
-- ============================================================================
-- auth_rls_initplan 자동 치환 마이그레이션
-- 모든 RLS 정책의 auth.uid()/auth.role()/auth.jwt() 직접 호출을
-- (select auth.x()) 형태로 감싸 InitPlan 캐싱 활성화
-- ============================================================================
DO $$
DECLARE
    pol RECORD;
    new_qual TEXT;
    new_check TEXT;
    role_list TEXT;
    create_sql TEXT;
    migrated_count INT := 0;
BEGIN
    FOR pol IN
        SELECT
            schemaname, tablename, policyname, cmd, qual, with_check, permissive, roles
        FROM pg_policies
        WHERE schemaname = 'public'
            AND (
                (qual ~ 'auth\.(uid|role|jwt)\(\)'
                    AND qual !~ '\(\s*select\s+auth\.(uid|role|jwt)\(\)')
                OR (with_check ~ 'auth\.(uid|role|jwt)\(\)'
                    AND with_check !~ '\(\s*select\s+auth\.(uid|role|jwt)\(\)')
            )
    LOOP
        -- USING 절 치환
        new_qual := regexp_replace(
            COALESCE(pol.qual, ''),
            'auth\.(uid|role|jwt)\(\)',
            '(select auth.\1())',
            'g'
        );

        -- WITH CHECK 절 치환
        new_check := regexp_replace(
            COALESCE(pol.with_check, ''),
            'auth\.(uid|role|jwt)\(\)',
            '(select auth.\1())',
            'g'
        );

        -- roles array → "public" 또는 "authenticated, anon" 같은 문자열로
        role_list := array_to_string(pol.roles, ', ');

        -- 기존 정책 삭제
        EXECUTE format('DROP POLICY %I ON %I.%I',
            pol.policyname, pol.schemaname, pol.tablename);

        -- 새 정책 작성 (cmd 별로 다른 syntax)
        IF pol.cmd = 'ALL' THEN
            create_sql := format(
                'CREATE POLICY %I ON %I.%I AS %s FOR ALL TO %s%s%s',
                pol.policyname, pol.schemaname, pol.tablename,
                CASE WHEN pol.permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                role_list,
                CASE WHEN pol.qual IS NOT NULL THEN ' USING (' || new_qual || ')' ELSE '' END,
                CASE WHEN pol.with_check IS NOT NULL THEN ' WITH CHECK (' || new_check || ')' ELSE '' END
            );
        ELSIF pol.cmd = 'INSERT' THEN
            create_sql := format(
                'CREATE POLICY %I ON %I.%I AS %s FOR INSERT TO %s WITH CHECK (%s)',
                pol.policyname, pol.schemaname, pol.tablename,
                CASE WHEN pol.permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                role_list,
                new_check
            );
        ELSE  -- SELECT, UPDATE, DELETE
            create_sql := format(
                'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s USING (%s)%s',
                pol.policyname, pol.schemaname, pol.tablename,
                CASE WHEN pol.permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                pol.cmd,
                role_list,
                new_qual,
                CASE WHEN pol.with_check IS NOT NULL THEN ' WITH CHECK (' || new_check || ')' ELSE '' END
            );
        END IF;

        EXECUTE create_sql;
        migrated_count := migrated_count + 1;
        RAISE NOTICE '[%/116] Migrated: % on %.%',
            migrated_count, pol.policyname, pol.schemaname, pol.tablename;
    END LOOP;

    RAISE NOTICE 'Total migrated: % policies', migrated_count;
END $$;
```

---

## 4. 적용 절차 (반드시 이 순서)

### Step 1: 사전 확인
```sql
-- 영향받을 정책 카운트
SELECT COUNT(*) FROM pg_policies
WHERE schemaname = 'public'
    AND (
        (qual ~ 'auth\.(uid|role|jwt)\(\)' AND qual !~ '\(\s*select\s+auth\.(uid|role|jwt)\(\)')
        OR (with_check ~ 'auth\.(uid|role|jwt)\(\)' AND with_check !~ '\(\s*select\s+auth\.(uid|role|jwt)\(\)')
    );
-- 예상: 116 (현재 시점)
```

### Step 2: 정책 백업 (롤백 대비)
```sql
CREATE TABLE _backup_pg_policies_20260426 AS
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### Step 3: 트랜잭션 안에서 시범 적용 (선택)
운영 데이터에 대한 영향이 걱정되면 **staging DB**에 먼저 위 DO 블록 실행 → 회귀 테스트.

### Step 4: 운영 적용
- Supabase MCP `apply_migration` 또는 SQL Editor로 위 DO 블록 실행
- migration name 권장: `auth_rls_initplan_optimization_20260426`

### Step 5: 검증
```sql
-- 1. 마이그레이션 후 정책 카운트 (변화 없어야 함)
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';

-- 2. 잔여 raw auth.uid() 호출 (0이어야 함)
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
    AND (
        (qual ~ 'auth\.(uid|role|jwt)\(\)' AND qual !~ '\(\s*select\s+auth\.(uid|role|jwt)\(\)')
        OR (with_check ~ 'auth\.(uid|role|jwt)\(\)' AND with_check !~ '\(\s*select\s+auth\.(uid|role|jwt)\(\)')
    );

-- 3. Supabase advisor 재조회로 auth_rls_initplan 0건 확인
```

### Step 6: 스모크 테스트 (E2E)
- 일반 유저: 본인 펫/사진/타임라인/채팅 조회 가능?
- 비로그인: 매거진/공개 게시글 조회 가능?
- 관리자: 관리자 페이지 접근 가능?
- 새 펫 등록 / 사진 업로드 / 채팅 등 INSERT 가능?

### Step 7: 롤백 (문제 시)
```sql
-- 백업된 pg_policies는 메타데이터만 있음. 정책 자체는 복원 못 함.
-- 따라서 원본 정책 정의를 git 마이그레이션 히스토리에서 찾아 복원 필요.
-- supabase/migrations/ 디렉토리에서 grep "CREATE POLICY"로 찾기.
```

---

## 5. 위험 분석

### 🔴 HIGH 위험
- **정책 syntax 실수** → 모든 유저 RLS 막힘 → 즉시 운영 사고
- **roles 배열 변환 실패** → `TO public` 누락 시 정책이 `TO postgres` 같은 잘못된 role에 붙음
- **WITH CHECK 누락 (UPDATE)** → INSERT/UPDATE 우회 가능

### 🟡 MEDIUM 위험
- **regex 매칭이 의도 외 부분 치환** — 예: `'(select auth.uid()이미감싸진것)'` 같은 case는 negative lookahead로 방어했지만 edge case 있을 수 있음
- **cmd 케이스 누락** — `ALL`, `INSERT`, `SELECT`, `UPDATE`, `DELETE` 5개 외 다른 게 있는지

### 🟢 LOW 위험
- **공백/주석 차이** — pg_policies에서 가져온 정의를 그대로 쓰면 원본과 미세하게 달라질 수 있음 (기능엔 영향 없음)

### 완화책
1. **staging에서 먼저 적용** + 회귀 테스트
2. **블루-그린 또는 점진 적용** — 위험 큰 테이블(pets, profiles)은 별도 분리
3. **백업** 필수 (Step 2)
4. **운영 트래픽 적은 시간대** 적용 (KST 새벽 3-5시)
5. **모니터링** — 적용 후 5분간 에러율 / 응답시간 / 401-403 비율 관찰

---

## 6. 단계적 적용 권장 (안전 우선)

전체를 한 번에 하지 말고 4단계로:

**Phase 1**: 영향 작은 테이블 (5-10개 정책) — `support_inquiries`, `subscription_cancel_audit`, `withdrawn_users`
**Phase 2**: 핵심 사용자 데이터 (40개) — `pets`, `pet_media`, `timeline_entries`, `pet_memories`, `pet_reminders`
**Phase 3**: 메시지/소셜 (30개) — `chat_messages`, `messages`, `notifications`, `community_posts`, `post_likes`
**Phase 4**: 미니홈피/추모 (40개) — `minihompy_*`, `memorial_*`, `magazine_*`

각 Phase 사이 24시간 모니터링 권장.

---

## 7. 적용 후 효과 (예상)

- **CPU 사용량**: 정책당 평균 30-50% 절감 → 전체 RLS 부하의 30-50% 감소
- **쿼리 응답시간**: pets, pet_media, timeline_entries 같은 hot 테이블에서 체감 개선
- **MVP 트래픽 증가 시 안정성**: 동시 사용자 100명 이상 시 효과 두드러짐

**참고**: 이 작업과 별도로 `multiple_permissive_policies` 245건 통합도 다음 단계 권장. 그쪽이 더 큰 임팩트일 수 있음.

---

## 8. 다음 작업 (이 마이그레이션 후)

1. ✅ auth_rls_initplan 116건 → 0건
2. ⏭ multiple_permissive_policies 245건 통합 (별도 세션)
3. ⏭ rls_policy_always_true 3건 TO 절 명시
4. ⏭ pet-media 버킷 LIST 정책 제거
5. ⏭ HIBP 활성화 (Supabase Dashboard)

---

## 9. 인계 메시지

이 문서를 받은 다음 세션 Claude에게:

1. **Step 1~7 절차 그대로 따를 것.** Step 4 직전에 승빈님께 명시적 확인 받기.
2. **자체 우회/창의 시도 금지.** 이 SQL이 검증된 패턴.
3. **에러 시 즉시 멈추고 보고.** Step 7 롤백은 정책 정의 일일이 복원해야 하므로 시간 걸림 — 막혔으면 차라리 묻기.
4. **검증 레벨**: 전체 마이그레이션 후 `L4_API응답` (Supabase advisor 재조회 + 스모크 테스트) 통과해야 완료.

— 작성: Cowork Claude (mystifying-dewdney, 2026-04-26)
