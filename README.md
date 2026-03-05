# Memento Ani (메멘토애니)

반려동물과 함께하는 모든 순간을 기록하고, 이별 후에도 따뜻한 추억을 간직할 수 있는 메모리얼 커뮤니티 플랫폼.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| UI | Radix UI + shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| AI | OpenAI GPT-4o-mini |
| 배포 | Vercel |

## 로컬 개발 시작하기

```bash
git clone <repository-url>
cd memento-ani
npm install
cp .env.local.example .env.local  # 아래 환경변수 섹션 참고
npm run dev
```

`http://localhost:3000`에서 확인.

### 필요한 외부 서비스

- **Supabase** : 프로젝트 생성 후 URL, Anon Key, Service Role Key 확보
- **OpenAI** : API Key 발급

## 환경변수

`.env.local` 파일에 아래 변수를 설정한다.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

## 프로젝트 구조

```
src/
  app/           # Next.js App Router (페이지, API 라우트)
  components/
    pages/       # 탭별 메인 페이지 컴포넌트
    common/      # Layout, Footer 등 공통 컴포넌트
    features/    # 기능 단위 컴포넌트
    modals/      # 모달 컴포넌트
    ui/          # shadcn/ui 기본 컴포넌트
  contexts/      # AuthContext, PetContext (전역 상태)
  config/        # 상수, API 엔드포인트, 제한값
  lib/           # Supabase 클라이언트, AI 에이전트, 유틸
  types/         # 타입 정의 (중앙 관리)
  hooks/         # 커스텀 훅
  data/          # 정적 데이터
```

## 주요 페이지

| 탭 | 컴포넌트 | 설명 |
|----|----------|------|
| 홈 | HomePage | 메인 대시보드 |
| 우리의 기록 | RecordPage | 반려동물 사진/타임라인 |
| 커뮤니티 | CommunityPage | 게시판, 추모 게시판 |
| AI 펫톡 | AIChatPage | AI 반려동물 대화 |
| 입양정보 | AdoptionPage | 입양 공고 |
| 지역정보 | LocalPage | 지역 커뮤니티 |
| 분실동물 | LostPage | 분실/발견 신고 |
| 펫매거진 | MagazinePage | AI 생성 매거진 |

일상(active) 모드와 추모(memorial) 모드로 나뉘며, 반려동물 상태에 따라 테마와 기능이 분기된다.

## DB 마이그레이션

마이그레이션 파일은 `supabase/migrations/` 디렉토리에 있다. 새 마이그레이션 추가 시 날짜 프리픽스(`YYYYMMDD_`)를 사용한다.

## 배포

Vercel에 연결하여 `main` 브랜치 푸시 시 자동 배포된다. 환경변수는 Vercel 프로젝트 설정에서 등록한다.

## 컨벤션

- **타입 중앙 관리** : 모든 타입은 `src/types/index.ts`에서 정의하고 import한다. 컴포넌트 내 자체 타입 정의 금지.
- **에러 처리** : API 호출 실패 시 반드시 사용자에게 피드백을 제공한다.
- **모바일 반응형** : 모든 UI는 모바일 우선으로 구현한다.
- **이모지 사용 금지** : 코드와 UI 모두 이모지를 사용하지 않는다.

## 참고 문서

- `CLAUDE.md` : AI 에이전트용 상세 프로젝트 컨텍스트
- `RELAY.md` : 현재 진행 중인 작업 목록
