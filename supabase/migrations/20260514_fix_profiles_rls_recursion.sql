-- profiles RLS 정책 무한 재귀 fix (PostgreSQL error 42P17)
-- 적용일: 2026-05-14 (supabase MCP apply_migration로 prod 적용 완료)
--
-- 증상: 사이트 전체에서 profiles 관련 모든 쿼리가 500 에러 + 콘솔에
--   "infinite recursion detected in policy for relation 'profiles'"
--   → 로그인 직후 펫 등록/온보딩/SimpleMode DB sync/welcome 메일 모두 실패
--
-- 원인: "Admins can update any profile" 정책의 USING 절이
--   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
--   으로 자기 자신(profiles)을 참조 → RLS 평가가 다시 같은 RLS 트리거 → 재귀
--
-- 해결: SECURITY DEFINER 함수로 분리. 함수 내부는 RLS bypass(definer가 owner라).
--   정책에서는 함수만 호출 → 재귀 차단.

-- 1) 관리자 여부 체크 함수
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT COALESCE(is_admin, false)
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated, anon;

-- 2) 무한 재귀 정책 교체
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.current_user_is_admin());

COMMENT ON FUNCTION public.current_user_is_admin() IS
    'profiles 테이블 RLS 정책에서 is_admin 체크 시 자기 참조 무한 재귀를 막기 위한 SECURITY DEFINER 헬퍼.';
