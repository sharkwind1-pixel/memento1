# 배포

빌드 확인 + 커밋 + 푸시 + RELAY.md 업데이트를 한번에 수행합니다.

## 절차

1. `next build`로 빌드 성공 확인
2. 변경된 파일을 `git add`
3. 변경 내용을 분석해서 한국어 커밋 메시지 작성
4. `git commit` (Co-Authored-By 포함)
5. `git push origin main`
6. RELAY.md에 작업 내용 간단히 기록

## 규칙
- 빌드 실패하면 중단하고 에러 알려줘
- 커밋 메시지는 한국어로, 변경 요약 포함
- RELAY.md의 현재 세션 섹션에 추가
- `.env`, `credentials` 같은 민감 파일은 절대 커밋 안 함
