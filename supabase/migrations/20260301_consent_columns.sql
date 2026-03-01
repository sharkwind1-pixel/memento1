-- ============================================================================
-- profiles 테이블에 동의 기록 컬럼 추가
-- 2026-03-01
-- ============================================================================

-- 약관 동의 일시
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'terms_agreed_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN terms_agreed_at TIMESTAMPTZ;
    END IF;
END $$;

-- 위치정보 동의 여부
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'location_consent'
    ) THEN
        ALTER TABLE profiles ADD COLUMN location_consent BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 위치정보 동의 일시
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'location_consent_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN location_consent_at TIMESTAMPTZ;
    END IF;
END $$;

COMMENT ON COLUMN profiles.terms_agreed_at IS '이용약관/개인정보처리방침 동의 일시';
COMMENT ON COLUMN profiles.location_consent IS '위치기반 서비스 이용 동의 여부 (선택)';
COMMENT ON COLUMN profiles.location_consent_at IS '위치기반 서비스 이용 동의 일시';
