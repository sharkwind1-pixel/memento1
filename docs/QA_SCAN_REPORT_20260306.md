# 메멘토애니 전체 코드베이스 QA 스캔 보고서

> 작성일: 2026-03-06
> 스캔 방식: 6개 병렬 에이전트 (프론트엔드, 백엔드, 보안, 타입/상태관리, 다크모드/UI, 에러처리/성능)
> 스캔 범위: src/ 전체 (pages, features, common, modals, contexts, lib, types, api, config)

---

## 요약

| 등급 | 건수 | 설명 |
|------|------|------|
| CRITICAL | 7 | 보안 취약점, 데이터 손실 위험, hydration 에러 |
| MAJOR | 15 | 기능 오작동, UX 결함, 에러 누락 |
| P0 다크모드 | 5개 파일 | 전체 다크모드 미대응 |
| MINOR | 15+ | UI 불일치, 코드 품질 |

---

## CRITICAL (즉시 수정 필요) — 7건

### C-1. SECURITY DEFINER RPC IDOR 취약점
- **위치**: `purchase_minimi_item`, `sell_minimi_item`, `increment_user_points` RPC 함수
- **문제**: SECURITY DEFINER 함수가 `auth.uid() = p_user_id` 검증 없이 파라미터를 그대로 신뢰
- **위험**: 공격자가 다른 유저의 p_user_id를 넣으면 포인트 조작/아이템 탈취 가능
- **수정**: 함수 시작부에 `IF auth.uid() != p_user_id THEN RAISE EXCEPTION 'Unauthorized';` 추가
- **우선순위**: 즉시 (보안)

### C-2. CSP unsafe-eval + unsafe-inline 허용
- **위치**: `src/middleware.ts` (Content-Security-Policy 헤더)
- **문제**: `script-src 'unsafe-eval' 'unsafe-inline'` → XSS 공격 시 방어벽 없음
- **위험**: 악성 스크립트 삽입 시 유저 세션 탈취 가능
- **수정**: nonce 기반 CSP로 전환, 최소한 unsafe-eval 제거
- **우선순위**: 높음 (보안)

### C-3. JWT Claim 스푸핑 가능한 트리거
- **위치**: `protect_sensitive_profile_columns` 트리거 (SQL)
- **문제**: `current_setting('request.jwt.claims', true)::json->>'role'` 체크 — 클라이언트가 JWT claim 조작 가능
- **위험**: 일반 유저가 관리자 role claim을 주입하여 보호 컬럼 수정
- **수정**: `current_setting('role')` 또는 `auth.jwt()->>'role'` 사용
- **우선순위**: 즉시 (보안)

### C-4. Hydration Mismatch (Math.random)
- **위치**: `MemorialSwitchModal.tsx:438-449`, `ExportChatCard.tsx`
- **문제**: 컴포넌트 렌더링 시 Math.random() 호출 → SSR과 CSR 결과 불일치
- **증상**: React hydration 에러, 콘솔 경고, 간헐적 UI 깨짐
- **수정**: useEffect 내부에서 Math.random() 실행하거나 고정 seed/인덱스 사용

### C-5. setTimeout/setInterval 미정리 (메모리 누수)
- **위치**: `MinihompyStage.tsx:236`, `useHomePage.ts`
- **문제**: setTimeout/setInterval을 설정하지만 컴포넌트 언마운트 시 cleanup 없음
- **증상**: 페이지 이동 후에도 타이머 계속 실행, 메모리 누수
- **수정**: useEffect return에서 clearTimeout/clearInterval

### C-6. AuthContext refreshProfile/refreshPoints 에러 삼킴
- **위치**: `AuthContext.tsx:280` (refreshProfile), `AuthContext.tsx:302` (refreshPoints)
- **문제**: catch 블록이 에러를 조용히 삼킴 (console.error 없음)
- **증상**: 프로필/포인트 로드 실패 시 유저는 0원/미인증 상태로 보이며 원인 파악 불가
- **수정**: catch 블록에 console.error 추가 + 재시도 로직 또는 에러 상태 표시

### C-7. PetContext 펫 로드 실패 무로깅
- **위치**: `PetContext.tsx:252`
- **문제**: 반려동물 데이터 로드 실패 시 로그 없이 빈 배열 반환
- **증상**: "반려동물이 없습니다" 표시되지만 실제로는 네트워크 에러
- **수정**: catch 블록에 console.error + toast.error("데이터를 불러오지 못했습니다")

---

## MAJOR (빠른 수정 권장) — 15건

### M-1. record-ip/route.ts fail-open 패턴
- **위치**: `src/app/api/record-ip/route.ts`
- **문제**: IP 기록 실패 시 `{ allowed: true }` 반환 → 차단된 유저도 통과
- **수정**: fail-closed (`{ allowed: false }`) 또는 에러 전파

### M-2. admin/delete-user/route.ts RLS 문제
- **위치**: `src/app/api/admin/delete-user/route.ts`
- **문제**: anon key로 타인 프로필 삭제 시도 → RLS가 차단하지만 코드 의도와 불일치
- **수정**: service_role key 사용 (관리자 인증 후)

### M-3. increment_field RPC 남용 가능
- **위치**: `increment_field` RPC 함수
- **문제**: 테이블명, 필드명을 파라미터로 받아 dynamic SQL 실행
- **위험**: 허용되지 않은 테이블/필드의 값을 임의 증가 가능
- **수정**: 허용 테이블/필드 화이트리스트 추가

### M-4. Naver OAuth O(N) 유저 순회
- **위치**: Naver OAuth 콜백의 `findUserByEmail`
- **문제**: 전체 유저를 순회하며 이메일 매칭 → 유저 증가 시 성능 저하
- **수정**: DB index + `.eq('email', email).single()` 또는 `.limit(1)`

### M-5. 인메모리 Rate Limiting
- **위치**: `src/lib/rate-limit.ts`
- **문제**: Vercel 서버리스 환경에서 인메모리 Map 기반 rate limit → cold start마다 리셋
- **수정**: Vercel KV, Upstash Redis, 또는 Supabase DB 기반으로 전환

### M-6. 12개 모달 body scroll lock 미적용
- **위치**: PetFormModal, PhotoViewer, MediaUploadModal, DeleteConfirmModal, TimelineSection, MemorialSwitchModal, PointsShopModal, SupportModal, MinimiShopModal, MinimiClosetModal, VideoResultModal, VideoGenerateModal
- **문제**: 모달 오픈 시 배경 스크롤 가능 → 모바일에서 UX 문제
- **수정**: `useBodyScrollLock` 커스텀 훅 만들어 일괄 적용

### M-7. 6개 모달 ESC 키 닫기 미지원
- **위치**: PhotoViewer, MediaUploadModal, DeleteConfirmModal 외 3개
- **문제**: ESC 키로 모달 닫기 불가 → 접근성 위반
- **수정**: `onKeyDown` 핸들러 추가 또는 Radix Dialog 사용

### M-8. PostDetailView alert() 사용
- **위치**: `PostDetailView.tsx:215,255,273,302`
- **문제**: `alert()` 4곳 사용 → 네이티브 알림으로 앱 느낌 깨짐
- **수정**: `toast.error()` / `toast.success()`로 교체

### M-9. agent.ts 6개 bare catch 블록
- **위치**: `src/lib/agent.ts` 전체
- **문제**: catch 블록에서 console.error 없이 에러 삼킴
- **증상**: AI 펫톡 기능 오류 시 원인 추적 불가
- **수정**: 모든 catch에 console.error 추가

### M-10. RichTextEditor 이미지 업로드 .catch() 누락
- **위치**: `RichTextEditor.tsx` (이미지 업로드 .then() 체인)
- **문제**: .catch() 없음 → 업로드 실패 시 UI가 "uploading..." 상태에 영구 고착
- **수정**: .catch() 추가 + uploading 상태 false로 리셋

### M-11. useAdminData console.error 주석 처리
- **위치**: `useAdminData.ts:143,186`
- **문제**: console.error가 주석 처리되어 관리자 데이터 로드 실패 원인 파악 불가
- **수정**: 주석 해제

### M-12. MemorialPost 타입 3중 정의
- **위치**: `types/index.ts`, `memorialService.ts`, 기타 1곳
- **문제**: 서로 다른 구조로 정의되어 타입 불일치 가능
- **수정**: types/index.ts로 통합, 나머지에서 import

### M-13. TimelineEntry 타입 3중 정의
- **위치**: `types/index.ts`, `TimelineSection.tsx`, `RecordPage.tsx`
- **문제**: 동일
- **수정**: types/index.ts로 통합

### M-14. localStorage 무검증 캐스팅
- **위치**: `CommunityPage.tsx` (`as PostTag`), `AdminPage.tsx` (`as AdminTab`)
- **문제**: localStorage에서 읽은 값을 타입 검증 없이 캐스팅 → 잘못된 값이면 런타임 에러
- **수정**: 허용 값 목록 체크 후 캐스팅

### M-15. point_transactions RLS INSERT 정책 누락
- **위치**: `point_transactions` 테이블
- **문제**: INSERT 정책이 없어서 클라이언트에서 포인트 트랜잭션 기록 불가
- **수정**: `INSERT WITH CHECK (auth.uid() = user_id)` 정책 추가

---

## P0 다크모드 미대응 — 5개 파일

| # | 파일 | 미대응 요소 | 예상 라인 수 |
|---|------|----------|------------|
| 1 | `RemindersPage.tsx` | bg-white, text-gray-*, border-gray-* 고정 | 25+ |
| 2 | `AdminPage.tsx` | 관리자 페이지 전체 흰색 고정 | 12+ |
| 3 | `MemoryAlbumViewer.tsx` | 앨범 뷰어 배경/텍스트 | 10+ |
| 4 | `VideoGenerationSection.tsx` | AI 영상 생성 섹션 전체 | 16+ |
| 5 | `RemindersSection.tsx` | RecordPage 내 리마인더 섹션 | 20+ |

### P1 다크모드 부분 갭 (10+개 컴포넌트)
- admin 관련 모달 3개
- ErrorBoundary
- PawLoading
- PostDetailView 배지 영역
- LandingPage 요금제 카드
- PostModal
- ProfileTab

---

## UI 일관성 이슈

| 항목 | 현재 상태 | 권장 |
|------|----------|------|
| z-index | 9999, 50, 100, 40 혼재 | 계층별 상수 정의 |
| 모달 rounded | rounded-2xl / rounded-xl 혼재 | rounded-2xl 통일 |
| 그라데이션 | from-blue-50 / from-memento-50 혼재 | from-memento-50 통일 |
| 다크모드 방식 | 인라인 isDark vs Tailwind dark: 혼재 | Tailwind dark: 통일 |

---

## 수정 우선순위 제안

### Phase 1: 보안 (즉시)
1. C-1 RPC IDOR 수정 (SQL만 변경)
2. C-3 JWT 트리거 수정 (SQL만 변경)
3. M-1 fail-open → fail-closed
4. M-3 increment_field 화이트리스트

### Phase 2: 안정성 (1-2일)
5. C-4 hydration mismatch 수정
6. C-5 타이머 cleanup
7. C-6, C-7 에러 로깅 추가
8. M-9 agent.ts bare catch 수정
9. M-10 RichTextEditor .catch() 추가
10. M-11 console.error 주석 해제

### Phase 3: UX 개선 (3-5일)
11. M-6 body scroll lock 일괄 적용
12. M-8 alert() → toast 교체
13. P0 다크모드 5개 파일 수정
14. UI 일관성 (z-index, rounded, 그라데이션)

### Phase 4: 아키텍처 (MVP 이후)
15. C-2 CSP 개선
16. M-4 Naver OAuth 성능
17. M-5 Rate Limiting 인프라
18. M-12~14 타입 정리

---

## 부록: 스캔 에이전트별 원본 결과 ID

| 에이전트 | Task ID |
|---------|---------|
| 프론트엔드 컴포넌트 | a8d6867 |
| 백엔드 API 라우트 | a429d6a |
| 보안 취약점 | a501f19 |
| 타입/상태관리 | acde497 |
| 다크모드/UI | a68bc0a |
| 에러처리/성능 | afe9ece |
