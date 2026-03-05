# 마이그레이션 실행 상태

> RELAY.md의 미실행 마이그레이션 목록 기준으로 작성 (2026-03-06)
> `[x]` = 실행됨, `[ ]` = 미실행 (Supabase SQL Editor에서 실행 필요)

## 초기 스키마 (번호 prefix)

- [x] `001_ai_chat_tables.sql`
- [x] `002_chat_agent.sql`
- [x] `002_community_alignment.sql`
- [x] `002_pets_and_media.sql`
- [x] `003_community_images.sql`
- [x] `003_memorial_posts.sql`
- [x] `004_conversation_summaries.sql`
- [x] `004_lost_pets.sql`
- [x] `005_local_posts.sql`
- [x] `005_memorial_tables.sql`
- [x] `006_tutorial_completed.sql`

## 날짜 prefix 마이그레이션

- [x] `20240215_pet_reminders.sql`
- [x] `20250210_premium_system.sql`
- [x] `20250210_withdrawal_system.sql`
- [x] `20260206_messages.sql`
- [x] `20260206_support_inquiries.sql`
- [x] `20260209_deleted_accounts.sql`
- [x] `20260209_reports.sql`
- [x] `20260211_points_system.sql`
- [x] `20260212_admin_update_policy.sql`
- [x] `20260219_security_fixes.sql`
- [x] `20260222_fix_equipped_minimi_type.sql`
- [x] `20260222_minimi_system.sql` -- 2026-03-06 실행 완료
- [x] `20260222_placed_minimi.sql` -- 2026-03-06 실행 완료
- [x] `20260224_user_daily_usage.sql`
- [x] `20260225_hourly_cron_pgcron.sql`
- [x] `20260225_push_preferred_hour.sql` -- 2026-03-06 실행 완료
- [x] `20260225_push_subscriptions.sql`
- [x] `20260226_chat_mode_column.sql` -- 2026-03-06 실행 완료
- [x] `20260226_memory_albums.sql` -- 2026-03-06 실행 완료
- [x] `20260226_security_fixes.sql` -- 2026-03-06 실행 완료
- [x] `20260227_magazine_cron.sql`
- [x] `20260301_all_pending.sql`
- [x] `20260301_consent_columns.sql`
- [x] `20260301_user_blocks.sql` -- 2026-03-06 실행 완료
- [x] `20260303_fix_admin_rls.sql`
- [x] `20260304_add_is_hidden_to_posts.sql` -- 2026-03-06 실행 완료
- [x] `20260304_add_video_url_to_posts.sql` -- 2026-03-06 실행 완료
- [x] `20260304_video_generations.sql` -- 2026-03-06 실행 완료
- [x] `20260305_community_region.sql`
- [x] `20260305_magazine_check_cron.sql`
- [x] `20260305_simple_mode.sql` -- 2026-03-06 실행 완료
- [x] `20260306_protect_sensitive_columns.sql` -- 2026-03-06 실행 완료
