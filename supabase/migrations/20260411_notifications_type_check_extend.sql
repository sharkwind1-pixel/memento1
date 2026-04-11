-- notifications.type CHECK 제약 확장
-- 구독 라이프사이클 알림 4종 추가:
--   subscription_hidden_start, subscription_countdown,
--   subscription_reset_complete, subscription_restored
--
-- 배경: 라이프사이클 크론/재구독 복구 로직이 이 type들로 INSERT 시도했으나
-- CHECK 제약 위반으로 조용히 실패. (코드도 error 체크 누락되어 silent fail 발생)

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'subscription_expiring',
        'subscription_expired',
        'payment_failed',
        'payment_success',
        'welcome',
        'subscription_hidden_start',
        'subscription_countdown',
        'subscription_reset_complete',
        'subscription_restored'
    ));
