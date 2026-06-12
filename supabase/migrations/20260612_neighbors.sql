-- 이웃(neighbor) 그래프 — 인스타식 단방향 팔로우, 맞팔 = 서로이웃 (PETHOME-SPEC §13-B)
-- 2026-06-12 MCP apply_migration으로 prod 적용.
--
-- 설계 메모:
-- - 단방향 행 1개 = "follower가 following을 이웃 추가". 맞팔(서로이웃)은 양방향 행 존재로 계산.
-- - 쓰기 경로는 API(/api/neighbors, getAuthUser + admin 클라이언트)지만,
--   RLS는 클라이언트 직접 호출 방어선으로 본인-follower 행만 허용.
-- - 게스트(공개 펫홈) 카운트 노출은 서버 API(admin)가 담당 → anon 권한 불필요.
-- - (select auth.uid()) 패턴 = auth_rls_initplan 성능 규칙 준수.

CREATE TABLE IF NOT EXISTS neighbors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT neighbors_unique_pair UNIQUE (follower_id, following_id),
    CONSTRAINT neighbors_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_neighbors_follower ON neighbors(follower_id);
CREATE INDEX IF NOT EXISTS idx_neighbors_following ON neighbors(following_id);

ALTER TABLE neighbors ENABLE ROW LEVEL SECURITY;

-- 읽기: 로그인 유저는 그래프 조회 가능 (이웃 목록/카운트)
CREATE POLICY "neighbors_select_authenticated" ON neighbors
    FOR SELECT TO authenticated USING (true);

-- 생성/삭제: 본인이 follower인 행만
CREATE POLICY "neighbors_insert_own" ON neighbors
    FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = follower_id);

CREATE POLICY "neighbors_delete_own" ON neighbors
    FOR DELETE TO authenticated USING ((SELECT auth.uid()) = follower_id);

COMMENT ON TABLE neighbors IS '이웃(팔로우) 그래프 - 단방향, 맞팔=서로이웃';
