-- =====================================================
-- 관리자 메시지/공지 기능 (2026-04-12)
-- =====================================================
-- 배경: 관리자가 유저들에게 공지/개별 인사/정책 안내를 보낼 수 있어야 함.
-- 기존 notifications 인프라를 재사용하되 admin_message type을 추가하고
-- sender_id 컬럼으로 발송한 관리자를 추적한다.
--
-- 사용처:
-- - POST /api/admin/messages
-- - AdminMessagesTab.tsx
-- - NotificationItem (관리자 메시지 별도 아이콘 표시)
-- =====================================================

-- 1. type CHECK 제약 확장
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
        'subscription_restored',
        'subscription_cancelled',
        'subscription_archive_started',
        'subscription_archive_countdown',
        'subscription_archive_complete',
        'admin_message',
        'admin_notice'
    ));

-- 2. sender_id 컬럼 — 관리자 발송 시 발신자 추적
--    null 허용 (시스템 알림은 sender_id 없음)
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. 관리자 메시지 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_admin_messages
    ON public.notifications(sender_id, created_at DESC)
    WHERE sender_id IS NOT NULL;

-- =====================================================
-- 검증 쿼리:
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'notifications' AND column_name = 'sender_id';
--
-- SELECT pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'notifications_type_check';
-- =====================================================
