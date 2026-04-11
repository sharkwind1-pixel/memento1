/**
 * Import 그래프 검증 스크립트
 * 사용법: npx tsx scripts/check-import-graph.ts
 *
 * 목적:
 * - 신규 파일이 실제로 어디서 import되는지 확인
 * - 죽은 코드(import 0개) 감지
 * - 잘못된 경로로 import한 곳 검출
 *
 * 검증:
 * 1. src/ 안의 모든 .ts/.tsx 파일을 그래프로 만들기
 * 2. 각 파일의 in-degree(누가 import) 카운트
 * 3. in-degree = 0인 파일 중 진입점이 아닌 것들 → 죽은 코드 의심
 *
 * 진입점 (in-degree 0이어도 OK):
 * - src/app/**\/page.tsx
 * - src/app/**\/route.ts
 * - src/app/**\/layout.tsx
 * - src/app/**\/loading.tsx
 * - src/app/**\/error.tsx
 * - src/app/**\/not-found.tsx
 * - src/middleware.ts
 * - 모든 _config.ts, .d.ts
 */

import * as fs from "fs";
import * as path from "path";

const SRC_DIR = path.join(__dirname, "..", "src");

interface FileInfo {
    path: string; // src 기준 상대경로
    relativeImports: string[]; // 다른 src 파일을 import한 경로
    inDegree: number; // 누가 나를 import 했는지 카운트
}

const files = new Map<string, FileInfo>();

// 모든 .ts/.tsx 파일 수집
function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
            walk(fullPath);
        } else if (
            (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
            !entry.name.endsWith(".d.ts") &&
            !entry.name.endsWith(".test.ts") &&
            !entry.name.endsWith(".test.tsx")
        ) {
            const relPath = path.relative(SRC_DIR, fullPath).replace(/\\/g, "/");
            files.set(relPath, { path: relPath, relativeImports: [], inDegree: 0 });
        }
    }
}

walk(SRC_DIR);

// 진입점 패턴 (Next.js App Router special files + 동적 import 의심)
function isEntryPoint(relPath: string): boolean {
    // Next.js 특수 파일 (app/* 어디든)
    const specialFiles = [
        "page.tsx", "page.ts",
        "route.ts", "route.tsx",
        "layout.tsx", "layout.ts",
        "loading.tsx", "loading.ts",
        "error.tsx", "error.ts",
        "global-error.tsx", "global-error.ts",
        "not-found.tsx", "not-found.ts",
        "default.tsx", "default.ts",
        "template.tsx", "template.ts",
        "sitemap.ts", "sitemap.tsx",
        "robots.ts", "robots.tsx",
        "manifest.ts", "manifest.tsx",
        "icon.tsx", "icon.ts",
        "opengraph-image.tsx", "twitter-image.tsx",
    ];
    const basename = relPath.split("/").pop() || "";
    if (specialFiles.includes(basename) && relPath.startsWith("app/")) return true;
    // app 직속 특수 파일
    if (specialFiles.includes(basename) && !relPath.includes("/")) return true;

    // 미들웨어
    if (relPath === "middleware.ts" || relPath === "middleware.tsx") return true;

    // 페이지 컴포넌트는 React.lazy로 동적 import 됨 (예: AdminPage, AIChatPage)
    if (/^components\/pages\//.test(relPath)) return true;

    // tab 컴포넌트도 React.lazy 가능
    if (/^components\/admin\/tabs\//.test(relPath)) return true;

    // index.ts barrel export — 자체적으로 import 되는 일 거의 없음
    if (/\/index\.tsx?$/.test(relPath)) return true;

    return false;
}

// import 구문 추출 + @/ 별칭 → src/ 변환
function extractImports(filepath: string): string[] {
    const content = fs.readFileSync(filepath, "utf-8");
    const imports: string[] = [];
    // import ... from "@/path" 또는 "./..."
    const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
        const spec = match[1];
        // @/ 별칭 → src/ 기준
        if (spec.startsWith("@/")) {
            imports.push(spec.replace("@/", ""));
        } else if (spec.startsWith("./") || spec.startsWith("../")) {
            // 상대경로
            const resolved = path
                .relative(
                    SRC_DIR,
                    path.resolve(path.dirname(filepath), spec)
                )
                .replace(/\\/g, "/");
            imports.push(resolved);
        }
        // 외부 패키지(react, next 등)는 무시
    }
    return imports;
}

// 모든 파일의 import 분석
for (const [relPath, info] of files) {
    const fullPath = path.join(SRC_DIR, relPath);
    info.relativeImports = extractImports(fullPath);
}

// in-degree 계산
for (const [, info] of files) {
    for (const imp of info.relativeImports) {
        // imp는 확장자 없을 수 있음 → .ts/.tsx 둘 다 시도
        const candidates = [
            imp + ".ts",
            imp + ".tsx",
            imp + "/index.ts",
            imp + "/index.tsx",
            imp, // 그대로
        ];
        for (const c of candidates) {
            if (files.has(c)) {
                files.get(c)!.inDegree++;
                break;
            }
        }
    }
}

// 죽은 코드 감지
const deadCode: string[] = [];
const orphans: string[] = []; // entry도 아닌데 import도 없는 파일

for (const [relPath, info] of files) {
    if (isEntryPoint(relPath)) continue;
    if (info.inDegree === 0) {
        // 죽은 코드 후보
        // 단, types/index.ts 같은 barrel export는 직접 검증
        if (relPath.endsWith("types.ts") || relPath.endsWith("types/index.ts")) continue;
        if (relPath.endsWith("constants.ts")) continue;
        if (relPath.includes("/data/")) continue; // 데이터 파일
        deadCode.push(relPath);
    }
}

// 출력
console.log("🔍 Import 그래프 검증\n");
console.log(`총 ${files.size}개 파일 스캔\n`);

if (deadCode.length === 0) {
    console.log("✅ 죽은 코드 없음");
    process.exit(0);
}

console.log(`⚠️  죽은 코드 의심 (${deadCode.length}개)`);
console.log("─".repeat(60));
for (const f of deadCode.slice(0, 30)) {
    console.log(`  • ${f}`);
}
if (deadCode.length > 30) {
    console.log(`  ... 외 ${deadCode.length - 30}개`);
}

console.log(
    "\n💡 파일이 죽은 코드인지 확인:\n  - barrel export(index.ts)에서만 쓰이면 그래프상 0\n  - 동적 import (lazy)는 위 정규식으로 못 잡음\n  - 정말 안 쓰이면 삭제 권장"
);

// 죽은 코드 있으면 1, 치명적이지 않음
process.exit(deadCode.length > 0 ? 1 : 0);
