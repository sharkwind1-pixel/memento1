# AGENTS.md - 메멘토애니 프로젝트 컨벤션

> AI 에이전트가 작업 시 참고하는 규칙과 학습 내용
> Ralph Loop 실행 시 자동으로 읽힘

---

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── auth/              # 인증 관련
│   └── page.tsx           # 메인 SPA 라우터
├── components/
│   ├── Auth/              # 인증 모달
│   ├── features/          # 기능별 컴포넌트
│   │   ├── home/         # 홈 피드
│   │   ├── record/       # 기록/추모
│   │   ├── messages/     # 메시지
│   │   └── ...
│   ├── layout/           # 레이아웃 컴포넌트
│   └── ui/               # 공통 UI 컴포넌트
├── constants/             # 상수 정의
├── contexts/              # React Context (Auth, Pet)
├── lib/                   # 유틸리티, Supabase 클라이언트
└── types/                 # 타입 정의 (index.ts에 통합)
```

---

## 코딩 컨벤션

### 타입 정의
- **모든 타입은 `src/types/index.ts`에 정의**
- 컴포넌트 내 interface/type 정의 금지
- 새 타입 추가 시 적절한 섹션에 추가

### 컴포넌트
- 함수형 컴포넌트 + Hooks 사용
- 파일명: PascalCase (예: PetFormModal.tsx)
- 한글 주석으로 설명 (한국어 개발자 타겟)

### 스타일링
- Tailwind CSS 사용
- 인라인 스타일 최소화
- 모바일 퍼스트 (기본 모바일, md/lg/xl로 확장)

### 상태 관리
- 전역: React Context (AuthContext, PetContext)
- 로컬: useState, useReducer
- 서버: Supabase Realtime (필요 시)

---

## Supabase 규칙

### 테이블 네이밍
- snake_case (예: user_points, point_history)
- 복수형 사용 (예: pets, posts, comments)

### RLS (Row Level Security)
- 모든 테이블에 RLS 활성화 필수
- 사용자 본인 데이터만 접근 가능하도록 정책 설정

### 현재 테이블 구조
- users: 사용자 프로필
- pets: 반려동물 정보
- posts: 커뮤니티 게시글
- comments: 댓글
- likes: 좋아요
- messages: DM 메시지
- timelines: 타임라인 엔트리

---

## 모바일 최적화 필수

### 터치 최적화
```css
touch-action: manipulation;  /* 300ms 딜레이 제거 */
-webkit-tap-highlight-color: transparent;
```

### Safe Area
```css
padding-bottom: env(safe-area-inset-bottom);
```

### 스크롤
```css
-webkit-overflow-scrolling: touch;
overscroll-behavior: contain;
```

### 모달/바텀시트
- 모바일: 하단 시트 형태
- 데스크톱: 중앙 모달
- 키보드 올라올 때 뷰포트 조정

---

## 디자인 시스템

### 컬러 팔레트
```
Primary: #38bdf8 (하늘색)
Secondary: #a78bfa (연보라)
Accent: #fbbf24 (따뜻한 황금)
Background: #f0f9ff ~ #faf5ff (그라데이션)
```

### UI 원칙
- 글래스모피즘 (backdrop-blur, 반투명)
- 부드러운 곡선 (rounded-2xl, rounded-3xl)
- 심플함 유지 (시니어 사용자 고려)
- 이모지 사용 금지

### 메시지 톤
- 완곡하고 은은한 표현
- "마음이 전달되었습니다"
- "소중한 추억이 기록되었습니다"
- 직접적 죽음/천국 언급 피함

---

## 알려진 이슈 & 해결책

### 1. JSX 따옴표 이스케이프
- 문제: JSX 내 한글 따옴표 사용 시 빌드 에러
- 해결: `"텍스트"` → `&quot;텍스트&quot;`

### 2. Vercel 빌드 실패
- 문제: 로컬에서 되는데 Vercel에서 안 됨
- 해결: `npm run build` 로컬에서 먼저 확인

### 3. 모바일 스크롤 안 됨
- 문제: iOS에서 모달 내부 스크롤 불가
- 해결: `-webkit-overflow-scrolling: touch` + `overscroll-behavior: contain`

### 4. 모바일 버튼 클릭 안 됨
- 문제: 버튼이 뷰포트 밖으로 밀림
- 해결: `pb-[env(safe-area-inset-bottom)]` + 고정 높이 대신 max-height 사용

---

## 커밋 컨벤션

```
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅 (기능 변경 없음)
refactor: 리팩토링
perf: 성능 개선
test: 테스트 추가
chore: 빌드, 설정 등 기타
```

---

## Ralph Loop 학습 기록

> 작업 중 발견한 패턴, 주의사항 기록

### 2024-02-08
- 초기 설정 완료
- PRD.md, AGENTS.md 생성

---

## 다음 에이전트에게

1. PRD.md의 체크박스 확인하고 미완료 항목 작업
2. 작업 완료 시 체크박스 업데이트
3. 에러 발생 시 이 파일의 "알려진 이슈" 섹션에 추가
4. 커밋은 기능 단위로
5. 모바일 테스트 필수 (특히 iOS Safari)
