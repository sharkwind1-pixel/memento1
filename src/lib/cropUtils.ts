/**
 * 이미지 크롭 관련 유틸리티 함수
 *
 * ImageCropper에서 저장한 cropPosition 값을 사용하여
 * 이미지 표시 시 올바른 스타일을 계산합니다.
 */

import type { CropPosition } from "@/types";

/**
 * cropPosition 값으로 이미지 스타일 계산
 *
 * @param cropPosition - { x: 50, y: 50, scale: 1 } 형식의 크롭 위치
 * @returns CSS 스타일 객체 (objectFit, objectPosition, transform)
 *
 * @example
 * ```tsx
 * <img style={getCroppedImageStyle(photo.cropPosition)} />
 * ```
 */
export function getCroppedImageStyle(cropPosition?: CropPosition): React.CSSProperties {
    if (!cropPosition) {
        return {
            objectFit: 'cover',
            objectPosition: 'center',
        };
    }

    const { x, y, scale } = cropPosition;

    // scale이 1이면 기존 object-position 방식 사용 (호환성)
    if (scale === 1) {
        return {
            objectFit: 'cover',
            objectPosition: `${x}% ${y}%`,
        };
    }

    // scale > 1이면 transform 방식 사용
    // x, y는 50이 중앙, 0이 왼쪽/위, 100이 오른쪽/아래
    const translateX = -(x - 50);
    const translateY = -(y - 50);

    return {
        objectFit: 'cover',
        objectPosition: 'center',
        transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
        transformOrigin: 'center',
    };
}

/**
 * 이미지 컨테이너 스타일 (overflow hidden 필수)
 */
export const croppedImageContainerStyle: React.CSSProperties = {
    overflow: 'hidden',
};

/**
 * 기본 cropPosition 값
 */
export const defaultCropPosition: CropPosition = {
    x: 50,
    y: 50,
    scale: 1,
};
