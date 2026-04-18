/**
 * PetProfileMigrationCard
 *
 * 2026-04-18 펫 프로필 사진 Storage 우회 버그의 일회성 복구 카드.
 * 관리자 대시보드 상단에 배치되어, pets_profile_image_backup 테이블에
 * pending 복구 대상이 있을 때만 노출됨.
 *
 * 동작:
 * - 마운트 시 GET /api/admin/migrate-pet-profiles로 현황 확인
 * - data_url_pending > 0이면 카드 표시 + "복구 실행" 버튼
 * - 버튼 클릭 → POST → 결과 toast + 현황 재조회
 * - 모두 처리되면 카드 자동 숨김 (pending=0 && blob_url=0)
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/auth-fetch";

interface Summary {
    total: number;
    data_url_total: number;
    data_url_pending: number;
    data_url_restored: number;
    blob_url_total: number;
}

export default function PetProfileMigrationCard() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);

    const loadSummary = useCallback(async () => {
        try {
            const res = await authFetch("/api/admin/migrate-pet-profiles");
            if (!res.ok) {
                setSummary(null);
                return;
            }
            const data = await res.json();
            setSummary(data.summary as Summary);
        } catch {
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    const handleRestore = useCallback(async () => {
        if (running) return;
        setRunning(true);
        try {
            const res = await authFetch("/api/admin/migrate-pet-profiles", { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
                toast.error(`복구 실패: ${data?.error || "알 수 없는 오류"}`);
                return;
            }
            const { processed, restored, failed } = data.summary as {
                processed: number;
                restored: number;
                failed: number;
            };
            if (failed === 0 && restored > 0) {
                toast.success(`펫 프로필 ${restored}건 복구 완료`);
            } else if (restored > 0 && failed > 0) {
                toast.warning(`복구 ${restored}건 성공, ${failed}건 실패`);
            } else if (processed === 0) {
                toast.info("복구할 항목이 없어요");
            } else {
                toast.error(`복구 실패 ${failed}건`);
            }
            await loadSummary();
        } catch (err) {
            toast.error(`복구 요청 실패: ${err instanceof Error ? err.message : "네트워크 오류"}`);
        } finally {
            setRunning(false);
        }
    }, [running, loadSummary]);

    if (loading || !summary) return null;

    // 복구할 것도 없고 blob도 없으면 카드 숨김
    const nothingToShow =
        summary.data_url_pending === 0 && summary.blob_url_total === 0;
    if (nothingToShow) return null;

    return (
        <Card className="border-memento-300 dark:border-memento-700 bg-memento-50/50 dark:bg-memento-900/10">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-memento-600 dark:text-memento-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            펫 프로필 사진 데이터 복구
                        </p>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            2026-04-18 이전 업로드된 펫 프로필 사진이 Storage가 아닌 DB에 직접
                            저장되어 있었습니다. 백업된 {summary.data_url_total}건 중
                            <b className="text-memento-700 dark:text-memento-300"> {summary.data_url_pending}건</b>이
                            복구 대기 중입니다.
                            {summary.blob_url_total > 0 && (
                                <>
                                    {" "}추가로 <b className="text-red-600 dark:text-red-400">blob URL {summary.blob_url_total}건</b>은
                                    브라우저 메모리 전용 형태라 복구 불가 — 해당 유저에게 재업로드 안내가 필요합니다.
                                </>
                            )}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            {summary.data_url_pending > 0 ? (
                                <Button
                                    onClick={handleRestore}
                                    disabled={running}
                                    size="sm"
                                    className="bg-memento-600 hover:bg-memento-700 text-white"
                                >
                                    {running ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                            복구 중...
                                        </>
                                    ) : (
                                        <>복구 실행 ({summary.data_url_pending}건)</>
                                    )}
                                </Button>
                            ) : summary.data_url_restored > 0 ? (
                                <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    data URL 복구 완료 ({summary.data_url_restored}건)
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
