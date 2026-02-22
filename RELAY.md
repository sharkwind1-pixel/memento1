# 릴레이

## [!!] 미실행 마이그레이션 - 승빈님 액션 필요

> 아래 SQL이 Supabase DB에서 실행되지 않으면 관련 기능이 동작하지 않습니다.
> Supabase 대시보드 > SQL Editor에서 복사-붙여넣기로 실행해주세요.

| 파일 | SQL | 영향받는 기능 | 긴급도 |
|------|-----|--------------|--------|
| `20260222_minimi_system.sql` | 파일 전체 (user_minimi 테이블, RPC 3개) | 미니미 구매/되팔기/상점 | 즉시 (이미 실행됐을 수 있음 - 확인 필요) |
| `20260222_fix_equipped_minimi_type.sql` | `ALTER TABLE profiles ALTER COLUMN equipped_minimi_id TYPE TEXT USING equipped_minimi_id::TEXT;` | 미니미 장착/해제 | **즉시** - 이것이 실행되지 않으면 장착 API에서 UUID 에러 발생 |

### 확인 방법
SQL Editor에서 아래를 실행하면 현재 타입을 확인할 수 있습니다:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'equipped_minimi_id';
```
- `text`가 나오면: 이미 해결됨
- `uuid`가 나오면: 위 ALTER TABLE 실행 필요

---

## 이번 세션 완료 사항
- **모달 스크롤 PetFormModal 패턴 전환 완료** (14개 모달)
  - 외부 `fixed inset-0 overflow-y-auto bg-black/50` + `WebkitOverflowScrolling: 'touch'`
  - 내부 `min-h-full flex items-start justify-center pt-16 pb-20 px-4` 래퍼
  - 모달 본체 `max-h` 제거, sticky 헤더/푸터
  - **미니미 상점에서 모달 스크롤 잘 됨 확인됨** (승빈님 직접 확인)

## 핵심 규칙: 모달 스크롤 안 되면 PetFormModal 패턴 적용
- `src/components/features/record/PetFormModal.tsx` 라인 224~264 참고
- 패턴 요약:
  ```tsx
  <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50"
       style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
       onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="min-h-full flex items-start justify-center pt-16 pb-20 px-4">
      <div className="bg-white ... w-full max-w-md rounded-2xl shadow-xl relative"
           onClick={(e) => e.stopPropagation()}>
        {/* sticky 헤더 */}
        <div className="sticky top-0 z-10 ...">...</div>
        {/* 콘텐츠 (자유 높이, max-h 없음) */}
        <div className="p-4">...</div>
        {/* sticky 하단 */}
        <div className="sticky bottom-0 z-10 ...">...</div>
      </div>
    </div>
  </div>
  ```

---

## 해결된 문제

### 문제 1: 장착 API UUID 에러 (코드 수정 완료, DB 마이그레이션 미실행)
- `supabase/migrations/20260222_fix_equipped_minimi_type.sql` 생성
- `ALTER TABLE profiles ALTER COLUMN equipped_minimi_id TYPE TEXT USING equipped_minimi_id::TEXT;`
- **상태**: 코드는 준비됨. DB에서 SQL 실행 필요 (최상단 "미실행 마이그레이션" 참조)

### 문제 2: 미니미 구매 확인 없이 바로 결제됨 -- 해결됨
- `MinimiShopModal.tsx`에 `purchaseConfirm` 상태 추가
- 구매 버튼 클릭 -> 확인 다이얼로그 -> "000을(를) 구매하시겠습니까? -000P 차감" -> 취소/구매

### 문제 4: 사이드바 모바일 터치 스크롤 -- 해결됨
- 백드롭에서 `touch-none` 클래스 제거
- 사이드바 패널 `overflow-clip` -> `overflow-y-auto overscroll-contain` + `WebkitOverflowScrolling: 'touch'`

---

## 미해결 문제

### 문제 3: 구매한 미니미가 보이는 곳이 없음
- 미니미를 구매해도 어디에서도 보이지 않음
- 장착 후에도 표시되는 UI가 없음 (문제 1 해결 후 장착은 가능해짐)

#### 미니미가 보여야 하는 곳 (구현 필요)
1. **미니홈피 페이지** - 장착한 미니미 캐릭터가 미니홈피에 표시
2. **사이드바 프로필 영역** - 장착 미니미 작은 아이콘
3. **홈페이지 프로필 카드** - 미니미 표시

#### 관련 파일
- `src/components/features/minihompy/` - 미니홈피 관련 컴포넌트
- `src/components/common/Sidebar.tsx` - 사이드바
- `src/components/features/points/PointsBadge.tsx` - 포인트 배지
- `src/contexts/AuthContext.tsx` - equippedMinimi 상태
- `src/data/minimiPixels.ts` - CHARACTER_CATALOG

---

## 작업 규칙
- 커밋/푸시는 물어보지 말고 바로 진행
- 빌드 확인 필수
- CLAUDE.md의 서브에이전트 오케스트레이션 방식 준수
- **DB 변경이 포함된 작업은 SQL 실행까지 완료해야 "완료"**
