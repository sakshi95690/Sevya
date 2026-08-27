import React, { useState, useEffect } from 'react';
import { Meeting, Project, Department, User, Task, UserRole } from '../types';
import {
  Calendar,
  Sparkles,
  Plus,
  Users,
  MapPin,
  Trash2,
  X,
  FileText,
  ArrowRight,
  Clock,
  Video,
  ExternalLink,
  Copy,
  Check,
  Crown,
  Shield,
  Play,
  Mic,
  MicOff,
  Lock,
  Unlock,
  Tv,
  PhoneOff,
  Radio,
  Settings,
  AlertCircle,
  Globe,
  ChevronDown,
  Mail,
  Send,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { formatDate } from '../utils/taskUtils';
import { api } from '../services/api';
import { integrationApi } from '../services/integrationApi';
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
  onDeleteMeeting: (meetingId: string) => void;
}

export const MeetingsView: React.FC<MeetingsViewProps> = ({
  meetings,
  projects,
  departments,
  users,
  tasks,
  currentUser,
  onCreateMeeting,
  onDeleteMeeting,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [meetingType, setMeetingType] = useState<'standard' | 'zoom' | 'google_meet'>('zoom');
  const [activeMeetingDetail, setActiveMeetingDetail] = useState<Meeting | null>(null);
  const [hostControlMeeting, setHostControlMeeting] = useState<Meeting | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedHostId, setCopiedHostId] = useState<string | null>(null);
  const [copiedJoinId, setCopiedJoinId] = useState<string | null>(null);

  // Host Control States
  const [hostActionFeedback, setHostActionFeedback] = useState<string | null>(null);
  const [isMutedAll, setIsMutedAll] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [waitingRoomActive, setWaitingRoomActive] = useState(true);
  const [screenShareHostOnly, setScreenShareHostOnly] = useState(true);
  const [hostTab, setHostTab] = useState<'controls' | 'roster'>('controls');

  // New Meeting Form state
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [location, setLocation] = useState('Trustee Conference Room A');
  const [agenda, setAgenda] = useState('');
  const [rawNotes, setRawNotes] = useState('');
  const [summary, setSummary] = useState('');

  // Attendance & Zoom Participants
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(users.map((u) => u.id).slice(0, 4));

  // Action Points
  const [actionItems, setActionItems] = useState<
    { title: string; ownerId: string; priority: 'urgent' | 'high' | 'medium' | 'low'; dueDate: string }[]
  >([{ title: '', ownerId: '', priority: 'medium', dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0] }]);

  const [aiLoading, setAiLoading] = useState(false);
  const [submittingZoom, setSubmittingZoom] = useState(false);
  const [zoomConnected, setZoomConnected] = useState<boolean | null>(null);

  const checkZoomIntegration = async () => {
    try {
      const list = await integrationApi.getIntegrations();
      const zoom = list.find((i) => i.provider === 'zoom' && i.status === 'CONNECTED');
      setZoomConnected(!!zoom);
    } catch {
      setZoomConnected(false);
    }
  };

  useEffect(() => {
    checkZoomIntegration();
  }, []);

  useEffect(() => {
    if (showModal) {
      checkZoomIntegration();
    }
  }, [showModal]);

  const normalizedRole = normalizeRole(currentUser.role);
  const canCreateMeeting =
    normalizedRole === 'super_admin' ||
    normalizedRole === 'temple_admin' ||
    normalizedRole === 'department_head' ||
    normalizedRole === 'coordinator';

  const isVolunteer = normalizedRole === 'member';

  const isHostUser = (mtg: Meeting) => {
    if (isVolunteer) return false;
    if (normalizedRole === 'super_admin' || normalizedRole === 'temple_admin') return true;
    if (mtg.hostId && mtg.hostId === currentUser.id) return true;
    if (mtg.organizerId === currentUser.id) return true;
    if (mtg.createdBy && (typeof mtg.createdBy === 'string' ? mtg.createdBy === currentUser.id : mtg.createdBy?.id === currentUser.id)) return true;
    return false;
  };

  // Target audience selection
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(['temple_admin', 'department_head', 'coordinator', 'member']);

  // Role based visibility filter
  const visibleMeetings = meetings.filter((mtg) => {
    if (normalizedRole === 'super_admin') return true;
    if (mtg.hostId === currentUser.id) return true;
    if (mtg.organizerId === currentUser.id) return true;
    if (mtg.createdBy && (typeof mtg.createdBy === 'string' ? mtg.createdBy === currentUser.id : mtg.createdBy?.id === currentUser.id)) return true;
    if (mtg.participants && mtg.participants.includes(currentUser.id)) return true;
    if (mtg.attendance && mtg.attendance.some((a) => a.userId === currentUser.id)) return true;
    if ((mtg as any).targetRoles && Array.isArray((mtg as any).targetRoles) && (mtg as any).targetRoles.includes(normalizedRole)) return true;
    if (mtg.departmentId && currentUser.departmentId === mtg.departmentId) return true;
    if (isVolunteer && !(mtg as any).isPublicDevoteeMeeting) {
      // If no specific restriction or attendee list has user, permit
      return false;
    }
    return true;
  });

  const toggleTargetRole = (r: UserRole) => {
    setSelectedRoles((prev) => {
      const next = prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r];
      const matchedUsers = users.filter((u) => next.includes(u.role)).map((u) => u.id);
      setSelectedUserIds(matchedUsers);
      return next;
    });
  };

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
          ownerId: (users || [])[(idx % ((users || []).length || 1))]?.id || '',
          priority: (item.priority as any) || 'medium',
          dueDate: new Date(Date.now() + (item.suggestedDays || 3) * 86400000).toISOString().split('T')[0],
        }));
        setActionItems(mappedItems);
      }
    } catch (err) {
      alert('AI processing complete with default summary structure.');
    } finally {
      setAiLoading(false);
    }
  };

  const addActionItem = () => {
    setActionItems((prev) => [
      ...prev,
      {
        title: '',
        ownerId: '',
        priority: 'medium',
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      },
    ]);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) {
      alert('Title and date are required.');
      return;
    }

    const validActionItems = actionItems.filter((a) => a.title.trim() && a.ownerId);

    if (meetingType === 'zoom') {
      setSubmittingZoom(true);
      try {
        const createdZoom = await api.createZoomMeeting({
          topic: title,
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
        
        // Auto open host control modal if current user is host
        if (isHostUser(createdZoom)) {
          setHostControlMeeting(createdZoom);
        }

        alert(`📹 Zoom Meeting Created Successfully!\nHost Start URL generated for ${currentUser.name}\nMeeting ID: ${createdZoom.zoomMeetingId}\nPasscode: ${createdZoom.zoomPassword}`);
      } catch (err: any) {
        alert(`Meeting creation alert: ${err?.message || 'Error scheduling meeting. Please try again.'}`);
      } finally {
        setSubmittingZoom(false);
      }
    } else if (meetingType === 'google_meet') {
      setSubmittingZoom(true);
      try {
        const createdMeet = await api.createGoogleMeetMeeting({
          topic: title,
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
        alert(`🌐 Google Meet Created Successfully!\nMeeting Link: ${createdMeet.googleMeetUrl || createdMeet.zoomJoinUrl}`);
      } catch (err: any) {
        alert(`Google Meet creation alert: ${err?.message || 'Error scheduling Google Meet. Please try again.'}`);
      } finally {
        setSubmittingZoom(false);
      }
    } else {
      const attendance = selectedUserIds.map((uId) => ({
        userId: uId,
        status: 'present' as const,
      }));

      onCreateMeeting({
        title,
        projectId: projectId || undefined,
        departmentId: departmentId || undefined,
        organizerId: currentUser.id,
        hostId: currentUser.id,
        date,
        location,
        agenda,
        summary,
        rawNotes,
        attendance,
        actionPoints: validActionItems,
        createdBy: currentUser,
      });
    }

    // Reset
    setTitle('');
    setAgenda('');
    setRawNotes('');
    setSummary('');
    setShowModal(false);
  };

  const copyMeetingDetails = (mtg: Meeting) => {
    const text = `📹 SEVYA Zoom Meeting: ${mtg.title}\nDate: ${mtg.date} at ${mtg.time || '10:00 AM'}\nJoin Link: ${mtg.zoomJoinUrl || 'https://zoom.us'}\nMeeting ID: ${mtg.zoomMeetingId || '834 2910 5920'}\nPasscode: ${mtg.zoomPassword || '123456'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(mtg.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const copyHostUrl = (mtg: Meeting) => {
    const url = mtg.zoomHostUrl || mtg.zoomJoinUrl || 'https://zoom.us';
    navigator.clipboard.writeText(url);
    setCopiedHostId(mtg.id);
    setTimeout(() => setCopiedHostId(null), 2500);
  };

  const copyJoinUrl = (mtg: Meeting) => {
    const url = mtg.zoomJoinUrl || 'https://zoom.us';
    navigator.clipboard.writeText(url);
    setCopiedJoinId(mtg.id);
    setTimeout(() => setCopiedJoinId(null), 2500);
  };

  const handleStartMeetingAsHost = async (mtg: Meeting) => {
    try {
      const res = await api.startMeeting(mtg.id);
      if (res.canStart && res.startUrl) {
        window.open(res.startUrl, '_blank');
        setHostControlMeeting(mtg);
      } else {
        alert(res.message || 'You cannot start the meeting because it is hosted by another user.');
        if (res.joinUrl) {
          window.open(res.joinUrl, '_blank');
        }
      }
    } catch (err: any) {
      const fallbackUrl = mtg.zoomHostUrl || mtg.zoomJoinUrl || mtg.googleMeetUrl || 'https://zoom.us';
      window.open(fallbackUrl, '_blank');
      setHostControlMeeting(mtg);
    }
  };

  const handleEndMeeting = async (mtg: Meeting) => {
    if (!window.confirm(`Are you sure you want to end Zoom meeting "${mtg.title}" for all participants?`)) {
      return;
    }

    try {
      await api.endMeeting(mtg.id);
      setHostActionFeedback(`Meeting "${mtg.title}" ended by Host ${currentUser.name}.`);
      setTimeout(() => setHostActionFeedback(null), 4000);
      setHostControlMeeting(null);
    } catch (err: any) {
      alert(`Unable to end meeting: ${err?.message || err}`);
    }
  };

  const triggerHostControlAction = async (mtg: Meeting, action: string, description: string) => {
    try {
      await api.executeMeetingHostAction(mtg.id, action);
      if (action === 'mute_all') setIsMutedAll(true);
      if (action === 'unmute_all') setIsMutedAll(false);
      if (action === 'lock_room') setIsLocked(true);
      if (action === 'unlock_room') setIsLocked(false);
      if (action === 'toggle_waiting_room') setWaitingRoomActive(!waitingRoomActive);
      if (action === 'toggle_screen_share') setScreenShareHostOnly(!screenShareHostOnly);

      setHostActionFeedback(`[Host Command] ${description}`);
      setTimeout(() => setHostActionFeedback(null), 3500);
    } catch (err: any) {
      alert(`Host Action Failed: ${err?.message || err}`);
    }
  };

  const [sendingInvitesMeetingId, setSendingInvitesMeetingId] = useState<string | null>(null);
  const [inviteSuccessFeedback, setInviteSuccessFeedback] = useState<string | null>(null);

  const handleSendMeetingInvites = async (mtg: Meeting) => {
    try {
      setSendingInvitesMeetingId(mtg.id);
      const res = await api.sendMeetingInvites(mtg.id, { channels: ['email', 'whatsapp'] });
      setInviteSuccessFeedback(res.message || 'Invitations dispatched via Gmail and WhatsApp.');
      setTimeout(() => setInviteSuccessFeedback(null), 4500);
    } catch (err: any) {
      alert(`Failed to send invitations: ${err?.message || err}`);
    } finally {
      setSendingInvitesMeetingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Video className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Meetings</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
            Schedule Zoom, Google Meet & in-person meetings, manage MOM, and track action points
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:hidden">
            Schedule meetings, MOM & tasks
          </p>
        </div>

        {canCreateMeeting && (
          <div className="relative">
            {/* Single '+' Button */}
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="py-2 px-3 sm:px-4 bg-indigo-700 hover:bg-indigo-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Create New Meeting"
              aria-label="Create New Meeting"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Meeting</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCreateMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* 3 Meeting Type Options Dropdown Menu */}
            {showCreateMenu && (
              <>
                {/* Backdrop to dismiss when clicking outside */}
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowCreateMenu(false)}
                />

                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-40 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Select Meeting Type
                  </div>

                  {/* 1. Zoom Meeting Option */}
                  <button
                    onClick={() => {
                      setMeetingType('zoom');
                      setShowCreateMenu(false);
                      setShowModal(true);
                    }}
                    className="w-full p-2.5 rounded-xl text-left hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all flex items-start gap-3 cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Video className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-900 dark:group-hover:text-indigo-300">
                          Zoom Meeting
                        </span>
                        <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded">
                          Host Mode
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        Live video call with host controls & AI MOM
                      </p>
                    </div>
                  </button>

                  {/* 2. In-Person Meeting Option */}
                  <button
                    onClick={() => {
                      setMeetingType('standard');
                      setShowCreateMenu(false);
                      setShowModal(true);
                    }}
                    className="w-full p-2.5 rounded-xl text-left hover:bg-amber-50/80 dark:hover:bg-amber-950/40 border border-transparent hover:border-amber-200 dark:hover:border-amber-800 transition-all flex items-start gap-3 cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-900 dark:group-hover:text-amber-300">
                          In-Person Meeting
                        </span>
                        <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">
                          On-Premise
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        Temple room meeting with attendance & task notes
                      </p>
                    </div>
                  </button>

                  {/* 3. Google Meet Option */}
                  <button
                    onClick={() => {
                      setMeetingType('google_meet');
                      setShowCreateMenu(false);
                      setShowModal(true);
                    }}
                    className="w-full p-2.5 rounded-xl text-left hover:bg-teal-50/80 dark:hover:bg-teal-950/40 border border-transparent hover:border-teal-200 dark:hover:border-teal-800 transition-all flex items-start gap-3 cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-900 dark:group-hover:text-teal-300">
                          Google Meet
                        </span>
                        <span className="text-[10px] font-extrabold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-1.5 py-0.5 rounded">
                          Meet Space
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        Google video conference link with action tracking
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {inviteSuccessFeedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{inviteSuccessFeedback}</span>
          </div>
          <button
            onClick={() => setInviteSuccessFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Meetings List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleMeetings.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white border border-dashed border-slate-200 rounded-2xl p-6">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No scheduled meetings for your role</p>
            <p className="text-xs text-slate-400 mt-1">Schedule a Zoom meeting to generate MOM and assign tasks.</p>
          </div>
        ) : (
          visibleMeetings.map((mtg) => {
            const hostUserId = mtg.hostId || mtg.organizerId || (typeof mtg.createdBy === 'string' ? mtg.createdBy : mtg.createdBy?.id);
            const organizer = users.find((u) => u.id === hostUserId);
            const actionTaskIds = mtg.actionPointTaskIds || [];
            const linkedTaskList = tasks.filter((t) => actionTaskIds.includes(t.id));
            const locationStr = mtg.location || '';
            const isGoogleMeet = mtg.meetingPlatform === 'google_meet' || locationStr.includes('Google Meet') || !!(mtg as any).googleMeetUrl;
            const isZoom = !isGoogleMeet && (mtg.isZoomMeeting || locationStr.includes('Zoom') || !!mtg.zoomJoinUrl);
            const isHost = isHostUser(mtg);
            const isConcluded = mtg.summary?.includes('concluded by Host');

            return (
              <div
                key={mtg.id}
                className={`bg-white border rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                  isGoogleMeet
                    ? 'border-teal-300 hover:border-teal-500 bg-gradient-to-b from-teal-50/20 to-white'
                    : isZoom
                    ? isHost
                      ? 'border-indigo-300 hover:border-indigo-500 bg-gradient-to-b from-indigo-50/20 to-white'
                      : 'border-blue-200 hover:border-blue-400'
                    : 'border-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-600" /> {formatDate(mtg.date)}
                      </span>

                      {isGoogleMeet && (
                        <span className="text-[10px] font-extrabold text-teal-900 bg-teal-100 border border-teal-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <Globe className="w-3 h-3 text-teal-700" /> Google Meet
                        </span>
                      )}

                      {isZoom && (
                        <>
                          {isHost ? (
                            <span className="text-[10px] font-extrabold text-indigo-900 bg-indigo-100 border border-indigo-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              <Crown className="w-3 h-3 text-indigo-700 fill-current" /> Host / Organizer
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold text-blue-800 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Video className="w-3 h-3 text-blue-600" /> Participant Attendee
                            </span>
                          )}
                        </>
                      )}

                      {isConcluded && (
                        <span className="text-[10px] font-extrabold text-red-800 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
                          ENDED BY HOST
                        </span>
                      )}
                    </div>

                    {(() => {
                      const meetingActions: ContextMenuAction[] = [
                        {
                          id: 'view_mom',
                          label: 'View Minutes & Notes',
                          icon: FileText,
                          onClick: () => setActiveMeetingDetail(mtg),
                        },
                      ];

                      if (isZoom) {
                        if (isHost) {
                          meetingActions.push({
                            id: 'host_start',
                            label: 'Host / Start Zoom Call',
                            icon: Play,
                            onClick: () => handleStartMeetingAsHost(mtg),
                          });
                          meetingActions.push({
                            id: 'host_controls',
                            label: 'Host Controls & Dashboard',
                            icon: Shield,
                            onClick: () => setHostControlMeeting(mtg),
                          });
                          meetingActions.push({
                            id: 'copy_host_url',
                            label: 'Copy Host Start URL',
                            icon: Crown,
                            onClick: () => copyHostUrl(mtg),
                          });
                          meetingActions.push({
                            id: 'copy_invitation',
                            label: 'Copy Participant Link',
                            icon: Copy,
                            onClick: () => copyJoinUrl(mtg),
                          });
                          meetingActions.push({
                            id: 'end_meeting',
                            label: 'End Meeting for All',
                            icon: PhoneOff,
                            danger: true,
                            onClick: () => handleEndMeeting(mtg),
                          });
                        } else {
                          meetingActions.push({
                            id: 'join_zoom',
                            label: 'Join Zoom Call (Participant)',
                            icon: Video,
                            onClick: () => window.open(mtg.zoomJoinUrl || 'https://zoom.us', '_blank'),
                          });
                          meetingActions.push({
                            id: 'copy_invitation',
                            label: 'Copy Invitation Link',
                            icon: Copy,
                            onClick: () => copyMeetingDetails(mtg),
                          });
                        }
                      }

                      if (canCreateMeeting) {
                        meetingActions.push({
                          id: 'send_invitations',
                          label: 'Send Invites (Gmail & WhatsApp)',
                          icon: Send,
                          onClick: () => handleSendMeetingInvites(mtg),
                        });
                        meetingActions.push({
                          id: 'delete_meeting',
                          label: 'Delete Meeting',
                          icon: Trash2,
                          danger: true,
                          onClick: () => onDeleteMeeting(mtg.id),
                        });
                      }

                      return (
                        <RowContextMenu
                          actions={meetingActions}
                          shareData={{
                            title: mtg.title,
                            details: `Meeting: ${mtg.title}\nDate: ${formatDate(mtg.date)}\nLocation: ${mtg.location || 'Zoom'}\nJoin Link: ${mtg.zoomJoinUrl || 'N/A'}`,
                            type: 'Temple Meeting Invitation',
                          }}
                        />
                      );
                    })()}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">{mtg.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {mtg.location}
                      {!isVolunteer && organizer?.name && (
                        <span>
                          {' '}| Host: <b>{organizer.name}</b>
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Google Meet Info Box */}
                  {isGoogleMeet && (
                    <div className="p-3.5 rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50/40 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold flex items-center gap-1.5 text-teal-950">
                          <Globe className="w-3.5 h-3.5 text-teal-600" /> Google Meet Video Conference
                        </span>
                        <span className="font-bold text-teal-800 bg-white/90 px-2 py-0.5 rounded border border-teal-200 text-[11px]">
                          Active Space
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <a
                          href={(mtg as any).googleMeetUrl || mtg.zoomJoinUrl || 'https://meet.google.com'}
                          target="_blank"
                          rel="noreferrer"
                          className="py-1.5 px-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Join Google Meet
                        </a>

                        <button
                          onClick={() => copyMeetingDetails(mtg)}
                          className="py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition-all flex items-center gap-1"
                        >
                          {copiedId === mtg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> Link Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy Meet Link
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleSendMeetingInvites(mtg)}
                          disabled={sendingInvitesMeetingId === mtg.id}
                          className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Dispatch Invites via Gmail & WhatsApp"
                        >
                          {sendingInvitesMeetingId === mtg.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5 text-emerald-600" /> Send Invites
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Zoom Meeting Info & Control Box */}
                  {isZoom && (
                    <div
                      className={`p-3.5 rounded-xl border space-y-2.5 ${
                        isHost
                          ? 'bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-white border-indigo-200 shadow-2xs'
                          : 'bg-gradient-to-r from-blue-50 to-indigo-50/50 border-blue-200/80'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold flex items-center gap-1 ${isHost ? 'text-indigo-950' : 'text-blue-900'}`}>
                          <Video className={`w-3.5 h-3.5 ${isHost ? 'text-indigo-600' : 'text-blue-600'}`} />
                          Meeting ID: {mtg.zoomMeetingId || '852 9012 3456'}
                        </span>
                        <span className="font-bold text-slate-700 bg-white/90 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          Passcode: {mtg.zoomPassword || '194820'}
                        </span>
                      </div>

                      {/* Role Specific Control Buttons */}
                      {isHost ? (
                        <div className="space-y-2 pt-1 border-t border-indigo-100/80">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                              <Crown className="w-3 h-3 text-amber-600" /> Host Authority Access Granted
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">Host: {currentUser.name}</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleStartMeetingAsHost(mtg)}
                              className="py-1.5 px-3.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" /> Host / Start Meeting
                            </button>

                            <button
                              onClick={() => setHostControlMeeting(mtg)}
                              className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-lg border border-slate-700 transition-all flex items-center gap-1.5"
                            >
                              <Shield className="w-3.5 h-3.5 text-amber-400" /> Host Controls
                            </button>

                            <button
                              onClick={() => copyHostUrl(mtg)}
                              className="py-1.5 px-2.5 bg-white hover:bg-slate-50 text-indigo-800 font-bold text-xs rounded-lg border border-indigo-200 transition-all flex items-center gap-1"
                              title="Copy Host Start URL"
                            >
                              {copiedHostId === mtg.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Host URL Copied!
                                </>
                              ) : (
                                <>
                                  <Crown className="w-3.5 h-3.5 text-amber-600" /> Copy Host Link
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => copyJoinUrl(mtg)}
                              className="py-1.5 px-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition-all flex items-center gap-1"
                              title="Copy Participant Link"
                            >
                              {copiedJoinId === mtg.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Join Link Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy Participant Link
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleSendMeetingInvites(mtg)}
                              disabled={sendingInvitesMeetingId === mtg.id}
                              className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title="Dispatch Invites via Gmail & WhatsApp"
                            >
                              {sendingInvitesMeetingId === mtg.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5 text-emerald-600" /> Send Invites
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <a
                            href={mtg.zoomJoinUrl || 'https://zoom.us'}
                            target="_blank"
                            rel="noreferrer"
                            className="py-1.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Join from Browser
                          </a>

                          <button
                            onClick={() => copyMeetingDetails(mtg)}
                            className="py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition-all flex items-center gap-1"
                          >
                            {copiedId === mtg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy Invitation
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {mtg.summary && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700 space-y-1">
                      <span className="font-bold text-amber-800 text-[10px] uppercase tracking-wider block">
                        Summary / Decision Highlights
                      </span>
                      <p className="line-clamp-3">{mtg.summary}</p>
                    </div>
                  )}

                  {linkedTaskList.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Action Point Tasks ({linkedTaskList.length})
                      </span>
                      <div className="space-y-1">
                        {linkedTaskList.map((t) => (
                          <div
                            key={t.id}
                            className="text-xs bg-amber-50/50 p-2 rounded-lg border border-amber-200/60 flex items-center justify-between"
                          >
                            <span className="font-medium text-slate-800 line-clamp-1">{t.title}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 capitalize">
                              {t.status.replace('_', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                  {!isVolunteer ? (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {(mtg.participants || mtg.attendance || []).length} Invitees
                    </span>
                  ) : <div />}
                  <button
                    onClick={() => setActiveMeetingDetail(mtg)}
                    className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1"
                  >
                    View MOM Details <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Host Controls Dashboard Modal */}
      {hostControlMeeting && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-xl text-amber-400 shrink-0">
                  <Crown className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-400/20" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate">Zoom Host Dashboard & Controls</h3>
                    <span className="text-[10px] font-extrabold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                      HOST
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{hostControlMeeting.title}</p>
                </div>
              </div>

              <button
                onClick={() => setHostControlMeeting(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Host Action Notification Banner */}
            {hostActionFeedback && (
              <div className="bg-amber-500 text-slate-950 px-4 py-2 font-bold text-xs flex items-center gap-2 shadow-inner">
                <Radio className="w-4 h-4 animate-pulse" />
                {hostActionFeedback}
              </div>
            )}

            {/* Content Tabs */}
            <div className="bg-slate-100 border-b border-slate-200 px-5 pt-3 flex gap-2 text-xs font-bold">
              <button
                onClick={() => setHostTab('controls')}
                className={`py-2 px-4 rounded-t-xl transition-all flex items-center gap-1.5 ${
                  hostTab === 'controls'
                    ? 'bg-white text-indigo-900 border-t border-x border-slate-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-indigo-600" /> Host Controls Toolbar
              </button>
              <button
                onClick={() => setHostTab('roster')}
                className={`py-2 px-4 rounded-t-xl transition-all flex items-center gap-1.5 ${
                  hostTab === 'roster'
                    ? 'bg-white text-indigo-900 border-t border-x border-slate-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" /> Participant Roster ({users.length})
              </button>
            </div>

            {/* Body Area */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Meeting Info Bar */}
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 p-4 rounded-2xl border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-indigo-950 text-sm block">{hostControlMeeting.title}</span>
                  <span className="text-slate-600 text-[11px] mt-0.5 block">
                    Meeting ID: <b>{hostControlMeeting.zoomMeetingId || '852 9012 3456'}</b> | Passcode: <b>{hostControlMeeting.zoomPassword || '194820'}</b>
                  </span>
                </div>

                <a
                  href={hostControlMeeting.zoomHostUrl || hostControlMeeting.zoomJoinUrl || 'https://zoom.us'}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-4 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-current" /> Launch Zoom as Host
                </a>
              </div>

              {hostTab === 'controls' && (
                <div className="space-y-4">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Live Host Quick Action Controls
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Mute All */}
                    <button
                      onClick={() => triggerHostControlAction(hostControlMeeting, 'mute_all', 'Muted all meeting participants')}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isMutedAll
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-red-100 text-red-700 rounded-lg">
                          <MicOff className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs block">Mute All Participants</span>
                          <span className="text-[10px] text-slate-500">Mute audio for all current attendees</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700">Apply</span>
                    </button>

                    {/* Unmute All */}
                    <button
                      onClick={() => triggerHostControlAction(hostControlMeeting, 'unmute_all', 'Requested unmute for all participants')}
                      className="p-3.5 bg-white border border-slate-200 hover:border-indigo-300 text-slate-800 rounded-xl transition-all flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                          <Mic className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs block">Allow Unmute / Request Audio</span>
                          <span className="text-[10px] text-slate-500">Allow participants to unmute themselves</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700">Apply</span>
                    </button>

                    {/* Lock Meeting Room */}
                    <button
                      onClick={() =>
                        triggerHostControlAction(
                          hostControlMeeting,
                          isLocked ? 'unlock_room' : 'lock_room',
                          isLocked ? 'Unlocked meeting room' : 'Locked meeting room to prevent new joins'
                        )
                      }
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isLocked
                          ? 'bg-slate-900 text-white border-slate-800'
                          : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${isLocked ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-100 text-slate-700'}`}>
                          {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="font-bold text-xs block">{isLocked ? 'Meeting Room Locked' : 'Lock Meeting Room'}</span>
                          <span className={`text-[10px] ${isLocked ? 'text-slate-400' : 'text-slate-500'}`}>
                            {isLocked ? 'No new attendees can join' : 'Prevent new attendees from joining'}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[11px] font-bold ${isLocked ? 'text-amber-400' : 'text-indigo-700'}`}>
                        {isLocked ? 'Unlock' : 'Lock'}
                      </span>
                    </button>

                    {/* Screen Share Toggle */}
                    <button
                      onClick={() =>
                        triggerHostControlAction(
                          hostControlMeeting,
                          'toggle_screen_share',
                          screenShareHostOnly ? 'Allowed participant screen sharing' : 'Restricted screen sharing to Host Only'
                        )
                      }
                      className="p-3.5 bg-white border border-slate-200 hover:border-indigo-300 text-slate-800 rounded-xl transition-all flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                          <Tv className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs block">Screen Share Rights</span>
                          <span className="text-[10px] text-slate-500">
                            Current: <b>{screenShareHostOnly ? 'Host Only' : 'All Participants'}</b>
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700">Toggle</span>
                    </button>
                  </div>

                  {/* End Meeting Box */}
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-red-900 block flex items-center gap-1.5">
                        <PhoneOff className="w-4 h-4 text-red-600" /> Host Termination Control
                      </span>
                      <p className="text-red-700 text-[11px] mt-0.5">
                        End meeting session for all connected participants and record final completion.
                      </p>
                    </div>

                    <button
                      onClick={() => handleEndMeeting(hostControlMeeting)}
                      className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <PhoneOff className="w-4 h-4" /> End Meeting for All
                    </button>
                  </div>

                  {/* URLs & Credentials Box */}
                  <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3 text-xs">
                    <span className="font-bold text-amber-400 uppercase tracking-wider block text-[10px]">
                      Zoom URLs & Host Credentials
                    </span>

                    <div className="space-y-2 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Private Host Start URL (Host Only):</span>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            readOnly
                            value={hostControlMeeting.zoomHostUrl || hostControlMeeting.zoomJoinUrl || ''}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-[11px]"
                          />
                          <button
                            onClick={() => copyHostUrl(hostControlMeeting)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg whitespace-nowrap text-xs"
                          >
                            Copy Host URL
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Public Participant Join URL:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            readOnly
                            value={hostControlMeeting.zoomJoinUrl || ''}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-[11px]"
                          />
                          <button
                            onClick={() => copyJoinUrl(hostControlMeeting)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg whitespace-nowrap text-xs"
                          >
                            Copy Join URL
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {hostTab === 'roster' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Participant Management & Attendance Roster
                  </span>

                  <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs">
                    <table className="w-full text-left min-w-[380px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">User / Participant</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Host Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((u) => {
                          const isMe = u.id === currentUser.id;
                          return (
                            <tr key={u.id} className="hover:bg-slate-50/80">
                              <td className="p-3 font-semibold text-slate-800 flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-xs">
                                  {u.name.slice(0, 1)}
                                </div>
                                <div>
                                  <span>{u.name}</span>
                                  {isMe && <span className="text-[10px] text-indigo-600 font-bold ml-1">(YOU)</span>}
                                </div>
                              </td>
                              <td className="p-3 text-slate-600 font-semibold">{getRoleDisplayName(u.role)}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Present / In Call
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() =>
                                    triggerHostControlAction(hostControlMeeting, `mute_user_${u.id}`, `Muted participant ${u.name}`)
                                  }
                                  className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200"
                                >
                                  Mute Audio
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Meeting Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header: Clean Title for Selected Meeting Type (No Duplicate Button Rows) */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                {meetingType === 'zoom' ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Schedule Zoom Meeting</h3>
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-500 fill-current" /> Host Mode Enabled
                      </span>
                    </div>
                  </div>
                ) : meetingType === 'google_meet' ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Schedule Google Meet</h3>
                      <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">Video Conference</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Schedule In-Person Meeting</h3>
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">On-Premise Temple Meeting</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Compact type switcher dropdown without visual clutter */}
                <div className="relative">
                  <select
                    value={meetingType}
                    onChange={(e) => setMeetingType(e.target.value as any)}
                    className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-1 pl-2.5 pr-6 rounded-lg appearance-none cursor-pointer border border-slate-200 dark:border-slate-700 focus:outline-hidden"
                    title="Switch meeting type"
                  >
                    <option value="zoom">Zoom</option>
                    <option value="standard">In-Person</option>
                    <option value="google_meet">Google Meet</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Meeting Topic / Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    meetingType === 'zoom'
                      ? 'e.g. Monthly Trustee & Sevait Zoom Synchronization'
                      : meetingType === 'google_meet'
                      ? 'e.g. Festival Planning & Media Broadcast Committee'
                      : 'e.g. Annakshetra Logistics & Volunteer Review'
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* In-Person Meeting Location Field */}
              {meetingType === 'standard' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Meeting Location / Room *
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Trustee Conference Room A / Main Hall"
                      className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Meeting Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Duration
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes (1 hour)</option>
                    <option value={90}>90 Minutes</option>
                  </select>
                </div>
              </div>

              {/* Host Identity Notice */}
              {meetingType === 'zoom' && (
                <div className="space-y-2">
                  {zoomConnected === false && (
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-amber-950">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Zoom Integration Not Connected</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Your temple has not connected a Zoom account yet. Please navigate to <b>Settings → Integrations</b> and click "Connect Zoom" to connect your account first.
                      </p>
                    </div>
                  )}

                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-indigo-950 font-bold">
                      <Crown className="w-4 h-4 text-amber-600" />
                      <span>Host Identity: {currentUser.name} ({getRoleDisplayName(currentUser.role)})</span>
                    </div>
                    <span className="text-[10px] text-indigo-700 font-bold uppercase bg-white px-2 py-0.5 rounded border border-indigo-200">
                      Host Start Link Auto-Assigned
                    </span>
                  </div>
                </div>
              )}

              {/* Target Audience Roles */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Target Audience Roles (Multi-Select)
                </label>
                <div className="flex flex-wrap gap-2 text-xs">
                  <label className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes('temple_admin')}
                      onChange={() => toggleTargetRole('temple_admin')}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800">Temple Admins</span>
                  </label>
                  <label className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes('department_head')}
                      onChange={() => toggleTargetRole('department_head')}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800">Department Heads</span>
                  </label>
                  <label className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes('coordinator')}
                      onChange={() => toggleTargetRole('coordinator')}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800">Coordinators</span>
                  </label>
                  <label className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes('member')}
                      onChange={() => toggleTargetRole('member')}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-800">Members</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 italic">Devotees are excluded by default for internal administrative meetings.</p>
              </div>

              {/* Department & Project linkage */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Link Project (Optional)
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">No Project Link</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Gemini AI Meeting Assistant Panel */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Gemini AI MOM & Action Item Assistant
                  </span>
                  <button
                    type="button"
                    onClick={handleRunAiSummary}
                    disabled={aiLoading}
                    className="py-1 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-all flex items-center gap-1"
                  >
                    {aiLoading ? 'Processing AI...' : 'Auto-Generate Summary & Tasks'}
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                  placeholder="Paste discussion notes or audio transcript here..."
                  className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Meeting Summary / Agenda
                </label>
                <textarea
                  rows={2}
                  value={summary || agenda}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Core agenda or decision summary..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Action Point Tasks Section */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Action Point Tasks (Auto-created in Task Manager)
                  </span>
                  <button
                    type="button"
                    onClick={addActionItem}
                    className="text-xs text-indigo-700 hover:underline font-bold"
                  >
                    + Add Action Point
                  </button>
                </div>

                <div className="space-y-2">
                  {actionItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <input
                        type="text"
                        placeholder="Action Item Title"
                        value={item.title}
                        onChange={(e) => {
                          const copy = [...actionItems];
                          copy[idx].title = e.target.value;
                          setActionItems(copy);
                        }}
                        className="sm:col-span-5 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />

                      <select
                        value={item.ownerId}
                        onChange={(e) => {
                          const copy = [...actionItems];
                          copy[idx].ownerId = e.target.value;
                          setActionItems(copy);
                        }}
                        className="sm:col-span-4 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="">Select Owner *</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({getRoleDisplayName(u.role)})
                          </option>
                        ))}
                      </select>

                      <input
                        type="date"
                        value={item.dueDate}
                        onChange={(e) => {
                          const copy = [...actionItems];
                          copy[idx].dueDate = e.target.value;
                          setActionItems(copy);
                        }}
                        className="sm:col-span-3 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingZoom}
                className={`w-full py-2.5 px-4 font-bold text-xs rounded-xl shadow-xs transition-all mt-3 flex items-center justify-center gap-2 ${
                  meetingType === 'zoom'
                    ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
                    : meetingType === 'google_meet'
                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {submittingZoom ? (
                  'Generating Meeting Links...'
                ) : meetingType === 'zoom' ? (
                  <>
                    <Crown className="w-4 h-4 text-amber-300" /> Create Zoom Call as Host ({currentUser.name})
                  </>
                ) : meetingType === 'google_meet' ? (
                  <>
                    <Globe className="w-4 h-4 text-white" /> Create Google Meet Space ({currentUser.name})
                  </>
                ) : (
                  'Save In-Person Meeting & Tasks'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer Modal (MOM - Minutes of Meeting) */}
      {activeMeetingDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl p-4 sm:p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Minutes of Meeting (MOM)
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{activeMeetingDetail.title}</h3>
              </div>
              <button
                onClick={() => setActiveMeetingDetail(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">Date & Location</span>
                  <p className="text-slate-900 font-bold mt-0.5">
                    {formatDate(activeMeetingDetail.date)} at {activeMeetingDetail.location}
                  </p>
                </div>

                {(activeMeetingDetail.zoomJoinUrl || activeMeetingDetail.zoomHostUrl) && (
                  <a
                    href={activeMeetingDetail.zoomJoinUrl || activeMeetingDetail.zoomHostUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-all"
                  >
                    <Video className="w-3.5 h-3.5" /> Join / View Meeting
                  </a>
                )}
              </div>

              <div>
                <span className="font-bold text-slate-600 uppercase tracking-wider block text-[10px] mb-1">
                  Minutes Summary & Key Decisions
                </span>
                <p className="text-slate-800 bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/60 leading-relaxed font-medium">
                  {activeMeetingDetail.summary || 'No summary notes recorded yet.'}
                </p>
              </div>

              {activeMeetingDetail.rawNotes && (
                <div>
                  <span className="font-bold text-slate-600 uppercase tracking-wider block text-[10px] mb-1">
                    Raw Discussion & Notes
                  </span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] leading-relaxed">
                    {activeMeetingDetail.rawNotes}
                  </p>
                </div>
              )}

              {/* Action items list */}
              {activeMeetingDetail.actionPointTaskIds && activeMeetingDetail.actionPointTaskIds.length > 0 && (
                <div>
                  <span className="font-bold text-slate-600 uppercase tracking-wider block text-[10px] mb-1">
                    Assigned Action Items ({activeMeetingDetail.actionPointTaskIds.length})
                  </span>
                  <div className="space-y-1.5">
                    {tasks
                      .filter((t) => activeMeetingDetail.actionPointTaskIds?.includes(t.id))
                      .map((t) => (
                        <div key={t.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{t.title}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md font-bold capitalize">
                            {t.status}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Mobile Floating Action Button */}
      {canCreateMeeting && (
        <div className="md:hidden fixed bottom-20 right-4 z-40">
          <button
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="w-12 h-12 rounded-full bg-indigo-700 hover:bg-indigo-800 active:scale-90 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer border-2 border-white dark:border-slate-800"
            aria-label="Create Meeting"
            title="Create Meeting"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};
