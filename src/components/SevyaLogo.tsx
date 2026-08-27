import React, { useState } from 'react';

interface SevyaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'icon';
  showText?: boolean;
  lightText?: boolean;
  collapsed?: boolean;
  textColor?: string;
  className?: string;
  subtitle?: string;
}

/**
 * SINGLE SOURCE OF TRUTH FOR SEVYA BRANDING:
 * Uses /logo.png as the primary brand logo across the entire application
 * (Header, Sidebar, Welcome screen, Modals, Taskbar, and Footers).
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

  const iconSizes: Record<string, string> = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20',
    icon: 'w-10 h-10',
  };

  const textSizes: Record<string, string> = {
    xs: 'text-sm font-black tracking-tight',
    sm: 'text-base font-black tracking-tight',
    md: 'text-xl font-black tracking-tight',
    lg: 'text-2xl font-black tracking-tight',
    xl: 'text-3xl font-black tracking-tight',
    '2xl': 'text-4xl font-black tracking-tight',
    icon: 'text-base font-black tracking-tight',
  };

  const defaultTextColor = lightText
    ? 'text-white'
    : 'text-amber-600 dark:text-amber-500';
  const colorClass = textColor || defaultTextColor;

  const handleImageError = () => {
    // Fallback if needed
    if (imgSrc === '/logo.png') {
      setImgSrc('/sevya-logo.png');
    } else if (imgSrc === '/sevya-logo.png') {
      setImgSrc('/logo.svg');
    } else if (imgSrc === '/logo.svg') {
      setImgSrc('/icon-512.png');
    }
  };

  const iconElement = (
    <div
      className={`${iconSizes[size] || 'w-10 h-10'} flex items-center justify-center shrink-0 transition-transform duration-200`}
    >
      <img
        src={imgSrc}
        alt="SEVYA Logo"
        onError={handleImageError}
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain pointer-events-none select-none drop-shadow-xs"
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
    <div className={`flex items-center gap-3 select-none shrink-0 ${className}`}>
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
