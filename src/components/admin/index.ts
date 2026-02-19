/**
 * ============================================================================
 * admin/index.ts
 * ============================================================================
 * 관리자 컴포넌트 통합 export
 *
 * 📌 구조 설명:
 * - types.ts: 모든 타입 정의
 * - hooks/: 데이터 로딩 훅
 * - tabs/: 각 탭 컴포넌트
 * - modals/: 모달 컴포넌트
 * ============================================================================
 */

// ============================================================================
// 타입 export
// ============================================================================
export * from "./types";

// ============================================================================
// 훅 export
// ============================================================================
export { useAdminData } from "./hooks/useAdminData";

// ============================================================================
// 탭 컴포넌트 export
// ============================================================================
export { default as AdminDashboardTab } from "./tabs/AdminDashboardTab";
export { default as AdminUsersTab } from "./tabs/AdminUsersTab";
export { default as AdminInquiriesTab } from "./tabs/AdminInquiriesTab";
export { default as AdminReportsTab } from "./tabs/AdminReportsTab";
export { default as AdminWithdrawalsTab } from "./tabs/AdminWithdrawalsTab";
export { default as AdminMagazineTab } from "./tabs/AdminMagazineTab";

// ============================================================================
// 모달 컴포넌트 export
// ============================================================================
export { PremiumModal } from "./modals/PremiumModal";
export { WithdrawalModal } from "./modals/WithdrawalModal";
