/**
 * 메멘토애니 메인 페이지
 */

'use client'

import { useState } from 'react'
import { TabType } from '@/types'
import Layout from '@/components/common/Layout'
import HomePage from '@/components/pages/HomePage'
import CommunityPage from '@/components/pages/CommunityPage'
import AIChatPage from '@/components/pages/AIChatPage'
import AdoptionPage from '@/components/pages/AdoptionPage'
import { MapPin, Stethoscope, Cloud } from 'lucide-react'

export default function Home() {
  const [selectedTab, setSelectedTab] = useState<TabType>('home')

  const handleTabChange = (tab: TabType) => {
    setSelectedTab(tab)
  }

  const renderCurrentPage = () => {
    switch (selectedTab) {
      case 'home':
        return <HomePage setSelectedTab={handleTabChange} />
      
      case 'community':
        return <CommunityPage />
      
      case 'ai-chat':
        return <AIChatPage />
      
      case 'adoption':
        return <AdoptionPage />
      
      case 'local':
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-12 shadow-xl">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <MapPin className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
                  지역 정보 페이지
                </h2>
                <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                  우리 동네 반려동물 관련 정보를 한눈에 확인하세요
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">개발 예정</span>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'petcare':
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-12 shadow-xl">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-sky-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <Stethoscope className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
                  펫케어 가이드 페이지
                </h2>
                <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                  전문가가 제공하는 맞춤형 케어 정보
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">개발 예정</span>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'memorial':
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-12 shadow-xl">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-sky-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <Cloud className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
                  추모공간 페이지
                </h2>
                <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                  소중한 친구와의 추억을 영원히 간직하는 공간
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">개발 예정</span>
                </div>
              </div>
            </div>
          </div>
        )
      
      default:
        return <HomePage setSelectedTab={handleTabChange} />
    }
  }

  return (
    <Layout 
      selectedTab={selectedTab} 
      setSelectedTab={handleTabChange}
    >
      {renderCurrentPage()}
    </Layout>
  )
}
