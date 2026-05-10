/**
 * 공개 결제 안내 페이지 (/pricing)
 *
 * PG사(KCP) 심사용 — 로그인 없이 확인 가능한 결제 상품/수단 안내.
 *  - 모든 플랜의 가격, 제공 횟수, 결제 수단(신용카드 명시) 표시
 *  - 단건 결제(영상 1건 3,500원) + 정기 구독 모두 노출
 *  - 휴대폰 소액결제 정책 명시 (KCP 추가 심사 대응)
 *  - 환불 정책 직링크
 *
 * 노출 위치: footer 법적 링크 + 가격 안내 메인 진입점
 */

import { Metadata } from "next";
import Link from "next/link";
import { PRICING, VIDEO } from "@/config/constants";

export const metadata: Metadata = {
    title: "요금제 및 결제 안내 | 메멘토애니",
    description: "메멘토애니 구독 플랜과 단건 결제 안내. 신용카드 / 휴대폰 소액결제 / 계좌이체 / 가상계좌 결제 지원.",
    alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
            <div className="max-w-5xl mx-auto space-y-10">
                <header className="text-center space-y-3">
                    <h1 className="text-4xl font-display font-bold text-gray-900 dark:text-white">
                        요금제 및 결제 안내
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        반려동물의 일상부터 추모까지, 메멘토애니는 모든 순간을 함께합니다.
                        합리적인 가격으로 다양한 결제 수단을 지원합니다.
                    </p>
                </header>

                {/* 결제 수단 안내 — KCP 심사 핵심 */}
                <section className="bg-white dark:bg-gray-800 rounded-2xl shadow p-8 space-y-4">
                    <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                        결제 수단
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        모든 결제는 PG사 NHN KCP를 통해 안전하게 처리되며, 결제 정보는 메멘토애니 서버에 저장되지 않습니다.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <PayMethodChip icon="💳" label="신용카드 결제" emphasis />
                        <PayMethodChip icon="📱" label="휴대폰 소액결제" />
                        <PayMethodChip icon="🏦" label="실시간 계좌이체" />
                        <PayMethodChip icon="🧾" label="가상계좌 입금" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        ※ 정기 구독(자동결제)은 신용카드 결제만 지원됩니다 (빌링키 발급).<br />
                        ※ 단건 결제는 위 모든 결제 수단을 이용하실 수 있습니다.
                    </p>
                </section>

                {/* 구독 플랜 */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white text-center">
                        정기 구독 플랜
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <PlanCard
                            name="무료"
                            price="0원"
                            period="평생"
                            features={[
                                "AI 펫톡 하루 10회",
                                "반려동물 1마리 등록",
                                "사진 펫당 50장 저장",
                                "AI 영상 평생 1회",
                                "커뮤니티 / 매거진 무제한",
                            ]}
                        />
                        <PlanCard
                            name="베이직"
                            price={`${PRICING.BASIC_MONTHLY.toLocaleString()}원`}
                            period="월 자동 결제"
                            highlight
                            features={[
                                "AI 펫톡 하루 50회",
                                "반려동물 3마리 등록",
                                "사진 펫당 200장 저장",
                                "AI 영상 월 3회",
                                "메모리얼 펫톡 지원",
                            ]}
                        />
                        <PlanCard
                            name="프리미엄"
                            price={`${PRICING.PREMIUM_MONTHLY.toLocaleString()}원`}
                            period="월 자동 결제"
                            features={[
                                "AI 펫톡 무제한",
                                "반려동물 10마리 등록",
                                "사진 펫당 1,000장 저장",
                                "AI 영상 월 6회",
                                "우선 고객 지원",
                            ]}
                        />
                    </div>
                </section>

                {/* 단건 결제 — KCP가 확인 요구한 단건결제 상품 */}
                <section className="bg-gradient-to-br from-memento-50 to-violet-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-8 space-y-5">
                    <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                        단건 결제 상품
                    </h2>
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    AI 영상 생성 1회권
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    구독 없이 필요할 때만 사용. 결제 즉시 1회 추가.
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    결제 수단: <strong className="text-memento-600">신용카드</strong> ·
                                    휴대폰 소액결제 · 계좌이체 · 가상계좌
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-display font-bold text-memento-600">
                                    {VIDEO.SINGLE_PRICE.toLocaleString()}원
                                </div>
                                <div className="text-xs text-gray-500">VAT 포함</div>
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        ※ 단건 결제는 회원가입 후 <strong>기록 → AI 영상 생성</strong> 메뉴에서 진행됩니다.
                        무료 회원도 평생 1회 무료 영상 생성을 사용한 후 구매할 수 있습니다.
                    </p>
                </section>

                {/* 휴대폰 소액결제 정책 — KCP 추가 심사용 */}
                <section className="bg-white dark:bg-gray-800 rounded-2xl shadow p-8 space-y-4 border-2 border-amber-200 dark:border-amber-800">
                    <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>📱</span> 휴대폰 소액결제 환불 정책
                    </h2>
                    <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <li>
                            <strong>휴대폰 소액결제는 당월취소만 가능하며 결제자 본인명의 계좌로 환불됩니다.</strong>
                        </li>
                        <li>
                            <strong>휴대폰 결제의 경우 당월은 취소만 가능하며, 익월 이후 청구요금 수납 확인 후 결제자 본인 계좌로 환불 가능합니다.</strong>
                        </li>
                        <li>
                            번호 변경, 명의 변경 등의 사유로 당월 취소가 불가한 경우에도 휴대폰 수납확인서 수신 후 결제자 본인명의 계좌로 직접 환불 처리됩니다.
                        </li>
                        <li>
                            연체 상태인 결제 건은 이동통신사 정책에 따라 환불이 제한될 수 있습니다.
                        </li>
                        <li>
                            정산 주기: 이동통신사 정책에 따라 결제 후 휴대폰 요금을 납부한 소비자에 한하여 2개월 뒤 마지막 영업일에 정산됩니다.
                        </li>
                    </ul>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        본 정책은 이동통신사 및 PG사(NHN KCP) 정책을 준수합니다.
                    </p>
                </section>

                {/* 환불 정책 링크 */}
                <section className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        전체 환불 정책 및 약관
                    </h3>
                    <div className="flex flex-wrap justify-center gap-3 text-sm">
                        <Link
                            href="/refund-policy"
                            className="px-4 py-2 rounded-lg bg-memento-100 dark:bg-memento-900/30 text-memento-700 dark:text-memento-300 hover:bg-memento-200 transition"
                        >
                            환불 정책 자세히 보기
                        </Link>
                        <Link
                            href="/payment-terms"
                            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition"
                        >
                            결제·구독 약관
                        </Link>
                        <Link
                            href="/terms"
                            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition"
                        >
                            이용약관
                        </Link>
                    </div>
                </section>

                {/* 사업자 정보 */}
                <section className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong className="text-gray-900 dark:text-white">메멘토애니</strong> | 대표 안승빈</p>
                    <p>사업자등록번호 687-08-03135 | 통신판매업 제2026-서울강북-0224호</p>
                    <p>주소: 서울특별시 강북구 덕릉로41길 78-5, 1층 102호(번동)</p>
                    <p>고객센터: 070-8095-9918 | 이메일: sharkwind1@gmail.com</p>
                    <p className="text-xs text-gray-500 mt-2">
                        결제 대행: NHN KCP (kcp.co.kr) · 가맹점 승인 코드 IP6S2(자동결제), IP6RE(일반결제)
                    </p>
                </section>
            </div>
        </div>
    );
}

function PayMethodChip({ icon, label, emphasis = false }: { icon: string; label: string; emphasis?: boolean }) {
    return (
        <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
                emphasis
                    ? "bg-memento-50 dark:bg-memento-900/20 border-memento-300 dark:border-memento-700"
                    : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700"
            }`}
        >
            <span className="text-xl">{icon}</span>
            <span className={`text-sm font-medium ${emphasis ? "text-memento-700 dark:text-memento-300" : "text-gray-700 dark:text-gray-300"}`}>
                {label}
            </span>
        </div>
    );
}

function PlanCard({
    name, price, period, features, highlight = false,
}: {
    name: string;
    price: string;
    period: string;
    features: string[];
    highlight?: boolean;
}) {
    return (
        <div
            className={`relative rounded-2xl p-6 shadow-md ${
                highlight
                    ? "bg-gradient-to-br from-memento-500 to-violet-500 text-white scale-[1.02]"
                    : "bg-white dark:bg-gray-800"
            }`}
        >
            {highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                    인기
                </div>
            )}
            <h3 className={`text-xl font-bold ${highlight ? "text-white" : "text-gray-900 dark:text-white"}`}>
                {name}
            </h3>
            <div className="mt-4">
                <div className={`text-3xl font-display font-bold ${highlight ? "text-white" : "text-gray-900 dark:text-white"}`}>
                    {price}
                </div>
                <div className={`text-sm ${highlight ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>
                    {period}
                </div>
            </div>
            <ul className={`mt-6 space-y-2 text-sm ${highlight ? "text-white/95" : "text-gray-700 dark:text-gray-300"}`}>
                {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                        <span className={highlight ? "text-amber-200" : "text-memento-500"}>✓</span>
                        <span>{f}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
