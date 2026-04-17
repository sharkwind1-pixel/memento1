-- 20260418_pets_profile_image_storage_only
-- pets.profile_image는 반드시 Storage URL(http/https)이어야 함.
--
-- 배경: 2026-04-18 DB 전수 조사 결과 profile_image 10개 중 3개가 blob: URL,
-- 7개가 data:image/...;base64,...로 저장되어 있었음 (Storage 정상 경유 0개).
-- PetContext.addPet/updatePet이 Storage 우회하고 blob/data URL을 그대로
-- 저장하던 버그. 코드는 ensurePetProfileStorageUrl 헬퍼로 수정했고,
-- 이 마이그레이션은 (1) 복구 대상 백업 (2) 임시 NULL 처리 (3) CHECK 제약을 담당.
--
-- 복구 흐름:
--   1. 이 마이그레이션 실행 → 기존 data URL 7개는 pets_profile_image_backup에 보관, blob URL 3개는 영구 소실
--   2. /api/admin/migrate-pet-profiles 호출 → 백업 테이블 순회하며 Storage 업로드 + pets.profile_image UPDATE
--   3. 백업 테이블은 복구 성공 후 관리자가 수동 DROP

-- 1. 백업 테이블 생성 (data URL 복구용)
CREATE TABLE IF NOT EXISTS public.pets_profile_image_backup (
    pet_id UUID PRIMARY KEY REFERENCES public.pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    original_value TEXT NOT NULL,
    original_kind TEXT NOT NULL, -- 'data_url' | 'blob_url'
    backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    restored_at TIMESTAMPTZ,
    restored_url TEXT
);

-- 백업 테이블 RLS: 관리자만 접근
ALTER TABLE public.pets_profile_image_backup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "backup admin only" ON public.pets_profile_image_backup;
CREATE POLICY "backup admin only" ON public.pets_profile_image_backup
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

-- 2. 기존 오염 데이터 백업 + NULL 처리
-- data: URL은 복구 가능하게 원본 보존
INSERT INTO public.pets_profile_image_backup (pet_id, user_id, original_value, original_kind)
SELECT id, user_id, profile_image, 'data_url'
FROM public.pets
WHERE profile_image LIKE 'data:%'
ON CONFLICT (pet_id) DO NOTHING;

-- blob: URL은 복구 불가능하지만 어떤 펫이었는지 기록 (유저 재업로드 안내용)
INSERT INTO public.pets_profile_image_backup (pet_id, user_id, original_value, original_kind)
SELECT id, user_id, profile_image, 'blob_url'
FROM public.pets
WHERE profile_image LIKE 'blob:%'
ON CONFLICT (pet_id) DO NOTHING;

-- 원본 컬럼은 NULL로 (CHECK 제약 통과 + 깨진 이미지 노출 방지)
UPDATE public.pets
SET profile_image = NULL
WHERE profile_image LIKE 'blob:%' OR profile_image LIKE 'data:%';

-- 3. CHECK 제약: 앞으로 http(s)만 허용
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.pets'::regclass
          AND conname = 'pets_profile_image_http_only'
    ) THEN
        ALTER TABLE public.pets
        ADD CONSTRAINT pets_profile_image_http_only
        CHECK (
            profile_image IS NULL
            OR profile_image LIKE 'http://%'
            OR profile_image LIKE 'https://%'
        );
    END IF;
END $$;

-- 4. 백업 통계 코멘트 (쿼리용)
COMMENT ON TABLE public.pets_profile_image_backup IS
    '2026-04-18 펫 프로필 사진 Storage 우회 버그 백업. /api/admin/migrate-pet-profiles로 복구.';
