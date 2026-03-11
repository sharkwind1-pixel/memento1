# 2026-03-12 회원 관리 시스템 전면 수정 세션 기록

## 발단
- 올릭 계정(ahaadh@hanmail.net): 관리자가 밴했는데 OAuth로 재로그인 가능
- 도진 계정(dojin3497@gmail.com): 자기 탈퇴했는데 포인트/아이콘만 리셋되고 로그인 가능
- 승빈님: "회원 관리 전체적으로 엉망"

---

## 발견된 버그 + 수정 내역 (8개 커밋)

### 1. AuthContext 타이밍 (`00b3be3`)
**버그**: onAuthStateChange에서 setUser()/setSession()/setLoading(false)을 차단 체크 **전에** 호출
**수정**: SIGNED_IN, INITIAL_SESSION 모두 차단 체크 완료 후에만 상태 설정

### 2. withdrawn_users 중복 레코드 (`65b64d7`)
**버그**: 같은 이메일에 여러 타입 레코드가 쌓여서 판정이 꼬임
**수정**: delete-user, delete-account, block-email API 모두 "기존 레코드 전부 DELETE → 새로 INSERT" 패턴

### 3. can_rejoin RPC 로직 (`3f5df4f`)
**버그**: banned, abuse_concern, error_resolution을 각각 독립 체크하여 타입간 충돌
**수정**: 최신 레코드(created_at DESC LIMIT 1) 1개로만 판정

### 4. delete-user API 하드코딩 (`93958ca`)
**버그**: AdminPage(프론트)에서 올바른 type으로 withdrawn_users INSERT → delete-user API가 전부 DELETE하고 무조건 "banned"로 덮어씀
**원인**: 프론트와 API 양쪽에서 withdrawn_users를 건드리는 이중 처리
**수정**:
- API: withdrawalType 파라미터 수용 (기본값 banned 유지)
- AdminPage: 프론트 INSERT 제거, API에 type/reason 전달 (단일 책임)

### 5. 재가입 허용 버튼 RLS (`1d74f90`)
**버그**: AdminWithdrawalsTab에서 supabase(anon key)로 withdrawn_users INSERT → RLS 차단 → 버튼 안 먹음
**수정**: `/api/admin/allow-rejoin` 신규 API (service_role로 RLS 우회)

### 6. 재가입 유저 온보딩 스킵 (`6e112fe`)
**버그**: 재가입 시 handle_new_user 트리거가 이메일 앞부분을 닉네임으로 자동 설정 → NicknameSetupModal 안 뜸. localStorage에 온보딩 플래그 잔존 → 온보딩도 스킵
**수정**: AuthContext SIGNED_IN에서 withdrawn_users 기록 있고 온보딩 미완료면 닉네임 NULL 리셋 + localStorage 클리어

### 7. 다른 기기 세션 유지 (`7995783`, `4a6d709`)
**버그**: 데스크톱에서 탈퇴 처리해도 모바일에서 기존 세션으로 계속 로그인 상태
**수정**:
- Realtime: withdrawn_users INSERT 구독 → 즉시 로그아웃
- visibilitychange: 탭 복귀 시 can_rejoin 재체크 (이중 안전장치)
- SQL: `ALTER PUBLICATION supabase_realtime ADD TABLE withdrawn_users`

### 8. 온보딩 리셋 RLS 우회 (`72acabc`)
**버그**: #6의 수정에서 withdrawn_users를 anon key로 SELECT → RLS 차단 → 빈 배열 → 리셋 안 됨
**수정**:
- can_rejoin RPC v2: `has_record` 필드 추가 (SECURITY DEFINER로 RLS 우회)
- 폴백: 닉네임이 이메일 앞부분과 동일하면 자동생성으로 판단
- SQL: DROP FUNCTION → CREATE FUNCTION (반환 타입 변경이라 DROP 필수)

---

## 현재 상태 (세션 종료 시점)

### DB
- can_rejoin RPC v2 실행 완료 (has_record 필드 포함)
- Realtime publication에 withdrawn_users 추가 완료
- 도진 계정 profiles: nickname=null, onboarding_completed_at=null
- 두 테스트 계정 모두 can_join=true (error_resolution 최신)

### 코드
- 8개 커밋 모두 angry-haibt + main 동기화 완료
- Vercel 자동 배포 (main push)

### 미확인 사항
- **재가입 후 닉네임 설정 모달이 실제로 뜨는지 로그인 테스트 필요**
- page.tsx의 checkNewUserFlow: `!profileData.nickname` → NicknameSetupModal 표시 조건이 만족되는지
- Realtime 구독이 실제로 동작하는지 (withdrawn_users INSERT 시 즉시 로그아웃)

---

## withdrawn_users 시스템 설계 (최종)

### 3가지 타입
| 타입 | 의미 | can_join | 용도 |
|------|------|---------|------|
| `error_resolution` | 관리자 재가입 허용 | true | 테스트 계정 삭제, 오류 해결용 탈퇴 |
| `abuse_concern` | 악용 우려 | 조건부 (rejoin_allowed_at 이후) | 일반 탈퇴 (30일 대기) |
| `banned` | 영구 차단 | false | 악성 유저 영구 차단 |

### 판정 로직 (can_rejoin RPC)
```
해당 이메일의 최신 레코드 (created_at DESC LIMIT 1) 조회
→ 레코드 없음: can_join=true, has_record=false
→ error_resolution: can_join=true, has_record=true
→ banned: can_join=false, has_record=true
→ abuse_concern + rejoin_allowed_at > NOW(): can_join=false (대기중)
→ abuse_concern + rejoin_allowed_at <= NOW(): can_join=true (만료)
```

### 차단 체크 시점 (4중 방어)
1. **SIGNED_IN**: 로그인 시 can_rejoin + is_banned 체크
2. **INITIAL_SESSION**: 페이지 새로고침 시 동일 체크
3. **Realtime**: withdrawn_users INSERT 즉시 감지 → 로그아웃
4. **visibilitychange**: 탭 복귀 시 can_rejoin 재체크

### API 구조
| API | 용도 | withdrawn_users 처리 |
|-----|------|---------------------|
| `/api/admin/delete-user` | 관리자 유저 삭제 | DELETE all → INSERT (type은 프론트에서 전달) |
| `/api/admin/block-email` | 이메일 차단 | DELETE all → INSERT banned |
| `/api/admin/allow-rejoin` | 재가입 허용 | INSERT error_resolution (기존 유지) |
| `/api/auth/delete-account` | 유저 자기 탈퇴 | DELETE all → INSERT abuse_concern (30일) |

---

## 브랜치 정보
- 작업 브랜치: `angry-haibt`
- 프로덕션: `main`
- Vercel 배포 브랜치: `main` (자동 배포)
- worktree: `/Users/admin/.claude-worktrees/memento1/angry-haibt`
- main worktree: `/Users/admin/memento1`
- **주의**: angry-haibt에서 main checkout 불가 (worktree 충돌). main worktree에서 merge해야 함.
