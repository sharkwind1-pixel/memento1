-- subscription_tier 컬럼 추가: BASIC/PREMIUM 분기를 위한 구독 등급
-- is_premium은 유지 (하위호환), subscription_tier로 세부 분기
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'basic', 'premium'));

-- 기존 프리미엄 유저는 'premium'으로 설정
UPDATE profiles SET subscription_tier = 'premium' WHERE is_premium = true;

-- 보안: subscription_tier도 보호 대상 컬럼에 추가
-- (protect_sensitive_profile_columns 트리거가 이미 있으므로, 해당 함수 업데이트)
CREATE OR REPLACE FUNCTION protect_sensitive_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- service_role은 모든 변경 허용
    IF current_setting('role', true) = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- 민감 컬럼 변경 시도 시 원래 값으로 되돌림
    NEW.is_admin := OLD.is_admin;
    NEW.is_premium := OLD.is_premium;
    NEW.is_banned := OLD.is_banned;
    NEW.points := OLD.points;
    NEW.total_points_earned := OLD.total_points_earned;
    NEW.premium_expires_at := OLD.premium_expires_at;
    NEW.subscription_tier := OLD.subscription_tier;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
