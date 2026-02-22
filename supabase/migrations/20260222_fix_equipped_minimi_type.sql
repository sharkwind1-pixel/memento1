-- ============================================================
-- equipped_minimi_id 컬럼 타입 수정: UUID → TEXT
--
-- 원인: profiles.equipped_minimi_id가 UUID 타입으로 생성되었으나
--       코드에서는 slug 문자열("maltipoo", "yorkshire" 등)을 저장
-- 에러: invalid input syntax for type uuid: "yorkshire"
-- ============================================================

-- 기존 UUID 타입 컬럼을 TEXT로 변경
-- USING으로 기존 UUID 값을 문자열로 자동 변환
ALTER TABLE profiles
    ALTER COLUMN equipped_minimi_id TYPE TEXT
    USING equipped_minimi_id::TEXT;

-- equipped_accessories도 혹시 같은 문제가 있을 수 있으니 확인용
-- (이미 TEXT/JSONB라면 이 명령은 무해)
