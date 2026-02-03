# 메멘토애니 개발 마일스톤 및 작업 일지

> 반려동물 추모 및 기록 커뮤니티 플랫폼
> 프로젝트 기간: 2026.01.14 ~ 현재

---

## 📊 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **서비스명** | 메멘토애니 (Memento Ani) |
| **도메인** | https://mementoani.com |
| **기술 스택** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **백엔드** | Supabase (PostgreSQL + Auth + Storage) |
| **AI** | OpenAI GPT-4o-mini |
| **배포** | Vercel |

---

## 🗓️ 일자별 작업 일지

### 2026-01-14 (Day 1) - 프로젝트 초기화
- [x] Create Next App으로 프로젝트 생성
- [x] 기본 폴더 구조 설정
- [x] Tailwind CSS, TypeScript 설정

---

### 2026-01-15 (Day 2) - 기본 구조 설정
- [x] 초기 커밋 및 Git 설정
- [x] 기본 컴포넌트 구조 설계

---

### 2026-01-20 (Day 7) - 인증 및 홈 UI
- [x] Supabase 연동
- [x] 인증 시스템 구현 (회원가입/로그인)
- [x] 마이페이지 구현
- [x] 홈페이지 UI 정리
- [x] 갤러리 구조 설계

---

### 2026-01-29 (Day 16) - MVP 70% 완성
**주요 기능:**
- [x] AI 펫톡 UI 구현
- [x] 소셜 로그인 기반 구축 (Google, Kakao)
- [x] 앨범 업로드 기능
- [x] 반려동물 프로필 관리
- [x] 타임라인 기록 기능

---

### 2026-02-02 (Day 20) - 대규모 리팩토링
**리팩토링:**
- [x] 대규모 컴포넌트 분리
- [x] RecordPage 컴포넌트 모듈화
- [x] 모바일 반응형 최적화
- [x] 자동스크롤 성능 개선

---

### 2026-02-03 (Day 21) - 배포 및 기능 고도화 ⭐

#### 오전: 배포 이슈 해결
- [x] Vercel 배포 설정
- [x] 빌드 시점 환경변수 에러 수정 (지연 초기화)
- [x] force-dynamic 설정 추가
- [x] AdminPage React Hook 순서 에러 수정

#### 오후: 핵심 기능 구현
**커뮤니티 시스템:**
- [x] 게시글 CRUD API (`/api/posts`)
- [x] 좋아요/댓글 기능
- [x] DB 마이그레이션 실행

**OAuth 소셜 로그인:**
- [x] Google OAuth 설정 (Google Cloud Console)
- [x] Kakao OAuth 설정 (Kakao Developers)
- [x] 카카오 개인개발자 등록 (이메일 스코프)
- [x] OAuth 뒤로가기 시 무한로딩 버그 수정

**관리자 대시보드:**
- [x] 실제 데이터 연동 (회원수, 펫수, 게시물)
- [x] Recharts 그래프 추가 (주간 가입/채팅 추이)
- [x] profiles 테이블 생성 및 트리거 설정

**AI 펫톡 개선:**
- [x] chat_messages DB 저장 문제 해결 (Service Role Key)
- [x] 응답 토큰 증가 (150→300, 200→400)
- [x] 리마인더 API 에러 처리 개선

#### 저녁: UI/UX 개선
**로고 적용:**
- [x] 새 로고 디자인 적용
- [x] 가로형 로고로 변경
- [x] 파비콘 및 OG 이미지 설정

**반응형 및 상태 유지:**
- [x] 다크모드 localStorage 저장
- [x] 탭 상태 URL 파라미터 저장 (`?tab=ai-chat`)
- [x] 새로고침해도 상태 유지

**헤더 레이아웃:**
- [x] 로고 크기 조정
- [x] 네비게이션 반응형 개선 (lg → xl)
- [x] 모바일 버튼 정렬 수정
- [x] 다크모드 로고 스타일링

---

## 📁 현재 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API Routes
│   │   ├── chat/           # AI 펫톡
│   │   ├── posts/          # 커뮤니티
│   │   └── reminders/      # 리마인더
│   └── auth/callback/      # OAuth 콜백
├── components/
│   ├── pages/              # 페이지 컴포넌트 (9개)
│   ├── features/           # 기능별 컴포넌트
│   ├── common/             # 공통 (Layout, Footer)
│   ├── ui/                 # shadcn/ui
│   └── modals/             # 모달
├── contexts/               # 전역 상태 (Auth, Pet)
├── lib/                    # 유틸리티
└── types/                  # TypeScript 타입
```

---

## 🗄️ 데이터베이스 테이블

| 테이블 | 설명 | RLS |
|--------|------|-----|
| `pets` | 반려동물 프로필 | ✅ |
| `pet_media` | 사진/영상 | ✅ |
| `timeline_entries` | 타임라인 일기 | ✅ |
| `chat_messages` | AI 채팅 메시지 | ✅ |
| `pet_memories` | AI 장기 메모리 | ✅ |
| `pet_reminders` | 케어 리마인더 | ✅ |
| `conversation_summaries` | 대화 요약 | ✅ |
| `community_posts` | 커뮤니티 게시글 | ✅ |
| `memorial_posts` | 추모 게시글 | ✅ |
| `profiles` | 사용자 프로필 | ✅ |

---

## ✅ 완료된 주요 기능

### 핵심 기능
- [x] 반려동물 등록/관리 (다중 펫 지원)
- [x] 사진/영상 업로드 및 갤러리
- [x] 타임라인 기록 (일기)
- [x] AI 펫톡 (일상/추모 모드)
- [x] 커뮤니티 게시판
- [x] 리마인더 시스템

### 인증/보안
- [x] 이메일 회원가입/로그인
- [x] Google OAuth
- [x] Kakao OAuth
- [x] Row Level Security (RLS)

### 관리자
- [x] 관리자 대시보드
- [x] 실시간 통계 그래프
- [x] 게시물 관리

### UX
- [x] 다크모드 (저장됨)
- [x] 탭 상태 URL 유지
- [x] 모바일 반응형
- [x] 로고 및 브랜딩

---

## 🔜 TODO (향후 작업)

### 우선순위 높음
- [ ] 모바일 UI 전체 점검 및 수정
- [ ] 결제 시스템 연동 (포트원)
- [ ] 프리미엄 구독 기능
- [ ] 푸시 알림 (리마인더)

### 우선순위 중간
- [ ] AI 모델 업그레이드 (gpt-4o)
- [ ] 이미지 생성 AI 연동
- [ ] 분실동물 실제 데이터 연동
- [ ] 입양정보 실제 데이터 연동

### 우선순위 낮음
- [ ] 다국어 지원
- [ ] PWA 지원
- [ ] 소셜 공유 기능 강화

---

## 📈 성과 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| MVP 완성도 | 85% | 100% |
| 페이지 수 | 9개 | - |
| API 엔드포인트 | 12개 | - |
| DB 테이블 | 10개 | - |

---

## 🔧 환경변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=
```

---

## 📝 참고 문서

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

---

*마지막 업데이트: 2026-02-03*
