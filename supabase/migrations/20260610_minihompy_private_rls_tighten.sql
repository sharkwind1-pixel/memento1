-- 펫홈 비공개 데이터 RLS 좁히기 (Phase 1 공개 페이지 전 보안 정비).
-- (MCP apply_migration "minihompy_private_rls_tighten"로 prod 적용됨 — 리포 기록용)
-- 문제: settings/guestbook/likes에 qual=true SELECT 정책 → anon key 직접 REST 조회로
--       비공개 펫홈의 greeting/배치/방명록 내용이 그대로 노출 가능(API 403은 장식).
-- 서버 API는 admin 클라로 전환 완료 → RLS를 좁혀도 동작 불변.
-- 검증(2026-06-10): 트랜잭션 시뮬레이션 — anon이 비공개 settings/guestbook/likes 전부 0행.

-- 비공개 판정 헬퍼: 정책 서브쿼리가 settings 자체 RLS에 막히면 anon에게 비공개 행이 "안 보여서
-- 없다"로 오판되는 우회가 생김 → SECURITY DEFINER로 정확 판정 (boolean만 노출, 최소 정보).
CREATE OR REPLACE FUNCTION public.is_minihompy_private(p_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.minihompy_settings
        WHERE user_id = p_owner AND is_public = false
    );
$$;
GRANT EXECUTE ON FUNCTION public.is_minihompy_private(uuid) TO anon, authenticated, service_role;

-- settings: 무조건 공개(qual=true) 정책 제거 → 남는 minihompy_select(is_public OR own)
DROP POLICY IF EXISTS "Users can view any settings" ON public.minihompy_settings;

-- guestbook: 무조건 공개 2정책 → 비공개 명시 펫홈만 차단 (settings 없음=기본 공개 유지)
DROP POLICY IF EXISTS "Anyone can view guestbook" ON public.minihompy_guestbook;
DROP POLICY IF EXISTS "guestbook_select" ON public.minihompy_guestbook;
CREATE POLICY "guestbook_select_visible" ON public.minihompy_guestbook
FOR SELECT TO public USING (
    owner_id = (SELECT auth.uid())
    OR visitor_id = (SELECT auth.uid())
    OR NOT public.is_minihompy_private(owner_id)
);

-- likes: 동일 패턴
DROP POLICY IF EXISTS "Anyone can view likes" ON public.minihompy_likes;
DROP POLICY IF EXISTS "likes_select" ON public.minihompy_likes;
CREATE POLICY "likes_select_visible" ON public.minihompy_likes
FOR SELECT TO public USING (
    user_id = (SELECT auth.uid())
    OR owner_id = (SELECT auth.uid())
    OR NOT public.is_minihompy_private(owner_id)
);
