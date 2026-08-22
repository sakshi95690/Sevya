import React, { useEffect, useState } from 'react';
import { usePWA } from '../context/PWAContext';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export const PWAOfflineIndicator: React.FC = () => {
  const { isOnline, isUpdateAvailable, applyUpdate } = usePWA();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <>
      {/* Offline Alert Bar */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs font-semibold px-4 py-1.5 flex items-center justify-center gap-2 shadow-inner z-50 sticky top-0">
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Offline Mode — Viewing cached seva operational data. Changes will sync once reconnected.</span>
        </div>
      )}

      {/* Back Online Toast */}
      {showReconnected && (
        <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-1.5 flex items-center justify-center gap-2 shadow-inner z-50 sticky top-0 animate-in fade-in duration-200">
          <Wifi className="w-3.5 h-3.5" />
          <span>Back Online — Synchronized with live SEVYA server.</span>
        </div>
      )}

      {/* App Update Available Notification */}
      {isUpdateAvailable && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white border border-amber-500/40 rounded-xl p-3 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
          <div className="text-xs">
            <p className="font-bold">New Version Available</p>
            <p className="text-slate-400 text-[11px]">Update SEVYA to get the latest features</p>
          </div>
          <button
            onClick={applyUpdate}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Update
          </button>
        </div>
      )}
    </>
  );
};
