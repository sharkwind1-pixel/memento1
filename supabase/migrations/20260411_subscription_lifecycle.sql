-- =====================================================
-- 구독 해지 라이프사이클 (2026-04-11)
-- =====================================================
-- 설계: docs/subscription-lifecycle.md
-- 단계: active → readonly(30d) → hidden(50d) → countdown(10d) → free
--
-- 핵심 원칙:
-- 1. 데이터는 유저 명시 결정까지 보존
-- 2. 즉시 삭제 X, 단계적 회귀
-- 3. 추모 펫도 카운트 대상 (데이터 앵커)
-- =====================================================

-- ---- 1. profiles 라이프사이클 컬럼 추가 ----

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS subscription_phase TEXT DEFAULT 'active'
        CHECK (subscription_phase IN ('active', 'readonly', 'hidden', 'countdown', 'free'));

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMPTZ;

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS data_readonly_until TIMESTAMPTZ;

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS data_hidden_until TIMESTAMPTZ;

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS data_reset_at TIMESTAMPTZ;

-- 대표 펫 (회귀 시 유지될 펫). 추모 펫도 가능 (데이터 앵커).
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS protected_pet_id UUID REFERENCES pets(id) ON DELETE SET NULL;

-- 라이프사이클 단계 인덱스 (크론잡 효율)
CREATE INDEX IF NOT EXISTS idx_profiles_lifecycle
    ON profiles(subscription_phase, data_reset_at)
    WHERE subscription_phase != 'active';

CREATE INDEX IF NOT EXISTS idx_profiles_lifecycle_phase_dates
    ON profiles(subscription_phase, data_readonly_until, data_hidden_until)
    WHERE subscription_phase != 'active';

-- ---- 2. pets 소프트 삭제 컬럼 ----

-- archived_at: NULL이면 활성. 값이 있으면 회귀 시 보관함으로 이동된 펫.
ALTER TABLE pets
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pets_archived_at
    ON pets(user_id, archived_at)
    WHERE archived_at IS NOT NULL;

-- ---- 3. pet_media 소프트 삭제 컬럼 (사진 50장 초과분 보관) ----

ALTER TABLE pet_media
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- favorite: 즐겨찾기 우선 보존을 위한 컬럼 (이미 있으면 무시)
ALTER TABLE pet_media
    ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_pet_media_archived
    ON pet_media(pet_id, archived_at)
    WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pet_media_favorite_recent
    ON pet_media(pet_id, is_favorite DESC, created_at DESC);

-- ---- 4. notifications type 확장 ----
-- 기존 type: payment_success, payment_failed, subscription_expired,
--           subscription_expiring, welcome
-- 추가:
--   subscription_readonly_start  (해지 직후, readonly 진입)
--   subscription_hidden_start    (D+30, hidden 진입)
--   subscription_countdown       (D+80~D+89, 매일)
--   subscription_reset_complete  (D+90, 회귀 완료)
--
-- 별도 ENUM/CHECK가 없다면 type 컬럼은 자유 텍스트 — 코드 레벨에서만 관리.

-- ---- 5. 마이그레이션 검증 쿼리 ----
-- 실행 후 아래 쿼리로 컬럼 추가를 확인:
--
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
--   AND column_name IN (
--     'subscription_phase', 'subscription_cancelled_at',
--     'data_readonly_until', 'data_hidden_until', 'data_reset_at',
--     'protected_pet_id'
--   );
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('pets', 'pet_media') AND column_name = 'archived_at';
