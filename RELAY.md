# 릴레이

> **새 세션 필독**: 아래 TODO 우선순위와 "완료된 핵심 기능"을 반드시 먼저 읽고 작업할 것.

---

## TODO 우선순위 (새 세션 필독)

### ~~0. 즉시 — 홈 화면 디자인 마무리~~ ✅ 완료 (2026-03-24 확인)
- [x] **펫매거진 카드 썸네일**
- [x] **추모모드 amber 톤 통일**
- [x] **인기 이야기 / 함께 보기 카드 높이 통일**

### ~~1. DB 마이그레이션 6개~~ ✅ 전부 실행 완료 (2026-03-24 DB 확인)
| SQL | 상태 |
|-----|------|
| `20260226_chat_mode_column.sql` | ✅ 실행됨 |
| `20260226_security_fixes.sql` | ✅ 실행됨 |
| `20260225_push_preferred_hour.sql` | ✅ 실행됨 |
| `placed_minimi JSONB` | ✅ 실행됨 |
| `20260226_memory_albums.sql` | ✅ 실행됨 |
| `20260222_minimi_system.sql` | ✅ 실행됨 |

### 2. MVP 런칭 필수 — 결제 연동 + 프리미엄 전환 UX
- [ ] 포트원(PortOne) 결제 연동 — 프리미엄 구독 실결제
- [ ] 스마트 프리미엄 전환 UX — isWarning(3회 남음) + 직전 대화 주제 반영 동적 문구

### 3. AI 펫톡 킬러 기능 — 대화 내보내기 + 사진 연동
- [ ] 대화 내보내기 (편지/카드) — AI 대화를 예쁜 카드 이미지로 변환+저장+공유
- [ ] 대화 내 사진 연동 — AI 추억 언급 시 pet_media 캡션 매칭 사진 썸네일 표시

### 4. AI 프롬프트 개선 — Phase 3
- [ ] 감각 기반 기억 — 추모 프롬프트에 오감 묘사 지시
- [ ] 감정 거울링 3단계 — 인정→공유→연결 순서 명시
- [ ] 시간대별 에너지 — 밤엔 졸린 톤, 아침엔 어벙한 톤
- [ ] pending_topic — "다음에 물어볼 것" 메모리 타입

### 4-1. 즉시 — AI 펫톡 케어 응답 품질 강화 (SaaS 수준)

> **문제**: 케어 질문(입질, 분리불안, 건강 등)에 "간식 줘봐~" 수준의 얕은 답변만 나옴. 심지어 **틀린 답변**도 함 (짖을 때 간식 → 짖는 행동 강화).
> **원인**: `care-reference.ts`에 건강/음식/질병만 있고, 행동 교정/훈련 레퍼런스가 없음. GPT가 일반 상식으로 답하면 오답 위험.
> **해결 방식**: **웹 서치 RAG (Retrieval-Augmented Generation)** — 케어 질문 감지 시 실시간 웹 검색 후 검색 결과를 GPT 컨텍스트에 주입.
> **목표**: 전문 훈련사/수의사 수준의 구체적 단계별 가이드 제공 → 유료 서비스 가치 창출.

#### 4-1-핵심. 웹 서치 RAG 파이프라인 구현

**흐름**:
```
유저 케어 질문 → isCareRelatedQuery 감지
  → 검색 쿼리 생성 (GPT or 키워드 추출)
  → 웹 검색 API 호출 (Google/Bing/Tavily 중 선택)
  → 상위 3개 결과 스니펫 추출
  → GPT 시스템 프롬프트에 "## 참고 자료" 섹션으로 주입
  → GPT가 참고 자료 기반으로 구체적 답변 생성
```

**구현 파일**:
| 파일 | 작업 |
|------|------|
| `src/lib/care-search.ts` | **신규** — 웹 검색 + 결과 가공 함수 |
| `src/app/api/chat/route.ts` | **수정** — isCareQuery일 때 care-search 호출 후 컨텍스트 주입 |
| `src/app/api/chat/chat-prompts.ts` | **수정** — 케어 모드에 "참고 자료 기반 답변" 규칙 추가 |

**검색 API 후보** (비용순):
1. **Tavily Search API** — AI 전용, $0.001/검색, 스니펫 자동 추출 (추천)
2. **Google Custom Search** — $5/1000검색, 설정 복잡
3. **Bing Search API** — $3/1000검색

**비용 예측**: 일일 케어 질문 100건 * $0.001 = 일 $0.1, 월 $3

**프롬프트 변경**:
```
## 참고 자료 (케어 질문 시 자동 검색됨)
아래는 신뢰할 수 있는 출처에서 검색된 정보입니다. 이 정보를 바탕으로 답변하되, 캐릭터 톤은 유지합니다.
- 원인을 먼저 설명
- 단계별 방법 제시 (1→2→3)
- "하면 안 되는 것" 명시
- 심각하면 "수의사/훈련사 상담 권장" 안내
{searchResults}
```

**주의사항**:
- 일상 잡담에는 검색 안 함 (isCareRelatedQuery가 true일 때만)
- 검색 실패 시 기존 care-reference.ts 폴백
- 응답 속도: 검색 추가로 1-2초 지연 예상 → 스트리밍으로 체감 최소화

#### 4-1-A. care-reference.ts에 행동 교정 섹션 추가

추가할 카테고리:

| 카테고리 | 세부 항목 | 예시 질문 |
|---------|----------|----------|
| **입질/깨물기** | 둔감화 훈련 4단계, 발/귀/꼬리 민감 부위별 대응, 강아지 vs 성견 구분 | "발 닦을 때 물려고 해" |
| **분리불안** | 증상 체크리스트, 단계별 훈련(5분→30분→1시간), 환경 조성 | "혼자 두면 짖어" |
| **짖음** | 요구성 짖음 vs 경계 짖음 vs 불안 짖음 구분, 각각 대응법 | "택배 오면 미친 듯이 짖어" |
| **배변 훈련** | 장소 유도, 타이밍(식후 15분), 실수 시 대응, 성견 재훈련 | "자꾸 아무데나 싸" |
| **산책 문제** | 리드 당기기, 다른 개 만나면 흥분, 주워먹기, 하네스 거부 | "산책 때 줄을 너무 당겨" |
| **공격성** | 자원 보호(밥그릇/장난감), 타견 공격성, 전문가 의뢰 기준 | "밥그릇 건드리면 으르렁거려" |
| **파괴행동** | 원인 분석(에너지/불안/치아), 환경 관리, 대체 활동 | "가구를 다 물어뜯어" |

각 항목에 포함할 내용:
1. **왜 그런 행동을 하는지** (원인 설명 — 본능/학습/불안 등)
2. **단계별 훈련법** (구체적 스텝, 타이밍, 기간)
3. **절대 하면 안 되는 것** (체벌, 큰 소리, 억지로 잡기 등)
4. **전문가 의뢰 기준** (이 정도면 훈련사/수의사 가야 한다)
5. **견종별 차이** (가능하면 — 소형견/대형견, 품종 특성)

#### 4-1-B. 일상 모드 프롬프트 케어 응답 규칙 강화

현재 (chat-prompts.ts 102줄):
```
**케어**: 건강/음식/질병/일정 -> 수치 포함 3~5문장, 정확성 우선.
```

변경:
```
**케어**: 건강/음식/질병/행동/훈련 -> 원인 설명 + 단계별 방법 + 주의사항, 3~5문장, 정확성 우선. 캐릭터 역할보다 정보 전달 우선.
```

#### 4-1-C. isCareRelatedQuery 확장

현재 케어 키워드에 행동 관련 키워드 추가:
- 입질, 물어, 깨물, 짖, 분리불안, 배변, 산책, 리드, 으르렁, 파괴, 물어뜯, 훈련, 교정

#### 4-1-D. 좋은/나쁜 케어 응답 few-shot 추가 (chat-prompts.ts)

```
유저: "발 닦을 때 깨물려고 해"
나쁨: "간식으로 주의를 분산시키고, 천천히 시도하면 좋겠어!"
좋음: "발은 민감한 부위라 본능적으로 지키려고 하는 거야. 둔감화 훈련이 필요해:
1단계 - 발 근처에 손만 가져가고, 안 물면 간식.
2단계 - 살짝 터치 후 간식. 3단계 - 잡고 닦기.
한 번에 하지 말고 매일 조금씩. 이미 물려고 하면 즉시 멈추고 다음에 다시.
절대 억지로 잡으면 안 돼 — 공포가 강화되거든."
```

#### 4-1-E. 비판 에이전트 검증 기준

- 케어 응답에 "원인"이 포함되어 있는가?
- "단계별"이 있는가? (1→2→3)
- "하면 안 되는 것"이 명시되어 있는가?
- "전문가 기준"이 필요한 경우 안내하는가?
- 견종/크기에 따라 다를 수 있다는 disclaimer가 있는가?

### 5. UI/UX 비주얼 — 애니메이션 + 깜빡임 확인
- [ ] 추모 별 float-up 애니메이션
- [ ] 타이핑 인디케이터 감성 텍스트 — "꼬리 흔들며 생각 중..."
- [ ] 발자국 버블 데코
- [ ] 모바일 깜빡임 테스트 — `e3aa66f` React.memo 적용 후 검증 필요

### 6. 기존 미완료 — 리팩토링 + 기타
- [ ] 대형 컴포넌트 분리: AIChatPage(1408줄), LostPage(1356줄)
- [ ] API URL 마이그레이션: 하드코딩 → apiEndpoints.ts 상수
- [ ] 치유의 여정 대시보드 (유저 비노출, DB만)
- [ ] 대화→타임라인 자동 생성
- [ ] 미니미 도감 + 터치 이펙트

---

## 2026-03-28 (금) — 게시판 자동 관리 + 추모 AI 전면 개선 [배포 완료]

> **상태**: 전부 main 머지 + Vercel 배포 완료

### 이 세션에서 한 것

| 기능 | 내용 |
|------|------|
| **게시판 자동 모더레이션** | 욕설/스팸/도배 필터 (content-filter.ts), AI 비동기 검토 (ai-moderation.ts), 신고 3건 자동 숨김 (DB 트리거) |
| **비추천 시스템** | post_dislikes 테이블, POST /api/posts/[id]/dislike, 비추천 20개 자동 숨김, +5P/-5P 포인트 |
| **댓글 좋아요/비추천** | comment_likes/comment_dislikes 테이블, API 2개, PostDetailView UI |
| **욕설 우회 감지** | 숫자/특수문자 끼워넣기 감지 (시1발→시발, 보.지→보지) |
| **홈 PostModal 제거** | 카드 클릭→커뮤니티 상세 이동 (댓글 삭제/좋아요/비추천 전부 동작) |
| **추모 AI 프롬프트 전면 재작성** | 시점 규칙(동물 POV), 자해 안전장치, 감정 회피 방지, 성격-규칙 충돌 해결 |
| **하이퍼파라미터 조정** | 추모 frequency_penalty 0.3→0.6, presence_penalty 0.5→0.7 |
| **ESLint 빌드 에러 수정** | @typescript-eslint/no-explicit-any off |
| **Hydration mismatch 해결** | 5개 파일 useState→useEffect 이동 (RecordPage, CommunityPage, LocalPage, AuthContext, Layout) |
| **홈 매거진 카드 배치** | justify-between 제거 |
| **RELAY.md 정리** | 0번/1번 완료 처리, 미실행 마이그레이션 완료 처리 |

### DB 마이그레이션 (이 세션에서 실행 완료)
- `20260324_auto_moderation.sql` — moderation_status/moderation_reason 컬럼, moderation_logs 테이블, post_dislikes 테이블, comment_likes/comment_dislikes 테이블, auto_hide_on_reports 트리거
- 커뮤니티 5개 게시판 공지글 INSERT

---

## 2026-02-26 (목) — AI 펫톡 품질 대폭 개선 [배포 완료]

> **상태**: 전부 main 푸시 + Vercel 배포 완료

### 이 세션에서 한 것 (커밋 6개, 전부 main 배포됨)

| # | 커밋 | 내용 |
|---|------|------|
| 1 | `fb2d2cf` | 할루시네이션 방지 프롬프트 최적화 — HALLUCINATION_GUARD_RULES 7섹션→4원칙+2 Few-shot으로 압축, isCareRelatedQuery 조건부 프롬프트 삽입 (잡담엔 케어 규칙 안 넣음 → 토큰 절약) |
| 2 | `42b630b` | AI 응답 후처리 검증 레이어 (validateAIResponse) — GPT 응답에서 약 용량/과도한 단정/브랜드명/확률 날조/사람 약 감지 후 코드 레벨 수정 |
| 3 | `83d6972` | AI 대화 품질 대폭 개선 — getPersonalityBehavior() 7성격 매핑 (활발/차분/호기심/겁쟁이/애교/도도/식탐), 추모 프롬프트 완전 재작성, filterMemorialSuggestions 코드 레벨 필터 |
| 4 | `bbf8dea` | 펫 전환 시 추천 질문 공유 버그 수정 — setSuggestedQuestions([]) 누락 |
| 5 | `8a46810` | 추천 질문 버튼 UX 개선 — flex-wrap + max-w-[200px] + truncate + 클릭 안정성 |
| 6 | `3e532f6` | **Phase 1 통합**: 프롬프트 30% 압축 + 추천 필터 fallback + validateAIResponse 오탐 3건 수정 + 신규 유저 첫 대화 강화 |

### 주요 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/app/api/chat/route.ts` | 시스템 프롬프트 ~30% 압축 (4,041→2,744자), getPersonalityBehavior() 7성격 매핑, filterMemorialSuggestions 블록리스트+fallback, isCareQuery 조건부 프롬프트, isFirstChat 첫 대화 감지, 추천 글자수 제한 30→20자 |
| `src/lib/care-reference.ts` | HALLUCINATION_GUARD_RULES 압축, CARE_FRAMING_RULES 압축(525→239자), validateAIResponse 함수 추가 + 오탐 3건 수정 (독성 음식 경고 보존, 유저 언급 브랜드 예외, 수분 섭취량 예외) |
| `src/components/features/chat/useAIChat.ts` | 펫 전환 시 setSuggestedQuestions([]) 추가 |
| `src/components/features/chat/ChatInputArea.tsx` | 추천 버튼 flex-wrap + max-w-[200px] + truncate + cursor-pointer |

### 현재 AI 펫톡 아키텍처 요약

```
유저 메시지 → sanitizeInput → 위기 감지 → 응급 감지
           → isCareRelatedQuery 판단 (케어 질문이면 케어 프롬프트 삽입)
           → isFirstChat 판단 (첫 대화면 온보딩 프롬프트 삽입)
           → 감정 분석 → 메모리 로드 → 시스템 프롬프트 생성
           → GPT-4o-mini 호출
           → SUGGESTIONS 파싱 → 추모 모드면 filterMemorialSuggestions
           → 추모 모드면 느낌표 후처리
           → validateAIResponse (케어 응답 검증)
           → DB 저장 + 응답 반환
```

### 7성격 매핑 (getPersonalityBehavior)

| 성격 | 일상 모드 | 추모 모드 |
|------|----------|----------|
| 활발 | 짧은 감탄사, 신난 어조 | 밝고 경쾌한 회상 |
| 차분 | 느긋한 톤, 여유 | 고요한 따뜻함 |
| 호기심 | 질문 많이 | 궁금해하는 관심 |
| 겁쟁이 | 조심스럽고 귀여운 | 쭈뼛하는 다정함 |
| 애교 | 응석부리기 | 달콤한 애정 표현 |
| 도도 | 자기 주장 강한 | 츤데레 |
| 식탐 | 음식 화제, 간식 노림 | 맛있는 것 관련 추억 |

---

### 다음에 할 것 (Phase 2~3)

**Phase 2 — 킬러 기능 (시연/과금용, 3-5일)**

| # | 작업 | 근거 | 소요 |
|---|------|------|------|
| 5 | **대화 내보내기 (편지/카드)** — AI 대화를 예쁜 카드 이미지로 변환+저장+공유 | 시연 임팩트 최상 + 바이럴 + 프리미엄 전용 가능 | 2-3일 |
| 6 | **스마트 프리미엄 전환 UX** — isWarning(3회 남음) 활용 + 직전 대화 주제 반영 동적 문구 | 수익 모델 실증 (창업지원금 핵심) | 1일 |
| 7 | **대화 내 사진 연동** — AI 추억 언급 시 pet_media 캡션 매칭 사진 썸네일 표시 | "진짜 내 강아지 같다" 핵심 트리거 | 2-3일 |

**Phase 3 — 프롬프트 + 비주얼 마무리 (3월 초)**

| # | 작업 | 효과 |
|---|------|------|
| 8 | 감각 기반 기억 — 추모 프롬프트에 오감 묘사 지시 | 감정적 공명 강화 |
| 9 | 감정 거울링 3단계 — 인정→공유→연결 순서 명시 | 진짜 위로 |
| 10 | 시간대별 에너지 — 밤엔 졸린 톤, 아침엔 어벙한 톤 | 자연스러움 향상 |
| 11 | pending_topic — "다음에 물어볼 것" 메모리 타입 | "기억하고 성장" 느낌 |
| 12 | 추모 별 float-up 애니메이션 | 고급스러움 |
| 13 | 타이핑 인디케이터 감성 텍스트 — "꼬리 흔들며 생각 중..." | 차별화 |
| 14 | 발자국 버블 데코 | 시각 차별화 |

**Phase 2~3 실행 시 주의:**
- 승빈님이 우선순위/순서 확인 후 진행
- 7번 비판 에이전트의 "절대 하지 말 것" 목록은 **존재하지 않는 기능을 비판한 것이므로 무시** (TTS 없음, 프로액티브 추모 푸시 없음, 감정 대시보드는 유저 노출 안 됨, 리인게이지먼트 알림 없음)

### 이전 Phase 2 미완료 항목 (2026-02-25 세션)

| 항목 | 내용 | 우선순위 |
|------|------|---------|
| P2-2 | 대화 속 사진 연결 `[PHOTO:id]` | 중 — Phase 2 #7과 통합 가능 |
| P2-4 | 치유의 여정 대시보드 (유저 비노출, DB만) | 중 |
| P2-5 | 대화→타임라인 자동 생성 | 낮 |
| P2-7 | 미니미 도감 + 터치 이펙트 | 낮 |

---

## 완료된 핵심 기능 (코드 + 배포 완료)

| 기능 | 핵심 파일 | 상태 |
|------|----------|------|
| **반려동물 CRUD** | `PetContext.tsx`, `PetFormModal.tsx`, `/api` routes | 완료 - 사진/영상 관리 포함 |
| **AI 펫톡** | `AIChatPage.tsx`, `useAIChat.ts`, `/api/chat/route.ts` | 완료 - GPT-4o-mini, 일상/추모 듀얼모드, 감정분석 |
| **케어 리마인더** | `RemindersPage.tsx`, `RemindersSection.tsx`, `ReminderPanel.tsx`, `/api/reminders` | 완료 - CRUD + 시간 설정 |
| **푸시 알림 시스템** | `PushNotificationBanner.tsx`, `push-notifications.ts`, `/api/notifications/subscribe`, `/api/cron/daily-greeting` | 완료 - VAPID + web-push + Service Worker + 크론 발송 |
| **리마인더↔푸시 자동 연동** | `ensurePushSubscription()` in `push-notifications.ts` | 완료 - 리마인더 저장 시 자동 푸시 구독 |
| **알림 거부 UX** | `AIChatPage.tsx`, `PushNotificationBanner.tsx` | 완료 - denied 시 OS별 설정 안내 배너/toast |
| **타임라인 일기** | `TimelineSection.tsx`, timeline API | 완료 - 편집 포함 |
| **듀얼 모드 (일상/추모)** | 전체 UI, `MemorialModeContext` | 완료 - 하늘색↔황금빛 테마 전환 |
| **무지개다리 세레모니** | `MemorialSwitchModal.tsx` | 완료 - 5단계 (마음의 준비→날짜→슬라이드쇼→작별인사→별이되다) |
| **튜토리얼** | `TutorialTour.tsx`, `RecordPageTutorial.tsx` | 완료 - 데스크톱 11스텝, 모바일 5스텝 |
| **미니홈피** | `MiniHomepyTab.tsx`, `MinihompyStage.tsx` | 완료 - 배경 8종, 멀티미니미 드래그&드롭 |
| **커뮤니티** | `CommunityPage.tsx`, `/api/posts` | 완료 - 5개 게시판, 좋아요/댓글/신고, 무한스크롤 |
| **프리미엄/무료 제한** | `AuthContext.tsx`, `PremiumModal.tsx` | 완료 - DB 기반 is_premium 체크 |
| **관리자 페이지** | `AdminPage.tsx` | 완료 - 사용자/게시물 관리 |
| **추억 앨범 (추모 전용)** | `MemoryAlbumsSection.tsx`, `MemoryAlbumViewer.tsx`, `/api/memory-albums`, cron Phase 1.75 | 완료 - 매일 자동 앨범 생성, 슬라이드쇼, 푸시 알림 |
| **Vercel 환경변수** | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Production 설정 완료 |

---

## [완료] 추억 앨범 (Memorial Memory Album) - 배포 대기

> **상태**: 코드 완료 + 빌드 성공. DB 마이그레이션 필요 (아래 미실행 마이그레이션 참고).

### 개요
추모 모드 전용 기능. 매월 1일 KST 09시에 반려동물 사진을 자동 수집하여 추억 앨범 생성.
푸시 알림으로 "도착했어요" 알림 → 우리의 기록 페이지에서 슬라이드쇼로 열람.

### 기념일 예외 앨범 (`22cdad4`)
매월 1일 외에도 기념일에 특별 앨범 자동 생성:

| 기념일 종류 | 조건 | 앨범 제목 예시 |
|------------|------|---------------|
| 생일 | MM-DD 일치 | "모카의 생일 추억 앨범" |
| 입양 100일 | 100/200/300... 일 | "모카과(와) 함께한 100일" |
| 입양 연도 | MM-DD 일치 + 365일 이상 | "모카과(와) 함께한 1년" |
| 추모 100일 | 100/200/300... 일 | "모카을(를) 추억하며 - 100일" |
| 추모 연도 | MM-DD 일치 + 365일 이상 | "모카을(를) 추억하며 - 1년" |

컨셉 타입: `birthday`, `adoption`, `memorial` (types/index.ts `MemoryAlbumConcept` 업데이트)

### 신규/수정 파일 (8개)

| 파일 | 작업 |
|------|------|
| `supabase/migrations/20260226_memory_albums.sql` | **신규** - memory_albums 테이블, RLS, 인덱스 |
| `src/types/index.ts` | MemoryAlbum, MemoryAlbumConcept 타입 추가 |
| `src/config/apiEndpoints.ts` | MEMORY_ALBUMS, MEMORY_ALBUM_READ 상수 |
| `src/app/api/memory-albums/route.ts` | **신규** - 앨범 조회 API (GET) |
| `src/app/api/memory-albums/[id]/read/route.ts` | **신규** - 앨범 읽음 처리 API (PATCH) |
| `src/app/api/cron/daily-greeting/route.ts` | Phase 1.75 추가: 앨범 자동 생성 + 푸시 |
| `src/components/features/record/MemoryAlbumViewer.tsx` | **신규** - 전체화면 슬라이드쇼 모달 |
| `src/components/features/record/MemoryAlbumsSection.tsx` | **신규** - 앨범 카드 수평 스크롤 리스트 |
| `src/components/pages/RecordPage.tsx` | memorial 펫일 때 MemoryAlbumsSection 렌더, URL 딥링크 |

### 앨범 생성 로직 (크론 Phase 1.75)
- 3가지 컨셉 우선순위: anniversary(같은 MM-DD) → mood(행복한 날) → random(랜덤 5-10장)
- 매월 1일 09시(KST)에만 실행 (월 1회)
- 최근 30일 사용된 사진 제외 (반복 방지)
- UNIQUE(pet_id, created_date) 제약으로 날짜당 1번

### 검증
- `tsc --noEmit` 통과
- `next build` 성공

### 미실행 마이그레이션
- `supabase/migrations/20260226_memory_albums.sql` - Supabase 대시보드에서 SQL Editor로 실행 필요

---

## [완료] AI 펫톡 강화: "이 AI는 우리 아이를 안다" - 배포 대기

> **상태**: 커밋 완료, 배포 대기

### 변경 목적
AI 펫톡이 유저가 등록한 데이터(입양일, 추모일, 리마인더, 타임라인)를 적극 활용하도록 강화.
"이 AI가 진짜 우리 아이를 아는 것 같다"는 느낌을 주기 위한 4가지 기능 추가.

### 추가된 기능 (4개)

| 기능 | 파일 | 내용 |
|------|------|------|
| **D: 입양일 기념일 감지** | `chat/route.ts` | `getSpecialDayContext()`에 adoptedDate 체크 추가 - 입양 100일/1주년 등 AI가 축하 |
| **B: 리마인더 직접 답변** | `chat/route.ts` | 프롬프트에 "일정 질문에 정확한 시간 답변" 규칙 추가 - "산책 언제야?" → "오후 5시에 가기로 했잖아!" |
| **A: 기념일 푸시 확장** | `daily-greeting/route.ts` | 입양일/추모일 100일 단위 + 연도 기념일 감지, 기념일별 푸시 제목 분기 |
| **C: 1년 전 오늘 알림** | `daily-greeting/route.ts` | 매일 오전 9시(KST), 1년 전 오늘 타임라인 기록 있으면 추억 푸시 발송 |

### 수정 파일 (2개)
- `src/app/api/chat/route.ts` - Feature B + D
- `src/app/api/cron/daily-greeting/route.ts` - Feature A + C

### 검증
- `tsc --noEmit` 통과
- `next build` 성공

---

## [완료] 보안 수정 검수 + 버그 3건 추가 수정 (`b7230db`) - 배포 완료

> **상태**: 커밋 + main 푸시 완료. Vercel 배포됨.

### 검수 결과
`c61d817` (VM Claude Code 보안 수정)을 3개 검수 에이전트로 검증.
- 10개 항목 통과 (프리미엄 서버 검증, CRON_SECRET, 무료 10회 제한 등)
- **버그 3건 발견 → 즉시 수정**

### 수정된 버그

| 버그 | 파일 | 내용 |
|------|------|------|
| VPN 캐시 복사 오류 | `rate-limit.ts:505-509` | isProxy/isDatacenter가 모두 isVPN 값으로 복사 → 캐시 타입에 3개 필드 분리 저장 |
| 일일 사용량 레이스 컨디션 | `rate-limit.ts:244-250` | 동시 요청 시 카운트 누락 → optimistic locking (eq request_count) + 재시도 |
| sell_minimi_item 락 누락 | `20260226_security_fixes.sql` | profiles FOR UPDATE 없이 포인트 업데이트 → FOR UPDATE 락 추가 |

### 수정 파일 (2개)
- `src/lib/rate-limit.ts` - VPN 캐시 + optimistic locking
- `supabase/migrations/20260226_security_fixes.sql` - sell FOR UPDATE + check_pet_limit FOR UPDATE

---

## [완료] 보안 취약점 수정 (`c61d817`) - 배포 완료

> **상태**: 커밋 + main 푸시 완료. Vercel 배포됨.

### 수정된 보안 이슈

| 이슈 | 심각도 | 수정 내용 |
|------|--------|----------|
| CRON_SECRET 로직 오류 | 심각 | 환경변수 미설정 시 인증 스킵 → 500 에러 반환으로 변경 |
| AI Chat 프리미엄 서버 검증 | 심각 | 클라이언트만 체크 → 서버에서 DB 조회로 검증 |
| 무료 회원 AI 제한 | 중간 | 200회 → 10회로 수정 (FREE_LIMITS.DAILY_CHATS 적용) |
| DELETE 에러 처리 누락 | 중간 | notifications/subscribe DELETE 에러 로깅 추가 |
| preferredHour 범위 | 낮음 | 0-23시 → 7-22시로 제한 (새벽 제외) |

### 수정 파일 (4개)
- `src/app/api/cron/daily-greeting/route.ts` - CRON_SECRET 필수화
- `src/app/api/chat/route.ts` - 프리미엄 서버 검증 추가
- `src/app/api/notifications/subscribe/route.ts` - DELETE 에러 처리, 시간 범위
- `src/lib/rate-limit.ts` - FREE_LIMITS.DAILY_CHATS 연동

### DB 마이그레이션 필요 (아래 미실행 마이그레이션 참고)
- `20260226_security_fixes.sql` - 미니미 RPC + 펫/사진 제한 트리거

---

## [완료] 알림 거부 UX 개선 (`bf5f0ec`) - 배포 완료

> **상태**: 커밋 + main 머지 + push 완료. Vercel 배포됨.

### 변경 내용

**1. AIChatPage.tsx - handleReminderAccept**
- 알림 `denied` 상태에서 "알려주세요" 클릭 시 OS별 구체적 설정 안내 toast 표시
- iOS: "설정 > Safari > 알림에서 허용해주세요"
- 기타: "주소창 왼쪽 자물쇠 > 알림 > 허용으로 변경해주세요"
- 기존: denied면 아무 안내 없이 무시하고 record 탭 이동

**2. PushNotificationBanner.tsx - denied 상태 배너**
- `BannerState`에 `"denied"` 타입 추가
- 페이지 진입 시 `permission === "denied"`여도 안내 배너 표시 (기존: 배너 숨김)
- `handleSubscribe`에서 유저가 거부하면 denied 배너로 전환 (기존: 그냥 사라짐)
- denied 배너 UI: BellOff 아이콘 + OS별 설정 변경 안내 + 닫기 버튼

### 수정 파일 (2개)
`src/components/pages/AIChatPage.tsx`, `src/components/features/chat/PushNotificationBanner.tsx`

---

## 튜토리얼 - 완료 (데스크톱/모바일 모두 정상 동작 확인)

> **상태**: 완료. 데스크톱/모바일 양쪽 정상 작동.

### 커밋 히스토리
| 커밋 | 내용 |
|------|------|
| `a6b4e53` | TutorialTour v3 재작성 (box-shadow 스포트라이트, StrictMode 안전) |
| `1781f57` | v3: ready 게이트 제거, setInterval 폴링, ref 기반 |
| `3e21287` | 모바일 튜토리얼 → RecordPageTutorial 연결 누락 수정 (user_type DB 조회) |
| `ef060dd` | 종료 확인 다이얼로그 추가 |
| `6f5d685` | 건너뛰기만 확인, 마지막 스텝은 바로 완료 |
| `31169d3` | 확인 다이얼로그 제거 (바로 종료) + 말풍선 중앙 깜빡임 수정 |

### 최종 동작
- 데스크톱(xl+): 사이드바 항목 11스텝 순차 안내
- 모바일(<xl): 하단 네비 5스텝 순차 안내
- 완료 시 RecordPageTutorial로 이어짐 (current/memorial 유저)
- 건너뛰기: 바로 종료 (확인 없음)
- 말풍선: 타겟 측정 전엔 숨김 (중앙 깜빡임 방지)

---

## [!!] 모바일 깜빡임 문제 - 7번째 커밋으로 수정 적용 (`e3aa66f`)

> **상태**: React.memo + Layout 헤더/네비 분리로 근본적 해결 시도. **모바일 테스트 필요.**
> **증상**: 홈에서 처음엔 괜찮음 → 내기록 탭 갔다가 다른 탭으로 이동하면 이미지/버튼/아이콘이 깜빡거림
> **근본 원인 (확정)**: Context 변경 → Layout 리렌더 → children 새 JSX reference → 모든 페이지 리렌더

### 커밋 히스토리

| 커밋 | 내용 | 결과 |
|------|------|------|
| `43a434f` | FOUC/화면 떨림 - CSS 수정 | X |
| `25b36c0` | 모바일 초기 진입 싸이키 조명 | X |
| `3dab398` | transition/overlay 전면 삭제 | X |
| `9aa6e25` | dynamic import 제거, selectedPet useMemo, minimiEquip 구조비교 | X |
| `0c392ed` | CSS display 탭 전환 (모든 탭 마운트 유지) | 오히려 악화 |
| `03f4356` | TimelineContext 분리, usePets/useAuth 제거, getPetById ref화 | 부분 개선 |
| **`e3aa66f`** | **React.memo 10개 페이지 + Layout 헤더/네비 분리** | **모바일 테스트 필요** |

### 최신 수정 (`e3aa66f`) 상세

**1단계: 10개 페이지 컴포넌트에 React.memo 적용**
- HomePage, RecordPage, CommunityPage, AIChatPage, MagazinePage, AdminPage, LostPage, LocalPage, AdoptionPage, RemindersPage
- Layout이 리렌더되어도 props(useCallback된 handleTabChange 등)가 같으면 리렌더 차단

**2단계: Layout 내부 분리**
- `HeaderAuthArea` 컴포넌트: points/minimiEquip/isAdminUser 등 자주 변하는 Auth 값을 직접 구독
- `BottomNav` 컴포넌트: isMemorialMode(selectedPet) 직접 구독
- Layout 본체: `useAuth()`에서 `user, loading, signOut`만 구독 (이전: 9개 값 전부 구독)
- Layout 자체에도 React.memo 적용

### 불안 요소 (검증 필요)

- PetContext의 `timeline: timelineRef.current`가 하위호환으로 제공되지만, ref 값이므로 stale 가능
- HeaderAuthArea에서 로그인/회원가입 모달 열기를 window CustomEvent로 변환 (openAuthModal/openAuthModalSignup)
- Layout이 여전히 `usePets()`를 구독 (배경색/헤더 isMemorialMode) - selectedPet 변경 시 Layout 리렌더는 발생하지만 React.memo된 자식은 보호됨

### 롤백 플랜

깜빡임이 계속되면:
1. `43a434f` 바로 이전 커밋으로 롤백
2. React.memo만 단독 적용 (Context 분리 없이)
3. Context 변경은 나중에 별도로 진행

---

## [완료] 푸시 알림 시스템 전면 수정 (6커밋)

> **상태**: 전체 파이프라인 정상화 완료. 크론 API 200 OK 확인. 구독자 생기면 실제 발송됨.

### 문제 1: 오페라 모바일에서 푸시 배너 안 뜸
- **원인**: 오페라 모바일은 `PushManager` API 미지원 → `isPushSupported()` false → 배너 초기화 즉시 return
- **해결**: `"unsupported"` BannerState 추가. 미지원 브라우저에서도 "Chrome 또는 Safari에서 알림을 받을 수 있어요" 안내 배너 표시
- **커밋**: `da4bff1`

### 문제 2: 알림 거부 시 dismiss 기록 남아서 재방문 시 배너 안 뜸
- **원인**: 구독 실패(유저가 거부)해도 `handleDismiss()` 실행 → localStorage에 dismiss 기록 → 7일간 배너 안 뜸
- **해결**: 구독 실패 시 배너만 숨기고 dismiss 기록은 남기지 않음 → 다음 방문 시 다시 표시
- **커밋**: `1b2d9e8`

### 문제 3: 크론 API "VAPID_NOT_CONFIGURED" 에러
- **원인**: VAPID 키가 Vercel 환경변수에 설정 안 됨
- **해결**: `web-push generate-vapid-keys`로 생성 후 Vercel + `.env.local`에 설정
- **키 값**:
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY=BF2SwTyt5-7Xqca3q-RgBnRVchvyGtd0y__USA1jZXpcZqEn3sMIJJE3NwzK4ceQFebL5x3HYPILPWgOBmEJElk`
  - `VAPID_PRIVATE_KEY=MH-cn1EvMq0rfTdICwQn2eoCwW4y1I-Pjd9mspAuZ1w`

### 문제 4: 크론 API 빈 500 응답 (서버리스 함수 크래시)
- **원인**: `import webpush from "web-push"` (default import)가 Vercel Serverless의 CJS 환경에서 호환 안 됨
- **해결**: `import * as webpush from "web-push"` (namespace import)로 변경
- **커밋**: `a8ecf9e`

### 문제 5: "Vapid public key must be a URL safe Base 64" 에러
- **원인**: `echo "키값" | vercel env add` 시 개행문자(`\n`)가 환경변수 값 끝에 포함됨
- **해결**: `vercel env rm` 후 `printf "키값"` (개행 없음)으로 재설정
- **검증**: `vercel env pull`로 깨끗한 값 확인 → 크론 API 200 OK

### 문제 6: 케어 리마인더와 AI 펫톡 알림이 따로 놀음
- **원인**: 리마인더 추가와 푸시 구독이 독립적 플로우. 유저가 리마인더만 추가하고 푸시 배너는 무시하면 알림 안 옴
- **해결**: `ensurePushSubscription()` 유틸 함수 생성. 리마인더 저장 성공 시 자동으로 푸시 권한 요청 + 구독 + 서버 등록
- **적용 위치**: RemindersSection.tsx, ReminderPanel.tsx, RemindersPage.tsx (3곳 모두)
- **커밋**: `7ce1d60`

### 커밋 히스토리

| 커밋 | 내용 |
|------|------|
| `1b2d9e8` | 알림 거부 시 조용히 넘어가기 + dismiss 기록 안 남기기 |
| `da4bff1` | 푸시 미지원 브라우저에서도 알림 배너 표시 (unsupported 상태) |
| `8a48120` | 크론 API 에러 디버깅 추가 (임시) |
| `a8ecf9e` | web-push import 방식 수정 (CJS 호환) |
| `6bae1f5` | 크론 API 정상화 - 디버깅 코드 정리 |
| `7ce1d60` | 리마인더 저장 시 푸시 구독 자동 연동 (ensurePushSubscription) |

### 수정 파일

| 파일 | 변경 |
|------|------|
| `src/components/features/chat/PushNotificationBanner.tsx` | unsupported 상태 추가, 거부 시 dismiss 기록 안 남기기 |
| `src/app/api/cron/daily-greeting/route.ts` | `import * as webpush` CJS 호환, 디버깅 코드 정리 |
| `src/lib/push-notifications.ts` | `ensurePushSubscription()` 유틸 함수 추가 |
| `src/components/features/reminders/RemindersSection.tsx` | 리마인더 생성 시 ensurePushSubscription 호출 |
| `src/components/features/chat/ReminderPanel.tsx` | 리마인더 추가 시 ensurePushSubscription 호출 |
| `src/components/pages/RemindersPage.tsx` | 리마인더 생성 시 ensurePushSubscription 호출 |
| `.env.local` | VAPID 키 추가 |

### Vercel 환경변수 (Production 설정 완료)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` ✅
- `VAPID_PRIVATE_KEY` ✅

### ensurePushSubscription 동작 흐름
```
리마인더 저장 성공
  → isPushSupported() 체크
  → permission === "denied"이면 포기
  → 이미 구독되어 있으면 건너뜀 (return true)
  → Service Worker 등록
  → Notification.requestPermission() 요청
  → pushManager.subscribe() 실행
  → POST /api/notifications/subscribe로 서버에 등록
```

---

## ~~[!!] 미실행 마이그레이션~~ ✅ 전부 실행 완료 (2026-03-24 DB 쿼리로 확인)

> 6개 마이그레이션 모두 실행됨. chat_mode, preferred_hour, placed_minimi, memory_albums, user_minimi, purchase/sell RPC, check_pet_limit 트리거 전부 DB에 존재 확인.

---

## 최근 세션들에서 구현/수정 완료된 기능 (커밋 + 푸시 완료)

### 기능 개발

| 기능 | 커밋 | 주요 파일 | 상태 |
|------|------|----------|------|
| 미니홈피 픽셀아트 이미지 배경 8종 | `6ad2f0c` | `public/icons/stages/`, `minihompyBackgrounds.ts`, `MinihompyStage.tsx`, `BackgroundShopModal.tsx` | 완료 |
| 멀티 미니미 배치 시스템 (드래그&드롭) | `89af0b8` | `MinihompyStage.tsx`, `MiniHomepyTab.tsx`, `/api/minihompy/settings/placed-minimi` | 완료 |
| 요크셔테리어 미니미 이미지 교체 | `7f88c29` | `public/icons/minimi/york.png`, `minimiPixels.ts` | 완료 |
| 사이드바 전체 스크롤 개선 | (이전) | `Sidebar.tsx` | 완료 |
| 미니미 구매 확인 다이얼로그 | (이전) | `MinimiShopModal.tsx` | 완료 |
| equipped_minimi_id UUID 호환성 | (이전) | equip/inventory/sell/minihompy API, `AuthContext.tsx` | 완료 |
| **튜토리얼 전면 수정** | `a6b4e53`~`31169d3` | `TutorialTour.tsx`, `RecordPageTutorial.tsx`, `PointsBadge.tsx`, `Sidebar.tsx`, 각 페이지, `page.tsx` | 완료 |
| **푸시 알림 시스템 정상화** | `da4bff1`~`6bae1f5` | `PushNotificationBanner.tsx`, `daily-greeting/route.ts` | 완료 |
| **리마인더↔푸시 자동 연동** | `7ce1d60` | `push-notifications.ts`, `RemindersSection.tsx`, `ReminderPanel.tsx`, `RemindersPage.tsx` | 완료 |

### 버그 수정

| 수정 | 커밋 | 상태 |
|------|------|------|
| 모바일 사이드바 터치 스크롤 | (이전) | 완료 |
| 모바일 모달 스크롤바 겹침 | `1797500` | 완료 |
| 사이드바 모달 z-index 깨짐 (createPortal) | `2afa614` | 완료 |
| 미니미 배치 클릭 영역 최적화 | `db0c57f` | 완료 |
| 미니미 배치 버튼 가시성 개선 | `036a92f` | 완료 |
| HERO 깜빡임 해결 (개인화 제거→공통 메시지) | `c11798e` | 완료 |
| 새로고침 시 FOUC 해결 | `a53c2ec` | 완료 |
| 골든리트리버 미니미 가격 200P 통일 | `b8acb52` | 완료 |
| 모바일 헤더 미니미 아이콘 숨김 | `4c1e178` | 완료 |
| 모바일 깜빡임 (8커밋) | `43a434f`~`9a33015` | **React.memo + MemorialModeContext 적용** - 모바일 테스트 필요 |
| **데스크톱 튜토리얼 까만 오버레이만 표시** | `a6b4e53`~`31169d3` | 완료 |
| 모바일 튜토리얼 → RecordPageTutorial 미연결 | `3e21287` | 완료 |
| 튜토리얼 말풍선 중앙 깜빡임 | `31169d3` | 완료 |
| 우리의 기록 튜토리얼 2번째 모달 화면 밖 이탈 | `e78022b` | 완료 |
| 오페라 모바일 푸시 배너 안 뜸 (PushManager 미지원) | `da4bff1` | 완료 |
| 알림 거부 시 dismiss 기록 남아 재방문 시 배너 안 뜸 | `1b2d9e8` | 완료 |
| 크론 API VAPID_NOT_CONFIGURED 에러 | Vercel 환경변수 설정 | 완료 |
| 크론 API web-push CJS import 크래시 | `a8ecf9e` | 완료 |
| 크론 API VAPID 키 개행문자 오염 | Vercel env 재설정 (printf) | 완료 |
| 리마인더와 푸시 구독 독립적 플로우 | `7ce1d60` | 완료 |

### 모바일 UX/UI 개선 (`3e9aa89`, `d0b69f9`)

| 개선 항목 | 내용 | 커밋 |
|-----------|------|------|
| AI 펫톡 키보드 대응 | visualViewport API로 동적 높이 조정 + 입력창 포커스 시 scrollIntoView | `3e9aa89` |
| 터치 타겟 44x44px | Layout/CommunityPage/HomePage/AIChatHeader 전체 인터렉티브 요소 | `3e9aa89` |
| 버튼 피드백 | active:scale-95 전역 추가 (BottomNav/헤더/커뮤니티/채팅) | `3e9aa89` |
| safe-area 대응 | #main-content에 calc(68px + env(safe-area-inset-bottom) + 16px) | `3e9aa89` |
| 캐러셀 비율 | h-48 고정 → aspect-[4/3] 반응형 | `3e9aa89` |
| 좋아요 애니메이션 | heartPop keyframe (0.4s scale pulse) | `3e9aa89` |
| 모달 반응형 | AuthModal/WritePostModal max-h-[90dvh] + sm 브레이크포인트 확대 | `3e9aa89` |
| 소형 디바이스 헤더 | h-8/sm:h-10/md:h-12 3단계 반응형 | `3e9aa89` |
| 포커스 링 접근성 | focus-visible 전역 적용 (#05B2DC) | `3e9aa89` |
| 스켈레톤 로더 | 추모/커뮤니티/기록 페이지 - 실제 레이아웃 1:1 매칭 | `d0b69f9` |

### DB/규칙 관련

| 내용 | 상태 |
|------|------|
| AGENTS.md에 DB 마이그레이션 규칙 추가 | 완료 |
| `ADD COLUMN IF NOT EXISTS` 주의사항 문서화 | 완료 |
| equipped_minimi_id UUID 코드 호환 (DB 변경 불필요) | 완료 |

---

## 핵심 규칙: 모달 스크롤 안 되면 PetFormModal 패턴 적용
- `src/components/features/record/PetFormModal.tsx` 라인 224~264 참고

---

## 작업 규칙
- 커밋/푸시는 물어보지 말고 바로 진행
- 빌드 확인 필수
- CLAUDE.md의 서브에이전트 오케스트레이션 방식 준수
- **DB 변경이 포함된 작업은 SQL 실행까지 완료해야 "완료"**

---

## 2026-02-25 (화) — Phase 2 구현 진행

### 완료 항목

| 항목 | 커밋 | 내용 |
|------|------|------|
| **P2-3** 커뮤니티 무한 스크롤 | `f565f8b` | IntersectionObserver + offset/limit 페이지네이션, 15개씩 로드, 로딩 스켈레톤, 종료 상태 표시 |
| **P2-6** 스켈레톤 통일 | `006f16d` | MagazinePage/AdoptionPage/RemindersPage의 PawLoading → skeleton.tsx 컴포넌트로 교체 |
| **P2-1** 무지개다리 세레모니 5단계 | `d105547` | MemorialSwitchModal 2단계→5단계 확장 (마음의 준비→날짜→슬라이드쇼→작별인사→별이되다), 작별 메시지 timeline 저장 |

### 미완료 Phase 2 항목 (다음 세션)

| 항목 | 내용 | 우선순위 |
|------|------|---------|
| P2-2 | 대화 속 사진 연결 `[PHOTO:id]` | 중 |
| P2-4 | 치유의 여정 대시보드 | 중 |
| P2-5 | 대화→타임라인 자동 생성 | 낮 |
| P2-7 | 미니미 도감 + 터치 이펙트 | 낮 |

---

## 2026-02-26 (수) 세션 1 — 보안 전면 리뷰 및 수정

### 진행 배경
승빈님 요청: "케어 리마인더와 AI 펫톡 푸시 알림 기능 전체 코드 리뷰 + 보안/문제점 수정"

### 보안 리뷰 범위 (4개 병렬 에이전트 투입)

| 영역 | 검토 파일 | 발견 문제 |
|------|----------|----------|
| 푸시 알림 API | `notifications/subscribe`, `cron/daily-greeting`, `push-notifications.ts` | CRON_SECRET 스킵, DELETE 에러 미처리, preferredHour 범위 |
| 리마인더 API | `reminders/route.ts`, `reminders/[id]`, 관련 컴포넌트 | **A- 등급** - 대체로 우수, 일부 값 검증 개선 권장 |
| AI 채팅 API | `chat/route.ts`, `agent.ts`, `AIChatPage.tsx` | 프리미엄 서버 검증 부재, Prompt Injection 필터 약함 |
| 인증 시스템 | `AuthContext.tsx`, `supabase-server.ts` | 클라이언트 기반 피처 제한 (서버 검증 필요) |

### 발견된 심각한 문제 및 수정

#### 1. CRON_SECRET 로직 오류 (심각) ✅ 수정됨
**파일**: `src/app/api/cron/daily-greeting/route.ts` (라인 204)

**Before**:
```typescript
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
// cronSecret이 없으면 검사 스킵됨!
```

**After**:
```typescript
if (!cronSecret) {
    console.error("[Cron] CRON_SECRET이 설정되지 않았습니다");
    return NextResponse.json({ error: "CRON_SECRET_MISSING" }, { status: 500 });
}
if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

#### 2. AI Chat 프리미엄 서버 검증 부재 (심각) ✅ 수정됨
**파일**: `src/app/api/chat/route.ts`

**문제**: 클라이언트에서만 `isPremium` 체크, API 직접 호출 시 무제한 사용 가능

**수정**:
```typescript
// 프리미엄 상태 확인 (서버 검증 - 보안 중요)
const supabase = await createServerSupabase();
const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium, premium_expires_at")
    .eq("id", user.id)
    .single();

const isPremium = profile?.is_premium &&
    (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());

// 무료 회원: 10회 제한, 프리미엄: 무제한
if (!isPremium) {
    const dailyUsage = await checkDailyUsageDB(identifier, false);
    if (!dailyUsage.allowed) {
        return NextResponse.json({ error: "일일 무료 제한 초과", isLimitReached: true }, { status: 429 });
    }
}
```

#### 3. 무료 회원 일일 제한 불일치 ✅ 수정됨
**파일**: `src/lib/rate-limit.ts`

**Before**: `dailyLimit: 50` (하드코딩)
**After**: `dailyLimit: FREE_LIMITS.DAILY_CHATS` (10회, constants.ts 연동)

#### 4. DELETE 에러 처리 누락 ✅ 수정됨
**파일**: `src/app/api/notifications/subscribe/route.ts`

**Before**:
```typescript
await supabase.from("push_subscriptions").delete()...
return NextResponse.json({ success: true }); // 에러 확인 안 함
```

**After**:
```typescript
const { error } = await supabase.from("push_subscriptions").delete()...
if (error) {
    console.error("[Push Unsubscribe] DB 삭제 실패:", error.message);
    return NextResponse.json({ error: "구독 해제에 실패했습니다." }, { status: 500 });
}
```

#### 5. preferredHour 범위 제한 ✅ 수정됨
**파일**: `src/app/api/notifications/subscribe/route.ts`

**Before**: 0-23시 허용
**After**: 7-22시만 허용 (새벽 알림 방지)

#### 6. VAPID_SUBJECT 하드코딩 ✅ 수정됨
**파일**: `src/app/api/cron/daily-greeting/route.ts`

**Before**: `const VAPID_SUBJECT = "mailto:sharkwind1@gmail.com";`
**After**: `const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@memento-ani.com";`

### DB 마이그레이션 생성됨

**파일**: `supabase/migrations/20260226_security_fixes.sql`

포함 내용:
1. **`purchase_minimi_item` RPC**: 포인트 차감 + 아이템 추가 원자성 보장 (FOR UPDATE 락)
2. **`sell_minimi_item` RPC**: 판매 시 원자성 보장
3. **`check_pet_limit` 트리거**: 무료 1마리 / 프리미엄 10마리 DB 레벨 강제
4. **`check_photo_limit` 트리거**: 무료 100장 / 프리미엄 1000장 펫당 제한

### 커밋 히스토리

| 커밋 | 내용 |
|------|------|
| `c61d817` | fix(security): 보안 취약점 수정 및 프리미엄 서버 검증 강화 |
| `c825f42` | docs: RELAY.md 보안 수정 내역 추가 |

### 수정된 파일 (5개)
- `src/app/api/chat/route.ts` - 프리미엄 서버 검증, 무료 10회 제한
- `src/app/api/cron/daily-greeting/route.ts` - CRON_SECRET 필수화, VAPID_SUBJECT 환경변수화
- `src/app/api/notifications/subscribe/route.ts` - DELETE 에러 처리, 시간 범위 7-22시
- `src/lib/rate-limit.ts` - FREE_LIMITS.DAILY_CHATS 연동
- `supabase/migrations/20260226_security_fixes.sql` - 원자성 RPC + 제한 트리거 (신규)

### 승빈님 필수 액션

1. **Supabase SQL Editor에서 실행**:
   ```
   supabase/migrations/20260226_security_fixes.sql
   ```

2. **Vercel 환경변수 추가 (선택)**:
   ```
   VAPID_SUBJECT=mailto:support@memento-ani.com
   ```

### 리뷰에서 발견되었지만 미수정 (향후 권장)

| 항목 | 심각도 | 설명 |
|------|--------|------|
| Prompt Injection 필터 강화 | 중간 | `sanitizeInput()` 패턴 감지 추가 권장 |
| IP 기반 Rate Limit Redis 전환 | 낮음 | 현재 메모리 기반, 분산 환경에서 불완전 |
| 입력값 런타임 타입 검증 (Zod) | 낮음 | `as` 타입 캐스팅 → Zod 스키마 검증 권장 |
| 관리자 권한 헬퍼 표준화 | 낮음 | `requireAdmin()` 함수 일관 적용 권장 |

---

## 2026-02-26 (수) 세션 2 — 전체 보안 스캔 및 수정 (`025ec39`)

> **상태**: 커밋 + 푸시 완료

### 검사 방법
6개 병렬 에이전트로 전체 코드베이스 보안 스캔:
1. API 인증/권한 보안
2. 프론트엔드 보안 (XSS, 민감 정보 노출)
3. 파일 업로드/스토리지 보안
4. 환경변수/시크릿 관리
5. 레이스 컨디션/동시성 버그
6. 타입 안전성/런타임 에러

### 발견 및 수정된 문제

#### 1. 레이스 컨디션 (Critical) ✅ 수정됨

| 파일 | 문제 | 수정 |
|------|------|------|
| `points/shop/route.ts` | fallback read-modify-write | 원자적 업데이트 + `.gte("points", price)` |
| `minimi/purchase/route.ts` | fallback 포인트 중복 차감 | 원자적 업데이트 + `.gte()` 조건 |
| `minimi/sell/route.ts` | delete 중복 실행 + 포인트 중복 지급 | `delete().select().single()` + 원자적 증가 |

#### 2. 파일 업로드 보안 (High) ✅ 수정됨

| 문제 | 수정 |
|------|------|
| 확장자 화이트리스트 없음 | `ALLOWED_IMAGE_EXTENSIONS`, `ALLOWED_VIDEO_EXTENSIONS` 추가 |
| MIME 타입 검증 없음 | `validateMimeType()` 함수 추가 |
| 이중 확장자 허용 (image.jpg.exe) | 두 번째 마지막 확장자 검사 추가 |

#### 3. VPN 체크 누락 (High) ✅ 수정됨

| 파일 | 수정 |
|------|------|
| `points/shop/route.ts` | VPN 체크 추가 |
| `points/daily-check/route.ts` | VPN 체크 + Rate Limit 추가 |
| `minimi/purchase/route.ts` | VPN 체크 추가 |
| `minimi/sell/route.ts` | VPN 체크 추가 |

### 미수정 (낮은 우선순위)

| 항목 | 심각도 | 이유 |
|------|--------|------|
| GET API Rate Limiting | 중간 | 서비스 영향 미미, 추후 대응 |
| 방문자 카운터 레이스 컨디션 | 낮음 | 금전적 영향 없음 |
| userId UUID 형식 검증 | 낮음 | DB에서 에러 처리됨 |
| CSP 헤더 추가 | 낮음 | XSS는 DOMPurify로 방어 중 |

---

## [완료] 대형 페이지 컴포넌트 분리 리팩토링 (5개 페이지)

> **상태**: 완료. `next build` 타입 에러 0개 확인.

### 목적
800~1,140줄짜리 대형 페이지 컴포넌트를 신입 개발자가 바로 이해할 수 있도록 분리.
UI 서브 컴포넌트를 `features/{domain}/` 폴더로 추출, 상태/로직은 커스텀 훅으로 분리.

### 분리 결과 요약

| 페이지 | Before | After | 추출 파일 수 |
|--------|--------|-------|-------------|
| AdoptionPage | 825줄 | ~238줄 | 8개 |
| RecordPage | 1,140줄 | ~495줄 | 4개 |
| HomePage | 800줄 | ~130줄 | 7개 |
| CommunityPage | 657줄 | ~290줄 | 2개 |
| LocalPage | 635줄 | ~300줄 | 2개 |

RemindersPage(599줄)는 분석 후 분리 불필요로 판단 (모달 폼 상태가 페이지 로직과 밀접하게 결합되어 분리하면 오히려 복잡도 증가).

### 신규/수정 파일 상세

#### AdoptionPage (8개 신규)

| 파일 | 내용 |
|------|------|
| `src/components/features/adoption/adoptionTypes.ts` | REGIONS, genderLabel, neuterLabel, formatDate 유틸 |
| `src/components/features/adoption/useAdoption.ts` | 상태 11개 + 핸들러 5개 + useEffect |
| `src/components/features/adoption/AnimalDetailModal.tsx` | 상세 모달 + InfoItem 컴포넌트 |
| `src/components/features/adoption/AnimalGridCard.tsx` | 그리드 뷰 카드 |
| `src/components/features/adoption/AnimalListCard.tsx` | 리스트 뷰 카드 |
| `src/components/features/adoption/AdoptionFilters.tsx` | 검색바 + 종류 탭 + 확장 필터 |
| `src/components/features/adoption/AdoptionPagination.tsx` | 페이지네이션 UI |
| `src/components/features/adoption/index.ts` | barrel export |

#### RecordPage (4개 신규)

| 파일 | 내용 |
|------|------|
| `src/components/features/record/TimelineSection.tsx` | 같은 파일 내 독립 컴포넌트를 별도 파일로 이동 (288줄) |
| `src/components/features/record/ProfileTab.tsx` | "내 정보" 탭 JSX (프로필 카드 + 통계 + 계정관리) |
| `src/components/features/record/PetCardGrid.tsx` | 펫 선택 그리드 + 드롭다운 메뉴 |
| `src/components/features/record/RecordPageGuest.tsx` | 비로그인 상태 UI |

#### HomePage (7개 신규)

| 파일 | 내용 |
|------|------|
| `src/components/features/home/useHomePage.ts` | 상태 7개 + 핸들러 3개 + useMemo 4개 |
| `src/components/features/home/homeUtils.ts` | safeStringSrc, getPetIcon, HERO_CONTENT 상수 |
| `src/components/features/home/types.ts` | LightboxItem, CommunityPost, Comment 타입 |
| `src/components/features/home/HeroSection.tsx` | HERO 배너 |
| `src/components/features/home/CommunitySection.tsx` | 인기 커뮤니티 카드 캐러셀 |
| `src/components/features/home/AdoptionSection.tsx` | 입양정보 카드 캐러셀 |
| `src/components/features/home/CareGuideSection.tsx` | 케어 가이드 카드 캐러셀 |
| `src/components/features/home/MemorialSection.tsx` | 추모 섹션 |

#### CommunityPage (2개 신규)

| 파일 | 내용 |
|------|------|
| `src/components/features/community/CommunityHeader.tsx` | 서브카테고리 탭, 말머리 필터, 검색바, 정렬 (~170줄) |
| `src/components/features/community/CommunityPostList.tsx` | 게시글 카드, 스켈레톤 로더, 무한 스크롤, 빈 상태 (~210줄) |

#### LocalPage (2개 신규)

| 파일 | 내용 |
|------|------|
| `src/components/features/local/LocalHeader.tsx` | 지역 Select(시/도, 구/군), 검색바, 카테고리 필터 (~160줄) |
| `src/components/features/local/LocalPostList.tsx` | 게시글 카드, 이미지, 위치/통계, 빈 상태, 페이지네이션 (~230줄) |

#### 수정된 기존 파일

| 파일 | 변경 |
|------|------|
| `src/components/pages/AdoptionPage.tsx` | 825줄 → 238줄 (서브컴포넌트 import로 교체) |
| `src/components/pages/RecordPage.tsx` | 1,140줄 → 495줄 |
| `src/components/pages/HomePage.tsx` | 800줄 → 130줄 |
| `src/components/pages/CommunityPage.tsx` | 657줄 → 290줄 |
| `src/components/pages/LocalPage.tsx` | 635줄 → 300줄 |
| `src/components/features/home/index.ts` | barrel export 업데이트 |
| `src/components/features/community/index.ts` | barrel export 업데이트 |
| `src/components/features/record/ProfileTab.tsx` | 타입 수정: `userPetType: string | null` → `"dog" | "cat" | "other"` |

### 분리 원칙
- 순수 리팩토링 (로직 변경 없음, 기능 동작 동일)
- 기존 패턴(useAIChat, useLostPosts) 따라 일관된 구조
- Props 기반 통신 (부모 페이지 → 서브 컴포넌트)
- 각 서브 컴포넌트에 JSDoc 주석으로 역할 설명

### 검증
- `next build` 통과 (타입 에러 0개)
- 기존 img warning만 존재 (pre-existing)
