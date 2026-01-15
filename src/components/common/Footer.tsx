/**
 * 메멘토애니 푸터 컴포넌트
 */

import { Heart, Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative mt-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50/30 to-sky-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="absolute top-8 left-1/4 w-64 h-64 bg-blue-200/20 dark:bg-blue-800/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-8 right-1/4 w-64 h-64 bg-sky-200/20 dark:bg-sky-800/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border-t border-white/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* 회사 정보 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-sky-500 rounded-lg flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
                  메멘토애니
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                반려동물과의 시간을<br />
                기록해도 괜찮은 장소
              </p>
            </div>

            {/* 서비스 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">서비스</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">AI 펫톡</a></li>
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">커뮤니티</a></li>
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">입양 정보</a></li>
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">펫케어 가이드</a></li>
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">추모공간</a></li>
              </ul>
            </div>

            {/* 지원 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">고객지원</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">도움말</a></li>
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">FAQ</a></li>
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">문의하기</a></li>
                <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">신고하기</a></li>
              </ul>
            </div>

            {/* 연락처 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">연락처</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <Phone className="w-4 h-4" />
                  <span>1588-1234</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span>help@memento-ani.com</span>
                </div>
                <div className="flex items-start space-x-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span>서울특별시 강남구<br />테헤란로 427, 10층</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent my-8"></div>

          <div className="space-y-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p><strong className="text-gray-700 dark:text-gray-300">(주) 메멘토애니</strong> | 대표 안승빈</p>
              <p>사업자번호 123-45-67890 | 통신판매업 신고번호 2026-서울강남-1234</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">이용약관</a>
              <a href="#" className="text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">개인정보처리방침</a>
              <a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">운영정책</a>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                2026 메멘토애니. 모든 권리 보유.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-2 md:mt-0">
                기록해도 괜찮은 장소
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
