import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchVapidPublicKey } from '../services/workflowApi';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type PlatformType = 'android' | 'ios' | 'desktop-chrome' | 'desktop-edge' | 'desktop-other' | 'other';

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  platform: PlatformType;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  isInstallModalOpen: boolean;
  setIsInstallModalOpen: (open: boolean) => void;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unsupported'>;
  applyUpdate: () => void;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  notificationPermission: NotificationPermission | 'unsupported';
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine ?? true);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Detect Platform
  const detectPlatform = (): PlatformType => {
    if (typeof window === 'undefined') return 'other';
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOSDevice) return 'ios';
    if (/android/.test(ua)) return 'android';
    if (/edg\//.test(ua)) return 'desktop-edge';
    if (/chrome|crios/.test(ua)) return 'desktop-chrome';
    return 'desktop-other';
  };

  const platform = detectPlatform();
  const isIOS = platform === 'ios';
  const isAndroid = platform === 'android';
  const isDesktop = platform.startsWith('desktop');

  // Check Standalone Mode
  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      setIsStandalone(isStandaloneMode);
      if (isStandaloneMode) {
        setIsInstalled(true);
      }
    };

    checkStandalone();
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
      if (e.matches) setIsInstalled(true);
    };

    try {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
      return () => mediaQuery.removeEventListener('change', handleDisplayModeChange);
    } catch {
      // Fallback for older browsers
      mediaQuery.addListener(handleDisplayModeChange);
      return () => mediaQuery.removeListener(handleDisplayModeChange);
    }
  }, []);

  // Online / Offline Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register Service Worker and manage lifecycle
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[SEVYA PWA] Service Worker registered with scope:', registration.scope);

        // Check if there is an updated worker already waiting
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setIsUpdateAvailable(true);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setIsUpdateAvailable(true);
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('[SEVYA PWA] Service Worker registration notice:', err?.message || err);
      });
  }, []);

  // Intercept beforeinstallprompt for Chrome / Edge / Android
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      console.log('[SEVYA PWA] Application was successfully installed to device');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsInstallModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Prompt Install method
  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          setIsInstallModalOpen(false);
        }
        return choice.outcome;
      } catch (err) {
        console.error('[SEVYA PWA] Prompt install error:', err);
        return 'unsupported';
      }
    }
    // If deferredPrompt is not available (e.g. iOS or already installed or user needs guide)
    setIsInstallModalOpen(true);
    return 'unsupported';
  }, [deferredPrompt]);

  // Apply SW Update
  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setIsUpdateAvailable(false);
    } else {
      window.location.reload();
    }
  }, [waitingWorker]);

  // Request Notification Permission
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        try {
          const { publicKey } = await fetchVapidPublicKey();
          if (publicKey) {
            // Subscribe Push
            const convertedKey = urlBase64ToUint8Array(publicKey);
            await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedKey,
            });
          }
        } catch (subErr) {
          console.warn('[SEVYA PWA] Push subscription sync notice:', subErr);
        }
      }

      return permission;
    } catch (err) {
      console.error('[SEVYA PWA] Notification permission error:', err);
      return 'denied';
    }
  }, []);

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isStandalone,
        isOnline,
        isUpdateAvailable,
        platform,
        isIOS,
        isAndroid,
        isDesktop,
        isInstallModalOpen,
        setIsInstallModalOpen,
        promptInstall,
        applyUpdate,
        requestNotificationPermission,
        notificationPermission,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

// Helper to convert base64 VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
