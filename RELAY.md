# 릴레이

> **이 파일은 200줄 이내로 유지할 것.** 과거 작업 기록은 `RELAY-ARCHIVE.md` 참조.

---

## 작업 규칙

- **Claude Code 실행 시 반드시 `claude --dangerously-skip-permissions` 로 시작**
- 커밋/푸시는 물어보지 말고 바로 진행
- 빌드 확인 필수 (`next build`)
- CLAUDE.md의 서브에이전트 오케스트레이션 방식 준수
- **DB 변경이 포함된 작업은 SQL 실행까지 완료해야 "완료"**
- 모달 스크롤 안 되면 `PetFormModal.tsx` 224~264줄 패턴 적용

---

## 완료된 핵심 기능 (한 줄 요약)

| 기능 | 상태 |
|------|------|
| 반려동물 CRUD + 사진/영상 | 완료 |
| AI 펫톡 (일상/추모 듀얼모드, 감정분석, 성격 7종, 할루시네이션 방지 5단계) | 완료 |
| 케어 리마인더 + 푸시 알림 (VAPID, Service Worker, 크론) | 완료 |
| 타임라인 일기 + 대화→타임라인 자동 생성 | 완료 |
| 듀얼 모드 (하늘색↔황금빛) + 무지개다리 세레모니 5단계 | 완료 |
| 튜토리얼 (데스크톱 11스텝, 모바일 5스텝) | 완료 |
| 미니홈피 (배경 8종, 멀티미니미 드래그&드롭, 도감, 터치 이펙트) | 완료 |
| 커뮤니티 (5개 게시판, 좋아요/댓글/신고, 무한스크롤) | 완료 |
| 프리미엄/무료 제한 (DB is_premium 체크) + 스마트 전환 UX | 완료 |
| 관리자 페이지 | 완료 |
| 추억 앨범 (자동 생성, 기념일, 슬라이드쇼) | 완료 |
| 대화 내보내기 (4개 템플릿, PNG/JPG, Web Share) | 완료 |
| 대화 내 사진 연동 (키워드→pet_media 캡션 매칭) | 완료 |
| AI 프롬프트 개선 (감각 기억, 거울링 3단계, 시간대 에너지, pending_topic) | 완료 |
| UI/UX (추모 별 float-up, 타이핑 감성 텍스트, 발자국 버블) | 완료 |
| 치유의 여정 대시보드 (감정 추이, 애도 단계, 마일스톤) | 완료 |
| 보안 전면 리뷰 + 수정 (레이스 컨디션, 파일 업로드, VPN 체크 등) | 완료 |
| 대형 컴포넌트 분리 (5개 페이지 리팩토링) | 완료 |
| AI 영상 생성 (fal.ai Minimax Hailuo, 8템플릿, 쿼터 시스템, 폴링 UI) | 코드 완료 (DB 미실행) |

---

## 미실행 마이그레이션 — 승빈님 Supabase SQL Editor에서 실행

| 파일 | 영향 | 긴급도 |
|------|------|--------|
| `20260226_chat_mode_column.sql` | 추모/일상 대화 분리 (안 하면 섞임) | 즉시 |
| `20260226_security_fixes.sql` | 미니미 RPC + 펫/사진 제한 트리거 | 즉시 |
| `20260225_push_preferred_hour.sql` | 푸시 시간 선택 | 즉시 |
| `ALTER TABLE minihompy_settings ADD COLUMN IF NOT EXISTS placed_minimi JSONB DEFAULT '[]'::jsonb;` | 멀티 미니미 배치 | 즉시 |
| `20260222_minimi_system.sql` | 미니미 구매/되팔기 (이미 실행됐을 수 있음) | 확인 |
| `20260226_memory_albums.sql` | 추억 앨범 테이블 | 즉시 |
| `sql/video_generations.sql` | AI 영상 생성 테이블 + RLS + 인덱스 | 즉시 |
| `sql/add_video_url_to_posts.sql` | community_posts에 video_url 컬럼 추가 (자랑하기 영상 공유) | 즉시 |

---

## TODO — 앞으로 할 것

### 결제 연동 — 포트원(PortOne) 프리미엄 구독 실결제

**현재**: `is_premium` + `premium_expires_at`는 DB에 있음. `AuthContext.tsx` 체크 완료. 결제 흐름만 없음.

**구현**:
1. `npm install @portone/browser-sdk`
2. `src/app/api/payments/route.ts` 신규 — POST 결제 요청 + POST verify 검증
   - 검증 성공 시: `profiles.is_premium = true`, `premium_expires_at = NOW() + 30일`
   - 서버에서 포트원 API로 결제 금액 검증 필수 (조작 방지)
3. `src/components/modals/PremiumModal.tsx` — 현재 "준비 중!" toast → 포트원 결제창 호출로 변경
4. 환경변수: `PORTONE_API_KEY`, `PORTONE_API_SECRET`, `NEXT_PUBLIC_PORTONE_STORE_ID`
5. 가격: `src/config/constants.ts` `PRICING` 참조 (월 7,900원 / 연 79,000원)
6. **승빈님 필요**: 포트원 계정 생성 + 가맹점 등록 + API 키 발급

### AI 영상 생성 — 승빈님 설정 필요

1. **DB 마이그레이션**: `sql/video_generations.sql`을 Supabase SQL Editor에서 실행
2. **Storage 버킷**: Supabase Dashboard > Storage에서 `videos` 버킷 생성 (Public, video/mp4 허용)
3. **환경변수**: `.env.local`에 추가
   - `FAL_KEY` — fal.ai API 키 (https://fal.ai/dashboard/keys 에서 발급)
   - `VIDEO_WEBHOOK_SECRET` — 랜덤 시크릿 (예: `openssl rand -hex 32`)
   - `NEXT_PUBLIC_APP_URL` — 배포 URL (예: `https://memento-ani.vercel.app`)
4. **Vercel 환경변수**: 위 3개를 Vercel Dashboard에도 설정

### 모바일 깜빡임 최종 확인

- `e3aa66f` 커밋으로 React.memo 10개 페이지 + Layout 분리 적용 완료
- 실기기(아이폰/안드로이드)에서 홈 → 내기록 → 다른 탭 이동 시 확인
- 깜빡임 계속되면 `03f4356`으로 롤백 후 React.memo만 단독 적용

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

## 최근 수정된 핵심 파일 (2026-02-26)

| 파일 | 뭘 바꿨나 |
|------|----------|
| `src/app/api/chat/route.ts` | 성격 행동, 추모 필터, 할루시네이션 방지, 프롬프트 압축, 사진 매칭, pending_topic, 타임라인 자동 |
| `src/lib/agent.ts` | saveAutoTimelineEntry, getLatestPendingTopic 추가 |
| `src/lib/care-reference.ts` | HALLUCINATION_GUARD_RULES/CARE_FRAMING_RULES 압축, validateAIResponse 오탐 수정 |
| `src/components/features/chat/useAIChat.ts` | 펫 전환 시 추천 초기화, matchedPhoto 전달 |
| `src/components/features/chat/ChatInputArea.tsx` | flex-wrap 추천 버튼, 프리미엄 배너+자동 모달 |
| `src/components/features/chat/ChatMessageList.tsx` | 사진 썸네일, 타이핑 감성 텍스트 |
| `src/components/features/chat/ExportChatModal.tsx` | 신규 — 대화 내보내기 |
| `src/components/features/chat/ExportChatCard.tsx` | 신규 — 카드 템플릿 4종 |
| `src/app/api/healing-journey/route.ts` | 신규 — 치유의 여정 API |
| `src/components/features/record/HealingJourneySection.tsx` | 신규 — 대시보드 UI |
| `src/components/features/minihompy/MinimiCollection.tsx` | 신규 — 미니미 도감 |
| `src/lib/rate-limit.ts` | VPN 캐시 수정, optimistic locking, FREE_LIMITS 연동 |
