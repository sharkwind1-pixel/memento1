-- 유저간 쪽지 테이블
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(receiver_id, is_read) WHERE is_read = FALSE;

-- RLS (Row Level Security) 활성화
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 정책: 보낸 사람은 자신이 보낸 쪽지 조회 가능 (삭제 안 한 것만)
CREATE POLICY "Sender can view own sent messages" ON messages
    FOR SELECT
    USING (auth.uid() = sender_id AND sender_deleted = FALSE);

-- 정책: 받은 사람은 받은 쪽지 조회 가능 (삭제 안 한 것만)
CREATE POLICY "Receiver can view own received messages" ON messages
    FOR SELECT
    USING (auth.uid() = receiver_id AND receiver_deleted = FALSE);

-- 정책: 로그인한 유저는 쪽지 작성 가능
CREATE POLICY "Authenticated users can send messages" ON messages
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- 정책: 받은 사람은 읽음 처리 가능
CREATE POLICY "Receiver can mark as read" ON messages
    FOR UPDATE
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

-- 정책: 보낸 사람은 삭제 처리 가능
CREATE POLICY "Sender can delete own messages" ON messages
    FOR UPDATE
    USING (auth.uid() = sender_id)
    WITH CHECK (auth.uid() = sender_id);

-- 유저 프로필 정보를 위한 뷰 (쪽지 목록에서 닉네임 표시용)
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

-- 코멘트
COMMENT ON TABLE messages IS '유저간 쪽지(DM) 테이블';
COMMENT ON COLUMN messages.sender_deleted IS '보낸 사람이 삭제했는지 여부';
COMMENT ON COLUMN messages.receiver_deleted IS '받은 사람이 삭제했는지 여부';
