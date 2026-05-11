-- ============================================================================
-- 위험한 SECURITY DEFINER 함수 EXECUTE 권한 회수 (2026-05-11)
-- ============================================================================
-- Supabase Security Advisor가 27개 함수 × 2(anon+authenticated) = 56건 WARN.
-- 그 중 명확히 service_role API에서만 호출되는 9개 함수의 EXECUTE 권한을
-- anon/authenticated에서 회수. service_role은 자동 유지됨.
--
-- 제외 (클라이언트 직접 호출):
--  - start_beta_promotion / stop_beta_promotion (관리자 페이지 RPC)
--  - save_deleted_account (DeleteAccountSection)
--  - can_rejoin (AuthContext)
--  - redeem_beta_code (API에서 호출하지만 함수 내부 검증)
--  - daily_login_check (인증 사용자 호출)
--  - 트리거 함수 (handle_new_user, apply_beta_on_signup,
--    protect_sensitive_profile_columns)
--
-- 실수로 어디서 호출하면 즉시 403 에러 발생 → 발견하면 권한 재허용 또는
-- 호출부 service_role로 변경.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.grant_premium(p_user_id uuid, p_plan text, p_duration_days integer, p_granted_by uuid, p_reason text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_premium(p_user_id uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.toggle_admin(p_target_user_id uuid, p_is_admin boolean) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_points_atomic(p_user_id uuid, p_amount integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_user_points(p_user_id uuid, p_action_type text, p_points integer, p_daily_cap integer, p_is_one_time boolean, p_metadata jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_user_points(p_user_id uuid, p_action_type character varying, p_points integer, p_daily_cap integer, p_one_time boolean, p_metadata jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purchase_minimi_item(p_user_id uuid, p_minimi_id text, p_item_name text, p_item_price integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purchase_shop_item(p_user_id uuid, p_item_id text, p_item_name text, p_item_price integer, p_effect text, p_bonus_days integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sell_minimi_item(p_user_id uuid, p_minimi_id text, p_sell_price integer) FROM anon, authenticated;

-- ============================================================================
-- blog_topic_history / ip_blocks 정책 추가 (RLS enabled but no policy)
-- ============================================================================
-- 두 테이블은 서버(service_role)에서만 사용. service_role은 RLS bypass.
-- 일반 anon/authenticated 사용자는 deny-all 정책으로 차단.

CREATE POLICY "Service role only" ON public.blog_topic_history
    FOR ALL TO public USING (false) WITH CHECK (false);

CREATE POLICY "Service role only" ON public.ip_blocks
    FOR ALL TO public USING (false) WITH CHECK (false);
