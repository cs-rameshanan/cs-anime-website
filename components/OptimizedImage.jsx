'use client';

import Image from 'next/image';
import { useState } from 'react';
import { 
  getOptimizedImageUrl, 
  getPresetImageUrl, 
  isContentstackUrl,
  IMAGE_SIZES 
} from '@/lib/imageUtils';

/**
 * OptimizedImage Component
 * 
 * A wrapper around next/image that automatically optimizes Contentstack images
 * using the Image Delivery API.
 * 
 * Features:
 * - Automatic WebP conversion
 * - Responsive sizing
 * - Quality optimization
 * - Blur placeholder support
 * - Fallback for non-Contentstack images
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  preset,
  quality = 80,
  className = '',
  fill = false,
  priority = false,
  sizes,
  style,
  onLoad,
  onError,
  ...props
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Get dimensions from preset if specified
  let finalWidth = width;
  let finalHeight = height;
  
  if (preset && IMAGE_SIZES[preset]) {
    finalWidth = finalWidth || IMAGE_SIZES[preset].width;
    finalHeight = finalHeight || IMAGE_SIZES[preset].height;
  }

  // Generate optimized URL for Contentstack images
  let optimizedSrc = src;
  
  if (isContentstackUrl(src)) {
    if (preset) {
      optimizedSrc = getPresetImageUrl(src, preset);
    } else {
      optimizedSrc = getOptimizedImageUrl(src, {
        width: finalWidth,
        height: finalHeight,
        quality,
      });
    }
  }

  // Fallback placeholder for errors
  const fallbackSrc = `https://via.placeholder.com/${finalWidth || 300}x${finalHeight || 400}?text=No+Image`;

  const handleLoad = (e) => {
    setIsLoading(false);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(e);
  };

  // For external images, use unoptimized to avoid Next.js image optimization conflicts
  const isExternal = !isContentstackUrl(src);

  return (
    <div className={`relative ${className}`} style={style}>
      {/* Loading skeleton */}
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-700 animate-pulse rounded-lg"
          style={{ width: finalWidth, height: finalHeight }}
        />
      )}
      
      <Image
        src={hasError ? fallbackSrc : optimizedSrc}
        alt={alt || 'Image'}
        width={fill ? undefined : finalWidth}
        height={fill ? undefined : finalHeight}
        fill={fill}
        priority={priority}
        sizes={sizes || `(max-width: 768px) 100vw, ${finalWidth}px`}
        quality={quality}
        unoptimized={isExternal}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        {...props}
      />

      {/* Contentstack badge for dev/debug */}
      {process.env.NODE_ENV === 'development' && isContentstackUrl(src) && (
        <div className="absolute bottom-1 right-1 bg-green-500 text-white text-xs px-1 rounded opacity-50">
          CDN
        </div>
      )}
    </div>
  );
}
