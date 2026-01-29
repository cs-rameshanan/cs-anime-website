/**
 * Contentstack Image Delivery Utilities
 * 
 * Contentstack's Image Delivery API allows you to optimize and transform
 * images on-the-fly using URL parameters.
 * 
 * Documentation: https://www.contentstack.com/docs/developers/apis/image-delivery-api
 */

/**
 * Check if URL is a Contentstack asset URL
 * @param {string} url - Image URL
 * @returns {boolean}
 */
export function isContentstackUrl(url) {
  if (!url) return false;
  return url.includes('contentstack.io') || 
         url.includes('images.contentstack.com') ||
         url.includes('assets.contentstack.io');
}

/**
 * Get optimized Contentstack image URL with transformations
 * 
 * @param {string} url - Original Contentstack image URL
 * @param {Object} options - Transformation options
 * @param {number} options.width - Desired width
 * @param {number} options.height - Desired height
 * @param {string} options.format - Output format (webp, jpg, png, gif, pjpg)
 * @param {number} options.quality - Quality 1-100
 * @param {string} options.fit - Fit mode (crop, scale, stretch)
 * @param {string} options.crop - Crop position (top, bottom, left, right, center, faces, entropy)
 * @param {boolean} options.auto - Auto format optimization
 * @returns {string} Optimized image URL
 */
export function getOptimizedImageUrl(url, options = {}) {
  if (!url) return '';
  
  // If not a Contentstack URL, return as-is
  if (!isContentstackUrl(url)) {
    return url;
  }

  const params = new URLSearchParams();

  // Width
  if (options.width) {
    params.append('width', options.width);
  }

  // Height
  if (options.height) {
    params.append('height', options.height);
  }

  // Format (webp is best for web)
  if (options.format) {
    params.append('format', options.format);
  } else if (options.auto !== false) {
    // Default to webp for best compression
    params.append('format', 'webp');
  }

  // Quality (default 80 for good balance)
  if (options.quality) {
    params.append('quality', options.quality);
  } else {
    params.append('quality', 80);
  }

  // Fit mode
  if (options.fit) {
    params.append('fit', options.fit);
  }

  // Crop position
  if (options.crop) {
    params.append('crop', options.crop);
  }

  // Add auto=webp for automatic format selection based on browser
  if (options.auto !== false) {
    params.append('auto', 'webp');
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params.toString()}`;
}

/**
 * Predefined image sizes for common use cases
 */
export const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 200, fit: 'crop' },
  card: { width: 300, height: 400, fit: 'crop' },
  poster: { width: 500, height: 700, fit: 'crop' },
  hero: { width: 1920, height: 1080, fit: 'crop', quality: 85 },
  banner: { width: 1200, height: 400, fit: 'crop' },
  avatar: { width: 100, height: 100, fit: 'crop', crop: 'faces' },
};

/**
 * Get image URL for a specific preset size
 * @param {string} url - Original image URL
 * @param {string} preset - Preset name (thumbnail, card, poster, hero, banner)
 * @returns {string} Optimized image URL
 */
export function getPresetImageUrl(url, preset) {
  const options = IMAGE_SIZES[preset];
  if (!options) {
    console.warn(`Unknown image preset: ${preset}`);
    return url;
  }
  return getOptimizedImageUrl(url, options);
}

/**
 * Get responsive image srcSet for different screen sizes
 * @param {string} url - Original image URL
 * @param {number[]} widths - Array of widths to generate
 * @returns {string} srcSet string for <img> or next/image
 */
export function getResponsiveSrcSet(url, widths = [320, 640, 768, 1024, 1280, 1920]) {
  if (!isContentstackUrl(url)) {
    return url;
  }

  return widths
    .map(width => {
      const optimizedUrl = getOptimizedImageUrl(url, { width });
      return `${optimizedUrl} ${width}w`;
    })
    .join(', ');
}

/**
 * Get blur placeholder data URL for images
 * Returns a tiny base64 version for blur-up effect
 * @param {string} url - Original image URL
 * @returns {string} Tiny image URL for placeholder
 */
export function getBlurPlaceholder(url) {
  return getOptimizedImageUrl(url, {
    width: 10,
    height: 10,
    quality: 30,
    format: 'jpg',
  });
}
