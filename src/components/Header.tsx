import React, { useState, useEffect, useRef } from 'react';
import { User, Notification, TempleInfo, Announcement } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePWA } from '../context/PWAContext';
import { AuthModal } from './AuthModal';
import { AnnouncementFormModal } from './AnnouncementFormModal';
import { AnnouncementDetailsModal } from './AnnouncementDetailsModal';
import { SevyaLogo } from './SevyaLogo';
import {
  Bell,
  LogIn,
  CheckCheck,
  Clock,
  Menu,
  Search,
  UserCheck,
  Megaphone,
  Pin,
  AlertTriangle,
  Flame,
  Plus,
  ExternalLink,
  Tag,
  ShieldAlert,
  Info,
  CheckCircle2,
  X,
  User as UserIcon,
  Sun,
  Moon,
  Download,
  WifiOff,
} from 'lucide-react';

interface HeaderProps {
  temple: TempleInfo;
  currentUser: User;
  allUsers: User[];
  notifications: Notification[];
  announcements?: Announcement[];
  onSwitchRoleUser: (user: User) => void;
  onMarkAllNotificationsRead: () => void;
  onMarkAnnouncementRead?: (id: string) => void;
  onMarkAllAnnouncementsRead?: () => void;
  onCreateAnnouncement?: (data: Partial<Announcement>) => Promise<void>;
  onOpenCreateTaskModal: () => void;
  onOpenSmartMessage?: () => void;
  onToggleMobileMenu?: () => void;
  onOpenSearch?: () => void;
  onOpenProfile?: () => void;
  onOpenAnnouncements?: () => void;
  onNotificationClick?: (notif: Notification) => void;
  onViewAllNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  temple,
  currentUser,
  notifications,
  announcements = [],
  onMarkAllNotificationsRead,
  onMarkAnnouncementRead,
  onMarkAllAnnouncementsRead,
  onCreateAnnouncement,
  onOpenCreateTaskModal,
  onOpenSmartMessage,
  onToggleMobileMenu,
  onOpenSearch,
  onOpenProfile,
  onOpenAnnouncements,
  onNotificationClick,
  onViewAllNotifications,
}) => {
  const { user: authUser, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { isOnline } = usePWA();
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showAnnounceMenu, setShowAnnounceMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);

  const activeUser = authUser || currentUser;
  const unreadNotifsCount = (notifications || []).filter((n) => !n.read).length;
  const unreadAnnouncementsCount = (announcements || []).filter((a) => !a.isRead).length;

  const canAssignTask = ['super_admin', 'temple_admin', 'department_head', 'coordinator'].includes(activeUser?.role || '');
  const canCreateAnnouncement = ['super_admin', 'temple_admin', 'department_head', 'coordinator'].includes(activeUser?.role || '');

  // Close menus on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (announceRef.current && !announceRef.current.contains(e.target as Node)) {
        setShowAnnounceMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifMenu(false);
        setShowAnnounceMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCreateAnnouncementSubmit = async (data: Partial<Announcement>) => {
    if (onCreateAnnouncement) {
      await onCreateAnnouncement(data);
    }
    setShowCreateModal(false);
  };

  const handleAnnouncementClick = (item: Announcement) => {
    setShowAnnounceMenu(false);
    setSelectedAnnouncement(item);
    setShowDetailsModal(true);
    if (!item.isRead && onMarkAnnouncementRead) {
      onMarkAnnouncementRead(item.id);
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return { label: 'Urgent', bg: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800', icon: Flame };
      case 'high':
        return { label: 'High Priority', bg: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800', icon: AlertTriangle };
      case 'trustee':
      case 'governance':
        return { label: 'Trustee Notice', bg: 'bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800', icon: ShieldAlert };
      default:
        return { label: 'Notice', bg: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800', icon: Info };
    }
  };

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-6 md:px-8 sticky top-0 z-40 shadow-2xs transition-colors">
        {/* Active Tab / Temple Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="md:hidden shrink-0">
              <SevyaLogo size="sm" />
            </div>
            {temple.name && !/radha damodar/i.test(temple.name) && (
              <h2 className="text-xs sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate max-w-[130px] sm:max-w-none">{temple.name}</h2>
            )}
          </div>

          {/* Global Search Bar Trigger */}
          <button
            data-tour="header-search"
            onClick={onOpenSearch}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-medium transition-colors w-72 lg:w-96 justify-between ml-4 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Search tasks, projects, meetings, users...</span>
            </span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[10px] text-slate-400 font-mono shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Action Controls, Announcements & Notifications */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Search Button */}
          <button
            data-tour="header-mobile-search"
            onClick={onOpenSearch}
            className="md:hidden p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title="Search SEVYA"
          >
            <Search className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </button>

          {/* Offline Status Badge in Header */}
          {!isOnline && (
            <div
              className="px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
              title="You are currently offline. Showing cached temple records."
            >
              <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-500" />
              <span className="hidden sm:inline">Offline</span>
            </div>
          )}

          {/* Theme Mode Toggle (Desktop & Mobile) */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          {/* 1. Header Announcements Component (Role-Filtered with Dropdown) */}
          <div className="relative" ref={announceRef}>
            <button
              data-tour="header-announcements"
              onClick={() => setShowAnnounceMenu(!showAnnounceMenu)}
              className={`p-1.5 sm:p-2 rounded-xl border transition-all relative flex items-center justify-center cursor-pointer ${
                showAnnounceMenu
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-amber-50/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
              title="Announcements"
            >
              <Megaphone className={`w-4 h-4 ${showAnnounceMenu ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
              {unreadAnnouncementsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 rounded-full text-[9px] font-black flex items-center justify-center shadow-xs">
                  {unreadAnnouncementsCount}
                </span>
              )}
            </button>

            {/* Announcements Dropdown Menu */}
            {showAnnounceMenu && (
              <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full mt-1 w-[calc(100vw-16px)] sm:w-96 max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header of Announcements dropdown */}
                <div className="px-4 py-3 bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-amber-300" />
                    <div>
                      <h3 className="text-xs font-black tracking-tight">Announcements</h3>
                      <p className="text-[10px] text-amber-200/80 font-medium">Role: {activeUser?.role?.replace('_', ' ')}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canCreateAnnouncement && (
                      <button
                        onClick={() => {
                          setShowAnnounceMenu(false);
                          setShowCreateModal(true);
                        }}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        title="Broadcast New Announcement"
                      >
                        <Plus className="w-3 h-3" /> Post
                      </button>
                    )}
                    {unreadAnnouncementsCount > 0 && onMarkAllAnnouncementsRead && (
                      <button
                        onClick={onMarkAllAnnouncementsRead}
                        className="text-[10px] text-amber-300 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-3 h-3" /> Mark read
                      </button>
                    )}
                  </div>
                </div>

                {/* Announcements List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {announcements.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <Megaphone className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No announcements yet</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">There are no active announcements posted for your role at this time.</p>
                    </div>
                  ) : (
                    announcements.map((item) => {
                      const priorityConfig = getPriorityBadge(item.priority);
                      const PriorityIcon = priorityConfig.icon;

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleAnnouncementClick(item)}
                          className={`p-3.5 transition-colors text-left space-y-1.5 cursor-pointer ${
                            !item.isRead ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70 dark:hover:bg-amber-950/40' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.pinned && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[9px] font-extrabold">
                                  <Pin className="w-2.5 h-2.5" /> Pinned
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold ${priorityConfig.bg}`}>
                                <PriorityIcon className="w-2.5 h-2.5" />
                                {priorityConfig.label}
                              </span>
                              {item.category && (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-semibold">
                                  {item.category}
                                </span>
                              )}
                            </div>

                            {!item.isRead && onMarkAnnouncementRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkAnnouncementRead(item.id);
                                }}
                                className="text-[10px] text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 font-bold shrink-0 cursor-pointer p-0.5"
                                title="Mark as read"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 leading-snug">{item.title}</h4>
                          <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed line-clamp-3 whitespace-pre-line">
                            {item.content}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                            <span>
                              {item.authorName ? `By ${item.authorName}` : 'Administration'} • {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                            </span>
                            {item.targetAudience && (
                              <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">
                                For: {item.targetAudience}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer of dropdown with expand link */}
                {onOpenAnnouncements && (
                  <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center flex items-center justify-between px-4">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      Showing {announcements.length} {announcements.length === 1 ? 'notice' : 'notices'}
                    </span>
                    <button
                      onClick={() => {
                        setShowAnnounceMenu(false);
                        onOpenAnnouncements();
                      }}
                      className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      View Board <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Notifications Bell Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              data-tour="header-notifications"
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className={`p-2 rounded-xl border transition-all relative flex items-center justify-center cursor-pointer ${
                showNotifMenu
                  ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900 dark:border-slate-700 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full mt-1 w-[calc(100vw-16px)] sm:w-80 max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-3 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-400" /> Notifications
                  </span>
                  {unreadNotifsCount > 0 && (
                    <button
                      onClick={onMarkAllNotificationsRead}
                      className="text-[10px] text-amber-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {(notifications || []).length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                      No recent notifications.
                    </div>
                  ) : (
                    (notifications || []).map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => {
                          if (onNotificationClick) onNotificationClick(notif);
                          setShowNotifMenu(false);
                        }}
                        className={`w-full text-left p-3 text-xs transition-colors cursor-pointer hover:bg-amber-50 dark:hover:bg-slate-800/80 ${
                          !notif.read ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'bg-white dark:bg-slate-900'
                        }`}
                      >
                        <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span>{notif.title}</span>
                          <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-1 line-clamp-2">{notif.message}</p>
                      </button>
                    ))
                  )}
                </div>

                {onViewAllNotifications && (
                  <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center">
                    <button
                      onClick={() => {
                        setShowNotifMenu(false);
                        onViewAllNotifications();
                      }}
                      className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:underline cursor-pointer"
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Authentication Action Button for unauthenticated state */}
          {!isAuthenticated && !authUser && (
            <button
              onClick={() => setShowAuthModal(true)}
              className="py-1.5 px-2.5 sm:px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">Sign In</span>
            </button>
          )}

          {/* Quick Assign Task Action - Only for Admin / Leader */}
          {canAssignTask && (
            <button
              onClick={onOpenCreateTaskModal}
              className="hidden sm:flex py-1.5 px-3.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl shadow-xs transition-all items-center gap-1.5 cursor-pointer shrink-0"
            >
              <UserCheck className="w-3.5 h-3.5" />
              + Assign Task
            </button>
          )}
        </div>
      </header>

      {/* Rich Announcement Form Modal */}
      <AnnouncementFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateAnnouncementSubmit}
        currentUser={activeUser}
      />

      {/* Rich Announcement Details Modal */}
      <AnnouncementDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedAnnouncement(null);
        }}
        announcement={selectedAnnouncement}
        currentUser={activeUser}
        onToggleRead={
          onMarkAnnouncementRead
            ? async (id) => {
                onMarkAnnouncementRead(id);
              }
            : undefined
        }
      />

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};


