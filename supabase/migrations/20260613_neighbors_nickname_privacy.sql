-- 9번 적대검증 발견 1 (High) 수정 — 2026-06-13 prod 적용됨 (MCP apply_migration ×2)
-- neighbors SELECT 정책이 qual=true(authenticated 전체)라 사적 별명(neighbor_nickname)이
-- PostgREST 직격(GET /rest/v1/neighbors?select=neighbor_nickname)으로 전 유저에게 노출되던 구멍.
--
-- 주의(1차 시도 실패 교훈): 테이블 레벨 SELECT grant가 있으면 컬럼 단위 REVOKE는 무효
-- (Postgres 의미론 — 컬럼 REVOKE는 컬럼 grant만 제거, 테이블 grant에서 빼기 불가).
-- → 테이블 SELECT 회수 후 비밀 아닌 그래프 컬럼만 재부여.
--
-- 기능 영향 없음 실측: 앱의 neighbors 읽기는 전부 admin(service_role) 경유.
-- 세션 클라 INSERT/DELETE/UPDATE는 WHERE 컬럼(follower_id/following_id) SELECT 권한 필요 → 재부여 컬럼에 포함.
-- anon은 RLS SELECT 정책(TO authenticated)에서 이미 행 차단 — 재부여 불필요.
-- 검증: 직격 select neighbor_nickname → 42501 / 그래프 컬럼 select OK / PATCH·DELETE·POST 200 (전부 curl 실측).

REVOKE SELECT ON public.neighbors FROM authenticated, anon;
GRANT SELECT (id, follower_id, following_id, created_at) ON public.neighbors TO authenticated;
