-- ============================================================================
-- 관리자 프로필 수정 권한 마이그레이션
-- ============================================================================
-- 문제: profiles 테이블의 RLS 정책이 "자기 자신만 수정 가능"으로 되어 있어서
-- 관리자가 다른 유저의 is_premium, is_admin 등을 변경할 수 없었음
-- 해결: is_admin = true 인 유저는 다른 유저의 프로필도 수정 가능하도록 정책 추가
-- ============================================================================
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행
-- ============================================================================

-- 1. 관리자용 UPDATE 정책 추가
-- ============================================================================
-- 기존 정책 "Users can update own profile"은 그대로 유지 (자기 프로필 수정)
-- 관리자는 모든 프로필 수정 가능한 정책을 추가

CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND is_admin = true
        )
    );

-- 2. 관리자용 is_admin 부여 기능 (현재 코드에 없던 것)
-- ============================================================================
-- 관리자 대시보드에서 다른 유저에게 관리자 권한을 부여/해제할 때 사용
CREATE OR REPLACE FUNCTION toggle_admin(
    p_target_user_id UUID,
    p_is_admin BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
    -- 호출자가 관리자인지 확인
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: caller is not an admin';
    END IF;

    -- 자기 자신의 관리자 권한은 해제할 수 없음 (안전장치)
    IF p_target_user_id = auth.uid() AND p_is_admin = false THEN
        RAISE EXCEPTION 'Cannot revoke your own admin status';
    END IF;

    UPDATE profiles
    SET is_admin = p_is_admin
    WHERE id = p_target_user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 완료!
-- ============================================================================
-- 이 마이그레이션 실행 후:
-- 1. 관리자(is_admin=true)가 다른 유저의 프로필을 수정 가능
-- 2. toggle_admin() 함수로 관리자 권한 부여/해제 가능
-- ============================================================================
