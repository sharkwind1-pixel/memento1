/**
 * 위치기반 서비스 이용약관 페이지
 * 위치정보의 보호 및 이용 등에 관한 법률 준수
 */

import { Metadata } from "next";

export const metadata: Metadata = {
    title: "위치기반 서비스 이용약관 | 메멘토애니",
    description: "메멘토애니 위치기반 서비스 이용약관",
};

export default function LocationTermsPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-white mb-8 text-center">
                    위치기반 서비스 이용약관
                </h1>

                <div className="prose dark:prose-invert max-w-none space-y-8">
                    <p className="text-gray-500 dark:text-gray-400 italic">
                        시행일자: 서비스 정식 오픈 시 확정
                    </p>

                    {/* 제1조 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제1조 (목적)
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            이 약관은 메멘토애니(이하 &quot;회사&quot;)가 제공하는 위치기반 서비스(이하 &quot;위치 서비스&quot;)의
                            이용조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.
                        </p>
                    </section>

                    {/* 제2조 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제2조 (정의)
                        </h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>
                                &quot;위치정보&quot;란 이동성이 있는 물건 또는 개인이 특정한 시간에 존재하거나
                                존재하였던 장소에 관한 정보로서, 전기통신설비 및 기술을 이용하여
                                수집된 것을 말합니다.
                            </li>
                            <li>
                                &quot;개인위치정보&quot;란 특정 개인의 위치정보(위치정보만으로는 특정 개인의
                                위치를 알 수 없는 경우에도 다른 정보와 용이하게 결합하여 특정
                                개인의 위치를 알 수 있는 것을 포함)를 말합니다.
                            </li>
                            <li>
                                &quot;위치정보 이용&quot;이란 개인위치정보를 위치 서비스에 이용하는 것을 말합니다.
                            </li>
                            <li>
                                &quot;이용자&quot;란 회사와 위치 서비스 이용계약을 체결한 자를 말합니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제3조 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제3조 (서비스 내용 및 목적)
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                            회사는 위치정보를 이용하여 다음과 같은 서비스를 제공합니다.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700">
                                        <th className="border dark:border-gray-600 px-4 py-2 text-left text-gray-700 dark:text-gray-200">
                                            서비스명
                                        </th>
                                        <th className="border dark:border-gray-600 px-4 py-2 text-left text-gray-700 dark:text-gray-200">
                                            서비스 내용
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 dark:text-gray-300">
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">주변 동물병원 검색</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">
                                            이용자의 현재 위치를 기반으로 주변 동물병원, 약국 등 반려동물 관련 시설 정보를 제공합니다.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">지역 정보 맞춤 서비스</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">
                                            이용자의 위치에 기반한 지역 반려동물 관련 정보, 이벤트 등을 제공합니다.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">분실동물 위치 서비스</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">
                                            분실 또는 유기동물 발견 시 위치 정보를 활용한 신고 및 매칭 서비스를 제공합니다.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">맞춤형 광고</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">
                                            이용자의 위치를 기반으로 관련 광고 및 프로모션 정보를 제공합니다. (향후 적용 예정)
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 제4조 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제4조 (서비스 이용요금)
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            회사가 제공하는 위치 서비스는 무료입니다. 다만, 무선 서비스 이용 시
                            발생하는 데이터 통신료는 별도이며, 이용자가 가입한 각 이동통신사의
                            정책에 따릅니다.
                        </p>
                    </section>

                    {/* 제5조 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제5조 (위치정보 수집 방법)
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            회사는 다음과 같은 방법으로 위치정보를 수집합니다.
                        </p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 mt-2">
                            <li>GPS (Global Positioning System)</li>
                            <li>Wi-Fi 기반 위치 추정</li>
                            <li>이동통신 기지국 기반 위치 추정</li>
                            <li>IP 주소 기반 위치 추정</li>
                        </ul>
                    </section>

                    {/* 제6조 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제6조 (개인위치정보의 이용 또는 제공)
                        </h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>
                                회사는 이용자의 동의 없이 개인위치정보를 제3자에게 제공하지 않습니다.
                            </li>
                            <li>
                                회사는 이용자의 개인위치정보를 이용하여 서비스를 제공하고자 하는
                                경우에는 미리 이용약관에 명시한 후 이용자의 동의를 받습니다.
                            </li>
                            <li>
                                회사는 이용자의 개인위치정보를 이용자가 지정하는 제3자에게
                                제공하는 경우에는 개인위치정보를 수집한 당해 통신단말장치로
                                매회 이용자에게 제공받는 자, 제공일시 및 제공목적을 즉시 통보합니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제7조 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제7조 (개인위치정보의 보유 및 이용기간)
                        </h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>
                                회사는 위치 서비스를 위해 필요한 기간 동안 개인위치정보를
                                보유합니다.
                            </li>
                            <li>
                                회사는 위치정보의 보호 및 이용 등에 관한 법률 제16조 제2항에
                                따라 위치정보 이용/제공사실 확인자료를 자동 기록/보존하며,
                                해당 자료는 6개월간 보관합니다.
                            </li>
                            <li>
                                이용자가 동의를 철회한 경우, 회사는 지체 없이 해당
                                개인위치정보 및 위치정보 이용/제공사실 확인자료를 파기합니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제8조 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제8조 (이용자의 권리)
                        </h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>
                                이용자는 언제든지 개인위치정보의 수집, 이용, 제공에 대한 동의의
                                전부 또는 일부를 철회할 수 있습니다.
                            </li>
                            <li>
                                이용자는 언제든지 개인위치정보의 수집, 이용, 제공의 일시적인
                                중지를 요구할 수 있습니다. 이 경우 회사는 요구를 거절하지
                                않으며, 이를 위한 기술적 수단을 갖추고 있습니다.
                            </li>
                            <li>
                                이용자는 회사에 대하여 다음 각 호의 자료에 대한 열람 또는
                                고지를 요구할 수 있고, 해당 자료에 오류가 있는 경우 정정을
                                요구할 수 있습니다.
                                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                                    <li>이용자에 대한 위치정보 수집, 이용, 제공사실 확인자료</li>
                                    <li>이용자의 개인위치정보가 위치정보의 보호 및 이용 등에 관한 법률 또는 다른 법률 규정에 의하여 제3자에게 제공된 이유 및 내용</li>
                                </ul>
                            </li>
                            <li>
                                이용자는 제1호 내지 제3호의 권리행사를 위해 회사의 계정 설정
                                또는 고객센터를 통해 요청할 수 있습니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제9조 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제9조 (법정대리인의 권리)
                        </h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>
                                회사는 만 14세 미만 아동의 개인위치정보를 수집, 이용 또는
                                제공하고자 하는 경우에는 법정대리인의 동의를 받습니다.
                            </li>
                            <li>
                                법정대리인은 만 14세 미만 아동의 개인위치정보에 대한 동의를
                                철회하거나, 개인위치정보의 수집, 이용, 제공의 일시적인 중지를
                                요구할 수 있으며, 이 경우 회사는 지체 없이 조치합니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제10조 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제10조 (위치정보 관리책임자)
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-2">
                            회사는 위치정보를 적절히 관리, 보호하고 이용자의 불만을 원활히
                            처리할 수 있도록 위치정보 관리책임자를 지정합니다.
                        </p>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            <p><strong className="text-gray-700 dark:text-gray-200">위치정보 관리책임자</strong></p>
                            <p>성명: 안승빈</p>
                            <p>직위: 대표</p>
                            <p>이메일: sharkwind1@gmail.com</p>
                        </div>
                    </section>

                    {/* 제11조 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제11조 (손해배상)
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            회사가 위치정보의 보호 및 이용 등에 관한 법률 제15조 내지 제26조의
                            규정을 위반한 행위로 이용자에게 손해가 발생한 경우, 이용자는
                            회사에 대하여 손해배상을 청구할 수 있습니다. 이 경우 회사는
                            고의 또는 과실이 없음을 입증하지 아니하면 책임을 면할 수 없습니다.
                        </p>
                    </section>

                    {/* 제12조 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제12조 (분쟁의 조정)
                        </h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>
                                회사와 이용자 간에 위치정보와 관련된 분쟁이 발생한 경우,
                                회사 또는 이용자는 방송통신위원회에 재정을 신청할 수 있습니다.
                            </li>
                            <li>
                                회사와 이용자 간에 위치정보와 관련된 분쟁에 대해 당사자 간
                                협의가 이루어지지 아니하거나 협의를 할 수 없는 경우에는
                                개인정보분쟁조정위원회에 조정을 신청할 수 있습니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제13조 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제13조 (사업자 정보)
                        </h2>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            <p><strong className="text-gray-700 dark:text-gray-200">상호</strong>: 메멘토애니</p>
                            <p><strong className="text-gray-700 dark:text-gray-200">사업자등록번호</strong>: 687-08-03135</p>
                            <p><strong className="text-gray-700 dark:text-gray-200">대표자</strong>: 안승빈</p>
                            <p><strong className="text-gray-700 dark:text-gray-200">주소</strong>: 서울특별시 강북구 덕릉로41길 78-5, 1층 102호(번동)</p>
                            <p><strong className="text-gray-700 dark:text-gray-200">업태</strong>: 정보통신업</p>
                            <p><strong className="text-gray-700 dark:text-gray-200">종목</strong>: 포털 및 기타 인터넷 정보 매개 서비스업</p>
                            <p><strong className="text-gray-700 dark:text-gray-200">이메일</strong>: sharkwind1@gmail.com</p>
                        </div>
                    </section>

                    {/* 부칙 */}
                    <section className="border-t dark:border-gray-600 pt-6">
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            부칙
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            이 약관은 서비스 정식 오픈일부터 시행합니다.
                        </p>
                    </section>
                </div>

                {/* 하단 네비게이션 */}
                <div className="mt-8 pt-6 border-t dark:border-gray-700 flex justify-center gap-4 text-sm">
                    <a
                        href="/terms"
                        className="text-gray-500 dark:text-gray-400 hover:text-memento-600 dark:hover:text-memento-400 transition-colors"
                    >
                        이용약관
                    </a>
                    <a
                        href="/privacy"
                        className="text-gray-500 dark:text-gray-400 hover:text-memento-600 dark:hover:text-memento-400 transition-colors"
                    >
                        개인정보처리방침
                    </a>
                    <a
                        href="/community-guidelines"
                        className="text-gray-500 dark:text-gray-400 hover:text-memento-600 dark:hover:text-memento-400 transition-colors"
                    >
                        커뮤니티 가이드라인
                    </a>
                </div>
            </div>
        </div>
    );
}
