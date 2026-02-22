# 릴레이 - 긴급 수정 사항

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

## 문제 1: 장착 API UUID 에러 (가장 시급)

### 증상
- `장착 실패: invalid input syntax for type uuid: "yorkshire"`
- `equipped_minimi_id` 컬럼이 UUID 타입인데 slug(문자열 "yorkshire")를 넣으려고 함

### 원인
- `profiles` 테이블의 `equipped_minimi_id` 컬럼 타입이 UUID
- 코드에서는 slug 문자열("maltipoo", "yorkshire" 등)을 저장하려고 함
- **DB 스키마 vs 코드 불일치**

### 해결 방향 (둘 중 하나)
1. **DB 변경**: `equipped_minimi_id` 컬럼을 `text` 타입으로 변경 (slug 문자열 저장)
   ```sql
   ALTER TABLE profiles ALTER COLUMN equipped_minimi_id TYPE text;
   ```
2. **코드 변경**: `user_minimi` 테이블의 UUID id를 사용하도록 equip API 수정
   - user_minimi에서 slug로 조회 → 해당 row의 UUID id를 equipped_minimi_id에 저장
   - 이 경우 클라이언트에서 slug↔id 변환 로직 필요

### 관련 파일
- `src/app/api/minimi/equip/route.ts` - 장착 API (라인 44~47)
- `src/data/minimiPixels.ts` - CHARACTER_CATALOG (slug 기반)
- `src/components/features/minimi/MinimiClosetModal.tsx` - 옷장 (장착/해제 호출)
- `src/components/features/minimi/MinimiShopModal.tsx` - 상점 (구매 후 자동 장착)

---

## 문제 2: 미니미 구매 확인 없이 바로 결제됨

### 증상
- 미니미 상점에서 "구매" 버튼 누르면 확인 없이 바로 포인트 차감
- 터치 미스로 원치 않는 캐릭터를 구매할 수 있음

### 해결
- MinimiShopModal.tsx에 구매 확인 다이얼로그 추가
- MinimiClosetModal.tsx의 "되팔기 확인" 패턴 참고 (sellConfirm 상태)
- "000을(를) 000P에 구매하시겠습니까?" → 취소 / 구매 버튼

### 수정 파일
- `src/components/features/minimi/MinimiShopModal.tsx`

---

## 문제 3: 구매한 미니미가 보이는 곳이 없음

### 증상
- 미니미를 구매해도 어디에서도 보이지 않음
- 장착 후에도 표시되는 UI가 없음 (장착 API가 먼저 동작해야 함 → 문제 1 해결 후)

### 미니미가 보여야 하는 곳 (구현 필요)
1. **미니홈피 페이지** - 장착한 미니미 캐릭터가 미니홈피에 표시
2. **사이드바 프로필 영역** - 장착 미니미 작은 아이콘
3. **홈페이지 프로필 카드** - 미니미 표시

### 관련 파일
- `src/components/features/minihompy/` - 미니홈피 관련 컴포넌트
- `src/components/common/Sidebar.tsx` - 사이드바
- `src/components/features/points/PointsBadge.tsx` - 포인트 배지
- `src/contexts/AuthContext.tsx` - equippedMinimi 상태
- `src/data/minimiPixels.ts` - CHARACTER_CATALOG

---

## 문제 4: 사이드바 모바일 터치 스크롤

### 증상
- 사이드바에서 게시판 부분만 터치해야 스크롤됨
- 다른 영역 터치하면 스크롤 안 됨

### 원인
- 모바일 사이드바 `overflow-clip`이 여전히 터치 이벤트 제한
- nav 영역만 `overflow-y-auto`라서 nav 바깥 터치하면 스크롤 불가
- 백드롭에 `onTouchMove={(e) => e.preventDefault()}` + `touch-none`이 걸려있어 터치 이벤트 차단

### 해결 방향
- 사이드바 패널 자체를 `overflow-y-auto`로 변경
- 또는 sidebarContent 전체를 스크롤 가능하게 구조 변경
- 백드롭의 `touch-none` / `onTouchMove preventDefault` 제거 검토

### 수정 파일
- `src/components/common/Sidebar.tsx` (라인 378~395)

---

## 우선순위
1. **문제 1 (장착 UUID 에러)** - 장착이 안 되면 미니미 기능 전체가 무용지물
2. **문제 2 (구매 확인)** - 실제 포인트 손실 발생
3. **문제 4 (사이드바 스크롤)** - UX 답답함
4. **문제 3 (미니미 표시)** - 기능 완성도

## 작업 규칙
- 커밋/푸시는 물어보지 말고 바로 진행
- 빌드 확인 필수
- CLAUDE.md의 서브에이전트 오케스트레이션 방식 준수
