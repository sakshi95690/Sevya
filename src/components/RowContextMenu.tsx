import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Eye, Edit, Trash2, Share2, FileCheck, ExternalLink, CheckCircle, Clock, Copy, UserPlus } from 'lucide-react';

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface RowContextMenuProps {
  actions: ContextMenuAction[];
  shareData?: {
    title: string;
    details?: string;
    type?: string;
  };
}

export const RowContextMenu: React.FC<RowContextMenuProps> = ({ actions, shareData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleShareWhatsApp = () => {
    if (!shareData) return;
    const text = `*${shareData.type || 'SEVYA Update'}*: ${shareData.title}\n${shareData.details ? shareData.details + '\n' : ''}Organized via SEVYA Temple Management System.`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setIsOpen(false);
  };

  const finalActions = [...actions];
  if (shareData) {
    finalActions.push({
      id: 'share_whatsapp',
      label: 'Share to WhatsApp',
      icon: Share2,
      onClick: handleShareWhatsApp,
    });
  }

  if (finalActions.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        title="More Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          {/* Mobile Overlay / Backdrop */}
          <div
            className="sm:hidden fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />

          {/* Desktop Dropdown & Mobile Bottom Sheet */}
          <div className="fixed sm:absolute right-4 sm:right-0 bottom-0 sm:bottom-auto sm:top-full mt-1 w-[calc(100vw-2rem)] sm:w-48 bg-white rounded-2xl sm:rounded-xl shadow-xl sm:shadow-lg border border-slate-200 z-50 py-2 sm:py-1 animate-in slide-in-from-bottom-3 sm:slide-in-from-top-1 duration-150">
            <div className="sm:hidden px-4 py-2 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase tracking-wider flex justify-between items-center">
              <span>Select Action</span>
              <button onClick={() => setIsOpen(false)} className="text-slate-400">✕</button>
            </div>

            {finalActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  disabled={action.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    action.onClick();
                  }}
                  className={`w-full px-4 py-2.5 sm:py-2 text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    action.danger
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  } ${action.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${action.danger ? 'text-rose-600' : 'text-slate-500'}`} />}
                  <span className="truncate">{action.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
