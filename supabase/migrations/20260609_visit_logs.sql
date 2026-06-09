-- 방문 로그 (게스트 포함) + 일별 집계 RPC. 관리자 대시보드 "방문자(게스트 포함)" 용.
-- (MCP apply_migration "create_visit_logs"로 prod 적용됨 — 리포 기록용)

CREATE TABLE IF NOT EXISTS public.visit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    path text,
    ip text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_visit_logs_created_at ON public.visit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visit_logs_visitor_created ON public.visit_logs (visitor_id, created_at DESC);

-- RLS: 정책 없음 → service_role(API)만 접근. 클라이언트 직접 read/insert 차단(IP 등 보호).
ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;

-- 일별 집계(KST): 전체 방문 / 고유 방문자 / 비로그인(게스트) / 회원
CREATE OR REPLACE FUNCTION public.get_visit_stats(p_days int DEFAULT 7)
RETURNS TABLE(
    day date,
    total_visits bigint,
    unique_visitors bigint,
    guest_visitors bigint,
    member_visitors bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        (created_at AT TIME ZONE 'Asia/Seoul')::date AS day,
        count(*)::bigint AS total_visits,
        count(DISTINCT visitor_id)::bigint AS unique_visitors,
        count(DISTINCT visitor_id) FILTER (WHERE user_id IS NULL)::bigint AS guest_visitors,
        count(DISTINCT visitor_id) FILTER (WHERE user_id IS NOT NULL)::bigint AS member_visitors
    FROM public.visit_logs
    WHERE created_at >= (now() - make_interval(days => p_days))
    GROUP BY 1
    ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION public.get_visit_stats(int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_visit_stats(int) TO service_role;
