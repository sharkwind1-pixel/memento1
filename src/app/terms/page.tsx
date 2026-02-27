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
                <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-white mb-8 text-center">
                    메멘토애니 서비스 이용약관
                </h1>

                <div className="prose dark:prose-invert max-w-none space-y-8">
                    <p className="text-gray-500 dark:text-gray-400 italic">
                        시행일자: 서비스 정식 오픈 시 확정
                    </p>

                    {/* 제1장 총칙 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">제1장 총칙</h2>

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
                            <li>&quot;게시물&quot;이란 회원이 서비스를 이용하면서 게시한 글, 사진, 영상, 댓글 등 일체의 정보를 말합니다.</li>
                        </ol>

                        <h3 className="text-lg font-semibold mt-4">제3조 (약관의 효력 및 변경)</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</li>
                            <li>회사는 관련 법령을 위배하지 않는 범위 내에서 약관을 개정할 수 있습니다.</li>
                            <li>회사가 약관을 개정할 경우 적용일자 및 개정사유를 명시하여 현행 약관과 함께 서비스 내 공지사항에 적용일자 7일 전부터 공지합니다. 다만, 회원에게 불리하게 변경하는 경우에는 30일 전부터 공지합니다.</li>
                            <li>회원이 개정 약관의 적용에 동의하지 않는 경우 이용계약을 해지(탈퇴)할 수 있으며, 공지된 적용일까지 거부 의사를 표시하지 않은 경우 동의한 것으로 봅니다.</li>
                        </ol>

                        <h3 className="text-lg font-semibold mt-4">제4조 (이용계약의 체결 및 해지)</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>이용계약은 회원이 되고자 하는 자가 약관에 동의하고 회원가입 절차를 완료함으로써 체결됩니다.</li>
                            <li>회원은 언제든지 서비스 내 &quot;회원 탈퇴&quot; 기능을 통해 이용계약을 해지할 수 있습니다.</li>
                            <li>회원이 탈퇴를 요청한 경우, 회사는 관련 법령에 따라 보존이 필요한 정보를 제외하고 즉시 또는 합리적 기간 내에 개인정보를 파기합니다.</li>
                            <li>회사는 회원이 제9조의 의무를 위반한 경우, 사전 통지 후 이용계약을 해지하거나 서비스 이용을 제한할 수 있습니다.</li>
                        </ol>
                    </section>

                    {/* 제2장 서비스 이용 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">제2장 서비스 이용</h2>

                        <h3 className="text-lg font-semibold mt-4">제5조 (서비스의 제공)</h3>
                        <p className="text-gray-600 dark:text-gray-300">회사는 회원에게 다음과 같은 서비스를 제공합니다.</p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>반려동물 정보 등록 및 기록 관리</li>
                            <li>사진/동영상 타임라인 저장</li>
                            <li>AI 펫톡 (인공지능 대화 서비스)</li>
                            <li>추모 공간 및 추억 기록</li>
                            <li>커뮤니티 서비스 (게시판, 댓글, 좋아요)</li>
                            <li>분실동물 찾기 서비스</li>
                            <li>지역 정보 공유 서비스</li>
                            <li>펫매거진 콘텐츠 제공</li>
                        </ul>

                        <h3 className="text-lg font-semibold mt-4">제6조 (AI 펫톡 서비스 특별 조항)</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>AI 펫톡 서비스는 인공지능 기술을 활용하며, AI가 생성한 대화임을 회원에게 명확히 고지합니다.</li>
                            <li>AI의 응답은 참고용이며, 수의학적, 법률적, 심리적 전문 조언을 대체하지 않습니다. 반려동물의 건강 문제는 반드시 수의사와 상담하시기 바랍니다.</li>
                            <li>회사는 AI 응답의 정확성, 완전성을 보장하지 않으며, AI 응답에 기반한 행동으로 인한 손해에 대해 책임지지 않습니다.</li>
                            <li>AI 펫톡 대화 내용은 서비스 제공을 위해 외부 AI 서비스(OpenAI)에 전송됩니다. 전송 시 회원의 개인정보는 최소한으로 포함되며, 상세 사항은 개인정보처리방침에서 안내합니다.</li>
                            <li>회사는 AI 서비스의 내용, 범위, 제공 방식 등을 변경하거나 중단할 수 있으며, 이 경우 사전에 공지합니다.</li>
                        </ol>

                        <h3 className="text-lg font-semibold mt-4">제7조 (프리미엄 서비스 및 결제)</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>프리미엄 서비스는 월간 구독 방식으로 제공되며, 구독 기간 동안 추가 기능(무제한 AI 펫톡, 추가 반려동물 등록, 추가 사진 저장 등)을 이용할 수 있습니다.</li>
                            <li>구독 요금, 결제 방법, 자동 갱신 등 구체적 사항은 서비스 내 별도 안내 페이지에서 확인할 수 있습니다.</li>
                            <li>회원은 구독 갱신일 전까지 구독을 해지할 수 있으며, 해지 시 현재 결제 기간 종료 시까지 서비스를 이용할 수 있습니다.</li>
                        </ol>

                        <h3 className="text-lg font-semibold mt-4">제8조 (청약철회 및 환불)</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>회원은 결제일로부터 7일 이내에 청약철회를 요청할 수 있습니다.</li>
                            <li>단, 서비스를 이용한 경우(AI 펫톡 대화 등) 이용분을 제외한 금액을 환불합니다.</li>
                            <li>환불은 결제 수단에 따라 3~7 영업일 내에 처리됩니다.</li>
                            <li>환불 요청은 서비스 내 문의 또는 이메일(sharkwind1@gmail.com)로 할 수 있습니다.</li>
                        </ol>
                    </section>

                    {/* 제3장 회원의 의무 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">제3장 회원의 의무 및 게시물 관리</h2>

                        <h3 className="text-lg font-semibold mt-4">제9조 (회원의 의무)</h3>
                        <p className="text-gray-600 dark:text-gray-300">회원은 다음 행위를 하여서는 안 됩니다.</p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>타인의 정보를 도용하거나 허위 정보를 등록하는 행위</li>
                            <li>타인의 반려동물 사진/정보를 무단으로 사용하는 행위</li>
                            <li>서비스를 이용하여 영리 목적의 광고를 게시하는 행위</li>
                            <li>다른 회원을 비방하거나 모욕하는 행위</li>
                            <li>타인의 추모 공간에 부적절한 내용을 게시하는 행위</li>
                            <li>서비스의 정상적인 운영을 방해하는 행위</li>
                            <li>법령 또는 이 약관이 금지하는 행위</li>
                        </ul>

                        <h3 className="text-lg font-semibold mt-4">제10조 (게시물의 저작권 및 관리)</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>회원이 서비스에 게시한 게시물(사진, 글, 댓글 등)의 저작권은 해당 게시물의 저작자에게 귀속됩니다.</li>
                            <li>회원은 서비스에 게시물을 게시함으로써, 회사가 해당 게시물을 서비스 운영, 홍보, 개선 목적으로 이용(복제, 전송, 전시, 배포, 2차적 저작물 작성 등)할 수 있는 비독점적 이용허락을 부여합니다. 이 이용허락은 회원 탈퇴 후에도 유효합니다.</li>
                            <li>회사는 관련 법령에 따라 회원의 게시물이 타인의 권리를 침해하거나 관련 법령에 위반되는 경우, 해당 게시물을 임시 차단하거나 삭제할 수 있습니다.</li>
                            <li>타인의 권리를 침해받았다고 주장하는 자는 회사에 권리 침해 신고를 할 수 있으며, 회사는 정보통신망법 제44조의2에 따라 임시조치를 취할 수 있습니다.</li>
                        </ol>

                        <h3 className="text-lg font-semibold mt-4">제11조 (분실동물 게시판 특별 조항)</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>분실동물 게시판은 분실/발견 동물의 정보를 공유하기 위한 목적으로 제공됩니다.</li>
                            <li>게시물의 정확성과 진실성에 대한 책임은 해당 게시물을 작성한 회원에게 있습니다.</li>
                            <li>회사는 게시물의 정확성을 보증하지 않으며, 게시물로 인한 분쟁에 대해 책임지지 않습니다.</li>
                            <li>허위 분실 신고, 동물 매매 목적의 게시물 등 부적절한 게시물은 사전 통지 없이 삭제될 수 있습니다.</li>
                        </ol>
                    </section>

                    {/* 제4장 기타 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">제4장 기타</h2>

                        <h3 className="text-lg font-semibold mt-4">제12조 (면책조항)</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>회사는 천재지변, 전쟁, 서비스 설비의 장애 등 불가항력으로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
                            <li>AI 펫톡 서비스의 응답 내용으로 인한 정서적, 심리적 영향에 대해 회사는 책임지지 않습니다.</li>
                            <li>회원이 게시한 게시물의 내용에 대한 책임은 해당 회원에게 있으며, 회사는 이에 대해 책임지지 않습니다.</li>
                            <li>회사는 회원 간 또는 회원과 제3자 간에 서비스를 매개로 발생한 분쟁에 대해 개입할 의무가 없습니다.</li>
                        </ol>

                        <h3 className="text-lg font-semibold mt-4">제13조 (서비스 중단 및 종료)</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>회사는 서비스의 전부 또는 일부를 변경하거나 중단할 수 있으며, 중단 시 30일 전에 공지합니다.</li>
                            <li>서비스가 종료되는 경우, 회사는 회원에게 데이터(사진, 기록 등)를 다운로드할 수 있는 기간(최소 30일)을 제공합니다.</li>
                            <li>추모 모드의 데이터는 감정적 가치가 높은 점을 고려하여, 서비스 종료 시 충분한 안내와 데이터 보존 방안을 제공하기 위해 노력합니다.</li>
                        </ol>

                        <h3 className="text-lg font-semibold mt-4">제14조 (분쟁 해결)</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>이 약관에 관한 분쟁은 대한민국 법령을 적용합니다.</li>
                            <li>서비스 이용으로 발생한 분쟁에 대해 소송이 제기될 경우, 민사소송법상의 관할법원에 제기합니다.</li>
                            <li>회사와 회원 간 발생한 분쟁은 한국인터넷진흥원(KISA) 등 관련 기관의 분쟁조정 절차를 통해 해결할 수 있습니다.</li>
                        </ol>

                        <h3 className="text-lg font-semibold mt-4">제15조 (미성년자 보호)</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>만 14세 미만의 아동은 법정대리인의 동의 없이 회원가입을 할 수 없습니다.</li>
                            <li>만 14세 미만 아동의 개인정보 처리에 관한 사항은 개인정보처리방침에서 별도로 안내합니다.</li>
                        </ol>
                    </section>

                    <div className="text-center pt-8 border-t dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">
                            본 약관은 서비스 정식 오픈 시 시행일자가 확정됩니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
