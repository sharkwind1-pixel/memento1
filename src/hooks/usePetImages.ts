/**
 * 반려동물 이미지 API 관리 커스텀 훅
 */

import { useState, useEffect } from 'react'
import { ImageState } from '@/types'
import { memorialCards, adoptionPosts } from '@/data/posts'

export function usePetImages() {
  const [petImages, setPetImages] = useState<ImageState>({})
  const [adoptionImages, setAdoptionImages] = useState<ImageState>({})

  const fetchPetImage = async (breed: string): Promise<string | null> => {
    try {
      if (breed.includes('골든리트리버') || breed.includes('말티즈') || 
          breed.includes('푸들') || breed.includes('요크셔테리어') || 
          breed.includes('믹스견') || breed.includes('치와와') || 
          breed.includes('진돗개')) {
        const response = await fetch('https://dog.ceo/api/breeds/image/random')
        const data = await response.json()
        return data.message || null
      }
      
      if (breed.includes('페르시안') || breed.includes('러시안블루') || 
          breed.includes('스코티시폴드')) {
        const response = await fetch('https://api.thecatapi.com/v1/images/search')
        const data = await response.json()
        return data[0]?.url || null
      }

      if (breed.includes('강아지') || breed.includes('견')) {
        const response = await fetch('https://dog.ceo/api/breeds/image/random')
        const data = await response.json()
        return data.message || null
      }

      if (breed.includes('고양이') || breed.includes('냥이')) {
        const response = await fetch('https://api.thecatapi.com/v1/images/search')
        const data = await response.json()
        return data[0]?.url || null
      }

      return null
    } catch (error) {
      console.error('이미지 로딩 실패:', error)
      return null
    }
  }

  useEffect(() => {
    const loadImages = async () => {
      try {
        const memorialPromises = memorialCards.map(async (card) => {
          const imageUrl = await fetchPetImage(card.pet)
          return { key: card.name, value: imageUrl }
        })
        
        const adoptionPromises = adoptionPosts.map(async (pet, index) => {
          const imageUrl = await fetchPetImage(pet.title)
          return { key: index.toString(), value: imageUrl }
        })
        
        const memorialResults = await Promise.all(memorialPromises)
        const adoptionResults = await Promise.all(adoptionPromises)
        
        const memorialImageMap: ImageState = {}
        const adoptionImageMap: ImageState = {}
        
        memorialResults.forEach(({ key, value }) => {
          memorialImageMap[key] = value
        })
        
        adoptionResults.forEach(({ key, value }) => {
          adoptionImageMap[key] = value
        })
        
        setPetImages(memorialImageMap)
        setAdoptionImages(adoptionImageMap)
        
      } catch (error) {
        console.error('이미지 로딩 중 오류:', error)
      }
    }

    loadImages()
  }, [])

  return {
    petImages,
    adoptionImages,
    fetchPetImage
  }
}
