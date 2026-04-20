-- 구독 해지/환불 감사 로그 테이블.
-- 분쟁 대응 + 버그 추적 + 유저별 환불 이력 전수조사용.
-- cancel route가 각 단계마다 기록. RLS로 관리자만 조회.

CREATE TABLE IF NOT EXISTS subscription_cancel_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_email TEXT,
    imp_uid TEXT,
    merchant_uid TEXT,
    payment_id UUID,
    action TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    amount INTEGER,
    refunded_amount INTEGER,
    is_full_refund BOOLEAN,
    days_used INTEGER,
    days_total INTEGER,
    error_message TEXT,
    portone_code INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE subscription_cancel_audit IS '구독 해지/환불 감사 로그 (분쟁 대응 + 재발 방지)';
COMMENT ON COLUMN subscription_cancel_audit.action IS 'started | lock_failed | portone_already_cancelled | portone_cancel_success | portone_cancel_failed | portone_token_failed | db_updated | rolled_back | completed | completed_no_refund';

CREATE INDEX IF NOT EXISTS idx_subcancel_audit_user ON subscription_cancel_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subcancel_audit_imp ON subscription_cancel_audit(imp_uid) WHERE imp_uid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subcancel_audit_action ON subscription_cancel_audit(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subcancel_audit_failed ON subscription_cancel_audit(created_at DESC) WHERE success = false;

ALTER TABLE subscription_cancel_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_cancel_audit" ON subscription_cancel_audit;
CREATE POLICY "admin_select_cancel_audit" ON subscription_cancel_audit
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );
-- INSERT은 service_role만 (RLS 우회) — 별도 policy 없음
