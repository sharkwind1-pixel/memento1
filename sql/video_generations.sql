-- ============================================
-- AI 영상 생성 테이블 마이그레이션
-- Supabase Dashboard SQL Editor에서 실행
-- ============================================

-- 1. video_generations 테이블 생성
CREATE TABLE IF NOT EXISTS video_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
    pet_name TEXT,
    source_photo_url TEXT NOT NULL,
    template_id TEXT,
    custom_prompt TEXT,
    fal_request_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    video_url TEXT,
    fal_video_url TEXT,
    thumbnail_url TEXT,
    duration_seconds FLOAT,
    error_message TEXT,
    is_single_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_video_gen_user ON video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_gen_status ON video_generations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_video_gen_fal ON video_generations(fal_request_id);

-- 3. RLS 활성화
ALTER TABLE video_generations ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책
DO $$
BEGIN
    -- 본인 영상 조회
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'video_generations' AND policyname = 'Users view own videos'
    ) THEN
        CREATE POLICY "Users view own videos"
            ON video_generations FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    -- 본인 영상 생성
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'video_generations' AND policyname = 'Users insert own videos'
    ) THEN
        CREATE POLICY "Users insert own videos"
            ON video_generations FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;

    -- 서비스(webhook)가 모든 영상 상태 업데이트 가능
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'video_generations' AND policyname = 'Service can update any'
    ) THEN
        CREATE POLICY "Service can update any"
            ON video_generations FOR UPDATE
            USING (true);
    END IF;
END $$;

-- 5. Supabase Storage 버킷 (수동으로 Dashboard > Storage에서 생성 필요)
-- 버킷 이름: videos
-- Public: true (공개 접근 가능)
-- Allowed MIME types: video/mp4, video/webm
-- Max file size: 100MB
