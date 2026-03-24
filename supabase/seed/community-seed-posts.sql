-- 커뮤니티 시딩 공지글 (각 게시판별 1개)
-- 실행 방법: Supabase 대시보드 > SQL Editor에서 실행
-- 주의: admin_user_id를 실제 관리자 계정 UUID로 교체해야 함

-- 1단계: 관리자 UUID 조회
-- SELECT id, email FROM auth.users WHERE email = 'sharkwind1@gmail.com';
-- 아래 쿼리에서 반환된 id를 admin_user_id로 사용

DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- 관리자 UUID 자동 조회
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'sharkwind1@gmail.com' LIMIT 1;

    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION '관리자 계정을 찾을 수 없습니다 (sharkwind1@gmail.com)';
    END IF;

    -- ============================================
    -- 1. 자유게시판 공지
    -- ============================================
    INSERT INTO posts (user_id, board_type, badge, title, content, author_name, is_pinned, notice_scope, likes, comments, created_at)
    VALUES (
        admin_user_id,
        'free',
        '공지',
        '메멘토애니 자유게시판에 오신 것을 환영합니다',
        '안녕하세요, 메멘토애니입니다.

이곳은 반려동물과 함께하는 일상을 자유롭게 나누는 공간입니다.

[이런 글을 올려주세요]
- 반려동물과의 일상 이야기
- 케어 팁이나 유용한 정보
- 궁금한 점이나 고민 상담
- 자랑하고 싶은 순간들

[지켜주세요]
- 서로를 존중하는 따뜻한 말
- 광고, 도배, 비방 글은 삭제될 수 있습니다
- 의료 관련 내용은 반드시 수의사와 상담하세요

함께 따뜻한 커뮤니티를 만들어가요.',
        '메멘토애니',
        true,
        'board',
        0, 0,
        NOW()
    )
    ON CONFLICT DO NOTHING;

    -- ============================================
    -- 2. 기억게시판 공지 (추모)
    -- ============================================
    INSERT INTO posts (user_id, board_type, badge, title, content, author_name, is_pinned, notice_scope, likes, comments, created_at)
    VALUES (
        admin_user_id,
        'memorial',
        '공지',
        '기억게시판 안내 - 함께했던 소중한 기억을 나눠주세요',
        '이곳은 무지개다리를 건넌 소중한 가족을 기억하고, 서로 위로하는 공간입니다.

[이런 이야기를 나눠주세요]
- 함께했던 따뜻한 추억
- 보고 싶은 마음을 담은 편지
- 서로에게 건네는 위로의 말

[함께 지켜주세요]
- 모든 이별은 소중합니다. 비교하거나 평가하지 않아요
- "동물인데 뭘" 같은 표현은 삼가주세요
- 슬픔의 크기는 누구도 판단할 수 없습니다

여기서 나누는 모든 이야기가 서로에게 따뜻한 위로가 되길 바랍니다.',
        '메멘토애니',
        true,
        'board',
        0, 0,
        NOW()
    )
    ON CONFLICT DO NOTHING;

    -- ============================================
    -- 3. 입양정보 게시판 공지
    -- ============================================
    INSERT INTO posts (user_id, board_type, badge, title, content, author_name, is_pinned, notice_scope, likes, comments, created_at)
    VALUES (
        admin_user_id,
        'adoption',
        '공지',
        '입양정보 게시판 이용 안내',
        '새로운 가족을 기다리는 친구들을 위한 공간입니다.

[이런 글을 올려주세요]
- 입양 가능한 동물 정보 (보호소, 개인 구조 등)
- 입양 후기 및 경험담
- 입양 전 준비사항, 비용 안내
- 임시보호 관련 정보

[주의사항]
- 반려동물 판매/분양 목적의 글은 금지입니다
- 입양 시 책임감 있는 결정을 부탁드립니다
- 허위 정보 게시 시 삭제 및 제재됩니다

입양정보 탭에서 전국 유기동물 보호소 정보도 확인할 수 있습니다.',
        '메멘토애니',
        true,
        'board',
        0, 0,
        NOW()
    )
    ON CONFLICT DO NOTHING;

    -- ============================================
    -- 4. 지역정보 게시판 공지
    -- ============================================
    INSERT INTO posts (user_id, board_type, badge, title, content, author_name, is_pinned, notice_scope, likes, comments, created_at)
    VALUES (
        admin_user_id,
        'local',
        '공지',
        '지역정보 게시판 이용 안내',
        '우리 동네 반려동물 관련 정보를 나누는 공간입니다.

[이런 글을 올려주세요]
- 동물병원 추천/후기
- 반려동물 동반 카페, 식당 정보
- 산책로, 공원 추천
- 펫샵, 미용실 정보
- 동네 반려동물 모임

[지역 표시 방법]
- 글 작성 시 지역을 선택하면 같은 지역 분들이 쉽게 찾을 수 있어요
- 구체적인 위치는 본문에 적어주세요

우리 동네 숨은 명소를 공유해주세요.',
        '메멘토애니',
        true,
        'board',
        0, 0,
        NOW()
    )
    ON CONFLICT DO NOTHING;

    -- ============================================
    -- 5. 분실동물 게시판 공지
    -- ============================================
    INSERT INTO posts (user_id, board_type, badge, title, content, author_name, is_pinned, notice_scope, likes, comments, created_at)
    VALUES (
        admin_user_id,
        'lost',
        '공지',
        '분실동물 게시판 이용 안내 - 꼭 읽어주세요',
        '실종된 반려동물을 찾거나, 발견한 동물을 알리는 공간입니다.

[실종 신고 시 꼭 포함해주세요]
- 실종 날짜와 시간
- 실종 장소 (최대한 구체적으로)
- 반려동물 사진 (최근 사진)
- 특징 (색상, 크기, 옷, 목줄, 인식표 등)
- 연락처

[발견 신고 시]
- 발견 장소와 시간
- 동물 사진
- 현재 보호 상황
- 연락처

[유용한 팁]
- 실종 즉시 주변 동물병원, 보호소에 연락하세요
- 동물등록번호가 있으면 동물보호관리시스템(animal.go.kr)에 신고하세요
- SNS 공유를 통해 더 많은 분들에게 알려주세요

모든 아이들이 무사히 집으로 돌아오길 바랍니다.',
        '메멘토애니',
        true,
        'board',
        0, 0,
        NOW()
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '5개 게시판 공지글 시딩 완료';
END $$;
