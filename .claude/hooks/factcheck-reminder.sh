#!/usr/bin/env bash
# Stop hook — 9번 팩트체크 자동 강제 리마인더
#
# 목적: 코드 변경 / DB 변경 / 커밋이 감지된 턴을 끝낼 때, 9번 팩트체크(비판적 검토)
#       서브에이전트를 돌렸는지 모델 스스로 점검하게 강제한다. (사용자가 매번
#       상기시켜야 하는 반복 누락을 구조적으로 차단 — fact_checker_always_on.md)
#
# 메커니즘: shell hook은 서브에이전트를 직접 실행할 수 없으므로, Stop 이벤트에서
#           decision:block + reason 을 출력해 모델 컨텍스트에 점검을 주입한다.
#           sentinel 파일로 "같은 상태"에서는 1회만 발동 → 무한 종료 차단.
#
# 발동 조건: src/ 또는 supabase/migrations/ 에 미커밋 변경이 있거나, 최근 20분 내 커밋이 있을 때.

REPO="C:/Users/shark/memento1"
changed=$(git -C "$REPO" status --porcelain -- src supabase/migrations 2>/dev/null | wc -l | tr -d ' ')
head=$(git -C "$REPO" rev-parse --short HEAD 2>/dev/null)
recent=$(git -C "$REPO" log -1 --since="20 minutes ago" --format=%h 2>/dev/null)
sentinel="/tmp/claude_factcheck_memento.txt"
sig="$head:$changed:$recent"

if [ "$changed" != "0" ] || [ -n "$recent" ]; then
  last=$(cat "$sentinel" 2>/dev/null)
  if [ "$last" != "$sig" ]; then
    printf '%s' "$sig" > "$sentinel" 2>/dev/null
    printf '{"decision":"block","reason":"[자동 점검] 코드/DB 변경·커밋 감지. 9번 팩트체크(비판적 검토) 에이전트를 돌렸는가? 데이터분석·광범위변경·DB변경에 해당하면 지금 Agent 툴로 적대 검증을 실행하라. 이미 돌렸으면 무엇을 어떤 결론(예: SHIP OK)으로 검증했는지 한 줄 남기고 종료하라."}'
  fi
fi
exit 0
