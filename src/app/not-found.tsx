/**
 * 404 Not Found 페이지
 */
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0F9FF] via-[#FAFCFF] to-white p-4">
            <div className="max-w-md w-full text-center">
                <div className="text-7xl font-bold text-sky-200 mb-4">404</div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                    페이지를 찾을 수 없습니다
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                    요청하신 페이지가 존재하지 않거나 이동되었습니다.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-white font-medium hover:opacity-90 transition-opacity"
                >
                    홈으로 돌아가기
                </Link>
            </div>
        </div>
    );
}
