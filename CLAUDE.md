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
│   │   ├── chat/
│   │   │   ├── route.ts      # AI 펫톡 API (핸들러+인증)
│   │   │   ├── chat-helpers.ts # 컨텍스트 빌더/유틸
│   │   │   └── chat-prompts.ts # 시스템 프롬프트 생성
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
│   ├── agent/                # AI 에이전트 모듈 디렉토리
│   │   ├── index.ts          # 배럴 재수출 (import "@/lib/agent" 유지)
│   │   ├── shared.ts         # Supabase/OpenAI 싱글턴
│   │   ├── emotion.ts        # 감정 분석 + 애도 단계
│   │   ├── memory.ts         # 장기 메모리/메시지 CRUD
│   │   ├── reminders.ts      # 리마인더 CRUD
│   │   ├── conversation.ts   # 대화 요약/맥락
│   │   └── helpers.ts        # 순수 유틸 (getDaysAgo 등)
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
| 커뮤니티 | CommunityPage | ✅ 완료 |
| AI 펫톡 | AIChatPage | ✅ 완료 |
| 입양정보 | AdoptionPage | ✅ 완료 |
| 지역정보 | LocalPage | ✅ 완료 |
| 분실동물 | LostPage | ✅ 완료 |
| 펫매거진 | MagazinePage | ✅ 완료 |

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

## 현재 상태

대부분의 핵심 기능 구현 완료. 남은 작업은 `RELAY.md` 참조.
완료된 기능 상세 목록은 `RELAY-ARCHIVE.md` 참조.

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

### DB 변경 작업 완료 기준 (필수)
- **SQL 파일 작성만으로는 "완료"가 아님**
- 완료 조건 3가지:
  1. SQL이 실제 DB에서 실행됨 (스크립트 또는 대시보드)
  2. 관련 API 호출 테스트 통과 (curl 또는 브라우저)
  3. 프론트엔드에서 해당 기능이 정상 동작 확인
- SQL 실행이 불가능한 경우: **RELAY.md 최상단** "미실행 마이그레이션" 섹션에 긴급도와 함께 기재
- `ADD COLUMN IF NOT EXISTS`는 이미 다른 타입으로 존재하는 컬럼을 무시하므로, 타입 변경이 필요하면 반드시 `ALTER COLUMN TYPE`도 함께 포함
- 마이그레이션 SQL 작성 시 기존 컬럼 타입을 먼저 확인 (information_schema.columns 조회)
- "승빈님이 실행하세요"로 끝내지 말 것 -- 가능한 수단을 모두 시도하고, 정말 불가능할 때만 최소한의 액션으로 요청

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

### 6. DB 스키마-코드 타입 불일치 (2026-02-22 사후분석)
**문제**: `equipped_minimi_id`가 DB에서 UUID 타입인데 코드는 TEXT slug를 저장 → `invalid input syntax for type uuid` 에러
**원인**: `ADD COLUMN IF NOT EXISTS`가 이미 UUID로 존재하던 컬럼을 무시하고, 마이그레이션 SQL은 만들어만 놓고 실행하지 않음
**해결**: (1) 마이그레이션 작성 시 기존 컬럼 타입 확인 (2) SQL 실행까지 완료해야 "작업 완료" (3) API 호출 테스트로 검증
**교훈**: 코드만 바꾸고 DB는 안 바뀌면 유저 입장에서는 아무것도 안 바뀐 것임

---

## 무료/베이직/프리미엄 회원 제한

| 기능 | 무료 | 베이직 (월 7,900원) | 프리미엄 (월 14,900원) |
|-----|-----|-------------------|---------------------|
| AI 펫톡 | 하루 10회 | 하루 50회 | 무제한 |
| 반려동물 등록 | 1마리 | 3마리 | 10마리 |
| 사진 저장 | 펫당 50장 | 펫당 200장 | 펫당 1,000장 |
| AI 영상 | 평생 1회 | 월 3회 | 월 6회 |
| 메모리얼 펫톡 | 제한적 | 지원 | 지원 |
| 우선 고객 지원 | - | - | 지원 |

```typescript
// config/constants.ts - 중앙 관리
export const FREE_LIMITS = { PETS: 1, PHOTOS_PER_PET: 50, DAILY_CHATS: 10 };
export const BASIC_LIMITS = { PETS: 3, PHOTOS_PER_PET: 200, DAILY_CHATS: 50 };
export const PREMIUM_LIMITS = { PETS: 10, PHOTOS_PER_PET: 1000, DAILY_CHATS: Infinity };
export const PRICING = { BASIC_MONTHLY: 7900, PREMIUM_MONTHLY: 14900 };

// AuthContext.tsx - DB 기반 프리미엄 체크 (완료)
const isPremium = data?.is_premium && (!expiresAt || new Date(expiresAt) > new Date());
```

---

## 관리자 시스템

```typescript
// config/constants.ts
export const ADMIN_EMAILS = ["sharkwind1@gmail.com"];

// Layout.tsx에서 관리자 탭 조건부 표시: 이메일 OR DB is_admin
{(isAdmin(user?.email) || profile?.is_admin) && <AdminTab />}

// API에서 관리자 검증: 이메일 + DB is_admin 이중 체크
// src/lib/supabase-server.ts의 getAuthUser() + profiles.is_admin
```

---

## AI 펫톡 처리 흐름 (코드 수정 시 필독)

```
유저 메시지
  → sanitizeInput (XSS 방지)
  → detectCrisis (자해/위기 감지)
  → detectEmergencyKeywords (반려동물 응급 증상)
  → isCareRelatedQuery (케어 질문이면 케어 프롬프트 삽입, 아니면 토큰 절약)
  → isFirstChat (chatHistory.length === 0이면 온보딩 프롬프트)
  → analyzeEmotion (감정 분석 + 추모 모드면 애도 단계)
  → getPetMemories (DB에서 장기 메모리 로드)
  → getPersonalityBehavior (성격→말투 매핑, 7종x2모드=14분기)
  → getDailySystemPrompt / getMemorialSystemPrompt (모드별 프롬프트 생성)
  → GPT-4o-mini 호출
  → SUGGESTIONS 파싱 (---SUGGESTIONS--- 마커)
  → PENDING_TOPIC 파싱 (---PENDING_TOPIC--- 마커)
  → filterMemorialSuggestions (추모 모드면 간식/케어 키워드 필터)
  → extractKeywordsFromReply → pet_media 캡션 매칭 (사진 연동)
  → 느낌표 후처리 (추모 모드면 "!!!" → ".", "!!" → "~")
  → validateAIResponse (약 용량/브랜드/단정/확률/사람약 체크)
  → saveAutoTimelineEntry (10턴마다 자동 타임라인)
  → DB 저장 + 응답 반환
```

---

## 자주 수정하는 파일

```
src/types/index.ts              # 타입 추가/수정
src/contexts/PetContext.tsx     # 펫 데이터 로직
src/app/api/chat/route.ts       # AI 펫톡 핸들러+인증
src/app/api/chat/chat-helpers.ts # AI 펫톡 컨텍스트/유틸
src/app/api/chat/chat-prompts.ts # AI 시스템 프롬프트
src/lib/agent/*.ts              # AI 에이전트 모듈
src/components/pages/*.tsx      # 각 페이지 UI
src/config/apiEndpoints.ts      # API URL 상수
src/config/constants.ts         # 제한/가격/관리자 이메일
```

---

## 작업 규칙 (RELAY에서 이동)

- **Claude Code 실행 시 반드시 `claude --dangerously-skip-permissions` 로 시작**
- 커밋/푸시는 물어보지 말고 바로 진행
- 빌드 확인 필수 (`next build`)
- AGENTS.md의 서브에이전트 오케스트레이션 방식 준수
- **DB 변경이 포함된 작업은 SQL 실행까지 완료해야 "완료"**
- 모달 스크롤 안 되면 `PetFormModal.tsx` 224~264줄 패턴 적용

---

## 서브에이전트 오케스트레이션

> 상세 팀 구성(8명), 역할별 판단 기준, 호출 패턴 → **AGENTS.md** 참고.

핵심 원칙:
- 권한 받으면 물어보지 말고 실행
- 디자인 작업은 3번(UX) + 4번(비주얼) 피드백 후 구현
- 모든 주요 결과물은 7번(비판적 사고) 검증 필수

---

## 개발자 정보

- **이름**: 안승빈
- **상황**: 풀스택 부트캠프 수료 예정 (2026년 3월)
- **목표**: MVP 런칭 → 창업지원금 신청
