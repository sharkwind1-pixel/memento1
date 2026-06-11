---
name: audit
description: 전 코드베이스 DB-grounded 전수 감사. 코드만 읽는 리뷰가 원리적으로 못 잡는 silent 결함(권한 ACL·죽은 기능·RLS·미실행 마이그·stale 데이터)을 prod DB와 강제 대조해 캐낸다. "전체 검수", "전수 감사", "코드리뷰 다", "리팩토링 점검", "/audit", 주기 점검 시 사용. 일반 기능 PR 리뷰가 아니라 코드베이스 전체 건강검진용.
---

# Audit — DB-grounded 전 코드베이스 전수 감사

> 배경(2026-06-11 교훈): "전체 검수" 수백 번 시켰는데 RPC 권한 노출·포인트 적립 4개월 사망·가격 18,900 잔존이 안 잡힘.
> 이유 = **이전 검수는 "코드 읽기"였고 prod까지 안 내려감.** 마이그 파일엔 `REVOKE`라 적혀 있으니 코드만 보면 "잠김"으로 믿는다. 진실은 `pg_proc` ACL을 직접 쿼리해야 보인다.
> **이 스킬의 단 하나의 원칙: 코드와 live prod 상태를 강제로 대조한다.** 코드 읽기 리뷰가 아님.

## 0. 트리거 판별
- "전체/전수 검수", "리팩토링·코드리뷰 다 해라", "건강검진", 주기 감사 → 이 스킬.
- 단일 PR/기능 리뷰 → 이 스킬 아님(`/code-review` 또는 9번 적대검증).

## 1. 6영역 병렬 검수 (에이전트 fan-out)
영역별 검수 에이전트를 띄운다. **각 에이전트는 발견·보고만(수정 절대 금지).** 수정은 취합 후 메인이 high-confidence만.

> ⚠️ **세션 토큰 한도 주의**: 6개 동시에 띄우면 한도로 전멸한 적 있음(2026-06-10 실증). **3개씩 2배치**로 나눠 띄우고, 각 프롬프트에 "토큰 절약: grep으로 후보 좁히고 후보만 부분 Read, 중간 출력 최소화, 최종 보고만 상세" 명시.

| 영역 | 범위 | 핵심 수색 |
|---|---|---|
| **A. API 라우트** | `src/app/api/**` | 세션클라 RLS silent fail, read-then-write race, admin 권한 이중검증 누락, 공개 POST rate-limit 부재. **결제·포인트는 정독.** |
| **B. 웹 컴포넌트** | `src/components/**`,`contexts/`,`hooks/` | plain `fetch(`→authFetch(Bearer 누락→게스트 취급), useEffect 부수효과 중복실행, 낙관 롤백 누락, 모달 스크롤 금지조합, 타입 중앙화 위반 |
| **C. 모바일+패리티** | `mobile/**`(node_modules 제외) | 게스트 silent return, "Bearer null", 응답 필드 불일치, **웹↔앱 패리티 갭**, console.log 잔존 |
| **D. lib/AI/cron** | `src/lib/**`,`api/chat/*`,`api/cron/**` | supabase fetch 캐싱(no-store 누락), 편향 로직(`% N`·`sort(()=>random-0.5)`), 비용가드 누락, RETURNS TABLE/SETOF 미언랩, KST(+9h) 불일치, 추모 톤 위반, cron 멱등/이중발사 |
| **E. DB↔코드** | prod 대조 | **이 영역이 핵심.** 아래 2번 참조. |
| **F. 컨벤션/설정/고아** | 전역 | vercel.json cron 패턴, tsconfig mobile 제외, CSP, **하드코딩 가격/한도(constants.ts 미참조)**, 고아 파일(`check-import-graph.ts`), 이모지, 서버 env 클라 노출 |

## 2. E영역 = DB-grounded 대조 (스킬의 심장)
Supabase MCP `execute_sql`(읽기 전용 SELECT만, project_id는 RELAY/CLAUDE.md 참조)로 **코드가 가정하는 것 vs prod 실제**를 대조한다. 코드만 읽으면 절대 안 보이는 것들:

1. **RPC 권한 ACL** — `SELECT proname, has_function_privilege('anon',oid,'EXECUTE'), proacl FROM pg_proc ...`. SECURITY DEFINER 함수가 anon/authenticated/PUBLIC에 열려 있나? 마이그 파일이 REVOKE라 적혀 있어도 **PUBLIC grant 잔존 시 no-op**(2026-05-11 실증). `grant_premium`·`increment_user_points`·`purchase_*`·`sell_*` 등 금전 RPC 필수.
2. **죽은 기능(실데이터)** — 코드는 멀쩡한데 prod에서 안 돌고 있나? 예: `point_transactions`에서 action_type별 마지막 적립일·건수 집계 → 0건이거나 수개월 전이면 silent 사망(awardPoints가 잘못된 오버로드 호출 실증, 4개월 죽음).
3. **미실행 마이그레이션** — `supabase/migrations/*.sql`이 만드는 객체(컬럼/함수/정책/인덱스)가 prod에 실재하나? 파일만 있고 prod엔 없으면 미실행(save_deleted_account 9-param 실증).
4. **RPC 시그니처 불일치** — 코드 `.rpc("이름",{파라미터})` vs `pg_proc` 실제 파라미터명/타입. 오타=silent 404.
5. **세션클라 RLS-코드 가정** — 코드가 세션(createServerSupabase) 클라로 타인 행 UPDATE/INSERT(카운터·집계)하는데 그 테이블 cmd RLS가 owner-only면 **조용히 0행**(minihompy visit/like 카운터 영원히 0 실증).
6. **컬럼 타입 불일치**(slug↔uuid), **CHECK 제약 위반 가능 코드**, **트리거 중복 바인딩**, **자주 .eq/.order 컬럼 인덱스 부재**.

## 3. 적대 프레이밍
"잘 됐나"가 아니라 **"어디가 조용히 죽어/열려 있나"**로 수색. 각 에이전트에 이 코드베이스의 실제 반복 결함 패턴(위 표 + 2번)을 우선 수색하도록 명시 — 추상적 "버그 찾아라"보다 패턴 표적이 훨씬 잘 잡힌다.

## 4. 취합 → 수정 → 검증
1. 6개 보고 취합, 심각도(Critical/High/Med/Low) 정렬. 중복 제거.
2. **High-confidence만 수정**(추정/논쟁성은 RELAY 후순위로). 수정은 영역별 수정 에이전트에 위임 가능(파일 비겹침 보장, src/만 또는 mobile/만 명시).
3. **웹+앱 패리티**: 한쪽 고치면 `docs/PARITY.md` 대응 파일 확인.
4. 검증: 웹 `npx tsc --noEmit`+`npm run build`, 모바일 `cd mobile && npx tsc`. **DB 변경/광범위 변경은 9번 적대 재검증 필수**(수정이 결함을 실제로 닫았는지·회귀 없는지). 재검증이 추가 결함 잡으면 반영.
5. **DB 마이그는 MCP apply_migration으로 prod 적용 + 적용 후 실측**(파일 작성만으론 "완료" 아님). 리포에 `supabase/migrations/YYYYMMDD_*.sql` 기록.

## 5. 커밋 + 기록
- **영역별로 커밋 분리**(security/points, web, ai-cron, pricing…). 커밋 메시지에 발견→수정→검증레벨+9번 결과.
- 미수정 잔여는 RELAY 🔴NEXT 후순위에 전부 기재(다음 감사가 이어받게).
- RELAY-LOG에 감사 회차 기록.

## 6. 재발방지 메모 (매번 상기)
- **RPC를 DROP+CREATE로 재생성하면 PUBLIC EXECUTE 디폴트 부활**(CREATE OR REPLACE는 ACL 보존). 새 RPC 마이그마다 REVOKE PUBLIC + GRANT service_role.
- **마이그 파일 ≠ prod 상태.** 옛 파일(예: pg_cron auth 헤더 없는 구버전)을 보고 재실행하면 사고. 항상 live 대조.
- 코드만 읽는 리뷰는 권한·죽은기능·RLS·stale을 **영원히 못 잡는다.** 이 스킬은 그래서 존재한다.
