import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SevyaLogo } from './SevyaLogo';
import {
  AlertCircle,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider, isFirebaseConfigured, getFirebaseAuth } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { googleLogin, error, clearError, isLoading: isAuthLoading } = useAuth();

  const [signingIn, setSigningIn] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      setSuccessNotice(null);
      clearError();
      setSigningIn(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setSuccessNotice(null);
    clearError();
    setSigningIn(true);

    try {
      if (!isFirebaseConfigured()) {
        throw { code: 'auth/api-key-not-valid', message: 'Google Sign-In is not configured in this environment.' };
      }
      const firebaseAuth = getFirebaseAuth();
      if (!firebaseAuth) {
        throw { code: 'auth/api-key-not-valid', message: 'Google Sign-In is not configured in this environment.' };
      }
      const userCredential = await signInWithPopup(firebaseAuth, googleAuthProvider);
      const idToken = await userCredential.user.getIdToken();
      await googleLogin({ idToken });
      onClose();
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err);
      let errorReason = 'Google authentication was closed or unavailable.';
      if (err?.code === 'auth/api-key-not-valid' || err?.message?.includes('api-key-not-valid')) {
        errorReason = 'Google Sign-In API Key is not configured yet.';
      } else if (err?.code === 'auth/unauthorized-domain') {
        errorReason = 'Google Sign-In is unavailable for this domain preview.';
      } else if (err?.code === 'auth/popup-blocked') {
        errorReason = 'Google Sign-In popup was blocked by your browser.';
      } else if (err?.code === 'auth/popup-closed-by-user') {
        errorReason = 'Google Sign-In window was closed before completion.';
      } else if (err?.message?.includes('unverified') || err?.message?.includes('sensitive')) {
        errorReason = 'App unverified by Google. In the Google popup, click "Advanced" -> "Go to (unsafe)" to continue with test account.';
      } else if (err?.message) {
        errorReason = err.message;
      }

      setFormError(errorReason);
    } finally {
      setSigningIn(false);
    }
  };

  const isBusy = signingIn || isAuthLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 my-auto overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Navigation / Close Controls */}
        <div className="flex items-center justify-end mb-2">
          <button
            onClick={onClose}
            disabled={isBusy}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4">
          {/* Success Notice */}
          {successNotice && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{successNotice}</p>
            </div>
          )}

          {/* Error Banner */}
          {(formError || error) && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{formError || error}</p>
            </div>
          )}

          <div className="space-y-4 text-center">
            <div className="flex flex-col items-center">
              <SevyaLogo size="lg" showText={false} className="mb-2.5" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Sign in to SEVYA
              </h3>
            </div>

            <div className="pt-2">
              {/* Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isBusy}
                className="w-full py-3 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-sm rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-3 active:scale-98 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-300" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Terms & Privacy Notice */}
          <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
              By continuing, you agree to SEVYA&apos;s{' '}
              <a
                href="#/terms"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                  window.location.hash = 'terms';
                }}
                className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="#/privacy-policy"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                  window.location.hash = 'privacy-policy';
                }}
                className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
