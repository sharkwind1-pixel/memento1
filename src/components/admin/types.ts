/**
 * ============================================================================
 * admin/types.ts
 * ============================================================================
 * 관리자 페이지에서 사용하는 모든 타입 정의
 *
 * 📌 이 파일의 목적:
 * - 관리자 기능에서 공통으로 사용하는 타입들을 한 곳에서 관리
 * - 타입 일관성 유지 및 재사용성 향상
 * ============================================================================
 */

// ============================================================================
// 탭 관련 타입
// ============================================================================

/**
 * 관리자 페이지의 탭 종류
 * - dashboard: 현황 대시보드
 * - users: 유저 관리
 * - posts: 게시물 관리
 * - reports: 신고 관리
 * - inquiries: 문의 관리
 * - withdrawals: 탈퇴자 관리
 */
export type AdminTab =
    | "dashboard"
    | "users"
    | "posts"
    | "reports"
    | "inquiries"
    | "withdrawals";

// ============================================================================
// 탈퇴 관련 타입
// ============================================================================

/**
 * 탈퇴 유형
 * - abuse_concern: 악용 우려로 인한 탈퇴 (30일 후 재가입 가능)
 * - banned: 영구 차단 (재가입 불가, IP 차단)
 * - error_resolution: 오류 해결용 탈퇴 (즉시 재가입 가능)
 */
export type WithdrawalType = "abuse_concern" | "banned" | "error_resolution";

/**
 * 탈퇴 유형별 한글 라벨
 */
export const WITHDRAWAL_TYPE_LABELS: Record<WithdrawalType, string> = {
    abuse_concern: "악용 우려 (30일 후 재가입)",
    banned: "영구 차단",
    error_resolution: "오류 해결용 (즉시 재가입 가능)",
};

/**
 * 탈퇴 유형별 배지 색상
 */
export const WITHDRAWAL_TYPE_COLORS: Record<WithdrawalType, string> = {
    abuse_concern: "bg-amber-100 text-amber-700",
    banned: "bg-red-100 text-red-700",
    error_resolution: "bg-green-100 text-green-700",
};

/**
 * 탈퇴된 유저 정보
 */
export interface WithdrawnUser {
    id: string;                          // 탈퇴 기록 ID
    user_id: string;                     // 유저 ID
    email: string;                       // 이메일
    nickname?: string;                   // 닉네임
    ip_address?: string;                 // IP 주소 (차단용)
    withdrawal_type: WithdrawalType;     // 탈퇴 유형
    withdrawn_at: string;                // 탈퇴 처리 일시
    rejoin_allowed_at?: string;          // 재가입 허용 일시
    reason?: string;                     // 탈퇴/차단 사유
    processed_by?: string;               // 처리한 관리자 ID
}

// ============================================================================
// 대시보드 관련 타입
// ============================================================================

/**
 * 대시보드 통계 데이터
 */
export interface DashboardStats {
    totalUsers: number;          // 전체 사용자 수
    totalPets: number;           // 전체 반려동물 수
    totalPosts: number;          // 전체 게시글 수
    totalChats: number;          // 전체 AI 채팅 수
    todayUsers: number;          // 오늘 가입자 수
    todayChats: number;          // 오늘 채팅 수
    premiumUsers: number;        // 프리미엄 사용자 수
    bannedUsers: number;         // 차단된 사용자 수
    todayActiveUsers: number;    // DAU (일간 활성 사용자)
    weeklyActiveUsers: number;   // WAU (주간 활성 사용자)
    monthlyActiveUsers: number;  // MAU (월간 활성 사용자)
}

/**
 * 차트 데이터 (최근 7일 추이)
 */
export interface ChartData {
    date: string;     // 날짜 (예: "2/10")
    가입자: number;   // 해당 날짜 가입자 수
    채팅: number;     // 해당 날짜 채팅 수
    접속자: number;   // 해당 날짜 접속자 수
}

// ============================================================================
// 유저 관련 타입
// ============================================================================

/**
 * 유저 정보 (관리자용)
 */
export interface UserRow {
    id: string;                          // 유저 ID
    email: string;                       // 이메일
    created_at: string;                  // 가입일
    user_metadata?: {
        nickname?: string;               // 닉네임
    };
    is_banned?: boolean;                 // 차단 여부
    is_premium?: boolean;                // 프리미엄 여부
    is_admin?: boolean;                  // 관리자 여부
    premium_started_at?: string;         // 프리미엄 시작일
    premium_expires_at?: string;         // 프리미엄 만료일
    premium_plan?: string;               // 프리미엄 플랜 종류
    points?: number;                     // 보유 포인트
}

// ============================================================================
// 게시물 관련 타입
// ============================================================================

/**
 * 게시물 정보 (관리자용)
 */
export interface PostRow {
    id: string;                  // 게시물 ID
    title: string;               // 제목
    content: string;             // 내용
    author_id: string;           // 작성자 ID
    author_email?: string;       // 작성자 이메일/닉네임
    created_at: string;          // 작성일
    is_hidden?: boolean;         // 숨김 여부
    report_count?: number;       // 신고 횟수
}

// ============================================================================
// 문의 관련 타입
// ============================================================================

/**
 * 문의 카테고리
 * - question: 일반 질문
 * - report: 신고
 * - suggestion: 건의사항
 */
export type InquiryCategory = "question" | "report" | "suggestion";

/**
 * 문의 상태
 * - pending: 대기중
 * - in_progress: 처리중
 * - resolved: 답변 완료
 * - closed: 종료
 */
export type InquiryStatus = "pending" | "in_progress" | "resolved" | "closed";

/**
 * 문의 정보
 */
export interface InquiryRow {
    id: string;                          // 문의 ID
    user_id: string | null;              // 작성자 ID (비회원 가능)
    email: string;                       // 이메일
    category: InquiryCategory;           // 카테고리
    title: string;                       // 제목
    content: string;                     // 내용
    status: InquiryStatus;               // 상태
    admin_response: string | null;       // 관리자 답변
    responded_at: string | null;         // 답변 일시
    created_at: string;                  // 작성일
}

// ============================================================================
// 신고 관련 타입
// ============================================================================

/**
 * 신고 대상 유형
 */
export type ReportTargetType = "post" | "comment" | "user" | "pet_memorial";

/**
 * 신고 상태
 * - pending: 대기중
 * - reviewing: 검토중
 * - resolved: 처리 완료
 * - rejected: 반려
 */
export type ReportStatus = "pending" | "reviewing" | "resolved" | "rejected";

/**
 * 신고 정보
 */
export interface ReportRow {
    id: string;                          // 신고 ID
    reporter_id: string;                 // 신고자 ID
    reporter_email?: string;             // 신고자 이메일
    target_type: ReportTargetType;       // 신고 대상 유형
    target_id: string;                   // 신고 대상 ID
    reason: string;                      // 신고 사유 코드
    description: string | null;          // 상세 설명
    status: ReportStatus;                // 상태
    admin_notes: string | null;          // 관리자 메모
    resolved_at: string | null;          // 처리 일시
    resolved_by: string | null;          // 처리 관리자 ID
    created_at: string;                  // 신고일
}

/**
 * 신고 사유 라벨
 */
export const REPORT_REASON_LABELS: Record<string, string> = {
    spam: "스팸/광고",
    abuse: "욕설/비방",
    inappropriate: "부적절한 콘텐츠",
    harassment: "괴롭힘",
    misinformation: "허위정보",
    copyright: "저작권 침해",
    other: "기타",
};

/**
 * 신고 대상 유형 라벨
 */
export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
    post: "게시물",
    comment: "댓글",
    user: "회원",
    pet_memorial: "추모공간",
};
