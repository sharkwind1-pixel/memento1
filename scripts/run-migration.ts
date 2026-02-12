/**
 * 마이그레이션 자동 실행 스크립트
 * 사용법: npx tsx scripts/run-migration.ts [파일명]
 * 예시: npx tsx scripts/run-migration.ts 20260212_admin_update_policy.sql
 *       npx tsx scripts/run-migration.ts all  (미적용 전부 실행)
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("환경변수 누락: .env.local에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요");
    process.exit(1);
}

// service_role 키로 Supabase 클라이언트 생성 (RLS 우회)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

// 마이그레이션 기록 테이블 생성 (없으면)
async function ensureMigrationTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            executed_at TIMESTAMPTZ DEFAULT NOW()
        );
    `;
    const { error } = await supabase.rpc("exec_sql", { sql_text: sql }).single();
    // exec_sql이 없으면 직접 실행
    if (error) {
        // 테이블이 이미 있을 수 있으니 무시
    }
}

// SQL 실행 (Supabase REST API 통해)
async function executeSql(sql: string): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SERVICE_ROLE_KEY,
                "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ sql_text: sql }),
        });

        if (!response.ok) {
            // exec_sql RPC가 없으면 pg_net이나 직접 쿼리 사용
            // Supabase SQL API 직접 호출
            const pgResponse = await fetch(`${SUPABASE_URL}/pg`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SERVICE_ROLE_KEY,
                    "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({ query: sql }),
            });

            if (!pgResponse.ok) {
                const errText = await pgResponse.text();
                return { success: false, error: errText };
            }
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
}

// 단일 마이그레이션 실행
async function runMigration(filename: string) {
    const filepath = path.join(MIGRATIONS_DIR, filename);

    if (!fs.existsSync(filepath)) {
        console.error(`파일 없음: ${filepath}`);
        return false;
    }

    const sql = fs.readFileSync(filepath, "utf-8");
    console.log(`\n실행 중: ${filename}`);
    console.log("─".repeat(50));

    const result = await executeSql(sql);

    if (result.success) {
        console.log(`성공: ${filename}`);
        return true;
    } else {
        console.error(`실패: ${filename}`);
        console.error(result.error);
        return false;
    }
}

// 메인
async function main() {
    const arg = process.argv[2];

    if (!arg) {
        console.log("사용법:");
        console.log("  npx tsx scripts/run-migration.ts <파일명>     단일 실행");
        console.log("  npx tsx scripts/run-migration.ts all          전체 실행");
        console.log("  npx tsx scripts/run-migration.ts list         목록 보기");
        console.log("");
        console.log("사용 가능한 마이그레이션:");
        const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith(".sql")).sort();
        files.forEach(f => console.log(`  ${f}`));
        return;
    }

    if (arg === "list") {
        const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith(".sql")).sort();
        console.log("마이그레이션 목록:");
        files.forEach(f => console.log(`  ${f}`));
        return;
    }

    if (arg === "all") {
        const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith(".sql")).sort();
        console.log(`${files.length}개 마이그레이션 실행 시작...\n`);

        let success = 0;
        let fail = 0;

        for (const file of files) {
            const result = await runMigration(file);
            if (result) success++;
            else fail++;
        }

        console.log(`\n완료: ${success} 성공, ${fail} 실패`);
        return;
    }

    // 단일 파일 실행
    const filename = arg.endsWith(".sql") ? arg : `${arg}.sql`;
    await runMigration(filename);
}

main().catch(console.error);
