-- =====================================================
-- RLS auth_rls_initplan 116건 자동 치환 (2026-04-27)
-- =====================================================
-- 목적: `auth.uid()`를 RLS 정책에서 `(select auth.uid())`로 감싸 매 row마다 평가되는 함수를
--       initplan으로 한 번만 평가되게 만든다. RLS CPU 30~50% 절감 (advisor 권장).
--
-- 동작:
-- 1. pg_policies에서 public schema의 정책 중 auth.uid() 사용 + 아직 (select auth.uid())로
--    감싸지지 않은 정책을 찾는다.
-- 2. 정책별로 DROP → CREATE를 한 트랜잭션 안에서 수행.
-- 3. cmd/permissive/roles/qual/with_check를 모두 보존.
--
-- 안전:
-- - 트랜잭션 단위 (Postgres migration은 자동 트랜잭션)
-- - 패턴 치환만 — 의미 변경 없음
-- - 정책 이름/대상/cmd/roles 그대로 보존
-- - 실패 시 자동 롤백
--
-- 검증:
-- 적용 후 advisor에서 auth_rls_initplan 0건 확인.
-- =====================================================

DO $$
DECLARE
    pol RECORD;
    new_qual TEXT;
    new_check TEXT;
    sql_text TEXT;
    role_list TEXT;
    fixed_count INTEGER := 0;
BEGIN
    FOR pol IN
        SELECT
            schemaname,
            tablename,
            policyname,
            permissive,
            cmd,
            roles,
            qual,
            with_check
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (
              (qual IS NOT NULL AND qual ~ 'auth\.uid\(\)' AND qual !~ '\(\s*select\s+auth\.uid\(\)\s*\)')
              OR
              (with_check IS NOT NULL AND with_check ~ 'auth\.uid\(\)' AND with_check !~ '\(\s*select\s+auth\.uid\(\)\s*\)')
          )
    LOOP
        -- 패턴 치환: auth.uid() → (select auth.uid())
        -- 단, 이미 (select auth.uid())로 감싸진 부분은 건드리지 않음 (regexp_replace flag 'g' + lookahead/behind 사용 곤란하므로
        -- 단순 REPLACE 후 중복 select 방지를 위해 이중 검사)
        IF pol.qual IS NOT NULL THEN
            new_qual := regexp_replace(pol.qual, '(?<!\(\s*select\s)auth\.uid\(\)', '(select auth.uid())', 'g');
        ELSE
            new_qual := NULL;
        END IF;

        IF pol.with_check IS NOT NULL THEN
            new_check := regexp_replace(pol.with_check, '(?<!\(\s*select\s)auth\.uid\(\)', '(select auth.uid())', 'g');
        ELSE
            new_check := NULL;
        END IF;

        -- roles 배열을 SQL 형식으로
        IF pol.roles IS NULL OR array_length(pol.roles, 1) IS NULL THEN
            role_list := 'public';
        ELSE
            SELECT string_agg(quote_ident(r), ', ') INTO role_list FROM unnest(pol.roles) r;
        END IF;

        -- DROP
        sql_text := format('DROP POLICY IF EXISTS %I ON %I.%I',
                           pol.policyname, pol.schemaname, pol.tablename);
        EXECUTE sql_text;

        -- CREATE 재생성
        sql_text := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
                           pol.policyname,
                           pol.schemaname,
                           pol.tablename,
                           CASE WHEN pol.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                           pol.cmd,
                           role_list);

        IF new_qual IS NOT NULL THEN
            sql_text := sql_text || format(' USING (%s)', new_qual);
        END IF;

        IF new_check IS NOT NULL THEN
            sql_text := sql_text || format(' WITH CHECK (%s)', new_check);
        END IF;

        EXECUTE sql_text;
        fixed_count := fixed_count + 1;
    END LOOP;

    RAISE NOTICE '[rls_initplan_auto_optimize] fixed % policies', fixed_count;
END $$;

-- 검증 쿼리 (수동 실행용):
-- SELECT count(*) AS remaining FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (
--       (qual IS NOT NULL AND qual ~ 'auth\.uid\(\)' AND qual !~ '\(\s*select\s+auth\.uid\(\)\s*\)')
--       OR
--       (with_check IS NOT NULL AND with_check ~ 'auth\.uid\(\)' AND with_check !~ '\(\s*select\s+auth\.uid\(\)\s*\)')
--   );
-- 결과 0이면 완료.
