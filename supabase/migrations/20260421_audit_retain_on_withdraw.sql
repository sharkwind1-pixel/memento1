-- 유저 탈퇴 시 환불 감사 기록이 CASCADE로 삭제되면 분쟁 대응 불가.
-- user_email 필드가 이미 있으므로 profiles FK 삭제 시 NULL 처리로 변경.

ALTER TABLE subscription_cancel_audit
    DROP CONSTRAINT IF EXISTS subscription_cancel_audit_user_id_fkey;

ALTER TABLE subscription_cancel_audit
    ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE subscription_cancel_audit
    ADD CONSTRAINT subscription_cancel_audit_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN subscription_cancel_audit.user_id IS
    '유저 탈퇴 시 NULL. user_email 필드로 분쟁 대응 식별 유지.';
