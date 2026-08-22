import React, { useState } from 'react';

interface SevyaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon';
  showText?: boolean;
  lightText?: boolean;
  collapsed?: boolean;
  textColor?: string;
  className?: string;
  subtitle?: string;
}

/**
 * SINGLE SOURCE OF TRUTH FOR SEVYA BRANDING:
 * References the fixed logo image located in the /public directory.
 * When a new image is placed in /public/logo.png (or /logo.jpeg), the entire app updates automatically.
 */
export const SEVYA_LOGO_SRC = '/logo.png';

export const SevyaLogo: React.FC<SevyaLogoProps> = ({
  size = 'md',
  showText = true,
  lightText = false,
  collapsed = false,
  textColor,
  className = '',
  subtitle,
}) => {
  const [imgSrc, setImgSrc] = useState<string>(SEVYA_LOGO_SRC);
  const isCollapsed = collapsed || size === 'icon' || !showText;

  const iconSizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
    icon: 'w-9 h-9',
  };

  const textSizes = {
    xs: 'text-sm font-black tracking-tight',
    sm: 'text-base font-black tracking-tight',
    md: 'text-xl font-black tracking-tight',
    lg: 'text-2xl font-black tracking-tight',
    xl: 'text-3xl font-black tracking-tight',
    icon: 'text-base font-black tracking-tight',
  };

  const defaultTextColor = lightText
    ? 'text-white'
    : 'text-amber-600 dark:text-amber-500';
  const colorClass = textColor || defaultTextColor;

  const handleImageError = () => {
    // Fallback if user places .jpeg or .svg instead of .png
    if (imgSrc === '/logo.png') {
      setImgSrc('/logo.jpeg');
    } else if (imgSrc === '/logo.jpeg') {
      setImgSrc('/logo.svg');
    }
  };

  const iconElement = (
    <div
      className={`${iconSizes[size] || 'w-9 h-9'} rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs transition-all duration-200`}
    >
      <img
        src={imgSrc}
        alt="SEVYA Logo"
        onError={handleImageError}
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain rounded-lg pointer-events-none select-none"
      />
    </div>
  );

  if (isCollapsed) {
    return (
      <div className={`flex items-center justify-center select-none shrink-0 ${className}`}>
        {iconElement}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 select-none shrink-0 ${className}`}>
      {iconElement}

      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center leading-none">
          <span className={`${textSizes[size] || 'text-xl font-black tracking-tight'} ${colorClass} transition-colors duration-200`}>
            SEVYA
          </span>
        </div>
        {subtitle && (
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase truncate mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
