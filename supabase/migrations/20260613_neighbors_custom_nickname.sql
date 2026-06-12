-- 서로이웃 별명 (싸이월드 일촌명-lite) — 2026-06-13 prod 적용됨 (MCP apply_migration)
-- 내가 팔로우한 행에 내가 부르는 별명을 저장. 보이는 건 나에게만(내 목록 표시용).
ALTER TABLE public.neighbors ADD COLUMN IF NOT EXISTS neighbor_nickname text
    CHECK (neighbor_nickname IS NULL OR char_length(neighbor_nickname) <= 20);

-- UPDATE 정책: 본인 follower 행만 (insert/delete_own과 동일 initplan 패턴)
DROP POLICY IF EXISTS neighbors_update_own ON public.neighbors;
CREATE POLICY neighbors_update_own ON public.neighbors
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = follower_id)
    WITH CHECK ((SELECT auth.uid()) = follower_id);
