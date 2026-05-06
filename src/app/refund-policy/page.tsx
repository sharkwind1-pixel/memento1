/**
 * 환불 정책 페이지 (요약본)
 *
 * - PG사 / 앱 스토어 / 사용자 모두에게 노출되는 단순화된 환불 가이드.
 * - 상세 약관은 /payment-terms 참조.
 */

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "환불 정책 | 메멘토애니",
    description: "메멘토애니 결제·구독·AI 영상 등 유료 서비스의 환불 기준 안내",
    alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-8">
                <header className="space-y-2">
                    <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-white text-center">
                        환불 정책
                    </h1>
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                        시행일자: 2026년 5월 4일 · 이 페이지는 요약본입니다. 전체 조항은{" "}
                        <Link href="/payment-terms" className="text-memento-500 underline">결제 및 구독 약관</Link>
                        을 참조해 주세요.
                    </p>
                </header>

                <section className="prose dark:prose-invert max-w-none">
                    <h2 className="text-xl font-display font-bold">1. 구독 서비스 환불</h2>
                    <ul className="list-disc pl-6 space-y-1">
                        <li><strong>결제 후 24시간 이내</strong> · 사용 이력이 없거나 미미한 경우 전액 환불.</li>
                        <li>
                            <strong>24시간 경과 후 해지</strong> · 결제일~해지 시점까지의 기간을 밀리초 단위로 일할 계산하여 잔여분을 환불합니다.
                            기간이 지난 일수는 정상 사용으로 간주됩니다.
                        </li>
                        <li>
                            <strong>AI 영상 생성</strong> · 결제 회차에 사용한 AI 영상 1건당 3,500원이 환불 금액에서 차감됩니다.
                            (베이직 월 3회 / 프리미엄 월 6회 기본 제공 기준)
                        </li>
                        <li>
                            <strong>자동 결제 다음 회차</strong> · 해지 시점부터는 더 이상 자동 결제가 진행되지 않으며,
                            남은 이용 기간 동안은 프리미엄 기능을 그대로 사용할 수 있습니다.
                        </li>
                    </ul>

                    <h2 className="text-xl font-display font-bold">2. 단건 결제 환불 (미니미, AI 영상 단건 등)</h2>
                    <ul className="list-disc pl-6 space-y-1">
                        <li><strong>사용 전</strong>: 결제 후 7일 이내 전액 환불 (전자상거래법 제17조).</li>
                        <li><strong>사용 후</strong>: 디지털 콘텐츠의 특성상 환불이 제한될 수 있습니다.</li>
                        <li>오결제·이중결제 등 회사 귀책 사유는 즉시 100% 환불됩니다.</li>
                    </ul>

                    <h2 className="text-xl font-display font-bold">3. 환불 신청 방법</h2>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>앱 내 <strong>설정 → 구독 관리 → 해지</strong> 메뉴에서 자동 환불 신청.</li>
                        <li>이메일: <a className="text-memento-500" href="mailto:sharkwind1@gmail.com">sharkwind1@gmail.com</a></li>
                        <li>고객센터: 070-8095-9918 (평일 10:00 ~ 18:00, 주말·공휴일 제외)</li>
                    </ul>
                    <p className="text-sm text-gray-500">
                        영업일 기준 3일 이내에 결제 수단 원복으로 환불됩니다. 카드 결제는 PG사 정책에 따라 매입 전/후에 따라 처리 시간이 달라질 수 있습니다.
                    </p>

                    <h2 className="text-xl font-display font-bold">4. 환불이 제한되는 경우</h2>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>이용약관 위반 또는 부정 사용으로 이용이 정지된 경우.</li>
                        <li>구매 전 명시적으로 안내된 비환불 상품(이벤트성 포인트 충전 등).</li>
                        <li>회사가 정상적으로 서비스를 제공하였음에도 단순 변심으로 사용이 종료된 단건 디지털 콘텐츠.</li>
                    </ul>

                    <h2 className="text-xl font-display font-bold">5. 미사용 데이터 보관</h2>
                    <p>
                        구독 해지 후에도 펫 프로필·사진·일기 등은 무료 플랜 기준으로 계속 보관됩니다.
                        무료 플랜 한도를 초과하는 데이터는 30일간 안전하게 보관되며, 그 이전에 다시 구독 시 자동 복원됩니다.
                    </p>

                    <h2 className="text-xl font-display font-bold">6. 사업자 정보</h2>
                    <ul className="list-none pl-0 space-y-1 text-sm">
                        <li>상호: 메멘토애니 / 대표: 안승빈</li>
                        <li>사업자등록번호: 687-08-03135</li>
                        <li>통신판매업: 제2026-서울강북-0224호</li>
                        <li>주소: 서울특별시 강북구 덕릉로41길 78-5, 1층 102호(번동)</li>
                        <li>이메일: sharkwind1@gmail.com</li>
                        <li>전화: 070-8095-9918</li>
                    </ul>
                </section>
            </div>
        </div>
    );
}
