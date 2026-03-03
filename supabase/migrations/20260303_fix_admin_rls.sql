-- reports, deleted_accounts 테이블의 RLS 정책을 이메일 하드코딩 → is_admin 기반으로 변경
-- 기존: profiles.email IN ('sharkwind1@gmail.com')
-- 변경: profiles.is_admin = true

-- 1. reports 테이블
DROP POLICY IF EXISTS "Admins can manage all reports" ON reports;
CREATE POLICY "Admins can manage all reports" ON reports
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- 2. deleted_accounts 테이블
DROP POLICY IF EXISTS "Admin only access" ON deleted_accounts;
CREATE POLICY "Admin only access" ON deleted_accounts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );
