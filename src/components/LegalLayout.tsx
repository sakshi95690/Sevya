import React from 'react';
import { SevyaLogo } from './SevyaLogo';
import { ArrowLeft, Shield, Lock, FileText, CheckCircle } from 'lucide-react';

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: React.ReactNode;
  activeDoc: 'privacy' | 'terms';
  onNavigate: (route: string) => void;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({
  title,
  subtitle,
  lastUpdated,
  children,
  activeDoc,
  onNavigate,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
            <div className="cursor-pointer" onClick={() => onNavigate('/')}>
              <SevyaLogo size="sm" />
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => onNavigate('/privacy-policy')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeDoc === 'privacy'
                  ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => onNavigate('/terms')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeDoc === 'terms'
                  ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Terms of Service
            </button>
          </div>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-8 py-10">
        {/* Document Header */}
        <div className="mb-10 pb-8 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[11px] font-bold uppercase tracking-wider">
            {activeDoc === 'privacy' ? <Shield className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
            Official Legal Document
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
            {subtitle}
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 pt-2">
            <span>Last Updated: {lastUpdated}</span>
            <span>•</span>
            <span>Applies to SEVYA Temple & Seva Project Management Platform</span>
          </div>
        </div>

        {/* Content Body */}
        <article className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 space-y-8 text-sm sm:text-base leading-relaxed">
          {children}
        </article>

        {/* Bottom Navigation */}
        <div className="mt-14 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Encrypted & Protected by Industry Security Standards</span>
          </div>
          <div className="flex items-center gap-4 text-amber-700 dark:text-amber-400 font-semibold">
            <button
              onClick={() => onNavigate(activeDoc === 'privacy' ? '/terms' : '/privacy-policy')}
              className="hover:underline cursor-pointer"
            >
              {activeDoc === 'privacy' ? 'View Terms of Service →' : 'View Privacy Policy →'}
            </button>
            <button
              onClick={() => onNavigate('/')}
              className="hover:underline cursor-pointer"
            >
              Return to Login / Home
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 px-4 sm:px-8 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <img
              src="/logo.jpeg"
              alt="SEVYA"
              className="w-4 h-4 object-contain rounded-xs"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
            <p>© {new Date().getFullYear()} SEVYA. Temple & Seva Project Management. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('/privacy-policy')}
              className={`hover:underline cursor-pointer ${activeDoc === 'privacy' ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}`}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => onNavigate('/terms')}
              className={`hover:underline cursor-pointer ${activeDoc === 'terms' ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}`}
            >
              Terms of Service
            </button>
            <button
              onClick={() => onNavigate('/')}
              className="hover:underline cursor-pointer"
            >
              App Portal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
