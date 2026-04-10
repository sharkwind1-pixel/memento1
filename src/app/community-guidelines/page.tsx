/**
 * 커뮤니티 가이드라인 페이지
 * 메멘토애니 서비스의 커뮤니티 운영 규칙
 */

import { Metadata } from "next";

export const metadata: Metadata = {
    title: "커뮤니티 가이드라인 | 메멘토애니",
    description: "메멘토애니 커뮤니티 이용 규칙 및 운영 정책",
};

export default function CommunityGuidelinesPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-white mb-8 text-center">
                    커뮤니티 가이드라인
                </h1>

                <div className="prose dark:prose-invert max-w-none space-y-8">
                    <p className="text-gray-500 dark:text-gray-400 italic">
                        시행일자: 2026년 3월 1일
                    </p>

                    {/* 전문 */}
                    <section>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                            메멘토애니는 반려동물과 함께하는 모든 순간을 기록하고, 이별 후에도 따뜻한 추억을 간직할 수 있는
                            공간입니다. 이곳에는 반려동물과의 일상을 나누는 분, 새로운 가족을 맞이하려는 분,
                            그리고 소중한 가족과의 이별을 겪고 있는 분까지 다양한 분들이 함께합니다.
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-2">
                            모든 이용자가 안전하고 따뜻한 경험을 할 수 있도록, 다음의 커뮤니티 가이드라인을 준수해 주시기 바랍니다.
                        </p>
                    </section>

                    {/* 제1조 기본 원칙 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제1조 (기본 원칙)
                        </h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>
                                <strong>존중과 배려:</strong> 모든 이용자를 존중하고 배려합니다. 특히 반려동물과의 이별로
                                힘든 시간을 보내고 있는 분들에 대한 각별한 배려를 부탁드립니다.
                            </li>
                            <li>
                                <strong>진정성 있는 소통:</strong> 진심 어린 소통으로 서로를 격려하고 위로합니다.
                                반려동물에 대한 사랑을 나누는 공간으로서의 가치를 지켜주세요.
                            </li>
                            <li>
                                <strong>안전한 환경:</strong> 모든 이용자가 안심하고 자신의 이야기를 나눌 수 있는
                                안전한 환경을 함께 만들어갑니다.
                            </li>
                            <li>
                                <strong>다양성 존중:</strong> 반려동물의 종류, 양육 방식, 보호자의 배경에 관계없이
                                모든 이용자를 동등하게 대합니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제2조 금지 행위 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제2조 (금지 행위)
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                            다음의 행위는 엄격히 금지되며, 위반 시 제재가 적용됩니다.
                        </p>

                        <h3 className="text-lg font-semibold mt-4 text-red-600 dark:text-red-400">
                            1. 무관용 원칙 적용 (즉시 영구 차단)
                        </h3>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-2">
                            <li>동물학대를 조장, 미화, 방조하는 일체의 콘텐츠</li>
                            <li>동물학대 영상, 이미지 또는 이를 묘사한 글</li>
                            <li>기억 공간에 대한 고의적 모독, 조롱, 비하 행위</li>
                            <li>무지개다리를 건넌 반려동물이나 그 보호자를 조롱하는 행위</li>
                            <li>아동 착취, 성적 콘텐츠, 테러/폭력 조장 콘텐츠</li>
                            <li>타인의 개인정보(실명, 주소, 전화번호 등)를 동의 없이 게시하는 행위</li>
                        </ul>

                        <h3 className="text-lg font-semibold mt-4 text-memorial-600 dark:text-memorial-400">
                            2. 단계적 제재 적용
                        </h3>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-2">
                            <li>욕설, 비속어, 혐오 표현 사용</li>
                            <li>특정 인종, 성별, 종교, 장애, 성적 지향 등에 대한 차별적 표현</li>
                            <li>다른 이용자에 대한 비방, 명예훼손, 인격 모독</li>
                            <li>허위 사실 유포 또는 의도적 오해 유발</li>
                            <li>스팸, 광고, 도배, 무의미한 반복 게시</li>
                            <li>타인의 저작물을 무단 도용하는 행위</li>
                            <li>반려동물 불법 매매/거래 시도</li>
                            <li>근거 없는 수의학적 조언을 전문적 의견인 것처럼 제시하는 행위</li>
                            <li>서비스를 악용하여 금전적 이득을 취하려는 사기 행위</li>
                            <li>다중 계정을 이용한 부정 행위 (포인트 악용, 자작 좋아요 등)</li>
                            <li>자동화 도구(봇, 매크로 등)를 이용한 서비스 악용</li>
                        </ul>
                    </section>

                    {/* 제3조 게시물 작성 규칙 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제3조 (게시물 작성 규칙)
                        </h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>
                                게시물은 해당 게시판의 주제와 목적에 맞게 작성합니다.
                            </li>
                            <li>
                                게시물 제목은 내용을 파악할 수 있도록 구체적으로 작성합니다.
                            </li>
                            <li>
                                다른 이용자의 반려동물 사진이나 정보를 무단으로 사용하지 않습니다.
                            </li>
                            <li>
                                의료 관련 게시물은 개인적 경험을 공유하는 것이며,
                                전문적인 수의학적 조언은 반드시 수의사와 상담하시기 바랍니다.
                            </li>
                            <li>
                                게시판별 말머리(태그)가 있는 경우 적절한 말머리를 선택합니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제4조 추모게시판 특별 규칙 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제4조 (기억게시판 및 기억 공간 특별 규칙)
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                            기억게시판과 기억 모드는 무지개다리를 건넌 반려동물을 기억하고,
                            보호자분들이 서로 위로하는 특별한 공간입니다.
                            이 공간에서는 다음의 규칙이 추가로 적용됩니다.
                        </p>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>
                                <strong>절대적 존중:</strong> 기억 글에 대해 조롱, 비하, 냉소적 반응을 하는 것은
                                어떤 경우에도 허용되지 않습니다.
                            </li>
                            <li>
                                <strong>위로와 공감:</strong> 댓글은 위로와 공감의 목적으로 작성합니다.
                                &quot;그 정도로 슬퍼할 일인가&quot;, &quot;새로 키우면 되지&quot; 등 보호자의 감정을 경시하는
                                표현은 삼가주세요.
                            </li>
                            <li>
                                <strong>완곡한 표현:</strong> 직접적인 죽음이나 사망 표현 대신
                                &quot;무지개다리를 건너다&quot;, &quot;이곳을 떠나다&quot; 등 완곡한 표현을 사용해 주세요.
                            </li>
                            <li>
                                <strong>비교 금지:</strong> 다른 보호자의 슬픔과 비교하거나,
                                애도 방식에 대해 옳고 그름을 판단하는 행위는 금지됩니다.
                            </li>
                            <li>
                                <strong>광고/홍보 금지:</strong> 기억 공간에서의 상업적 홍보
                                (장례 서비스, 관련 상품 등)는 엄격히 금지됩니다.
                            </li>
                            <li>
                                기억게시판 규칙 위반은 일반 게시판보다 엄격하게 제재됩니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제5조 분실동물 게시판 규칙 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제5조 (분실동물 게시판 특별 규칙)
                        </h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>
                                분실/발견 동물의 정보는 정확하고 구체적으로 작성합니다
                                (종류, 특징, 분실/발견 장소, 날짜, 연락처 등).
                            </li>
                            <li>
                                허위 분실 신고는 엄격히 금지됩니다.
                            </li>
                            <li>
                                동물 매매 목적의 게시물은 즉시 삭제되며, 작성자에게 제재가 적용됩니다.
                            </li>
                            <li>
                                발견된 동물의 경우 가능한 한 관할 지자체 유기동물보호소에도 신고해 주세요.
                            </li>
                            <li>
                                보상금 관련 분쟁에 대해 메멘토애니는 책임지지 않으며,
                                당사자 간 직접 해결하시기 바랍니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제6조 신고 절차 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제6조 (신고 절차)
                        </h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>
                                가이드라인을 위반한 게시물이나 이용자를 발견한 경우,
                                해당 게시물 또는 댓글의 &quot;신고하기&quot; 버튼을 통해 신고할 수 있습니다.
                            </li>
                            <li>
                                신고 시 다음의 사유를 선택하여 구체적으로 작성해 주시면 빠른 처리에 도움이 됩니다.
                                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                                    <li>욕설/비방/혐오 표현</li>
                                    <li>스팸/광고</li>
                                    <li>허위 정보</li>
                                    <li>동물학대 관련</li>
                                    <li>기억 공간 모독</li>
                                    <li>개인정보 노출</li>
                                    <li>기타</li>
                                </ul>
                            </li>
                            <li>
                                신고된 게시물은 관리팀이 검토하며, 검토 결과에 따라
                                게시물 삭제, 비공개 처리, 작성자 제재 등의 조치가 이루어집니다.
                            </li>
                            <li>
                                허위 신고나 악의적 신고를 반복하는 경우, 신고자에게도 제재가 적용될 수 있습니다.
                            </li>
                            <li>
                                긴급한 사안(동물학대, 범죄 관련)은 신고와 함께 관할 경찰서(112) 또는
                                동물보호관리시스템(1577-0954)에도 신고해 주세요.
                            </li>
                        </ol>
                    </section>

                    {/* 제7조 제재 기준 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제7조 (제재 기준)
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                            가이드라인 위반 시 다음과 같은 단계적 제재가 적용됩니다.
                        </p>

                        <div className="overflow-x-auto">
                            <table className="min-w-full border dark:border-gray-700">
                                <thead className="bg-gray-100 dark:bg-gray-700">
                                    <tr>
                                        <th className="border dark:border-gray-600 px-4 py-2 text-left">단계</th>
                                        <th className="border dark:border-gray-600 px-4 py-2 text-left">조치</th>
                                        <th className="border dark:border-gray-600 px-4 py-2 text-left">적용 기준</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 dark:text-gray-300">
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2 font-medium">1단계</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">경고 + 해당 게시물 삭제</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">최초 위반</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2 font-medium">2단계</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">7일간 게시물 작성 제한</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">2회 위반 또는 경고 후 반복</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2 font-medium">3단계</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">30일간 서비스 이용 제한</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">3회 위반 또는 심각한 위반</td>
                                    </tr>
                                    <tr>
                                        <td className="border dark:border-gray-600 px-4 py-2 font-medium">4단계</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">영구 이용 제한 (회원 자격 상실)</td>
                                        <td className="border dark:border-gray-600 px-4 py-2">4회 이상 위반 또는 무관용 원칙 위반</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2 mt-4">
                            <li>
                                무관용 원칙 적용 대상(제2조 1항)은 경고 없이 즉시 영구 이용 제한 조치됩니다.
                            </li>
                            <li>
                                기억 공간 관련 위반은 일반 위반보다 한 단계 높은 제재가 적용됩니다.
                            </li>
                            <li>
                                제재 기간 중 추가 위반이 확인되면 상위 단계로 즉시 격상됩니다.
                            </li>
                            <li>
                                영구 이용 제한 시 보유 포인트, 미니미 등 디지털 자산은 모두 소멸됩니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제8조 이의 신청 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제8조 (이의 신청)
                        </h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>
                                제재 조치에 이의가 있는 경우, 제재 통지일로부터 7일 이내에
                                이메일(sharkwind1@gmail.com)을 통해 이의를 신청할 수 있습니다.
                            </li>
                            <li>
                                이의 신청 시 구체적인 사유와 증빙 자료를 함께 제출해 주시면
                                보다 정확한 검토가 가능합니다.
                            </li>
                            <li>
                                관리팀은 이의 신청을 접수한 날로부터 7일 이내에 검토 결과를 안내합니다.
                            </li>
                            <li>
                                이의 신청이 인정되는 경우 제재를 즉시 해제하며,
                                부당한 제재로 인해 소멸된 포인트 등은 복구됩니다.
                            </li>
                        </ol>
                    </section>

                    {/* 제9조 기타 */}
                    <section>
                        <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">
                            제9조 (기타)
                        </h2>
                        <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
                            <li>
                                본 가이드라인은 이용약관의 일부로서 효력을 가지며,
                                가이드라인에서 정하지 않은 사항은 이용약관을 따릅니다.
                            </li>
                            <li>
                                회사는 서비스 환경 변화에 따라 가이드라인을 개정할 수 있으며,
                                개정 시 서비스 내 공지사항을 통해 7일 전에 안내합니다.
                            </li>
                            <li>
                                가이드라인에 명시되지 않은 상황이라 하더라도,
                                서비스의 운영 목적과 다른 이용자의 권리를 침해하는 행위에 대해서는
                                관리팀의 판단에 따라 적절한 조치가 이루어질 수 있습니다.
                            </li>
                        </ol>
                    </section>

                    <div className="text-center pt-8 border-t dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">
                            공고일: 2026년 3월 1일 | 시행일: 2026년 3월 1일
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
