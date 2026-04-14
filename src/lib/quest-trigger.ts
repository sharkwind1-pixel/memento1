/**
 * quest-trigger.ts
 * 클라이언트에서 미션 완료를 트리거하는 헬퍼
 * - fire-and-forget (실패해도 원본 액션에 영향 없음)
 * - 멱등성은 서버에서 보장 (이미 완료한 미션은 무시)
 *
 * 사용:
 *   import { triggerQuest } from "@/lib/quest-trigger";
 *   await registerPet();
 *   triggerQuest("register_pet");
 */

import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import type { QuestId } from "@/config/constants";

export function triggerQuest(questId: QuestId): void {
    authFetch(API.QUESTS, {
        method: "POST",
        body: JSON.stringify({ questId }),
    })
        .then(async (res) => {
            if (!res.ok) return;
            const data = await res.json();
            // 새로 완료된 경우만 위젯 갱신 신호
            if (data.success && !data.alreadyCompleted) {
                window.dispatchEvent(new CustomEvent("quest-completed"));

                // 보너스 토스트는 useQuests 훅이 처리하지 못하므로 여기서도 표시
                if (data.bonusEarned > 0) {
                    const { toast } = await import("sonner");
                    toast.success(`미션 완료! +${data.bonusEarned}P 보너스`, {
                        description: data.nextQuestId ? "다음 단계로 이어집니다" : "수고하셨어요!",
                    });
                }
            }
        })
        .catch(() => {
            // 실패 무시
        });
}
