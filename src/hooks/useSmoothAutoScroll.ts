/**
 * 부드러운 자동 스크롤 기능 커스텀 훅
 */

import { useRef, useEffect, useCallback } from 'react'

export function useSmoothAutoScroll() {
  const communityScrollRef = useRef<HTMLDivElement>(null)
  const adoptionScrollRef = useRef<HTMLDivElement>(null)
  const petcareScrollRef = useRef<HTMLDivElement>(null)
  const memorialScrollRef = useRef<HTMLDivElement>(null)

  const smoothScroll = useCallback((
    ref: React.RefObject<HTMLDivElement>,
    speed: number = 30
  ) => {
    if (!ref.current) return null

    const container = ref.current
    let scrollPosition = 0
    let animationId: number

    const animate = () => {
      if (!ref.current) return
      
      scrollPosition += 1
      ref.current.scrollLeft = scrollPosition

      const maxScroll = ref.current.scrollWidth - ref.current.clientWidth

      if (scrollPosition >= maxScroll) {
        setTimeout(() => {
          if (ref.current) {
            ref.current.scrollTo({ left: 0, behavior: 'smooth' })
            scrollPosition = 0
          }
        }, 2000)
      }

      animationId = requestAnimationFrame(animate)
    }

    const interval = setInterval(() => {
      animationId = requestAnimationFrame(animate)
    }, speed)

    return () => {
      clearInterval(interval)
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [])

  const startAutoScroll = useCallback((isActive: boolean) => {
    if (!isActive) return

    const cleanups: (() => void)[] = []

    setTimeout(() => {
      const cleanup = smoothScroll(communityScrollRef, 30)
      if (cleanup) cleanups.push(cleanup)
    }, 1000)

    setTimeout(() => {
      const cleanup = smoothScroll(adoptionScrollRef, 40)
      if (cleanup) cleanups.push(cleanup)
    }, 2000)

    setTimeout(() => {
      const cleanup = smoothScroll(petcareScrollRef, 50)
      if (cleanup) cleanups.push(cleanup)
    }, 3000)

    setTimeout(() => {
      const cleanup = smoothScroll(memorialScrollRef, 60)
      if (cleanup) cleanups.push(cleanup)
    }, 4000)

    return () => {
      cleanups.forEach(cleanup => cleanup())
    }
  }, [smoothScroll])

  return {
    communityScrollRef,
    adoptionScrollRef,
    petcareScrollRef,
    memorialScrollRef,
    startAutoScroll
  }
}

export { useSmoothAutoScroll as useAutoScroll }
