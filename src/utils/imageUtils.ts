/**
 * SEVYA Public Asset & Image Utility
 * 
 * Allows developers to place any image file directly inside the frontend `public` directory
 * (e.g. `public/logo.png` or `public/badge.png`) and reference it directly as `/logo.png`.
 * 
 * Works seamlessly in both local development (Vite dev server) and production builds (Firebase Hosting).
 */

/**
 * Resolves a public asset path ensuring proper leading slash and environment base URL.
 * 
 * Examples:
 *  - resolvePublicImage('logo.png') => '/logo.png'
 *  - resolvePublicImage('/logo.png') => '/logo.png'
 */
export function resolvePublicImage(path?: string | null, fallback: string = '/logo.png'): string {
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
 * Developers can replace these files directly in `/public` to automatically update brand assets.
 */
export const PUBLIC_ASSETS = {
  LOGO: '/logo.png',
  LOGO_PNG: '/logo.png',
  LOGO_JPEG: '/logo.jpeg',
  LOGO_SVG: '/logo.svg',
  SEVYA_LOGO: '/sevya-logo.png',
  BADGE: '/badge.png',
} as const;
