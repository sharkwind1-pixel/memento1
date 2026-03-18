-- =============================================
-- point_transactions CHECK 제약조건 수정
-- 기존: points_earned > 0 (양수만 허용)
-- 변경: points_earned != 0 (0만 불허, 음수 허용)
--
-- 문제: 미니미/배경/상점 구매 시 음수 포인트(-200 등)를
-- 거래내역에 기록하려는데 CHECK 위반으로 INSERT 실패.
-- 배경 구매 API는 try-catch 없어서 500 에러 + 포인트 차감 안 됨.
-- =============================================

-- 1. 기존 CHECK 제약조건 삭제
ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_points_earned_check;

-- 2. 새 제약조건: 0이 아닌 값만 허용 (양수=적립, 음수=차감)
ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_points_earned_check CHECK (points_earned != 0);

-- 3. increment_user_points RPC도 음수 포인트를 넣을 수 있도록
-- (이미 SECURITY DEFINER라서 RLS 우회됨, CHECK만 문제였음)
-- → RPC 자체는 수정 불필요 (p_points가 양수로 들어옴)
