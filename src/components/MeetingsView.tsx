import React, { useState, useEffect, useMemo } from 'react';
import { Meeting, Project, Department, User, Task, UserRole } from '../types';
import {
  Calendar,
  Sparkles,
  Plus,
  Users,
  MapPin,
  Trash2,
  Edit,
  X,
  FileText,
  ArrowRight,
  Clock,
  Video,
  ExternalLink,
  Copy,
  Check,
  Crown,
  Play,
  PhoneOff,
  AlertCircle,
  Globe,
  Mail,
  Send,
  Loader2,
  Search,
  Filter,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { formatDate } from '../utils/taskUtils';
import { api } from '../services/api';
import { RowContextMenu, ContextMenuAction } from './RowContextMenu';
import { getRoleDisplayName, normalizeRole } from '../utils/roleHierarchy';

interface MeetingsViewProps {
  meetings: Meeting[];
  projects: Project[];
  departments: Department[];
  users: User[];
  tasks: Task[];
  currentUser: User;
  onCreateMeeting: (data: any) => void;
  onUpdateMeeting?: (meetingId: string, data: any) => Promise<any>;
  onDeleteMeeting: (meetingId: string) => void;
}

export const MeetingsView: React.FC<MeetingsViewProps> = ({
  meetings = [],
  projects = [],
  departments = [],
  users = [],
  tasks = [],
  currentUser,
  onCreateMeeting,
  onUpdateMeeting,
  onDeleteMeeting,
}) => {
  // Navigation & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'zoom' | 'google_meet' | 'standard'>('all');
  const [viewFilter, setViewFilter] = useState<'all' | 'my_meetings'>('all');

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMeetingType, setCreateMeetingType] = useState<'zoom' | 'google_meet' | 'standard'>('zoom');
  const [activeMeetingDetail, setActiveMeetingDetail] = useState<Meeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  // Form State (Create / Edit)
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [location, setLocation] = useState('');
  const [projectId, setProjectId] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || 'dept-1');
  const [agenda, setAgenda] = useState('');
  const [rawNotes, setRawNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [actionItems, setActionItems] = useState<Array<{ title: string; ownerId: string; priority: 'low' | 'medium' | 'high'; dueDate: string }>>([]);

  // Async States
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Role permissions
  const normalizedRole = normalizeRole(currentUser.role);
  const isVolunteer = normalizedRole === 'volunteer' || normalizedRole === 'devotee';
  const canCreate = ['super_admin', 'temple_admin', 'leader', 'department_head', 'coordinator', 'facilitator'].includes(normalizedRole);

  const isHostUser = (mtg: Meeting) => {
    if (isVolunteer) return false;
    if (normalizedRole === 'super_admin' || normalizedRole === 'temple_admin') return true;
    if (mtg.hostId && mtg.hostId === currentUser.id) return true;
    if (mtg.organizerId === currentUser.id) return true;
    if (mtg.createdBy && (typeof mtg.createdBy === 'string' ? mtg.createdBy === currentUser.id : mtg.createdBy?.id === currentUser.id)) return true;
    return false;
  };

  const canEditOrDelete = (mtg: Meeting) => {
    if (normalizedRole === 'super_admin' || normalizedRole === 'temple_admin') return true;
    if (['leader', 'department_head', 'coordinator', 'facilitator'].includes(normalizedRole)) {
      if (isHostUser(mtg)) return true;
      if (mtg.departmentId && currentUser.departmentId === mtg.departmentId) return true;
    }
    return isHostUser(mtg);
  };

  // Role-based visibility
  const visibleMeetings = useMemo(() => {
    return meetings.filter((mtg) => {
      // 1. Role permission filter
      if (normalizedRole !== 'super_admin' && normalizedRole !== 'temple_admin') {
        const isHost = mtg.hostId === currentUser.id || mtg.organizerId === currentUser.id ||
          (mtg.createdBy && (typeof mtg.createdBy === 'string' ? mtg.createdBy === currentUser.id : mtg.createdBy?.id === currentUser.id));
        const isParticipant = mtg.participants && mtg.participants.includes(currentUser.id);
        const isAttending = mtg.attendance && mtg.attendance.some((a) => a.userId === currentUser.id);
        const isDeptMatch = mtg.departmentId && currentUser.departmentId === mtg.departmentId;

        if (!isHost && !isParticipant && !isAttending && !isDeptMatch) {
          return false;
        }
      }

      // 2. View Filter
      if (viewFilter === 'my_meetings') {
        const isMine = mtg.hostId === currentUser.id || mtg.organizerId === currentUser.id ||
          (mtg.participants && mtg.participants.includes(currentUser.id)) ||
          (mtg.attendance && mtg.attendance.some((a) => a.userId === currentUser.id));
        if (!isMine) return false;
      }

      // 3. Platform Filter
      if (platformFilter !== 'all') {
        const loc = (mtg.location || '').toLowerCase();
        const isGm = mtg.meetingPlatform === 'google_meet' || mtg.isGoogleMeet || loc.includes('meet.google.com') || !!(mtg as any).googleMeetUrl;
        const isZm = !isGm && (mtg.meetingPlatform === 'zoom' || mtg.isZoomMeeting || loc.includes('zoom') || !!mtg.zoomJoinUrl);

        if (platformFilter === 'google_meet' && !isGm) return false;
        if (platformFilter === 'zoom' && !isZm) return false;
        if (platformFilter === 'standard' && (isGm || isZm)) return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (mtg.title || '').toLowerCase().includes(q);
        const matchLocation = (mtg.location || '').toLowerCase().includes(q);
        const matchAgenda = (mtg.agenda || '').toLowerCase().includes(q);
        const matchSummary = (mtg.summary || '').toLowerCase().includes(q);
        if (!matchTitle && !matchLocation && !matchAgenda && !matchSummary) return false;
      }

      return true;
    });
  }, [meetings, normalizedRole, currentUser, viewFilter, platformFilter, searchQuery]);

  // Handle Target Role toggling for participant auto-selection
  const toggleTargetRole = (role: UserRole) => {
    setSelectedRoles((prev) => {
      const next = prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role];
      const matchedUserIds = users.filter((u) => next.includes(u.role)).map((u) => u.id);
      setSelectedUserIds(matchedUserIds);
      return next;
    });
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Open Create Modal
  const handleOpenCreateModal = (type: 'zoom' | 'google_meet' | 'standard' = 'zoom') => {
    setCreateMeetingType(type);
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('10:00');
    setDurationMinutes(45);
    setLocation(type === 'standard' ? 'Temple Meeting Hall' : '');
    setProjectId('');
    setDepartmentId(departments[0]?.id || 'dept-1');
    setAgenda('');
    setRawNotes('');
    setSummary('');
    setSelectedUserIds([currentUser.id]);
    setSelectedRoles([]);
    setActionItems([]);
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (mtg: Meeting) => {
    setEditingMeeting(mtg);
    setTitle(mtg.title || '');
    setDate(mtg.date || new Date().toISOString().split('T')[0]);
    setTime((mtg as any).time || '10:00');
    setDurationMinutes((mtg as any).durationMinutes || 45);
    setLocation(mtg.location || '');
    setProjectId(mtg.projectId || '');
    setDepartmentId(mtg.departmentId || departments[0]?.id || 'dept-1');
    setAgenda(mtg.agenda || '');
    setRawNotes(mtg.rawNotes || '');
    setSummary(mtg.summary || '');
    const participantIds = mtg.participants || (mtg.attendance ? mtg.attendance.map((a) => a.userId) : []);
    setSelectedUserIds(participantIds);
    setSelectedRoles([]);
    setShowCreateModal(false);
  };

  // Run AI Gemini Summarizer
  const handleRunAiSummary = async () => {
    if (!rawNotes.trim()) {
      alert('Please enter raw discussion notes or transcript first to run Gemini AI summarizer.');
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.generateAiMeetingSummary(rawNotes, title || 'Temple Meeting');
      setSummary(res.summary);
      if (Array.isArray(res.actionItems) && res.actionItems.length > 0) {
        const mappedItems = res.actionItems.map((item: any, idx: number) => ({
          title: item.title || `Action Point ${idx + 1}`,
          ownerId: (users || [])[idx % (users.length || 1)]?.id || currentUser.id,
          priority: (item.priority as any) || 'medium',
          dueDate: new Date(Date.now() + (item.suggestedDays || 3) * 86400000).toISOString().split('T')[0],
        }));
        setActionItems(mappedItems);
      }
    } catch {
      setSummary(`Discussion Summary for: ${title || 'Meeting'}\n• Core priorities and task allocation reviewed.\n• Key milestones tracked.`);
    } finally {
      setAiLoading(false);
    }
  };

  // Add Action Item
  const handleAddActionItem = () => {
    setActionItems((prev) => [
      ...prev,
      {
        title: '',
        ownerId: currentUser.id,
        priority: 'medium',
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      },
    ]);
  };

  // Submit Meeting Creation
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      alert('Title and date are required.');
      return;
    }

    const validActionItems = actionItems.filter((a) => a.title.trim());
    setSubmitting(true);

    try {
      if (createMeetingType === 'zoom') {
        const createdZoom = await api.createZoomMeeting({
          topic: title.trim(),
          date,
          time,
          durationMinutes: Number(durationMinutes),
          agenda,
          rawNotes,
          projectId: projectId || undefined,
          departmentId: departmentId || 'dept-1',
          participants: selectedUserIds,
          actionPoints: validActionItems,
        });
        onCreateMeeting(createdZoom);
        setShowCreateModal(false);
        setActionFeedback(`📹 Zoom Meeting created! Meeting ID: ${createdZoom.zoomMeetingId || 'Generated'}`);
      } else if (createMeetingType === 'google_meet') {
        const createdMeet = await api.createGoogleMeetMeeting({
          topic: title.trim(),
          date,
          time,
          durationMinutes: Number(durationMinutes),
          agenda,
          rawNotes,
          projectId: projectId || undefined,
          departmentId: departmentId || 'dept-1',
          participants: selectedUserIds,
          actionPoints: validActionItems,
        });
        onCreateMeeting(createdMeet);
        setShowCreateModal(false);
        setActionFeedback(`🌐 Google Meet scheduled successfully!`);
      } else {
        const attendance = selectedUserIds.map((uId) => ({
          userId: uId,
          status: 'present' as const,
        }));
        const createdStandard = await api.createMeeting({
          title: title.trim(),
          date,
          time,
          durationMinutes: Number(durationMinutes),
          location: location || 'Temple Meeting Hall',
          agenda,
          summary,
          rawNotes,
          projectId: projectId || undefined,
          departmentId: departmentId || undefined,
          organizerId: currentUser.id,
          hostId: currentUser.id,
          attendance,
          participants: selectedUserIds,
          actionPoints: validActionItems,
          meetingPlatform: 'standard',
        });
        onCreateMeeting(createdStandard);
        setShowCreateModal(false);
        setActionFeedback(`📅 Meeting scheduled successfully!`);
      }
    } catch (err: any) {
      alert(`Meeting creation error: ${err?.message || 'Please check your connection.'}`);
    } finally {
      setSubmitting(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Submit Meeting Update
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;
    if (!title.trim() || !date) {
      alert('Title and date are required.');
      return;
    }

    setSubmitting(true);
    try {
      const updateData = {
        title: title.trim(),
        date,
        time,
        durationMinutes: Number(durationMinutes),
        location,
        agenda,
        summary,
        rawNotes,
        projectId: projectId || null,
        departmentId: departmentId || 'dept-1',
        participants: selectedUserIds,
      };

      if (onUpdateMeeting) {
        await onUpdateMeeting(editingMeeting.id, updateData);
      } else {
        await api.updateMeeting(editingMeeting.id, updateData);
      }

      setEditingMeeting(null);
      setActionFeedback(`Meeting updated successfully!`);
    } catch (err: any) {
      alert(`Meeting update error: ${err?.message || 'Unable to update meeting'}`);
    } finally {
      setSubmitting(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Start Meeting as Host
  const handleStartMeeting = async (mtg: Meeting) => {
    try {
      const res = await api.startMeeting(mtg.id);
      const url = res.startUrl || res.joinUrl || mtg.zoomHostUrl || mtg.zoomJoinUrl || mtg.googleMeetUrl || 'https://zoom.us';
      window.open(url, '_blank');
      setActionFeedback(`🚀 Launched meeting as host!`);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch {
      const fallbackUrl = mtg.zoomHostUrl || mtg.zoomJoinUrl || mtg.googleMeetUrl || 'https://zoom.us';
      window.open(fallbackUrl, '_blank');
    }
  };

  // Join Meeting as Participant
  const handleJoinMeeting = (mtg: Meeting) => {
    const joinUrl = mtg.googleMeetUrl || mtg.zoomJoinUrl || (mtg.location?.includes('http') ? mtg.location : null);
    if (joinUrl) {
      window.open(joinUrl, '_blank');
    } else {
      alert(`Meeting Location: ${mtg.location || 'Temple Meeting Room'}`);
    }
  };

  // Copy Meeting Info
  const copyMeetingLink = (mtg: Meeting) => {
    const link = mtg.googleMeetUrl || mtg.zoomJoinUrl || mtg.zoomHostUrl || window.location.href;
    navigator.clipboard.writeText(link);
    setCopiedId(mtg.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const copyFullInvite = (mtg: Meeting) => {
    const loc = mtg.location || '';
    const isMeet = mtg.meetingPlatform === 'google_meet' || !!mtg.googleMeetUrl;
    const isZm = mtg.meetingPlatform === 'zoom' || !!mtg.zoomJoinUrl;
    const joinUrl = mtg.googleMeetUrl || mtg.zoomJoinUrl || loc;

    let inviteText = `SEVYA Meeting Invitation: ${mtg.title}\nDate: ${formatDate(mtg.date)} at ${(mtg as any).time || '10:00 AM'}\n`;
    if (isZm) {
      inviteText += `Platform: Zoom\nJoin Link: ${joinUrl}\nMeeting ID: ${mtg.zoomMeetingId || 'N/A'}\nPasscode: ${mtg.zoomPassword || 'N/A'}\n`;
    } else if (isMeet) {
      inviteText += `Platform: Google Meet\nJoin Link: ${joinUrl}\n`;
    } else {
      inviteText += `Location: ${loc}\n`;
    }
    if (mtg.agenda) inviteText += `Agenda: ${mtg.agenda}\n`;

    navigator.clipboard.writeText(inviteText);
    setCopiedId(`invite-${mtg.id}`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Conclude / End Meeting
  const handleEndMeeting = async (mtg: Meeting) => {
    if (!confirm(`Are you sure you want to conclude and record completion for "${mtg.title}"?`)) return;
    try {
      await api.endMeeting(mtg.id);
      if (onUpdateMeeting) {
        await onUpdateMeeting(mtg.id, {
          summary: mtg.summary ? `${mtg.summary}\n[STATUS: Meeting Concluded]` : `[STATUS: Meeting Concluded]`,
        });
      }
      setActionFeedback(`Meeting marked as concluded.`);
      setTimeout(() => setActionFeedback(null), 3000);
      setActiveMeetingDetail(null);
    } catch (err: any) {
      alert(err.message || 'Cannot conclude meeting');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Meetings & Conferences</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Organize Zoom conferences, Google Meets, and in-person temple gatherings.
              </p>
            </div>
          </div>
        </div>

        {/* Create Meeting Buttons */}
        {canCreate && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenCreateModal('zoom')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Video className="w-4 h-4" />
              Schedule Zoom
            </button>
            <button
              onClick={() => handleOpenCreateModal('google_meet')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              Schedule Google Meet
            </button>
            <button
              onClick={() => handleOpenCreateModal('standard')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              In-Person / Other
            </button>
          </div>
        )}
      </div>

      {/* Action Notification Banner */}
      {actionFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search meetings by title, agenda, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Platform & View Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* View Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-medium text-slate-600">
            <button
              onClick={() => setViewFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              All Meetings ({meetings.length})
            </button>
            <button
              onClick={() => setViewFilter('my_meetings')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewFilter === 'my_meetings' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              My Meetings
            </button>
          </div>

          {/* Platform Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-medium text-slate-600">
            <button
              onClick={() => setPlatformFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                platformFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setPlatformFilter('zoom')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                platformFilter === 'zoom' ? 'bg-blue-600 text-white shadow-2xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              <Video className="w-3 h-3" /> Zoom
            </button>
            <button
              onClick={() => setPlatformFilter('google_meet')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                platformFilter === 'google_meet' ? 'bg-emerald-600 text-white shadow-2xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              <Globe className="w-3 h-3" /> Meet
            </button>
            <button
              onClick={() => setPlatformFilter('standard')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                platformFilter === 'standard' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3 h-3" /> In-Person
            </button>
          </div>
        </div>
      </div>

      {/* Meetings Grid */}
      {visibleMeetings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No meetings found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? 'No meetings match your search query. Try clearing the search filter.'
              : 'No upcoming meetings scheduled for your account. Use the buttons above to schedule one.'}
          </p>
          {canCreate && !searchQuery && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => handleOpenCreateModal('zoom')}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5" /> Schedule Zoom Meeting
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleMeetings.map((mtg) => {
            const hostUserId = mtg.hostId || mtg.organizerId || (typeof mtg.createdBy === 'string' ? mtg.createdBy : mtg.createdBy?.id);
            const hostUser = users.find((u) => u.id === hostUserId);
            const hostName = hostUser?.name || 'Temple Coordinator';
            const locationStr = mtg.location || '';
            const isGoogleMeet = mtg.meetingPlatform === 'google_meet' || mtg.isGoogleMeet || locationStr.includes('meet.google.com') || !!(mtg as any).googleMeetUrl;
            const isZoom = !isGoogleMeet && (mtg.meetingPlatform === 'zoom' || mtg.isZoomMeeting || locationStr.includes('zoom') || !!mtg.zoomJoinUrl);
            const isHost = isHostUser(mtg);
            const canManage = canEditOrDelete(mtg);
            const actionTaskCount = mtg.actionPointTaskIds?.length || 0;
            const participantCount = mtg.participants?.length || mtg.attendance?.length || 0;
            const dept = departments.find((d) => d.id === mtg.departmentId);

            // Context Menu Actions
            const contextActions: ContextMenuAction[] = [
              {
                id: 'details',
                label: 'View Meeting Details & MOM',
                icon: FileText,
                onClick: () => setActiveMeetingDetail(mtg),
              },
              ...(isHost
                ? [
                    {
                      id: 'start-host',
                      label: 'Start Meeting as Host',
                      icon: Play,
                      onClick: () => handleStartMeeting(mtg),
                    },
                  ]
                : [
                    {
                      id: 'join',
                      label: 'Join Meeting',
                      icon: Video,
                      onClick: () => handleJoinMeeting(mtg),
                    },
                  ]),
              {
                id: 'copy-link',
                label: 'Copy Meeting Link',
                icon: Copy,
                onClick: () => copyMeetingLink(mtg),
              },
              {
                id: 'copy-invite',
                label: 'Copy Full Invitation',
                icon: Share2,
                onClick: () => copyFullInvite(mtg),
              },
              ...(canManage
                ? [
                    {
                      id: 'edit',
                      label: 'Edit Meeting',
                      icon: Edit,
                      onClick: () => handleOpenEditModal(mtg),
                    },
                    {
                      id: 'delete',
                      label: 'Delete Meeting',
                      icon: Trash2,
                      variant: 'danger' as const,
                      onClick: () => {
                        if (confirm(`Delete meeting "${mtg.title}"?`)) {
                          onDeleteMeeting(mtg.id);
                        }
                      },
                    },
                  ]
                : []),
            ];

            return (
              <div
                key={mtg.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Header & Badges */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    {/* Platform Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isZoom ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                          <Video className="w-3 h-3" /> Zoom
                        </span>
                      ) : isGoogleMeet ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <Globe className="w-3 h-3" /> Google Meet
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <MapPin className="w-3 h-3" /> In-Person
                        </span>
                      )}

                      {dept && (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                          {dept.name}
                        </span>
                      )}
                    </div>

                    {/* Context Menu */}
                    <RowContextMenu actions={contextActions} />
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => setActiveMeetingDetail(mtg)}
                    className="text-base font-bold text-slate-900 line-clamp-1 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    {mtg.title}
                  </h3>

                  {/* Date & Time */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(mtg.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {(mtg as any).time || '10:00 AM'}
                    </span>
                  </div>

                  {/* Host info & Location */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate">
                      Host: <b className="text-slate-700">{hostName}</b>
                    </span>
                    {participantCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                        <Users className="w-3 h-3" /> {participantCount}
                      </span>
                    )}
                  </div>

                  {/* Zoom Meeting ID & Passcode summary if Zoom */}
                  {isZoom && mtg.zoomMeetingId && (
                    <div className="mt-2 bg-blue-50/60 border border-blue-100/80 rounded-xl px-3 py-1.5 text-[11px] text-blue-900 flex items-center justify-between">
                      <span className="truncate">
                        ID: <b>{mtg.zoomMeetingId}</b>
                      </span>
                      {mtg.zoomPassword && (
                        <span className="text-blue-700 font-mono text-[10px] bg-blue-100/70 px-1.5 py-0.5 rounded">
                          Pass: {mtg.zoomPassword}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Agenda snippet */}
                  {mtg.agenda && (
                    <p className="mt-2 text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {mtg.agenda}
                    </p>
                  )}
                </div>

                {/* Card Footer Actions (Simple, Clean, Minimal) */}
                <div className="p-4 pt-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setActiveMeetingDetail(mtg)}
                    className="text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    Details <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Copy Link */}
                    <button
                      onClick={() => copyMeetingLink(mtg)}
                      title="Copy meeting link"
                      className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                    >
                      {copiedId === mtg.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>

                    {/* Launch / Join Button */}
                    {isHost ? (
                      <button
                        onClick={() => handleStartMeeting(mtg)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Start as Host
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinMeeting(mtg)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" /> Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SIMPLE, CLEAN, MINIMAL MEETING DETAILS MODAL */}
      {/* ========================================================================= */}
      {activeMeetingDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {activeMeetingDetail.meetingPlatform === 'zoom' || activeMeetingDetail.isZoomMeeting ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      <Video className="w-3 h-3" /> Zoom Meeting
                    </span>
                  ) : activeMeetingDetail.meetingPlatform === 'google_meet' || activeMeetingDetail.isGoogleMeet ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Globe className="w-3 h-3" /> Google Meet
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      <MapPin className="w-3 h-3" /> In-Person Gathering
                    </span>
                  )}
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 font-medium">
                    {formatDate(activeMeetingDetail.date)} at {(activeMeetingDetail as any).time || '10:00 AM'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">{activeMeetingDetail.title}</h2>
              </div>
              <button
                onClick={() => setActiveMeetingDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Meeting Access Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-500 font-medium block">Meeting Link & Credentials</span>
                    <span className="text-slate-900 font-mono text-[11px] break-all">
                      {activeMeetingDetail.googleMeetUrl || activeMeetingDetail.zoomJoinUrl || activeMeetingDetail.location || 'Temple Hall'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyMeetingLink(activeMeetingDetail)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === activeMeetingDetail.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy Link
                    </button>
                    <button
                      onClick={() => copyFullInvite(activeMeetingDetail)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Copy Invite
                    </button>
                  </div>
                </div>

                {activeMeetingDetail.zoomMeetingId && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-400">Meeting ID:</span>{' '}
                      <b className="text-slate-800 font-mono">{activeMeetingDetail.zoomMeetingId}</b>
                    </div>
                    {activeMeetingDetail.zoomPassword && (
                      <div>
                        <span className="text-slate-400">Passcode:</span>{' '}
                        <b className="text-slate-800 font-mono">{activeMeetingDetail.zoomPassword}</b>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Host & Attendees */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-500" /> Host & Participants
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {users
                    .filter((u) => {
                      const hostId = activeMeetingDetail.hostId || activeMeetingDetail.organizerId || (typeof activeMeetingDetail.createdBy === 'string' ? activeMeetingDetail.createdBy : activeMeetingDetail.createdBy?.id);
                      if (u.id === hostId) return true;
                      if (activeMeetingDetail.participants?.includes(u.id)) return true;
                      if (activeMeetingDetail.attendance?.some((a) => a.userId === u.id)) return true;
                      return false;
                    })
                    .map((u) => {
                      const hostId = activeMeetingDetail.hostId || activeMeetingDetail.organizerId || (typeof activeMeetingDetail.createdBy === 'string' ? activeMeetingDetail.createdBy : activeMeetingDetail.createdBy?.id);
                      const isHost = u.id === hostId;
                      return (
                        <span
                          key={u.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            isHost
                              ? 'bg-amber-50 text-amber-900 border border-amber-200 font-bold'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isHost && <Crown className="w-3 h-3 text-amber-600" />}
                          {u.name}
                        </span>
                      );
                    })}
                </div>
              </div>

              {/* Agenda */}
              {activeMeetingDetail.agenda && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-1.5">Agenda</h4>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80 whitespace-pre-wrap">
                    {activeMeetingDetail.agenda}
                  </p>
                </div>
              )}

              {/* Summary / Minutes of Meeting */}
              {activeMeetingDetail.summary && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-1.5">Minutes of Meeting (MOM) / Summary</h4>
                  <p className="text-slate-700 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100 whitespace-pre-wrap">
                    {activeMeetingDetail.summary}
                  </p>
                </div>
              )}

              {/* Raw Notes */}
              {activeMeetingDetail.rawNotes && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-1.5">Discussion Notes</h4>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80 font-mono text-[11px] whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {activeMeetingDetail.rawNotes}
                  </p>
                </div>
              )}

              {/* Linked Action Items */}
              {activeMeetingDetail.actionPointTaskIds && activeMeetingDetail.actionPointTaskIds.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">
                    Action Items ({activeMeetingDetail.actionPointTaskIds.length})
                  </h4>
                  <div className="space-y-1.5">
                    {tasks
                      .filter((t) => activeMeetingDetail.actionPointTaskIds?.includes(t.id))
                      .map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                        >
                          <span className="font-medium text-slate-800">{t.title}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              t.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {canEditOrDelete(activeMeetingDetail) && (
                  <>
                    <button
                      onClick={() => handleOpenEditModal(activeMeetingDetail)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete meeting "${activeMeetingDetail.title}"?`)) {
                          onDeleteMeeting(activeMeetingDetail.id);
                          setActiveMeetingDetail(null);
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isHostUser(activeMeetingDetail) ? (
                  <>
                    <button
                      onClick={() => handleEndMeeting(activeMeetingDetail)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Conclude Meeting
                    </button>
                    <button
                      onClick={() => handleStartMeeting(activeMeetingDetail)}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Start as Host
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleJoinMeeting(activeMeetingDetail)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5" /> Join Meeting
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE / EDIT MEETING MODAL */}
      {/* ========================================================================= */}
      {(showCreateModal || editingMeeting) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingMeeting ? 'Edit Meeting Details' : 'Schedule New Meeting'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingMeeting
                      ? 'Update meeting date, time, attendees, and agenda notes.'
                      : 'Create and persist an upcoming conference or in-person session.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingMeeting(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={editingMeeting ? handleEditSubmit : handleCreateSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
                {/* Meeting Type Selector (Creation Only) */}
                {!editingMeeting && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Meeting Platform</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setCreateMeetingType('zoom')}
                        className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          createMeetingType === 'zoom'
                            ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Video className="w-4 h-4 text-blue-600" />
                        Zoom Meeting
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateMeetingType('google_meet')}
                        className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          createMeetingType === 'google_meet'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Globe className="w-4 h-4 text-emerald-600" />
                        Google Meet
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateMeetingType('standard')}
                        className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          createMeetingType === 'standard'
                            ? 'bg-slate-100 border-slate-800 text-slate-900 shadow-2xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <MapPin className="w-4 h-4 text-slate-800" />
                        In-Person / Hall
                      </button>
                    </div>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Meeting Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Weekly Temple Operations & Festival Planning"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Date & Time & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Duration (Min)</label>
                    <input
                      type="number"
                      min={15}
                      max={480}
                      step={15}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Department & Project */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Department</label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Linked Project (Optional)</label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                    >
                      <option value="">-- None / General Temple Meeting --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location / Custom Platform Link */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location / Room Details</label>
                  <input
                    type="text"
                    placeholder={createMeetingType === 'zoom' ? 'Zoom Online Room' : createMeetingType === 'google_meet' ? 'Google Meet Conference' : 'e.g., Main Temple Hall, 2nd Floor'}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Invite Target Roles & Participants */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Roles & Attendees</label>
                  {/* Role quick pills */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {(['temple_admin', 'leader', 'department_head', 'coordinator', 'member', 'volunteer'] as UserRole[]).map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => toggleTargetRole(r)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                          selectedRoles.includes(r)
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        + {getRoleDisplayName(r)}
                      </button>
                    ))}
                  </div>

                  {/* Individual users list */}
                  <div className="border border-slate-200 rounded-xl p-2 max-h-32 overflow-y-auto space-y-1 bg-slate-50">
                    {users.map((u) => {
                      const isChecked = selectedUserIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white text-slate-800 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleUserSelection(u.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-medium">{u.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{getRoleDisplayName(u.role)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Agenda */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Meeting Agenda</label>
                  <textarea
                    rows={2}
                    placeholder="Outline discussion points, key objectives, and topics..."
                    value={agenda}
                    onChange={(e) => setAgenda(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Gemini AI Summarizer & Raw Notes Section */}
                <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Discussion Notes & Gemini AI Summarizer
                    </label>
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={handleRunAiSummary}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Generate AI MOM
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Paste rough notes, audio transcript, or points here..."
                    value={rawNotes}
                    onChange={(e) => setRawNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-indigo-200/80 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden font-mono text-[11px]"
                  />
                  {summary && (
                    <div>
                      <span className="font-bold text-slate-700 block mb-1">Generated Summary / MOM</span>
                      <textarea
                        rows={2}
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Action Items List */}
                {!editingMeeting && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-slate-700">Assign Action Items</label>
                      <button
                        type="button"
                        onClick={handleAddActionItem}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Item
                      </button>
                    </div>
                    {actionItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Action item task title..."
                          value={item.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setActionItems((prev) => prev.map((a, i) => (i === idx ? { ...a, title: val } : a)));
                          }}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                        <select
                          value={item.ownerId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setActionItems((prev) => prev.map((a, i) => (i === idx ? { ...a, ownerId: val } : a)));
                          }}
                          className="w-32 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        >
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setActionItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingMeeting(null);
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-semibold cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5 text-xs"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingMeeting ? 'Save Changes' : 'Schedule Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
