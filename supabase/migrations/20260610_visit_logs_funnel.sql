-- visit_logs 퍼널 측정: event 컬럼 + 퍼널 RPC.
-- (MCP apply_migration "visit_logs_funnel"로 prod 적용됨 — 리포 기록용)
-- get_visit_stats는 퍼널-step 행(scroll/cta/signup)을 제외해 기존 "방문" 수치 정확도 유지.

ALTER TABLE public.visit_logs ADD COLUMN IF NOT EXISTS event text;
CREATE INDEX IF NOT EXISTS idx_visit_logs_event_created ON public.visit_logs (event, created_at DESC);

-- 방문 집계: landing/null(실제 페이지 방문)만 카운트. 다른 event = 퍼널 단계 전용 행이라 방문수 제외.
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
      AND (event IS NULL OR event = 'landing')
    GROUP BY 1
    ORDER BY 1;
$$;

-- 퍼널 단계별 고유 방문자 (landing→scroll→cta→signup drop-off 측정)
CREATE OR REPLACE FUNCTION public.get_funnel_stats(p_days int DEFAULT 7)
RETURNS TABLE(
    event text,
    visitors bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        event,
        count(DISTINCT visitor_id)::bigint AS visitors
    FROM public.visit_logs
    WHERE created_at >= (now() - make_interval(days => p_days))
      AND event IS NOT NULL
    GROUP BY event;
$$;

REVOKE ALL ON FUNCTION public.get_funnel_stats(int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_funnel_stats(int) TO service_role;
