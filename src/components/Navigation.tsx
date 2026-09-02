import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Video,
  Calendar,
  ShieldCheck,
  FileCheck2,
  Repeat,
  Megaphone,
  HeartHandshake,
  Receipt,
  UserCheck,
  GitBranch,
  Users,
  BarChart3,
  Bell,
  MessageSquareQuote,
  Settings,
  X,
  User as UserIcon,
  LogOut,
  Moon,
  Sun,
  Shield,
  Sparkles,
  ChevronRight,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { User, TempleInfo, UserRole } from '../types';
import { normalizeRole, getRoleDisplayName } from '../utils/roleHierarchy';
import { SevyaLogo } from './SevyaLogo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePWA } from '../context/PWAContext';

export interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser?: User;
  temple?: TempleInfo;
  userRole?: UserRole | string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenProfile?: () => void;
  onOpenLogout?: () => void;
  onOpenAuth?: () => void;
  myTasksCount?: number;
  pendingProofsCount?: number;
  unreadAnnouncementsCount?: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  roles?: string[];
  category?: 'Core' | 'Operations' | 'Administration';
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  temple,
  userRole,
  isMobileOpen = false,
  onCloseMobile,
  onOpenProfile,
  onOpenLogout,
  onOpenAuth,
  myTasksCount = 0,
  pendingProofsCount = 0,
  unreadAnnouncementsCount = 0,
}) => {
  const { user: authUser, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { isOnline } = usePWA();

  const effectiveUser = currentUser || authUser;
  const effectiveRole = effectiveUser?.role || userRole || 'member';
  const normalizedUserRole = normalizeRole(effectiveRole);
  const roleTitle = getRoleDisplayName(normalizedUserRole);

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      category: 'Core',
    },
    {
      id: 'tasks',
      label: 'Tasks & Seva',
      icon: CheckSquare,
      badge: myTasksCount > 0 ? myTasksCount : undefined,
      category: 'Core',
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderKanban,
      category: 'Core',
    },
    {
      id: 'meetings',
      label: 'Meetings',
      icon: Video,
      category: 'Core',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      category: 'Core',
    },
    {
      id: 'announcements',
      label: 'Announcements',
      icon: Megaphone,
      badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : undefined,
      category: 'Core',
    },
    {
      id: 'book_seva',
      label: 'Book Seva',
      icon: HeartHandshake,
      category: 'Operations',
    },
    {
      id: 'donations',
      label: 'Donations',
      icon: Receipt,
      category: 'Operations',
    },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: ShieldCheck,
      category: 'Operations',
    },
    {
      id: 'proofs',
      label: 'Proof Review',
      icon: FileCheck2,
      badge: pendingProofsCount > 0 ? pendingProofsCount : undefined,
      category: 'Operations',
    },
    {
      id: 'recurring_tasks',
      label: 'Recurring Sevas',
      icon: Repeat,
      category: 'Operations',
    },
    {
      id: 'secretaries',
      label: 'Secretary Desk',
      icon: UserCheck,
      category: 'Operations',
    },
    {
      id: 'workflows',
      label: 'Automations',
      icon: GitBranch,
      category: 'Administration',
    },
    {
      id: 'users',
      label: 'Devotees & Roles',
      icon: Users,
      category: 'Administration',
    },
    {
      id: 'reports',
      label: 'Reports & Audits',
      icon: BarChart3,
      category: 'Administration',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      category: 'Administration',
    },
    {
      id: 'feedback',
      label: 'Feedback & Support',
      icon: MessageSquareQuote,
      category: 'Administration',
    },
    {
      id: 'settings',
      label: 'Temple Settings',
      icon: Settings,
      category: 'Administration',
    },
  ];

  const visibleItems = navItems;
  const categories = Array.from(new Set(visibleItems.map((i) => i.category || 'Core')));

  const renderNavContent = () => (
    <div className="flex flex-col h-full justify-between">
      {/* Top Branding Section */}
      <div className="pb-4 mb-2 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SevyaLogo size="sm" showText={false} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  SEVYA
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-sm border border-amber-500/30">
                  TMS
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                {temple?.name || 'Temple Management'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            </button>
            {isMobileOpen && (
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Links with Scroll */}
      <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-4 max-h-[calc(100vh-17rem)]">
        {categories.map((cat) => {
          const catItems = visibleItems.filter((i) => (i.category || 'Core') === cat);
          if (catItems.length === 0) return null;
          return (
            <div key={cat} className="space-y-1">
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                {cat}
              </div>
              {catItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-xs shadow-amber-500/20 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950 stroke-[2.2]' : 'text-slate-400 dark:text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? 'bg-slate-950 text-amber-400'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/40'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User Profile & Account Footer */}
      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
        {effectiveUser ? (
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-2.5 transition-all">
            {/* User Info Row */}
            <div className="flex items-center gap-2.5 mb-2">
              <div className="relative shrink-0">
                {effectiveUser.avatar ? (
                  <img
                    src={effectiveUser.avatar}
                    alt={effectiveUser.name}
                    className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center shadow-2xs">
                    {effectiveUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                    isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  title={isOnline ? 'Online' : 'Offline sync'}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {effectiveUser.name}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 px-1.5 py-0.2 rounded-xs truncate">
                    {roleTitle}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile & Logout Action Buttons */}
            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/50">
              <button
                type="button"
                onClick={() => {
                  if (onOpenProfile) onOpenProfile();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-700/70 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-600 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                title="View and Edit Profile"
              >
                <UserIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                Profile
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenLogout) {
                    onOpenLogout();
                  } else if (logout) {
                    logout();
                  }
                  if (onCloseMobile) onCloseMobile();
                }}
                className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
                title="Log out of SEVYA"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (onOpenAuth) onOpenAuth();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserIcon className="w-3.5 h-3.5" />
            Sign In / Sign Up
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs max-h-[calc(100vh-6rem)] h-full flex flex-col transition-colors">
          {renderNavContent()}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-slate-900 shadow-2xl p-4 z-10 overflow-y-auto">
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  );
};

