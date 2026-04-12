-- 신규 가입 시 자동 환영 메시지 발송 트리거
-- profiles INSERT 시 notifications에 welcome 알림 자동 생성
-- dedup_key로 중복 방지 (유저당 1회만)

CREATE OR REPLACE FUNCTION send_welcome_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, body, metadata, dedup_key)
    VALUES (
        NEW.id,
        'welcome',
        '메멘토애니에 오신 것을 환영합니다',
        '안녕하세요, 메멘토애니에 가입해주셔서 감사합니다.' || chr(10) || chr(10) ||
        '메멘토애니는 반려동물과 함께하는 모든 순간을 기록하고, 이별 후에도 따뜻한 추억을 간직할 수 있도록 만든 공간입니다.' || chr(10) || chr(10) ||
        '우리는 반려동물과의 시간이 단순한 일상이 아니라, 삶에서 가장 빛나는 순간이라고 믿습니다. 그래서 그 순간들을 소중하게 기록하고, 언제든 다시 꺼내볼 수 있도록 이곳을 만들었습니다.' || chr(10) || chr(10) ||
        '시작하는 방법은 간단해요:' || chr(10) ||
        '1. 내 기록 탭에서 반려동물을 등록해주세요' || chr(10) ||
        '2. 사진과 일상을 타임라인에 남겨보세요' || chr(10) ||
        '3. AI 펫톡에서 우리 아이와 대화해보세요' || chr(10) || chr(10) ||
        '궁금한 점이 있으면 언제든 문의해주세요. 따뜻한 하루 되세요.',
        '{"source": "auto_welcome"}'::jsonb,
        'welcome_' || NEW.id
    )
    ON CONFLICT (user_id, dedup_key) WHERE dedup_key IS NOT NULL
    DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_profile_welcome ON profiles;

CREATE TRIGGER on_new_profile_welcome
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION send_welcome_notification();
