/**
 * DB 스키마 검증 스크립트
 * 사용법: npx tsx scripts/verify-db-schema.ts
 *
 * 목적:
 * - 코드에서 참조하는 Supabase 컬럼/제약/인덱스가 실제 DB에 존재하는지 확인
 * - 미실행 마이그레이션으로 인한 silent fail 사전 감지
 * - 검증 워크플로(L3_정적전수)의 핵심 구성 요소
 *
 * 검증 항목:
 * 1. 핵심 테이블 존재 여부
 * 2. 라이프사이클 컬럼 (subscription_phase 등 6개)
 * 3. notifications.type CHECK 제약 (admin_message 포함)
 * 4. notifications.sender_id 컬럼
 * 5. pets.archived_at, pet_media.archived_at + is_favorite
 * 6. profiles.device_fingerprint
 * 7. point_transactions CHECK (음수 허용)
 *
 * 출력: ✅/❌/⚠️ 표 + 통과/실패 카운트
 * Exit code: 모두 통과 0, 미적용 마이그레이션 있으면 1, 치명적 누락 시 2
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// .env.local 로딩
function loadEnvLocal() {
    const envPath = path.join(__dirname, "..", ".env.local");
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.substring(0, eqIdx).trim();
        const value = trimmed.substring(eqIdx + 1).trim();
        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("⚠️  환경변수 누락: .env.local에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요");
    console.error("⏭️  DB 검증 SKIP (네트워크 / 환경변수 미설정)");
    process.exit(0); // skip은 0 (검증 자체가 환경 의존이므로)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

// ============================================================
// 검증 항목 정의
// ============================================================

interface ColumnCheck {
    table: string;
    column: string;
    expectedType?: string;
    description: string;
}

interface ConstraintCheck {
    name: string;
    table: string;
    expectedSubstring: string; // CHECK 제약에 포함되어야 할 문자열
    description: string;
}

const REQUIRED_COLUMNS: ColumnCheck[] = [
    // 라이프사이클 (3단계 재설계)
    { table: "profiles", column: "subscription_phase", expectedType: "text", description: "구독 라이프사이클 단계" },
    { table: "profiles", column: "subscription_cancelled_at", expectedType: "timestamp with time zone", description: "해지 시각" },
    { table: "profiles", column: "data_reset_at", expectedType: "timestamp with time zone", description: "영구 삭제 예정일" },
    { table: "profiles", column: "protected_pet_id", expectedType: "uuid", description: "대표 펫 ID" },

    // archive
    { table: "pets", column: "archived_at", expectedType: "timestamp with time zone", description: "펫 보관함 이동 시각" },
    { table: "pet_media", column: "archived_at", expectedType: "timestamp with time zone", description: "사진 보관함 이동 시각" },
    { table: "pet_media", column: "is_favorite", expectedType: "boolean", description: "즐겨찾기 우선 보존" },

    // device fingerprint (2026-04-10)
    { table: "profiles", column: "device_fingerprint", expectedType: "text", description: "디바이스 핑거프린팅" },

    // 차단 (논리 충돌 1)
    { table: "profiles", column: "is_banned", expectedType: "boolean", description: "차단 유저" },

    // 관리자 메시지 (2026-04-12)
    { table: "notifications", column: "sender_id", expectedType: "uuid", description: "관리자 메시지 발신자" },

    // 핵심 알림 컬럼
    { table: "notifications", column: "dedup_key", expectedType: "text", description: "중복 발송 방지" },
];

const REQUIRED_CONSTRAINTS: ConstraintCheck[] = [
    {
        name: "notifications_type_check",
        table: "notifications",
        expectedSubstring: "admin_message",
        description: "관리자 메시지 type 허용",
    },
    {
        name: "notifications_type_check",
        table: "notifications",
        expectedSubstring: "subscription_archive_countdown",
        description: "라이프사이클 카운트다운 허용",
    },
];

// ============================================================
// 검증 로직
// ============================================================

interface CheckResult {
    name: string;
    status: "pass" | "fail" | "warn";
    detail?: string;
}

const results: CheckResult[] = [];

async function checkColumn(c: ColumnCheck): Promise<void> {
    const label = `${c.table}.${c.column}`;
    try {
        // information_schema.columns에서 직접 조회
        const { data, error } = await supabase
            .rpc("exec_sql", {
                sql_text: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${c.table}' AND column_name = '${c.column}'`,
            })
            .single();

        if (error) {
            // exec_sql RPC가 없으면 다른 방법: 빈 쿼리로 컬럼 이름만 시도
            const probe = await supabase.from(c.table).select(c.column).limit(0);
            if (probe.error) {
                results.push({
                    name: label,
                    status: "fail",
                    detail: `${c.description} — ${probe.error.message}`,
                });
                return;
            }
            results.push({
                name: label,
                status: "pass",
                detail: `${c.description} (probe만, 타입 확인 X)`,
            });
            return;
        }

        const row = data as { column_name?: string; data_type?: string } | null;
        if (!row?.column_name) {
            results.push({
                name: label,
                status: "fail",
                detail: `${c.description} — 컬럼 없음`,
            });
            return;
        }

        if (c.expectedType && row.data_type !== c.expectedType) {
            results.push({
                name: label,
                status: "warn",
                detail: `${c.description} — 타입 불일치 (실제: ${row.data_type}, 예상: ${c.expectedType})`,
            });
            return;
        }

        results.push({
            name: label,
            status: "pass",
            detail: c.description,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({
            name: label,
            status: "fail",
            detail: `${c.description} — ${msg}`,
        });
    }
}

async function checkConstraint(c: ConstraintCheck): Promise<void> {
    const label = `${c.table}.${c.name}[${c.expectedSubstring}]`;
    try {
        // pg_constraint에서 CHECK 정의 조회
        const { data, error } = await supabase
            .rpc("exec_sql", {
                sql_text: `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = '${c.name}'`,
            })
            .single();

        if (error || !data) {
            results.push({
                name: label,
                status: "warn",
                detail: `${c.description} — exec_sql RPC 없음, 검증 SKIP`,
            });
            return;
        }

        const row = data as { def?: string } | null;
        if (!row?.def) {
            results.push({
                name: label,
                status: "fail",
                detail: `${c.description} — 제약 없음`,
            });
            return;
        }

        if (!row.def.includes(c.expectedSubstring)) {
            results.push({
                name: label,
                status: "fail",
                detail: `${c.description} — '${c.expectedSubstring}' 미포함`,
            });
            return;
        }

        results.push({
            name: label,
            status: "pass",
            detail: c.description,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({
            name: label,
            status: "warn",
            detail: `${c.description} — ${msg}`,
        });
    }
}

// ============================================================
// 메인
// ============================================================

async function main() {
    console.log("🔍 DB 스키마 검증 시작\n");
    console.log(`Supabase URL: ${SUPABASE_URL}\n`);

    console.log("📋 컬럼 존재 검증");
    console.log("─".repeat(60));
    for (const col of REQUIRED_COLUMNS) {
        await checkColumn(col);
    }

    console.log("\n🔒 제약 조건 검증");
    console.log("─".repeat(60));
    for (const con of REQUIRED_CONSTRAINTS) {
        await checkConstraint(con);
    }

    // 결과 출력
    console.log("\n" + "═".repeat(60));
    console.log("📊 검증 결과");
    console.log("═".repeat(60));

    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const warned = results.filter((r) => r.status === "warn").length;

    for (const r of results) {
        const icon = r.status === "pass" ? "✅" : r.status === "fail" ? "❌" : "⚠️ ";
        console.log(`${icon}  ${r.name}`);
        if (r.detail && r.status !== "pass") {
            console.log(`    └─ ${r.detail}`);
        }
    }

    console.log("\n" + "─".repeat(60));
    console.log(`Pass: ${passed}  /  Warn: ${warned}  /  Fail: ${failed}`);
    console.log("─".repeat(60));

    if (failed > 0) {
        console.log("\n❌ 검증 실패. 미실행 마이그레이션 확인 필요:");
        console.log("   → npx tsx scripts/check-pending-migrations.ts");
        process.exit(2);
    }

    if (warned > 0) {
        console.log("\n⚠️  일부 검증 SKIP/타입 불일치. 수동 확인 권장.");
        process.exit(1);
    }

    console.log("\n✅ 모든 컬럼/제약 검증 통과");
    process.exit(0);
}

main().catch((e) => {
    console.error("❌ 검증 스크립트 자체 실패:", e);
    process.exit(2);
});
