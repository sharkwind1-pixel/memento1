-- 민감 SECURITY DEFINER RPC 잠금 (2026-06-10 전수검수 — 검수자 A/E 공동 발견 CRITICAL).
-- (MCP apply_migration "lock_sensitive_rpcs"로 prod 적용됨 — 리포 기록용)
-- 문제: 20260511 마이그가 REVOKE FROM anon, authenticated만 수행 → PostgreSQL 기본 PUBLIC EXECUTE
--       grant가 잔존해 no-op. anon key + (또는 로그인 JWT)로 /rest/v1/rpc/* 직접 호출 시
--       무료 프리미엄 자가부여(grant_premium), 무제한 포인트 적립(increment_user_points 신규 오버로드),
--       가격 조작 구매/판매(purchase_*, sell_*) 등이 라우트 검증을 통째로 우회 가능했음.
-- 모든 호출부는 서버 API(service_role) 경유로 통일 — 클라이언트 직접 호출 0건 확인(웹+모바일 grep).
-- 적용 후 실측: 13개 함수 전부 anon/authenticated EXECUTE=false, service_role=true.

-- 1) 레거시 오버로드 제거 (varchar p_one_time, RETURNS jsonb — auth.uid() 가드 때문에
--    service_role/타인적립이 전부 'unauthorized' silent 실패해 포인트 적립이 수개월 죽어 있던 원인.
--    코드(points.ts 등)는 p_is_one_time 신규 오버로드로 전환 완료)
DROP FUNCTION IF EXISTS public.increment_user_points(uuid, character varying, integer, integer, boolean, jsonb);

-- 2) PUBLIC/anon/authenticated EXECUTE 회수 + service_role만 허용
DO $$
DECLARE
    fn record;
BEGIN
    FOR fn IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN (
            'increment_user_points',
            'grant_premium', 'revoke_premium', 'toggle_admin', 'expire_premium_subscriptions',
            'deduct_points_atomic', 'purchase_shop_item', 'purchase_minimi_item',
            'purchase_furniture_item', 'sell_minimi_item', 'sell_furniture_item',
            'daily_login_check', 'award_open100'
          )
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn.sig);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn.sig);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    END LOOP;
END $$;
