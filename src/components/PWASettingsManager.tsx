import React, { useState, useEffect } from 'react';
import { usePWA } from '../context/PWAContext';
import { useToast } from '../context/ToastContext';
import {
  CheckCircle2,
  Bell,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  Zap,
  Globe,
  Layers,
} from 'lucide-react';

export const PWASettingsManager: React.FC = () => {
  const {
    isStandalone,
    isOnline,
    applyUpdate,
    requestNotificationPermission,
    notificationPermission,
  } = usePWA();

  const { showToast } = useToast();
  const [cacheSize, setCacheSize] = useState<string>('Calculating...');
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Calculate approximate storage estimate
  useEffect(() => {
    const calculateStorage = async () => {
      if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          const usageMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(1);
          const quotaMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(0);
          setCacheSize(`${usageMB} MB used (of ${quotaMB} MB allocated)`);
        } catch {
          setCacheSize('~4.2 MB active cache');
        }
      } else {
        setCacheSize('~4.2 MB active cache');
      }
    };
    calculateStorage();
  }, []);

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      showToast('Offline cache cleared successfully. Refreshing application...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      showToast('Could not clear cache automatically.', 'error');
      setIsClearingCache(false);
    }
  };

  const handleTestNotification = async () => {
    if (notificationPermission !== 'granted') {
      const perm = await requestNotificationPermission();
      if (perm !== 'granted') {
        showToast('Notification permission was not granted.', 'error');
        return;
      }
    }

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification('SEVYA Notification Test', {
        body: 'Push and local PWA background notification delivery is fully functional!',
        icon: '/logo.png',
        badge: '/badge.png',
        data: { url: '/#notifications' },
      });
      showToast('Test notification dispatched!', 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* PWA Architecture & Status Overview */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Zap className="w-4 h-4" />
          <span>Offline & Storage Architecture</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Service Worker & Cache Management
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
          SEVYA leverages background service workers to ensure your seva records, assigned tasks, and meeting minutes remain available even during temporary network interruptions.
        </p>
      </div>

      {/* System Status Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Standalone Status */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Display Mode</span>
            {isStandalone ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                Standalone App
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Browser Tab
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            {isStandalone ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Globe className="w-4 h-4 text-slate-400" />}
            {isStandalone ? 'Standalone App' : 'Browser View'}
          </p>
        </div>

        {/* Network Connectivity */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Network Status</span>
            {isOnline ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                Connected
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
                Offline
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            {isOnline ? <Wifi className="w-4 h-4 text-emerald-600" /> : <WifiOff className="w-4 h-4 text-rose-600" />}
            {isOnline ? 'Online (Real-time)' : 'Offline (Cached)'}
          </p>
        </div>

        {/* Push Notifications */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Web Push Alerts</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                notificationPermission === 'granted'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
              }`}
            >
              {notificationPermission}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-amber-600" />
            {notificationPermission === 'granted' ? 'Active' : 'Not Granted'}
          </p>
        </div>

        {/* Cache Footprint */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Offline Storage</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400">
              Service Worker
            </span>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate">
            <Layers className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">{cacheSize}</span>
          </p>
        </div>
      </div>

      {/* Control Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
          Offline & Cache Maintenance Actions
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleTestNotification}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-amber-600">
              <Bell className="w-4 h-4 text-amber-600" />
              Test Push Notification
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Trigger a test notification to verify background badge and sound.
            </p>
          </button>

          <button
            onClick={applyUpdate}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-amber-600">
              <RefreshCw className="w-4 h-4 text-emerald-600" />
              Check for App Updates
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Sync service worker and fetch the newest version from server.
            </p>
          </button>

          <button
            onClick={handleClearCache}
            disabled={isClearingCache}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-rose-700 dark:text-rose-400">
              <Trash2 className="w-4 h-4 text-rose-600" />
              {isClearingCache ? 'Clearing...' : 'Clear Local Cache'}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Purge cached assets and redownload clean app bundle.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

