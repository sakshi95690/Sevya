import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { SevyaLogo } from './SevyaLogo';
import {
  AlertCircle,
  X,
  Loader2,
  CheckCircle2,
  Mail,
  KeyRound,
  RefreshCw,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: 'select' | 'otp_email';
}

type AuthModalStep = 'select' | 'otp_email' | 'otp_verify';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialStep = 'select',
}) => {
  const { googleLogin, sendOtp, loginWithOtp, error, clearError, isLoading: isAuthLoading } = useAuth();

  const [authStep, setAuthStep] = useState<AuthModalStep>(initialStep);
  const [signingIn, setSigningIn] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  const [emailInput, setEmailInput] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const [expiryCountdown, setExpiryCountdown] = useState<number>(0);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Restore or reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      const savedEmail = sessionStorage.getItem('sevya_pending_otp_email');
      const savedExpiry = Number(sessionStorage.getItem('sevya_pending_otp_expiry') || '0');
      const savedResend = Number(sessionStorage.getItem('sevya_pending_otp_resend') || '0');
      const now = Date.now();

      if (savedEmail && savedExpiry > now) {
        setEmailInput(savedEmail);
        setAuthStep('otp_verify');
        setExpiryCountdown(Math.max(0, Math.floor((savedExpiry - now) / 1000)));
        setResendCooldown(Math.max(0, Math.floor((savedResend - now) / 1000)));
        setSuccessNotice(`Verification code sent to ${savedEmail}`);
      } else {
        setAuthStep(initialStep);
        setExpiryCountdown(0);
        setResendCooldown(0);
        setSuccessNotice(null);
      }

      setFormError(null);
      setDevOtpHint(null);
      clearError();
      setSigningIn(false);
      setOtpSending(false);
      setOtpVerifying(false);
      setOtpDigits(['', '', '', '', '', '']);
    }
  }, [isOpen, initialStep]);

  // Timers for OTP Expiry and Resend Cooldown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (expiryCountdown > 0) {
      timer = setInterval(() => {
        setExpiryCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [expiryCountdown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const clearSessionOtp = () => {
    sessionStorage.removeItem('sevya_pending_otp_email');
    sessionStorage.removeItem('sevya_pending_otp_expiry');
    sessionStorage.removeItem('sevya_pending_otp_resend');
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setSuccessNotice(null);
    clearError();
    setSigningIn(true);

    try {
      const userCredential = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await userCredential.user.getIdToken();
      await googleLogin({ idToken });
      clearSessionOtp();
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

      setFormError(`${errorReason} You can continue with Email OTP verification below.`);
      setAuthStep('otp_email');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetEmail = emailInput.trim().toLowerCase();

    if (!targetEmail || !targetEmail.includes('@') || !targetEmail.includes('.')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setFormError(null);
    clearError();
    setOtpSending(true);

    try {
      const res = await sendOtp(targetEmail);
      const expirySecs = res?.expiresInSeconds || 300;
      const resendSecs = res?.resendCooldownSeconds || 60;

      sessionStorage.setItem('sevya_pending_otp_email', targetEmail);
      sessionStorage.setItem('sevya_pending_otp_expiry', String(Date.now() + expirySecs * 1000));
      sessionStorage.setItem('sevya_pending_otp_resend', String(Date.now() + resendSecs * 1000));

      setSuccessNotice(`Verification code sent to ${targetEmail}`);
      setExpiryCountdown(expirySecs);
      setResendCooldown(resendSecs);

      if (res?.devOtp) {
        setDevOtpHint(res.devOtp);
      }

      setAuthStep('otp_verify');
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to dispatch verification code. Please check your email and try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '');

    if (cleanVal.length > 1) {
      handlePastedCode(cleanVal);
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      triggerVerification(fullCode);
    }
  };

  const handlePastedCode = (pastedText: string) => {
    const digitsOnly = pastedText.replace(/\D/g, '').slice(0, 6);
    if (!digitsOnly) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < digitsOnly.length; i++) {
      newDigits[i] = digitsOnly[i];
    }
    setOtpDigits(newDigits);

    if (digitsOnly.length === 6) {
      otpInputRefs.current[5]?.focus();
      triggerVerification(digitsOnly);
    } else {
      const nextIdx = Math.min(digitsOnly.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const triggerVerification = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6 || otpVerifying) return;
    setFormError(null);
    clearError();
    setOtpVerifying(true);
    try {
      await loginWithOtp(emailInput.trim().toLowerCase(), codeToVerify);
      clearSessionOtp();
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Incorrect verification code. Please try again.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpDigits.join('');

    if (otpCode.length !== 6) {
      setFormError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (expiryCountdown <= 0) {
      setFormError('This verification code has expired. Please request a new code.');
      return;
    }

    await triggerVerification(otpCode);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const isBusy = signingIn || otpSending || otpVerifying || isAuthLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 my-auto overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Navigation Controls */}
        <div className="flex items-center justify-between mb-4">
          {authStep !== 'select' ? (
            <button
              onClick={() => {
                setAuthStep('select');
                setFormError(null);
                setSuccessNotice(null);
              }}
              disabled={isBusy}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1 text-xs"
              title="Back to Sign-in Options"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            disabled={isBusy}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer ml-auto"
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

          {/* Step 1: 2 Independent Options [ Continue with Google ] OR [ Continue with Email OTP ] */}
          {authStep === 'select' && (
            <div className="space-y-4 text-center">
              <div className="flex flex-col items-center">
                <SevyaLogo size="lg" showText={false} className="mb-2.5" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Sign in to SEVYA
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Choose your preferred authentication method
                </p>
              </div>

              <div className="pt-2 space-y-3">
                {/* Option 1: Continue with Google */}
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

                {/* OR Divider */}
                <div className="relative flex items-center justify-center py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <span className="relative px-3 bg-white dark:bg-slate-900 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                    OR
                  </span>
                </div>

                {/* Option 2: Continue with Email OTP */}
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('otp_email');
                    setFormError(null);
                  }}
                  disabled={isBusy}
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>Continue with Email OTP</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Email Address Input */}
          {authStep === 'otp_email' && (
            <form onSubmit={handleSendOtp} className="space-y-3.5">
              <div className="text-center">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Enter Your Email
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  We will send a 6-digit one-time password (OTP) to your email.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@example.com"
                    disabled={isBusy}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all disabled:opacity-50"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy || !emailInput.trim()}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {otpSending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                <span>{otpSending ? 'Sending OTP...' : 'Send OTP'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthStep('select');
                  setFormError(null);
                }}
                disabled={isBusy}
                className="w-full py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-center font-medium cursor-pointer"
              >
                Back to Sign-in Options
              </button>
            </form>
          )}

          {/* Step 3: 6-Digit OTP Verification Form */}
          {authStep === 'otp_verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-3.5">
              <div className="text-center">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  OTP Verification
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter the 6-digit OTP sent to <span className="font-semibold text-slate-700 dark:text-slate-200">{emailInput}</span>
                </p>
              </div>

              {/* 6 Digit Input Boxes */}
              <div
                className="flex justify-center gap-2 my-1"
                onPaste={(e) => {
                  e.preventDefault();
                  handlePastedCode(e.clipboardData.getData('text'));
                }}
              >
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onPaste={(e) => {
                      e.preventDefault();
                      handlePastedCode(e.clipboardData.getData('text'));
                    }}
                    onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    disabled={isBusy}
                    className={`w-10 h-12 text-center text-xl font-bold font-mono bg-slate-50 dark:bg-slate-800/80 border-2 rounded-xl text-slate-900 dark:text-white focus:outline-none transition-all ${
                      digit
                        ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20'
                        : 'border-slate-300 dark:border-slate-700'
                    } focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30`}
                  />
                ))}
              </div>

              {/* Expiry & Resend Controls */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <div>
                  {expiryCountdown > 0 ? (
                    <span>
                      Expires in{' '}
                      <strong className="text-amber-600 dark:text-amber-400 font-mono">
                        {formatSeconds(expiryCountdown)}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-rose-600 font-semibold">Code expired</span>
                  )}
                </div>

                <div>
                  {resendCooldown > 0 ? (
                    <span>
                      Resend in <span className="font-mono">{resendCooldown}s</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={isBusy}
                      className="text-amber-600 dark:text-amber-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Resend Code
                    </button>
                  )}
                </div>
              </div>

              {/* Dev/Preview Code Auto-Fill Hint */}
              {devOtpHint && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span>
                    Preview Code: <strong className="font-mono">{devOtpHint}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpDigits(devOtpHint.split(''));
                      triggerVerification(devOtpHint);
                    }}
                    className="px-2 py-0.5 text-[11px] bg-amber-200 dark:bg-amber-800 rounded font-bold hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors cursor-pointer"
                  >
                    Auto-Fill & Verify
                  </button>
                </div>
              )}

              {/* Verify Button */}
              <button
                type="submit"
                disabled={isBusy || otpDigits.join('').length !== 6 || expiryCountdown <= 0}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {otpVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{otpVerifying ? 'Verifying...' : 'Verify & Log In'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearSessionOtp();
                  setAuthStep('otp_email');
                  setFormError(null);
                  setSuccessNotice(null);
                }}
                disabled={isBusy}
                className="w-full py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-center font-medium cursor-pointer"
              >
                Change email or request new code
              </button>
            </form>
          )}
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
