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
                        이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립 및 공개합니다.
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 italic">
                        시행일자: 서비스 정식 오픈 시 확정
                    </p>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제1조 (개인정보의 처리 목적)</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리한 개인정보는 다음의 목적 이외의 용도로는 사용되지 않으며, 이용 목적이 변경될 시에는 사전 동의를 구할 예정입니다.
                        </p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>회원 가입 및 관리: 회원 가입의사 확인, 본인 식별 및 인증, 회원자격 유지 및 관리, 서비스 부정이용 방지</li>
                            <li>서비스 제공: 반려동물 기록 저장, AI 펫톡 서비스, 추모 공간 제공, 커뮤니티 서비스</li>
                            <li>AI 서비스 제공: AI 펫톡 대화를 위한 외부 AI 서비스(OpenAI) 연동</li>
                            <li>마케팅: 이벤트 및 광고성 정보 제공 (별도 동의 시)</li>
                            <li>유료 서비스: 프리미엄 구독 결제 처리</li>
                            <li>민원 처리: 민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락 및 통지, 처리결과 통보</li>
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
                                        <td className="border dark:border-gray-600 px-4 py-2">AI 펫톡 이용</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">대화 내용</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">-</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">유료 결제</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">결제정보 (PG사 처리)</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">-</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">자동 수집</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">IP 주소, 접속 기기 정보, 서비스 이용 기록, 접속 로그</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">-</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제3조 (개인정보의 처리 및 보유 기간)</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            회사는 법령에 따른 개인정보 보유 및 이용 기간 또는 정보주체로부터 동의받은 기간 내에서 개인정보를 처리 및 보유합니다.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="min-w-full border dark:border-gray-700">
                                <thead className="bg-gray-100 dark:bg-gray-700">
                                    <tr>
                                        <th className="border dark:border-gray-600 px-4 py-2">구분</th>
                                        <th className="border dark:border-gray-600 px-4 py-2">보유기간</th>
                                        <th className="border dark:border-gray-600 px-4 py-2">근거</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 dark:text-gray-300">
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">회원 정보</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">회원 탈퇴 시까지 (탈퇴 후 30일 내 파기)</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">동의</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">반려동물 기록</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">회원 탈퇴 시까지</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">동의</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">결제 정보</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">5년</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">전자상거래법</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">접속 로그</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">3개월</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">통신비밀보호법</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제4조 (개인정보의 제3자 제공)</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            회사는 원칙적으로 정보주체의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에 해당할 때에는 개인정보를 제3자에게 제공할 수 있습니다.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="min-w-full border dark:border-gray-700">
                                <thead className="bg-gray-100 dark:bg-gray-700">
                                    <tr>
                                        <th className="border dark:border-gray-600 px-4 py-2">제공받는 자</th>
                                        <th className="border dark:border-gray-600 px-4 py-2">목적</th>
                                        <th className="border dark:border-gray-600 px-4 py-2">제공 항목</th>
                                        <th className="border dark:border-gray-600 px-4 py-2">보유 기간</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 dark:text-gray-300">
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">OpenAI (미국)</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">AI 펫톡 대화 서비스 제공</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">AI 대화 내용 (반려동물 이름, 대화 텍스트)</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">API 처리 후 즉시 삭제 (OpenAI API 정책에 따라 30일 내 삭제, 모델 학습에 미사용)</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mt-2">
                            그 외 법령에 따라 수사기관 등에 제공이 요구되는 경우, 관련 법령에 근거하여 제공할 수 있습니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제5조 (개인정보의 국외 이전)</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            회사는 AI 펫톡 서비스 제공을 위해 다음과 같이 개인정보를 국외로 이전합니다.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="min-w-full border dark:border-gray-700">
                                <thead className="bg-gray-100 dark:bg-gray-700">
                                    <tr>
                                        <th className="border dark:border-gray-600 px-4 py-2">항목</th>
                                        <th className="border dark:border-gray-600 px-4 py-2">내용</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 dark:text-gray-300">
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">이전받는 자</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">OpenAI, L.L.C. (미국)</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">이전 국가</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">미국</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">이전 항목</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">AI 대화 내용 (반려동물 이름, 대화 텍스트)</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">이전 방법</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">네트워크를 통한 API 전송 (HTTPS 암호화)</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">이전 목적</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">AI 기반 대화 응답 생성</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2">보유 기간</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">API 처리 후 즉시 삭제 (OpenAI API 이용약관에 따라 30일 내 삭제, 모델 학습에 미사용)</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mt-2">
                            또한, 서비스의 데이터베이스는 Supabase(미국 소재)를 통해 관리되며, 회원 정보 및 서비스 데이터가 해외 서버에 저장될 수 있습니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제6조 (개인정보의 파기 절차 및 방법)</h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li><strong>파기 절차</strong>: 회원이 입력한 정보는 목적이 달성된 후 별도의 DB로 옮겨져(종이의 경우 별도의 서류함) 내부 방침 및 관련 법령에 따라 일정 기간 저장된 후 파기됩니다.</li>
                            <li><strong>파기 방법</strong>: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다. 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각합니다.</li>
                            <li><strong>파기 기한</strong>: 개인정보의 보유 기간이 경과한 경우에는 보유 기간의 종료일로부터 5일 이내에, 개인정보의 처리 목적 달성 등 그 개인정보가 불필요하게 된 경우에는 개인정보의 처리가 불필요한 것으로 인정되는 날로부터 5일 이내에 해당 개인정보를 파기합니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제7조 (AI 서비스 이용 관련 안내)</h2>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>&quot;AI 펫톡&quot; 서비스는 인공지능(AI) 기술을 활용하여 제공됩니다. (인공지능기본법 제27조에 의한 고지)</li>
                            <li>AI와의 대화 내용은 서비스 제공을 위해 OpenAI의 API로 전송되며, OpenAI는 API를 통해 수신한 데이터를 모델 학습에 사용하지 않습니다.</li>
                            <li>회사는 회원의 AI 대화 데이터를 자체 AI 모델 학습 목적으로 사용하지 않습니다.</li>
                            <li>AI의 응답은 참고용이며, 의료, 법률 등 전문적 조언을 대체하지 않습니다.</li>
                            <li>사용자는 언제든지 AI 서비스 이용 내역의 삭제를 요청할 수 있습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제8조 (정보주체의 권리 및 행사 방법)</h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
                                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                                    <li>개인정보 열람 요구</li>
                                    <li>오류 등이 있을 경우 정정 요구</li>
                                    <li>삭제 요구</li>
                                    <li>처리 정지 요구</li>
                                </ul>
                            </li>
                            <li>위 권리 행사는 서비스 내 설정 기능 또는 이메일(sharkwind1@gmail.com)을 통해 할 수 있으며, 회사는 지체 없이 조치하겠습니다.</li>
                            <li>정보주체가 개인정보의 오류에 대한 정정을 요청한 경우, 정정을 완료하기 전까지 해당 개인정보를 이용하거나 제공하지 않습니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제9조 (개인정보의 안전성 확보 조치)</h2>
                        <p className="text-gray-600 dark:text-gray-300">회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li><strong>기술적 조치</strong>: 개인정보의 암호화(비밀번호는 해시 처리), HTTPS를 통한 데이터 전송 암호화, 접근 권한 관리</li>
                            <li><strong>관리적 조치</strong>: 개인정보 취급자 최소화, 정기적인 자체 점검</li>
                            <li><strong>물리적 조치</strong>: 서버는 클라우드 서비스(Supabase)의 보안 인프라를 활용</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제10조 (쿠키 및 자동 수집 장치의 운용)</h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>회사는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 쿠키(Cookie) 및 로컬 스토리지를 사용합니다.</li>
                            <li>쿠키는 웹사이트를 운영하는 데 이용되는 서버가 이용자의 브라우저에 보내는 소량의 정보로, 이용자의 컴퓨터에 저장됩니다.</li>
                            <li>이용자는 웹 브라우저 옵션 설정을 통해 쿠키의 허용, 차단 등을 설정할 수 있습니다. 다만 쿠키 저장을 거부할 경우 일부 서비스 이용에 어려움이 발생할 수 있습니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제11조 (만 14세 미만 아동의 개인정보 처리)</h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>회사는 만 14세 미만 아동의 개인정보를 수집할 때 법정대리인의 동의를 받아야 함을 알고 있으며, 이를 위한 절차를 마련합니다.</li>
                            <li>만 14세 미만 아동의 법정대리인은 아동의 개인정보에 대한 열람, 정정, 삭제, 처리 정지를 요구할 수 있습니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제12조 (개인정보 보호책임자)</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-2">
                            회사는 개인정보 처리에 관한 업무를 총괄하여 책임지고, 개인정보 처리와 관련한 정보주체의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                        </p>
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
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제13조 (권익침해 구제방법)</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-2">
                            정보주체는 개인정보 침해로 인한 구제를 받기 위하여 아래의 기관에 분쟁 해결이나 상담 등을 신청할 수 있습니다.
                        </p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                            <li>개인정보침해신고센터: (국번없이) 118 / privacy.kisa.or.kr</li>
                            <li>개인정보분쟁조정위원회: 1833-6972 / kopico.go.kr</li>
                            <li>대검찰청 사이버수사과: (국번없이) 1301</li>
                            <li>경찰청 사이버안전국: (국번없이) 182</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">제14조 (개인정보 처리방침 변경)</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
                        </p>
                    </section>

                    <div className="text-center pt-8 border-t dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">
                            본 방침은 서비스 정식 오픈 시 시행일자가 확정됩니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
