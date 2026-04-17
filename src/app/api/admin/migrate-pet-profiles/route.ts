/**
 * /api/admin/migrate-pet-profiles
 *
 * 펫 프로필 사진 Storage 우회 버그 복구 (2026-04-18 발견).
 *
 * 배경:
 * - PetContext.addPet/updatePet이 Storage 업로드를 거치지 않고 blob/data URL을
 *   그대로 DB에 저장하던 버그 → 다른 세션/디바이스에서 모두 깨져 보임.
 * - 20260418_pets_profile_image_storage_only 마이그레이션이 기존 값을
 *   pets_profile_image_backup 테이블에 백업 + pets.profile_image는 NULL로.
 * - 이 API가 백업 테이블을 순회하며 data URL을 실제 Storage에 업로드하고
 *   pets.profile_image를 정상 URL로 복구한다. blob URL은 복구 불가 (브라우저 메모리)
 *   이므로 skipped로 기록.
 *
 * 보안: 관리자 인증 필수. GET은 진단(현황 조회), POST는 실제 복구.
 * 멱등: 이미 restored_at 있는 row는 skip.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function verifyAdmin() {
    const user = await getAuthUser();
    if (!user) return null;
    if (ADMIN_EMAILS.includes(user.email || "")) return user;
    const adminSupabase = createAdminSupabase();
    const { data: profile } = await adminSupabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
    return profile?.is_admin ? user : null;
}

interface BackupSummaryRow {
    pet_id: string;
    user_id: string;
    original_kind: "data_url" | "blob_url";
    restored_at: string | null;
    restored_url: string | null;
    backed_up_at: string;
}

interface BackupRestoreRow {
    pet_id: string;
    user_id: string;
    original_value: string;
}

/**
 * data URL을 Buffer로 변환.
 * 예: "data:image/jpeg;base64,/9j/4AAQ..." → { buffer, mime, ext }
 */
function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string; ext: string } | null {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    const mime = match[1];
    try {
        const buffer = Buffer.from(match[2], "base64");
        const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
        return { buffer, mime, ext };
    } catch {
        return null;
    }
}

export async function GET() {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

    const adminSupabase = createAdminSupabase();
    const { data, error } = await adminSupabase
        .from("pets_profile_image_backup")
        .select("pet_id, user_id, original_kind, restored_at, restored_url, backed_up_at");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data as BackupSummaryRow[]) || [];
    const summary = {
        total: rows.length,
        data_url_total: rows.filter((r) => r.original_kind === "data_url").length,
        data_url_pending: rows.filter((r) => r.original_kind === "data_url" && !r.restored_at).length,
        data_url_restored: rows.filter((r) => r.original_kind === "data_url" && r.restored_at).length,
        blob_url_total: rows.filter((r) => r.original_kind === "blob_url").length,
    };

    return NextResponse.json({ summary, rows });
}

export async function POST(request: NextRequest) {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

    const adminSupabase = createAdminSupabase();

    // 복구 대상: data_url 중 아직 restored 안 된 것만
    const { data: backups, error: fetchError } = await adminSupabase
        .from("pets_profile_image_backup")
        .select("pet_id, user_id, original_value, original_kind")
        .eq("original_kind", "data_url")
        .is("restored_at", null);

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const results: Array<{ pet_id: string; status: "restored" | "failed"; error?: string; url?: string }> = [];
    const rows = (backups as BackupRestoreRow[]) || [];

    for (const row of rows) {
        try {
            const parsed = parseDataUrl(row.original_value);
            if (!parsed) {
                results.push({ pet_id: row.pet_id, status: "failed", error: "invalid data URL" });
                continue;
            }

            const timestamp = Date.now();
            const path = `pet-profiles/${row.user_id}/${row.pet_id}-restored-${timestamp}.${parsed.ext}`;

            const { error: uploadError } = await adminSupabase.storage
                .from("pet-media")
                .upload(path, parsed.buffer, {
                    contentType: parsed.mime,
                    cacheControl: "31536000",
                    upsert: false,
                });

            if (uploadError) {
                results.push({ pet_id: row.pet_id, status: "failed", error: `upload: ${uploadError.message}` });
                continue;
            }

            const { data: publicUrlData } = adminSupabase.storage
                .from("pet-media")
                .getPublicUrl(path);
            const publicUrl = publicUrlData.publicUrl;

            // pets.profile_image 업데이트
            const { error: updateError } = await adminSupabase
                .from("pets")
                .update({ profile_image: publicUrl })
                .eq("id", row.pet_id);

            if (updateError) {
                // 업로드는 성공했지만 DB 업데이트 실패 — 다음 실행에서 중복 업로드 방지 위해 backup은 그대로
                results.push({ pet_id: row.pet_id, status: "failed", error: `db update: ${updateError.message}` });
                continue;
            }

            // 백업 테이블에 복구 완료 기록
            await adminSupabase
                .from("pets_profile_image_backup")
                .update({ restored_at: new Date().toISOString(), restored_url: publicUrl })
                .eq("pet_id", row.pet_id);

            results.push({ pet_id: row.pet_id, status: "restored", url: publicUrl });
        } catch (err) {
            results.push({
                pet_id: row.pet_id,
                status: "failed",
                error: err instanceof Error ? err.message : "unknown",
            });
        }
    }

    const restored = results.filter((r) => r.status === "restored").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
        summary: {
            processed: results.length,
            restored,
            failed,
            blob_url_note: "blob URL은 브라우저 메모리 전용이라 복구 불가. 유저가 직접 재업로드 필요.",
        },
        results,
    });
}
