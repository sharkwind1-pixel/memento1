/**
 * 결제 및 구독 약관 페이지
 *
 * 전자상거래법, 콘텐츠산업진흥법 기준으로 작성.
 * PG사(KCP/KG이니시스) 심사 시 법적 고지 요건 충족.
 */

import { Metadata } from "next";

export const metadata: Metadata = {
    title: "결제 및 구독 약관 | 메멘토애니",
    description: "메멘토애니 유료 서비스 결제, 구독, 환불 및 데이터 보관에 관한 약관",
};

export default function PaymentTermsPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-white mb-8 text-center">
                    결제 및 구독 약관
                </h1>

                <div className="prose dark:prose-invert max-w-none space-y-8">
                    <p className="text-gray-500 dark:text-gray-400 italic">
                        시행일자: 2026년 3월 20일
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                        본 약관은 메멘토애니(이하 &quot;회사&quot;)가 제공하는 유료 서비스의 결제, 구독, 해지, 환불 및 데이터 보관에 관한 사항을 규정합니다.
                        본 약관에서 정하지 않은 사항은 &quot;메멘토애니 서비스 이용약관&quot; 및 관계 법령에 따릅니다.
                    </p>

                    {/* 제1조 유료 서비스의 종류 및 요금 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">제1조 (유료 서비스의 종류 및 요금)</h2>

                        <h3 className="text-lg font-semibold mt-4">1. 구독 서비스</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                            회사는 다음과 같은 월간 구독 서비스를 제공합니다.
                        </p>
                        <div className="overflow-x-auto mt-3">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-memento-200 dark:bg-memento-900/30">
                                        <th className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-left font-semibold">구분</th>
                                        <th className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-left font-semibold">무료</th>
                                        <th className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-left font-semibold">베이직</th>
                                        <th className="border border-gray-200 dark:border-gray-600 px-4 py-2 text-left font-semibold">프리미엄</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 dark:text-gray-300">
                                    <tr>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2 font-medium">월 요금</td>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">0원</td>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">9,900원</td>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">18,900원</td>
                                    </tr>
                                    <tr className="bg-gray-50 dark:bg-gray-700/30">
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2 font-medium">AI 펫톡</td>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">하루 10회</td>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">하루 50회</td>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">무제한</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2 font-medium">반려동물 등록</td>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">1마리</td>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">3마리</td>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">10마리</td>
                                    </tr>
                                    <tr className="bg-gray-50 dark:bg-gray-700/30">
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2 font-medium">사진 저장</td>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">펫당 50장</td>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">펫당 200장</td>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">펫당 1,000장</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2 font-medium">AI 영상 생성</td>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">평생 1회</td>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">월 3회</td>
                                        <td className="border border-gray-200 dark:border-gray-600 px-4 py-2">월 6회</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h3 className="text-lg font-semibold mt-4">2. 단품 결제 서비스</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                            구독 플랜의 기본 제공 횟수를 초과한 경우, 다음과 같이 건당 추가 구매가 가능합니다.
                        </p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 mt-2">
                            <li>AI 영상 생성: 건당 3,500원 (부가세 포함)</li>
                        </ul>

                        <h3 className="text-lg font-semibold mt-4">3. 요금 변경</h3>
                        <p className="text-gray-600 dark:text-gray-300">
                            회사는 유료 서비스의 요금을 변경할 수 있으며, 변경 시 최소 30일 전에 서비스 내 공지 및 이메일을 통해 안내합니다.
                            요금 변경은 변경 고지 이후 최초 갱신되는 결제분부터 적용되며, 이미 결제된 구독 기간에는 영향을 미치지 않습니다.
                        </p>
                    </section>

                    {/* 제2조 구독 기간 및 자동 갱신 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">제2조 (구독 기간 및 자동 갱신)</h2>

                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-3">
                            <li>
                                <strong>구독 기간:</strong> 구독 서비스의 이용 기간은 결제일로부터 30일입니다.
                            </li>
                            <li>
                                <strong>자동 갱신:</strong> 구독은 회원이 해지하지 않는 한, 구독 기간 만료일에 동일한 플랜 및 요금으로 자동 갱신됩니다.
                                자동 갱신 시 최초 결제에 사용된 결제 수단으로 요금이 청구됩니다.
                            </li>
                            <li>
                                <strong>갱신 안내:</strong> 회사는 자동 갱신일 최소 7일 전에 이메일 또는 서비스 내 알림을 통해 갱신 예정 사실, 갱신 금액 및 결제일을 안내합니다.
                            </li>
                            <li>
                                <strong>결제 실패:</strong> 자동 갱신 시 결제가 실패한 경우, 회사는 최대 3회까지 재시도할 수 있습니다.
                                최종 결제 실패 시 구독은 해지되며, 회원에게 별도 안내됩니다.
                            </li>
                            <li>
                                <strong>구독 기간 기산:</strong> 구독 기간의 시작일은 결제가 정상적으로 완료된 날이며, 만료일은 시작일로부터 30일이 되는 날의 23시 59분 59초입니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제3조 결제 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">제3조 (결제)</h2>

                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-3">
                            <li>
                                <strong>결제 수단:</strong> 유료 서비스의 결제는 신용카드, 체크카드 등 회사가 지정한 결제 수단을 통해 이루어집니다.
                            </li>
                            <li>
                                <strong>결제 대행:</strong> 결제는 전자결제대행사(PG사)를 통해 처리되며, 결제 과정에서 발생하는 개인정보는 해당 PG사의 개인정보처리방침에 따라 처리됩니다.
                            </li>
                            <li>
                                <strong>결제 금액:</strong> 모든 결제 금액은 부가가치세가 포함된 금액이며, 원화(KRW)로 표시됩니다.
                            </li>
                            <li>
                                <strong>영수증:</strong> 결제 완료 후 전자 영수증이 제공되며, 서비스 내 결제 내역에서 확인할 수 있습니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제4조 구독 해지 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">제4조 (구독 해지)</h2>

                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-3">
                            <li>
                                <strong>해지 방법:</strong> 회원은 언제든지 서비스 내 설정 메뉴를 통해 구독을 해지할 수 있습니다.
                            </li>
                            <li>
                                <strong>해지 후 이용:</strong> 구독 해지를 요청하더라도 이미 결제된 구독 기간이 만료될 때까지 유료 서비스를 계속 이용할 수 있습니다.
                            </li>
                            <li>
                                <strong>해지 후 데이터:</strong> 구독 해지 후에도 무료 플랜의 이용 한도 내에서 서비스를 이용할 수 있습니다.
                                다만, 유료 플랜의 한도를 초과하여 저장된 데이터(사진, 반려동물 정보 등)는 삭제되지 않으나 추가 저장이 제한됩니다.
                            </li>
                            <li>
                                <strong>자동 갱신 중지:</strong> 구독 해지 시 다음 결제일의 자동 갱신이 중지됩니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제5조 청약철회 및 환불 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">제5조 (청약철회 및 환불)</h2>

                        <h3 className="text-lg font-semibold mt-4">1. 구독 서비스 환불</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-3">
                            <li>
                                회원은 구독 결제일로부터 7일 이내에 서비스를 이용하지 않은 경우, 전액 환불을 요청할 수 있습니다.
                                (전자상거래 등에서의 소비자보호에 관한 법률 제17조)
                            </li>
                            <li>
                                서비스 이용을 개시한 이후에는 남은 구독 기간에 대해 일할 계산하여 환불합니다.
                                <br />
                                <strong className="block mt-2">환불 금액 산정 방식:</strong>
                                <span className="block mt-1 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg font-mono text-sm">
                                    환불 금액 = 결제 금액 x (남은 일수 / 30)
                                </span>
                                <span className="block mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    * 남은 일수: 환불 요청일 다음 날부터 구독 만료일까지의 일수
                                </span>
                                <span className="block mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    * 계산된 환불 금액에서 원 단위 미만은 절사합니다.
                                </span>
                            </li>
                            <li>
                                환불 예시:
                                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                                    <li>프리미엄(18,900원) 결제 후 10일 사용, 20일 남음: 18,900 x (20/30) = 12,600원 환불</li>
                                    <li>베이직(9,900원) 결제 후 15일 사용, 15일 남음: 9,900 x (15/30) = 4,950원 환불</li>
                                    <li>결제 후 25일 사용, 5일 남음: 결제 금액 x (5/30) 환불</li>
                                </ul>
                            </li>
                        </ol>

                        <h3 className="text-lg font-semibold mt-4">2. 단품 결제 환불</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-3">
                            <li>
                                AI 영상 생성 단품 결제(건당 3,500원)는 결제 후 영상 생성이 시작되기 전까지 전액 환불이 가능합니다.
                            </li>
                            <li>
                                영상 생성이 개시된 이후에는 디지털콘텐츠의 특성상 청약철회가 제한됩니다.
                                (전자상거래 등에서의 소비자보호에 관한 법률 제17조 제2항 제5호)
                            </li>
                            <li>
                                단, 영상 생성에 기술적 오류가 발생하여 정상적인 결과물이 제공되지 않은 경우에는 전액 환불됩니다.
                            </li>
                        </ol>

                        <h3 className="text-lg font-semibold mt-4">3. 환불 절차</h3>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-3">
                            <li>환불 요청은 서비스 내 고객지원 메뉴 또는 이메일(sharkwind1@gmail.com)을 통해 접수할 수 있습니다.</li>
                            <li>환불은 요청 접수일로부터 3영업일 이내에 원래 결제 수단으로 처리됩니다.</li>
                            <li>카드사 사정에 따라 실제 환불 반영까지 추가 시일이 소요될 수 있습니다.</li>
                        </ol>
                    </section>

                    {/* 제6조 AI 영상 콘텐츠 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">제6조 (AI 영상 콘텐츠)</h2>

                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-3">
                            <li>
                                <strong>보관 기간:</strong> AI 영상 생성 후 해당 영상은 서비스 내에서 영구적으로 보관되며, 회원은 언제든지 열람 및 다운로드할 수 있습니다.
                            </li>
                            <li>
                                <strong>구독 해지 시:</strong> 구독을 해지하더라도 이미 생성된 AI 영상은 삭제되지 않으며, 무료 회원 상태에서도 열람 및 다운로드가 가능합니다.
                            </li>
                            <li>
                                <strong>회원 탈퇴 시:</strong> 회원이 서비스를 탈퇴하는 경우, 생성된 AI 영상을 포함한 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
                                탈퇴 전 필요한 영상은 반드시 다운로드하여 별도 보관하시기 바랍니다.
                            </li>
                            <li>
                                <strong>저작권:</strong> AI 영상은 회원이 제공한 사진을 기반으로 생성되며, 생성된 영상의 이용 권한은 회원에게 있습니다.
                                다만, 회사는 서비스 개선 및 홍보 목적으로 익명화된 형태로 활용할 수 있습니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제7조 데이터 보관 및 삭제 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">제7조 (데이터 보관 및 삭제)</h2>

                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-3">
                            <li>
                                <strong>서비스 이용 중:</strong> 회원이 업로드한 사진, 영상, 타임라인 기록, AI 대화 내역 등 모든 데이터는 서비스 이용 기간 동안 안전하게 보관됩니다.
                            </li>
                            <li>
                                <strong>구독 해지 시:</strong> 유료 구독 해지 후에도 기존 데이터는 삭제되지 않습니다.
                                다만, 무료 플랜의 저장 한도를 초과한 경우 새로운 데이터의 추가가 제한됩니다.
                            </li>
                            <li>
                                <strong>회원 탈퇴 시:</strong> 회원 탈퇴 시 다음 데이터가 영구적으로 삭제됩니다.
                                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                                    <li>반려동물 프로필 및 등록 정보</li>
                                    <li>사진, 영상 등 미디어 파일</li>
                                    <li>타임라인 기록 및 일기</li>
                                    <li>AI 펫톡 대화 내역 및 AI 장기 메모리</li>
                                    <li>AI 생성 영상</li>
                                    <li>커뮤니티 게시글 및 댓글</li>
                                    <li>케어 알림 설정</li>
                                </ul>
                            </li>
                            <li>
                                <strong>탈퇴 경고:</strong> 회원 탈퇴 절차 시 데이터 삭제에 대한 안내가 표시되며, 회원의 최종 확인 후 탈퇴가 처리됩니다.
                            </li>
                            <li>
                                <strong>법적 보존 의무:</strong> 관계 법령에 따라 보존이 필요한 정보(결제 기록 등)는 해당 법령이 정한 기간 동안 보존됩니다.
                                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                                    <li>전자상거래 거래 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                                    <li>대금 결제 및 재화 등의 공급에 관한 기록: 5년</li>
                                    <li>소비자 불만 또는 분쟁 처리에 관한 기록: 3년</li>
                                </ul>
                            </li>
                        </ol>
                    </section>

                    {/* 제8조 면책 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">제8조 (면책)</h2>

                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-3">
                            <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적 사유로 인해 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</li>
                            <li>회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
                            <li>AI 펫톡 및 AI 영상 생성 서비스는 인공지능 기술의 특성상 결과물의 정확성이나 품질을 보증하지 않으며, 이로 인한 손해에 대해 회사는 고의 또는 중과실이 없는 한 책임을 지지 않습니다.</li>
                        </ol>
                    </section>

                    {/* 제9조 분쟁 해결 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">제9조 (분쟁 해결)</h2>

                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-3">
                            <li>유료 서비스 이용과 관련하여 회사와 회원 간에 분쟁이 발생한 경우, 양 당사자는 원만한 해결을 위해 성실히 협의합니다.</li>
                            <li>협의가 이루어지지 않는 경우, 한국소비자원 또는 전자거래분쟁조정위원회에 조정을 신청할 수 있습니다.</li>
                            <li>소송이 필요한 경우, 회사의 본사 소재지를 관할하는 법원을 합의관할법원으로 합니다.</li>
                        </ol>
                    </section>

                    {/* 부칙 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">부칙</h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>본 약관은 2026년 3월 20일부터 시행합니다.</li>
                            <li>본 약관 시행 이전에 결제한 유료 서비스에 대해서도 본 약관이 적용됩니다.</li>
                        </ol>
                    </section>

                    {/* 고객 문의 */}
                    <section className="border-t border-gray-200 dark:border-gray-600 pt-6">
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">고객 문의</h2>
                        <ul className="text-gray-600 dark:text-gray-300 space-y-2 mt-3">
                            <li><strong>서비스명:</strong> 메멘토애니</li>
                            <li><strong>이메일:</strong> sharkwind1@gmail.com</li>
                            <li><strong>운영시간:</strong> 평일 10:00 ~ 18:00 (공휴일 제외)</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
