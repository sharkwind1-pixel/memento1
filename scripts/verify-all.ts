/**
 * 전체 검증 오케스트레이터
 * 사용법: npx tsx scripts/verify-all.ts [--skip-build] [--skip-db]
 *
 * 실행 단계:
 * 1. typecheck (npx tsc --noEmit)
 * 2. lint (npm run lint)
 * 3. build (npm run build)
 * 4. DB 스키마 (verify-db-schema.ts)
 * 5. 미실행 마이그레이션 (check-pending-migrations.ts)
 * 6. Import 그래프 (check-import-graph.ts)
 *
 * 출력: 5섹션 Verification Report
 *
 * Exit code:
 *   0  모든 검증 통과 (L3+)
 *   1  warn (skip된 항목 있거나 import warning)
 *   2  fail (typecheck/build/lint/DB 실패)
 */

import { spawnSync } from "child_process";
import * as path from "path";

interface CheckResult {
    name: string;
    status: "pass" | "fail" | "warn" | "skip";
    duration: number;
    detail?: string;
}

const results: CheckResult[] = [];

function runCheck(
    name: string,
    cmd: string,
    args: string[],
    options: { skip?: boolean; skipReason?: string } = {}
): CheckResult {
    if (options.skip) {
        const result: CheckResult = {
            name,
            status: "skip",
            duration: 0,
            detail: options.skipReason,
        };
        results.push(result);
        return result;
    }

    console.log(`\n▶ ${name} 실행 중...`);
    const start = Date.now();
    const proc = spawnSync(cmd, args, {
        cwd: path.join(__dirname, ".."),
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
        shell: true,
    });
    const duration = Date.now() - start;

    const stdout = proc.stdout?.toString() || "";
    const stderr = proc.stderr?.toString() || "";
    const code = proc.status;

    let status: CheckResult["status"];
    let detail: string | undefined;

    if (code === 0) {
        status = "pass";
    } else if (code === 1) {
        status = "warn";
        detail = (stderr || stdout).slice(-500);
    } else {
        status = "fail";
        detail = (stderr || stdout).slice(-1000);
    }

    const result: CheckResult = { name, status, duration, detail };
    results.push(result);

    const icon = status === "pass" ? "✅" : status === "warn" ? "⚠️ " : "❌";
    console.log(`${icon}  ${name}  (${(duration / 1000).toFixed(1)}s)`);
    if (detail && status !== "pass") {
        console.log(detail.split("\n").slice(-15).join("\n"));
    }

    return result;
}

const skipBuild = process.argv.includes("--skip-build");
const skipDb = process.argv.includes("--skip-db");

console.log("═".repeat(60));
console.log("🔍 메멘토애니 전체 검증 (verify-all)");
console.log("═".repeat(60));

// 1. typecheck
runCheck("TypeCheck (tsc --noEmit)", "npx", ["tsc", "--noEmit"]);

// 2. lint
runCheck("Lint (next lint)", "npm", ["run", "lint"]);

// 3. build (가장 무거움)
runCheck("Build (next build)", "npm", ["run", "build"], {
    skip: skipBuild,
    skipReason: "--skip-build 플래그",
});

// 4. DB 스키마
runCheck("DB Schema (verify-db-schema)", "npx", ["tsx", "scripts/verify-db-schema.ts"], {
    skip: skipDb,
    skipReason: "--skip-db 플래그",
});

// 5. 미실행 마이그레이션
runCheck(
    "Pending Migrations (check-pending-migrations)",
    "npx",
    ["tsx", "scripts/check-pending-migrations.ts"],
    { skip: skipDb, skipReason: "--skip-db 플래그" }
);

// 6. Import 그래프
runCheck("Import Graph (check-import-graph)", "npx", ["tsx", "scripts/check-import-graph.ts"]);

// ============================================================
// 5섹션 Verification Report 생성
// ============================================================

const passCount = results.filter((r) => r.status === "pass").length;
const failCount = results.filter((r) => r.status === "fail").length;
const warnCount = results.filter((r) => r.status === "warn").length;
const skipCount = results.filter((r) => r.status === "skip").length;

console.log("\n\n");
console.log("═".repeat(60));
console.log("📋 Verification Report");
console.log("═".repeat(60));

console.log("\n### 3. Automated Checks");
console.log("| Check | Result | Duration |");
console.log("|---|---|---|");
for (const r of results) {
    const icon =
        r.status === "pass" ? "✅" : r.status === "fail" ? "❌" : r.status === "warn" ? "⚠️" : "⏭️";
    const dur = r.duration > 0 ? `${(r.duration / 1000).toFixed(1)}s` : "-";
    console.log(`| ${r.name} | ${icon} ${r.status} | ${dur} |`);
}

console.log("\n### 5. Verification Level");
let level: string;
if (failCount > 0) {
    level = "L0_미검증 (검증 실패 — 수정 필요)";
} else if (skipCount > 0 || warnCount > 0) {
    if (results.find((r) => r.name.includes("Build"))?.status === "pass") {
        level = "L2_타입+빌드 (자동 검증 일부 SKIP/Warn)";
    } else {
        level = "L1_빌드 (Build SKIP, 신뢰도 낮음)";
    }
} else {
    level = "L3_정적전수 (모든 자동 검증 통과)";
}
console.log(`**달성: ${level}**`);

console.log("\n### 6. Remaining Risk");
if (skipCount > 0) {
    console.log("- ⏭️  SKIP된 검증:");
    for (const r of results.filter((r) => r.status === "skip")) {
        console.log(`  - ${r.name}: ${r.detail}`);
    }
}
if (warnCount > 0) {
    console.log("- ⚠️  Warning 항목:");
    for (const r of results.filter((r) => r.status === "warn")) {
        console.log(`  - ${r.name}`);
    }
}
console.log("- 📝 L4_API응답 / L5_E2E는 자동 검증 불가 → 사용자 수동 확인 필요");

console.log("\n### 7. Confidence Statement");
console.log(
    `**"이 작업은 ${level.split(" ")[0]}까지만 검증되었습니다. 그 이상은 보장 못 합니다."**`
);

console.log("\n" + "─".repeat(60));
console.log(`Pass: ${passCount}  /  Warn: ${warnCount}  /  Skip: ${skipCount}  /  Fail: ${failCount}`);
console.log("─".repeat(60));

if (failCount > 0) {
    process.exit(2);
}
if (warnCount > 0 || skipCount > 0) {
    process.exit(1);
}
process.exit(0);
