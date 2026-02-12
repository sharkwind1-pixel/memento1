-- =============================================
-- 포인트 시스템 마이그레이션
-- 메멘토애니 Phase 1.2: FM코리아 스타일 활동 포인트
-- =============================================

-- 1. profiles 테이블에 포인트 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0;

-- 포인트 기반 랭킹 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_points_desc ON profiles(points DESC);

-- 2. 포인트 거래 내역 테이블
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    points_earned INTEGER NOT NULL CHECK (points_earned > 0),
    metadata JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: 내역 조회용 (user별 최신순)
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_created
    ON point_transactions(user_id, created_at DESC);

-- 인덱스: 일일 cap 체크용 (user + action + 날짜)
CREATE INDEX IF NOT EXISTS idx_point_transactions_daily_cap
    ON point_transactions(user_id, action_type, (created_at::date));

-- 3. RLS 정책
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인 거래 내역만 조회 가능
CREATE POLICY "Users can read own point transactions"
    ON point_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- 삽입은 서버(SECURITY DEFINER 함수)를 통해서만
CREATE POLICY "Only server can insert point transactions"
    ON point_transactions FOR INSERT
    WITH CHECK (false);

-- 4. 포인트 적립 RPC 함수 (원자적 처리)
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

-- 5. 일일 출석 체크 전용 함수 (간편 호출)
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

-- 6. 사용자 포인트 + 랭킹 조회 함수
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
