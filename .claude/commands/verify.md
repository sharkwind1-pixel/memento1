---
description: 작업 끝마다 강제 실행. typecheck/build/lint/DB/imports 모두 자동 검증 후 5섹션 보고서 생성. leceipts 영감.
---

# /verify — 작업 검증 리포트 강제 생성

## 목적

"AI가 거짓말 못 하게" 만드는 검증 워크플로 실행.

leceipts 패턴 적용:
- "고쳤습니다" 같은 표현 금지
- 검증 안 한 항목은 ⚠️ 미검증으로 명시
- 검증 레벨(L0~L5) 자동 산정

## 실행 단계

1. 다음 명령을 순차 실행하여 자동 검증 결과 수집:
   - `npx tsc --noEmit` (typecheck)
   - `npm run lint` (lint)
   - `npm run build` (build)
   - `npx tsx scripts/verify-db-schema.ts` (DB 스키마)
   - `npx tsx scripts/check-pending-migrations.ts` (미실행 마이그레이션)
   - `npx tsx scripts/check-import-graph.ts` (Import 그래프)

   또는 한 번에: `npm run verify` (verify-all 오케스트레이터)

2. 결과를 다음 5섹션 형식으로 정리:

```markdown
## 🔍 Verification Report

### 1. 작업 요약
[이 세션에서 무엇을 왜 했는지 1-2문장]

### 2. Change Map
- [path/to/file.ts:lines] 변경 내용
- [path/to/new-file.ts] 신규: 목적
- [migration.sql] 신규: DB 변경 내용

### 3. Automated Checks
| Check | Result | Detail |
|---|---|---|
| typecheck (`tsc --noEmit`) | ✅/❌/⏭️ | (실패 시 에러) |
| lint (`next lint`) | ✅/❌ | (warning 별도) |
| build (`next build`) | ✅/❌ | |
| Import 연결 | ✅/⚠️ | (죽은 코드 N개) |
| DB 스키마 일치 | ✅/⚠️/❌ | (미실행 마이그레이션 시 ⚠️) |
| 미실행 마이그레이션 | None / N개 | |

### 4. Manual Verification
| 항목 | 방식 | 결과 |
|---|---|---|
| API 응답 | curl 미실행 | ⚠️ 미검증 |
| UI 시각 동작 | 미테스트 | ⚠️ 미검증 |
| DB 데이터 일관성 | (필요 시) | ⚠️ 미검증 |

### 5. Verification Level
**달성: Lx_xxx**
- L0_미검증 / L1_빌드 / L2_타입+빌드 / L3_정적전수 / L4_API응답 / L5_E2E

### 6. Remaining Risk
| 위험 | 영향 | 해결 방법 | 담당 |
|---|---|---|---|
| (예) supabase/migrations/XXX.sql 미실행 | 발송 시 CHECK 위반 | Supabase Dashboard | 사용자 |
| (예) UI 시각 회귀 미테스트 | 톤/배지 잘못 표시 가능 | 본인 계정 5분 클릭 테스트 | 사용자 |

### 7. Confidence Statement
**"이 작업은 [Lx]까지만 검증되었습니다. 그 이상은 보장 못 합니다."**
```

3. 5섹션 보고서를 사용자에게 출력. 보고서 작성 후 다음 사항 확인:

## 자체 검열 체크리스트 (보고서 작성 전 자문)

다음 6가지 중 하나라도 NO면 그 항목은 ⚠️ 미검증으로 표시:

1. "고쳤다"고 했는데 build 안 돌렸나?
2. "통과했다"고 했는데 어떤 명령어를 어떤 결과로?
3. "정상 작동"이라 했는데 실제 호출해봤나?
4. DB 변경 있는데 마이그레이션 실행했나?
5. UI 변경 있는데 사용자 시각 확인이 필요한 거 아닌가?
6. import 추가했는데 정말 어디서 쓰이나?

## 거짓말 패턴 발견 시

검증 후 다음 표현 사용 금지:
- "고쳤습니다" (단독)
- "정상 작동합니다"
- "통과했습니다" (출력 인용 없이)
- "문제 없습니다"
- "에러 없습니다"

대신:
- "L2 통과 (typecheck + build). L3-5는 미검증"
- "코드 변경 완료. 마이그레이션 미실행으로 L3 미달"
- "API 작성 완료. 빌드 통과. curl 미실행이라 응답 검증 사용자 필요"

## 메모리 시스템 통합

검증 위반 패턴이 발견되면:
- `~/.claude/projects/c--Users-shark-memento1/memory/feedback_lying_patterns.md`에 누적
- 다음 세션이 자동으로 그 패턴 회피

## 참고 문서
- `docs/verification-workflow.md` (전체 설계)
- `CLAUDE.md` (검증 워크플로 섹션)
