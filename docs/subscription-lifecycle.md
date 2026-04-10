# 구독 해지 라이프사이클 설계

> 작성: 2026-04-10
> 상태: 설계 확정, 구현 대기 (VS Code 세션에서 진행 예정)
>
> 배경: 현재 구독 해지 시 `is_premium=false` 즉시 설정되어 UI 문구("남은 기간 이용 가능")와 불일치.
> 데이터 보존 원칙 + 단계적 회귀로 재설계.

---

## 🎯 핵심 원칙

1. **데이터는 유저의 명시적 결정(탈퇴/구독해지)까지 보존**
2. **구독 해지 ≠ 즉시 데이터 삭제** — 단계적 축소
3. **추모 펫은 카운트 대상에 포함** (데이터 앵커 역할, 일상 모드 데이터가 추모 모드의 재료)
4. **유저에게 현재 상태를 지속적으로 설명**
5. **UI: 토스트 + 벨 알림 + 지속 배너** (모달 금지 — 강요 느낌 배제)

---

## 📐 상태 전이표

| 단계 | 기간 | 상태 | 유저 권한 | DB 플래그 |
|------|------|------|----------|---------|
| **0. 활성** | 구독 중 | `active` | 전체 기능 | `is_premium: true` |
| **1. 읽기 전용** | D+0 ~ D+30 | `readonly` | 볼 수 있음, 편집/추가 X | `subscription_phase: 'readonly'` |
| **2. 숨김** | D+31 ~ D+80 | `hidden` | 데이터 접근 불가, 커뮤니티는 OK | `subscription_phase: 'hidden'` |
| **3. 카운트다운** | D+81 ~ D+89 | `countdown` | 숨김 + 매일 알림 | `subscription_phase: 'countdown'` |
| **4. 회귀** | D+90 | `free` | 무료 한도로 초기화 | `subscription_phase: 'free'` |

**D = 구독 해지일 (`subscription_cancelled_at`)**

---

## 🗄️ DB 스키마

```sql
-- profiles 테이블에 라이프사이클 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_phase TEXT
    DEFAULT 'active'
    CHECK (subscription_phase IN ('active', 'readonly', 'hidden', 'countdown', 'free'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_readonly_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_hidden_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_reset_at TIMESTAMPTZ;

-- 대표 펫 (회귀 시 유지될 펫)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS protected_pet_id UUID REFERENCES pets(id) ON DELETE SET NULL;

-- 인덱스: 크론잡이 각 단계 유저 조회
CREATE INDEX IF NOT EXISTS idx_profiles_lifecycle
    ON profiles(subscription_phase, data_reset_at)
    WHERE subscription_phase != 'active';
```

---

## 🔄 크론잡: `/api/cron/subscription-lifecycle`

**스케줄**: 매일 KST 00:30 (UTC 15:30)

**로직**:
```
1. readonly 유저 중 D+30 지난 사람 → hidden 전환
   - 토스트/알림 생성 (다음 로그인 시 표시)
   - notifications 테이블 INSERT (type: subscription_hidden_start)

2. hidden 유저 중 D+80 지난 사람 → countdown 전환
   - 알림 생성

3. countdown 유저 → 매일 알림 발송
   - D-10, D-9, ..., D-1
   - 매번 notifications INSERT (type: subscription_countdown)
   - D-3부터는 sticky 배너 활성화

4. countdown 유저 중 D+90 지난 사람 → free 회귀 실행
   - 회귀 로직 (아래 참고)
```

### 회귀 로직 (무료 수준으로 축소)

```typescript
// 1. protected_pet_id 외 펫 모두 archive (soft delete)
//    - pets.status = 'archived' 새 값 추가? 아니면 메타데이터?
//    - 결정 필요: hard delete vs soft delete

// 2. 각 펫의 사진을 50장으로 축소
//    - 최근 50장 유지 (또는 유저가 즐겨찾기 한 것 우선)

// 3. subscription_phase = 'free', is_premium = false
// 4. 회귀 완료 알림 (notifications INSERT)
```

**남길 데이터 선별 기준** (미확정 — 승빈님 결정 필요):
- **옵션 A**: 가장 오래된 펫 (FIFO)
- **옵션 B**: 가장 최근 펫 (LIFO)
- **옵션 C**: `protected_pet_id` (유저가 미리 지정) ← **추천**
  - 기본값: 가장 오래된 펫
  - 읽기 전용 30일 동안 변경 가능
  - 추모 펫도 지정 가능 (데이터 앵커 보존)

---

## 📱 UI 상태 표시

### 1. 읽기 전용 (D+0 ~ D+30)

**진입 시 토스트** (5초):
```
💛 구독이 해지되었습니다
소중한 추억들은 30일간 그대로 보관돼요.
재구독하면 편집이 바로 가능해집니다.
```

**홈 탭 상단 배너** (닫기 가능):
```
읽기 전용 모드 · 28일 남음
소중한 추억은 그대로 보관 중이에요
[재구독] [닫기]
```

**각 펫 카드**: `🔒 읽기 전용` 뱃지

**편집 버튼 클릭 시**: 토스트
```
읽기 전용 모드입니다
편집하려면 재구독해주세요
[재구독]
```

**예외 — 추모 모드 전환**:
- 읽기 전용에서도 **예외 허용**
- 이유: "죽음은 기다려주지 않으므로"
- `status: active → memorial` 변경은 허용, 그 외 편집 X

---

### 2. 숨김 (D+31 ~ D+80)

**진입 시 토스트** (5초):
```
소중한 데이터를 잠시 보관 중이에요
50일 후 일부 데이터가 정리됩니다.
재구독하면 모두 복구됩니다.
```

**로그인 시 홈 탭 전체 오버레이** (닫기 가능, 하루 1번만 표시):
```
소중한 데이터를 잠시 보관 중입니다

구독 해지 후 30일이 지났어요
데이터는 안전하게 보관되어 있어요
재구독하면 모두 즉시 복구됩니다

50일 후 일부 데이터가 정리됩니다

[지금 재구독하기]
[오늘은 그만 볼게요]
```

**접근 가능**: 커뮤니티, 매거진 (본인 데이터만 가림)
**접근 불가**: 내 기록, 내 미니홈피, AI 펫톡 (숨김)

**예외**: AI 펫톡 숨김 여부는 승빈님 최종 결정 필요
- 안 → 감정적 의존 유저에게 타격
- 허용 → OpenAI 비용 계속 발생
- **절충안**: 일 3회 제한적 허용?

---

### 3. 카운트다운 (D+81 ~ D+89)

**매일 아침 토스트**:

**D-10**:
```
⏰ 10일 후 데이터가 정리됩니다
무료 한도를 초과하는 데이터가 10일 후 정리돼요.
재구독하면 모두 지킬 수 있어요.
[재구독]
```

**D-5**:
```
⚠️ 5일 남았어요
등록된 반려동물 N마리 중 (N-1)마리가
5일 후 보관함에서 사라집니다.
```

**D-1** (가장 강한 톤):
```
🚨 내일 정리됩니다
내일 자정에 무료 한도 초과 데이터가
영구 정리됩니다. 마지막 기회예요.
```

**상단 배너** (D-3부터 sticky, 닫기 불가):
```
⚠️ N일 후 데이터가 정리됩니다
재구독하면 전부 지킬 수 있어요
[재구독] [대표 펫 확인]
```

---

### 4. 회귀 완료 (D+90)

**회귀 후 첫 로그인 시 토스트 + 벨 알림**:
```
💙 무료 플랜으로 돌아오셨어요
일부 데이터가 정리되었습니다.

보관된 데이터:
• 반려동물 1마리 (말티즈 '콩이')
• 사진 50장
• 타임라인 기록

[자세히 보기]
```

---

## 🔔 알림 채널

| 단계 | 앱 내 토스트 | 벨 알림 (영구) | 상단 배너 | 이메일 |
|------|:---:|:---:|:---:|:---:|
| 읽기 전용 전환 | ✓ | ✓ | 닫기 가능 | ✗ |
| 숨김 전환 | ✓ | ✓ | 닫기 가능 | ✓ |
| 카운트다운 D-10 | ✓ | ✓ | 닫기 가능 | ✓ |
| 카운트다운 D-5 | ✓ | ✓ | 닫기 가능 | ✓ |
| 카운트다운 D-3 ~ D-1 | ✓ | ✓ | **Sticky** | ✓ |
| 회귀 완료 | ✓ | ✓ | 닫기 가능 | ✓ |

**제외**: SMS (고비용), 푸시 알림 (읽기 전용/숨김 단계에선 유저 이탈 가속 우려 — 카운트다운만)

---

## 🔧 구현 체크리스트

### Phase 1: DB 및 크론잡 기반
- [ ] DB 마이그레이션 (profiles 컬럼 5개 추가)
- [ ] `/api/cron/subscription-lifecycle` 엔드포인트 신규
- [ ] vercel.json 크론 등록 (`30 15 * * *` = KST 00:30)
- [ ] 회귀 로직 (archive vs delete 결정)

### Phase 2: 상태 변경 트리거
- [ ] SubscriptionSection.tsx 해지 버튼 수정
  - `is_premium = false` 즉시 X
  - `subscription_phase = 'readonly'`, `subscription_cancelled_at = now()`
  - `data_readonly_until = now() + 30일`
  - `data_hidden_until = now() + 80일`
  - `data_reset_at = now() + 90일`

### Phase 3: 읽기 전용 UI
- [ ] 편집 차단 hook (`useReadOnlyMode()`)
- [ ] 펫 카드 `🔒 읽기 전용` 뱃지
- [ ] 편집 버튼 클릭 시 안내 토스트
- [ ] 상단 배너 컴포넌트 (`SubscriptionStatusBanner`)
- [ ] 추모 모드 전환만 예외 허용

### Phase 4: 숨김 UI
- [ ] 내 기록 탭 접근 차단 + 오버레이
- [ ] AI 펫톡 접근 제한 (결정: 완전차단 / 일3회)
- [ ] 커뮤니티는 접근 허용

### Phase 5: 카운트다운 알림
- [ ] notifications 테이블에 `subscription_countdown` type 추가
- [ ] 크론잡에서 매일 카운트다운 알림 INSERT
- [ ] Sticky 배너 (D-3 ~ D-1)
- [ ] 이메일 발송 (D-10, D-5, D-1)

### Phase 6: 회귀 로직
- [ ] protected_pet_id 외 펫 archive/delete
- [ ] 각 펫 사진 50장 초과분 archive/delete
- [ ] 회귀 완료 알림
- [ ] subscription_tier = 'free' 설정

### Phase 7: 대표 펫 지정 UI
- [ ] 읽기 전용 진입 시 "대표 펫 선택" 프롬프트
- [ ] 설정 > 구독 탭에서 변경 가능
- [ ] 펫 카드에 "대표 펫" 표시
- [ ] 기본값: 가장 오래된 펫 (또는 추모 펫 우선?)

### Phase 8: 재구독 복구 로직
- [ ] 재구독 시 subscription_phase = 'active'
- [ ] data_* 컬럼 초기화
- [ ] archived 상태 펫/사진 복구 (아직 삭제 안 됐다면)
- [ ] 복구 완료 토스트

---

## ⚠️ 미결정 사항 (구현 전 확정 필요)

1. **회귀 시 데이터 처리 방식**
   - Hard delete vs Soft delete (archive 테이블)
   - Hard delete: 저장소 비용 절감, 되돌릴 수 없음
   - Soft delete: 재구독 시 완전 복구 가능, 저장소 비용 유지
   - **추천**: Soft delete (pet_media에 `archived_at` 컬럼 추가)

2. **대표 펫 선별 기본값**
   - 가장 오래된 펫 (첫 등록)
   - 가장 최근 펫
   - 추모 펫 우선 (가족으로서의 의미)
   - **추천**: 유저가 명시적으로 선택. 미선택 시 가장 오래된 펫.

3. **숨김 상태에서 AI 펫톡**
   - 완전 차단
   - 일 3회 제한적 허용
   - 1주일에 3회 허용
   - **추천**: 일 3회 (무료 플랜 10회의 30% 수준)

4. **이메일 채널 사용 여부**
   - Supabase Auth의 이메일 발송 기능 사용
   - 또는 별도 이메일 서비스 (Resend 등)
   - **추천**: Supabase Auth (기존 인프라 재사용)

5. **사진 50장 선별 기준**
   - 최근 50장
   - 즐겨찾기/좋아요 받은 사진 우선
   - 유저가 직접 선택
   - **추천**: 즐겨찾기 우선 + 나머지는 최근 순

---

## 🔗 관련 파일 (구현 시 수정/생성)

**신규**:
- `src/app/api/cron/subscription-lifecycle/route.ts`
- `src/hooks/useReadOnlyMode.ts`
- `src/components/features/subscription/SubscriptionStatusBanner.tsx`
- `src/components/features/subscription/StickyCountdownBanner.tsx`
- `supabase/migrations/20260411_subscription_lifecycle.sql`

**수정**:
- `src/components/Auth/SubscriptionSection.tsx` (해지 로직)
- `src/contexts/AuthContext.tsx` (subscription_phase 상태 로드)
- `src/contexts/PetContext.tsx` (readonly 상태 반영)
- `src/app/api/chat/chat-pipeline.ts` (숨김 상태 처리)
- `src/components/common/Layout.tsx` (배너 통합)
- `src/app/api/notifications/route.ts` (카운트다운 알림 type 추가)
- `src/types/index.ts` (SubscriptionPhase 타입 추가)
- `vercel.json` (크론 추가)

---

## 📊 예상 작업 볼륨

| Phase | 작업 | 시간 |
|-------|------|------|
| 1 | DB + 크론잡 기반 | 1.5h |
| 2 | 상태 변경 트리거 | 30m |
| 3 | 읽기 전용 UI | 2h |
| 4 | 숨김 UI | 1.5h |
| 5 | 카운트다운 알림 | 1h |
| 6 | 회귀 로직 | 1.5h |
| 7 | 대표 펫 UI | 1h |
| 8 | 재구독 복구 | 1h |
| | **총** | **10시간** |

---

## 🎓 설계 배경 (왜 이렇게 했나)

### 왜 하이브리드 (읽기전용 → 숨김 → 회귀)인가?

**즉시 삭제의 문제**:
- 실수로 해지 → 복구 불가 → 민원
- 펫로스 유저에게 "두 번째 상실" 경험
- 구독 재개 유도 실패

**영구 보존의 문제**:
- 저장소 비용 무제한 증가
- 개인정보 원칙 (필요 이상 보관 X)
- "프리미엄"의 가치 불명확

**하이브리드의 장점**:
- 30일 읽기 전용: 재구독 유도 기간
- 50일 숨김: "잠깐 쉬어가는" 유저 보호
- 10일 카운트다운: 마지막 기회 명확히 안내
- 90일 후 회귀: 개인정보 원칙 준수 + 비용 절감

### 왜 모달이 아니라 토스트 + 배너인가?

- **모달**: 강요 느낌, 메멘토애니 따뜻한 톤과 불일치
- **토스트**: 부드러운 인지, 일시적
- **벨 알림**: 영구 기록, 유저가 원할 때 확인
- **배너**: 지속 표시, 닫을 수 있음 (D-3부터만 sticky)

### 왜 추모 펫도 대표 펫 대상인가?

승빈님이 명시적으로 확정:
> "일상 모드에서 쌓은 정보들을 통해 추모 모드 동물 대화를 풍성하게 하고 영상이나 자동 생성 앨범도 풍성하게 하는 것"

즉 추모 펫은 단순 "죽은 데이터"가 아니라 **서비스 USP의 핵심 앵커**.
유저가 첫 반려동물(추모)을 대표 펫으로 지정하는 것도 자연스러움.

---

*이 문서는 구현 전 최종 설계서입니다. 구현 중 발견되는 이슈는 이 문서에 업데이트.*
