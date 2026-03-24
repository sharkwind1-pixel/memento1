# 보안 검수

새 API 엔드포인트나 기능 추가 시 보안 체크리스트를 수행합니다.

## 체크리스트

### API 보안
1. 인증 확인: `getAuthUser()` 또는 `createServerSupabase()`로 세션 검증
2. RLS 정책: 새 테이블에 `auth.uid() = user_id` 정책 적용 확인
3. Rate Limit: `checkRateLimit()` 또는 `checkRateLimitDB()` 적용
4. VPN 체크: 금전 관련 API에 `checkVPN()` 적용
5. 입력값 검증: 문자열 길이, 타입 체크
6. CRON API: `CRON_SECRET` 필수 체크

### 프론트엔드 보안
1. XSS: 사용자 입력을 `dangerouslySetInnerHTML` 없이 렌더링
2. 민감 정보: API 키, 시크릿이 클라이언트 번들에 포함 안 됨
3. 프리미엄 검증: 서버에서 DB 기반 isPremium 체크 (클라이언트만 X)

### 파일 업로드
1. 확장자 화이트리스트: `ALLOWED_IMAGE_EXTENSIONS`, `ALLOWED_VIDEO_EXTENSIONS`
2. MIME 타입 검증: `validateMimeType()`
3. 파일 크기 제한

### DB
1. 원자적 업데이트: 포인트/구매는 `.gte()` 조건 + 단일 쿼리
2. FOR UPDATE 락: 동시성 이슈 있는 RPC
3. 마이그레이션: SQL 파일 작성 + 실행까지 완료

## 실행
변경된 파일을 기준으로 위 체크리스트를 자동 검사하고 결과를 알려줘.
