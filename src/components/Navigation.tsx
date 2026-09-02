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
} from 'lucide-react';
import { UserRole } from '../types';
import { normalizeRole } from '../utils/roleHierarchy';

export interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: UserRole | string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
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
  userRole = 'member',
  isMobileOpen = false,
  onCloseMobile,
  myTasksCount = 0,
  pendingProofsCount = 0,
  unreadAnnouncementsCount = 0,
}) => {
  const normalizedUserRole = normalizeRole(userRole);
  const isAdminOrCoordinator = ['super_admin', 'temple_admin', 'department_head', 'coordinator'].includes(normalizedUserRole);
  const isSuperOrTempleAdmin = ['super_admin', 'temple_admin'].includes(normalizedUserRole);

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
    <div className="flex flex-col h-full py-2 space-y-5">
      {categories.map((cat) => {
        const catItems = visibleItems.filter((i) => (i.category || 'Core') === cat);
        if (catItems.length === 0) return null;
        return (
          <div key={cat} className="space-y-1">
            <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-amber-500 text-white font-semibold shadow-sm shadow-amber-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/25 text-white'
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
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-20 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs max-h-[calc(100vh-6rem)] overflow-y-auto">
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
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-2">
              <span className="font-bold text-slate-900 dark:text-white text-base">Navigation</span>
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  );
};
