-- ============================================================================
-- 20260502: 푸시 알림 토큰 저장 컬럼
-- ============================================================================
--
-- 모바일 앱에서 expo-notifications로 발급받은 Expo Push Token 저장.
-- 토큰이 바뀌면 (재설치/권한 재허용) 새 토큰으로 덮어씀.
--
-- 사용:
--   POST /api/push/register: 토큰 저장
--   DELETE /api/push/register: 로그아웃 시 토큰 제거
--   향후 발송: expo-server-sdk로 expo_push_token 보유 유저에게 push
-- ============================================================================

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS expo_push_token text,
    ADD COLUMN IF NOT EXISTS push_platform text CHECK (push_platform IN ('ios', 'android')),
    ADD COLUMN IF NOT EXISTS push_registered_at timestamptz;

-- 발송 시 expo_push_token IS NOT NULL인 유저만 조회 → 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_expo_push_token
    ON profiles (expo_push_token)
    WHERE expo_push_token IS NOT NULL;

COMMENT ON COLUMN profiles.expo_push_token IS 'Expo Push Token (모바일 앱)';
COMMENT ON COLUMN profiles.push_platform IS 'ios | android';
COMMENT ON COLUMN profiles.push_registered_at IS '토큰 마지막 등록 시각';
