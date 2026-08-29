import React, { useState, useMemo } from 'react';
import { User, Notification } from '../types';
import {
  Bell,
  CheckCheck,
  Trash2,
  CheckCircle2,
  Clock,
  CheckSquare,
  Calendar,
  FileCheck,
  MessageSquare,
  UserCheck,
  HeartHandshake,
  Megaphone,
  Inbox,
  Filter,
  Check,
} from 'lucide-react';

interface NotificationsViewProps {
  currentUser: User;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAllNotifications: () => void;
  onNavigateTab?: (tab: string, entityId?: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  currentUser,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDeleteNotification,
  onClearAllNotifications,
  onNavigateTab,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'tasks' | 'meetings' | 'approvals' | 'feedback'>('all');

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'unread') return !n.read;
      if (filter === 'tasks') {
        const t = (n.type || '').toLowerCase();
        return t.includes('task') || t.includes('due') || t.includes('overdue') || t.includes('proof');
      }
      if (filter === 'meetings') {
        const t = (n.type || '').toLowerCase();
        return t.includes('meeting') || t.includes('zoom');
      }
      if (filter === 'approvals') {
        const t = (n.type || '').toLowerCase();
        return t.includes('approval') || t.includes('proof_approved') || t.includes('proof_rejected');
      }
      if (filter === 'feedback') {
        const t = (n.type || '').toLowerCase();
        return t.includes('feedback');
      }
      return true;
    });
  }, [notifications, filter]);

  // Format timestamp into clean, friendly human format (Today, 10:30 AM / Yesterday, 9:15 AM / Aug 12, 10:30 AM)
  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (isToday) {
        return `Today, ${timeStr}`;
      }
      if (isYesterday) {
        return `Yesterday, ${timeStr}`;
      }
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    } catch {
      return dateStr;
    }
  };

  // Get relevant icon according to notification type
  const getNotificationIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('task') || t.includes('due') || t.includes('overdue')) {
      return <CheckSquare className="w-4 h-4 text-amber-600" />;
    }
    if (t.includes('meeting') || t.includes('zoom')) {
      return <Calendar className="w-4 h-4 text-blue-600" />;
    }
    if (t.includes('proof') || t.includes('approval')) {
      return <FileCheck className="w-4 h-4 text-emerald-600" />;
    }
    if (t.includes('feedback')) {
      return <MessageSquare className="w-4 h-4 text-purple-600" />;
    }
    if (t.includes('secretary')) {
      return <UserCheck className="w-4 h-4 text-teal-600" />;
    }
    if (t.includes('volunteer') || t.includes('seva')) {
      return <HeartHandshake className="w-4 h-4 text-orange-600" />;
    }
    if (t.includes('announcement')) {
      return <Megaphone className="w-4 h-4 text-rose-600" />;
    }
    return <Bell className="w-4 h-4 text-amber-600" />;
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.read) {
      onMarkRead(notif.id);
    }
    if (!onNavigateTab) return;

    const t = (notif.type || '').toLowerCase();
    if (t.includes('task') || t.includes('due') || t.includes('overdue')) {
      if (currentUser.role === 'member') {
        onNavigateTab('dashboard', notif.linkId);
      } else {
        onNavigateTab('tasks', notif.linkId);
      }
    } else if (t.includes('meeting') || t.includes('zoom')) {
      onNavigateTab('meetings', notif.linkId);
    } else if (t.includes('feedback')) {
      onNavigateTab('feedback', notif.linkId);
    } else if (t.includes('approval') || t.includes('proof')) {
      if (currentUser.role === 'member') {
        onNavigateTab('approvals', notif.linkId);
      } else {
        onNavigateTab('proofs', notif.linkId);
      }
    } else if (t.includes('secretary')) {
      onNavigateTab('secretaries');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-[10px] sm:text-xs font-extrabold rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time updates on your tasks, committee meetings, feedback, and approvals.
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="px-3 py-2 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            >
              <CheckCheck className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              Mark all as read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all notifications?')) {
                  onClearAllNotifications();
                }
              }}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Clear all notifications"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All', count: notifications.length },
          { id: 'unread', label: 'Unread', count: unreadCount },
          { id: 'tasks', label: 'Tasks', count: notifications.filter(n => (n.type || '').toLowerCase().includes('task')).length },
          { id: 'meetings', label: 'Meetings', count: notifications.filter(n => (n.type || '').toLowerCase().includes('meeting')).length },
          { id: 'approvals', label: 'Approvals', count: notifications.filter(n => (n.type || '').toLowerCase().includes('approval') || (n.type || '').toLowerCase().includes('proof')).length },
          { id: 'feedback', label: 'Feedback', count: notifications.filter(n => (n.type || '').toLowerCase().includes('feedback')).length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filter === tab.id
                ? 'bg-slate-900 dark:bg-amber-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/80 shadow-2xs overflow-hidden transition-colors">
        {filteredNotifications.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No notifications found</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {filter === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : 'You do not have any notifications matching this filter.'}
              </p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isUnread = !notif.read;
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors cursor-pointer group ${
                  isUnread
                    ? 'bg-amber-50/30 dark:bg-amber-950/20 hover:bg-amber-50/60 dark:hover:bg-amber-950/40'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Icon Indicator */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                      isUnread
                        ? 'bg-amber-100/70 dark:bg-amber-900/40 border-amber-300 dark:border-amber-800 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Message details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`text-xs sm:text-sm tracking-tight ${
                          isUnread
                            ? 'font-bold text-slate-900 dark:text-slate-100'
                            : 'font-semibold text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {notif.title}
                      </h3>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400 shrink-0" title="Unread" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(notif.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions per item */}
                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  {isUnread && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkRead(notif.id);
                      }}
                      className="p-1.5 text-slate-400 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-950/60 rounded-lg transition-colors cursor-pointer"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNotification(notif.id);
                    }}
                    className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Delete notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
