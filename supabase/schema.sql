-- ============================================
-- 메멘토애니 전체 DB 스키마
-- 최종 업데이트: 2026-02-19
-- ============================================
-- 이 파일 하나로 전체 DB 구조를 관리합니다.
-- 새 Supabase 프로젝트 셋업 시 이 파일만 실행하면 됩니다.
-- ============================================

-- ============================================
-- 0. 공통 유틸리티 함수
-- ============================================

-- updated_at 자동 업데이트 트리거 함수 (범용)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- 1. PROFILES (사용자 프로필)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nickname TEXT,
    avatar_url TEXT,

    -- 사용자 상태
    is_premium BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    is_banned BOOLEAN DEFAULT false,

    -- 프리미엄 구독 정보
    premium_started_at TIMESTAMPTZ,
    premium_expires_at TIMESTAMPTZ,
    premium_plan TEXT, -- 'monthly', 'yearly', 'lifetime', 'admin_grant'

    -- 차단 관련
    ban_reason TEXT,
    banned_at TIMESTAMPTZ,
    last_ip TEXT,

    -- 포인트 시스템
    points INTEGER DEFAULT 0,
    total_points_earned INTEGER DEFAULT 0,

    -- 온보딩 & 튜토리얼
    user_type TEXT, -- 'planning', 'current', 'memorial'
    onboarding_data JSONB,
    onboarding_completed_at TIMESTAMPTZ,
    tutorial_completed_at TIMESTAMPTZ,

    -- 활동 추적
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 포인트 랭킹 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_points_desc ON profiles(points DESC);

-- 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nickname)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. PETS (반려동물)
-- ============================================
CREATE TABLE IF NOT EXISTS pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- 기본 정보
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- '강아지', '고양이', '기타'
    breed TEXT,
    birthday DATE,
    gender TEXT, -- '남아', '여아'
    weight TEXT,
    personality TEXT,

    -- 프로필 이미지
    profile_image TEXT,
    profile_crop_position JSONB,

    -- AI 개인화 정보
    adopted_date DATE,
    how_we_met TEXT,
    nicknames TEXT,
    special_habits TEXT,
    favorite_food TEXT,
    favorite_activity TEXT,
    favorite_place TEXT,
    together_period TEXT,
    memorable_memory TEXT,

    -- 상태
    status TEXT DEFAULT 'active', -- 'active', 'memorial'
    memorial_date DATE,
    is_primary BOOLEAN DEFAULT false,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);

-- ============================================
-- 3. PET_MEDIA (반려동물 사진/영상)
-- ============================================
CREATE TABLE IF NOT EXISTS pet_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- 미디어 정보
    url TEXT NOT NULL,
    storage_path TEXT,
    type TEXT DEFAULT 'image', -- 'image', 'video'
    thumbnail_url TEXT,

    -- 메타데이터
    caption TEXT,
    date DATE,
    crop_position JSONB,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pet_media_pet_id ON pet_media(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_media_date ON pet_media(date DESC);

-- ============================================
-- 4. TIMELINE_ENTRIES (타임라인/일기)
-- ============================================
CREATE TABLE IF NOT EXISTS timeline_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- 내용
    date DATE NOT NULL,
    title TEXT,
    content TEXT,
    mood TEXT, -- 'happy', 'normal', 'sad', 'sick'
    media_ids UUID[],

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_pet_id ON timeline_entries(pet_id);
CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_entries(date DESC);

-- ============================================
-- 5. CHAT_MESSAGES (AI 채팅)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,

    -- 메시지
    role TEXT NOT NULL, -- 'user', 'assistant'
    content TEXT NOT NULL,

    -- 감정 분석
    emotion TEXT,
    emotion_score FLOAT,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_pet ON chat_messages(user_id, pet_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- ============================================
-- 6. PET_MEMORIES (AI 메모리)
-- ============================================
CREATE TABLE IF NOT EXISTS pet_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,

    -- 메모리 정보
    memory_type TEXT NOT NULL, -- 'preference', 'episode', 'health', 'personality', 'relationship', 'place', 'routine', 'schedule'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    importance INTEGER DEFAULT 5,
    time_info JSONB,
    source_message_id UUID REFERENCES chat_messages(id),

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pet_memories_pet_id ON pet_memories(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_memories_user_pet ON pet_memories(user_id, pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_memories_importance ON pet_memories(importance DESC);
CREATE INDEX IF NOT EXISTS idx_pet_memories_type ON pet_memories(memory_type);

-- pet_memories updated_at 트리거
CREATE TRIGGER update_pet_memories_updated_at
    BEFORE UPDATE ON pet_memories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. CHAT_SESSIONS (대화 세션)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    summary TEXT,
    dominant_emotion TEXT,
    message_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_pet ON chat_sessions(user_id, pet_id);

-- ============================================
-- 8. EMOTION_HISTORY (감정 히스토리)
-- ============================================
CREATE TABLE IF NOT EXISTS emotion_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    emotion TEXT NOT NULL,
    emotion_score FLOAT NOT NULL,
    context TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emotion_history_user_pet ON emotion_history(user_id, pet_id);

-- ============================================
-- 9. PET_REMINDERS (리마인더)
-- ============================================
CREATE TABLE IF NOT EXISTS pet_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,

    -- 리마인더 정보
    type TEXT NOT NULL, -- 'meal', 'walk', 'medicine', 'vaccine', 'grooming', 'vet', 'custom'
    title TEXT NOT NULL,
    description TEXT,

    -- 스케줄
    schedule_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'once'
    schedule_time TIME,
    schedule_day_of_week INTEGER, -- 0-6
    schedule_day_of_month INTEGER, -- 1-31
    schedule_date DATE,

    -- 상태
    enabled BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pet_reminders_user_id ON pet_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_reminders_pet_id ON pet_reminders(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_reminders_enabled ON pet_reminders(enabled);
CREATE INDEX IF NOT EXISTS idx_pet_reminders_time ON pet_reminders(schedule_time);

-- pet_reminders updated_at 트리거
CREATE OR REPLACE FUNCTION update_pet_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_pet_reminders_updated_at
    BEFORE UPDATE ON pet_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_pet_reminders_updated_at();

-- ============================================
-- 10. CONVERSATION_SUMMARIES (대화 요약)
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,

    -- 요약 정보
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    summary TEXT NOT NULL,
    key_topics TEXT[] DEFAULT '{}',
    emotional_tone TEXT,
    grief_progress TEXT, -- 추모 모드용 애도 단계
    emotional_moments TEXT[],
    important_mentions TEXT[] DEFAULT '{}',
    message_count INTEGER DEFAULT 0,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_pet_id ON conversation_summaries(user_id, pet_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_date ON conversation_summaries(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_pet_date ON conversation_summaries(pet_id, session_date DESC);

-- ============================================
-- 11. COMMUNITY_POSTS (커뮤니티 게시글)
-- ============================================
CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- 게시글 정보
    category TEXT NOT NULL, -- 'free', 'qna', 'tips', 'memorial', 'daily', 'health'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT,

    -- 통계
    views INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,

    -- 미디어
    image_urls TEXT[],

    -- 상태
    is_hidden BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_category ON community_posts(category);
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);

-- ============================================
-- 12. COMMUNITY_COMMENTS (댓글)
-- ============================================
CREATE TABLE IF NOT EXISTS community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- 댓글 정보
    content TEXT NOT NULL,
    author_name TEXT,

    -- 대댓글
    parent_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id);

-- ============================================
-- 13. COMMUNITY_LIKES (좋아요)
-- ============================================
CREATE TABLE IF NOT EXISTS community_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(post_id, user_id)
);

-- ============================================
-- 14. MEMORIAL_POSTS (추모 게시글)
-- ============================================
CREATE TABLE IF NOT EXISTS memorial_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,

    -- 게시글 정보
    title TEXT NOT NULL,
    content TEXT NOT NULL,

    -- 반려동물 정보 (pet 삭제 시에도 유지)
    pet_name TEXT,
    pet_type TEXT,
    pet_breed TEXT,
    pet_years TEXT, -- 예: "2015-2024"
    pet_image TEXT,

    -- 공개 설정
    is_public BOOLEAN DEFAULT true,

    -- 통계
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,

    -- 미디어
    image_urls TEXT[],

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memorial_posts_user_id ON memorial_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_memorial_posts_pet_id ON memorial_posts(pet_id);
CREATE INDEX IF NOT EXISTS idx_memorial_posts_created_at ON memorial_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memorial_posts_is_public ON memorial_posts(is_public) WHERE is_public = true;

-- ============================================
-- 15. MEMORIAL_COMMENTS (추모 댓글)
-- ============================================
CREATE TABLE IF NOT EXISTS memorial_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES memorial_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    content TEXT NOT NULL,
    author_name TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memorial_comments_post_id ON memorial_comments(post_id);

-- ============================================
-- 16. MEMORIAL_LIKES (추모 좋아요)
-- ============================================
CREATE TABLE IF NOT EXISTS memorial_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES memorial_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memorial_likes_post_id ON memorial_likes(post_id);

-- 추모 좋아요 카운트 트리거
CREATE OR REPLACE FUNCTION update_memorial_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE memorial_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE memorial_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_memorial_likes_count ON memorial_likes;
CREATE TRIGGER trigger_memorial_likes_count
    AFTER INSERT OR DELETE ON memorial_likes
    FOR EACH ROW EXECUTE FUNCTION update_memorial_likes_count();

-- 추모 댓글 카운트 트리거
CREATE OR REPLACE FUNCTION update_memorial_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE memorial_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE memorial_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_memorial_comments_count ON memorial_comments;
CREATE TRIGGER trigger_memorial_comments_count
    AFTER INSERT OR DELETE ON memorial_comments
    FOR EACH ROW EXECUTE FUNCTION update_memorial_comments_count();

-- ============================================
-- 17. PAYMENTS (결제 내역)
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 결제 정보
    amount INTEGER NOT NULL, -- 원화 (KRW)
    currency TEXT DEFAULT 'KRW',
    plan TEXT NOT NULL, -- 'monthly', 'yearly', 'lifetime'

    -- 포트원 연동 정보
    payment_id TEXT, -- 포트원 결제 고유 ID
    merchant_uid TEXT, -- 우리 서비스 주문번호
    imp_uid TEXT, -- 아임포트 결제 고유번호

    -- 상태
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'cancelled', 'refunded'

    -- 메타데이터
    metadata JSONB DEFAULT '{}',

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_merchant_uid ON payments(merchant_uid);

-- ============================================
-- 18. SUBSCRIPTIONS (구독 내역)
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 구독 정보
    plan TEXT NOT NULL, -- 'monthly', 'yearly', 'lifetime', 'admin_grant'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'paused'

    -- 기간
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL이면 무기한 (lifetime, admin_grant)
    cancelled_at TIMESTAMPTZ,

    -- 결제 연동
    last_payment_id UUID REFERENCES payments(id),

    -- 관리자 부여인 경우
    granted_by UUID REFERENCES auth.users(id),
    grant_reason TEXT,

    -- 메타데이터
    metadata JSONB DEFAULT '{}',

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);

-- ============================================
-- 19. MESSAGES (유저간 쪽지)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    -- 삭제 처리 (보낸 사람/받은 사람 각각 삭제 가능)
    sender_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    receiver_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(receiver_id, is_read) WHERE is_read = FALSE;

-- 쪽지 목록에서 닉네임 표시용 뷰
CREATE OR REPLACE VIEW messages_with_profiles AS
SELECT
    m.*,
    sp.nickname AS sender_nickname,
    sp.email AS sender_email,
    rp.nickname AS receiver_nickname,
    rp.email AS receiver_email
FROM messages m
LEFT JOIN profiles sp ON m.sender_id = sp.id
LEFT JOIN profiles rp ON m.receiver_id = rp.id;

-- ============================================
-- 20. REPORTS (신고 시스템)
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 신고자 정보
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 신고 대상
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'user', 'pet_memorial')),
    target_id UUID NOT NULL,

    -- 신고 내용
    reason TEXT NOT NULL CHECK (reason IN (
        'spam',           -- 스팸/광고
        'abuse',          -- 욕설/비방
        'inappropriate',  -- 부적절한 콘텐츠
        'harassment',     -- 괴롭힘
        'misinformation', -- 허위정보
        'copyright',      -- 저작권 침해
        'other'           -- 기타
    )),
    description TEXT,

    -- 처리 상태
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',   -- 대기 중
        'reviewing', -- 검토 중
        'resolved',  -- 처리 완료
        'rejected'   -- 반려
    )),

    -- 처리 결과
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_note TEXT,
    action_taken TEXT CHECK (action_taken IN (
        'none',
        'warning',
        'content_removed',
        'user_warned',
        'user_suspended',
        'user_banned'
    )),

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

-- 중복 신고 방지 (같은 사용자가 같은 대상을 여러번 신고 못하게)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique ON reports(reporter_id, target_type, target_id)
WHERE status IN ('pending', 'reviewing');

-- 신고 사유 한글 매핑 함수
CREATE OR REPLACE FUNCTION get_report_reason_label(reason TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE reason
        WHEN 'spam' THEN '스팸/광고'
        WHEN 'abuse' THEN '욕설/비방'
        WHEN 'inappropriate' THEN '부적절한 콘텐츠'
        WHEN 'harassment' THEN '괴롭힘'
        WHEN 'misinformation' THEN '허위정보'
        WHEN 'copyright' THEN '저작권 침해'
        WHEN 'other' THEN '기타'
        ELSE reason
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- 신고 통계 함수 (관리자용)
CREATE OR REPLACE FUNCTION get_report_stats()
RETURNS TABLE (
    total_count BIGINT,
    pending_count BIGINT,
    resolved_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_count,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_count,
        COUNT(*) FILTER (WHERE resolved_at >= CURRENT_DATE)::BIGINT AS resolved_today
    FROM reports;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- reports updated_at 트리거
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS reports_updated_at ON reports;
CREATE TRIGGER reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_updated_at();

-- ============================================
-- 21. SUPPORT_INQUIRIES (문의사항)
-- ============================================
CREATE TABLE IF NOT EXISTS support_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('question', 'report', 'suggestion')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
    admin_response TEXT,
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_inquiries_user_id ON support_inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_category ON support_inquiries(category);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_status ON support_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_created_at ON support_inquiries(created_at DESC);

-- support_inquiries updated_at 트리거
CREATE OR REPLACE FUNCTION update_support_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_support_inquiries_updated_at
    BEFORE UPDATE ON support_inquiries
    FOR EACH ROW
    EXECUTE FUNCTION update_support_inquiries_updated_at();

-- ============================================
-- 22. DELETED_ACCOUNTS (삭제 계정 보관)
-- ============================================
CREATE TABLE IF NOT EXISTS deleted_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 원본 계정 정보
    original_user_id UUID NOT NULL,
    email TEXT NOT NULL,
    nickname TEXT,

    -- 사용량 통계 (재가입 시 참고용)
    total_ai_usage INTEGER DEFAULT 0,
    total_pets_created INTEGER DEFAULT 0,
    total_photos_uploaded INTEGER DEFAULT 0,
    was_premium BOOLEAN DEFAULT FALSE,

    -- 탈퇴 관련
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    deletion_reason TEXT,

    -- 재가입 제한
    rejoin_allowed_after TIMESTAMPTZ,
    rejoin_cooldown_days INTEGER DEFAULT 30,

    -- 재가입 시 사용
    rejoined_at TIMESTAMPTZ,
    new_user_id UUID,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email ON deleted_accounts(email);
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_deleted_at ON deleted_accounts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_rejoin ON deleted_accounts(rejoin_allowed_after);

-- 삭제 계정 확인 함수
CREATE OR REPLACE FUNCTION check_deleted_account(check_email TEXT)
RETURNS TABLE (
    can_rejoin BOOLEAN,
    days_until_rejoin INTEGER,
    previous_ai_usage INTEGER,
    was_premium BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (da.rejoin_allowed_after <= NOW()) AS can_rejoin,
        GREATEST(0, EXTRACT(DAY FROM da.rejoin_allowed_after - NOW())::INTEGER) AS days_until_rejoin,
        da.total_ai_usage AS previous_ai_usage,
        da.was_premium
    FROM deleted_accounts da
    WHERE da.email = check_email
      AND da.rejoined_at IS NULL
    ORDER BY da.deleted_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 계정 삭제 시 호출할 함수
CREATE OR REPLACE FUNCTION save_deleted_account(
    p_user_id UUID,
    p_email TEXT,
    p_nickname TEXT,
    p_ai_usage INTEGER DEFAULT 0,
    p_pets_count INTEGER DEFAULT 0,
    p_photos_count INTEGER DEFAULT 0,
    p_was_premium BOOLEAN DEFAULT FALSE,
    p_reason TEXT DEFAULT NULL,
    p_cooldown_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO deleted_accounts (
        original_user_id,
        email,
        nickname,
        total_ai_usage,
        total_pets_created,
        total_photos_uploaded,
        was_premium,
        deletion_reason,
        rejoin_allowed_after,
        rejoin_cooldown_days
    ) VALUES (
        p_user_id,
        p_email,
        p_nickname,
        p_ai_usage,
        p_pets_count,
        p_photos_count,
        p_was_premium,
        p_reason,
        NOW() + (p_cooldown_days || ' days')::INTERVAL,
        p_cooldown_days
    )
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 재가입 시 호출할 함수 (이전 기록 연결)
CREATE OR REPLACE FUNCTION mark_account_rejoined(
    p_email TEXT,
    p_new_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE deleted_accounts
    SET
        rejoined_at = NOW(),
        new_user_id = p_new_user_id
    WHERE email = p_email
      AND rejoined_at IS NULL
      AND rejoin_allowed_after <= NOW();

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- 23. WITHDRAWN_USERS (탈퇴 유형별 관리)
-- ============================================
CREATE TABLE IF NOT EXISTS withdrawn_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT NOT NULL,
    nickname TEXT,
    ip_address TEXT,
    withdrawal_type TEXT NOT NULL CHECK (withdrawal_type IN ('abuse_concern', 'banned', 'error_resolution')),
    withdrawn_at TIMESTAMPTZ DEFAULT NOW(),
    rejoin_allowed_at TIMESTAMPTZ,
    reason TEXT,
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawn_users_email ON withdrawn_users(email);
CREATE INDEX IF NOT EXISTS idx_withdrawn_users_ip ON withdrawn_users(ip_address);
CREATE INDEX IF NOT EXISTS idx_withdrawn_users_type ON withdrawn_users(withdrawal_type);

-- 재가입 가능 여부 확인 함수
CREATE OR REPLACE FUNCTION can_rejoin(check_email TEXT, check_ip TEXT DEFAULT NULL)
RETURNS TABLE (
    can_join BOOLEAN,
    block_reason TEXT,
    wait_until TIMESTAMPTZ
) AS $$
DECLARE
    banned_record RECORD;
BEGIN
    -- 영구 차단 확인 (이메일)
    SELECT * INTO banned_record FROM withdrawn_users
    WHERE email = check_email AND withdrawal_type = 'banned'
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT false, '영구 차단된 계정입니다.'::TEXT, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- 영구 차단 확인 (IP)
    IF check_ip IS NOT NULL THEN
        SELECT * INTO banned_record FROM withdrawn_users
        WHERE ip_address = check_ip AND withdrawal_type = 'banned'
        LIMIT 1;

        IF FOUND THEN
            RETURN QUERY SELECT false, '차단된 IP입니다.'::TEXT, NULL::TIMESTAMPTZ;
            RETURN;
        END IF;
    END IF;

    -- 30일 대기 확인
    SELECT * INTO banned_record FROM withdrawn_users
    WHERE email = check_email
      AND withdrawal_type = 'abuse_concern'
      AND rejoin_allowed_at > NOW()
    ORDER BY withdrawn_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT false, '재가입 대기 기간입니다.'::TEXT, banned_record.rejoin_allowed_at;
        RETURN;
    END IF;

    -- 가입 가능
    RETURN QUERY SELECT true, NULL::TEXT, NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- 24. POINT_TRANSACTIONS (포인트 거래 내역)
-- ============================================
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    points_earned INTEGER NOT NULL CHECK (points_earned > 0),
    metadata JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user_created
    ON point_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_daily_cap
    ON point_transactions(user_id, action_type, (created_at::date));

-- ============================================
-- 포인트 시스템 함수들
-- ============================================

-- 포인트 적립 RPC 함수 (원자적 처리)
CREATE OR REPLACE FUNCTION increment_user_points(
    p_user_id UUID,
    p_action_type VARCHAR(50),
    p_points INTEGER,
    p_daily_cap INTEGER DEFAULT NULL,
    p_one_time BOOLEAN DEFAULT FALSE,
    p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today_count INTEGER;
    v_new_points INTEGER;
    v_new_total INTEGER;
BEGIN
    -- 일회성 활동 중복 체크
    IF p_one_time THEN
        SELECT COUNT(*) INTO v_today_count
        FROM point_transactions
        WHERE user_id = p_user_id
          AND action_type = p_action_type;

        IF v_today_count > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'reason', 'already_earned',
                'points', (SELECT points FROM profiles WHERE id = p_user_id)
            );
        END IF;
    END IF;

    -- 일일 cap 체크
    IF p_daily_cap IS NOT NULL THEN
        SELECT COUNT(*) INTO v_today_count
        FROM point_transactions
        WHERE user_id = p_user_id
          AND action_type = p_action_type
          AND created_at::date = CURRENT_DATE;

        IF v_today_count >= p_daily_cap THEN
            RETURN jsonb_build_object(
                'success', false,
                'reason', 'daily_cap_reached',
                'points', (SELECT points FROM profiles WHERE id = p_user_id)
            );
        END IF;
    END IF;

    -- 포인트 증가 (원자적)
    UPDATE profiles
    SET points = points + p_points,
        total_points_earned = total_points_earned + p_points
    WHERE id = p_user_id
    RETURNING points, total_points_earned INTO v_new_points, v_new_total;

    -- 트랜잭션 기록
    INSERT INTO point_transactions (user_id, action_type, points_earned, metadata)
    VALUES (p_user_id, p_action_type, p_points, p_metadata);

    RETURN jsonb_build_object(
        'success', true,
        'points', v_new_points,
        'total_earned', v_new_total,
        'earned', p_points
    );
END;
$$;

-- 일일 출석 체크 전용 함수
CREATE OR REPLACE FUNCTION daily_login_check(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN increment_user_points(
        p_user_id := p_user_id,
        p_action_type := 'daily_login',
        p_points := 10,
        p_daily_cap := 1,
        p_one_time := false,
        p_metadata := jsonb_build_object('date', CURRENT_DATE)
    );
END;
$$;

-- 사용자 포인트 + 랭킹 조회 함수
CREATE OR REPLACE FUNCTION get_user_points_with_rank(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_points INTEGER;
    v_total INTEGER;
    v_rank BIGINT;
BEGIN
    SELECT points, total_points_earned
    INTO v_points, v_total
    FROM profiles
    WHERE id = p_user_id;

    IF v_points IS NULL THEN
        RETURN jsonb_build_object('error', 'user_not_found');
    END IF;

    -- 랭킹 계산 (동점자 동일 순위)
    SELECT COUNT(*) + 1 INTO v_rank
    FROM profiles
    WHERE points > v_points;

    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'points', v_points,
        'total_earned', v_total,
        'rank', v_rank
    );
END;
$$;

-- ============================================
-- 프리미엄 시스템 함수들
-- ============================================

-- 프리미엄 상태 확인 함수
CREATE OR REPLACE FUNCTION check_premium_status(p_user_id UUID)
RETURNS TABLE (
    is_premium BOOLEAN,
    plan TEXT,
    expires_at TIMESTAMPTZ,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN p.premium_expires_at IS NULL AND p.is_premium = true THEN true
            WHEN p.premium_expires_at > NOW() THEN true
            ELSE false
        END as is_premium,
        p.premium_plan as plan,
        p.premium_expires_at as expires_at,
        CASE
            WHEN p.premium_expires_at IS NULL THEN NULL
            ELSE EXTRACT(DAY FROM (p.premium_expires_at - NOW()))::INTEGER
        END as days_remaining
    FROM profiles p
    WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 프리미엄 부여 함수 (관리자용)
CREATE OR REPLACE FUNCTION grant_premium(
    p_user_id UUID,
    p_plan TEXT,
    p_duration_days INTEGER DEFAULT NULL,
    p_granted_by UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- 만료일 계산
    IF p_duration_days IS NOT NULL AND p_duration_days > 0 THEN
        v_expires_at := NOW() + (p_duration_days || ' days')::INTERVAL;
    ELSE
        v_expires_at := NULL; -- 무기한
    END IF;

    -- profiles 업데이트
    UPDATE profiles
    SET
        is_premium = true,
        premium_started_at = COALESCE(premium_started_at, NOW()),
        premium_expires_at = v_expires_at,
        premium_plan = p_plan
    WHERE id = p_user_id;

    -- subscriptions에 기록
    INSERT INTO subscriptions (
        user_id, plan, status, started_at, expires_at,
        granted_by, grant_reason
    ) VALUES (
        p_user_id, p_plan, 'active', NOW(), v_expires_at,
        p_granted_by, p_reason
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 프리미엄 해제 함수
CREATE OR REPLACE FUNCTION revoke_premium(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- profiles 업데이트
    UPDATE profiles
    SET
        is_premium = false,
        premium_expires_at = NOW(),
        premium_plan = NULL
    WHERE id = p_user_id;

    -- 활성 구독 취소
    UPDATE subscriptions
    SET
        status = 'cancelled',
        cancelled_at = NOW()
    WHERE user_id = p_user_id AND status = 'active';

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 만료된 프리미엄 자동 해제 함수 (크론잡용)
CREATE OR REPLACE FUNCTION expire_premium_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- 만료된 프리미엄 해제
    WITH expired AS (
        UPDATE profiles
        SET is_premium = false
        WHERE is_premium = true
          AND premium_expires_at IS NOT NULL
          AND premium_expires_at < NOW()
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM expired;

    -- 구독 상태도 업데이트
    UPDATE subscriptions
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- 관리자 함수
-- ============================================

-- 관리자 권한 토글 함수
CREATE OR REPLACE FUNCTION toggle_admin(
    p_target_user_id UUID,
    p_is_admin BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
    -- 호출자가 관리자인지 확인
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: caller is not an admin';
    END IF;

    -- 자기 자신의 관리자 권한은 해제할 수 없음 (안전장치)
    IF p_target_user_id = auth.uid() AND p_is_admin = false THEN
        RAISE EXCEPTION 'Cannot revoke your own admin status';
    END IF;

    UPDATE profiles
    SET is_admin = p_is_admin
    WHERE id = p_target_user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- RLS (Row Level Security) 정책
-- ============================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND is_admin = true
        )
    );

-- Pets
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pets" ON pets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pets" ON pets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pets" ON pets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pets" ON pets
    FOR DELETE USING (auth.uid() = user_id);

-- Pet Media
ALTER TABLE pet_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media" ON pet_media
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media" ON pet_media
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media" ON pet_media
    FOR DELETE USING (auth.uid() = user_id);

-- Timeline
ALTER TABLE timeline_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own timeline" ON timeline_entries
    FOR ALL USING (auth.uid() = user_id);

-- Chat Messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own messages" ON chat_messages
    FOR ALL USING (auth.uid() = user_id);

-- Pet Memories
ALTER TABLE pet_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own memories" ON pet_memories
    FOR ALL USING (auth.uid() = user_id);

-- Chat Sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chat_sessions" ON chat_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Emotion History
ALTER TABLE emotion_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own emotion_history" ON emotion_history
    FOR ALL USING (auth.uid() = user_id);

-- Reminders
ALTER TABLE pet_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminders" ON pet_reminders
    FOR ALL USING (auth.uid() = user_id);

-- Conversation Summaries
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own summaries" ON conversation_summaries
    FOR ALL USING (auth.uid() = user_id);

-- Community Posts
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view posts" ON community_posts
    FOR SELECT USING (NOT is_hidden);

CREATE POLICY "Users can insert own posts" ON community_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON community_posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON community_posts
    FOR DELETE USING (auth.uid() = user_id);

-- Community Comments
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON community_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert comments" ON community_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON community_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Community Likes
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON community_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own likes" ON community_likes
    FOR ALL USING (auth.uid() = user_id);

-- Memorial Posts
ALTER TABLE memorial_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public memorial posts are viewable" ON memorial_posts
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own memorial posts" ON memorial_posts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memorial posts" ON memorial_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memorial posts" ON memorial_posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memorial posts" ON memorial_posts
    FOR DELETE USING (auth.uid() = user_id);

-- Memorial Comments
ALTER TABLE memorial_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view memorial comments" ON memorial_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert memorial comments" ON memorial_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memorial comments" ON memorial_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Memorial Likes
ALTER TABLE memorial_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view memorial likes" ON memorial_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert memorial likes" ON memorial_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memorial likes" ON memorial_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payments" ON payments
    FOR ALL USING (auth.role() = 'service_role');

-- Subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Messages (쪽지)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender can view own sent messages" ON messages
    FOR SELECT USING (auth.uid() = sender_id AND sender_deleted = FALSE);

CREATE POLICY "Receiver can view own received messages" ON messages
    FOR SELECT USING (auth.uid() = receiver_id AND receiver_deleted = FALSE);

CREATE POLICY "Authenticated users can send messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receiver can mark as read" ON messages
    FOR UPDATE USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "Sender can delete own messages" ON messages
    FOR UPDATE USING (auth.uid() = sender_id)
    WITH CHECK (auth.uid() = sender_id);

-- Reports (신고)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can manage all reports" ON reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.email IN ('sharkwind1@gmail.com')
        )
    );

-- Support Inquiries (문의사항)
ALTER TABLE support_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inquiries" ON support_inquiries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create inquiries" ON support_inquiries
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage all inquiries" ON support_inquiries
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Deleted Accounts (관리자만 접근)
ALTER TABLE deleted_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access" ON deleted_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.email IN ('sharkwind1@gmail.com')
        )
    );

-- Withdrawn Users (관리자만 접근)
ALTER TABLE withdrawn_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view withdrawn users" ON withdrawn_users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can insert withdrawn users" ON withdrawn_users
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can update withdrawn users" ON withdrawn_users
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can delete withdrawn users" ON withdrawn_users
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Point Transactions (포인트 내역)
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own point transactions" ON point_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only server can insert point transactions" ON point_transactions
    FOR INSERT WITH CHECK (false);

-- ============================================
-- Storage Buckets
-- ============================================
-- Supabase Dashboard에서 생성 필요:
-- 1. pet-media (public)
-- 2. community-images (public)
-- 3. memorial-images (public)

-- ============================================
-- 테이블 코멘트
-- ============================================
COMMENT ON TABLE pet_reminders IS '반려동물 케어 리마인더 (산책, 식사, 약 등)';
COMMENT ON COLUMN pet_reminders.type IS '리마인더 타입: walk, meal, medicine, vaccine, grooming, vet, custom';
COMMENT ON COLUMN pet_reminders.schedule_type IS '반복 타입: daily, weekly, monthly, once';
COMMENT ON TABLE messages IS '유저간 쪽지(DM) 테이블';
COMMENT ON COLUMN messages.sender_deleted IS '보낸 사람이 삭제했는지 여부';
COMMENT ON COLUMN messages.receiver_deleted IS '받은 사람이 삭제했는지 여부';
COMMENT ON TABLE reports IS '신고 시스템 - 게시물/댓글/회원 신고 관리';
COMMENT ON TABLE support_inquiries IS '질문/신고/건의사항 문의 테이블';
COMMENT ON COLUMN support_inquiries.category IS 'question: 질문, report: 신고, suggestion: 건의사항';
COMMENT ON COLUMN support_inquiries.status IS 'pending: 대기중, in_progress: 처리중, resolved: 해결됨, closed: 종료';
COMMENT ON TABLE deleted_accounts IS '탈퇴 계정 보관 - 재가입 악용 방지용';
COMMENT ON TABLE withdrawn_users IS '탈퇴 유저 관리 테이블 - 재가입 제한, IP 차단 등';
COMMENT ON COLUMN withdrawn_users.withdrawal_type IS 'abuse_concern: 30일 대기, banned: 영구차단, error_resolution: 즉시 가능';
COMMENT ON COLUMN profiles.premium_started_at IS '프리미엄 시작일';
COMMENT ON COLUMN profiles.premium_expires_at IS '프리미엄 만료일 (NULL이면 무기한)';
COMMENT ON COLUMN profiles.premium_plan IS '구독 플랜: monthly, yearly, lifetime, admin_grant';

-- ============================================
-- 25. MAGAZINE_ARTICLES (펫매거진 기사)
-- ============================================
CREATE TABLE IF NOT EXISTS magazine_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    category TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    content TEXT,
    author TEXT NOT NULL,
    author_role TEXT,

    image_url TEXT,
    image_storage_path TEXT,

    read_time TEXT,
    badge TEXT,
    tags TEXT[] DEFAULT '{}',

    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,

    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magazine_articles_status ON magazine_articles(status);
CREATE INDEX IF NOT EXISTS idx_magazine_articles_category ON magazine_articles(category);
CREATE INDEX IF NOT EXISTS idx_magazine_articles_created_at ON magazine_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_magazine_articles_published_at ON magazine_articles(published_at DESC);

CREATE TRIGGER update_magazine_articles_updated_at
    BEFORE UPDATE ON magazine_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE magazine_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published articles" ON magazine_articles
    FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can view all articles" ON magazine_articles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can insert articles" ON magazine_articles
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can update articles" ON magazine_articles
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can delete articles" ON magazine_articles
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );

COMMENT ON TABLE magazine_articles IS '펫매거진 기사 - 관리자가 작성/관리';

-- ============================================
-- 초기 관리자 설정 (필요시)
-- ============================================
-- UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';
