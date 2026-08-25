import React, { useState } from 'react';
import { Announcement, User } from '../types';
import { api } from '../services/api';
import { AnnouncementDetailsModal } from './AnnouncementDetailsModal';
import { AnnouncementFormModal } from './AnnouncementFormModal';
import {
  Megaphone,
  Plus,
  Search,
  Calendar,
  Pencil,
  Trash2,
  ExternalLink,
  Tag,
  Flame,
  Pin,
  Clock,
  Eye,
  CheckCircle2,
  Paperclip,
  Users
} from 'lucide-react';

interface AnnouncementsViewProps {
  currentUser: User;
  announcements: Announcement[];
  onRefresh: () => void;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  currentUser,
  announcements = [],
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modals state
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const canManage =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'temple_admin' ||
    currentUser.role === 'department_head' ||
    currentUser.role === 'coordinator';

  const categories = [
    'General',
    'Festival & Event',
    'Seva Call',
    'Security Guidance',
    'Trustee Notice',
    'Worship Schedule',
    'Member Notice',
  ];

  const handleOpenCreate = () => {
    setEditingAnnouncement(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (ann: Announcement, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAnnouncement(ann);
    setIsDetailsModalOpen(false);
    setIsFormModalOpen(true);
  };

  const handleOpenDetails = (ann: Announcement) => {
    setSelectedAnnouncement(ann);
    setIsDetailsModalOpen(true);
  };

  const handleFormSubmit = async (data: Partial<Announcement>) => {
    if (editingAnnouncement) {
      await api.updateAnnouncement(editingAnnouncement.id, data);
    } else {
      await api.createAnnouncement({
        ...data,
        templeId: currentUser.templeId || undefined,
      });
    }
    setIsFormModalOpen(false);
    setEditingAnnouncement(null);
    onRefresh();
  };

  const handleDeleteAnnouncement = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.deleteAnnouncement(id);
      if (selectedAnnouncement?.id === id) {
        setIsDetailsModalOpen(false);
        setSelectedAnnouncement(null);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete announcement.');
    }
  };

  const handleTogglePin = async (ann: Announcement, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.updateAnnouncement(ann.id, { pinned: !ann.pinned });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update pin status.');
    }
  };

  const handleToggleRead = async (id: string, currentRead: boolean) => {
    try {
      if (currentRead) {
        await api.markAnnouncementUnread(id);
      } else {
        await api.markAnnouncementRead(id);
      }
      onRefresh();
    } catch (err: any) {
      console.error('Failed to toggle announcement read state:', err);
    }
  };

  // Filter announcements
  const filtered = announcements.filter((item) => {
    const matchesSearch =
      (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.content || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === 'all' || item.category === categoryFilter;
    const matchesPriority =
      priorityFilter === 'all' || item.priority === priorityFilter;

    return matchesSearch && matchesCategory && matchesPriority;
  });

  // Sort pinned to top, then by creation date descending
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            Announcements
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Official announcements, devotional updates, and schedule notices
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreate}
            className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Announcement
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search announcements by keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High Priority</option>
            <option value="normal">Normal</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Real Announcements Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800/60">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {searchTerm || categoryFilter !== 'all' || priorityFilter !== 'all'
                  ? 'No announcements match your filter'
                  : 'No announcements yet'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm || categoryFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try adjusting your search query or filter settings to view other announcements.'
                  : 'There are currently no active announcements. Authorized administrators can broadcast updates using the button above.'}
              </p>
            </div>
          </div>
        ) : (
          sorted.map((item) => {
            const isHighPriority = item.priority === 'high' || item.priority === 'urgent';
            const isRead = Boolean(item.isRead || item.read);

            return (
              <div
                key={item.id}
                onClick={() => handleOpenDetails(item)}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-amber-400/80 dark:hover:border-amber-500/80 group ${
                  item.pinned
                    ? 'border-amber-400 dark:border-amber-600/70 bg-gradient-to-br from-amber-50/40 dark:from-amber-950/20 via-white dark:via-slate-900 to-white dark:to-slate-900'
                    : isHighPriority
                    ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                    : 'border-slate-200 dark:border-slate-800'
                } ${!item.active && item.active !== undefined ? 'opacity-70' : ''}`}
              >
                <div className="space-y-3">
                  {/* Top Badges & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.pinned && (
                        <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 uppercase tracking-wider shadow-2xs">
                          <Pin className="w-3 h-3 fill-slate-950 text-slate-950" /> Pinned
                        </span>
                      )}

                      {isHighPriority && (
                        <span className="bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 uppercase tracking-wider">
                          <Flame className="w-3 h-3 fill-rose-600 dark:fill-rose-400 text-rose-600 dark:text-rose-400" />
                          {item.priority === 'urgent' ? 'Urgent' : 'High Priority'}
                        </span>
                      )}

                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        {item.category || 'General'}
                      </span>

                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Unread notice" />
                      )}
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(item, e)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            item.pinned
                              ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700'
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-amber-600 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}
                          title={item.pinned ? 'Unpin announcement' : 'Pin to top'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(item, e)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                          title="Edit Announcement"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteAnnouncement(item.id, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                          title="Delete Announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(item.createdAt || Date.now()).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>

                  <div className="flex items-center gap-3">
                    {item.attachmentUrl && (
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                        <Paperclip className="w-3 h-3" /> Attachment
                      </span>
                    )}

                    {item.linkUrl && (
                      <a
                        href={item.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-amber-700 dark:text-amber-400 hover:underline font-bold flex items-center gap-1"
                      >
                        Link <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rich Announcement Form Modal (Create & Edit) */}
      <AnnouncementFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingAnnouncement(null);
        }}
        onSubmit={handleFormSubmit}
        editingAnnouncement={editingAnnouncement}
        currentUser={currentUser}
      />

      {/* Rich Announcement Details Modal */}
      <AnnouncementDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedAnnouncement(null);
        }}
        announcement={selectedAnnouncement}
        currentUser={currentUser}
        onEditAnnouncement={(ann) => handleOpenEdit(ann)}
        onDeleteAnnouncement={(id) => handleDeleteAnnouncement(id)}
        onToggleRead={handleToggleRead}
      />
    </div>
  );
};
