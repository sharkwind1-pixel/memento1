# 릴레이

> **이 파일 = "지금 뭘 해야 하는지"만.** 50줄 이내 유지.
> 완료된 기능/과거 기록 → `RELAY-ARCHIVE.md`
> 프로젝트 규칙/구조/컨벤션 → `CLAUDE.md`
> 클로드가 자동 기억하는 것 → `~/.claude/projects/.../memory/MEMORY.md`

---

## 🚨 긴급: 회원 관리 시스템 수정 (진행 중 — 2026-03-12)

> **이전 세션에서 8개 커밋 작업 완료, 테스트 진행 중**
> 상세 기록: `docs/SESSION_20260312_MEMBER_SYSTEM.md`

### 완료된 수정사항 (8개 커밋, main 배포 완료)
1. `00b3be3` AuthContext 차단 체크 타이밍 — setUser/setSession을 차단 체크 후로 이동
2. `65b64d7` 회원 탈퇴/차단 시스템 — 중복 레코드 방지 (delete all → insert)
3. `3f5df4f` can_rejoin RPC — 최신 레코드(created_at DESC LIMIT 1) 기준 판정
4. `93958ca` delete-user API — withdrawalType 파라미터 수용 (하드코딩 banned 제거)
5. `1d74f90` allow-rejoin API 신규 — RLS 우회 서버 API (재가입 허용 버튼용)
6. `6e112fe` 재가입 유저 온보딩 리셋 — 닉네임 NULL + localStorage 클리어
7. `7995783`+`4a6d709` Realtime + visibilitychange — 탈퇴/차단 즉시 전 기기 로그아웃
8. `72acabc` 온보딩 리셋 RLS 우회 — has_record(RPC) + 자동닉네임 감지 폴백

### 실행 완료된 SQL
- `can_rejoin` RPC v2 (has_record 필드 추가, DROP 후 CREATE)
- `ALTER PUBLICATION supabase_realtime ADD TABLE withdrawn_users`

### ⚠️ 현재 테스트 중인 문제
- **재가입 후 닉네임 설정 모달이 안 뜨는 문제**: 코드+SQL 모두 배포/실행 완료. 도진 계정(dojin3497@gmail.com) 프로필은 nickname=null, onboarding_completed_at=null로 리셋됨. 로그인 테스트 필요.
- **핵심 로직**: AuthContext SIGNED_IN → can_rejoin RPC(has_record) → 온보딩 미완료 + (has_record 또는 자동닉네임) → nickname NULL 리셋 → NicknameSetupModal 표시

### 테스트 계정 현황
| 이메일 | withdrawn_users 최신 | can_join | profiles nickname |
|--------|---------------------|----------|-------------------|
| dojin3497@gmail.com | error_resolution | true | null (리셋됨) |
| ahaadh@hanmail.net | error_resolution | true | (profiles 없음) |

### 수정된 핵심 파일
- `src/contexts/AuthContext.tsx` — SIGNED_IN/INITIAL_SESSION 차단체크, Realtime, visibilitychange, 온보딩 리셋
- `src/app/api/admin/delete-user/route.ts` — withdrawalType 파라미터 수용
- `src/app/api/admin/allow-rejoin/route.ts` — 신규 API (재가입 허용)
- `src/app/api/admin/block-email/route.ts` — delete all + insert banned
- `src/components/pages/AdminPage.tsx` — processWithdrawal: API에 type/reason 전달 (프론트 INSERT 제거)
- `src/components/admin/tabs/AdminWithdrawalsTab.tsx` — allowRejoin: allow-rejoin API 호출로 전환
- `supabase/migrations/20260312_can_rejoin_v2.sql` — has_record 필드 추가
- `supabase/migrations/20260312_realtime_withdrawn_users.sql` — Realtime 활성화

---

## TODO (기존)

### 1. 결제 연동 (포트원) — 승빈님 계정 필요
### 2. AI 영상 생성 — 승빈님 설정 필요
### 3. 모바일 깜빡임 — 실기기 확인
### 4. RLS 정책 수정 — 카카오 관리자 로그인
### 5. QA 스캔 잔여 이슈 — `docs/QA_SCAN_REPORT_20260306.md`
