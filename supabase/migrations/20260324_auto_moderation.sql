-- =============================================
-- 게시판 자동 모더레이션 시스템
-- 1. community_posts에 모더레이션 컬럼 추가
-- 2. moderation_logs 테이블 생성
-- 3. 신고 누적 자동 숨김 트리거
-- =============================================

-- 1. community_posts 모더레이션 컬럼 추가
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending';
-- pending: 검토 전, approved: AI 통과, rejected: AI 차단

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
-- AI가 차단한 사유 (rejected일 때만 값 있음)

CREATE INDEX IF NOT EXISTS idx_community_posts_moderation
    ON community_posts (moderation_status) WHERE moderation_status = 'rejected';

-- 2. 모더레이션 로그 테이블
CREATE TABLE IF NOT EXISTS moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    filter_type TEXT NOT NULL,  -- 'profanity' | 'spam' | 'duplicate' | 'ai' | 'report'
    result TEXT NOT NULL,       -- 'blocked' | 'approved' | 'flagged'
    reason TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_logs_post ON moderation_logs (post_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_type ON moderation_logs (filter_type);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created ON moderation_logs (created_at DESC);

-- RLS: 관리자만 조회 가능
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "관리자만 모더레이션 로그 조회" ON moderation_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- 서비스 역할은 모든 작업 가능 (AI 모더레이션 기록용)
CREATE POLICY "서비스 역할 모더레이션 로그 관리" ON moderation_logs
    FOR ALL USING (true) WITH CHECK (true);

-- 3. 비추천(dislike) 시스템
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS dislikes INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS post_dislikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_dislikes_post_id ON post_dislikes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_dislikes_user_id ON post_dislikes(user_id);

ALTER TABLE post_dislikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_dislikes_select_all" ON post_dislikes FOR SELECT USING (true);
CREATE POLICY "post_dislikes_insert_own" ON post_dislikes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_dislikes_delete_own" ON post_dislikes FOR DELETE USING (auth.uid() = user_id);

-- 4. 신고 누적 자동 숨김 트리거
CREATE OR REPLACE FUNCTION auto_hide_on_reports()
RETURNS TRIGGER AS $$
DECLARE
    report_count INTEGER;
    threshold INTEGER := 3;
BEGIN
    -- post 타입 신고만 처리
    IF NEW.target_type = 'post' AND NEW.status = 'pending' THEN
        -- 해당 게시글의 pending/reviewing 신고 수 카운트
        SELECT COUNT(*) INTO report_count
        FROM reports
        WHERE target_type = 'post'
          AND target_id = NEW.target_id
          AND status IN ('pending', 'reviewing');

        -- 임계값 이상이면 자동 숨김
        IF report_count >= threshold THEN
            -- 게시글 숨김
            UPDATE community_posts
            SET is_hidden = true,
                moderation_status = 'rejected',
                moderation_reason = '신고 ' || report_count || '건 누적 자동 숨김'
            WHERE id = NEW.target_id;

            -- 관련 신고들 자동 해결 처리
            UPDATE reports
            SET status = 'resolved',
                action_taken = 'content_removed',
                resolution_note = '신고 누적 자동 숨김 (' || report_count || '건)',
                resolved_at = NOW()
            WHERE target_type = 'post'
              AND target_id = NEW.target_id
              AND status IN ('pending', 'reviewing');

            -- 모더레이션 로그 기록
            INSERT INTO moderation_logs (post_id, filter_type, result, reason, details)
            VALUES (
                NEW.target_id,
                'report',
                'blocked',
                '신고 ' || report_count || '건 누적',
                jsonb_build_object(
                    'threshold', threshold,
                    'report_count', report_count,
                    'trigger_report_id', NEW.id
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS trigger_auto_hide_on_reports ON reports;

CREATE TRIGGER trigger_auto_hide_on_reports
    AFTER INSERT ON reports
    FOR EACH ROW
    EXECUTE FUNCTION auto_hide_on_reports();

-- 5. 댓글 좋아요/비추천 시스템
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS dislikes INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "comment_likes_select_all" ON comment_likes FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "comment_likes_insert_own" ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "comment_likes_delete_own" ON comment_likes FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS comment_dislikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_dislikes_comment ON comment_dislikes(comment_id);
ALTER TABLE comment_dislikes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "comment_dislikes_select_all" ON comment_dislikes FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "comment_dislikes_insert_own" ON comment_dislikes FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "comment_dislikes_delete_own" ON comment_dislikes FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
