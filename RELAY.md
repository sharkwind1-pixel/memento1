# 릴레이 — TODO

> **새 세션 필독**: 이 파일만 읽으면 현재 할 일을 바로 알 수 있음.
> 완료 세션 로그 → `RELAY-LOG.md` | 완료 기능 목록 → `RELAY-ARCHIVE.md`

---

## 즉시 — 대기 중

- [x] 카카오페이 심사 보완사항 회신 (결제경로 pptx + 서비스제공기간 + 사업자등록증 제출용) — 2026-04-10 메일 발송 완료
- [x] 정기결제 자동 갱신 크론잡 (subscription-renewal) — 매일 KST 07:30 실행, 포트원 V1 빌링키 재결제, 3회 실패 시 만료
- [x] DB 마이그레이션: `ALTER TABLE profiles ADD COLUMN device_fingerprint TEXT;` — 2026-04-10 실행 완료
- [x] 관리자 유저 상세 조회 — 유저 클릭 시 확장 패널 (가입일, 펫 수, 대화 수, 구독 상태, auth 이메일)
- [x] 관리자 게시물 탭 상호작용 — 검색/상세보기/숨기기/삭제 (AdminPostsTab)
- [x] 관리자 대시보드 크레딧 표시 — AI 펫톡(OpenAI) + AI 영상(fal.ai) 사용량/비용
- [x] AI 영상 단건 결제 (3,500원/건) — VideoPurchaseModal + 전용 결제 API
- [x] AI 영상 모델 Veo 3.1 Fast로 교체 (Minimax → Kling → Veo 3.1)
- [x] AI 영상 프롬프트 템플릿 전면 고도화 (Fun 6개 + Memorial 6개 + Transform 1개)
- [x] FAL_KEY Vercel 설정 완료

## 완료 — UX/버그 (이전)

- [x] route.ts 디버그 로그 제거 (chat/particles)
- [x] 오프라인 감지 + Supabase auto-refresh 재시도 제한 (useOnlineStatus + OfflineBanner)
- [x] 포인트 상점 서버 데드코드 제거 (premium_trial 핸들링)

---

## MVP 런칭 — 결제 + 프리미엄

- [x] PortOne 환경변수 설정 (STORE_ID, CHANNEL_KEY, API_SECRET → .env.local + Vercel)
- [x] KCP 외부 전산 세팅 완료 (2026-04-06 문자 수신)
- [x] KCP 카드사 심사 요청 (부가합의서 자필서명 + 사업자등록증 제출용 + 신분증 재촬영)
- [x] KCP 계약서류 온라인 제출
- [x] 보증보험 200만원 가입
- [x] 배치결제(정기결제) 연동 — subscribe/prepare + complete API + PremiumModal 구독 UI
- [ ] 카드사 심사 완료 대기 (인증+배치 동시 재신청 2026-04-08)
- [ ] KCP 실연동 채널 생성 + 결제 테스트 후 실결제 전환
- [x] 정기결제 자동 갱신 크론잡 (subscription-renewal) — 2026-04-10 구현 완료
- [x] 포트원(PortOne) 결제 연동 코드 — CSP 도메인 허용, 환경변수 사전 체크 추가
- [x] 스마트 프리미엄 전환 UX — 직전 대화 주제 반영 동적 문구 + 잔여 횟수별 안내

---

## AI 펫톡 킬러 기능

- [x] 대화 내보내기 (편지/카드) — ExportChatCard + ExportChatModal (4개 템플릿, PNG/JPG, Web Share)
- [x] 대화 내 사진 연동 — extractKeywordsFromReply + pet_media 캡션 매칭

---

## AI 프롬프트 개선 — Phase 3

- [x] pending_topic — getLatestPendingTopic + ---PENDING_TOPIC--- 파싱 + DB 저장
- [x] 시간대별 에너지 — 일상+추모 모드 모두 적용 (4시간대: 아침/낮/저녁/밤)

---

## UI/UX 비주얼

- [x] 추모 별 float-up 애니메이션 — MemorialSection에 CSS-only 파티클 6개
- [x] 타이핑 인디케이터 감성 텍스트 — 이미 구현 확인 (강아지/고양이/추모 4세트)
- [x] 발자국 버블 데코 — paw-drift 애니메이션 + MemorialSection 데코 4개

---

## 리팩토링 + 기타

- [x] 대형 컴포넌트 분리: AIChatPage (1408줄 → 372줄, 이미 분리 완료)
- [x] API URL 마이그레이션: 클라이언트 전체 apiEndpoints.ts 상수로 전환
- [x] 치유의 여정 대시보드 — API + HealingJourneySection 구현 완료 (감정추이/애도단계/마일스톤)
- [x] 대화→타임라인 자동 생성 — saveAutoTimelineEntry 10턴마다 자동 실행
- [x] 미니미 도감 + 터치 이펙트 — MinimiCollection 도감 + MinihompyStage 터치 이펙트

---

## 완료 항목 (2026-04-07 세션)

### PortOne V1 결제 연동 (PC + 모바일)
- [x] V2 SDK → V1 SDK 전환 (iamport.js CDN + IMP.request_pay)
- [x] IMP.init()에 가맹점 식별코드(imp47365370) 사용 (V2 Store ID 아님)
- [x] complete API: V2 REST API → V1 REST API (imp_uid 기반 조회)
- [x] mobile-redirect: V1 쿼리 파라미터 대응 (imp_uid, merchant_uid, imp_success)
- [x] CSP: strict-dynamic 제거 (호스트 allowlist 무시 문제), *.iamport.kr + *.kcp.co.kr 추가
- [x] CSP: form-action에 결제 도메인 추가 (모바일 폼 서밋 허용)
- [x] KCP 결제 취소 메시지 정제 ("결제포기" → "결제가 취소되었습니다")
- [x] Vercel 환경변수: PORTONE_MERCHANT_CODE, PORTONE_REST_API_KEY 추가

### 보안
- [x] 탈퇴 계정 관리자 접근 차단 — refreshProfile()에 can_rejoin 체크 추가

### AI/UI/리팩토링
- [x] 추모 모드 시간대별 에너지 추가 (아침/낮/저녁/밤 4단계)
- [x] MemorialSection 별 float-up 파티클 6개
- [x] 발자국 버블 데코 (paw-drift 애니메이션)
- [x] API URL 하드코딩 → apiEndpoints.ts 전면 마이그레이션 (12개 파일)
- [x] 기존 완료 항목 RELAY 체크 (내보내기/사진연동/pending_topic/AIChatPage 분리)

### 인프라
- [x] KCP 외부 전산 세팅 완료 확인 (2026-04-06 문자 수신)
- [x] 새 컴퓨터 git config 설정

---

## 완료 항목 (2026-04-03 세션) — 총 30+건

### 결제 연동
- [x] 포트원 Store ID, Channel Key, API Secret 발급 + .env.local 설정
- [x] CSP에 포트원 도메인 허용 (*.iamport.co, *.portone.io)
- [x] 환경변수 getter 변경 (빌드 시점 캐싱 방지)
- [x] PremiumModal 환경변수 미설정 시 사전 체크 추가
- [x] Vercel 환경변수 추가 (PORTONE, VAPID, TELEGRAM 전부)

### 성능 최적화 (Spotify 전략 참고)
- [x] img -> OptimizedImage 교체 (11개 파일 21곳, WebP/AVIF 자동 변환)
- [x] Storage cacheControl 1시간 -> 1년
- [x] 정적 에셋 캐시 헤더 강화 (폰트 1년 immutable, 로고 1일)
- [x] PetContext select("*") -> 명시적 컬럼 선택 (3곳, 페이로드 15-25% 감소)
- [x] 미디어 업로드 병렬화 (순차 -> Promise.allSettled 배치 3개씩)
- [x] 서비스 워커 캐싱 전략 추가 (정적 에셋 Cache First, 이미지 SWR)
- [x] loading.tsx 추가 (초기 빈 화면 방지)
- [x] OptimizedImage src prop 변경 시 state 동기화 수정

### 버그 수정
- [x] PetFormModal 모바일 깜빡임 해결 (useBodyScrollLock 제거 -> overflow:hidden)
- [x] PetFormStep1 OptimizedImage 롤백 (모달 내 shimmer 깜빡임)
- [x] PetFormModal step 변수 선언 순서 빌드 에러 수정

### UX 개선
- [x] 스마트 프리미엄 전환 UX: 직전 대화 주제 반영 동적 문구
- [x] 프리미엄 배너: 잔여 1회 "마지막 1회" 강조
- [x] 오프라인 감지 배너 (useOnlineStatus + OfflineBanner)
- [x] Supabase auto-refresh: 오프라인 시 stopAutoRefresh, 복귀 시 restart

### 정리/데드코드
- [x] chat/route.ts particles 디버그 로그 제거
- [x] 포인트 상점 premium_trial 데드코드 60줄 삭제
- [x] Supabase pg_cron 중복 POST job 삭제 (hourly-reminder-cron)

### 텔레그램 관리 시스템
- [x] 텔레그램 봇 생성 (@mementoani_admin_bot)
- [x] 알림 유틸리티 (src/lib/telegram.ts): 신고/결제/크론/에러/일일요약
- [x] 채널별 그룹 분리 (신고/결제/시스템 3개 그룹)
- [x] 신고 접수 시 텔레그램 알림
- [x] 결제 완료 시 텔레그램 알림
- [x] 크론 에러/실패 시 텔레그램 알림
- [x] AI 모더레이션 자동 숨김 시 텔레그램 알림
- [x] 반복 위반 유저 (30일 3회+) 경고 알림
- [x] 텔레그램 Webhook: 양방향 관리 명령어 (/stats, /ban, /hide, /premium 등)
- [x] HTML 이스케이프 (사용자 입력 안전 처리)

### 24시간 자동 모니터링
- [x] 매시간 헬스체크 (DB 6개 테이블 + OpenAI API)
- [x] 이상 발견 시 텔레그램 시스템 알림 자동 발송
- [x] 매일 09시 일일 요약 (전체회원/신규가입/대화/게시글/신고)

### 게시판 자동 관리 강화
- [x] 신고 3건 누적 자동 숨김 시 텔레그램 알림
- [x] 반복 위반 유저 차단 검토 경고 알림

### 보안 검수
- [x] payments API rate limit 추가 (prepare, complete)
- [x] reports API 입력값 검증 강화 (targetType/reason 화이트리스트, 500자 제한)
- [x] 텔레그램 알림 HTML 이스케이프 적용

### 크론/알림 인프라
- [x] Vercel Deployment Protection 비활성화 (크론 401 해결)
- [x] healthcheck 테이블명 수정 (posts -> community_posts)

---

## 완료 항목 (이전 스프린트)

- [x] 신고 API 서버 전환 (/api/reports 생성, RLS 우회) + 신고 버튼 액션바 배치
- [x] 사업자 정보 전화번호 추가 (010-5458-2506, KCP 카드사 심사 필수)
- [x] KCP 결제 pg_cron SQL 작성 + 매시간 리마인더 크론 실행 설정 완료
- [x] 간편모드 히어로 폰트 개선 (Jalnan2→Pretendard, 줄바꿈)
- [x] 한국어 조사 후처리: 클라이언트 인사말 generatePersonalizedGreeting 래핑
- [x] 한국어 조사 후처리: 서버 스트리밍 실시간 교정 (route.ts fixKoreanParticles)
- [x] 한국어 조사 후처리: DB 로드 시 교정 (useAIChat)
- [x] 프롬프트 내 잘못된 조사 전면 수정 ("꼼지이다"→"꼼지다") + GPT에 조사 규칙 명시
- [x] 좋아요 낙관적 UI + useRef 이중 클릭 방지 + adminSupabase 전환
- [x] 댓글 작성자 닉네임 익명 표시 수정 (author_name 폴백)
- [x] 홈↔커뮤니티 데이터 연동 (refetchAll)
- [x] 탭 전환 깜빡임 방지 (CSS fade-in)
- [x] 추모 모드 계정 전환 시 잔류 문제 해결 (localStorage 정리)
- [x] 리마인더 알림: Supabase pg_cron 매시간 크론 설정
- [x] 간편모드 히어로 배너 + 모바일 사이드바 토글
- [x] 가격 변경 9,900/18,900원
- [x] 미니홈피 fallback 미니미 제거
- [x] 사이드바 미니홈피 서브탭 직접 이동
- [x] 내 기록 페이지 복귀 시 서브탭 리셋
- [x] 대화 내보내기 폰트 깨짐 수정
- [x] 추모 섹션 프로필 사진 sharp 썸네일 + EXIF 회전
- [x] 추모 섹션 REST API 직접 호출로 RLS 문제 해결
- [x] 성능: API 응답 98% 감소 + RAF 가시성 최적화
- [x] AI 조사 후처리: 클라이언트 인사말 + 서버 스트리밍 + DB 로드 교정
- [x] AI 견종 맞춤 케어 응답 강제
- [x] 추모 섹션 빈 상태 UI 개선 + 포인트 상점 프리미엄 체험 제거
- [x] GPS 장례식장 안내 + 한국어 조사 후처리 (4-1-G 완료)
- [x] 전체 코드리딩 + 8인 팀 토론 (75건 이슈 발견)
- [x] 보안 P0 수정 3건 (SQL 인젝션 2건, 레거시 secret 제거)
- [x] AI 안전 P0 수정 2건 (위기감지 순서, 응급 키워드 조사)
- [x] 데드코드 2125줄 제거 (6개 파일 삭제)
- [x] 미사용 타입 14개 제거 + 섹션 번호 정리
- [x] 프론트엔드 개선 (CommunityPage memo, Sidebar/Layout 정리)
- [x] 홈 인기 이야기 → 펫매거진 스타일 세로 리스트로 변경
- [x] AI 응급/긴급 증상 감지 대폭 강화 (키워드 매칭 + 4단계 프롬프트)
- [x] .env.example에 TAVILY_API_KEY 추가
- [x] 댓글 에러 응답에서 내부 정보 노출 제거
- [x] 추모/일상 AI 파라미터 차별화 (presence/frequency penalty)
- [x] 게시판 자동 모더레이션 (욕설/스팸/도배/신고/AI)
- [x] 비추천 시스템 (+5P/-5P, 20개 자동 숨김)
- [x] 댓글 좋아요/비추천
- [x] 홈 PostModal 제거 → 커뮤니티 상세 이동
- [x] 추모 AI 프롬프트 전면 재작성 (시점/자해/감정회피/성격충돌)
- [x] Tavily Search API 연동 (케어 검색 RAG)
- [x] 추모 모드 실용 질문 검색 허용
- [x] Hydration mismatch 해결 (5개 파일)
- [x] ESLint 빌드 에러 수정
- [x] 홈 매거진 카드 배치 수정
- [x] DB 마이그레이션 전부 실행 확인
- [x] 커뮤니티 5개 게시판 공지글
