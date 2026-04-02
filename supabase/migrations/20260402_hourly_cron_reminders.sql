-- ============================================
-- 매시간 리마인더 크론 (pg_cron + pg_net)
-- ============================================
-- Vercel Hobby 플랜은 크론이 하루 1번만 가능.
-- Supabase pg_cron으로 매시간 API를 호출하여
-- 유저가 설정한 시간에 맞춰 푸시 알림 발송.
--
-- 실행 방법:
-- 1. Supabase Dashboard > SQL Editor에서 실행
-- 2. YOUR_CRON_SECRET을 Vercel 환경변수의 CRON_SECRET 값으로 교체
-- 3. YOUR_SITE_URL을 실제 사이트 URL로 교체 (https://www.mementoani.com)
-- ============================================

-- pg_cron, pg_net 확장 활성화 (이미 활성화되어 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 기존 크론 작업이 있으면 제거 (중복 방지)
SELECT cron.unschedule('hourly-reminder-cron')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'hourly-reminder-cron'
);

-- 매시간 0분에 리마인더 크론 API 호출
SELECT cron.schedule(
    'hourly-reminder-cron',
    '0 * * * *',  -- 매시간 정각
    $$
    SELECT net.http_post(
        url := 'https://www.mementoani.com/api/cron/daily-greeting',
        headers := jsonb_build_object(
            'Authorization', 'Bearer YOUR_CRON_SECRET',
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 설정 확인
SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname = 'hourly-reminder-cron';
