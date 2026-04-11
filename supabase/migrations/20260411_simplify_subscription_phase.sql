-- 구독 라이프사이클 재설계: 5단계 → 3단계로 단순화
--
-- 배경: 기존 5단계 (active/readonly/hidden/countdown/free)는 readonly가
-- "아무것도 할 수 없는 무료 회원"이라는 처벌 상태를 만들어 브랜드 철학과 충돌.
-- 새 설계: 해지 후 premium_expires_at까지는 유료, 그 이후 즉시 무료 회원 +
-- 초과 데이터는 archived (잠금), 40일 후 archived 데이터 hard delete.
--
-- 새 값:
--   active    — 평상시 (유료 or 무료 모두). 제약 없음.
--   cancelled — 해지됨, premium_expires_at 전. 유료 혜택 그대로, 배너 표시.
--   archived  — premium_expires_at 경과 후 무료 회원 + 초과 데이터 잠금.
--               data_reset_at까지 카운트다운, 도달 시 archived 데이터 hard delete.

-- 1. 기존 잘못된 값 정리 (레거시 데이터 active로 롤백)
UPDATE public.profiles
SET
    subscription_phase = 'active',
    subscription_cancelled_at = NULL,
    data_readonly_until = NULL,
    data_hidden_until = NULL,
    data_reset_at = NULL
WHERE subscription_phase IN ('readonly', 'hidden', 'countdown', 'free');

-- 2. CHECK 제약 교체
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_subscription_phase_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_subscription_phase_check
    CHECK (subscription_phase IN ('active', 'cancelled', 'archived'));

-- 3. 사용하지 않는 컬럼 DROP
ALTER TABLE public.profiles DROP COLUMN IF EXISTS data_readonly_until;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS data_hidden_until;

-- 4. 인덱스 재생성
DROP INDEX IF EXISTS idx_profiles_lifecycle;
CREATE INDEX IF NOT EXISTS idx_profiles_lifecycle
    ON public.profiles(subscription_phase, data_reset_at)
    WHERE subscription_phase != 'active';
