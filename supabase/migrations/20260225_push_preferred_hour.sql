-- push_subscriptions에 preferred_hour 컬럼 추가
-- 유저가 선택한 알림 수신 시간 (KST 기준, 7~22시)
-- 매시간 크론이 돌면서 해당 시간에 맞는 구독자만 발송

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS preferred_hour SMALLINT DEFAULT 9;

-- preferred_hour 기반 조회 인덱스 (매시간 크론에서 사용)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_preferred_hour
    ON push_subscriptions(preferred_hour);
