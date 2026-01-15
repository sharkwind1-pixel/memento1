/**
 * 메멘토애니 입양정보 페이지 - DomeGallery 적용
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, MapPin, Search, Filter, Users, Dog, Cat, Rabbit, ArrowRight, Info, CheckCircle } from "lucide-react"
import { EmotionalTrueFocus } from '@/components/ui/TrueFocus'
import { DomeGallery } from '@/components/ui/DomeGallery'
import { usePetImages } from '@/hooks/usePetImages'

interface AdoptionPet {
  id: number
  name: string
  species: 'dog' | 'cat' | 'rabbit' | 'other'
  breed: string
  age: string
  gender: string
  location: string
  badge: string
  personality: string[]
  isUrgent: boolean
  description: string
}

const adoptionPets: AdoptionPet[] = [
  {
    id: 1,
    name: "구름이",
    species: 'dog',
    breed: "믹스견",
    age: "6개월",
    gender: "남아",
    location: "강남구",
    badge: "긴급",
    personality: ["활발함", "친화적"],
    isUrgent: true,
    description: "활발하고 사람을 좋아하는 구름이입니다."
  },
  {
    id: 2,
    name: "달이",
    species: 'cat',
    breed: "페르시안",
    age: "2세",
    gender: "여아",
    location: "마포구",
    badge: "신규",
    personality: ["온순함", "조용함"],
    isUrgent: false,
    description: "조용하고 온순한 성격의 달이입니다."
  },
  {
    id: 3,
    name: "별이",
    species: 'dog',
    breed: "골든리트리버",
    age: "1세",
    gender: "남아",
    location: "서초구",
    badge: "인기",
    personality: ["영리함", "충성스러움"],
    isUrgent: false,
    description: "영리하고 충성스러운 별이입니다."
  },
  {
    id: 4,
    name: "솜이",
    species: 'rabbit',
    breed: "네덜란드 드워프",
    age: "8개월",
    gender: "여아",
    location: "용산구",
    badge: "신규",
    personality: ["호기심", "귀여움"],
    isUrgent: false,
    description: "호기심 많고 귀여운 솜이입니다."
  },
  {
    id: 5,
    name: "호두",
    species: 'cat',
    breed: "러시안블루",
    age: "3세",
    gender: "남아",
    location: "종로구",
    badge: "추천",
    personality: ["독립적", "우아함"],
    isUrgent: false,
    description: "독립적이고 우아한 호두입니다."
  },
  {
    id: 6,
    name: "하늘이",
    species: 'dog',
    breed: "말티즈",
    age: "4개월",
    gender: "여아",
    location: "송파구",
    badge: "긴급",
    personality: ["애교쟁이", "활발함"],
    isUrgent: true,
    description: "애교 많고 활발한 하늘이입니다."
  }
]

export default function AdoptionPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all')
  const [selectedSize, setSelectedSize] = useState<string>('all')
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [favorites, setFavorites] = useState<number[]>([])
  const [showDomeGallery, setShowDomeGallery] = useState(false)
  const { petImages, adoptionImages } = usePetImages()

  const toggleFavorite = (id: number) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    )
  }

  const filteredPets = adoptionPets.filter(pet => {
    const matchesSearch = pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pet.breed.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSpecies = selectedSpecies === 'all' || pet.species === selectedSpecies
    const matchesLocation = selectedLocation === 'all' || pet.location === selectedLocation
    return matchesSearch && matchesSpecies && matchesLocation
  })

  const getSpeciesIcon = (species: string) => {
    switch (species) {
      case 'dog': return <Dog className="w-4 h-4" />
      case 'cat': return <Cat className="w-4 h-4" />
      case 'rabbit': return <Rabbit className="w-4 h-4" />
      default: return <Heart className="w-4 h-4" />
    }
  }

  // DomeGallery 아이템
  const domeGalleryItems = filteredPets.map((pet, index) => ({
    id: pet.id,
    image: adoptionImages[index] || '',
    title: pet.name,
    subtitle: `${pet.breed} · ${pet.age}`,
    onClick: () => console.log(`${pet.name} 클릭`)
  }))

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-200/30 dark:bg-sky-800/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-200/30 dark:bg-blue-800/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 space-y-8">
        {/* 헤더 */}
        <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-lg border border-white/40 dark:border-gray-700/40 rounded-3xl p-8 shadow-xl">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-sky-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold">
              <EmotionalTrueFocus
                text="새로운 가족을 기다리는 친구들"
                variant="gentle"
                delay={200}
                className="bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent"
              />
            </h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              사랑이 필요한 친구들이 여러분을 기다리고 있어요. 함께할 시간을 기록해나가세요.
            </p>
          </div>

          {/* 검색 및 필터 */}
          <div className="mt-8 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="이름이나 품종으로 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/70 dark:bg-gray-700/70 border border-blue-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={selectedSpecies}
                  onChange={(e) => setSelectedSpecies(e.target.value)}
                  className="px-4 py-3 bg-white/70 dark:bg-gray-700/70 border border-blue-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200"
                >
                  <option value="all">모든 종류</option>
                  <option value="dog">강아지</option>
                  <option value="cat">고양이</option>
                  <option value="rabbit">토끼</option>
                </select>
                
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="px-4 py-3 bg-white/70 dark:bg-gray-700/70 border border-blue-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200"
                >
                  <option value="all">모든 지역</option>
                  <option value="강남구">강남구</option>
                  <option value="마포구">마포구</option>
                  <option value="서초구">서초구</option>
                  <option value="용산구">용산구</option>
                  <option value="종로구">종로구</option>
                  <option value="송파구">송파구</option>
                </select>

                <Button
                  variant="outline"
                  onClick={() => setShowDomeGallery(!showDomeGallery)}
                  className="rounded-xl border-blue-200 dark:border-blue-600 text-blue-700 dark:text-blue-300"
                >
                  {showDomeGallery ? '카드 보기' : '3D 갤러리'}
                </Button>
              </div>
            </div>

            {/* 긴급 입양 안내 */}
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <Info className="w-4 h-4" />
              긴급 입양이 필요한 친구들이 있어요. 관심을 가져주세요.
            </div>
          </div>
        </div>

        {/* DomeGallery 또는 카드 그리드 */}
        {showDomeGallery ? (
          <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-lg rounded-3xl p-4 border border-white/40 dark:border-gray-700/40">
            <DomeGallery
              items={domeGalleryItems}
              radius={280}
              itemSize={120}
              autoRotate={true}
              rotateSpeed={0.2}
            />
          </div>
        ) : (
          <>
            {/* 결과 수 */}
            <div className="flex items-center justify-between">
              <p className="text-gray-600 dark:text-gray-300">
                총 <span className="font-bold text-blue-600 dark:text-blue-400">{filteredPets.length}</span>마리의 친구들
              </p>
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300">
                {favorites.length}개 찜함
              </Badge>
            </div>

            {/* 펫 카드 그리드 */}
            {filteredPets.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPets.map((pet, index) => (
                  <Card
                    key={pet.id}
                    className={`bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 rounded-3xl shadow-xl overflow-hidden hover:scale-105 transition-all duration-300 ${pet.isUrgent ? 'ring-2 ring-red-400 dark:ring-red-500' : ''}`}
                  >
                    <CardHeader className="p-0">
                      <div className="relative w-full h-56 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
                        {adoptionImages[index] ? (
                          <Image
                            src={adoptionImages[index]}
                            alt={`${pet.name} 사진`}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900 dark:to-sky-900">
                            {getSpeciesIcon(pet.species)}
                          </div>
                        )}
                        
                        {/* 뱃지 */}
                        <div className="absolute top-3 left-3 flex gap-2">
                          {pet.isUrgent && (
                            <Badge className="bg-red-500 text-white">긴급</Badge>
                          )}
                          <Badge className="bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200">
                            {pet.badge}
                          </Badge>
                        </div>

                        {/* 찜 버튼 */}
                        <button
                          onClick={() => toggleFavorite(pet.id)}
                          className="absolute top-3 right-3 w-10 h-10 bg-white/80 dark:bg-gray-800/80 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                        >
                          <Heart
                            className={`w-5 h-5 ${favorites.includes(pet.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                          />
                        </button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{pet.name}</h3>
                          <p className="text-gray-600 dark:text-gray-300 text-sm">{pet.breed} · {pet.age} · {pet.gender}</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                          {getSpeciesIcon(pet.species)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <MapPin className="w-4 h-4" />
                        {pet.location}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {pet.personality.map((trait, i) => (
                          <Badge key={i} variant="outline" className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-lg text-xs">
                            {trait}
                          </Badge>
                        ))}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300">{pet.description}</p>
                    </CardContent>

                    <CardFooter className="px-6 pb-6">
                      <Button className="w-full bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white rounded-xl">
                        자세히 알아보기
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">검색 결과가 없습니다</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">다른 조건으로 검색해보세요</p>
              </div>
            )}
          </>
        )}

        {/* 입양 안내 */}
        <Card className="bg-gradient-to-r from-blue-50/50 to-sky-50/50 dark:from-blue-900/20 dark:to-sky-900/20 backdrop-blur-lg border-blue-200/50 dark:border-blue-700/50 rounded-3xl shadow-xl">
          <CardContent className="p-8">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-sky-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  입양 전 꼭 확인해주세요
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-200">평생의 약속</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">입양은 평생을 함께하는 약속입니다</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-200">준비된 환경</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">충분한 공간과 시간이 필요해요</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-200">가족 동의</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">모든 가족의 동의가 필요합니다</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
