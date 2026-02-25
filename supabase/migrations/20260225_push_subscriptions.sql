-- push_subscriptions: 푸시 알림 구독 정보 저장
-- Web Push API의 PushSubscription 데이터를 저장하여
-- Vercel Cron에서 일괄 푸시 발송 시 사용

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 사용자 본인만 자기 구독 관리 가능
CREATE POLICY "Users can manage own subscriptions"
    ON push_subscriptions FOR ALL
    USING (auth.uid() = user_id);

-- 유저별 구독 조회 성능 향상
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
    ON push_subscriptions(user_id);
