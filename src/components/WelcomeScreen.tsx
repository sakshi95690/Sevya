import React from 'react';
import { SevyaLogo } from './SevyaLogo';
import { Shield, HeartHandshake, CheckCircle2 } from 'lucide-react';

interface WelcomeScreenProps {
  onOpenLogin: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onOpenLogin }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans relative overflow-hidden transition-colors">
      
      {/* Soft Background Accent Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] bg-amber-600/5 dark:bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar Header */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between py-4 relative z-10 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <SevyaLogo size="lg" />
      </header>

      {/* Hero Body */}
      <main className="max-w-4xl mx-auto w-full my-auto text-center space-y-8 py-10 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold uppercase tracking-widest shadow-2xs">
          Unified Operations & Devotional Platform
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          Welcome to <span className="text-amber-600 dark:text-amber-400">SEVYA</span>
        </h1>

        <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
          Seva, Projects, Tasks, and Operations in one transparent platform.
        </p>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left pt-2">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 hover:border-amber-400 dark:hover:border-amber-500 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Devotional Seva</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Enroll for volunteer opportunities and track verified contributions.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 hover:border-amber-400 dark:hover:border-amber-500 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Task & Proof Review</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Transparent task workflows with image and document proof submission.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 hover:border-amber-400 dark:hover:border-amber-500 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Role-Based Operations</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Secure role-based access for Admins, Leaders, Sevaits, and Volunteers.</p>
          </div>
        </div>

        {/* Primary CTA - Clean Single Entry Button */}
        <div className="pt-4 max-w-sm mx-auto">
          <button
            onClick={() => onOpenLogin()}
            className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-3 active:scale-98 cursor-pointer"
          >
            <span>Get Started</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2.5 py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 relative z-10">
        <div>
          © {new Date().getFullYear()} SEVYA Management Platform. All rights reserved.
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <a
            href="#/privacy-policy"
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = 'privacy-policy';
            }}
            className="hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors"
          >
            Privacy Policy
          </a>
          <span>•</span>
          <a
            href="#/terms"
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = 'terms';
            }}
            className="hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors"
          >
            Terms of Service
          </a>
        </div>
      </footer>
    </div>
  );
};
