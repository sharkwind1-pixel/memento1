/**
 * 레이아웃 컴포넌트
 */

import { ReactNode } from 'react'
import { TabType } from '@/types'
import Header from './Header'
import Footer from './Footer'

interface LayoutProps {
  children: ReactNode
  selectedTab: TabType
  setSelectedTab: (tab: TabType) => void
}

export default function Layout({ children, selectedTab, setSelectedTab }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50/30 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <Header selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
      
      <Footer />
      
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
      `}</style>
    </div>
  )
}
