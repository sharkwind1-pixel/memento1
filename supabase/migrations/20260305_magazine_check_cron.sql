-- 매거진 보정 크론: 매일 UTC 12:00 (KST 21:00)에 실행
-- 오늘이 월/수/금인데 아침 크론에서 매거진 생성이 실패했으면 자동으로 보정 생성
SELECT cron.schedule(
    'daily-magazine-check',
    '0 12 * * *',
    $$
    SELECT net.http_get(
        url := 'https://www.mementoani.com/api/cron/magazine-check',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.cron_secret', true) || '"}'::jsonb
    );
    $$
);
