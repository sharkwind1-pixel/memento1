/**
 * 계정 삭제 안내 페이지
 *
 * Google Play "데이터 보안" 요구사항을 위해 별도 페이지로 분리.
 * URL: https://www.mementoani.com/account-deletion
 *
 * 요구사항 (Google Play):
 * 1. 앱/개발자 이름 명시
 * 2. 계정 삭제 단계 명확히 안내
 * 3. 삭제/보관되는 데이터 유형 + 보관 기간 명시
 * 4. 일부 데이터만 삭제 옵션 (있으면 명시)
 */

import { Metadata } from "next";

export const metadata: Metadata = {
    title: "계정 및 데이터 삭제 안내 | 메멘토애니",
    description: "메멘토애니 회원 계정 및 사용자 데이터 삭제 요청 절차 안내",
    alternates: { canonical: "/account-deletion" },
};

export default function AccountDeletionPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-8">
                <header className="space-y-2 text-center">
                    <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-white">
                        계정 및 데이터 삭제 안내
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        앱: 메멘토애니 (Memento Ani) · 개발자: 안승빈 · 시행일자: 2026년 5월 6일
                    </p>
                </header>

                <section className="prose dark:prose-invert max-w-none space-y-6">
                    <h2 className="text-xl font-display font-bold">1. 계정 삭제 (회원 탈퇴) 절차</h2>

                    <div className="bg-memento-50 dark:bg-gray-900 rounded-xl p-4 space-y-2">
                        <p className="font-semibold">방법 A — 앱 내 직접 삭제 (권장)</p>
                        <ol className="list-decimal pl-6 space-y-1 text-sm">
                            <li>메멘토애니 앱(또는 웹) 로그인</li>
                            <li>우측 상단 프로필 아이콘 → <strong>프로필</strong> 클릭</li>
                            <li>맨 아래 <strong>회원 탈퇴</strong> 버튼 클릭</li>
                            <li>안내 확인 후 비밀번호 또는 소셜 인증으로 본인 확인</li>
                            <li>탈퇴 완료 (즉시 처리)</li>
                        </ol>
                    </div>

                    <div className="bg-memento-50 dark:bg-gray-900 rounded-xl p-4 space-y-2">
                        <p className="font-semibold">방법 B — 이메일 요청</p>
                        <ol className="list-decimal pl-6 space-y-1 text-sm">
                            <li>가입 시 사용한 이메일에서 <a className="text-memento-500" href="mailto:sharkwind1@gmail.com">sharkwind1@gmail.com</a> 으로 메일 발송</li>
                            <li>제목: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">[계정 삭제 요청] 메멘토애니</code></li>
                            <li>본문: 가입 이메일 + 닉네임 기재</li>
                            <li>영업일 기준 3일 이내 처리 완료 회신</li>
                        </ol>
                    </div>

                    <h2 className="text-xl font-display font-bold">2. 일부 데이터만 삭제 (계정 유지)</h2>
                    <p>
                        계정을 유지한 채 특정 데이터만 삭제하실 수 있습니다.
                    </p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li><strong>반려동물 프로필</strong>: 프로필 화면 → 펫 선택 → 우측 상단 메뉴 → 삭제</li>
                        <li><strong>사진/영상</strong>: 사진 상세 → 우측 상단 메뉴 → 삭제</li>
                        <li><strong>타임라인 일기</strong>: 일기 상세 → 우측 상단 메뉴 → 삭제</li>
                        <li><strong>커뮤니티 게시글/댓글</strong>: 본인이 작성한 글/댓글 → 우측 상단 메뉴 → 삭제</li>
                        <li><strong>AI 펫톡 대화</strong>: AI 펫톡 화면 → 우측 상단 메뉴 → 대화 기록 초기화</li>
                    </ul>

                    <h2 className="text-xl font-display font-bold">3. 삭제되는 데이터 유형</h2>
                    <p>회원 탈퇴 시 다음 데이터가 영구 삭제됩니다:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>계정 정보 (이메일, 닉네임, 프로필 사진, 비밀번호 해시)</li>
                        <li>반려동물 프로필 전부 (이름, 종, 사진, 성격, 일기 등)</li>
                        <li>업로드한 사진/영상 전부 (Supabase Storage)</li>
                        <li>타임라인 일기 / 케어 리마인더</li>
                        <li>AI 펫톡 대화 기록 / 장기 메모리</li>
                        <li>커뮤니티 게시글 / 댓글 / 좋아요</li>
                        <li>펫홈 / 꼬미 / 방명록</li>
                        <li>포인트 잔액 / 포인트 거래 내역</li>
                        <li>AI 영상 생성물</li>
                        <li>알림 / 푸시 토큰</li>
                    </ul>

                    <h2 className="text-xl font-display font-bold">4. 법적 의무로 보관되는 데이터</h2>
                    <p>관계 법령에 따라 일정 기간 보관되는 데이터:</p>
                    <ul className="list-none pl-0 space-y-2">
                        <li>
                            <strong>결제 기록</strong> (전자상거래법 제6조)
                            <br />→ 5년간 보관 (대금 결제 및 재화 공급 기록)
                        </li>
                        <li>
                            <strong>소비자 불만/분쟁 처리 기록</strong> (전자상거래법 제6조)
                            <br />→ 3년간 보관
                        </li>
                        <li>
                            <strong>로그인/접속 기록</strong> (통신비밀보호법)
                            <br />→ 3개월간 보관
                        </li>
                        <li>
                            <strong>재가입 방지를 위한 익명화된 식별자</strong>
                            <br />→ 30일간 보관 후 영구 삭제
                        </li>
                    </ul>
                    <p className="text-sm text-gray-500">
                        위 항목은 식별 정보를 분리·암호화하여 보관하며, 보관 기간 종료 후 자동 파기됩니다.
                    </p>

                    <h2 className="text-xl font-display font-bold">5. 즉시 비활성화 vs 영구 삭제</h2>
                    <ul className="list-disc pl-6 space-y-1">
                        <li><strong>즉시 비활성화</strong>: 탈퇴 요청 즉시 로그인 불가, 다른 사용자에게 비공개 처리</li>
                        <li><strong>영구 삭제</strong>: 탈퇴 후 30일 이내 데이터베이스에서 완전 삭제 (복구 불가)</li>
                        <li>30일 동안은 동일 이메일/소셜 계정으로 재가입 시 안내 메시지 표시</li>
                    </ul>

                    <h2 className="text-xl font-display font-bold">6. 문의처</h2>
                    <ul className="list-none pl-0 space-y-1 text-sm">
                        <li>이메일: <a className="text-memento-500" href="mailto:sharkwind1@gmail.com">sharkwind1@gmail.com</a></li>
                        <li>고객센터: 070-8095-9918 (평일 10:00 ~ 18:00)</li>
                        <li>주소: 서울특별시 강북구 덕릉로41길 78-5, 1층 102호(번동)</li>
                        <li>대표: 안승빈 / 사업자등록번호: 687-08-03135</li>
                    </ul>
                </section>
            </div>
        </div>
    );
}
