-- ============================================================
-- 매거진 자동 생성 크론 (pg_cron + pg_net)
-- ============================================================
-- 매일 UTC 21:00 (KST 06:00)에 매거진 생성 API를 호출한다.
-- API 내부에서 월/수/금만 실행하고 나머지 요일은 스킵한다.
--
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- ============================================================

-- 기존에 같은 이름의 작업이 있으면 먼저 삭제
SELECT cron.unschedule('daily-magazine-generate')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-magazine-generate');

-- 매일 UTC 21:00 (KST 06:00)에 호출
-- CRON_SECRET은 실제 값으로 교체해서 실행할 것!
SELECT cron.schedule(
    'daily-magazine-generate',
    '0 21 * * *',
    $$
    SELECT net.http_get(
        url := 'https://www.mementoani.com/api/cron/magazine-generate',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer REPLACE_WITH_CRON_SECRET"}'::jsonb
    );
    $$
);

-- 확인: 등록된 크론 작업 목록
SELECT jobid, jobname, schedule, command FROM cron.job;
