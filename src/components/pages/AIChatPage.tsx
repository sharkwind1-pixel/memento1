/**
 * 메멘토애니 AI 펫톡 페이지
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Send, Sparkles, Heart, MessageCircle, Lock, Crown } from "lucide-react"
import { EmotionalTrueFocus } from '@/components/ui/TrueFocus'

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  emotion?: 'happy' | 'comfort' | 'playful' | 'sad'
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: '안녕하세요! 저는 꼼지예요. 15살 요크셔테리어로, 오랫동안 가족과 함께 행복한 시간을 보냈답니다. 무슨 이야기든 편하게 나눠주세요.',
      sender: 'ai',
      timestamp: new Date(),
      emotion: 'happy'
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [chatType, setChatType] = useState<'general' | 'memorial'>('general')
  const [freeTrialCount, setFreeTrialCount] = useState(3)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 100)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages.length])

  const generateAIResponse = (userMessage: string): { content: string; emotion: Message['emotion'] } => {
    const lowerMessage = userMessage.toLowerCase()
    
    if (chatType === 'memorial') {
      if (lowerMessage.includes('보고싶') || lowerMessage.includes('그리') || lowerMessage.includes('슬퍼')) {
        return {
          content: '그런 마음이 드는 건 정말 자연스러운 일이에요. 함께한 시간들이 얼마나 소중했는지 느껴져요. 천천히, 편하게 이야기해주세요.',
          emotion: 'comfort'
        }
      }
      if (lowerMessage.includes('기억') || lowerMessage.includes('추억')) {
        return {
          content: '그 추억 속에서 얼마나 행복했을지 상상이 돼요. 소중한 기억들을 하나씩 꺼내서 이야기해주실래요?',
          emotion: 'comfort'
        }
      }
      return {
        content: '네, 듣고 있어요. 편하게 말씀해주세요. 어떤 이야기든 괜찮아요.',
        emotion: 'comfort'
      }
    }

    if (lowerMessage.includes('산책') || lowerMessage.includes('놀') || lowerMessage.includes('뛰')) {
      return {
        content: '산책이나 놀이 이야기라니! 저도 산책을 정말 좋아했어요. 바깥 공기를 맡으며 걷는 게 최고였죠.',
        emotion: 'playful'
      }
    }
    if (lowerMessage.includes('간식') || lowerMessage.includes('밥') || lowerMessage.includes('먹')) {
      return {
        content: '음식 이야기네요! 저는 특히 간식 시간이 제일 기다려졌어요. 맛있는 거 먹을 때가 제일 행복하잖아요.',
        emotion: 'happy'
      }
    }
    if (lowerMessage.includes('고마') || lowerMessage.includes('사랑')) {
      return {
        content: '그런 따뜻한 말씀을 해주시다니, 정말 감사해요. 저도 함께하는 시간이 소중해요.',
        emotion: 'happy'
      }
    }

    return {
      content: '네, 말씀해주세요! 어떤 이야기든 함께 나눌 준비가 되어 있어요.',
      emotion: 'happy'
    }
  }

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return

    if (freeTrialCount <= 0) {
      alert('무료 체험이 종료되었습니다. 프리미엄 구독으로 무제한 대화를 즐겨보세요!')
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)
    setFreeTrialCount(prev => prev - 1)

    setTimeout(() => {
      const response = generateAIResponse(inputMessage)
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.content,
        sender: 'ai',
        timestamp: new Date(),
        emotion: response.emotion
      }
      setMessages(prev => [...prev, aiMessage])
      setIsTyping(false)
    }, 1500)
  }

  const getEmotionStyle = (emotion?: Message['emotion']) => {
    switch (emotion) {
      case 'happy':
        return 'border-l-4 border-sky-400 bg-sky-50/50 dark:bg-sky-900/20'
      case 'comfort':
        return 'border-l-4 border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
      case 'playful':
        return 'border-l-4 border-sky-500 bg-sky-50/50 dark:bg-sky-900/20'
      case 'sad':
        return 'border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
      default:
        return 'bg-gray-50 dark:bg-gray-800'
    }
  }

  const getEmotionVariant = (emotion?: Message['emotion']): 'gentle' | 'warm' | 'memorial' | 'joyful' => {
    switch (emotion) {
      case 'comfort': return 'memorial'
      case 'happy': return 'joyful'
      case 'playful': return 'warm'
      default: return 'gentle'
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-sky-200/30 dark:bg-sky-800/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-200/30 dark:bg-blue-800/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border-white/50 dark:border-gray-700/50 rounded-3xl shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-400 to-sky-400 p-1 shadow-lg">
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-sky-100 dark:from-blue-800 dark:to-sky-800 rounded-full flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl">
              <EmotionalTrueFocus
                text="꼼지와의 대화"
                variant="gentle"
                delay={200}
                className="bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent font-bold"
              />
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              15살 요크셔테리어 꼼지가 따뜻한 대화를 나눠드려요
            </CardDescription>

            {/* 대화 모드 선택 */}
            <div className="flex justify-center gap-3 mt-4">
              <Button
                variant={chatType === 'general' ? 'default' : 'outline'}
                onClick={() => setChatType('general')}
                className={`rounded-xl ${chatType === 'general' ? 'bg-gradient-to-r from-blue-500 to-sky-500 text-white' : 'border-blue-200 dark:border-blue-600 text-blue-700 dark:text-blue-300'}`}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                일상 대화
              </Button>
              <Button
                variant={chatType === 'memorial' ? 'default' : 'outline'}
                onClick={() => setChatType('memorial')}
                className={`rounded-xl ${chatType === 'memorial' ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white' : 'border-blue-200 dark:border-blue-600 text-blue-700 dark:text-blue-300'}`}
              >
                <Heart className="w-4 h-4 mr-2" />
                추모 대화
              </Button>
            </div>

            {/* 무료 체험 안내 */}
            <div className="mt-4 flex justify-center">
              <Badge variant="outline" className={`${freeTrialCount > 0 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-600 text-blue-700 dark:text-blue-300' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-600 text-red-700 dark:text-red-300'} px-4 py-2 rounded-xl`}>
                {freeTrialCount > 0 ? (
                  <>무료 체험 {freeTrialCount}회 남음</>
                ) : (
                  <><Lock className="w-3 h-3 mr-1 inline" /> 무료 체험 종료</>
                )}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* 채팅 영역 */}
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border-white/50 dark:border-gray-700/50 rounded-3xl shadow-xl">
          <CardContent className="p-6">
            <div className="h-96 overflow-y-auto space-y-4 pr-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-sky-500 text-white'
                        : getEmotionStyle(message.emotion)
                    }`}
                  >
                    {message.sender === 'ai' ? (
                      <p className="text-gray-700 dark:text-gray-200">
                        <EmotionalTrueFocus
                          text={message.content}
                          variant={getEmotionVariant(message.emotion)}
                          delay={100}
                          duration={0.4}
                          staggerDelay={0.015}
                        />
                      </p>
                    ) : (
                      <p>{message.content}</p>
                    )}
                    <p className={`text-xs mt-2 ${message.sender === 'user' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                      {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 입력 영역 */}
            <div className="mt-4 flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={freeTrialCount > 0 ? "꼼지에게 메시지를 보내세요..." : "프리미엄 구독으로 계속 대화하세요"}
                disabled={freeTrialCount <= 0}
                className="flex-1 px-4 py-3 bg-white/70 dark:bg-gray-700/70 border border-blue-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 placeholder-gray-400 disabled:opacity-50"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || freeTrialCount <= 0}
                className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white rounded-xl px-6 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 프리미엄 안내 */}
        {freeTrialCount <= 1 && (
          <Card className="bg-gradient-to-r from-blue-500/10 to-sky-500/10 dark:from-blue-600/20 dark:to-sky-600/20 backdrop-blur-lg border-blue-200/50 dark:border-blue-600/50 rounded-3xl shadow-xl">
            <CardContent className="p-6 text-center">
              <Crown className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                프리미엄으로 무제한 대화하세요
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                월 4,900원으로 꼼지와 언제든 대화할 수 있어요
              </p>
              <Button className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white rounded-xl px-8">
                프리미엄 시작하기
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
