-- profiles 테이블 INSERT 정책 추가
-- 적용일: 2026-05-14 (supabase MCP apply_migration로 prod 적용 완료)
--
-- 증상: 신규 가입 후 sign-in 흐름이 모두 깨짐. SimpleMode/onboarding/welcome
--   등 profiles UPDATE/SELECT 의존 기능 줄줄이 실패.
--
-- 원인: profiles 테이블에 INSERT 정책 자체가 없어서 RLS enabled 상태에서
--   클라이언트의 supabase.from("profiles").upsert(...) 호출이 거부됨.
--   handle_new_user 트리거(SECURITY DEFINER)가 auth.users INSERT 시
--   profile row 자동 생성하므로 이전엔 묻혀 있었지만, AuthContext의
--   upsert 호출 경로가 활성화되며 표면화.
--
-- 해결: WITH CHECK (auth.uid() = id) 정책 추가 → 본인 id로만 INSERT 허용.

DROP POLICY IF EXISTS "본인 프로필 생성" ON public.profiles;

CREATE POLICY "본인 프로필 생성"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);
