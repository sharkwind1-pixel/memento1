#!/bin/bash

# ============================================
# Ralph Loop - 메멘토애니 자동화 스크립트
# ============================================
# 사용법: ./ralph.sh
# 중지: Ctrl+C
# ============================================

# 설정
MAX_ITERATIONS=100          # 최대 반복 횟수 (안전장치)
SLEEP_BETWEEN=5             # 반복 사이 대기 시간 (초)
LOG_FILE="ralph.log"        # 로그 파일

# 색상
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 프롬프트 (Claude Code에 전달)
PROMPT="PRD.md를 읽고 체크되지 않은 첫 번째 기능을 구현해줘.
완료되면:
1. PRD.md에서 해당 항목 체크 [x]
2. AGENTS.md에 학습 내용 추가 (필요시)
3. git commit
4. 다음 미완료 항목이 있으면 계속, 없으면 '모든 기능 완료'라고 말해줘.

모바일 최적화 필수. 한글 주석 사용."

# 시작 메시지
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Ralph Loop 시작 - 메멘토애니${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}PRD.md의 미완료 항목을 순차적으로 작업합니다.${NC}"
echo -e "${YELLOW}중지하려면 Ctrl+C${NC}"
echo ""

# 로그 시작
echo "=== Ralph Loop 시작: $(date) ===" >> $LOG_FILE

# 메인 루프
iteration=0
while [ $iteration -lt $MAX_ITERATIONS ]; do
    iteration=$((iteration + 1))

    echo -e "${GREEN}--- Iteration $iteration ---${NC}"
    echo "=== Iteration $iteration: $(date) ===" >> $LOG_FILE

    # PRD.md에서 미완료 항목 확인
    unchecked=$(grep -c "\- \[ \]" PRD.md 2>/dev/null || echo "0")

    if [ "$unchecked" -eq "0" ]; then
        echo -e "${GREEN}모든 PRD 항목이 완료되었습니다!${NC}"
        echo "=== 완료: $(date) ===" >> $LOG_FILE
        break
    fi

    echo -e "${YELLOW}미완료 항목: $unchecked 개${NC}"

    # Claude Code 실행
    # 실제 환경에서는 아래 주석 해제
    # claude --print "$PROMPT" 2>&1 | tee -a $LOG_FILE

    # 테스트용 (실제 사용 시 삭제)
    echo "[테스트 모드] Claude Code 실행 시뮬레이션"
    echo "실제 사용 시 위의 claude 명령어 주석 해제"

    # 대기
    echo -e "${YELLOW}다음 반복까지 ${SLEEP_BETWEEN}초 대기...${NC}"
    sleep $SLEEP_BETWEEN

done

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Ralph Loop 종료${NC}"
echo -e "${GREEN}============================================${NC}"
echo "=== Ralph Loop 종료: $(date) ===" >> $LOG_FILE
