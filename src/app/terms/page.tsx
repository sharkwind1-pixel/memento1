/**
 * 이용약관 페이지
 */

import { Metadata } from "next";

export const metadata: Metadata = {
    title: "이용약관 | 메멘토애니",
    description: "메멘토애니 서비스 이용약관",
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 text-center">
                    메멘토애니 서비스 이용약관
                </h1>

                <div className="prose dark:prose-invert max-w-none space-y-8">
                    <p className="text-gray-600 dark:text-gray-300">
                        시행일자: 2026년 ___월 ___일
                    </p>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제1장 총칙</h2>

                        <h3 className="text-lg font-semibold mt-4">제1조 (목적)</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                            이 약관은 메멘토애니(이하 &quot;회사&quot;)가 제공하는 반려동물 기록 및 추모 서비스(이하 &quot;서비스&quot;)의
                            이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                        </p>

                        <h3 className="text-lg font-semibold mt-4">제2조 (정의)</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>&quot;서비스&quot;란 회사가 제공하는 반려동물 기록, AI 펫톡, 추모 공간, 커뮤니티, 분실동물 찾기 등 관련 제반 서비스를 의미합니다.</li>
                            <li>&quot;회원&quot;이란 회사와 서비스 이용계약을 체결하고 회원 아이디(ID)를 부여받은 자를 말합니다.</li>
                            <li>&quot;AI 펫톡&quot;이란 인공지능 기술을 활용하여 반려동물의 목소리로 대화하는 서비스를 말합니다.</li>
                            <li>&quot;추모 모드&quot;란 무지개다리를 건넌 반려동물을 위한 특별한 서비스 모드를 말합니다.</li>
                            <li>&quot;프리미엄 서비스&quot;란 유료 결제를 통해 이용할 수 있는 추가 기능을 말합니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제2장 서비스 이용</h2>

                        <h3 className="text-lg font-semibold mt-4">제5조 (서비스의 제공)</h3>
                        <p className="text-gray-600 dark:text-gray-300">회사는 회원에게 다음과 같은 서비스를 제공합니다.</p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>반려동물 정보 등록 및 기록 관리</li>
                            <li>사진/동영상 타임라인 저장</li>
                            <li>AI 펫톡 (인공지능 대화 서비스)</li>
                            <li>추모 공간 및 추억 기록</li>
                            <li>커뮤니티 서비스</li>
                            <li>분실동물 찾기 서비스</li>
                        </ul>

                        <h3 className="text-lg font-semibold mt-4">제6조 (AI 펫톡 서비스 특별 조항)</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>AI 펫톡 서비스는 인공지능 기술을 활용하며, AI가 생성한 대화임을 회원에게 명확히 고지합니다.</li>
                            <li>AI의 응답은 참고용이며, 수의학적, 법률적, 심리적 전문 조언을 대체하지 않습니다.</li>
                            <li>회사는 AI 응답의 정확성, 완전성을 보장하지 않으며, AI 응답으로 인한 손해에 대해 책임지지 않습니다.</li>
                        </ol>

                        <h3 className="text-lg font-semibold mt-4">제8조 (청약철회 및 환불)</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>회원은 결제일로부터 7일 이내에 청약철회를 요청할 수 있습니다.</li>
                            <li>단, 서비스를 이용한 경우(AI 펫톡 대화 등) 이용분을 제외한 금액을 환불합니다.</li>
                            <li>환불은 결제 수단에 따라 3~7 영업일 내에 처리됩니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제3장 회원의 의무</h2>

                        <h3 className="text-lg font-semibold mt-4">제9조 (회원의 의무)</h3>
                        <p className="text-gray-600 dark:text-gray-300">회원은 다음 행위를 하여서는 안 됩니다.</p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>타인의 정보를 도용하거나 허위 정보를 등록하는 행위</li>
                            <li>타인의 반려동물 사진/정보를 무단으로 사용하는 행위</li>
                            <li>서비스를 이용하여 영리 목적의 광고를 게시하는 행위</li>
                            <li>다른 회원을 비방하거나 모욕하는 행위</li>
                            <li>타인의 추모 공간에 부적절한 내용을 게시하는 행위</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제4장 기타</h2>

                        <h3 className="text-lg font-semibold mt-4">제12조 (면책조항)</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>회사는 천재지변, 전쟁, 서비스 설비의 장애 등 불가항력으로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
                            <li>AI 펫톡 서비스의 응답 내용으로 인한 정서적, 심리적 영향에 대해 회사는 책임지지 않습니다.</li>
                        </ol>
                    </section>

                    <div className="text-center pt-8 border-t dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">
                            본 약관은 2026년 ___월 ___일부터 시행합니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
