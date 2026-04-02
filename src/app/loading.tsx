/**
 * 앱 레벨 로딩 UI
 * 초기 페이지 로드 시 빈 화면(white flash) 대신 브랜딩된 로딩 상태 표시
 */

export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
            <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-sky-100 to-sky-200 dark:from-sky-800 dark:to-sky-900 rounded-2xl animate-pulse" />
                <p className="text-sm text-gray-400 dark:text-gray-500">
                    불러오는 중...
                </p>
            </div>
        </div>
    );
}
