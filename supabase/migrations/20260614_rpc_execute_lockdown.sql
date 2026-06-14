-- 20260614_rpc_execute_lockdown.sql
-- 보안 점검(get_advisors + ACL 전수): SECURITY DEFINER 함수 19개가 anon/PUBLIC에서 호출 가능.
-- 전수 triage 결과 — 실악용 가능 건은 없었음(전부 트리거 함수거나 auth.uid()/is_admin 내부 게이트).
-- 다만 호출처 없는 죽은 함수 + admin/로그인 전용 함수가 anon에 열린 위생 문제 + advisor WARN 정리.
-- 원칙: service_role은 절대 회수 안 함(서버 경로 보존). 호출처는 web+mobile grep + RLS/함수 참조까지 확인 후 결정.

-- (1) 게이트 없는 죽은 함수 (web+mobile 호출 0). save_deleted_account는 게이트 없는 anon INSERT였음.
REVOKE EXECUTE ON FUNCTION public.save_deleted_account(uuid, text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_report_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_points_with_rank(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_premium_status(uuid) FROM PUBLIC, anon, authenticated; -- RLS/함수 참조 0 확인 후 락다운

-- (2) 트리거 전용 함수 (트리거가 소유자 권한으로 실행 → RPC EXECUTE 불필요).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_sensitive_profile_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_hide_on_reports() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_local_posts_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_lost_pets_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_beta_on_signup() FROM PUBLIC, anon, authenticated;

-- (3) 내부 게이트 있는 함수: anon+PUBLIC만 회수, authenticated 유지(로그인 유저/관리자 정상 호출).
REVOKE EXECUTE ON FUNCTION public.redeem_beta_code(text) FROM PUBLIC, anon;                                    -- auth.uid() 게이트
REVOKE EXECUTE ON FUNCTION public.create_beta_code(text, integer, integer, integer, integer, timestamptz, text) FROM PUBLIC, anon; -- is_admin 게이트
REVOKE EXECUTE ON FUNCTION public.start_beta_promotion(integer) FROM PUBLIC, anon;                             -- is_admin 게이트
REVOKE EXECUTE ON FUNCTION public.stop_beta_promotion() FROM PUBLIC, anon;                                     -- is_admin 게이트

-- 의도적으로 anon 유지(회수 금지):
--  is_nickname_taken / can_rejoin / check_deleted_account : 가입(인증 전) 단계에서 호출 필요.
--  current_user_is_admin / is_minihompy_private          : RLS 정책 USING절에서 사용(회수 시 RLS 깨짐).
