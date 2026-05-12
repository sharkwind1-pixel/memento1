-- 팩트체크 / 할루시네이션 검증 로그 (AGENTS.md 9번 fact-checker 에이전트, 2026-05-12)
-- 매거진/블로그 자동 생성물 + AI 응답 검증 결과 저장.
-- prod DB에는 supabase MCP apply_migration으로 적용 완료.

CREATE TABLE IF NOT EXISTS public.validation_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type text NOT NULL CHECK (content_type IN ('magazine', 'blog', 'chat', 'admin_message')),
    source_id text,
    overall_score integer NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    flags jsonb NOT NULL DEFAULT '[]'::jsonb,
    species_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
    claims jsonb NOT NULL DEFAULT '[]'::jsonb,
    summary text,
    content_excerpt text,
    query_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_validation_logs_created_at ON public.validation_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_logs_content_type ON public.validation_logs (content_type);
CREATE INDEX IF NOT EXISTS idx_validation_logs_score ON public.validation_logs (overall_score);

-- RLS: admin만 SELECT (관리자 분석용). service_role은 RLS bypass라 cron에서 INSERT 가능.
ALTER TABLE public.validation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS validation_logs_admin_all ON public.validation_logs;
CREATE POLICY validation_logs_admin_all
    ON public.validation_logs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

COMMENT ON TABLE public.validation_logs IS 'fact-checker 에이전트 검증 로그 (매거진/블로그/AI 응답 사실성 검증)';
