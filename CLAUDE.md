# 메멘토애니 (Memento Ani) 프로젝트 컨텍스트

## 프로젝트 개요
반려동물과 함께하는 모든 순간을 기록하고, 이별 후에도 따뜻한 추억을 간직할 수 있는 **메모리얼 커뮤니티 플랫폼**

### 핵심 컨셉
- My Little Puppy 게임 감성 (밝고 따뜻한 파스텔톤)
- 듀얼 모드: 일상(active) ↔ 추모(memorial)
- 직접적 죽음/천국 언급 대신 "무지개다리" 같은 완곡한 표현

---

## 기술 스택

| 영역 | 기술 |
|-----|------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| UI | Radix UI + shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| AI | OpenAI GPT-4o-mini |
| 배포 | Vercel (예정) |

---

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 메인 라우터 (탭 기반 SPA)
│   ├── api/
│   │   ├── chat/route.ts     # AI 펫톡 API
│   │   └── reminders/        # 리마인더 CRUD API
│   └── auth/callback/        # Supabase Auth 콜백
├── components/
│   ├── pages/                # 8개 메인 페이지 컴포넌트
│   ├── common/               # Layout, Footer
│   ├── features/             # 기능별 컴포넌트
│   ├── modals/               # 모달 컴포넌트
│   └── ui/                   # shadcn/ui 기본 컴포넌트
├── contexts/
│   ├── AuthContext.tsx       # 인증 상태 관리
│   └── PetContext.tsx        # 반려동물 데이터 관리
├── lib/
│   ├── agent.ts              # AI 에이전트 로직
│   ├── supabase.ts           # Supabase 클라이언트 (클라이언트용)
│   ├── supabase-server.ts    # Supabase 서버 클라이언트 (API용, 세션 인증)
│   └── storage.ts            # 스토리지 유틸
└── types/index.ts            # 모든 타입 정의 (중앙 관리)
```

---

## 핵심 컨벤션

### 1. 타입 관리
```typescript
// ✅ 올바른 방법: types/index.ts에서 import
import { Pet, PetPhoto, TabType } from "@/types";

// ❌ 잘못된 방법: 컴포넌트에서 자체 정의
interface Pet { ... }  // 금지!
```

### 2. 컬러 시스템
```
일상 모드: #05B2DC (하늘색), #E0F7FF (연하늘), #38BDF8 (밝은파랑)
추모 모드: amber 계열 (황금빛, 따뜻한 느낌)
배경: 뭉게구름 화이트 그라데이션
```

### 3. 코드 스타일
- 이모지 사용 금지 (서비스 특성상)
- 컴포넌트 파일 상단에 JSDoc 주석으로 설명
- API 응답은 camelCase로 변환해서 사용

---

## 주요 페이지 (8개 탭)

| 탭 | 컴포넌트 | 상태 |
|---|---------|-----|
| 홈 | HomePage | ✅ 완료 |
| 우리의 기록 | RecordPage | ✅ 완료 |
| 커뮤니티 | CommunityPage | 🟡 목업 |
| AI 펫톡 | AIChatPage | ✅ 완료 |
| 입양정보 | AdoptionPage | 🟡 목업 |
| 지역정보 | LocalPage | 🟡 목업 |
| 분실동물 | LostPage | 🟡 목업 |
| 펫매거진 | MagazinePage | 🟡 목업 |

---

## 듀얼 모드 시스템

```typescript
// Pet 상태에 따라 UI/기능 분기
if (selectedPet?.status === "memorial") {
    // 추모 모드: 황금빛 테마, 치유 게시판, AI 위로 상담
} else {
    // 일상 모드: 하늘색 테마, 케어 알림, AI 케어 매니저
}
```

---

## 데이터베이스 스키마 (Supabase)

### 핵심 테이블
- `pets` - 반려동물 정보
- `pet_media` - 사진/영상
- `timeline_entries` - 타임라인 일기
- `pet_reminders` - 케어 알림
- `chat_messages` - AI 대화 기록
- `pet_memories` - AI 장기 메모리

### RLS 정책
모든 테이블에 `auth.uid() = user_id` 정책 적용

---

## 현재 상태 및 우선순위

### 완료된 기능 ✅
- 반려동물 CRUD + 사진/영상 관리
- AI 펫톡 (일상/추모 모드, 감정 분석)
- 타임라인 일기 + 편집
- 케어 리마인더 시스템
- 듀얼 모드 UI 전환
- 동물별 게시판 분류
- **API 보안**: reminders API 세션 기반 인증 완료 (supabase-server.ts)
- **관리자 페이지**: AdminPage.tsx (사용자/게시물 관리, 대시보드)
- **프리미엄 모달**: PremiumModal.tsx (커피 한 잔 값 설득)
- **로그인 프롬프트**: LoginPromptModal.tsx (비로그인 유저 유도)
- **랜딩 페이지 제거**: 비로그인자도 홈 화면 바로 접근 가능

### 개선 필요 🔧
1. **타입 통합**: PetContext 타입을 types/index.ts로 통합
2. **console.log 제거**: 프로덕션 전 정리
3. **isPremium 하드코딩 제거**: Supabase 프로필에서 실제 값 가져오기

### 목업 → DB 연동 필요 🟡
- 커뮤니티 게시판
- 입양 정보
- 분실동물 신고
- 펫매거진
- 결제 연동 (포트원)

---

## 주의사항

### 하지 말 것
- 컴포넌트에서 자체 타입 정의 (types/index.ts 사용)
- 직접적 죽음/사망 표현 (무지개다리, 이곳 사용)
- 이모지 남용 (서비스 톤앤매너)
- console.log 프로덕션에 남기기

### 반드시 할 것
- 에러 처리 + 사용자 피드백
- 모바일 반응형 고려
- 모드별 테마 색상 적용
- 타입 안전성 확보

---

## 자주 발생하는 실수 & 디버깅

### 1. 같은 기능 버튼 여러 개 → 일부만 수정
**문제**: "새 반려동물" 버튼이 3군데 있는데 2군데만 handleAddNewPet으로 수정
**해결**: 수정 전 반드시 grep으로 전체 검색
```bash
grep -n "setIsPetModalOpen\|handleAddNewPet" src/components/pages/RecordPage.tsx
```

### 2. Dynamic Import 사용 금지
**원칙**: 즉각적인 반응이 UX에 더 중요 (스포티파이 사례)
**해결**: 모달, 컴포넌트는 일반 import 사용. dynamic import 사용하지 않음

### 3. 반응형 텍스트 줄바꿈
**문제**: "특별해지는 곳"이 "특" / "별해지는 곳"으로 끊김
**해결**: 짧은 텍스트로 변경 ("특별한 매일을 함께")

### 4. Context 로딩 타이밍
**문제**: pets.length가 0으로 나옴 (데이터 로딩 전)
**해결**: isLoading 체크 후 렌더링, useEffect 의존성 확인

### 5. 프리미엄 모달 안 뜸
**문제**: 제한 체크 로직이 있는 함수를 안 쓰고 직접 setModal(true) 호출
**해결**: 항상 래퍼 함수 (handleAddNewPet) 사용

---

## 프리미엄/무료 회원 제한

| 기능 | 무료 | 프리미엄 (월 7,900원) |
|-----|-----|---------------------|
| AI 펫톡 | 하루 10회 | 무제한 |
| 반려동물 등록 | 1마리 | 무제한 |
| 사진 저장 | 100장 | 무제한 |

```typescript
// chatUtils.ts
export const DAILY_FREE_LIMIT = 10;

// RecordPage.tsx
const FREE_PET_LIMIT = 1;
const FREE_PHOTO_LIMIT = 100;
const isPremium = false; // TODO: Supabase에서 가져오기
```

---

## 관리자 시스템

```typescript
// types/index.ts
export const ADMIN_EMAILS = ["sharkwind1@gmail.com"];

export function isAdmin(email?: string | null): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email);
}

// Layout.tsx에서 관리자 탭 조건부 표시
{isAdmin(user?.email) && <AdminTab />}
```

---

## 자주 수정하는 파일

```
src/types/index.ts          # 타입 추가/수정
src/contexts/PetContext.tsx # 펫 데이터 로직
src/app/api/chat/route.ts   # AI 프롬프트 수정
src/components/pages/*.tsx  # 각 페이지 UI
```

---

## 개발자 정보

- **이름**: 안승빈
- **상황**: 풀스택 부트캠프 수료 예정 (2026년 3월)
- **목표**: MVP 런칭 → 창업지원금 신청
