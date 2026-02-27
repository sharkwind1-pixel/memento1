/**
 * 오픈소스 라이선스 고지 페이지
 * 서비스에서 사용하는 오픈소스 소프트웨어의 라이선스 정보를 고지합니다.
 */

import { Metadata } from "next";

export const metadata: Metadata = {
    title: "오픈소스 라이선스 | 메멘토애니",
    description: "메멘토애니 서비스에서 사용하는 오픈소스 소프트웨어 라이선스 고지",
};

interface LicenseEntry {
    name: string;
    version: string;
    license: string;
    url: string;
    description: string;
}

const dependencies: LicenseEntry[] = [
    {
        name: "Next.js",
        version: "14.2.5",
        license: "MIT",
        url: "https://github.com/vercel/next.js",
        description: "React 기반 풀스택 웹 프레임워크",
    },
    {
        name: "React",
        version: "18.x",
        license: "MIT",
        url: "https://github.com/facebook/react",
        description: "사용자 인터페이스 구축을 위한 JavaScript 라이브러리",
    },
    {
        name: "React DOM",
        version: "18.x",
        license: "MIT",
        url: "https://github.com/facebook/react",
        description: "React의 DOM 렌더링 패키지",
    },
    {
        name: "TypeScript",
        version: "5.x",
        license: "Apache-2.0",
        url: "https://github.com/microsoft/TypeScript",
        description: "JavaScript에 정적 타입을 추가하는 프로그래밍 언어",
    },
    {
        name: "Tailwind CSS",
        version: "3.4.x",
        license: "MIT",
        url: "https://github.com/tailwindlabs/tailwindcss",
        description: "유틸리티 기반 CSS 프레임워크",
    },
    {
        name: "tailwindcss-animate",
        version: "1.0.x",
        license: "MIT",
        url: "https://github.com/jamiebuilds/tailwindcss-animate",
        description: "Tailwind CSS 애니메이션 플러그인",
    },
    {
        name: "@tailwindcss/typography",
        version: "0.5.x",
        license: "MIT",
        url: "https://github.com/tailwindlabs/tailwindcss-typography",
        description: "Tailwind CSS 타이포그래피 플러그인",
    },
    {
        name: "Radix UI",
        version: "다수",
        license: "MIT",
        url: "https://github.com/radix-ui/primitives",
        description: "접근성을 고려한 UI 프리미티브 컴포넌트 (@radix-ui/react-avatar, @radix-ui/react-label, @radix-ui/react-scroll-area, @radix-ui/react-select, @radix-ui/react-separator, @radix-ui/react-slot, @radix-ui/react-tabs)",
    },
    {
        name: "Supabase JS",
        version: "2.90.x",
        license: "MIT",
        url: "https://github.com/supabase/supabase-js",
        description: "Supabase 클라이언트 라이브러리",
    },
    {
        name: "@supabase/auth-helpers-nextjs",
        version: "0.15.x",
        license: "MIT",
        url: "https://github.com/supabase/auth-helpers",
        description: "Supabase 인증 헬퍼 (Next.js)",
    },
    {
        name: "Tiptap",
        version: "3.20.x",
        license: "MIT",
        url: "https://github.com/ueberdosis/tiptap",
        description: "헤드리스 리치 텍스트 에디터 (@tiptap/react, @tiptap/starter-kit, @tiptap/pm, @tiptap/extension-image, @tiptap/extension-text-align, @tiptap/extension-underline)",
    },
    {
        name: "OpenAI Node.js",
        version: "6.17.x",
        license: "Apache-2.0",
        url: "https://github.com/openai/openai-node",
        description: "OpenAI API 클라이언트 라이브러리",
    },
    {
        name: "Lucide React",
        version: "0.562.x",
        license: "ISC",
        url: "https://github.com/lucide-icons/lucide",
        description: "아이콘 라이브러리",
    },
    {
        name: "Recharts",
        version: "3.7.x",
        license: "MIT",
        url: "https://github.com/recharts/recharts",
        description: "React 기반 차트 라이브러리",
    },
    {
        name: "Sonner",
        version: "2.0.x",
        license: "MIT",
        url: "https://github.com/emilkowalski/sonner",
        description: "토스트 알림 컴포넌트",
    },
    {
        name: "class-variance-authority",
        version: "0.7.x",
        license: "Apache-2.0",
        url: "https://github.com/joe-bell/cva",
        description: "CSS 클래스 변형 관리 유틸리티",
    },
    {
        name: "clsx",
        version: "2.1.x",
        license: "MIT",
        url: "https://github.com/lukeed/clsx",
        description: "조건부 className 문자열 유틸리티",
    },
    {
        name: "tailwind-merge",
        version: "3.4.x",
        license: "MIT",
        url: "https://github.com/dcastil/tailwind-merge",
        description: "Tailwind CSS 클래스 병합 유틸리티",
    },
    {
        name: "DOMPurify",
        version: "3.3.x",
        license: "Apache-2.0 OR MPL-2.0",
        url: "https://github.com/cure53/DOMPurify",
        description: "XSS 방지를 위한 HTML 새니타이저",
    },
    {
        name: "html2canvas",
        version: "1.4.x",
        license: "MIT",
        url: "https://github.com/niklasvh/html2canvas",
        description: "HTML을 캔버스 이미지로 변환",
    },
    {
        name: "@use-gesture/react",
        version: "10.3.x",
        license: "MIT",
        url: "https://github.com/pmndrs/use-gesture",
        description: "React 제스처 이벤트 처리 라이브러리",
    },
    {
        name: "web-push",
        version: "3.6.x",
        license: "MIT",
        url: "https://github.com/web-push-libs/web-push",
        description: "웹 푸시 알림 라이브러리",
    },
    {
        name: "PostCSS",
        version: "8.x",
        license: "MIT",
        url: "https://github.com/postcss/postcss",
        description: "CSS 변환 도구",
    },
    {
        name: "ESLint",
        version: "8.x",
        license: "MIT",
        url: "https://github.com/eslint/eslint",
        description: "JavaScript 코드 린터",
    },
    {
        name: "Sharp",
        version: "0.34.x",
        license: "Apache-2.0",
        url: "https://github.com/lovell/sharp",
        description: "고성능 이미지 처리 라이브러리",
    },
];

// 라이선스별 그룹화
const licenseGroups = dependencies.reduce<Record<string, LicenseEntry[]>>((acc, dep) => {
    const key = dep.license;
    if (!acc[key]) acc[key] = [];
    acc[key].push(dep);
    return acc;
}, {});

export default function OpenSourcePage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4 text-center">
                    오픈소스 라이선스 고지
                </h1>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
                    메멘토애니는 아래의 오픈소스 소프트웨어를 사용하고 있으며,
                    각 라이선스 조건에 따라 고지 의무를 이행합니다.
                </p>

                <div className="prose dark:prose-invert max-w-none space-y-8">

                    {/* 요약 테이블 */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">라이선스 요약</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left py-2 pr-4 text-gray-700 dark:text-gray-300">라이선스</th>
                                        <th className="text-left py-2 pr-4 text-gray-700 dark:text-gray-300">사용 수</th>
                                        <th className="text-left py-2 text-gray-700 dark:text-gray-300">주요 조건</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 dark:text-gray-400">
                                    <tr className="border-b border-gray-100 dark:border-gray-700/50">
                                        <td className="py-2 pr-4 font-medium">MIT</td>
                                        <td className="py-2 pr-4">{licenseGroups["MIT"]?.length || 0}개</td>
                                        <td className="py-2">저작권 고지 및 라이선스 전문 포함 시 자유롭게 사용 가능</td>
                                    </tr>
                                    <tr className="border-b border-gray-100 dark:border-gray-700/50">
                                        <td className="py-2 pr-4 font-medium">Apache-2.0</td>
                                        <td className="py-2 pr-4">{licenseGroups["Apache-2.0"]?.length || 0}개</td>
                                        <td className="py-2">저작권 고지, 라이선스 전문 포함, 변경사항 표시 필요</td>
                                    </tr>
                                    <tr className="border-b border-gray-100 dark:border-gray-700/50">
                                        <td className="py-2 pr-4 font-medium">ISC</td>
                                        <td className="py-2 pr-4">{licenseGroups["ISC"]?.length || 0}개</td>
                                        <td className="py-2">MIT와 유사, 저작권 고지 포함 시 자유롭게 사용 가능</td>
                                    </tr>
                                    <tr className="border-b border-gray-100 dark:border-gray-700/50">
                                        <td className="py-2 pr-4 font-medium">Apache-2.0 OR MPL-2.0</td>
                                        <td className="py-2 pr-4">{licenseGroups["Apache-2.0 OR MPL-2.0"]?.length || 0}개</td>
                                        <td className="py-2">듀얼 라이선스 - 택일 가능</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 폰트 라이선스 */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">폰트</h2>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <span className="font-semibold text-gray-800 dark:text-gray-200">여기어때 잘난체 (Jalnan2)</span>
                                <span className="text-xs bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full w-fit">
                                    SIL Open Font License 1.1 (임베딩 조건부 허용)
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Copyright (c) 여기어때컴퍼니 |{" "}
                                <a
                                    href="/fonts/Jalnan2-LICENSE.txt"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                                >
                                    라이선스 전문 보기
                                </a>
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                인쇄, 웹, 영상, 임베딩(앱/게임) 등 자유 사용 가능. 단독 재배포 및 유료 판매 불가.
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 space-y-2 mt-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <span className="font-semibold text-gray-800 dark:text-gray-200">Inter</span>
                                <span className="text-xs bg-gray-100 dark:bg-gray-600/40 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full w-fit">
                                    SIL Open Font License 1.1
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Copyright (c) Rasmus Andersson |{" "}
                                <a
                                    href="https://github.com/rsms/inter"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                                >
                                    GitHub
                                </a>
                            </p>
                        </div>
                    </section>

                    {/* 전체 목록 */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">오픈소스 소프트웨어 목록</h2>
                        <div className="space-y-3">
                            {dependencies.map((dep) => (
                                <div
                                    key={dep.name}
                                    className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                                        <a
                                            href={dep.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            {dep.name}
                                        </a>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            v{dep.version}
                                        </span>
                                        <span className="text-xs bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full w-fit">
                                            {dep.license}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {dep.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* MIT 라이선스 전문 */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">MIT License (전문)</h2>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
{`MIT License

Copyright (c) [year] [copyright holders]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
                            </pre>
                        </div>
                    </section>

                    {/* Apache 2.0 라이선스 전문 */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Apache License 2.0 (전문)</h2>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
{`Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

"License" shall mean the terms and conditions for use, reproduction,
and distribution as defined by Sections 1 through 9 of this document.

"Licensor" shall mean the copyright owner or entity authorized by
the copyright owner that is granting the License.

"Legal Entity" shall mean the union of the acting entity and all
other entities that control, are controlled by, or are under common
control with that entity.

"You" (or "Your") shall mean an individual or Legal Entity
exercising permissions granted by this License.

"Source" form shall mean the preferred form for making modifications.

"Object" form shall mean any form resulting from mechanical
transformation or translation of a Source form.

"Work" shall mean the work of authorship made available under the License.

"Derivative Works" shall mean any work that is based on the Work.

"Contribution" shall mean any work of authorship submitted to the
Licensor for inclusion in the Work.

"Contributor" shall mean Licensor and any Legal Entity on behalf of
whom a Contribution has been received by the Licensor.

2. Grant of Copyright License. Subject to the terms and conditions of
this License, each Contributor hereby grants to You a perpetual,
worldwide, non-exclusive, no-charge, royalty-free, irrevocable
copyright license to reproduce, prepare Derivative Works of,
publicly display, publicly perform, sublicense, and distribute the
Work and such Derivative Works in Source or Object form.

3. Grant of Patent License. Subject to the terms and conditions of
this License, each Contributor hereby grants to You a perpetual,
worldwide, non-exclusive, no-charge, royalty-free, irrevocable
patent license to make, have made, use, offer to sell, sell,
import, and otherwise transfer the Work.

4. Redistribution. You may reproduce and distribute copies of the
Work or Derivative Works thereof in any medium, with or without
modifications, and in Source or Object form, provided that You
meet the following conditions:

(a) You must give any other recipients of the Work or
    Derivative Works a copy of this License; and

(b) You must cause any modified files to carry prominent notices
    stating that You changed the files; and

(c) You must retain, in the Source form of any Derivative Works
    that You distribute, all copyright, patent, trademark, and
    attribution notices from the Source form of the Work; and

(d) If the Work includes a "NOTICE" text file, You must include
    a readable copy of the attribution notices contained within
    such NOTICE file.

5. Submission of Contributions. Unless You explicitly state otherwise,
any Contribution intentionally submitted for inclusion in the Work
by You to the Licensor shall be under the terms and conditions of
this License, without any additional terms or conditions.

6. Trademarks. This License does not grant permission to use the trade
names, trademarks, service marks, or product names of the Licensor.

7. Disclaimer of Warranty. Unless required by applicable law or
agreed to in writing, Licensor provides the Work on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND.

8. Limitation of Liability. In no event shall any Contributor be
liable to You for damages, including any direct, indirect, special,
incidental, or consequential damages of any character arising as a
result of this License or out of the use or inability to use the Work.

9. Accepting Warranty or Additional Liability. You may act only on
Your own behalf and on Your sole responsibility.

END OF TERMS AND CONDITIONS`}
                            </pre>
                        </div>
                    </section>

                    {/* ISC 라이선스 전문 */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">ISC License (전문)</h2>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
{`ISC License

Copyright (c) [year] [copyright holders]

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.`}
                            </pre>
                        </div>
                    </section>

                    {/* 안내 */}
                    <section className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400 space-y-2">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">안내사항</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>이 페이지는 서비스에서 직접 사용하는 주요 오픈소스 소프트웨어를 고지합니다.</li>
                            <li>각 소프트웨어의 전체 라이선스 전문은 해당 프로젝트의 GitHub 저장소에서 확인할 수 있습니다.</li>
                            <li>의존성 업데이트에 따라 이 목록은 변경될 수 있습니다.</li>
                            <li>라이선스 관련 문의: <span className="text-gray-800 dark:text-gray-200">help@memento-ani.com</span></li>
                        </ul>
                    </section>

                    {/* 뒤로가기 */}
                    <div className="text-center pt-4">
                        <a
                            href="/"
                            className="inline-block px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors text-sm"
                        >
                            홈으로 돌아가기
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
