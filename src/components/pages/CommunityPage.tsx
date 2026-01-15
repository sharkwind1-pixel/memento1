/**
 * 메멘토애니 커뮤니티 페이지
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, Bell, Eye, Plus, Users, Flame, Zap, Crown } from "lucide-react"
import { communityBestPosts, allCommunityPosts, communityCategories, noticeList } from '@/data/posts'

export default function CommunityPage() {
  const [selectedCategory, setSelectedCategory] = useState('전체')

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-sky-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-blue-200/30 dark:bg-blue-800/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-sky-200/30 dark:bg-sky-800/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 space-y-8">
        {/* 헤더 */}
        <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-lg border border-white/40 dark:border-gray-700/40 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
                    우리들의 이야기
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">반려동물과 함께하는 일상을 나눠주세요</p>
                </div>
              </div>
            </div>
            
            <Button className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white border-0 rounded-xl px-6 py-3 shadow-lg hover:scale-105 transition-all">
              <Plus className="w-5 h-5 mr-2" />
              이야기 작성하기
            </Button>
          </div>
          
          {/* 카테고리 */}
          <div className="mt-6">
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              {communityCategories.map((category) => (
                <Button 
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={`whitespace-nowrap rounded-xl transition-all ${selectedCategory === category ? 'bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-lg' : 'bg-white/50 dark:bg-gray-700/50 border-blue-200 dark:border-gray-600 text-blue-700 dark:text-blue-300'}`}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm rounded-xl p-3 border border-white/50 dark:border-gray-600/50">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">1,247</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">오늘 새 글</div>
            </div>
            <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm rounded-xl p-3 border border-white/50 dark:border-gray-600/50">
              <div className="text-lg font-bold text-sky-600 dark:text-sky-400">5,832</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">활성 사용자</div>
            </div>
            <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm rounded-xl p-3 border border-white/50 dark:border-gray-600/50">
              <div className="text-lg font-bold text-blue-500 dark:text-blue-300">98.2%</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">만족도</div>
            </div>
          </div>
        </div>

        {/* 인기글과 공지 */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* 인기글 */}
          <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border-white/50 dark:border-gray-700/50 rounded-3xl shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/30 dark:to-sky-900/30 border-b border-blue-100 dark:border-blue-800">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-sky-500 rounded-lg flex items-center justify-center">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                실시간 인기 이야기
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {communityBestPosts.slice(0, 5).map((post, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 hover:bg-white/50 dark:hover:bg-gray-700/50 cursor-pointer transition-all group">
                    <Badge variant="outline" className={`w-6 h-6 rounded-full flex items-center justify-center p-0 border-2
                      ${i === 0 ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-400 text-blue-700 dark:text-blue-300' : ''}
                      ${i === 1 ? 'bg-gray-100 dark:bg-gray-700 border-gray-400 text-gray-700 dark:text-gray-300' : ''}
                      ${i === 2 ? 'bg-sky-100 dark:bg-sky-900/50 border-sky-400 text-sky-700 dark:text-sky-300' : ''}
                      ${i > 2 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 text-blue-600 dark:text-blue-400' : ''}
                    `}>
                      {i === 0 && <Crown className="w-3 h-3" />}
                      {i !== 0 && <span className="text-xs font-bold">{i + 1}</span>}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">{post.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{post.author}님</p>
                    </div>
                    <Heart className="w-4 h-4 text-blue-400" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 공지 */}
          <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border-white/50 dark:border-gray-700/50 rounded-3xl shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/30 dark:to-blue-900/30 border-b border-sky-100 dark:border-sky-800">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-sky-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                중요한 안내사항
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {noticeList.map((notice, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 hover:bg-white/50 dark:hover:bg-gray-700/50 cursor-pointer transition-all group">
                    <Badge className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 text-xs px-2 py-1 rounded-lg">공지</Badge>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">{notice}</p>
                    <span className="text-xs text-gray-400">1일전</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 게시글 목록 */}
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border-white/50 dark:border-gray-700/50 rounded-3xl shadow-xl">
          <CardHeader className="border-b border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <CardTitle className="text-xl text-gray-800 dark:text-gray-100">모든 이야기들</CardTitle>
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300">{allCommunityPosts.length}개의 글</Badge>
              </div>
              <select className="text-sm bg-white/70 dark:bg-gray-700/70 border border-blue-200 dark:border-gray-600 rounded-xl px-3 py-2 text-blue-700 dark:text-blue-300">
                <option>최신순</option>
                <option>인기순</option>
                <option>댓글순</option>
              </select>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="space-y-1">
              {allCommunityPosts.map((post, i) => (
                <div key={i} className="p-6 hover:bg-white/50 dark:hover:bg-gray-700/50 cursor-pointer transition-all group border-b border-gray-50 dark:border-gray-700/50 last:border-b-0">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-lg">{post.category}</Badge>
                        <Badge variant="secondary" className={`rounded-lg
                          ${post.badge === '인기' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : ''}
                          ${post.badge === '꿀팁' ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300' : ''}
                          ${post.badge === '응급' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' : ''}
                          ${post.badge === '후기' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : ''}
                        `}>
                          {post.badge === '인기' && <Crown className="w-3 h-3 mr-1 inline" />}
                          {post.badge === '꿀팁' && <Zap className="w-3 h-3 mr-1 inline" />}
                          {post.badge === '응급' && <Bell className="w-3 h-3 mr-1 inline" />}
                          {post.badge}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-400">{post.time}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">{post.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{post.preview}</p>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{post.author}님</span>
                      <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-2 hover:text-gray-700"><Eye className="w-4 h-4" />{post.views}</span>
                        <span className="flex items-center gap-2 hover:text-blue-500"><Heart className="w-4 h-4" />{post.likes}</span>
                        <span className="flex items-center gap-2 hover:text-blue-500"><MessageCircle className="w-4 h-4" />{post.comments}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          
          <CardFooter className="justify-center border-t border-gray-100 dark:border-gray-700">
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((page) => (
                <Button key={page} variant={page === 1 ? "default" : "outline"} size="sm" className={`rounded-xl min-w-[40px] ${page === 1 ? 'bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-lg' : 'bg-white/70 dark:bg-gray-700/70 border-blue-200 dark:border-gray-600 text-blue-700 dark:text-blue-300'}`}>
                  {page}
                </Button>
              ))}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
