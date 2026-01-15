/**
 * 메멘토애니 헤더 - 파란하늘 테마 + 다크모드
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TabType } from "@/types"
import { User, LogIn, UserPlus, PawPrint, Sun, Moon } from "lucide-react"

interface HeaderProps {
  selectedTab: TabType
  setSelectedTab: (tab: TabType) => void
}

export default function Header({ selectedTab, setSelectedTab }: HeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode')
    if (savedMode) {
      setIsDarkMode(JSON.parse(savedMode))
      if (JSON.parse(savedMode)) {
        document.documentElement.classList.add('dark')
      }
    }
  }, [])

  const toggleDarkMode = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    localStorage.setItem('darkMode', JSON.stringify(newMode))
    
    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-blue-100/50 dark:border-gray-700/50 sticky top-0 z-50 shadow-lg transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* 로고 */}
          <button
            onClick={() => setSelectedTab("home")}
            className="flex items-center space-x-3 group transition-all duration-300 hover:scale-105"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg">
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
                메멘토애니
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                기록해도 괜찮은 장소
              </p>
            </div>
          </button>

          {/* 네비게이션 */}
          <nav className="hidden lg:flex items-center space-x-2">
            <NavButton active={selectedTab === "home"} onClick={() => setSelectedTab("home")} label="홈" />
            <NavButton active={selectedTab === "community"} onClick={() => setSelectedTab("community")} label="커뮤니티" />
            <NavButton active={selectedTab === "ai-chat"} onClick={() => setSelectedTab("ai-chat")} label="AI 펫톡" isSpecial />
            <NavButton active={selectedTab === "adoption"} onClick={() => setSelectedTab("adoption")} label="입양정보" />
            <NavButton active={selectedTab === "local"} onClick={() => setSelectedTab("local")} label="지역정보" />
            <NavButton active={selectedTab === "petcare"} onClick={() => setSelectedTab("petcare")} label="펫케어" />
            <NavButton active={selectedTab === "memorial"} onClick={() => setSelectedTab("memorial")} label="추모공간" isMemorial />
          </nav>

          {/* 유저 메뉴 */}
          <div className="flex items-center space-x-3">
            <Button
              onClick={toggleDarkMode}
              variant="ghost"
              size="sm"
              className="bg-blue-50/50 dark:bg-gray-700/50 hover:bg-blue-100 dark:hover:bg-gray-600 rounded-xl p-2"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-yellow-500" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" />
              )}
            </Button>

            <Button 
              variant="ghost" 
              size="sm"
              className="bg-white/50 dark:bg-gray-700/50 border border-blue-200 dark:border-gray-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-600 rounded-xl px-4 py-2"
            >
              <User className="w-4 h-4 mr-2" />
              내 펫
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl px-4 py-2"
            >
              <LogIn className="w-4 h-4 mr-2" />
              로그인
            </Button>
            <Button 
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white border-0 rounded-xl px-4 py-2 shadow-lg hover:scale-105 transition-all"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              회원가입
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

interface NavButtonProps {
  active: boolean
  onClick: () => void
  label: string
  isSpecial?: boolean
  isMemorial?: boolean
}

function NavButton({ active, onClick, label, isSpecial, isMemorial }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-xl font-medium transition-all duration-200 relative
        ${active 
          ? 'bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-lg scale-105' 
          : 'text-gray-600 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50/50 dark:hover:bg-gray-700/50'
        }
      `}
    >
      <span>{label}</span>
      {isSpecial && (
        <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1 py-0 min-w-[16px] h-4 rounded-full">
          N
        </Badge>
      )}
    </button>
  )
}
