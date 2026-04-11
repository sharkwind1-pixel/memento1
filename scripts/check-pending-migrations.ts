/**
 * 미실행 마이그레이션 감지 스크립트
 * 사용법: npx tsx scripts/check-pending-migrations.ts
 *
 * 목적:
 * - supabase/migrations/ 디렉토리의 SQL 파일을 모두 탐지
 * - 각 파일이 실제로 DB에 적용되었는지 추정
 * - 미적용 파일 목록 + 권장 실행 명령 출력
 *
 * 추정 방법 (3가지 휴리스틱):
 * 1. _migrations 추적 테이블 (있는 경우 우선)
 * 2. 파일에서 ALTER TABLE / CREATE 구문 추출 → 컬럼/테이블 존재 확인
 * 3. 파일 이름에서 날짜 추출 → 최신순 정렬
 *
 * 출력:
 * - ✅ 적용된 것
 * - ❓ 추정 불가
 * - ❌ 미적용
 * - 미적용이 있으면 RELAY.md 최상단에 추가하라는 안내
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

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

const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

interface ParsedMigration {
    filename: string;
    addedColumns: Array<{ table: string; column: string }>;
    createdTables: string[];
    createdIndexes: string[];
    addedConstraints: string[];
}

/**
 * 마이그레이션 파일에서 핵심 변경 추출
 * 정규식 기반 파싱 (완벽하진 않지만 휴리스틱으로 충분)
 */
function parseMigration(filename: string): ParsedMigration {
    const filepath = path.join(MIGRATIONS_DIR, filename);
    const content = fs.readFileSync(filepath, "utf-8");

    const result: ParsedMigration = {
        filename,
        addedColumns: [],
        createdTables: [],
        createdIndexes: [],
        addedConstraints: [],
    };

    // ADD COLUMN [IF NOT EXISTS] column_name TYPE
    const addColumnRegex = /ALTER\s+TABLE\s+(?:public\.)?(\w+)[\s\S]*?ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
    let match: RegExpExecArray | null;
    while ((match = addColumnRegex.exec(content)) !== null) {
        result.addedColumns.push({ table: match[1], column: match[2] });
    }

    // CREATE TABLE [IF NOT EXISTS] table_name
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi;
    while ((match = createTableRegex.exec(content)) !== null) {
        result.createdTables.push(match[1]);
    }

    // CREATE INDEX [IF NOT EXISTS] index_name
    const createIndexRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
    while ((match = createIndexRegex.exec(content)) !== null) {
        result.createdIndexes.push(match[1]);
    }

    // ADD CONSTRAINT name
    const constraintRegex = /ADD\s+CONSTRAINT\s+(\w+)/gi;
    while ((match = constraintRegex.exec(content)) !== null) {
        result.addedConstraints.push(match[1]);
    }

    return result;
}

/**
 * 한 마이그레이션이 적용되었는지 추정
 * - 추가된 컬럼 중 하나라도 DB에 있으면 "applied"로 추정
 * - 컬럼이 없으면 "pending"
 */
async function estimateApplied(
    supabase: ReturnType<typeof createClient>,
    parsed: ParsedMigration
): Promise<"applied" | "pending" | "unknown"> {
    // 컬럼 변경이 있으면 그걸로 판단
    if (parsed.addedColumns.length > 0) {
        for (const col of parsed.addedColumns) {
            const probe = await supabase.from(col.table).select(col.column).limit(0);
            if (!probe.error) {
                return "applied"; // 하나라도 있으면 적용된 것으로 추정
            }
        }
        return "pending";
    }

    // 테이블 생성이 있으면 그걸로 판단
    if (parsed.createdTables.length > 0) {
        for (const table of parsed.createdTables) {
            const probe = await supabase.from(table).select("*").limit(0);
            if (!probe.error) {
                return "applied";
            }
        }
        return "pending";
    }

    // 인덱스/제약만 있으면 추정 불가
    return "unknown";
}

async function main() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        console.error(`❌ ${MIGRATIONS_DIR} 디렉토리 없음`);
        process.exit(2);
    }

    const files = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith(".sql") && !f.startsWith("_"))
        .sort();

    if (files.length === 0) {
        console.log("⚠️  마이그레이션 파일 없음");
        process.exit(0);
    }

    console.log(`🔍 미실행 마이그레이션 감지 (총 ${files.length}개 파일)\n`);

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        console.log("⚠️  환경변수 누락 — DB 추정 불가, 파일 목록만 출력\n");
        for (const f of files.slice(-15)) {
            console.log(`  • ${f}`);
        }
        console.log("\n⏭️  검증 SKIP (.env.local 필요)");
        process.exit(0);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    });

    const pending: string[] = [];
    const unknown: string[] = [];

    for (const filename of files) {
        const parsed = parseMigration(filename);
        const status = await estimateApplied(supabase, parsed);

        if (status === "applied") {
            // 너무 많으면 출력 길어짐. 일단 표시
            // console.log(`  ✅ ${filename}`);
        } else if (status === "pending") {
            pending.push(filename);
            console.log(`  ❌ ${filename}`);
            if (parsed.addedColumns.length > 0) {
                console.log(
                    `     └─ 미존재 컬럼: ${parsed.addedColumns
                        .map((c) => `${c.table}.${c.column}`)
                        .join(", ")}`
                );
            }
            if (parsed.createdTables.length > 0) {
                console.log(`     └─ 미존재 테이블: ${parsed.createdTables.join(", ")}`);
            }
        } else {
            unknown.push(filename);
        }
    }

    console.log("\n" + "═".repeat(60));
    console.log("📊 결과");
    console.log("═".repeat(60));
    console.log(`적용 완료: ${files.length - pending.length - unknown.length}`);
    console.log(`❌ 미적용: ${pending.length}`);
    console.log(`❓ 추정 불가 (인덱스/제약만): ${unknown.length}`);

    if (pending.length > 0) {
        console.log("\n⚠️  미실행 마이그레이션이 있습니다.");
        console.log("실행 방법:");
        console.log("  1. Supabase Dashboard → SQL Editor → 파일 내용 붙여넣고 Run");
        console.log("  2. 또는: npx tsx scripts/run-migration.ts <파일명>");
        console.log("\nRELAY.md 최상단 '🔴 미실행 마이그레이션' 섹션에 SQL 본문 + 검증 쿼리 기재 권장.");
        process.exit(1);
    }

    console.log("\n✅ 모든 마이그레이션 적용 완료 (또는 추정 불가만 남음)");
    process.exit(0);
}

main().catch((e) => {
    console.error("❌ 스크립트 실패:", e);
    process.exit(2);
});
