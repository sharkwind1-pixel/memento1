/**
 * OptimizedImage 컴포넌트
 * Next.js Image를 래핑하여 에러 처리 및 폴백 지원
 */

"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    fill?: boolean;
    className?: string;
    style?: React.CSSProperties;
    priority?: boolean;
    quality?: number;
    sizes?: string;
    objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
    objectPosition?: string;
    fallbackSrc?: string;
    onLoad?: () => void;
    onError?: () => void;
}

// 기본 폴백 이미지 (SVG 데이터 URI)
const DEFAULT_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23f3f4f6' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='sans-serif' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";

export function OptimizedImage({
    src,
    alt,
    width,
    height,
    fill = false,
    className,
    style,
    priority = false,
    quality = 75,
    sizes,
    objectFit = "cover",
    objectPosition = "center",
    fallbackSrc = DEFAULT_FALLBACK,
    onLoad,
    onError,
}: OptimizedImageProps) {
    const [imgSrc, setImgSrc] = useState(src);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleLoad = () => {
        setIsLoading(false);
        onLoad?.();
    };

    const handleError = () => {
        setHasError(true);
        setIsLoading(false);
        if (imgSrc !== fallbackSrc) {
            setImgSrc(fallbackSrc);
        }
        onError?.();
    };

    // 빈 src 처리
    if (!src) {
        return (
            <div
                className={cn(
                    "bg-gray-200 dark:bg-gray-700 flex items-center justify-center",
                    className
                )}
                style={style}
                role="img"
                aria-label="이미지 없음"
            >
                <span className="text-gray-400 text-sm">이미지 없음</span>
            </div>
        );
    }

    // fill 모드
    if (fill) {
        return (
            <div className={cn("relative overflow-hidden", className)} style={style}>
                {isLoading && (
                    <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                )}
                <Image
                    src={imgSrc}
                    alt={alt}
                    fill
                    priority={priority}
                    quality={quality}
                    sizes={sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
                    className={cn(
                        "transition-opacity duration-300",
                        isLoading ? "opacity-0" : "opacity-100"
                    )}
                    style={{
                        objectFit,
                        objectPosition,
                    }}
                    onLoad={handleLoad}
                    onError={handleError}
                />
            </div>
        );
    }

    // 고정 크기 모드
    return (
        <div className={cn("relative overflow-hidden", className)} style={{ width, height, ...style }}>
            {isLoading && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-inherit" />
            )}
            <Image
                src={imgSrc}
                alt={alt}
                width={width || 300}
                height={height || 300}
                priority={priority}
                quality={quality}
                className={cn(
                    "transition-opacity duration-300",
                    isLoading ? "opacity-0" : "opacity-100"
                )}
                style={{
                    objectFit,
                    objectPosition,
                    width: "100%",
                    height: "100%",
                }}
                onLoad={handleLoad}
                onError={handleError}
            />
        </div>
    );
}

// 펫 프로필 이미지 전용
export function PetProfileImage({
    src,
    name,
    size = 80,
    className,
}: {
    src?: string;
    name: string;
    size?: number;
    className?: string;
}) {
    const [hasError, setHasError] = useState(false);

    if (!src || hasError) {
        // 폴백: 이니셜 표시
        return (
            <div
                className={cn(
                    "rounded-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center",
                    className
                )}
                style={{ width: size, height: size }}
            >
                <span
                    className="text-[#05B2DC] font-bold"
                    style={{ fontSize: size * 0.4 }}
                >
                    {name.charAt(0).toUpperCase()}
                </span>
            </div>
        );
    }

    return (
        <div
            className={cn("relative rounded-full overflow-hidden", className)}
            style={{ width: size, height: size }}
        >
            <Image
                src={src}
                alt={name}
                fill
                sizes={`${size}px`}
                className="object-cover"
                onError={() => setHasError(true)}
            />
        </div>
    );
}

// 갤러리 이미지 전용
export function GalleryImage({
    src,
    alt,
    aspectRatio = "square",
    className,
    onClick,
}: {
    src: string;
    alt: string;
    aspectRatio?: "square" | "video" | "portrait";
    className?: string;
    onClick?: () => void;
}) {
    const [isLoading, setIsLoading] = useState(true);

    const aspectClasses = {
        square: "aspect-square",
        video: "aspect-video",
        portrait: "aspect-[3/4]",
    };

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-lg cursor-pointer group",
                aspectClasses[aspectRatio],
                className
            )}
            onClick={onClick}
        >
            {isLoading && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
            )}
            <Image
                src={src}
                alt={alt}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={cn(
                    "object-cover transition-all duration-300 group-hover:scale-105",
                    isLoading ? "opacity-0" : "opacity-100"
                )}
                onLoad={() => setIsLoading(false)}
            />
        </div>
    );
}
