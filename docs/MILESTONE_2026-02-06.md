# 메멘토애니 마일스톤 정리
**날짜**: 2026년 2월 6일
**버전**: MVP 개발 진행 중

---

## 1. 프로젝트 개요

### 서비스 소개
**메멘토애니**는 반려동물을 떠나보낸 사람들을 위한 메모리얼 커뮤니티 플랫폼입니다.

- **일상 모드**: 현재 함께하는 반려동물 케어 & AI 대화
- **추모 모드**: 무지개다리를 건넌 반려동물과의 치유 대화

### 기술 스택
| 영역 | 기술 |
|------|------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Supabase |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth) |
| AI | OpenAI GPT-4o-mini |
| Storage | Supabase Storage |
| Deployment | Vercel |

---

## 2. 아키텍처 구조

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── chat/          # AI 펫톡 API
│   │   ├── posts/         # 커뮤니티 게시글 API
│   │   └── reminders/     # 케어 리마인더 API
│   └── page.tsx           # 메인 페이지 (SPA 라우팅)
│
├── components/
│   ├── pages/             # 페이지 컴포넌트 (8개)
│   ├── features/          # 기능별 컴포넌트
│   │   ├── onboarding/    # 튜토리얼 & 온보딩
│   │   ├── chat/          # AI 채팅 유틸
│   │   ├── record/        # 기록 관련
│   │   └── reminders/     # 리마인더
│   ├── modals/            # 공통 모달
│   ├── ui/                # UI 컴포넌트 (shadcn 기반)
│   └── common/            # Layout, Footer 등
│
├── contexts/              # 전역 상태
│   ├── AuthContext.tsx    # 인증 상태
│   └── PetContext.tsx     # 반려동물 데이터
│
├── lib/                   # 유틸리티 & 서비스
│   ├── rate-limit.ts      # Rate Limiting & VPN 차단
│   ├── agent.ts           # AI 에이전트 (감정분석, 메모리)
│   ├── supabase.ts        # Supabase 클라이언트
│   └── storage.ts         # 미디어 스토리지
│
└── constants/             # 상수 정의
```

---

## 3. 주요 기능 현황

### 3.1 사용자 인증 ✅
- Google OAuth 로그인
- 세션 기반 인증 (Supabase)
- 프로필 관리

### 3.2 반려동물 관리 ✅
- 반려동물 등록 (4단계 폼)
  - 기본 정보 (이름, 종류, 품종, 성별)
  - 상세 정보 (생일, 체중, 성격)
  - AI 개인화 (별명, 좋아하는 것, 습관)
  - 추모 정보 (추모 모드용)
- 프로필 사진 & 앨범 관리
- 일상/추모 모드 전환

### 3.3 AI 펫톡 ✅
- 반려동물 시점 1인칭 대화
- 감정 인식 & 애도 단계 분석
- 개인화 정보 활용:
  - 별명, 좋아하는 음식/활동/장소
  - 특별한 습관, 만난 날
  - 타임라인 일기, 사진 캡션
  - 케어 리마인더 일정
- 일일 무료 10회 (프리미엄: 무제한)

### 3.4 커뮤니티 ✅
- 게시글 CRUD
- 좋아요 기능
- 댓글 기능
- 뱃지 시스템 (일상/추모)

### 3.5 케어 리마인더 ✅
- 산책, 식사, 약, 예방접종 등
- 매일/매주/매월 스케줄
- AI 펫톡과 연동

### 3.6 온보딩 & 튜토리얼 ✅
- 스포트라이트 튜토리얼 (앱 소개)
- 온보딩 모달 (유저 타입 파악)
- 유저 타입별 안내 (예비/현재/추모)
- Record 페이지 스포트라이트

### 3.7 기타 페이지
- 홈 (갤러리 + 커뮤니티 미리보기)
- 펫 매거진 (정보 콘텐츠)
- 입양 정보 (외부 API 연동)
- 지역 정보 (동물병원, 미용실)
- 분실 동물 찾기

---

## 4. 보안 구현 현황 ✅

### 4.1 인증 & 인가
| API | 인증 방식 | 소유권 검증 |
|-----|----------|------------|
| /api/chat | 세션 | - |
| /api/posts | 세션 | ✅ |
| /api/posts/[id] | 세션 | ✅ |
| /api/posts/[id]/like | 세션 | - |
| /api/reminders | 세션 | ✅ |
| /api/reminders/[id] | 세션 | ✅ |

### 4.2 Rate Limiting
```typescript
RATE_LIMITS = {
    general: { window: 60초, max: 60회 },
    aiChat: { window: 60초, max: 10회, daily: 50/200 },
    auth: { window: 15분, max: 10회 },
    write: { window: 60초, max: 5회 },
}
```

### 4.3 VPN/프록시 차단
- 3단계 감지: IP 대역 → 헤더 → API
- 알려진 VPN/데이터센터 IP 차단
- IPInfo API 연동 지원

### 4.4 입력값 검증
- XSS 방지 (sanitizeInput)
- SQL Injection 방지 (Supabase ORM)
- 길이 제한 적용

---

## 5. 최근 작업 내역 (2026-02-06)

### 5.1 보안 강화
- [x] IP 기반 Rate Limiting 적용
- [x] VPN/프록시 감지 및 차단
- [x] 모든 API 세션 기반 인증으로 변경
- [x] 입력값 sanitize 적용

### 5.2 AI 개인화 연결
- [x] 개인화 필드 9개 AI API에 전달
- [x] getPersonalizationContext() 함수 추가
- [x] 시스템 프롬프트에 개인화 정보 포함

### 5.3 튜토리얼 버그 수정
- [x] 중복 표시 방지 (localStorage 우선 체크)
- [x] DB 동기화 로직 개선

### 5.4 UX 개선
- [x] 로딩 애니메이션 통일 (발바닥 PawLoading)
- [x] 홈 카드 자동 스크롤 버그 수정

---

## 6. 핵심 파일 가이드

### 6.1 데이터 흐름
```
PetContext.tsx (전역 상태)
    ↓
AIChatPage.tsx (UI)
    ↓
/api/chat/route.ts (API)
    ↓
OpenAI GPT-4o-mini
```

### 6.2 주요 파일 설명

| 파일 | 역할 |
|------|------|
| `src/contexts/PetContext.tsx` | 반려동물 데이터 전역 관리, Supabase 연동 |
| `src/contexts/AuthContext.tsx` | 인증 상태 관리 |
| `src/app/api/chat/route.ts` | AI 펫톡 API, 개인화 프롬프트 생성 |
| `src/lib/rate-limit.ts` | 보안 유틸 (Rate Limit, VPN 차단) |
| `src/lib/agent.ts` | AI 에이전트 (감정분석, 메모리 추출) |
| `src/app/page.tsx` | 메인 라우터, 온보딩 플로우 제어 |
| `src/components/pages/AIChatPage.tsx` | AI 펫톡 UI |
| `src/components/pages/RecordPage.tsx` | 마이페이지 (펫 관리, 앨범) |

---

## 7. 데이터베이스 스키마

### 주요 테이블
- `profiles` - 유저 프로필, 온보딩 상태
- `pets` - 반려동물 정보 (개인화 필드 포함)
- `pet_media` - 사진/영상
- `pet_reminders` - 케어 리마인더
- `ai_chats` - AI 대화 기록
- `community_posts` - 커뮤니티 게시글
- `post_likes` - 좋아요
- `post_comments` - 댓글
- `timeline_entries` - 타임라인 일기
- `pet_memories` - AI 추출 메모리

---

## 8. 남은 작업 (TODO)

### 8.1 필수 (MVP)
- [ ] 결제 연동 (포트원)
- [ ] 프리미엄 구독 기능
- [ ] 도메인 설정 & 배포

### 8.2 개선
- [ ] Redis 기반 Rate Limiting (현재: 인메모리)
- [ ] IPInfo 토큰 발급 (VPN 탐지 정확도 향상)
- [ ] 이미지 최적화 (CDN, 리사이징)

### 8.3 추가 기능
- [ ] 푸시 알림
- [ ] 추모 굿즈 연동
- [ ] B2B 대시보드 (동물병원/장례식장)

---

## 9. 개발 환경 설정

```bash
# 의존성 설치
npm install

# 개발 서버
npm run dev

# 타입 체크
npx tsc --noEmit

# 빌드
npm run build
```

### 환경변수 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
IPINFO_TOKEN= (선택)
```

---

## 10. 커밋 히스토리 (최근 15개)

```
aaf657d fix: 튜토리얼 중복 표시 방지
e5f6e8b feat: AI 펫톡 개인화 필드 연결
12c82d4 feat: 모든 API 엔드포인트 보안 강화
ad7f8af feat: VPN/프록시 감지 및 차단 기능 추가
59de6cf feat: IP 기반 보안 강화 및 Rate Limiting 적용
330d93c feat: 로딩 애니메이션 발바닥(PawLoading)으로 통일
bab7e11 style: 로딩 애니메이션 발자국 총총총으로 변경
9525df3 fix: 홈 카드 자동 스크롤 - 소수점 누적 문제 해결
dd4004c fix: 홈 카드 자동 스크롤 - 마운트 시 자동 시작으로 변경
eee4eba fix: 홈 카드 자동 스크롤 성능 수정
2eab855 fix: 반려동물 등록 중복 생성 버그 수정
46b4e99 feat: 반려동물 등록 폼 4단계로 확장 (AI 펫톡 개인화)
0d3ceb4 fix: PostOnboardingGuide 페이지 이동 타이밍 수정
e49786f feat: 유저 타입별 개인화 플로우 및 Record 페이지 스포트라이트 튜토리얼
614c2ae feat: 온보딩/튜토리얼 완료 상태 DB 저장 및 동기화
```

---

*문서 작성: Claude Opus 4.5*
*마지막 업데이트: 2026-02-06*
