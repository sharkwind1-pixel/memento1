/**
 * pet_condolences: 추모 펫 위로 리액션 테이블
 * 다른 유저가 추모 펫에 "위로"를 보낼 수 있음 (한 유저당 한 펫 한 번, 토글)
 */

CREATE TABLE IF NOT EXISTS pet_condolences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(pet_id, user_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_pet_condolences_pet_id ON pet_condolences(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_condolences_user_id ON pet_condolences(user_id);

-- RLS
ALTER TABLE pet_condolences ENABLE ROW LEVEL SECURITY;

-- 누구든 위로 수를 볼 수 있음 (홈 화면 노출)
CREATE POLICY "select_all" ON pet_condolences FOR SELECT USING (true);

-- 본인만 위로 추가
CREATE POLICY "insert_own" ON pet_condolences FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인만 위로 취소
CREATE POLICY "delete_own" ON pet_condolences FOR DELETE USING (auth.uid() = user_id);
