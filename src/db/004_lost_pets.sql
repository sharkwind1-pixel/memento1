-- ============================================
-- 004: 분실/발견 동물 테이블
-- ============================================
-- 분실동물 신고 및 발견동물 등록을 위한 테이블
-- type: 'lost' (실종) / 'found' (발견)
-- status: 'active' (활성) / 'resolved' (해결됨) / 'deleted' (삭제됨)

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS lost_pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
    title TEXT NOT NULL,
    pet_type TEXT NOT NULL,           -- '강아지', '고양이', '기타'
    breed TEXT,
    color TEXT,
    gender TEXT,
    age TEXT,
    region TEXT,                       -- 시/도
    district TEXT,                     -- 구/군
    location_detail TEXT,              -- 상세 위치
    date DATE NOT NULL,                -- 실종/발견 날짜
    description TEXT,
    contact TEXT,                      -- 연락처
    reward TEXT,                       -- 사례금 (실종만)
    image_url TEXT,
    image_storage_path TEXT,
    views INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_lost_pets_type ON lost_pets(type);
CREATE INDEX IF NOT EXISTS idx_lost_pets_status ON lost_pets(status);
CREATE INDEX IF NOT EXISTS idx_lost_pets_region ON lost_pets(region);
CREATE INDEX IF NOT EXISTS idx_lost_pets_created_at ON lost_pets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lost_pets_user_id ON lost_pets(user_id);

-- 3. RLS 활성화
ALTER TABLE lost_pets ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책

-- SELECT: 누구나 활성 게시글 조회 가능
CREATE POLICY "lost_pets_select_active"
    ON lost_pets
    FOR SELECT
    USING (status = 'active');

-- INSERT: 인증된 사용자만 작성 가능 (user_id = 본인)
CREATE POLICY "lost_pets_insert_own"
    ON lost_pets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: 본인 글만 수정 가능
CREATE POLICY "lost_pets_update_own"
    ON lost_pets
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: 본인 글만 삭제 가능
CREATE POLICY "lost_pets_delete_own"
    ON lost_pets
    FOR DELETE
    USING (auth.uid() = user_id);

-- 5. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_lost_pets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lost_pets_updated_at
    BEFORE UPDATE ON lost_pets
    FOR EACH ROW
    EXECUTE FUNCTION update_lost_pets_updated_at();
