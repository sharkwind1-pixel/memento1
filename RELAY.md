# 릴레이

> **이 파일 = "지금 뭘 해야 하는지"만.** 50줄 이내 유지.
> 완료된 기능/과거 기록 → `RELAY-ARCHIVE.md`
> 프로젝트 규칙/구조/컨벤션 → `CLAUDE.md`
> 클로드가 자동 기억하는 것 → `~/.claude/projects/.../memory/MEMORY.md`

---

## 미실행 마이그레이션 — Supabase SQL Editor에서 실행

> 모든 파일은 `supabase/migrations/` 기준. 상세 상태는 `supabase/migrations/_STATUS.md` 참조.

| 파일 | 영향 | 긴급도 |
|------|------|--------|
| `20260226_chat_mode_column.sql` | 추모/일상 대화 분리 (안 하면 섞임) | 즉시 |
| `20260226_security_fixes.sql` | 미니미 RPC + 펫/사진 제한 트리거 | 즉시 |
| `20260225_push_preferred_hour.sql` | 푸시 시간 선택 | 즉시 |
| `20260222_placed_minimi.sql` | 멀티 미니미 배치 | 즉시 |
| `20260222_minimi_system.sql` | 미니미 구매/되팔기 (이미 실행됐을 수 있음) | 확인 |
| `20260226_memory_albums.sql` | 추억 앨범 테이블 | 즉시 |
| `20260304_video_generations.sql` | AI 영상 생성 테이블 + RLS + 인덱스 | 즉시 |
| `20260304_add_video_url_to_posts.sql` | community_posts에 video_url 컬럼 | 즉시 |
| `20260304_add_is_hidden_to_posts.sql` | community_posts에 is_hidden 컬럼 | 즉시 |
| `20260301_user_blocks.sql` | 유저 차단 기능 (테이블 + RLS + 인덱스) | 즉시 |
| `20260305_simple_mode.sql` | profiles에 is_simple_mode 컬럼 (간편모드) | 즉시 |
| `20260306_protect_sensitive_columns.sql` | **[CRITICAL 보안]** profiles 민감 컬럼(is_admin, is_premium, points 등) 일반 유저 변경 차단 트리거. 미실행 시 아무 유저나 관리자/프리미엄 자가 승격 가능 | **최우선** |

---

## TODO

### 1. 결제 연동 (포트원) — 승빈님 계정 필요
- `PremiumModal.tsx`의 "준비 중" → 포트원 결제창 호출
- 환경변수: `PORTONE_API_KEY`, `PORTONE_API_SECRET`, `NEXT_PUBLIC_PORTONE_STORE_ID`
- 상세 구현 가이드 → RELAY-ARCHIVE.md "결제 연동" 섹션

### 2. AI 영상 생성 — 승빈님 설정 필요
- Storage `videos` 버킷 생성 + 환경변수 `FAL_KEY`, `VIDEO_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`
- 코드는 완료, DB 마이그레이션 + 환경변수만 남음

### 3. 모바일 깜빡임 — 실기기 확인
- React.memo 적용 완료 (`e3aa66f`), 아이폰/안드로이드 테스트 필요

### 4. RLS 정책 수정 — 카카오 관리자 로그인
- `reports`, `deleted_accounts` 테이블 RLS가 이메일 하드코딩 → `is_admin = true`로 변경 필요
- 상세 SQL → `.claude/plans/iterative-inventing-rabbit.md`

### 5. 간편모드 구현 — 플랜 승인됨
- 플랜 파일: `.claude/plans/unified-scribbling-knuth.md`
- DB: `is_simple_mode` 컬럼 (마이그레이션 위 목록에 등록됨)
- 구현: AuthContext + SimpleHomeLauncher + HomePage 분기 + Layout 폰트 확대 + Sidebar 토글

### [완료] 관리자 대시보드 모바일 compact UX
- 6개 탭 전부 완료 (대시보드/유저/문의/신고/탈퇴/매거진)
- shadcn Button → 네이티브 `<button>` 통일 (gap/svg override 문제)
- 패턴: h-7 text-[10px], flex-1 필터, p-3 카드, truncate 이메일
- HEAD: `064b496` (angry-haibt + main 동기화)
