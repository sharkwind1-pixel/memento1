/**
 * True Focus 텍스트 애니메이션 컴포넌트
 * reactbits.dev 스타일의 감성적 텍스트 효과
 */

'use client'

import { useEffect, useState } from 'react'

interface TrueFocusProps {
  text: string
  className?: string
  delay?: number
  duration?: number
  staggerDelay?: number
  focusColor?: string
  blurColor?: string
}

export function TrueFocus({
  text,
  className = '',
  delay = 0,
  duration = 0.8,
  staggerDelay = 0.03,
  focusColor = 'text-blue-600 dark:text-blue-400',
  blurColor = 'text-gray-300 dark:text-gray-600'
}: TrueFocusProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [isComplete, setIsComplete] = useState(false)
  const characters = text.split('')

  useEffect(() => {
    const startAnimation = setTimeout(() => {
      let currentIndex = 0
      
      const interval = setInterval(() => {
        if (currentIndex < characters.length) {
          setFocusedIndex(currentIndex)
          currentIndex++
        } else {
          clearInterval(interval)
          setIsComplete(true)
        }
      }, staggerDelay * 1000)

      return () => clearInterval(interval)
    }, delay)

    return () => clearTimeout(startAnimation)
  }, [characters.length, delay, staggerDelay])

  // 단어 단위로 묶어서 줄바꿈 방지
  const words = text.split(' ')
  let charIndex = 0

  return (
    <span className={`${className} inline`} style={{ wordBreak: 'keep-all' }}>
      {words.map((word, wordIdx) => {
        const wordChars = word.split('')
        const wordStartIndex = charIndex
        charIndex += word.length + 1 // +1 for space

        return (
          <span key={wordIdx} className="inline-block whitespace-nowrap">
            {wordChars.map((char, idx) => {
              const globalIndex = wordStartIndex + idx
              return (
                <span
                  key={idx}
                  className={`
                    inline transition-all
                    ${isComplete || globalIndex <= focusedIndex
                      ? focusColor
                      : blurColor
                    }
                  `}
                  style={{
                    transitionDuration: `${duration}s`,
                    filter: isComplete || globalIndex <= focusedIndex ? 'blur(0px)' : 'blur(4px)',
                    opacity: isComplete || globalIndex <= focusedIndex ? 1 : 0.3,
                  }}
                >
                  {char}
                </span>
              )
            })}
            {wordIdx < words.length - 1 && <span>&nbsp;</span>}
          </span>
        )
      })}
    </span>
  )
}

// 감성적 프리셋
interface EmotionalTrueFocusProps extends Omit<TrueFocusProps, 'focusColor' | 'blurColor'> {
  variant?: 'gentle' | 'warm' | 'memorial' | 'joyful'
}

export function EmotionalTrueFocus({
  variant = 'gentle',
  ...props
}: EmotionalTrueFocusProps) {
  const variants = {
    gentle: {
      focusColor: 'text-blue-600 dark:text-blue-400',
      blurColor: 'text-blue-200 dark:text-blue-800',
      duration: 0.6,
      staggerDelay: 0.03
    },
    warm: {
      focusColor: 'text-sky-600 dark:text-sky-400',
      blurColor: 'text-sky-200 dark:text-sky-800',
      duration: 0.5,
      staggerDelay: 0.025
    },
    memorial: {
      focusColor: 'text-blue-700 dark:text-blue-300',
      blurColor: 'text-blue-300 dark:text-blue-700',
      duration: 1.0,
      staggerDelay: 0.05
    },
    joyful: {
      focusColor: 'text-sky-500 dark:text-sky-400',
      blurColor: 'text-sky-200 dark:text-sky-700',
      duration: 0.4,
      staggerDelay: 0.02
    }
  }

  const selectedVariant = variants[variant]

  return (
    <TrueFocus
      {...props}
      focusColor={selectedVariant.focusColor}
      blurColor={selectedVariant.blurColor}
      duration={props.duration ?? selectedVariant.duration}
      staggerDelay={props.staggerDelay ?? selectedVariant.staggerDelay}
    />
  )
}

export default TrueFocus
