-- notifications.type CHECK에 'neighbor_follow' 추가 (2026-06-12, prod 적용)
-- 발견 경위: 이웃 기능 E2E 검증 중 neighbors 행은 생기는데 알림이 0건 —
-- notifications_type_check가 구독/admin 타입만 허용해 neighbor_follow insert가
-- silent 실패(API에서 try/catch로 무시되던 것). DB 직접 대조로만 잡히는 류.

ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
    'subscription_expiring'::text, 'subscription_expired'::text, 'payment_failed'::text,
    'payment_success'::text, 'welcome'::text, 'subscription_hidden_start'::text,
    'subscription_countdown'::text, 'subscription_reset_complete'::text,
    'subscription_restored'::text, 'subscription_cancelled'::text,
    'subscription_archive_started'::text, 'subscription_archive_countdown'::text,
    'subscription_archive_complete'::text, 'admin_message'::text, 'admin_notice'::text,
    'neighbor_follow'::text
]));
