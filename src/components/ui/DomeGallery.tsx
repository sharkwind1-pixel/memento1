/**
 * Dome Gallery 컴포넌트
 * reactbits.dev 스타일의 3D 돔 형태 이미지 갤러리
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface DomeGalleryItem {
  id: string | number
  image: string
  title?: string
  subtitle?: string
  onClick?: () => void
}

interface DomeGalleryProps {
  items: DomeGalleryItem[]
  radius?: number
  autoRotate?: boolean
  rotateSpeed?: number
  className?: string
  itemSize?: number
  perspective?: number
}

export function DomeGallery({
  items,
  radius = 300,
  autoRotate = true,
  rotateSpeed = 0.3,
  className = '',
  itemSize = 120,
  perspective = 1000
}: DomeGalleryProps) {
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()

  // 자동 회전
  useEffect(() => {
    if (!autoRotate || isDragging) return

    const animate = () => {
      setRotation(prev => prev + rotateSpeed)
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [autoRotate, isDragging, rotateSpeed])

  // 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const deltaX = e.clientX - startX
    setRotation(prev => prev + deltaX * 0.5)
    setStartX(e.clientX)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 터치 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartX(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const deltaX = e.touches[0].clientX - startX
    setRotation(prev => prev + deltaX * 0.5)
    setStartX(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  const itemCount = items.length
  const angleStep = 360 / itemCount

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[400px] cursor-grab active:cursor-grabbing ${className}`}
      style={{ perspective: `${perspective}px` }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 중앙 기준점 */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateY(${rotation}deg)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        {items.map((item, index) => {
          const angle = angleStep * index
          const radian = (angle * Math.PI) / 180
          const x = Math.sin(radian) * radius
          const z = Math.cos(radian) * radius
          const isHovered = hoveredIndex === index
          const scale = isHovered ? 1.15 : 1

          return (
            <div
              key={item.id}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
              style={{
                transform: `translateX(${x}px) translateZ(${z}px) rotateY(${-angle}deg) scale(${scale})`,
                transformStyle: 'preserve-3d',
                zIndex: isHovered ? 100 : Math.round(z + radius)
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={item.onClick}
            >
              <div
                className={`
                  relative overflow-hidden rounded-2xl shadow-lg
                  bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
                  border-2 transition-all duration-300
                  ${isHovered 
                    ? 'border-blue-500 shadow-2xl shadow-blue-500/20' 
                    : 'border-white/50 dark:border-gray-700/50'
                  }
                `}
                style={{ width: itemSize, height: itemSize }}
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title || '갤러리 이미지'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-sky-100 dark:from-blue-900 dark:to-sky-900 flex items-center justify-center">
                    <div className="w-12 h-12 bg-blue-200 dark:bg-blue-700 rounded-full" />
                  </div>
                )}
                
                {/* 호버시 정보 오버레이 */}
                {isHovered && (item.title || item.subtitle) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3">
                    {item.title && (
                      <p className="text-white text-sm font-medium truncate">
                        {item.title}
                      </p>
                    )}
                    {item.subtitle && (
                      <p className="text-white/80 text-xs truncate">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 안내 텍스트 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          드래그하여 회전
        </p>
      </div>
    </div>
  )
}

export default DomeGallery
