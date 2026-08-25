/**
 * SEVYA Public Asset & Image Utility
 * 
 * Allows developers to simply place any image file inside the frontend `public` directory
 * (e.g. `public/images/my-image.png` or `public/my-banner.jpg`) and reference it directly.
 * 
 * Works seamlessly in both local development (Vite dev server) and production builds (Firebase Hosting).
 */

/**
 * Resolves a public asset path ensuring proper leading slash and environment base URL.
 * 
 * Examples:
 *  - resolvePublicImage('images/banner.png') => '/images/banner.png'
 *  - resolvePublicImage('/images/my-photo.jpg') => '/images/my-photo.jpg'
 *  - resolvePublicImage('/logo.svg') => '/logo.svg'
 */
export function resolvePublicImage(path?: string | null, fallback: string = '/images/default-avatar.png'): string {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return fallback;
  }

  const trimmed = path.trim();

  // If it is an external URL (http/https/data:), preserve it
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Ensure absolute leading slash for public assets
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  
  // Prepend base URL if Vite is configured with a non-root base
  const baseUrl = import.meta.env.BASE_URL || '/';
  if (baseUrl !== '/' && !normalizedPath.startsWith(baseUrl)) {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBase}${normalizedPath}`;
  }

  return normalizedPath;
}

/**
 * Default Public Asset Constants
 * Developers can replace these files in `/public` to automatically rebrand.
 */
export const PUBLIC_ASSETS = {
  LOGO_SVG: '/logo.svg',
  LOGO_PNG: '/logo.png',
  BANNER: '/images/banner.png',
  DEFAULT_AVATAR: '/images/default-avatar.png',
} as const;
