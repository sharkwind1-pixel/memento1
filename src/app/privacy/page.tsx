/**
 * 개인정보처리방침 페이지
 */

import { Metadata } from "next";

export const metadata: Metadata = {
    title: "개인정보처리방침 | 메멘토애니",
    description: "메멘토애니 개인정보처리방침",
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 text-center">
                    개인정보처리방침
                </h1>

                <div className="prose dark:prose-invert max-w-none space-y-8">
                    <p className="text-gray-600 dark:text-gray-300">
                        메멘토애니(이하 &quot;회사&quot;)는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고
                        이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 italic">
                        시행일자: 2026년 ___월 ___일
                    </p>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제1조 (개인정보의 처리 목적)</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            회사는 다음의 목적을 위하여 개인정보를 처리합니다.
                        </p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>회원 가입 및 관리: 회원 가입의사 확인, 본인 식별·인증, 회원자격 유지·관리</li>
                            <li>서비스 제공: 반려동물 기록 저장, AI 펫톡 서비스, 추모 공간 제공</li>
                            <li>마케팅: 이벤트 및 광고성 정보 제공 (동의 시)</li>
                            <li>유료 서비스: 프리미엄 구독 결제 처리</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제2조 (수집하는 개인정보의 항목)</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full border dark:border-gray-700">
                                <thead className="bg-gray-100 dark:bg-gray-700">
                                    <tr>
                                        <th className="border dark:border-gray-600 px-4 py-2">구분</th>
                                        <th className="border dark:border-gray-600 px-4 py-2">필수항목</th>
                                        <th className="border dark:border-gray-600 px-4 py-2">선택항목</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 dark:text-gray-300">
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">회원가입</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">이메일, 비밀번호, 닉네임</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">프로필 이미지</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">반려동물 등록</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">이름, 종류</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">생년월일, 성별, 사진, 건강기록</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">유료 결제</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">결제정보 (PG사 처리)</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">-</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제3조 (개인정보의 처리 및 보유 기간)</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full border dark:border-gray-700">
                                <thead className="bg-gray-100 dark:bg-gray-700">
                                    <tr>
                                        <th className="border dark:border-gray-600 px-4 py-2">구분</th>
                                        <th className="border dark:border-gray-600 px-4 py-2">보유기간</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 dark:text-gray-300">
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">회원 정보</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">회원 탈퇴 시까지 (탈퇴 후 30일 내 파기)</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">반려동물 기록</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">회원 탈퇴 시까지</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">결제 정보</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">전자상거래법에 따라 5년</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제7조 (AI 서비스 이용 관련 안내)</h2>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>&quot;AI 펫톡&quot; 서비스는 인공지능(AI) 기술을 활용하여 제공됩니다.</li>
                            <li>AI와의 대화 내용은 서비스 품질 향상을 위해 익명화된 형태로 분석될 수 있습니다.</li>
                            <li>AI의 응답은 참고용이며, 의료·법률 등 전문적 조언을 대체하지 않습니다.</li>
                            <li>사용자는 언제든지 AI 서비스 이용 내역 삭제를 요청할 수 있습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제10조 (개인정보 보호책임자)</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full border dark:border-gray-700">
                                <tbody className="text-gray-600 dark:text-gray-300">
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2 font-semibold">성명</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">안승빈</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2 font-semibold">직책</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">대표 / 개인정보 보호책임자</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2 font-semibold">연락처</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">sharkwind1@gmail.com</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제11조 (권익침해 구제방법)</h2>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>개인정보침해신고센터: (국번없이) 118 / privacy.kisa.or.kr</li>
                            <li>개인정보분쟁조정위원회: 1833-6972 / kopico.go.kr</li>
                            <li>대검찰청 사이버수사과: (국번없이) 1301</li>
                            <li>경찰청 사이버안전국: (국번없이) 182</li>
                        </ul>
                    </section>

                    <div className="text-center pt-8 border-t dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">
                            본 방침은 2026년 ___월 ___일부터 시행합니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
