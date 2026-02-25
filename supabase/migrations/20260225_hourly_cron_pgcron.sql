-- ============================================================
-- 매시간 푸시 알림 크론 (pg_cron + pg_net)
-- ============================================================
-- Vercel Hobby 플랜은 크론을 하루 1회만 허용하므로,
-- Supabase pg_cron + pg_net으로 매시간 API를 호출하여
-- 모든 시간대의 케어 리마인더 + AI 인사를 발송합니다.
--
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- ============================================================

-- 1. 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. 매시간 API 호출 크론 등록
-- 기존에 같은 이름의 작업이 있으면 먼저 삭제
SELECT cron.unschedule('hourly-push-notifications')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hourly-push-notifications');

SELECT cron.schedule(
    'hourly-push-notifications',
    '0 * * * *',
    $$
    SELECT net.http_get(
        url := 'https://www.mementoani.com/api/cron/daily-greeting',
        headers := '{"Content-Type": "application/json"}'::jsonb
    );
    $$
);

-- 3. pg_net 응답 테이블 정리 크론 (디스크 관리)
SELECT cron.unschedule('cleanup-net-responses')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-net-responses');

SELECT cron.schedule(
    'cleanup-net-responses',
    '0 0 * * *',
    $$DELETE FROM net._http_response WHERE created < NOW() - INTERVAL '1 day';$$
);

-- 확인: 등록된 크론 작업 목록
SELECT jobid, jobname, schedule, command FROM cron.job;
