/**
 * 공개 서비스 소개 페이지 (/about)
 *
 * 목적: "메멘토애니"를 오프라인 강아지 장례식장·화장터로 오해하고
 *       문의 전화가 오는 문제 해결. 검색 노출(SEO) + 정체성 명확화.
 *
 * 핵심 메시지: 메멘토애니는 반려동물과의 일상을 기록하고 이별 후에도
 *             추억을 간직하는 모바일 앱·웹 플랫폼이며, 오프라인 장례
 *             시설이 아님을 분명히 한다.
 *
 * 노출 위치: footer 링크 + 검색엔진 색인 (robots/sitemap 포함)
 * 톤: 이모지 미사용, 완곡어("무지개다리", "이곳") 사용 — 서비스 톤앤매너.
 */

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "메멘토애니 소개 — 반려동물 추억 기록·추모 메모리얼 앱 (오프라인 장례식장 아님)",
    description:
        "메멘토애니는 반려동물과 함께한 일상을 기록하고, 무지개다리를 건넌 후에도 따뜻한 추억을 간직하는 모바일 앱·웹 서비스입니다. 오프라인 장례식장이나 화장터가 아닌, 추억을 담는 디지털 메모리얼 플랫폼입니다.",
    alternates: { canonical: "/about" },
    openGraph: {
        title: "메멘토애니 소개 — 반려동물 추억 기록·추모 메모리얼 앱",
        description:
            "메멘토애니는 오프라인 장례 시설이 아닙니다. 반려동물과의 모든 순간을 기록하고 추억하는 모바일 앱·웹 플랫폼입니다.",
        type: "website",
    },
    twitter: {
        card: "summary",
        title: "메멘토애니 소개 — 반려동물 추억 기록·추모 메모리얼 앱",
        description:
            "오프라인 장례 시설이 아닌, 반려동물과의 순간을 기록하고 추억하는 모바일 앱·웹 서비스입니다.",
    },
};

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-memento-50 via-memento-75 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-10">

                {/* 헤더 */}
                <header className="text-center space-y-3">
                    <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-white">
                        메멘토애니는 어떤 곳인가요?
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                        반려동물과 함께하는 모든 순간을 기록하고, 이별 후에도 따뜻한 추억을
                        간직할 수 있는 <strong>모바일 앱·웹 서비스</strong>입니다.
                    </p>
                </header>

                {/* 오해 직격 — 가장 먼저, 가장 크게 */}
                <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 sm:p-8 space-y-3">
                    <h2 className="text-xl sm:text-2xl font-display font-bold text-amber-800 dark:text-amber-200">
                        먼저, 자주 받는 문의에 대해
                    </h2>
                    <p className="text-amber-900 dark:text-amber-100 leading-relaxed">
                        메멘토애니는 <strong>오프라인 장례식장이나 화장(火葬) 시설이 아닙니다.</strong>
                        장례 절차, 화장 비용, 시설 예약 등의 문의를 주시는 분들이 계신데,
                        메멘토애니는 그런 시설을 운영하지 않습니다.
                    </p>
                    <p className="text-amber-900 dark:text-amber-100 leading-relaxed">
                        메멘토애니는 스마트폰 앱과 웹사이트로 이용하는 <strong>디지털 서비스</strong>로,
                        반려동물과의 일상을 기록하고 이별 후에도 추억을 간직하는 공간입니다.
                        반려동물을 떠나보내는 절차(장례·화장 등)는 거주 지역의 전문
                        반려동물 장례업체에 문의하셔야 합니다.
                    </p>
                </section>

                {/* 무엇을 하는 곳인가 */}
                <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 sm:p-8 space-y-4">
                    <h2 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-white">
                        메멘토애니가 하는 일
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        메멘토애니는 반려동물의 <strong>일상</strong>과 <strong>추억</strong>을
                        하나의 공간에 담습니다. 함께하는 동안의 기록이, 시간이 흐른 뒤에는
                        가장 소중한 추억의 재료가 됩니다.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                        <FeatureItem
                            title="일상 모드"
                            desc="산책, 식사, 건강을 타임라인 일기로 기록하고 사진·영상으로 추억을 모아요. AI 펫톡으로 반려동물과 대화하듯 하루를 나누고, 소중한 순간은 AI 영상으로 다시 만나요."
                        />
                        <FeatureItem
                            title="추모 모드"
                            desc="무지개다리를 건넌 후에는, 함께 쌓은 기록이 따뜻한 추모 공간으로 이어집니다. 그리운 마음을 나누고 추억을 간직해요."
                        />
                        <FeatureItem
                            title="케어 리마인더"
                            desc="산책·약·예방접종 같은 돌봄 일정을 알림으로 챙겨드려요."
                        />
                        <FeatureItem
                            title="커뮤니티"
                            desc="같은 마음을 가진 보호자들과 일상과 위로를 나누는 공간이에요."
                        />
                    </div>
                </section>

                {/* 이용 방법 */}
                <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 sm:p-8 space-y-3">
                    <h2 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-white">
                        어떻게 이용하나요?
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        웹사이트에서 바로 이용하거나, 모바일 앱으로 설치해 사용할 수 있습니다.
                        회원가입 후 반려동물을 등록하면 일상 기록과 추억 보관을 시작할 수 있어요.
                        기본 기능은 무료로 제공되며, 더 많은 기능이 필요할 때 구독을 선택할 수 있습니다.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                        <Link
                            href="/"
                            className="inline-flex items-center px-5 py-2.5 rounded-full bg-memento-500 hover:bg-memento-600 text-white text-sm font-medium transition"
                        >
                            메멘토애니 시작하기
                        </Link>
                        <Link
                            href="/pricing"
                            className="inline-flex items-center px-5 py-2.5 rounded-full border border-memento-300 dark:border-memento-700 text-memento-700 dark:text-memento-300 text-sm font-medium hover:bg-memento-50 dark:hover:bg-gray-700 transition"
                        >
                            요금제 보기
                        </Link>
                    </div>
                </section>

                {/* 운영 주체 / 문의 */}
                <section className="text-center space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <p>
                        메멘토애니는 반려동물과의 모든 희로애락을 함께하는 메모리얼 커뮤니티 플랫폼입니다.
                    </p>
                    <p>
                        서비스 이용 문의는 앱·웹 내 <strong>문의하기</strong>를 이용해주세요.
                        (장례·화장 등 오프라인 절차 문의는 지역 전문 업체로 연락 부탁드립니다.)
                    </p>
                </section>

            </div>
        </div>
    );
}

function FeatureItem({ title, desc }: { title: string; desc: string }) {
    return (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-1.5">
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>
        </div>
    );
}
