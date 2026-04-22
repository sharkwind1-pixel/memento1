#!/usr/bin/env node
/**
 * 일회성 펫 프로필 사진 복구 스크립트.
 * pets_profile_image_backup 테이블의 data URL 7개를 base64 디코드 →
 * Supabase Storage (pet-media 버킷)에 업로드 → pets.profile_image 갱신.
 *
 * 실행: node scripts/restore-pet-profiles.mjs
 * 필요 env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// .env.local 파싱 (dotenv 없이 직접)
function loadEnv() {
    try {
        const envPath = resolve(process.cwd(), ".env.local");
        const content = readFileSync(envPath, "utf8");
        for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const eq = trimmed.indexOf("=");
            if (eq === -1) continue;
            const key = trimmed.slice(0, eq).trim();
            const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
            if (!process.env[key]) process.env[key] = value;
        }
    } catch (e) {
        console.warn("[env] .env.local 로딩 실패:", e.message);
    }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 누락");
    console.error("   .env.local에 아래 두 줄이 있어야 합니다:");
    console.error("   NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co");
    console.error("   SUPABASE_SERVICE_ROLE_KEY=eyJ...");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

function parseDataUrl(dataUrl) {
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) return null;
    const mime = m[1];
    const buffer = Buffer.from(m[2], "base64");
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    return { buffer, mime, ext };
}

async function main() {
    console.log("[1/3] 복구 대상 조회...");
    const { data: backups, error: fetchErr } = await supabase
        .from("pets_profile_image_backup")
        .select("pet_id, user_id, original_value")
        .eq("original_kind", "data_url")
        .is("restored_at", null);

    if (fetchErr) {
        console.error("❌ 백업 조회 실패:", fetchErr.message);
        process.exit(1);
    }

    console.log(`   → ${backups.length}개 발견\n`);

    if (backups.length === 0) {
        console.log("✅ 복구할 항목이 없습니다.");
        return;
    }

    let success = 0, failed = 0;

    for (const row of backups) {
        const parsed = parseDataUrl(row.original_value);
        if (!parsed) {
            console.error(`  ✗ ${row.pet_id}: data URL 파싱 실패`);
            failed++;
            continue;
        }

        const path = `pet-profiles/${row.user_id}/${row.pet_id}-restored-${Date.now()}.${parsed.ext}`;

        const { error: upErr } = await supabase.storage
            .from("pet-media")
            .upload(path, parsed.buffer, {
                contentType: parsed.mime,
                cacheControl: "31536000",
                upsert: false,
            });

        if (upErr) {
            console.error(`  ✗ ${row.pet_id}: 업로드 실패 - ${upErr.message}`);
            failed++;
            continue;
        }

        const { data: urlData } = supabase.storage
            .from("pet-media")
            .getPublicUrl(path);
        const publicUrl = urlData.publicUrl;

        const { error: updErr } = await supabase
            .from("pets")
            .update({ profile_image: publicUrl })
            .eq("id", row.pet_id);

        if (updErr) {
            console.error(`  ✗ ${row.pet_id}: pets UPDATE 실패 - ${updErr.message}`);
            failed++;
            continue;
        }

        await supabase
            .from("pets_profile_image_backup")
            .update({ restored_at: new Date().toISOString(), restored_url: publicUrl })
            .eq("pet_id", row.pet_id);

        console.log(`  ✓ ${row.pet_id} → ${publicUrl.slice(0, 80)}...`);
        success++;
    }

    console.log(`\n[결과] ✅ ${success}개 복구 / ❌ ${failed}개 실패`);
}

main().catch((err) => {
    console.error("[스크립트 오류]", err);
    process.exit(1);
});
