-- 가입 환영 메일 발송 추적 컬럼 (2026-05-11)
-- AuthContext가 프로필 로드 시 NULL이면 POST /api/auth/welcome 호출.
-- 서버가 발송 후 갱신. 중복 차단.

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.welcome_email_sent_at IS
    '가입 환영 메일 발송 시각. NULL이면 아직 안 보냄. 한 번 보낸 후 갱신.';
