-- 20260418_post_author_pet
-- community_posts에 author_pet_id 컬럼 추가 — 작성자의 반려동물을 연결.
--
-- 목적: 커뮤니티 글에 작성자가 어느 반려동물의 이야기인지 명시할 수 있도록.
-- 같은 보호자가 여러 반려동물을 키우는 경우 유저가 헷갈리지 않게 식별 가능.
-- 종 평등 원칙 반영 — 펫이 1마리든, 햄스터든 파충류든 이야기의 주인공으로 노출됨.
--
-- 삭제 정책: 펫이 삭제되면 SET NULL (게시글은 유지, 단지 연결만 끊김).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'community_posts' AND column_name = 'author_pet_id'
    ) THEN
        ALTER TABLE public.community_posts
        ADD COLUMN author_pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 인덱스: 특정 펫의 게시글만 모아 보여줄 때 효율 (미니홈피 등)
CREATE INDEX IF NOT EXISTS idx_community_posts_author_pet_id
    ON public.community_posts(author_pet_id)
    WHERE author_pet_id IS NOT NULL;
