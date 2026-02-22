# 릴레이

## [!!] 미실행 마이그레이션 - 승빈님 액션 필요

> 아래 SQL이 Supabase DB에서 실행되지 않으면 관련 기능이 동작하지 않습니다.
> Supabase 대시보드 > SQL Editor에서 복사-붙여넣기로 실행해주세요.

| 파일 | SQL | 영향받는 기능 | 긴급도 |
|------|-----|--------------|--------|
| `20260222_minimi_system.sql` | 파일 전체 (user_minimi 테이블, RPC 3개) | 미니미 구매/되팔기/상점 | 즉시 (이미 실행됐을 수 있음 - 확인 필요) |
| `20260222_fix_equipped_minimi_type.sql` | `ALTER TABLE profiles ALTER COLUMN equipped_minimi_id TYPE TEXT` | 미니미 장착/해제 | 선택 - **코드 수정으로 UUID 컬럼 그대로 동작 가능하게 해결됨** |

### equipped_minimi_id UUID 문제: 이중 해결
1. **코드 수정 (즉시 적용)**: equip API가 user_minimi UUID를 저장, 읽을 때 UUID→slug 변환
2. **DB 변경 (선택)**: ALTER TABLE로 TEXT 타입으로 바꾸면 더 깔끔하지만 필수 아님

---

## 이 세션에서 수정한 것 (코드 + 커밋 완료)

### 1. equipped_minimi_id UUID 호환성 (코드 수정으로 해결)
- `equip/route.ts`: user_minimi UUID를 equipped_minimi_id에 저장
- `inventory/route.ts`: UUID→slug 역변환하여 클라이언트에 반환
- `sell/route.ts`: 폴백 비교 로직 수정 + RPC 후 장착해제 후처리
- `minihompy/[userId]/route.ts`: 방문 시 UUID→slug 변환
- `AuthContext.tsx`: refreshProfile/refreshMinimi에서 UUID→slug 조회

### 2. 미니미 구매 확인 다이얼로그
- `MinimiShopModal.tsx`에 purchaseConfirm 상태 추가
- 구매 클릭 → "000을(를) 구매하시겠습니까? -000P 차감" → 취소/구매

### 3. 사이드바 모바일 터치 스크롤
- 백드롭 `touch-none` + `onTouchMove preventDefault` 제거
- 사이드바 패널 `overflow-clip` → `overflow-y-auto overscroll-contain`

### 4. 재발 방지 규칙 (AGENTS.md 추가)
- SQL 파일 작성 = 작업의 50%. 실행 + 검증까지 해야 100%
- `ADD COLUMN IF NOT EXISTS`는 기존 타입 안 바꾸므로 주의
- 실행 불가 시 RELAY.md 최상단 테이블에 기재

---

## 미니미 표시 UI (문제 3) - 이미 구현되어 있음

코드 확인 결과 **이미 구현됨**:
- `PointsBadge.tsx`: 사이드바에 장착 미니미 48x48 표시
- `MinihompyStage.tsx`: 미니홈피에 장착 미니미 80x80 표시
- `AuthContext.tsx`: minimiEquip 상태 + refreshMinimi() 콜백

**장착 API가 동작하면 (위 UUID 수정으로) 자동으로 보임**

---

## 핵심 규칙: 모달 스크롤 안 되면 PetFormModal 패턴 적용
- `src/components/features/record/PetFormModal.tsx` 라인 224~264 참고

---

## 작업 규칙
- 커밋/푸시는 물어보지 말고 바로 진행
- 빌드 확인 필수
- CLAUDE.md의 서브에이전트 오케스트레이션 방식 준수
- **DB 변경이 포함된 작업은 SQL 실행까지 완료해야 "완료"**
