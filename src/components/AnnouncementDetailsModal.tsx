import React, { useState } from 'react';
import { Announcement, User } from '../types';
import { api } from '../services/api';
import {
  X,
  Megaphone,
  Pin,
  Calendar,
  Clock,
  User as UserIcon,
  Tag,
  Flame,
  AlertTriangle,
  Info,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Paperclip,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Users,
  Send,
  Loader2,
} from 'lucide-react';

interface AnnouncementDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement | null;
  currentUser: User;
  onUpdateAnnouncement?: (updated: Announcement) => void;
  onDeleteAnnouncement?: (id: string) => void;
  onEditAnnouncement?: (announcement: Announcement) => void;
  onToggleRead?: (id: string, currentRead: boolean) => Promise<void>;
}

export const AnnouncementDetailsModal: React.FC<AnnouncementDetailsModalProps> = ({
  isOpen,
  onClose,
  announcement,
  currentUser,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onEditAnnouncement,
  onToggleRead,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isTogglingRead, setIsTogglingRead] = useState(false);

  if (!isOpen || !announcement) return null;

  const userRole = (currentUser.role || 'member').toLowerCase();
  const isAuthor = announcement.createdBy === currentUser.id;

  // Authorization checks
  const canEdit =
    userRole === 'super_admin' ||
    userRole === 'temple_admin' ||
    (userRole === 'department_head' && (isAuthor || !announcement.targetRoles?.includes('super_admin'))) ||
    (userRole === 'coordinator' && isAuthor);

  const canDelete =
    userRole === 'super_admin' ||
    userRole === 'temple_admin' ||
    ((userRole === 'department_head' || userRole === 'coordinator') && isAuthor);

  const isRead = Boolean(announcement.isRead ?? announcement.read);

  const getPriorityConfig = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return {
          label: 'Urgent Priority',
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          badge: 'bg-rose-500 text-white',
          icon: Flame,
        };
      case 'high':
        return {
          label: 'High Priority',
          bg: 'bg-amber-50 text-amber-900 border-amber-300',
          badge: 'bg-amber-500 text-white',
          icon: AlertTriangle,
        };
      case 'low':
        return {
          label: 'Low Priority',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          badge: 'bg-slate-500 text-white',
          icon: Info,
        };
      default:
        return {
          label: 'Normal Notice',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          badge: 'bg-blue-600 text-white',
          icon: Info,
        };
    }
  };

  const priorityConfig = getPriorityConfig(announcement.priority);
  const PriorityIcon = priorityConfig.icon;

  const formatRoleLabel = (role: string) => {
    switch (role.toLowerCase()) {
      case 'super_admin':
        return 'Super Admin';
      case 'temple_admin':
        return 'Temple Admin';
      case 'department_head':
        return 'Department Head';
      case 'coordinator':
        return 'Coordinator';
      case 'member':
        return 'Devotee / Member';
      case 'all':
        return 'All Devotees & Staff';
      default:
        return role;
    }
  };

  const handleToggleReadStatus = async () => {
    if (onToggleRead) {
      try {
        setIsTogglingRead(true);
        await onToggleRead(announcement.id, isRead);
      } finally {
        setIsTogglingRead(false);
      }
    } else {
      try {
        setIsTogglingRead(true);
        if (isRead) {
          await api.markAnnouncementUnread(announcement.id);
          if (onUpdateAnnouncement) {
            onUpdateAnnouncement({ ...announcement, read: false, isRead: false, readAt: null });
          }
        } else {
          await api.markAnnouncementRead(announcement.id);
          if (onUpdateAnnouncement) {
            onUpdateAnnouncement({ ...announcement, read: true, isRead: true, readAt: new Date().toISOString() });
          }
        }
      } catch (err) {
        console.error('Error toggling read status:', err);
      } finally {
        setIsTogglingRead(false);
      }
    }
  };

  const handleDeleteConfirmed = async () => {
    try {
      setIsDeleting(true);
      await api.deleteAnnouncement(announcement.id);
      if (onDeleteAnnouncement) {
        onDeleteAnnouncement(announcement.id);
      }
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to delete announcement');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50/50 via-white to-slate-50 flex items-start justify-between gap-3 sm:gap-4 shrink-0">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {announcement.pinned && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black">
                  <Pin className="w-3 h-3 text-amber-700" /> Pinned Notice
                </span>
              )}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-black ${priorityConfig.bg}`}>
                <PriorityIcon className="w-3.5 h-3.5" />
                {priorityConfig.label}
              </span>
              {announcement.category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  <Tag className="w-3 h-3 text-slate-400" />
                  {announcement.category}
                </span>
              )}
              {!announcement.published && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-black">
                  <Clock className="w-3 h-3" />
                  Scheduled: {announcement.scheduledAt ? new Date(announcement.scheduledAt).toLocaleString() : 'Draft'}
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-900 leading-snug">{announcement.title}</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Metadata bar */}
          <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 font-medium">
                <UserIcon className="w-3.5 h-3.5 text-amber-700" />
                Author: <strong className="text-slate-900">{announcement.authorName || 'Temple Administration'}</strong>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Posted: <strong className="text-slate-900">{new Date(announcement.createdAt).toLocaleString()}</strong>
              </span>
            </div>

            {/* Read status tag */}
            <div className="flex items-center gap-1.5">
              {isRead ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Read
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold animate-pulse">
                  Unread
                </span>
              )}
            </div>
          </div>

          {/* Target Audience Roles */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-700" /> Target Audience
            </h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              {announcement.targetRoles && announcement.targetRoles.length > 0 ? (
                announcement.targetRoles.map((role) => (
                  <span
                    key={role}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold"
                  >
                    {formatRoleLabel(role)}
                  </span>
                ))
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                  {announcement.targetAudience || 'All Devotees & Staff'}
                </span>
              )}
            </div>
          </div>

          {/* Full Announcement Text / Message */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Announcement Details</h4>
            <div className="p-5 bg-white rounded-2xl border border-slate-200 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap selection:bg-amber-100">
              {announcement.content}
            </div>
          </div>

          {/* Attachments / Links if present */}
          {(announcement.attachmentUrl || announcement.linkUrl) && (
            <div className="space-y-2 pt-2">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Related Resources</h4>
              <div className="flex flex-col gap-2">
                {announcement.attachmentUrl && (
                  <a
                    href={announcement.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-amber-50/60 hover:bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs font-bold text-amber-900 transition-colors cursor-pointer group"
                  >
                    <span className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-amber-700 group-hover:scale-110 transition-transform" />
                      Attached File / Document
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
                  </a>
                )}
                {announcement.linkUrl && (
                  <a
                    href={announcement.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-blue-50/60 hover:bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs font-bold text-blue-900 transition-colors cursor-pointer group"
                  >
                    <span className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-blue-700 group-hover:scale-110 transition-transform" />
                      External Information Link
                    </span>
                    <span className="text-[10px] text-blue-600 underline truncate max-w-xs">{announcement.linkUrl}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Read / Unread toggle */}
          <button
            type="button"
            disabled={isTogglingRead}
            onClick={handleToggleReadStatus}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              isRead
                ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-2xs'
            }`}
          >
            {isTogglingRead ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isRead ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400" /> Mark as Unread
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Read
              </>
            )}
          </button>

          {/* Right: Edit & Delete controls */}
          <div className="flex items-center gap-2">
            {canEdit && onEditAnnouncement && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditAnnouncement(announcement);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Pencil className="w-3.5 h-3.5 text-amber-700" /> Edit
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-800 hover:bg-slate-300 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900">Delete this announcement?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  This will permanently remove &quot;{announcement.title}&quot; from all role feeds. This action cannot be undone.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteConfirmed}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
