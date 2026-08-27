import React, { useState, useEffect } from 'react';
import { User, Task, Project, Department, TempleInfo, Meeting, Notification, VolunteerOpportunity } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Sparkles,
  Heart,
  Calendar,
  Clock,
  Bell,
  MapPin,
  ChevronRight,
  Loader2,
  HeartHandshake,
  MessageSquare,
  User as UserIcon,
  Sun,
  Moon,
  FileCheck,
  HandHeart,
  Landmark,
  FileText,
} from 'lucide-react';
import { formatDate } from '../utils/taskUtils';
import { getRoleDisplayName } from '../utils/roleHierarchy';

export interface VolunteerDashboardProps {
  currentUser: User;
  tasks?: Task[];
  projects?: Project[];
  departments?: Department[];
  temple?: TempleInfo;
  meetings?: Meeting[];
  notifications?: Notification[];
  initialTab?: string;
  onNavigateTab: (tab: string) => void;
  onOpenProfile?: () => void;
}

export const VolunteerDashboard: React.FC<VolunteerDashboardProps> = ({
  currentUser,
  tasks = [],
  projects = [],
  departments = [],
  temple = { name: '', tagline: 'SEVYA Temple Management System' } as TempleInfo,
  meetings = [],
  notifications = [],
  onNavigateTab,
  onOpenProfile,
}) => {
  const { showSuccess, showError } = useToast();

  // Member data loaded directly from database for Member
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadMemberData = async () => {
      try {
        setLoading(true);
        const [oppsRes, metricsRes] = await Promise.all([
          api.getVolunteerOpportunities().catch(() => []),
          api.getDevoteeDashboard().catch(() => null),
        ]);
        if (isMounted) {
          setOpportunities(oppsRes || []);
          setDashboardMetrics(metricsRes);
        }
      } catch (err) {
        console.error('Failed to load member dashboard metrics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMemberData();
    return () => {
      isMounted = false;
    };
  }, [currentUser.id]);

  // My Upcoming Meetings (next 3)
  const myMeetings = meetings
    .filter((m) => {
      const isParticipant = m.participants?.some((p) => p.userId === currentUser.id || p.id === currentUser.id);
      const isOrganizer = m.organizerId === currentUser.id || m.createdBy === currentUser.id;
      return isParticipant || isOrganizer;
    })
    .slice(0, 4);

  // Member Unread Notifications (top 3)
  const unreadNotifs = notifications.filter((n) => !n.read).slice(0, 3);
  const myActiveTasksCount = (tasks || []).filter(
    (t) => (t.assigneeId === currentUser.id || t.assignedTo === currentUser.id) && t.status !== 'completed'
  ).length;

  // Daily Aarti schedule
  const dailyDarshanSchedule = [
    { title: 'Mangala Aarti & Kirtan', time: '04:30 AM – 05:15 AM', icon: Sun },
    { title: 'Shringhar Darshan & Tulsi Puja', time: '07:30 AM – 08:15 AM', icon: Sun },
    { title: 'Raj Bhog Aarti & Offering', time: '12:00 PM – 12:30 PM', icon: Sun },
    { title: 'Sandhya Evening Aarti', time: '07:00 PM – 07:45 PM', icon: Moon },
    { title: 'Shayana Aarti & Night Darshan', time: '08:30 PM – 08:45 PM', icon: Moon },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-in fade-in duration-300">
      {/* 1. Welcome Card - Clean, Minimal SaaS Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 transition-colors">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs bg-amber-50 shrink-0"
            />
          ) : (
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-sm sm:text-base uppercase shadow-2xs shrink-0">
              {currentUser.name ? currentUser.name.slice(0, 2) : 'ME'}
            </div>
          )}

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                Welcome back, {currentUser.displayName || currentUser.name}
              </h1>
              <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                {getRoleDisplayName(currentUser.role)}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs truncate">
              Here is your personal devotional summary, offerings, and scheduled gatherings
            </p>
          </div>
        </div>

        {/* Quick Devotional Metrics */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 w-full sm:w-auto shrink-0">
          <div className="text-center px-2 sm:px-3 border-r border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block truncate">My Tasks</span>
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {myActiveTasksCount}
            </span>
          </div>
          <div className="text-center px-2 sm:px-3 border-r border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block truncate">Meetings</span>
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">{myMeetings.length}</span>
          </div>
          <div className="text-center px-2 sm:px-3">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block truncate">Open Sevas</span>
            <span className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">{opportunities.length}</span>
          </div>
        </div>
      </div>

      {/* 2. Primary 2-Column Responsive Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Seva Opportunities & Gatherings */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Open Seva Opportunities & Offerings */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                  <HandHeart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-slate-100">Available Temple Seva Opportunities</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Contribute your skills & devotion to temple activities</p>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('reports')}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                Donations & Offerings <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {opportunities.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-1">
                <HandHeart className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">All Seva slots currently filled</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">New volunteer openings are announced before upcoming festivals.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-4 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50 space-y-2 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold mb-1">
                        <span className="bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase">
                          {opp.category || 'Temple Seva'}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{opp.spotsLeft || 5} spots left</span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">{opp.title}</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">{opp.description}</p>
                    </div>

                    <button
                      onClick={async () => {
                        try {
                          await api.enrollVolunteerOpportunity(opp.id);
                          showSuccess(`Enrolled in ${opp.title} successfully!`);
                          const updated = await api.getVolunteerOpportunities();
                          setOpportunities(updated);
                        } catch (err: any) {
                          showError(err.message || 'Failed to enroll in seva opportunity');
                        }
                      }}
                      className="w-full mt-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Sign Up for Seva
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Meetings & Events */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800 shadow-2xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-slate-100">Upcoming Meetings & Gatherings</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Departmental reviews and coordination calls</p>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('calendar')}
                className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                Calendar View <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {myMeetings.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-1">
                <Calendar className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No scheduled meetings</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">You are not registered in any upcoming calls.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myMeetings.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl border border-blue-200/80 dark:border-blue-800/50 space-y-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-300 font-bold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        {m.meetingDate ? formatDate(m.meetingDate) : 'Date TBA'}
                      </span>
                      {m.isOnline && (
                        <span className="text-[10px] bg-blue-200/70 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 font-extrabold px-2 py-0.5 rounded-full">
                          Online
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">{m.title}</h4>
                    {m.location && <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{m.location}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions, Notifications, Darshan Timings */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Quick Actions
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => onNavigateTab('feedback')}
                className="w-full p-3 bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 dark:bg-amber-500 text-white dark:text-slate-950 flex items-center justify-center shadow-2xs">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block group-hover:text-amber-800 dark:group-hover:text-amber-300">
                      Submit Feedback
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Contact temple leadership</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-amber-700 dark:group-hover:text-amber-400" />
              </button>

              <button
                onClick={() => onNavigateTab('reports')}
                className="w-full p-3 bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                      Donations & Offerings
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Support sacred seva funds</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-emerald-700 dark:group-hover:text-emerald-400" />
              </button>

              <button
                onClick={() => onNavigateTab('approvals')}
                className="w-full p-3 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block group-hover:text-blue-800 dark:group-hover:text-blue-300">
                      My Requests
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Track approvals and requests</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-700 dark:group-hover:text-blue-300" />
              </button>

              {onOpenProfile && (
                <button
                  onClick={onOpenProfile}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-2xs">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block group-hover:text-purple-900 dark:group-hover:text-purple-300">
                        My Profile & Avatar
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Update photo and details</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-purple-700 dark:group-hover:text-purple-400" />
                </button>
              )}
            </div>
          </div>

          {/* Important Notifications */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Notifications
              </h3>
              <button
                onClick={() => onNavigateTab('notifications')}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300"
              >
                All
              </button>
            </div>

            {unreadNotifs.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">No unread notifications.</p>
            ) : (
              <div className="space-y-2">
                {unreadNotifs.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => onNavigateTab('notifications')}
                    className="p-3 bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 rounded-xl border border-amber-200/80 dark:border-amber-800/60 cursor-pointer transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{notif.title}</span>
                      <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400"></span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">{notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Temple Darshan Timings Widget */}
          <div className="bg-amber-50/60 dark:bg-amber-950/40 rounded-3xl p-6 border border-amber-200/90 dark:border-amber-800/70 shadow-2xs space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-amber-950 dark:text-amber-200 flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Daily Aarti Schedule
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 rounded-md">
                Open
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {dailyDarshanSchedule.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-amber-200/60 dark:border-amber-800/50 flex items-center justify-between text-xs transition-colors"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.title}</span>
                  <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

