import React, { useState, useEffect } from 'react';
import { Announcement, User } from '../types';
import {
  X,
  Megaphone,
  Pin,
  Calendar,
  Clock,
  Flame,
  AlertTriangle,
  Info,
  ShieldAlert,
  Send,
  Loader2,
  Users,
  Paperclip,
  Link2,
  Check,
} from 'lucide-react';

interface AnnouncementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Announcement>) => Promise<void>;
  editingAnnouncement?: Announcement | null;
  currentUser: User;
}

export const AnnouncementFormModal: React.FC<AnnouncementFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingAnnouncement,
  currentUser,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'normal' | 'low'>('normal');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userRole = (currentUser.role || 'member').toLowerCase();

  // Role permissions definitions
  const allRolesList = [
    { id: 'super_admin', label: 'Super Admin', desc: 'Trustee & executive level' },
    { id: 'temple_admin', label: 'Temple Admin', desc: 'Main operations leadership' },
    { id: 'department_head', label: 'Department Head', desc: 'Seva & department leads' },
    { id: 'coordinator', label: 'Coordinator', desc: 'Shift & task coordinators' },
    { id: 'member', label: 'Member', desc: 'Active temple members' },
  ];

  // Calculate allowed roles based on creator's role
  const isRoleAllowedToTarget = (roleId: string) => {
    if (userRole === 'super_admin' || userRole === 'temple_admin') return true;
    if (userRole === 'department_head' || userRole === 'leader') {
      return roleId !== 'super_admin' && roleId !== 'temple_admin';
    }
    if (userRole === 'coordinator') {
      return roleId === 'coordinator' || roleId === 'member';
    }
    return false;
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (editingAnnouncement) {
        setTitle(editingAnnouncement.title || '');
        setContent(editingAnnouncement.content || '');
        setCategory(editingAnnouncement.category || 'General');
        setPriority(editingAnnouncement.priority || 'normal');
        setTargetRoles(Array.isArray(editingAnnouncement.targetRoles) ? editingAnnouncement.targetRoles : []);
        setIsPinned(Boolean(editingAnnouncement.pinned));
        setAttachmentUrl(editingAnnouncement.attachmentUrl || '');
        setLinkUrl(editingAnnouncement.linkUrl || '');

        if (editingAnnouncement.scheduledAt && !editingAnnouncement.published) {
          setPublishMode('schedule');
          // Format ISO to local input datetime string (YYYY-MM-DDTHH:mm)
          try {
            const d = new Date(editingAnnouncement.scheduledAt);
            const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            setScheduledAt(localIso);
          } catch (e) {
            setScheduledAt('');
          }
        } else {
          setPublishMode('now');
          setScheduledAt('');
        }
      } else {
        // Defaults for new announcement
        setTitle('');
        setContent('');
        setCategory('General');
        setPriority('normal');
        // Default target roles
        if (userRole === 'super_admin' || userRole === 'temple_admin') {
          setTargetRoles(['super_admin', 'temple_admin', 'department_head', 'coordinator', 'member']);
        } else if (userRole === 'department_head') {
          setTargetRoles(['department_head', 'coordinator', 'member']);
        } else {
          setTargetRoles(['coordinator', 'member']);
        }
        setIsPinned(false);
        setPublishMode('now');
        setScheduledAt('');
        setAttachmentUrl('');
        setLinkUrl('');
      }
    }
  }, [isOpen, editingAnnouncement, currentUser]);

  if (!isOpen) return null;

  const categories = [
    'General',
    'Festival & Event',
    'Seva Call',
    'Security Guidance',
    'Trustee Notice',
    'Worship Schedule',
    'Member Notice',
  ];

  const handleRoleToggle = (roleId: string) => {
    if (!isRoleAllowedToTarget(roleId)) return;

    setTargetRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleSelectAllAllowedRoles = () => {
    const allowed = allRolesList.filter((r) => isRoleAllowedToTarget(r.id)).map((r) => r.id);
    if (targetRoles.length === allowed.length) {
      setTargetRoles([]);
    } else {
      setTargetRoles(allowed);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an announcement title.');
      return;
    }
    if (!content.trim()) {
      setError('Please provide announcement message details.');
      return;
    }
    if (targetRoles.length === 0) {
      setError('Please select at least one target audience role.');
      return;
    }
    if (publishMode === 'schedule') {
      if (!scheduledAt) {
        setError('Please choose a valid schedule date and time.');
        return;
      }
      if (new Date(scheduledAt) <= new Date()) {
        setError('Scheduled date & time must be in the future.');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        category,
        priority,
        targetRoles,
        pinned: isPinned,
        publishMode,
        scheduledAt: publishMode === 'schedule' ? new Date(scheduledAt).toISOString() : null,
        published: publishMode === 'now',
        attachmentUrl: attachmentUrl.trim(),
        linkUrl: linkUrl.trim(),
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save announcement.');
    } finally {
      setLoading(false);
    }
  };

  const nowFormattedForInput = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/15 text-amber-900 flex items-center justify-center border border-amber-500/30 shrink-0">
              <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Broadcast vital notices, seva updates, and alerts to targeted roles
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Announcement Title *</span>
              <span className="text-[10px] text-slate-400 font-normal">{title.length}/120</span>
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Maha Shivaratri Seva Roster & Security Guidelines"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Notice Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Urgency & Priority</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['low', 'normal', 'high', 'urgent'] as const).map((p) => {
                  const isSelected = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 px-1 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer text-center ${
                        isSelected
                          ? p === 'urgent'
                            ? 'bg-rose-500 text-white border-rose-600 shadow-2xs'
                            : p === 'high'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                            : p === 'low'
                            ? 'bg-slate-700 text-white border-slate-800 shadow-2xs'
                            : 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Target Audience Roles (RBAC enforced) */}
          <div className="space-y-2.5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-700" /> Target Audience Roles *
              </label>
              <button
                type="button"
                onClick={handleSelectAllAllowedRoles}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer"
              >
                Toggle All Allowed
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Only users assigned to the selected roles will receive this notification and see it in their board.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {allRolesList.map((role) => {
                const isAllowed = isRoleAllowedToTarget(role.id);
                const isSelected = targetRoles.includes(role.id);

                return (
                  <div
                    key={role.id}
                    onClick={() => isAllowed && handleRoleToggle(role.id)}
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                      !isAllowed
                        ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                        : isSelected
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-950 cursor-pointer'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center transition-colors shrink-0 ${
                        isSelected
                          ? 'bg-amber-600 border-amber-700 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-none">{role.label}</div>
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        {!isAllowed ? 'Not authorized for your role' : role.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content / Message */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Detailed Message / Content *</label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the full announcement announcement text, seva instructions, or safety guidelines..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Publishing Schedule & Pin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
            {/* Timing */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Publish Timing</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPublishMode('now')}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    publishMode === 'now'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Publish Now
                </button>
                <button
                  type="button"
                  onClick={() => setPublishMode('schedule')}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    publishMode === 'schedule'
                      ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Schedule Later
                </button>
              </div>

              {publishMode === 'schedule' && (
                <div className="pt-1.5 space-y-1 animate-in fade-in duration-150">
                  <label className="text-[11px] font-semibold text-purple-900">Auto-publish at (Local Time):</label>
                  <input
                    type="datetime-local"
                    min={nowFormattedForInput}
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              )}
            </div>

            {/* Pinned toggle & Optional Attachment */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Priority Placement</label>
                <button
                  type="button"
                  onClick={() => setIsPinned(!isPinned)}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isPinned
                      ? 'bg-amber-100/70 border-amber-300 text-amber-950'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    <Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-amber-700' : 'text-slate-400'}`} />
                    Pin to Top of Feed
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider">{isPinned ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Optional Attachment & Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" /> Attachment URL (Optional)
              </label>
              <input
                type="url"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://example.com/roster.pdf"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5 text-slate-400" /> Info Link URL (Optional)
              </label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com/event"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {editingAnnouncement ? 'Save Changes' : publishMode === 'schedule' ? 'Schedule Announcement' : 'Publish Announcement'}
          </button>
        </div>
      </div>
    </div>
  );
};
