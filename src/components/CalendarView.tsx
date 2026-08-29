import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Filter,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  AlertTriangle,
  Copy,
  Trash2,
  Edit3,
  X,
  ExternalLink,
  Shield,
  UserCheck,
  RotateCcw,
  List as ListIcon,
  Grid,
  CalendarDays,
  Check,
  Loader2,
  Globe
} from 'lucide-react';
import {
  CalendarEvent,
  CalendarEventType,
  CalendarEventPriority,
  CalendarEventStatus,
  CalendarEventRecurrence,
  User,
  Department,
  Project
} from '../types';
import { api } from '../services/api';
import { integrationApi } from '../services/integrationApi';

// ==========================================
// TIMEZONE-SAFE LOCAL DATE UTILITIES
// ==========================================

/**
 * Returns YYYY-MM-DD in browser's local timezone
 */
export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses YYYY-MM-DD or ISO string into a local Date at midnight local time
 */
export const parseLocalDateString = (dateStr: string): Date => {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
};

/**
 * Format local date safely for display
 */
export const formatDisplayDate = (
  d: Date | string,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = typeof d === 'string' ? parseLocalDateString(d) : d;
  return dateObj.toLocaleDateString(
    'en-US',
    options || { month: 'short', day: 'numeric', year: 'numeric' }
  );
};

interface CalendarViewProps {
  currentUser: User;
  onNavigateToTask?: (taskId: string) => void;
  onNavigateToMeeting?: (meetingId: string) => void;
}

type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentUser,
  onNavigateToTask,
  onNavigateToMeeting,
}) => {
  // Calendar view mode persistence
  const [viewMode, setViewModeState] = useState<CalendarViewMode>(() => {
    try {
      const saved = localStorage.getItem('sevya_calendar_view_mode');
      if (saved === 'month' || saved === 'week' || saved === 'day' || saved === 'agenda') {
        return saved;
      }
    } catch {}
    return 'month';
  });

  const setViewMode = (mode: CalendarViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem('sevya_calendar_view_mode', mode);
    } catch {}
  };

  // Current focal date (for month / week / day view navigation) and selected date (for single day selection)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  // Data state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [departmentsList, setDepartmentsList] = useState<Department[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent> | null>(null);

  // Reschedule inline state
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);
  const [rescheduleStartDate, setRescheduleStartDate] = useState<string>('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState<string>('');

  // Form inputs
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formEventType, setFormEventType] = useState<CalendarEventType>('meeting');
  const [formStartDate, setFormStartDate] = useState<string>(getLocalDateString(new Date()));
  const [formStartTime, setFormStartTime] = useState<string>('09:00');
  const [formEndDate, setFormEndDate] = useState<string>(getLocalDateString(new Date()));
  const [formEndTime, setFormEndTime] = useState<string>('10:00');
  const [formIsAllDay, setFormIsAllDay] = useState<boolean>(false);
  const [formLocation, setFormLocation] = useState<string>('');
  const [formDepartmentId, setFormDepartmentId] = useState<string>('');
  const [formProjectId, setFormProjectId] = useState<string>('');
  const [formPriority, setFormPriority] = useState<CalendarEventPriority>('medium');
  const [formStatus, setFormStatus] = useState<CalendarEventStatus>('scheduled');
  const [formReminderOffset, setFormReminderOffset] = useState<number>(15);
  const [formRecurrence, setFormRecurrence] = useState<CalendarEventRecurrence>('none');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formVisibility, setFormVisibility] = useState<string>('public');
  const [formParticipantIds, setFormParticipantIds] = useState<string[]>([]);
  const [formAttachmentUrl, setFormAttachmentUrl] = useState<string>('');
  const [formAttachmentName, setFormAttachmentName] = useState<string>('');

  // Conflict state
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch initial metadata
  useEffect(() => {
    loadMetadata();
  }, []);

  // Fetch events whenever date / view / filters change
  useEffect(() => {
    fetchEvents();
  }, [currentDate, viewMode, filterEventType, filterDepartment, filterPriority, filterStatus, searchQuery]);

  const loadMetadata = async () => {
    try {
      const [uRes, dRes, pRes] = await Promise.all([
        api.getUsers().catch(() => []),
        api.getDepartments().catch(() => []),
        api.getProjects().catch(() => []),
      ]);
      setUsersList(uRes || []);
      setDepartmentsList(dRes || []);
      setProjectsList(pRes || []);
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      let startStr = '';
      let endStr = '';

      if (viewMode === 'month') {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        // Safe local date range for month view with padding
        const firstDay = new Date(year, month - 1, 20);
        const lastDay = new Date(year, month + 2, 10);
        startStr = getLocalDateString(firstDay);
        endStr = getLocalDateString(lastDay);
      } else if (viewMode === 'week') {
        const curr = new Date(currentDate);
        const dayOfWeek = curr.getDay(); // 0 = Sun
        const first = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - dayOfWeek);
        const last = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - dayOfWeek + 6);
        startStr = getLocalDateString(first);
        endStr = getLocalDateString(last);
      } else if (viewMode === 'day') {
        startStr = getLocalDateString(currentDate);
        endStr = startStr;
      }

      const res = await api.getCalendarEvents({
        startDate: startStr || undefined,
        endDate: endStr || undefined,
        eventType: filterEventType !== 'all' ? filterEventType : undefined,
        departmentId: filterDepartment !== 'all' ? filterDepartment : undefined,
        priority: filterPriority !== 'all' ? filterPriority : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchQuery || undefined,
      });

      setEvents(res || []);
    } catch (err: any) {
      console.error('Failed to fetch calendar events:', err);
      setError(err.message || 'Failed to load calendar events.');
    } finally {
      setLoading(false);
    }
  };

  // Live Conflict Checking on Form Inputs Change
  useEffect(() => {
    if (showCreateModal && formStartDate && formParticipantIds.length > 0) {
      const timer = setTimeout(async () => {
        try {
          const res = await api.checkCalendarConflicts({
            startDate: formStartDate,
            startTime: formStartTime,
            endDate: formEndDate || formStartDate,
            endTime: formEndTime,
            participantUserIds: formParticipantIds,
            excludeEventId: editingEvent?.id,
          });
          setConflicts(res.conflicts || []);
        } catch (err) {
          console.error('Conflict check error:', err);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setConflicts([]);
    }
  }, [formStartDate, formStartTime, formEndDate, formEndTime, formParticipantIds, showCreateModal, editingEvent]);

  // Period Navigation
  const nextPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
      setSelectedDate(new Date(newDate));
    }
    setCurrentDate(newDate);
  };

  const prevPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
      setSelectedDate(new Date(newDate));
    }
    setCurrentDate(newDate);
  };

  // "Today" button handler - strictly synchronizes to actual local browser date
  const goToToday = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Check if today is currently viewed / selected
  const todayStr = getLocalDateString(new Date());
  const isTodaySelected = getLocalDateString(selectedDate) === todayStr;
  const isTodayCurrent = getLocalDateString(currentDate) === todayStr;

  // Header Title Text depending on View Mode
  const getHeaderPeriodLabel = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const curr = new Date(currentDate);
      const dayOfWeek = curr.getDay();
      const first = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - dayOfWeek);
      const last = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - dayOfWeek + 6);
      return `${formatDisplayDate(first, { month: 'short', day: 'numeric' })} – ${formatDisplayDate(last, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } else {
      return 'Agenda & Upcoming Schedule';
    }
  };

  // Helper for event type badges and colors
  const getEventTypeConfig = (type: CalendarEventType) => {
    switch (type) {
      case 'meeting':
        return { label: 'Meeting', bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800/60', dot: 'bg-blue-500', pill: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700' };
      case 'task':
        return { label: 'Task', bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/60', dot: 'bg-emerald-500', pill: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700' };
      case 'temple_event':
        return { label: 'Temple Event', bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/60', dot: 'bg-amber-500', pill: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700' };
      case 'festival':
        return { label: 'Festival', bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800/60', dot: 'bg-purple-500', pill: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700' };
      case 'seva':
        return { label: 'Seva', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/60', dot: 'bg-rose-500', pill: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-700' };
      case 'volunteer':
        return { label: 'Volunteer Duty', bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800/60', dot: 'bg-indigo-500', pill: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700' };
      case 'announcement':
        return { label: 'Announcement', bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-800/60', dot: 'bg-sky-500', pill: 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-700' };
      case 'personal':
      default:
        return { label: 'Personal', bg: 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700', dot: 'bg-slate-500', pill: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700' };
    }
  };

  const getPriorityBadge = (priority: CalendarEventPriority) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Medium</span>;
      case 'low':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700">Low</span>;
    }
  };

  // Reset & Open Form Modal
  const handleOpenCreateModal = (dateStr?: string) => {
    setEditingEvent(null);
    setFormTitle('');
    setFormDescription('');
    setFormEventType('meeting');
    const targetDate = dateStr || getLocalDateString(new Date());
    setFormStartDate(targetDate);
    setFormStartTime('09:00');
    setFormEndDate(targetDate);
    setFormEndTime('10:00');
    setFormIsAllDay(false);
    setFormLocation('');
    setFormDepartmentId(currentUser.departmentId || '');
    setFormProjectId('');
    setFormPriority('medium');
    setFormStatus('scheduled');
    setFormReminderOffset(15);
    setFormRecurrence('none');
    setFormNotes('');
    setFormVisibility('public');
    setFormParticipantIds([currentUser.id]);
    setFormAttachmentUrl('');
    setFormAttachmentName('');
    setConflicts([]);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDescription(event.description || '');
    setFormEventType(event.eventType);
    setFormStartDate(event.startDate && typeof event.startDate === 'string' ? event.startDate.split('T')[0] : getLocalDateString(new Date()));
    setFormStartTime(event.startTime || '09:00');
    setFormEndDate(
      event.endDate && typeof event.endDate === 'string'
        ? event.endDate.split('T')[0]
        : (event.startDate && typeof event.startDate === 'string' ? event.startDate.split('T')[0] : getLocalDateString(new Date()))
    );
    setFormEndTime(event.endTime || '10:00');
    setFormIsAllDay(!!event.isAllDay);
    setFormLocation(event.location || '');
    setFormDepartmentId(event.departmentId || '');
    setFormProjectId(event.projectId || '');
    setFormPriority(event.priority);
    setFormStatus(event.status);
    setFormReminderOffset(event.reminderOffset || 15);
    setFormRecurrence(event.recurrence || 'none');
    setFormNotes(event.notes || '');
    setFormVisibility(event.visibility || 'public');
    setFormParticipantIds(
      event.participants ? event.participants.map((p) => p.userId) : [currentUser.id]
    );
    setFormAttachmentUrl(event.attachmentUrl || '');
    setFormAttachmentName(event.attachmentName || '');
    setShowDetailModal(false);
    setShowCreateModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription,
        eventType: formEventType,
        startDate: formStartDate,
        startTime: formStartTime,
        endDate: formEndDate,
        endTime: formEndTime,
        isAllDay: formIsAllDay,
        location: formLocation,
        departmentId: formDepartmentId || undefined,
        projectId: formProjectId || undefined,
        priority: formPriority,
        status: formStatus,
        reminderOffset: formReminderOffset,
        recurrence: formRecurrence,
        notes: formNotes,
        visibility: formVisibility,
        participantUserIds: formParticipantIds,
        attachmentUrl: formAttachmentUrl,
        attachmentName: formAttachmentName,
      };

      if (editingEvent && editingEvent.id) {
        await api.updateCalendarEvent(editingEvent.id, payload);
      } else {
        await api.createCalendarEvent(payload);
      }

      setShowCreateModal(false);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to save event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickReschedule = async () => {
    if (!selectedEvent || !rescheduleStartDate) return;
    setIsSubmitting(true);
    try {
      await api.updateCalendarEvent(selectedEvent.id, {
        startDate: rescheduleStartDate,
        startTime: rescheduleStartTime || selectedEvent.startTime,
        endDate: rescheduleStartDate,
        endTime: rescheduleStartTime && typeof rescheduleStartTime === 'string' && rescheduleStartTime.includes(':')
          ? `${(parseInt(rescheduleStartTime.split(':')[0], 10) + 1).toString().padStart(2, '0')}:00`
          : selectedEvent.endTime,
      });
      setIsRescheduling(false);
      setShowDetailModal(false);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to reschedule event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicateEvent = async (event: CalendarEvent) => {
    if (!window.confirm(`Duplicate event "${event.title}"?`)) return;
    try {
      await api.duplicateCalendarEvent(event.id);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate event.');
    }
  };

  const handleCancelEvent = async (event: CalendarEvent) => {
    if (!window.confirm(`Cancel event "${event.title}"?`)) return;
    try {
      await api.cancelCalendarEvent(event.id);
      setShowDetailModal(false);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel event.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event permanently?')) return;
    try {
      await api.deleteCalendarEvent(eventId);
      setShowDetailModal(false);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to delete event.');
    }
  };

  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarSyncFeedback, setCalendarSyncFeedback] = useState<string | null>(null);

  const handleSyncGoogleCalendar = async () => {
    try {
      setIsSyncingCalendar(true);
      const res = await integrationApi.syncCalendar({ fullSync: true });
      setCalendarSyncFeedback(res.message || 'Google Calendar synchronization complete.');
      fetchEvents();
      setTimeout(() => setCalendarSyncFeedback(null), 5000);
    } catch (err: any) {
      alert(`Google Calendar sync error: ${err.message || err}`);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Month View Days Construction (Timezone-safe)
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const daysInMonth = lastDayOfMonth.getDate();

    const days: { date: Date; isCurrentMonth: boolean; dateStr: string; isToday: boolean }[] = [];
    const tStr = getLocalDateString(new Date());

    // Prev month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const dStr = getLocalDateString(d);
      days.push({ date: d, isCurrentMonth: false, dateStr: dStr, isToday: dStr === tStr });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dStr = getLocalDateString(d);
      days.push({ date: d, isCurrentMonth: true, dateStr: dStr, isToday: dStr === tStr });
    }

    // Next month padding to complete grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dStr = getLocalDateString(d);
      days.push({ date: d, isCurrentMonth: false, dateStr: dStr, isToday: dStr === tStr });
    }

    return days;
  }, [currentDate]);

  // Week View Days Construction (Timezone-safe)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0 = Sun
    const sunday = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - dayOfWeek);
    const days: { date: Date; dateStr: string; isToday: boolean }[] = [];
    const tStr = getLocalDateString(new Date());

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
      const dStr = getLocalDateString(d);
      days.push({
        date: d,
        dateStr: dStr,
        isToday: dStr === tStr,
      });
    }
    return days;
  }, [currentDate]);

  // Map events to date string key
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const evt of events) {
      const sDate = evt.startDate && typeof evt.startDate === 'string' ? evt.startDate.split('T')[0] : '';
      if (sDate) {
        if (!map[sDate]) map[sDate] = [];
        map[sDate].push(evt);
      }
    }
    return map;
  }, [events]);

  const selectedDateStr = getLocalDateString(selectedDate);
  const selectedDayEvents = useMemo(() => {
    return eventsByDate[selectedDateStr] || [];
  }, [eventsByDate, selectedDateStr]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ======================================================== */}
      {/* MOBILE GOOGLE CALENDAR HEADER (Clean, Compact, Touch-First)*/}
      {/* ======================================================== */}
      <div className="md:hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-2xs space-y-2.5 transition-colors">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Month/Year + Arrows + Today */}
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={prevPeriod}
              className="p-1 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Previous Period"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight whitespace-nowrap truncate">
              {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>

            <button
              onClick={nextPeriod}
              className="p-1 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Next Period"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={goToToday}
              className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer shrink-0 ${
                isTodaySelected && isTodayCurrent
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Jump to Today's date"
            >
              Today
            </button>
          </div>

          {/* Right: Search Toggle + Compact View Selector + Simple Plus Icon */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                isMobileSearchOpen || searchQuery
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="Search Events"
              aria-label="Search Events"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Compact View Mode Selector Dropdown */}
            <div className="relative">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as CalendarViewMode)}
                className="appearance-none pl-2.5 pr-6 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
              >
                <option value="month">Month</option>
                <option value="week">Week</option>
                <option value="day">Day</option>
                <option value="agenda">Agenda</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Simple "+" Create Icon Only */}
            <button
              onClick={() => handleOpenCreateModal(selectedDateStr)}
              className="w-7 h-7 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white flex items-center justify-center shadow-xs transition-all shrink-0 cursor-pointer"
              title="Create Event"
              aria-label="Create Event"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Mobile Search & Type Filter Bar */}
        {(isMobileSearchOpen || searchQuery) && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search calendar..."
                className="pl-8 pr-7 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              className="py-1 px-2 text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-amber-500 shadow-2xs"
            >
              <option value="all">All Types</option>
              <option value="meeting">Meetings</option>
              <option value="task">Tasks</option>
              <option value="temple_event">Temple Events</option>
              <option value="festival">Festivals</option>
              <option value="seva">Seva</option>
              <option value="volunteer">Volunteer</option>
              <option value="announcement">Notices</option>
              <option value="personal">Personal</option>
            </select>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* DESKTOP CALENDAR CONTROL BANNER / HEADER (Spacious & Full) */}
      {/* ======================================================== */}
      <div id="calendar-header-card" className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs transition-colors space-y-4">
        {/* Row 1: Title, Subtitle, View Switcher & Create Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 text-white rounded-xl shadow-xs flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Calendar
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Coordinated temple schedules, sevas, meetings, and festival events
              </p>
            </div>
          </div>

          {/* Top-Right Controls: View Mode Switcher + Create Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* View Mode Tabs */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'day'
                    ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'agenda'
                    ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Agenda
              </button>
            </div>

            {/* Sync Google Calendar Button */}
            <button
              onClick={handleSyncGoogleCalendar}
              disabled={isSyncingCalendar}
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              title="Sync with connected Google Calendar"
            >
              {isSyncingCalendar ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Sync Google Cal</span>
                </>
              )}
            </button>

            {/* Create Event Button */}
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </button>
          </div>
        </div>

        {/* Row 2: Date Navigation & Search/Filter Toolbar */}
        <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Navigation Controls + Period Label */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              <button
                onClick={prevPeriod}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Previous Period"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToToday}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isTodaySelected && isTodayCurrent
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
                title="Jump to Today's date"
              >
                Today
              </button>
              <button
                onClick={nextPeriod}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Next Period"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {getHeaderPeriodLabel()}
            </div>
          </div>

          {/* Search Input & Event Type Filter Dropdown */}
          <div className="flex items-center gap-2.5 flex-1 md:flex-initial">
            {/* Search Input */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                className="pl-9 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 w-full transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Event Type Filter Dropdown */}
            <select
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="meeting">Meetings</option>
              <option value="task">Tasks</option>
              <option value="temple_event">Temple Events</option>
              <option value="festival">Festivals</option>
              <option value="seva">Sevas</option>
              <option value="volunteer">Volunteer Duties</option>
              <option value="announcement">Announcements</option>
              <option value="personal">Personal</option>
            </select>
          </div>
        </div>

        {/* Row 3: Quick Filter Category Pills (Desktop Only) */}
        <div className="pt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <span className="text-slate-400 dark:text-slate-500 font-semibold text-[11px] shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Quick Filter:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'temple_event', label: 'Temple Events', color: 'bg-amber-500' },
            { id: 'festival', label: 'Festivals', color: 'bg-purple-500' },
            { id: 'seva', label: 'Seva', color: 'bg-rose-500' },
            { id: 'meeting', label: 'Meetings', color: 'bg-blue-500' },
            { id: 'task', label: 'Tasks', color: 'bg-emerald-500' },
            { id: 'volunteer', label: 'Volunteer Duties', color: 'bg-indigo-500' },
          ].map((type) => {
            const active = filterEventType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setFilterEventType(type.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border cursor-pointer ${
                  active
                    ? 'bg-slate-900 dark:bg-amber-600 text-white border-slate-900 dark:border-amber-600 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                }`}
              >
                {type.color && <span className={`w-2 h-2 rounded-full ${type.color}`} />}
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {calendarSyncFeedback && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{calendarSyncFeedback}</span>
          </div>
          <button
            onClick={() => setCalendarSyncFeedback(null)}
            className="text-blue-700 dark:text-blue-300 hover:text-blue-900 font-bold ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* MOBILE DATE PICKER CAROUSEL (Google Calendar Style Strip) */}
      {/* ======================================================== */}
      <div className="md:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-2xs overflow-x-auto flex items-center gap-1.5 no-scrollbar">
        {monthDays.slice(0, 14).map((dayObj) => {
          const isSelected = dayObj.dateStr === selectedDateStr;
          const dayEvents = eventsByDate[dayObj.dateStr] || [];

          return (
            <button
              key={dayObj.dateStr}
              onClick={() => {
                setSelectedDate(dayObj.date);
                setCurrentDate(dayObj.date);
              }}
              className={`flex flex-col items-center justify-center py-2 px-2.5 rounded-xl min-w-[52px] border text-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-600 text-white border-amber-700 font-bold shadow-xs scale-105'
                  : dayObj.isToday
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-semibold'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                {dayObj.date.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="text-sm font-extrabold my-0.5">
                {dayObj.date.getDate()}
              </span>
              <div className="flex gap-0.5 items-center h-1.5 justify-center">
                {dayEvents.length > 0 ? (
                  dayEvents.slice(0, 3).map((e, idx) => {
                    const cfg = getEventTypeConfig(e.eventType);
                    return (
                      <span
                        key={idx}
                        className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : cfg.dot}`}
                      />
                    );
                  })
                ) : (
                  <span className="w-1 h-1" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* MAIN CALENDAR VIEWS (Month, Week, Day, Agenda) */}
      {/* ======================================================== */}
      <div>
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center text-slate-400 shadow-2xs">
            <div className="w-9 h-9 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-semibold text-slate-700">Loading SEVYA Calendar & Events...</p>
            <p className="text-xs text-slate-400 mt-1">Syncing real-time temple schedule</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 p-5 rounded-2xl flex items-center gap-3 shadow-2xs">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold">Calendar Sync Error</h3>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        ) : viewMode === 'month' ? (
          /* ======================================================== */
          /* MONTH GRID VIEW */
          /* ======================================================== */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-center py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <span className="text-rose-600 dark:text-rose-400"><span className="sm:hidden">S</span><span className="hidden sm:inline">Sun</span></span>
                <span><span className="sm:hidden">M</span><span className="hidden sm:inline">Mon</span></span>
                <span><span className="sm:hidden">T</span><span className="hidden sm:inline">Tue</span></span>
                <span><span className="sm:hidden">W</span><span className="hidden sm:inline">Wed</span></span>
                <span><span className="sm:hidden">T</span><span className="hidden sm:inline">Thu</span></span>
                <span><span className="sm:hidden">F</span><span className="hidden sm:inline">Fri</span></span>
                <span className="text-amber-600 dark:text-amber-400"><span className="sm:hidden">S</span><span className="hidden sm:inline">Sat</span></span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 bg-slate-100">
                {monthDays.map((dayObj) => {
                  const dayEvents = eventsByDate[dayObj.dateStr] || [];
                  const isSelected = dayObj.dateStr === selectedDateStr;

                  return (
                    <div
                      key={dayObj.dateStr}
                      onClick={() => setSelectedDate(dayObj.date)}
                      className={`min-h-[60px] sm:min-h-[105px] md:min-h-[125px] p-1 sm:p-2 transition-all cursor-pointer flex flex-col justify-between ${
                        !dayObj.isCurrentMonth
                          ? 'bg-slate-50/70 text-slate-400'
                          : 'bg-white hover:bg-amber-50/30'
                      } ${
                        isSelected
                          ? 'ring-2 ring-amber-500 ring-inset bg-amber-50/40 z-10'
                          : ''
                      }`}
                    >
                      {/* Day Number Header */}
                      <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                        <span
                          className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full transition-all ${
                            dayObj.isToday
                              ? 'bg-amber-600 text-white font-extrabold shadow-2xs'
                              : isSelected
                              ? 'bg-slate-900 text-white font-bold'
                              : dayObj.isCurrentMonth
                              ? 'text-slate-800 font-semibold'
                              : 'text-slate-400'
                          }`}
                        >
                          {dayObj.date.getDate()}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] font-semibold text-slate-500 hidden md:inline bg-slate-100 px-1.5 py-0.5 rounded-full">
                            {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                          </span>
                        )}
                      </div>

                      {/* Events List in Day Cell (Desktop) */}
                      <div className="space-y-1 overflow-hidden flex-1 hidden md:block">
                        {dayEvents.slice(0, 3).map((evt) => {
                          const cfg = getEventTypeConfig(evt.eventType);
                          return (
                            <div
                              key={evt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(evt);
                                setShowDetailModal(true);
                              }}
                              className={`p-1.5 rounded-lg text-[11px] font-medium border truncate transition-all hover:scale-[1.01] hover:shadow-2xs ${cfg.bg}`}
                            >
                              <span className="font-bold mr-1 text-slate-900">
                                {evt.startTime || 'All day'}
                              </span>
                              <span>{evt.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <p className="text-[10px] text-amber-700 font-bold pl-1">
                            +{dayEvents.length - 3} more...
                          </p>
                        )}
                      </div>

                      {/* Event Indicator Dots (Mobile) */}
                      <div className="flex md:hidden gap-1 items-center justify-center mt-1">
                        {dayEvents.slice(0, 4).map((evt, idx) => {
                          const cfg = getEventTypeConfig(evt.eventType);
                          return (
                            <span
                              key={idx}
                              className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SELECTED DAY EVENT PANEL (Cleanly embedded beneath Month Grid) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Events on {formatDisplayDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedDayEvents.length} scheduled event(s) for this day
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenCreateModal(selectedDateStr)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Event for this Day</span>
                  <span className="sm:hidden">Add Event</span>
                </button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium">No events scheduled on this date.</p>
                  <button
                    onClick={() => handleOpenCreateModal(selectedDateStr)}
                    className="mt-2 text-xs font-bold text-amber-600 hover:text-amber-800 cursor-pointer"
                  >
                    + Click here to schedule an event
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedDayEvents.map((evt) => {
                    const cfg = getEventTypeConfig(evt.eventType);
                    return (
                      <div
                        key={evt.id}
                        onClick={() => {
                          setSelectedEvent(evt);
                          setShowDetailModal(true);
                        }}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all hover:shadow-sm ${cfg.bg}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${cfg.pill}`}>
                            {cfg.label}
                          </span>
                          {getPriorityBadge(evt.priority)}
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mb-1">{evt.title}</h4>
                        <div className="space-y-1 text-[11px] text-slate-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{evt.startTime || 'All day'} {evt.endTime ? `- ${evt.endTime}` : ''}</span>
                          </div>
                          {evt.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{evt.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'week' ? (
          /* ======================================================== */
          /* WEEK DETAILED VIEW */
          /* ======================================================== */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-amber-600" />
                Week Overview: {getHeaderPeriodLabel()}
              </h2>
              <button
                onClick={() => handleOpenCreateModal()}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Event
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {weekDays.map((d) => {
                const dayEvts = eventsByDate[d.dateStr] || [];
                const isSelected = d.dateStr === selectedDateStr;

                return (
                  <div
                    key={d.dateStr}
                    onClick={() => setSelectedDate(d.date)}
                    className={`rounded-xl p-3 border transition-all cursor-pointer min-h-[260px] flex flex-col ${
                      isSelected
                        ? 'bg-amber-50/40 border-amber-400 shadow-xs'
                        : d.isToday
                        ? 'bg-amber-50/20 border-amber-300'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-center pb-2 border-b border-slate-200/80 mb-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {d.date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <p
                        className={`text-base font-extrabold my-0.5 inline-block px-2 py-0.5 rounded-full ${
                          d.isToday
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'text-slate-900'
                        }`}
                      >
                        {d.date.getDate()}
                      </p>
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto">
                      {dayEvts.length === 0 ? (
                        <p className="text-[10px] text-slate-400 text-center italic pt-4">
                          No events
                        </p>
                      ) : (
                        dayEvts.map((evt) => {
                          const cfg = getEventTypeConfig(evt.eventType);
                          return (
                            <div
                              key={evt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(evt);
                                setShowDetailModal(true);
                              }}
                              className={`p-2 rounded-lg text-xs border cursor-pointer hover:shadow-2xs transition-all ${cfg.bg}`}
                            >
                              <p className="font-bold text-slate-900 tracking-tight line-clamp-1">{evt.title}</p>
                              <p className="text-[10px] opacity-80 mt-0.5">
                                {evt.startTime || 'All day'}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'day' ? (
          /* ======================================================== */
          /* DAY DETAILED VIEW */
          /* ======================================================== */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-amber-600" />
                  {currentDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h2>
                <p className="text-xs text-slate-500">
                  {eventsByDate[getLocalDateString(currentDate)]?.length || 0} scheduled event(s)
                </p>
              </div>
              <button
                onClick={() => handleOpenCreateModal(getLocalDateString(currentDate))}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Event for this Day</span>
                <span className="sm:hidden">Add Event</span>
              </button>
            </div>

            {(eventsByDate[getLocalDateString(currentDate)] || []).length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No events scheduled for this day.</p>
                <button
                  onClick={() => handleOpenCreateModal(getLocalDateString(currentDate))}
                  className="mt-3 text-xs font-bold text-amber-600 hover:text-amber-800"
                >
                  + Click to Schedule an Event
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {(eventsByDate[getLocalDateString(currentDate)] || []).map((evt) => {
                  const cfg = getEventTypeConfig(evt.eventType);
                  return (
                    <div
                      key={evt.id}
                      onClick={() => {
                        setSelectedEvent(evt);
                        setShowDetailModal(true);
                      }}
                      className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl border text-center min-w-[75px] ${cfg.bg}`}>
                          <p className="text-xs font-bold text-slate-900">{evt.startTime || 'All day'}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{evt.endTime || 'Scheduled'}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${cfg.pill}`}>
                              {cfg.label}
                            </span>
                            {getPriorityBadge(evt.priority)}
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm mt-1">{evt.title}</h3>
                          {evt.description && (
                            <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                              {evt.description}
                            </p>
                          )}
                          {evt.location && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3 text-slate-400" /> {evt.location}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(evt);
                          }}
                          className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateEvent(evt);
                          }}
                          className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ======================================================== */
          /* AGENDA / LIST VIEW */
          /* ======================================================== */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <ListIcon className="w-4 h-4 text-amber-600" />
                  Chronological Agenda Schedule ({events.length} total)
                </h2>
                <p className="text-xs text-slate-500">
                  Comprehensive listing ordered by schedule date & time
                </p>
              </div>
              <button
                onClick={() => handleOpenCreateModal()}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Create Event</span>
                <span className="sm:hidden">Add Event</span>
              </button>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <ListIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No events match your active filters.</p>
                <button
                  onClick={() => handleOpenCreateModal()}
                  className="mt-2 text-xs font-bold text-amber-600 hover:text-amber-800"
                >
                  + Add a new event
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((evt) => {
                  const cfg = getEventTypeConfig(evt.eventType);
                  const parsedDate = parseLocalDateString(evt.startDate);
                  const isEvtToday = getLocalDateString(parsedDate) === todayStr;

                  return (
                    <div
                      key={evt.id}
                      onClick={() => {
                        setSelectedEvent(evt);
                        setShowDetailModal(true);
                      }}
                      className="p-4 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl cursor-pointer transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`flex flex-col items-center justify-center border p-2.5 rounded-xl min-w-[74px] ${
                          isEvtToday ? 'bg-amber-600 text-white border-amber-700 shadow-2xs' : 'bg-amber-50 border-amber-200 text-amber-950'
                        }`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {parsedDate.toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-xl font-extrabold leading-none my-0.5">
                            {parsedDate.getDate()}
                          </span>
                          <span className="text-[10px] font-medium opacity-90">
                            {evt.startTime || 'All day'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${cfg.pill}`}>
                              {cfg.label}
                            </span>
                            {getPriorityBadge(evt.priority)}
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                evt.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : evt.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {evt.status.toUpperCase()}
                            </span>
                          </div>

                          <h3 className="font-bold text-slate-900 text-base">{evt.title}</h3>

                          {evt.description && (
                            <p className="text-xs text-slate-600 line-clamp-2">{evt.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                            {evt.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {evt.location}
                              </span>
                            )}
                            {evt.organizerName && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-400" /> {evt.organizerName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(evt);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEvent(evt);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* CREATE / EDIT EVENT MODAL */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-200 mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-amber-600 shrink-0" />
                {editingEvent ? 'Edit / Reschedule Event' : 'Create New Calendar Event'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conflict Warning Banner */}
            {conflicts.length > 0 && (
              <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Scheduling Conflict Warning!</span>
                </div>
                <p>The following participants have overlapping commitments:</p>
                <ul className="list-disc pl-5 space-y-0.5 text-amber-950 font-medium">
                  {conflicts.map((c, idx) => (
                    <li key={idx}>
                      <strong>{c.userName}</strong> is already booked for "{c.conflictingEventTitle}" ({c.startDate} {c.startTime})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleSaveEvent} className="space-y-4">
              {/* Event Title & Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Temple Maha Aarti Planning Meeting"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event Type *
                  </label>
                  <select
                    value={formEventType}
                    onChange={(e) => setFormEventType(e.target.value as CalendarEventType)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="task">Task</option>
                    <option value="temple_event">Temple Event</option>
                    <option value="festival">Festival</option>
                    <option value="seva">Seva</option>
                    <option value="volunteer">Volunteer Duty</option>
                    <option value="announcement">Announcement</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
              </div>

              {/* Start/End Date and Times */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Date & Timing</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsAllDay}
                      onChange={(e) => setFormIsAllDay(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>All Day Event</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  {!formIsAllDay && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  {!formIsAllDay && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">End Time</label>
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Location, Department, Priority */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Main Hall / Zoom"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={formDepartmentId}
                    onChange={(e) => setFormDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">No Specific Department</option>
                    {departmentsList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as CalendarEventPriority)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Participants Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Participants & Invitees</span>
                  <span className="text-[10px] text-slate-400 font-normal">Hold Ctrl/Cmd to multi-select</span>
                </label>
                <select
                  multiple
                  value={formParticipantIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
                    setFormParticipantIds(selected);
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl h-24"
                >
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) - {u.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recurrence & Reminder */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Recurrence</label>
                  <select
                    value={formRecurrence}
                    onChange={(e) => setFormRecurrence(e.target.value as CalendarEventRecurrence)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reminder</label>
                  <select
                    value={formReminderOffset}
                    onChange={(e) => setFormReminderOffset(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value={5}>5 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={1440}>1 day before</option>
                  </select>
                </div>
              </div>

              {/* Description & Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description & Agenda</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Provide event details or agenda..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>{editingEvent ? 'Update Event' : 'Schedule Event'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EVENT DETAIL VIEW MODAL */}
      {/* ======================================================== */}
      {showDetailModal && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getEventTypeConfig(selectedEvent.eventType).pill}`}>
                    {getEventTypeConfig(selectedEvent.eventType).label}
                  </span>
                  {getPriorityBadge(selectedEvent.priority)}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">{selectedEvent.title}</h2>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Timing & Location */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Date:</strong> {formatDisplayDate(selectedEvent.startDate)}{' '}
                  {selectedEvent.endDate && selectedEvent.endDate !== selectedEvent.startDate ? ` to ${formatDisplayDate(selectedEvent.endDate)}` : ''}{' '}
                  ({selectedEvent.startTime} - {selectedEvent.endTime})
                </span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Location:</strong> {selectedEvent.location}
                  </span>
                </div>
              )}
              {selectedEvent.departmentName && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Department:</strong> {selectedEvent.departmentName}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Reschedule Widget */}
            {isRescheduling && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-amber-900">Quick Reschedule Event</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={rescheduleStartDate}
                    onChange={(e) => setRescheduleStartDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                  <input
                    type="time"
                    value={rescheduleStartTime}
                    onChange={(e) => setRescheduleStartTime(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setIsRescheduling(false)}
                    className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleQuickReschedule}
                    className="px-3.5 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer"
                  >
                    Confirm Reschedule
                  </button>
                </div>
              </div>
            )}

            {/* Description */}
            {selectedEvent.description && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-1">Description</h4>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                  {selectedEvent.description}
                </p>
              </div>
            )}

            {/* Participants */}
            {selectedEvent.participants && selectedEvent.participants.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-1">Participants ({selectedEvent.participants.length})</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEvent.participants.map((p, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-[11px] font-medium text-slate-700"
                    >
                      <UserCheck className="w-3 h-3 text-emerald-600" />
                      {p.userName || p.userId}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Entity Jump Navigation */}
            {selectedEvent.taskId && onNavigateToTask && (
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  onNavigateToTask(selectedEvent.taskId!);
                }}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Linked Task View
              </button>
            )}

            {selectedEvent.meetingId && onNavigateToMeeting && (
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  onNavigateToMeeting(selectedEvent.meetingId!);
                }}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Linked Meeting View
              </button>
            )}

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-200">
              <button
                onClick={() => handleDeleteEvent(selectedEvent.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Delete Event"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRescheduleStartDate(
                      selectedEvent.startDate && typeof selectedEvent.startDate === 'string'
                        ? selectedEvent.startDate.split('T')[0]
                        : getLocalDateString(new Date())
                    );
                    setRescheduleStartTime(selectedEvent.startTime || '09:00');
                    setIsRescheduling(!isRescheduling);
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => handleOpenEditModal(selectedEvent)}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Edit Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {/* MOBILE FLOATING ACTION BUTTON (Google Calendar Style FAB) */}
      {/* ======================================================== */}
      <button
        onClick={() => handleOpenCreateModal(selectedDateStr)}
        className="md:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-amber-600 hover:bg-amber-700 active:scale-90 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer border-2 border-white dark:border-slate-800"
        aria-label="Create Event"
        title="Create Event"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};
